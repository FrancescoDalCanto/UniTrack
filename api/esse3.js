export default async function handler(req, res) {
  const path = req.query.path ?? ''
  const upstreamUrl = `https://www.studenti.unipi.it/e3rest/${path}`

  const headers = {}
  if (req.headers.authorization) headers['authorization'] = req.headers.authorization

  try {
    const response = await fetch(upstreamUrl, { method: req.method, headers })
    const contentType = response.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.status(response.status).send(await response.text())
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
