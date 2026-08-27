import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchModules, fetchModuleDefectDetail } from '../services/api'
import { Package, ChevronDown, ChevronRight, Bug, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ModulesPage() {
  const { data: modules, isLoading } = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const [expandedModule, setExpandedModule] = useState(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Modules</h1>
        <p className="text-slate-500 text-sm mt-1">{(modules || []).length} modules terdaftar</p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(modules || []).map(mod => {
          const resolvedPct = mod.total_defects > 0
            ? ((mod.closed_defects / mod.total_defects) * 100).toFixed(0)
            : 0
          return (
            <div key={mod.id} className="card overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-primary-50">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{mod.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{mod.sub_module_count} sub-modules</p>
                    </div>
                  </div>
                  {expandedModule === mod.id
                    ? <ChevronDown className="w-5 h-5 text-slate-400" />
                    : <ChevronRight className="w-5 h-5 text-slate-400" />
                  }
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-slate-800">{mod.total_defects}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-50">
                    <p className="text-lg font-bold text-red-600">{mod.open_defects}</p>
                    <p className="text-[10px] text-red-400 uppercase tracking-wider">Open</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-50">
                    <p className="text-lg font-bold text-green-600">{mod.closed_defects}</p>
                    <p className="text-[10px] text-green-400 uppercase tracking-wider">Closed</p>
                  </div>
                </div>

                {/* Resolution progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Resolution</span>
                    <span className="font-medium text-slate-600">{resolvedPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${resolvedPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedModule === mod.id && (
                <ModuleDetails moduleId={mod.id} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModuleDetails({ moduleId }) {
  const { data: details, isLoading } = useQuery({
    queryKey: ['moduleDetail', moduleId],
    queryFn: () => fetchModuleDefectDetail(moduleId),
    enabled: !!moduleId,
  })

  if (isLoading) {
    return (
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!details || details.length === 0) {
    return (
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-sm text-slate-400 text-center py-4">No defect data for sub-modules</p>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100">
      {/* Chart */}
      <div className="p-5">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={details.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="sub_module" type="category" width={150} tick={{ fontSize: 9 }}
              tickFormatter={v => v.length > 25 ? v.slice(0, 25) + '...' : v} />
            <Tooltip />
            <Bar dataKey="total_defect" name="Defect" fill="#ef4444" radius={[0, 4, 4, 0]} />
            <Bar dataKey="total_non_defect" name="Non-Defect" fill="#94a3b8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="px-5 pb-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 text-left text-slate-500 font-medium">Sub-Module</th>
              <th className="py-2 text-right text-slate-500 font-medium">Defect</th>
              <th className="py-2 text-right text-slate-500 font-medium">Non-Defect</th>
              <th className="py-2 text-right text-slate-500 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-2 text-slate-600 pr-2">{d.sub_module}</td>
                <td className="py-2 text-right font-semibold text-red-600">{d.total_defect}</td>
                <td className="py-2 text-right text-slate-500">{d.total_non_defect}</td>
                <td className="py-2 text-right font-bold text-slate-800">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
