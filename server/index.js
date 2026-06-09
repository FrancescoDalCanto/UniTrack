import express from 'express'
import cors from 'cors'
import axios from 'axios'

const app = express()
const PORT = 3000
const ESSE3_BASE = 'https://www.studenti.unipi.it/e3rest/api'

app.use(express.json())
app.use(cors()) // permissivo in locale, il server non è esposto su internet

// Converte username:password in header Basic Auth
function basicAuth(username, password) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

// Login — restituisce info studente + token da usare nelle chiamate successive
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Credenziali mancanti' })
  }
  try {
    const response = await axios.get(`${ESSE3_BASE}/login`, {
      headers: { Authorization: basicAuth(username, password) },
    })
    // Restituiamo anche il token codificato così il frontend lo usa per le chiamate successive
    const token = Buffer.from(`${username}:${password}`).toString('base64')
    console.log('LOGIN OK:', JSON.stringify(response.data, null, 2))
    res.json({ ...response.data, token })
  } catch (err) {
    const status = err.response?.status ?? 500
    if (status === 401) return res.status(401).json({ error: 'Credenziali non valide' })
    res.status(status).json({ error: 'Errore del server ESSE3' })
  }
})

// Libretto — righe del piano di studi con voti
app.get('/api/libretto/:matId/righe', async (req, res) => {
  const { matId } = req.params
  const auth = req.headers['x-esse3-auth']
  if (!auth) return res.status(401).json({ error: 'Non autenticato' })
  try {
    const response = await axios.get(
      `${ESSE3_BASE}/libretto-service-v2/libretti/${matId}/righe`,
      { headers: { Authorization: `Basic ${auth}` } }
    )
    console.log('LIBRETTO:', JSON.stringify(response.data?.[0], null, 2)) // logga solo la prima riga
    res.json(response.data)
  } catch (err) {
    console.error('LIBRETTO ERROR status:', err.response?.status)
    console.error('LIBRETTO ERROR data:', JSON.stringify(err.response?.data))
    console.error('LIBRETTO ERROR url:', `${ESSE3_BASE}/libretto-service-v2/libretti/${matId}/righe`)
    res.status(err.response?.status ?? 500).json({ error: 'Errore nel recupero del libretto' })
  }
})

// Medie — media ponderata calcolata da ESSE3
app.get('/api/libretto/:matId/medie', async (req, res) => {
  const { matId } = req.params
  const auth = req.headers['x-esse3-auth']
  if (!auth) return res.status(401).json({ error: 'Non autenticato' })
  try {
    const response = await axios.get(
      `${ESSE3_BASE}/libretto-service-v2/libretti/${matId}/medie`,
      { headers: { Authorization: `Basic ${auth}` } }
    )
    res.json(response.data)
  } catch (err) {
    res.status(err.response?.status ?? 500).json({ error: 'Errore nel recupero delle medie' })
  }
})

app.listen(PORT, () => {
  console.log(`Proxy ESSE3 in ascolto su http://localhost:${PORT}`)
})
