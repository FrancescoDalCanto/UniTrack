import type { StudentInfo, LibrettoRow } from './types'

const BASE = '/e3rest/api'

function basicAuth(username: string, password: string) {
  return 'Basic ' + btoa(`${username}:${password}`)
}

export async function login(username: string, password: string): Promise<StudentInfo> {
  const res = await fetch(`${BASE}/login`, {
    headers: { Authorization: basicAuth(username, password) },
  })
  if (res.status === 401) throw new Error('Credenziali non valide')
  if (!res.ok) throw new Error('Errore del server ESSE3')

  const data = await res.json()
  const carriere: any[] = data.user?.trattiCarriera ?? []

  // Prende la carriera attiva (staStuCod A), altrimenti la prima
  const career =
    carriere.find(c => c.staStuCod === 'A') ??
    carriere[0] ??
    {}

  return {
    nome: data.user?.firstName ?? '',
    cognome: data.user?.lastName ?? '',
    matricola: career.matricola ?? data.user?.userId ?? '',
    matId: career.matId ?? 0,
    corso: career.cdsDes ?? '',
    token: btoa(`${username}:${password}`),
  }
}

export async function fetchLibretto(matId: number, token: string): Promise<LibrettoRow[]> {
  const res = await fetch(`${BASE}/libretto-service-v2/libretti/${matId}/righe`, {
    headers: { Authorization: `Basic ${token}` },
  })
  if (!res.ok) throw new Error(`Errore nel recupero del libretto (${res.status})`)

  const data = await res.json()
  console.log('LIBRETTO prima riga:', JSON.stringify(data?.[0], null, 2))
  return data
}
