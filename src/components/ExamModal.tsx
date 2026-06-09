import { useState } from 'react'
import type { Exam } from '../types'

interface Props {
  exam: Exam | null
  onSave: (exam: Exam) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function ExamModal({ exam, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(exam?.name ?? '')
  const [grade, setGrade] = useState(exam?.grade ?? 28)
  const [lode, setLode] = useState(exam?.lode ?? false)
  const [cfu, setCfu] = useState(exam?.cfu ?? 6)
  const [date, setDate] = useState(exam?.date ?? new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: exam?.id ?? crypto.randomUUID(),
      name: name.trim(),
      grade,
      lode: grade === 30 && lode,
      cfu,
      date,
      pending: false,
    })
  }

  const handleGradeChange = (val: number) => {
    setGrade(val)
    if (val !== 30) setLode(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {exam ? 'Modifica esame' : 'Nuovo esame'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome esame</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="es. Analisi Matematica I"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voto</label>
              <select
                value={grade}
                onChange={e => handleGradeChange(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 13 }, (_, i) => 18 + i).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CFU</label>
              <input
                type="number"
                value={cfu}
                onChange={e => setCfu(Number(e.target.value))}
                min={1}
                max={30}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {grade === 30 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lode}
                onChange={e => setLode(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              Con lode (30L)
            </label>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            {exam ? 'Salva modifiche' : 'Aggiungi esame'}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(exam!.id)}
              className="w-full border border-red-300 text-red-500 rounded-xl py-3 font-medium text-sm hover:bg-red-50 transition-colors"
            >
              Elimina esame
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
