import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTestScripts, fetchTestScriptStats, fetchModules, fetchTestScriptFilterOptions,
  importTestScriptExcel, downloadTestScriptTemplate, exportTestScripts, exportTestScriptRekap,
  fetchTestScriptCrossCheck
} from '../services/api'
import {
  FileText, CheckCircle2, XCircle, AlertOctagon, HelpCircle, Clock,
  Upload, Download, FileDown, FileSpreadsheet, Search, Filter, RefreshCw, X, ChevronLeft,
  ChevronRight, Info, Eye, Layers, Calendar, User, BarChart2, ShieldCheck, AlertTriangle,
  CheckSquare, List
} from 'lucide-react'
import clsx from 'clsx'

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  if (s.startsWith('pass') || s.startsWith('ok') || s.startsWith('berhasil') || s.startsWith('done')) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{status}</span>
  }
  if (s.startsWith('fail') || s.startsWith('gagal') || s.startsWith('bug') || s.startsWith('error')) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">{status}</span>
  }
  if (s.startsWith('block') || s.startsWith('kendala') || s.startsWith('stopper')) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">{status}</span>
  }
  if (s.startsWith('in prog') || s.startsWith('proses') || s.startsWith('pending')) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{status}</span>
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Untested'}</span>
}

const INITIAL_FILTERS = {
  status: '',
  module_id: '',
  components: '',
  tester: '',
  stage: '',
  cycle: '',
  date_from: '',
  date_to: '',
}

