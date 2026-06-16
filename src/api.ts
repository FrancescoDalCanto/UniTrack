import type { StudentInfo, LibrettoRow } from './types'

function basicAuth(username: string, password: string) {
  return 'Basic ' + btoa(`${username}:${password}`)
}

function esse3Url(path: string): string {
  return import.meta.env.DEV ? `/e3rest/${path}` : `/api/esse3?path=${path}`
}

export async function login(username: string, password: string): Promise<StudentInfo> {
  const res = await fetch(esse3Url('api/login'), {
    headers: { Authorization: basicAuth(username, password) },
  })
  if (res.status === 401) throw new Error('Credenziali non valide')
  if (!res.ok) throw new Error(`Errore del server ESSE3 (${res.status})`)

  const data = await res.json()
  const carriere: any[] = data.user?.trattiCarriera ?? []
  console.log('CARRIERE (raw):', JSON.stringify(carriere, null, 2))
  const career = carriere.find(c => c.staStuCod === 'A') ?? carriere[0] ?? {}

  const cdsDes: string = career.cdsDes ?? ''
  let totalCfu: number
  if (/ciclo\s*unico/i.test(cdsDes)) {
    totalCfu = /medicina\s+e\s+chirurgia|odontoiatria/i.test(cdsDes) ? 360 : 300
  } else if (/magistrale/i.test(cdsDes)) {
    totalCfu = 120
  } else {
    totalCfu = 180
  }

  return {
    nome: data.user?.firstName ?? '',
    cognome: data.user?.lastName ?? '',
    matricola: career.matricola ?? data.user?.userId ?? '',
    matId: career.matId ?? 0,
    corso: cdsDes,
    token: btoa(`${username}:${password}`),
    totalCfu,
  }
}

export async function fetchLibretto(matId: number, token: string): Promise<LibrettoRow[]> {
  const res = await fetch(esse3Url(`api/libretto-service-v2/libretti/${matId}/righe`), {
    headers: { Authorization: `Basic ${token}` },
  })
  if (!res.ok) throw new Error(`Errore nel recupero del libretto (${res.status})`)

  const data = await res.json()
  console.log('LIBRETTO prima riga:', JSON.stringify(data?.[0], null, 2))
  return data
}
