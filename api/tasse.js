const https = require('https')
const querystring = require('querystring')
const { URL } = require('url')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

function httpsReq(hostname, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method,
      headers: { 'Accept-Encoding': 'identity', 'User-Agent': UA, ...headers },
    }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
        cookies: (res.headers['set-cookie'] ?? []).map(c => c.split(';')[0]),
      }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function followRedirects(startUrl, cookies = [], maxHops = 8) {
  let url = new URL(startUrl)
  let jar = [...cookies]
  for (let i = 0; i < maxHops; i++) {
    const r = await httpsReq(url.hostname, url.pathname + url.search, {
      headers: { Cookie: jar.join('; ') },
    })
    jar = [...jar, ...r.cookies]
    if (r.status === 200) return { body: r.body, cookies: jar, finalUrl: url }
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      const loc = r.headers.location
      url = loc.startsWith('http') ? new URL(loc) : new URL(`https://${url.hostname}${loc}`)
    } else {
      return null
    }
  }
  return null
}

function extractHidden(html) {
  const fields = {}
  for (const m of html.matchAll(/<input[^>]+type=["']hidden["'][^>]*>/gi)) {
    const name = m[0].match(/name=["']([^"']+)["']/)?.[1]
    const value = m[0].match(/value=["']([^"']*)["']/)?.[1] ?? ''
    if (name) fields[name] = decodeHtmlEntities(value)
  }
  return fields
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
}

function extractFormAction(html, fallbackHost) {
  const raw = html.match(/<form[^>]+action=["']([^"']+)["']/i)?.[1] ?? ''
  if (!raw) return null
  const action = decodeHtmlEntities(raw)
  if (action.startsWith('http')) return new URL(action)
  return new URL(`https://${fallbackHost}${action}`)
}

async function postForm(url, cookies, bodyObj) {
  const body = querystring.stringify(bodyObj)
  return httpsReq(url.hostname, url.pathname + url.search, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      Cookie: cookies.join('; '),
    },
    body,
  })
}

