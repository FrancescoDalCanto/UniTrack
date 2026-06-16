export default async function handler(req, res) {
  const segments = req.query.path ?? []
  const path = Array.isArray(segments) ? segments.join('/') : segments
  const upstreamUrl = `https://www.studenti.unipi.it/e3rest/${path}`

  const headers = {}
  if (req.headers.authorization) headers['authorization'] = req.headers.authorization
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']

  try {
    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    })

    const contentType = response.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)

    const body = await response.text()
    res.status(response.status).send(body)
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', details: err.message })
  }
}
