import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHealthIndex, fetchTraceabilityMatrix, syncTraceabilityStatuses,
  exportTraceabilityExcel, fetchModules
} from '../services/api'
import {
  ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, FileSpreadsheet,
  Search, Filter, Link, Unlink, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, ArrowRight, Activity, Cpu, Layers
} from 'lucide-react'
import clsx from 'clsx'

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  if (s.startsWith('pass') || s.startsWith('ok') || s.startsWith('berhasil')) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Pass</span>
  }
  if (s.startsWith('fail') || s.startsWith('gagal') || s.startsWith('bug')) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Fail</span>
  }
  if (s.startsWith('block') || s.startsWith('kendala')) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">Blocked</span>
  }
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Untested'}</span>
}

function SeverityBadge({ level }) {
  const map = {
    Fatal: 'bg-red-100 text-red-800 border-red-200',
    Major: 'bg-orange-100 text-orange-800 border-orange-200',
    Minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Kosmetik: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return level ? (
    <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border', map[level] || 'bg-slate-100 text-slate-700')}>
      {level}
    </span>
  ) : <span className="text-slate-300 text-xs">-</span>
}

function DefectStatusBadge({ status }) {
  if (status === 'Closed') {
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700">Closed</span>
  }
  if (status === 'Open' || status === 'Re-Opened') {
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 animate-pulse">Open</span>
  }
  return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-700">{status}</span>
}

export default function TraceabilityPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // 'linked', 'unlinked', 'discrepancy', 'fail', 'pass'
  const [moduleId, setModuleId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const { data: health } = useQuery({
    queryKey: ['healthIndex'],
    queryFn: fetchHealthIndex,
  })

  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: fetchModules,
  })

  const params = {
    page,
    page_size: 15,
    ...(search && { search }),
    ...(statusFilter && { status_filter: statusFilter }),
    ...(moduleId && { module_id: Number(moduleId) }),
  }

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ['traceabilityMatrix', params],
    queryFn: () => fetchTraceabilityMatrix(params),
    keepPreviousData: true,
  })

  const syncMutation = useMutation({
    mutationFn: syncTraceabilityStatuses,
    onSuccess: (res) => {
      setSyncMessage(res.message)
      queryClient.invalidateQueries()
    },
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncMutation.mutateAsync()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matriks Traceability (RTM)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Korelasi & Pengikatan Real-time antara Test Script vs Defect Tracking
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-4 h-4 mr-2', syncing && 'animate-spin')} />
            Auto Sync Status
          </button>

          <button
            onClick={() => exportTraceabilityExcel()}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export RTM Excel
          </button>
        </div>
      </div>

      {/* Sync Success Notification */}
      {syncMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">X</button>
        </div>
      )}

      {/* Health Index & Readiness Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness Status Card */}
        <div className={clsx(
          'card p-5 border-l-4 flex items-center justify-between',
          health?.readiness_color === 'red' ? 'border-l-red-500 bg-red-50/40' :
          health?.readiness_color === 'orange' ? 'border-l-orange-500 bg-orange-50/40' :
          'border-l-emerald-500 bg-emerald-50/40'
        )}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Kesiapan Application</p>
            <p className={clsx(
              'text-xl font-bold mt-1',
              health?.readiness_color === 'red' ? 'text-red-700' :
              health?.readiness_color === 'orange' ? 'text-orange-700' : 'text-emerald-700'
            )}>
              {health?.readiness_status || 'LOADING...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Fatal Open: <strong className="text-red-600">{health?.fatal_open || 0}</strong> &bull; Major Open: <strong className="text-orange-600">{health?.major_open || 0}</strong>
            </p>
          </div>
          <ShieldAlert className={clsx(
            'w-10 h-10',
            health?.readiness_color === 'red' ? 'text-red-500' :
            health?.readiness_color === 'orange' ? 'text-orange-500' : 'text-emerald-500'
          )} />
        </div>

        {/* SIT Quality Index Score */}
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SIT Health Index Score</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-bold text-primary-700">{health?.health_score || 0}%</span>
              <span className="text-xs text-slate-400">Quality Score</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total Defect: <strong>{health?.total_defects || 0}</strong> ({health?.open_defects || 0} Open)
            </p>
          </div>
          <Activity className="w-10 h-10 text-primary-500" />
        </div>

        {/* Discrepancy Alert Box */}
        <div className={clsx(
          'card p-5 flex items-center justify-between',
          health?.discrepancy_count > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50'
        )}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Discrepancy</p>
            <p className={clsx('text-2xl font-bold mt-1', health?.discrepancy_count > 0 ? 'text-amber-700' : 'text-slate-700')}>
              {health?.discrepancy_count || 0} Test Scripts
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {health?.discrepancy_count > 0
                ? 'Status PASS padahal ada Defect Open terikat!'
                : 'Semua status Test Script cocok dengan status Defect.'}
            </p>
          </div>
          <AlertTriangle className={clsx('w-9 h-9', health?.discrepancy_count > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-300')} />
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, Skenario, Step..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Hubungan Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter Kategori Matrix</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
            >
              <option value="">Semua Data Matrix</option>
              <option value="linked">Terikat Defect (Linked)</option>
              <option value="unlinked">Tanpa Defect (Unlinked)</option>
              <option value="discrepancy">Peringatan Discrepancy (PASS + Defect Open)</option>
              <option value="fail">Test Script FAIL</option>
              <option value="pass">Test Script PASS</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
            <select
              value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Module</option>
              {(modules || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filter */}
          <div className="flex items-end justify-end">
            {(search || statusFilter || moduleId) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setModuleId(''); setPage(1) }}
                className="text-xs text-red-600 hover:underline font-semibold pb-2"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Traceability Matrix Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider w-40">Test Case ID</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider max-w-xs">Test Case Summary & Modul</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider w-24">Overall Status</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Detail Langkah Pengujian (Test Steps) & Defect Terikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span>Loading Traceability Matrix V2...</span>
                    </div>
                  </td>
                </tr>
              ) : (matrixData?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data Traceability Matrix yang sesuai
                  </td>
                </tr>
              ) : (
                (matrixData?.items || []).map((row) => (
                  <tr
                    key={row.test_case_db_id || row.test_script_id}
                    className={clsx(
                      'transition-colors hover:bg-slate-50/80',
                      row.is_discrepancy ? 'bg-amber-50/40' : ''
                    )}
                  >
                    {/* Test Case ID */}
                    <td className="px-4 py-3.5 align-top font-mono font-bold text-primary-600">
                      <div>
                        {row.test_case_id}
                        {row.is_discrepancy && (
                          <span className="block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                            Discrepancy Alert
                          </span>
                        )}
                        {row.last_tester && (
                          <p className="text-[10px] text-slate-400 font-normal mt-1">Tester: {row.last_tester}</p>
                        )}
                      </div>
                    </td>

                    {/* Test Case Summary */}
                    <td className="px-4 py-3.5 align-top max-w-xs">
                      <p className="font-semibold text-slate-800">{row.summary}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{row.module_name}</p>
                      {row.component && (
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{row.component}</p>
                      )}
                    </td>

                    {/* Overall Status */}
                    <td className="px-4 py-3.5 align-top text-center">
                      <StatusBadge status={row.overall_status} />
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">{row.total_steps} Steps</p>
                    </td>

                    {/* Detail Test Steps & Defect Terikat */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-2">
                        {(row.steps || []).map((st, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-slate-700">Step {st.step_no}</span>
                              <StatusBadge status={st.status} />
                            </div>

                            <p className="text-slate-800 font-mono text-[11px] whitespace-pre-wrap">{st.test_step}</p>
                            {st.expected_result && (
                              <p className="text-slate-500 text-[11px] whitespace-pre-wrap"><strong className="text-slate-600">Expected:</strong> {st.expected_result}</p>
                            )}

                            {/* Defect Terikat per Step */}
                            {st.linked_defects && st.linked_defects.length > 0 && (
                              <div className="pt-1.5 border-t border-slate-200 space-y-1">
                                {st.linked_defects.map((def, dIdx) => (
                                  <div key={dIdx} className="p-2 bg-red-50/60 border border-red-200 rounded text-xs space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-mono font-bold text-red-600">{def.defect_id}</span>
                                        <SeverityBadge level={def.level} />
                                      </div>
                                      <DefectStatusBadge status={def.status} />
                                    </div>
                                    <p className="text-slate-700 text-xs">{def.summary}</p>
                                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
                                      <span>PIC: <strong className="text-slate-600">{def.confirmed_by}</strong></span>
                                      {def.keterangan && <span className="truncate max-w-[200px]" title={def.keterangan}>Note: {def.keterangan}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {matrixData && matrixData.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Halaman {matrixData.page} dari {matrixData.total_pages} ({matrixData.total} items)
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, matrixData.total_pages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      page === pageNum ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(matrixData.total_pages, p + 1))}
                disabled={page === matrixData.total_pages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