export default function TestScriptsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showFilters, setShowFilters] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedScript, setSelectedScript] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [showCrossCheck, setShowCrossCheck] = useState(false)
  const [crossCheckData, setCrossCheckData] = useState(null)
  const [crossCheckLoading, setCrossCheckLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['testScriptStats'],
    queryFn: fetchTestScriptStats,
  })

  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: fetchModules,
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['testScriptFilterOptions'],
    queryFn: fetchTestScriptFilterOptions,
  })

  const params = {
    page,
    page_size: 15,
    ...(search && { search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.module_id && { module_id: Number(filters.module_id) }),
    ...(filters.components && { components: filters.components }),
    ...(filters.tester && { tester: filters.tester }),
    ...(filters.stage && { stage: filters.stage }),
    ...(filters.cycle && { cycle: Number(filters.cycle) }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['testScripts', params],
    queryFn: () => fetchTestScripts(params),
    keepPreviousData: true,
  })

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: importTestScriptExcel,
    onSuccess: (res) => {
      setImportResult(res)
      setSelectedFile(null)
      queryClient.invalidateQueries()
    },
    onError: (err) => {
      setImportResult({
        success: false,
        message: err.response?.data?.detail || 'Gagal mengimport file Test Script',
      })
    },
  })

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImportSubmit = () => {
    if (selectedFile) importMutation.mutate(selectedFile)
  }

  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
    setPage(1)
  }

  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS)
    setSearch('')
    setPage(1)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0)

  const handleCrossCheck = async () => {
    setShowCrossCheck(true)
    setCrossCheckLoading(true)
    try {
      const data = await fetchTestScriptCrossCheck()
      setCrossCheckData(data)
    } catch (e) {
      setCrossCheckData({ error: e?.response?.data?.detail || 'Gagal memuat data cross-check' })
    } finally {
      setCrossCheckLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Script Document</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen dan monitoring eksekusi pengujian Test Script / Test Case
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => downloadTestScriptTemplate()}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2 text-slate-400" />
            Template
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>

          <button
            onClick={() => exportTestScripts(params)}
            className="flex items-center px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export Dokumen Excel
          </button>

          <button
            onClick={() => exportTestScriptRekap(params)}
            className="flex items-center px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Rekap Excel (11 Kolom)
          </button>

          <button
            onClick={handleCrossCheck}
            className="flex items-center px-4 py-2 bg-amber-500 rounded-lg text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Cross-check DB
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="stat-card p-4">
          <p className="text-xs text-slate-400 font-medium uppercase">Total Cases</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.total || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">test case</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-violet-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-violet-600 font-medium uppercase">Total Steps</p>
            <List className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-violet-700 mt-1">{stats?.total_steps || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">langkah pengujian</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600 font-medium uppercase">Pass</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats?.pass_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-600 font-medium uppercase">Fail</p>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats?.fail_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <p className="text-xs text-orange-600 font-medium uppercase">Blocked</p>
            <AlertOctagon className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats?.blocked_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase">Untested</p>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-600 mt-1">{stats?.untested_count || 0}</p>
        </div>

        <div className="stat-card p-4 bg-primary-50 border-primary-200">
          <p className="text-xs text-primary-600 font-medium uppercase">Pass Rate</p>
          <p className="text-2xl font-bold text-primary-700 mt-1">{stats?.pass_rate || 0}%</p>
        </div>
      </div>

      {/* Pass Progress Bar */}
      {stats && stats?.total > 0 && (
        <div className="card p-4">
          <div className="flex justify-between items-center text-xs font-medium mb-2">
            <span className="text-slate-600">Eksekusi Status Summary</span>
            <span className="text-slate-500">
              {stats?.pass_count || 0} Pass / {stats?.total || 0} Total ({stats?.pass_rate || 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${stats.total ? (stats.pass_count / stats.total) * 100 : 0}%` }}
              title={`Pass: ${stats?.pass_count || 0}`}
            />
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${stats.total ? (stats.fail_count / stats.total) * 100 : 0}%` }}
              title={`Fail: ${stats?.fail_count || 0}`}
            />
            <div
              className="bg-orange-500 h-full transition-all"
              style={{ width: `${stats.total ? (stats.blocked_count / stats.total) * 100 : 0}%` }}
              title={`Blocked: ${stats?.blocked_count || 0}`}
            />
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${stats.total ? (stats.in_progress_count / stats.total) * 100 : 0}%` }}
              title={`In Progress: ${stats?.in_progress_count || 0}`}
            />
            <div
              className="bg-slate-300 h-full transition-all"
              style={{ width: `${stats.total ? (stats.untested_count / stats.total) * 100 : 0}%` }}
              title={`Untested: ${stats?.untested_count || 0}`}
            />
          </div>
          <div className="flex items-center space-x-3 mt-2.5 text-[11px] text-slate-600 flex-wrap gap-y-1">
            <span className="font-semibold text-slate-400">Breakdown Status:</span>
            {(stats?.by_status || []).map((b, idx) => {
              const st = (b.status || '').toLowerCase()
              let dotColor = 'bg-slate-400'
              if (st.startsWith('pass') || st.startsWith('ok') || st.startsWith('berhasil') || st.startsWith('done')) dotColor = 'bg-emerald-500'
              else if (st.startsWith('fail') || st.startsWith('gagal') || st.startsWith('bug') || st.startsWith('error')) dotColor = 'bg-red-500'
              else if (st.startsWith('block') || st.startsWith('kendala') || st.startsWith('stopper')) dotColor = 'bg-orange-500'
              else if (st.startsWith('in prog') || st.startsWith('proses') || st.startsWith('pending')) dotColor = 'bg-blue-500'

              return (
                <span key={idx} className="flex items-center px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                  <span className={clsx('w-2 h-2 rounded-full mr-1.5', dotColor)} />
                  <strong>{b.status}</strong>: {b.count} ({b.percentage}%)
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="card p-5 space-y-4">
        {/* Row 1: Primary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, summary, steps..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status Tester</label>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium text-slate-700"
            >
              <option value="">Semua Status Tester ({(filterOptions?.statuses || []).length})</option>
              {(filterOptions?.statuses || []).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
            <select
              value={filters.module_id}
              onChange={(e) => { setFilters({ ...filters, module_id: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Module</option>
              {(modules || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Components / Sub-Module Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Components / Feature</label>
            <select
              value={filters.components}
              onChange={(e) => { setFilters({ ...filters, components: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Components</option>
              {(filterOptions?.components || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage / Phase Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Stage / Phase</label>
            <select
              value={filters.stage}
              onChange={(e) => { setFilters({ ...filters, stage: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Stage / Phase</option>
              {(filterOptions?.stages || ['SIT', 'UAT', 'Development']).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Tester Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tester Name</label>
            <select
              value={filters.tester}
              onChange={(e) => { setFilters({ ...filters, tester: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Tester</option>
              {(filterOptions?.testers || []).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Cycle Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Test Cycle</label>
            <select
              value={filters.cycle}
              onChange={(e) => { setFilters({ ...filters, cycle: e.target.value }); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Cycle</option>
              {(filterOptions?.cycles || [1, 2, 3]).map(c => (
                <option key={c} value={c}>Cycle {c}</option>
              ))}
            </select>
          </div>

          {/* Date Range: Completion Testing Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Completion Date Range</label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => { setFilters({ ...filters, date_from: e.target.value }); setPage(1) }}
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">s/d</span>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => { setFilters({ ...filters, date_to: e.target.value }); setPage(1) }}
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">Filter Aktif:</span>
            {search && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                Search: "{search}"
                <button onClick={() => { setSearch(''); setPage(1) }} className="ml-1.5 hover:text-primary-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                Status: {filters.status}
                <button onClick={() => clearFilter('status')} className="ml-1.5 hover:text-emerald-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.module_id && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                Module: {(modules || []).find(m => m.id === Number(filters.module_id))?.name || filters.module_id}
                <button onClick={() => clearFilter('module_id')} className="ml-1.5 hover:text-indigo-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.components && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Components: {filters.components}
                <button onClick={() => clearFilter('components')} className="ml-1.5 hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.stage && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Stage: {filters.stage}
                <button onClick={() => clearFilter('stage')} className="ml-1.5 hover:text-purple-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.tester && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                Tester: {filters.tester}
                <button onClick={() => clearFilter('tester')} className="ml-1.5 hover:text-teal-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.cycle && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                Cycle {filters.cycle}
                <button onClick={() => clearFilter('cycle')} className="ml-1.5 hover:text-orange-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.date_from && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800">
                Dari: {filters.date_from}
                <button onClick={() => clearFilter('date_from')} className="ml-1.5 hover:text-slate-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.date_to && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800">
                Sampai: {filters.date_to}
                <button onClick={() => clearFilter('date_to')} className="ml-1.5 hover:text-slate-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:underline font-semibold ml-1">
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Case ID #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider max-w-xs">Test Case Summary (Name)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Module / Components</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tester</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span>Loading test scripts...</span>
                    </div>
                  </td>
                </tr>
              ) : (data?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada Test Script ditemukan
                  </td>
                </tr>
              ) : (
                (data?.items || []).map((script) => (
                  <tr key={script.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-primary-600">{script.test_case_id}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">{script.summary}</p>
                      {script.case_description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{script.case_description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{script.module_name || '-'}</p>
                      <p className="text-[11px] text-slate-400">{script.components || script.sub_module_name || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{script.stage || 'SIT'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{script.tester || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={script.status_by_tester} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{script.completion_date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedScript(script)}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Halaman {data.page} dari {data.total_pages} &middot; <strong>{data.total}</strong> test cases
              {stats?.total_steps ? <span className="ml-1 text-violet-600">/ <strong>{stats.total_steps}</strong> total steps</span> : null}
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
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
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Import Excel Test Script */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Import Excel Test Script
              </h3>
              <button onClick={() => { setShowImportModal(false); setSelectedFile(null); setImportResult(null) }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
              <p className="font-semibold flex items-center"><Info className="w-3.5 h-3.5 mr-1" /> Format Dokumen Test Script:</p>
              <p>Header Banner Excel didukung (Cycle, Year, Month, Day, Module, Stage).</p>
              <p>Header Tabel otomatis terdeteksi: <strong>Test Case ID #, Summary, Prerequisite, Test Step, Expected Result, Stage, Components, Completion Testing Date, Tester, Status by Tester</strong>.</p>
            </div>

            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  dragActive ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                )}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Drag & drop file Excel Test Script di sini</p>
                <p className="text-[11px] text-slate-400 mt-1">atau klik untuk memilih file (.xlsx)</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-700 truncate">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleImportSubmit}
                  disabled={importMutation.isPending}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition-colors"
                >
                  {importMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Proses Import
                </button>
              </div>
            )}

            {/* Import Result Notification */}
            {importResult && (
              <div className={clsx('p-4 rounded-xl border text-xs', importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
                <p className="font-semibold">{importResult.message}</p>
                {importResult.banner_module && (
                  <p className="mt-1 text-[11px]">Module Terdeteksi: <strong>{importResult.banner_module}</strong></p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal View Detail Test Script */}
      {selectedScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-primary-600">{selectedScript.test_case_id}</span>
                <StatusBadge status={selectedScript.status_by_tester} />
              </div>
              <button onClick={() => setSelectedScript(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">{selectedScript.summary}</h3>
              {selectedScript.case_description && (
                <p className="text-xs text-slate-500 mt-1">{selectedScript.case_description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div><span className="text-slate-400">Module:</span> <strong className="text-slate-700">{selectedScript.module_name || '-'}</strong></div>
              <div><span className="text-slate-400">Components:</span> <strong className="text-slate-700">{selectedScript.components || selectedScript.sub_module_name || '-'}</strong></div>
              <div><span className="text-slate-400">Stage:</span> <strong className="text-slate-700">{selectedScript.stage}</strong></div>
              <div><span className="text-slate-400">Tester:</span> <strong className="text-slate-700">{selectedScript.tester || '-'}</strong></div>
              <div><span className="text-slate-400">Completion Date:</span> <strong className="text-slate-700">{selectedScript.completion_date || '-'}</strong></div>
              <div><span className="text-slate-400">Cycle / Date Info:</span> <strong className="text-slate-700">Cycle {selectedScript.cycle || 1} ({selectedScript.year || 2026}-{selectedScript.month || 8}-{selectedScript.day || 1})</strong></div>
            </div>

            {selectedScript.prerequisite && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Prerequisite / Test Data:</p>
                <p className="text-xs bg-slate-50 p-2.5 rounded-lg text-slate-700 whitespace-pre-wrap">{selectedScript.prerequisite}</p>
              </div>
            )}

            {selectedScript.test_step && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Test Step (Langkah Pengujian):</p>
                  <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">
                    {selectedScript.test_step.split('\n').filter(l => l.trim()).length} langkah
                  </span>
                </div>
                <p className="text-xs bg-slate-50 p-2.5 rounded-lg text-slate-700 whitespace-pre-wrap font-mono">{selectedScript.test_step}</p>
              </div>
            )}

            {selectedScript.expected_result && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Expected Result:</p>
                <p className="text-xs bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 whitespace-pre-wrap">{selectedScript.expected_result}</p>
              </div>
            )}

            {selectedScript.keterangan && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">Keterangan:</p>
                <p className="text-xs bg-slate-50 p-2.5 rounded-lg text-slate-700 whitespace-pre-wrap">{selectedScript.keterangan}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Cross-check DB */}
      {showCrossCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-amber-500" />
                Cross-check Integritas Database
              </h3>
              <button onClick={() => setShowCrossCheck(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {crossCheckLoading ? (
              <div className="py-12 flex items-center justify-center space-x-3 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Memvalidasi data...</span>
              </div>
            ) : crossCheckData?.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {crossCheckData.error}
              </div>
            ) : crossCheckData ? (
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={clsx(
                  'p-4 rounded-xl border flex items-center space-x-3',
                  crossCheckData.integrity_ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                )}>
                  {crossCheckData.integrity_ok
                    ? <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
                  <div>
                    <p className="font-semibold text-sm">
                      {crossCheckData.integrity_ok ? 'Database OK — Integritas terjaga' : 'Perlu Perhatian — Ada temuan'}
                    </p>
                    {(crossCheckData.warnings || []).map((w, i) => (
                      <p key={i} className="text-xs mt-0.5">⚠ {w}</p>
                    ))}
                  </div>
                </div>

                {/* Summary Numbers */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-2xl font-bold text-slate-800">{crossCheckData.total_records}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Total Test Cases</p>
                  </div>
                  <div className="text-center p-3 bg-violet-50 rounded-xl border border-violet-200">
                    <p className="text-2xl font-bold text-violet-700">{crossCheckData.total_steps}</p>
                    <p className="text-[11px] text-violet-500 mt-0.5">Total Steps Parsed</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{crossCheckData.avg_steps_per_case}</p>
                    <p className="text-[11px] text-blue-500 mt-0.5">Rata-rata Steps/Case</p>
                  </div>
                </div>

                {/* Status Breakdown Table */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center">
                    <BarChart2 className="w-3.5 h-3.5 mr-1" /> Breakdown Status (Cases & Steps)
                  </p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                          <th className="px-3 py-2 text-center font-semibold text-slate-500">Cases</th>
                          <th className="px-3 py-2 text-center font-semibold text-slate-500">Steps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(crossCheckData.status_breakdown || {}).map(([status, val]) => {
                          if (val.cases === 0 && val.steps === 0) return null
                          const colorMap = {
                            PASS: 'text-emerald-700 bg-emerald-50',
                            FAIL: 'text-red-700 bg-red-50',
                            'NOT RUN': 'text-slate-600 bg-slate-50',
                            BLOCKED: 'text-orange-700 bg-orange-50',
                            FIXING: 'text-blue-700 bg-blue-50',
                            'N/A': 'text-gray-600 bg-gray-50',
                            OTHER: 'text-purple-700 bg-purple-50',
                          }
                          return (
                            <tr key={status}>
                              <td className="px-3 py-2">
                                <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', colorMap[status] || 'bg-slate-100 text-slate-600')}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">{val.cases}</td>
                              <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">{val.steps}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Raw Status Breakdown */}
                {crossCheckData.raw_status_breakdown && Object.keys(crossCheckData.raw_status_breakdown).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Raw Status Values di Database</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(crossCheckData.raw_status_breakdown).map(([st, val]) => (
                        <span key={st} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">
                          "{st || '(kosong)'}": {val.cases}c / {val.steps}s
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicates */}
                {(crossCheckData.duplicates || []).length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-1.5">⚠ Duplikat Test Case ID ({crossCheckData.duplicates.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {crossCheckData.duplicates.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[11px] font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Step Cases */}
                {crossCheckData.no_step_cases_count > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">
                      ⚠ Test Case Tanpa Test Step ({crossCheckData.no_step_cases_count})
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {(crossCheckData.no_step_cases || []).map(tc => (
                        <span key={tc} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px] font-mono">{tc}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-generated IDs */}
                {crossCheckData.no_test_case_id > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                    <p className="font-semibold">ℹ {crossCheckData.no_test_case_id} test case dengan ID auto-generated (TC-GEN-*)</p>
                    <p className="text-[11px] mt-0.5 text-blue-500">Ini terjadi saat import Excel tidak memiliki Test Case ID. Pertimbangkan untuk memperbaiki data sumber.</p>
                  </div>
                )}

                <button
                  onClick={() => { setShowCrossCheck(false); setCrossCheckData(null) }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Tutup
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
