import { useQuery } from '@tanstack/react-query'
import { fetchScoringSummary, fetchDailySummary, fetchModuleSummary } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { FileBarChart, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export default function ReportsPage() {
  const { data: scoring, isLoading: loadingScoring } = useQuery({
    queryKey: ['scoringSummary'], queryFn: fetchScoringSummary
  })
  const { data: daily } = useQuery({
    queryKey: ['dailySummary'], queryFn: fetchDailySummary
  })
  const { data: moduleSummary } = useQuery({
    queryKey: ['moduleSummary'], queryFn: fetchModuleSummary
  })

  if (loadingScoring) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  const categoryColors = {
    Fatal: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
    Major: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500' },
    Minor: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
    Kosmetik: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Defect scoring & summary report</p>
      </div>

      {/* Scoring Summary */}
      <div className="card">
        <div className="card-header flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-700">Defect Scoring - Penyelesaian Temuan</h3>
        </div>
        <div className="card-body">
          {/* Scoring Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(scoring?.items || []).map(item => {
              const c = categoryColors[item.category] || categoryColors.Minor
              return (
                <div key={item.category} className={clsx('rounded-xl border p-4', c.bg, c.border)}>
                  <div className="flex items-center justify-between">
                    <p className={clsx('text-sm font-bold', c.text)}>{item.category}</p>
                    <span className={clsx('text-xs font-mono', c.text)}>x{item.weight}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Closed</p>
                      <p className="text-lg font-bold text-emerald-600">{item.total_closed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Open</p>
                      <p className="text-lg font-bold text-red-600">{item.total_open}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/50">
                    <p className="text-[10px] text-slate-400 uppercase">Score (Open)</p>
                    <p className={clsx('text-xl font-bold', c.text)}>{item.score_open}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals */}
          {scoring?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-400">Total All Defects</p>
                <p className="text-2xl font-bold text-slate-800">{scoring.totals.total_all}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Closed</p>
                <p className="text-2xl font-bold text-emerald-600">{scoring.totals.total_closed}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Open</p>
                <p className="text-2xl font-bold text-red-600">{scoring.totals.total_open}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Score (Open)</p>
                <p className="text-2xl font-bold text-orange-600">{scoring.totals.total_score_open}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Summary Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">Daily Defect Discovery</h3>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="defects" name="Defects" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="non_defects" name="Non-Defects" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">Module Summary - Temuan per Module</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {(moduleSummary || []).map((mod, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">{mod.module}</h4>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-red-600 font-bold">{mod.total_defect} defects</span>
                    <span className="text-slate-400">{mod.total_non_defect} non-defects</span>
                    <span className="font-bold text-slate-800">Total: {mod.total}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Sub-Module</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Defect</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Non-Defect</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(mod.sub_modules || []).map((sub, j) => (
                        <tr key={j} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 text-slate-600">{sub.name}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{sub.defects}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{sub.non_defects}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800">{sub.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {i < (moduleSummary || []).length - 1 && <hr className="mt-4 border-slate-100" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
