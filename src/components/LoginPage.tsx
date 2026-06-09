import { useState } from 'react'
import { login } from '../api'
import type { StudentInfo } from '../types'

interface Props {
  onLogin: (student: StudentInfo) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const student = await login(username, password)
      onLogin(student)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center text-white">
        <h1 className="text-4xl font-bold tracking-tight mb-1">UniTrack</h1>
        <p className="text-indigo-200 text-sm">Accedi con le credenziali del portale UniPi</p>
      </div>

      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="es. f.rossi"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Le credenziali vengono usate solo per comunicare con il portale UniPi e non vengono salvate su disco.
        </p>
      </div>
    </div>
  )
}
