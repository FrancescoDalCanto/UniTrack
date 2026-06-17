import { useState, useEffect } from 'react'
import type { Exam, StudentInfo, LibrettoRow, Tassa } from './types'
import { fetchLibretto, fetchTasse } from './api'
import LoginPage from './components/LoginPage'
import ExamCard from './components/ExamCard'


function parseEsse3Date(raw: string | null | undefined): string {
  if (!raw) return ''
  // dd/MM/yyyy → yyyy-MM-dd
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  return raw
}

function rowToExam(row: LibrettoRow): Exam {
  const statoValue = typeof row.stato === 'object' ? (row.stato as any).value : row.stato
  const voto = row.esito?.voto ?? null
  const passed = statoValue === 'S'
  const grade = typeof voto === 'string' ? parseInt(voto) : (voto ?? 0)
  const lode = ((row.esito as any)?.lodeFlg ?? 0) === 1
  const rawDate =
    row.esito?.dataEsaSuperamento ??
    (row as any).esito?.dataAppSuperamento ??
    (row as any).esito?.dataEsa ?? ''
  const date = parseEsse3Date(rawDate)
  const cfu = (row as any).peso ?? row.cfuPeso ?? row.cfuPrevisti ?? 0

  return{
    id: String(row.adsId ?? (row as any).adId ?? (row as any).adsceId),
    name: row.adDes ?? (row as any).adCod ?? '',
    grade: passed ? grade : 0,
    lode,
    cfu,
    date,
    pending: !passed,
  }
}

function detectTotalCfu(cdsCod: string, cdsDes?: string): number | null {
  if (!cdsCod) return null
  if (/-LMCU$/i.test(cdsCod)) {
    return cdsDes && /medicina\s+e\s+chirurgia|odontoiatria/i.test(cdsDes) ? 360 : 300
  }
  if (/-LM$/i.test(cdsCod) || /-LM-/i.test(cdsCod)) return 120
  if (/-L$/i.test(cdsCod) || /-L-/i.test(cdsCod)) return 180
  return null
}

const STORAGE_KEY = 'unitrack-student'

export default function App() {
  const [student, setStudent] = useState<StudentInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [exams, setExams] = useState<Exam[]>([])
  const [tasse, setTasse] = useState<Tassa[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLibretto = (s: StudentInfo) => {
    setLoading(true)
    setError(null)
    Promise.all([fetchLibretto(s.matId, s.token), fetchTasse(s.token)])
      .then(([rows, tasseData]) => {
        setExams(rows.map(rowToExam))
        setTasse(tasseData)
        const cdsCod: string = (rows[0] as any)?.chiaveADContestualizzata?.cdsCod ?? ''
        const totalCfu = detectTotalCfu(cdsCod, s.corso)
        if (totalCfu !== null && totalCfu !== s.totalCfu) {
          const updated = { ...s, totalCfu }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          setStudent(updated)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!student) return
    loadLibretto(student)
  }, [student])

  const passedExams = exams.filter(e => !e.pending)

  // Esami con voto numerico (≥18): usati per la media ponderata
  const gradedExams = passedExams.filter(e => e.grade >= 18)

  const totalCFU = passedExams.reduce((sum, e) => sum + e.cfu, 0)
  const gradedCFU = gradedExams.reduce((sum, e) => sum + e.cfu, 0)
  const weightedSum = gradedExams.reduce((sum, e) => sum + (e.lode ? 32 : e.grade) * e.cfu, 0)
  const average = gradedCFU > 0 ? weightedSum / gradedCFU : null
  const projected110 = average !== null ? (average / 30) * 110 : null
  const TOTAL_CFU = student?.totalCfu ?? 180
  const progress = Math.min((totalCFU / TOTAL_CFU) * 100, 100)

  const handleLogin = (s: StudentInfo) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setStudent(s)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setStudent(null)
    setExams([])
  }

  const refresh = () => {
    if (student) loadLibretto(student)
  }

  const [tab, setTab] = useState<'esami' | 'tasse' | 'dafare'>('esami')

  if (!student) return <LoginPage onLogin={handleLogin} />

  const pendingExams = exams.filter(e => e.pending)

  const sortedPassed = [...passedExams].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 pb-6" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex justify-between items-center mb-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">UniTrack</h1>
            <p className="text-indigo-200 text-xs mt-0.5">
              {student.nome} {student.cognome}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-full px-4 h-10 flex items-center text-sm font-medium transition-colors"
            >
              {loading ? '...' : 'Aggiorna'}
            </button>
            <button
              onClick={logout}
              className="bg-white/20 hover:bg-white/30 rounded-full px-4 h-10 flex items-center text-sm font-medium transition-colors"
            >
              Esci
            </button>
          </div>
        </div>

        {student.corso && (
          <p className="text-xs text-indigo-300 mb-5 truncate">{student.corso}</p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {average !== null ? average.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-indigo-200 mt-0.5">Media /30</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {projected110 !== null ? projected110.toFixed(1) : '—'}
            </div>
            <div className="text-xs text-indigo-200 mt-0.5">Base /110</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{passedExams.length}</div>
            <div className="text-xs text-indigo-200 mt-0.5">Esami</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span>Crediti acquisiti</span>
            <span className="font-medium">{totalCFU} / {TOTAL_CFU} CFU</span>
          </div>
          <div className="bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-2">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-8">Caricamento…</p>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && tab === 'esami' && (
          sortedPassed.length > 0
            ? sortedPassed.map(exam => <ExamCard key={exam.id} exam={exam} />)
            : <p className="text-center text-gray-400 text-sm mt-16">Nessun esame superato.</p>
        )}

        {!loading && !error && tab === 'tasse' && (
          tasse.length > 0
            ? tasse.map((t, i) => (
                <div key={i} className={`bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between ${t.pagata ? 'opacity-40' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t.descrizione || `Rata ${t.anno}`}</p>
                    <p className={`text-xs font-medium mt-0.5 ${t.pagata ? 'text-green-500' : 'text-red-400'}`}>
                      {t.pagata ? 'Pagata' : t.scadenza ? `Scadenza: ${t.scadenza}` : 'Da pagare'}
                    </p>
                  </div>
                  {t.importo && (
                    <span className={`text-sm font-semibold ml-4 shrink-0 ${t.pagata ? 'text-gray-400' : 'text-red-500'}`}>
                      {t.importo}
                    </span>
                  )}
                </div>
              ))
            : <p className="text-center text-gray-400 text-sm mt-16">Nessuna tassa trovata.</p>
        )}

        {!loading && !error && tab === 'dafare' && (
          pendingExams.length > 0
            ? pendingExams.map(exam => <ExamCard key={exam.id} exam={exam} />)
            : <p className="text-center text-gray-400 text-sm mt-16">Nessun esame da sostenere.</p>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {([
          { id: 'esami', label: 'Esami', count: passedExams.length },
          { id: 'tasse', label: 'Tasse', count: tasse.length },
          { id: 'dafare', label: 'Da dare', count: pendingExams.length },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <span className="text-base font-bold">{t.count}</span>
            <span>{t.label}</span>
            {tab === t.id && <span className="absolute bottom-0 w-12 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  )
}
