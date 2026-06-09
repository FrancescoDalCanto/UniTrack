import type { Exam } from '../types'

interface Props {
  exam: Exam
}

export default function ExamCard({ exam }: Props) {
  const gradeLabel = exam.lode ? '30L' : String(exam.grade)
  const gradeColor =
    exam.grade >= 28 ? 'text-green-600' :
    exam.grade >= 24 ? 'text-yellow-600' :
    'text-orange-600'

  const formattedDate = exam.date
    ? new Date(exam.date).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null

  if (exam.pending) {
    return (
      <div className="w-full rounded-xl px-4 py-3 flex items-center justify-between bg-gray-100 border border-dashed border-gray-300">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-400 truncate">{exam.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">da sostenere · {exam.cfu} CFU</p>
        </div>
        <span className="text-xs text-gray-400 ml-4 border border-gray-300 rounded-full px-2 py-0.5">
          {exam.cfu} CFU
        </span>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{exam.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formattedDate} · {exam.cfu} CFU
        </p>
      </div>
      <span className={`text-xl font-bold ml-4 ${gradeColor}`}>
        {gradeLabel}
      </span>
    </div>
  )
}