async function samlLogin(username, password) {
  // 1. e1s1 – local storage check
  const e1s1 = await followRedirects('https://www.studenti.unipi.it/auth/studente/Tasse/ListaFatture.do')
  if (!e1s1) return { error: 'Impossibile raggiungere e1s1' }
  const e1s1Action = extractFormAction(e1s1.body, e1s1.finalUrl.hostname)
  if (!e1s1Action) return { error: 'Form e1s1 non trovato' }

  // 2. POST e1s1 → redirect a e1s2
  const ls1 = await postForm(e1s1Action, e1s1.cookies, extractHidden(e1s1.body))
  if (ls1.status !== 302) return { error: `e1s1 POST status ${ls1.status}` }

  // 3. e1s2 – selezione metodo login
  const loc2 = ls1.headers.location
  const e1s2Url = loc2.startsWith('http') ? loc2 : `https://${e1s1Action.hostname}${loc2}`
  const e1s2 = await followRedirects(e1s2Url, [...e1s1.cookies, ...ls1.cookies])
  if (!e1s2) return { error: 'Impossibile raggiungere e1s2' }
  const e1s2Action = extractFormAction(e1s2.body, e1s2.finalUrl.hostname)
  if (!e1s2Action) return { error: 'Form e1s2 non trovato' }

  // 4. Seleziona tab "UNIVERSITY" (flusso Password)
  const flowSel = await postForm(e1s2Action, e1s2.cookies, {
    _eventId_routing: '',
    selected_flow: 'internal',
    auth_ctx: 'authn/Password',
    spid_idp: '',
  })
  if (flowSel.status < 300 || flowSel.status >= 400) return { error: `flow select status ${flowSel.status}` }

  // 5. e1s3 – form credenziali
  const loc3 = flowSel.headers.location
  const e1s3Url = loc3.startsWith('http') ? loc3 : `https://${e1s2Action.hostname}${loc3}`
  const loginPage = await followRedirects(e1s3Url, [...e1s2.cookies, ...flowSel.cookies])
  if (!loginPage) return { error: 'Impossibile raggiungere e1s3' }
  const e1s3Action = extractFormAction(loginPage.body, e1s2Action.hostname)
  if (!e1s3Action) return { error: 'Form login non trovato in e1s3' }

  // 6. POST credenziali
  const r3 = await postForm(e1s3Action, loginPage.cookies, {
    j_username: username,
    j_password: password,
    _eventId_proceed: '',
  })

  // 7. Ottieni SAMLResponse
  let samlBody = r3.body
  let samlCookies = [...loginPage.cookies, ...r3.cookies]
  if (r3.status >= 300 && r3.status < 400 && r3.headers.location) {
    const loc = r3.headers.location
    const url = loc.startsWith('http') ? loc : `https://${e1s3Action.hostname}${loc}`
    const followed = await followRedirects(url, samlCookies)
    if (followed) { samlBody = followed.body; samlCookies = followed.cookies }
  }

  const samlResponse = samlBody.match(/name=["']SAMLResponse["'][^>]+value=["']([^"']+)["']/i)?.[1]
    ?? samlBody.match(/value=["']([^"']+)["'][^>]+name=["']SAMLResponse["']/i)?.[1]
  const relayState = decodeHtmlEntities(
    samlBody.match(/name=["']RelayState["'][^>]+value=["']([^"']*)["']/i)?.[1] ?? ''
  )
  const acsUrl = extractFormAction(samlBody, 'www.studenti.unipi.it')

  if (!samlResponse || !acsUrl) return { error: 'SAMLResponse non trovata' }

  // 8. POST SAMLResponse all'ACS
  const r4 = await postForm(acsUrl, samlCookies, { SAMLResponse: samlResponse, RelayState: relayState })
  if (r4.status !== 302) return { error: `ACS status ${r4.status}` }

  const cookieMap = new Map()
  for (const c of [...samlCookies, ...r4.cookies]) {
    cookieMap.set(c.split('=')[0], c)
  }

  return { sessionCookies: [...cookieMap.values()], redirectUrl: r4.headers.location }
}

function parseTasse(html) {
  const fatture = []
  for (const tb of html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi)) {
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let m
    while ((m = rowRe.exec(tb[1])) !== null) {
      const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
      if (cells.length < 3 || cells.every(c => c === '')) continue

      const pagata = /pagat[ao]/i.test(m[1]) || /eseguito/i.test(m[1])
      if (fatture.length === 0) console.log('[tasse] first row cells:', JSON.stringify(cells))
      const importo = cells.find(c => /^\d+[,\.]\d{2}$/.test(c) || /\d+[,\.]\d{2}\s*€/.test(c) || /€\s*\d/.test(c)) ?? ''
      const descLong = cells[2] ?? ''
      const rata = descLong.match(/Rata:\s*([^-\n]+)/i)?.[1]?.trim() ?? ''
      const aa = descLong.match(/A\.A\.\s*[\d\/]+/i)?.[0] ?? ''
      const descrizione = rata ? `${rata}${aa ? ' · ' + aa : ''}` : descLong.slice(0, 60)
      const scadenza = cells.find(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c)) ?? ''

      fatture.push({ descrizione, anno: cells[1] ?? '', importo, scadenza, pagata })
    }
  }
  return fatture
}

async function getTasse(auth) {
  const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString()
  const colon = decoded.indexOf(':')
  const username = decoded.slice(0, colon)
  const password = decoded.slice(colon + 1)

  const login = await samlLogin(username, password)
  if (login.error) return login

  const startUrl = login.redirectUrl.startsWith('http')
    ? login.redirectUrl
    : `https://www.studenti.unipi.it${login.redirectUrl}`

  const page = await followRedirects(startUrl, login.sessionCookies)
  if (!page) return { fatture: [] }

  if (page.body.includes('Scelta carriera') || page.body.includes('SceltaCarriera')) {
    const careerHref = page.body.match(/href=["']([^"']*(?:SceltaCarriera|Auth\.do)[^"']*)["']/i)?.[1]
    if (!careerHref) return { fatture: [] }
    const careerPath = decodeHtmlEntities(careerHref)
    const careerUrl = careerPath.startsWith('http') ? careerPath
      : careerPath.startsWith('/') ? `https://www.studenti.unipi.it${careerPath}`
      : `https://www.studenti.unipi.it/${careerPath}`
    const careerPage = await followRedirects(careerUrl, page.cookies)
    if (!careerPage) return { fatture: [] }
    return { fatture: parseTasse(careerPage.body) }
  }

  return { fatture: parseTasse(page.body) }
}

module.exports = async function handler(req, res) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'No auth' })
  const result = await getTasse(auth)
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json(result)
}

module.exports.getTasse = getTasse
