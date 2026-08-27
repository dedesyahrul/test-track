import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClosureSummary, fetchClosureTable, fetchModules } from '../services/api'
import {
  Calendar, Clock, CheckCircle2, AlertCircle, UserCheck, ShieldAlert,
  Search, Filter, ChevronLeft, ChevronRight, X, ArrowUpRight, TrendingUp, RefreshCcw
} from 'lucide-react'
import clsx from 'clsx'

function SeverityBadge({ level }) {
  const map = {
    Fatal: 'bg-red-100 text-red-800 border-red-200',
    Major: 'bg-orange-100 text-orange-800 border-orange-200',
    Minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Kosmetik: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return <span className={clsx('px-2 py-0.5 rounded text-[11px] font-semibold border', map[level] || 'bg-slate-100 text-slate-700')}>{level || '-'}</span>
}

function StatusBadge({ status }) {
  if (status === 'Closed') {
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">Closed</span>
  }
  if (status === 'Open' || status === 'Re-Opened') {
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 animate-pulse">Open</span>
  }
  return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">{status}</span>
}

function CreatedAgeBadge({ dateCreated, aging }) {
  if (!dateCreated) return null
  const todayStr = new Date().toISOString().slice(0, 10)
  if (dateCreated === todayStr) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm animate-pulse">HARI INI</span>
  }
  if (aging <= 3) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">BARU (1-3d)</span>
  }
  if (aging > 14) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">OVERDUE ({aging}d)</span>
  }
  if (aging > 7) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">LAMA ({aging}d)</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{aging}d</span>
}

export default function DefectClosurePage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('closed') // 'closed', 'created', 'all'
  const [moduleId, setModuleId] = useState('')
  const [createdAge, setCreatedAge] = useState('') // 'today', 'new', 'recent', 'old', 'overdue'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  const summaryParams = {
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
    ...(moduleId && { module_id: Number(moduleId) }),
    ...(createdAge && { created_age: createdAge }),
  }

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['closureSummary', summaryParams],
    queryFn: () => fetchClosureSummary(summaryParams),
  })

  const tableParams = {
    page,
    page_size: 15,
    type,
    ...(search && { search }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
    ...(moduleId && { module_id: Number(moduleId) }),
    ...(createdAge && { created_age: createdAge }),
  }

  const { data: tableData, isLoading: loadingTable } = useQuery({
    queryKey: ['closureTable', tableParams],
    queryFn: () => fetchClosureTable(tableParams),
    keepPreviousData: true,
  })

  const handlePresetDate = (days) => {
    const today = new Date().toISOString().slice(0, 10)
    const past = new Date(new Date().setDate(new Date().getDate() - days)).toISOString().slice(0, 10)
    setDateFrom(past)
    setDateTo(today)
    setPage(1)
  }

  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setModuleId('')
    setCreatedAge('')
    setSearch('')
    setType('closed')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Defect Closure Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tracking & analisis laju penutupan defect per rentang tanggal pengujian
          </p>
        </div>
      </div>

      {/* Date Range & Filter Panel */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Picker Bar */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-primary-600" />
              Periode Tanggal:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-medium">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />

            {/* Presets */}
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
              <button onClick={() => handlePresetDate(7)} className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">
                7 Hari
              </button>
              <button onClick={() => handlePresetDate(14)} className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">
                14 Hari
              </button>
              <button onClick={() => handlePresetDate(30)} className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">
                30 Hari
              </button>
            </div>
          </div>

          {/* Module & Age Filter & Reset */}
          <div className="flex items-center space-x-3">
            <select
              value={createdAge}
              onChange={(e) => { setCreatedAge(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-bold text-slate-700"
            >
              <option value="">Semua Umur Defect</option>
              <option value="today">Hari Ini (New Today)</option>
              <option value="new">Baru (1 - 3 Hari)</option>
              <option value="recent">Terbaru (4 - 7 Hari)</option>
              <option value="old">Lama (&gt;7 Hari)</option>
              <option value="overdue">Sangat Lama / Overdue (&gt;14 Hari)</option>
            </select>

            <select
              value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
            >
              <option value="">Semua Module</option>
              {(modules || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {(dateFrom || dateTo || moduleId || createdAge || search) && (
              <button onClick={handleReset} className="text-xs text-red-600 hover:underline font-semibold flex items-center">
                <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Closed Count */}
        <div className="stat-card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Defect Baru Closed</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{summary?.closed_count || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Fatal: <strong className="text-slate-600">{summary?.fatal_closed || 0}</strong> &bull; Major: <strong className="text-slate-600">{summary?.major_closed || 0}</strong>
          </p>
        </div>

        {/* Created Count */}
        <div className="stat-card p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-600 uppercase">Defect Baru Dilaporkan</p>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{summary?.created_count || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Pada periode tanggal yang dipilih
          </p>
        </div>

        {/* Avg Resolution Speed */}
        <div className="stat-card p-5 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-600 uppercase">Rata-rata Laju Fixing</p>
            <Clock className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-primary-700 mt-2">{summary?.avg_closing_days || 0} Hari</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Durasi rata-rata dari Created → Closed
          </p>
        </div>

        {/* Top Resolvers */}
        <div className="stat-card p-4 bg-slate-50/80">
          <p className="text-xs font-semibold text-slate-500 uppercase flex items-center mb-2">
            <UserCheck className="w-4 h-4 mr-1 text-slate-600" /> Top Resolvers (Tester)
          </p>
          <div className="space-y-1 text-xs">
            {(summary?.top_resolvers || []).map((r, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-slate-700 font-medium truncate max-w-[130px]">{r.name}</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px]">
                  {r.count} closed
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setType('closed'); setPage(1) }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
                type === 'closed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Defect Baru Closed ({summary?.closed_count || 0})
            </button>
            <button
              onClick={() => { setType('created'); setPage(1) }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
                type === 'created' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Defect Dilaporkan ({summary?.created_count || 0})
            </button>
            <button
              onClick={() => { setType('all'); setPage(1) }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
                type === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Semua Data Activity
            </button>
          </div>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID, summary..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider w-36">Defect ID</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider max-w-xs">Summary Temuan</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Module</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Durasi (Aging)</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Date Created</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Date Closed</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Resolved / Retested By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingTable ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Loading closure monitor data...
                  </td>
                </tr>
              ) : (tableData?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data defect yang sesuai pada periode ini
                  </td>
                </tr>
              ) : (
                (tableData?.items || []).map((defect) => (
                  <tr key={defect.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary-600">
                      <div>
                        {defect.defect_id}
                        <div className="mt-1">
                          <CreatedAgeBadge dateCreated={defect.date_created} aging={defect.aging} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-slate-800">{defect.summary}</p>
                      {defect.issue_link && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Link: {defect.issue_link}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-medium text-slate-700">{defect.module_name}</p>
                      <p className="text-[11px] text-slate-400">{defect.sub_module_name}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><SeverityBadge level={defect.level_of_defect} /></td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={defect.status} /></td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {defect.aging} Hari
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{defect.date_created || '-'}</td>
                    <td className="px-4 py-3 font-medium text-emerald-700 whitespace-nowrap">{defect.date_closed || '-'}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{defect.last_retested_by || defect.created_by || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tableData && tableData.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Halaman {tableData.page} dari {tableData.total_pages} ({tableData.total} defects)
            </p>
            <div className="flex items-center space-x-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border text-slate-500 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, tableData.total_pages) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={clsx('w-7 h-7 rounded text-xs font-medium', page === i + 1 ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(tableData.total_pages, p + 1))} disabled={page === tableData.total_pages} className="p-1.5 rounded border text-slate-500 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
