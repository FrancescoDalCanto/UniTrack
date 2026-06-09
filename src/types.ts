export interface Exam {
  id: string
  name: string
  grade: number // 18–30
  lode: boolean
  cfu: number
  date: string // ISO date string
  pending: boolean // esame da sostenere ancora
}

export interface StudentInfo {
  nome: string
  cognome: string
  matricola: string
  matId: number
  corso: string
  token: string
}

// Struttura grezza restituita dall'API ESSE3
export interface LibrettoRow {
  adsId: number
  adDes: string
  cfuPrevisti: number
  cfuPeso: number
  anno: number
  stato: string | null
  esito: {
    voto: number | null
    lode: boolean
    dataEsaSuperamento: string | null
  } | null
}
