const https = require('https')

module.exports = async function handler(req, res) {
  const path = req.query.path ?? ''
  const url = new URL(`https://www.studenti.unipi.it/e3rest/${path}`)

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: req.method,
    headers: {},
  }

  if (req.headers.authorization) {
    options.headers['authorization'] = req.headers.authorization
  }

  return new Promise((resolve) => {
    const request = https.request(options, (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        if (response.headers['content-type']) {
          res.setHeader('Content-Type', response.headers['content-type'])
        }
        res.status(response.statusCode).send(data)
        resolve()
      })
    })

    request.on('error', (err) => {
      res.status(502).json({ error: err.message })
      resolve()
    })

    request.end()
  })
}
