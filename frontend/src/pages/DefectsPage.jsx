import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDefects, fetchModules, fetchFilterOptions } from '../services/api'
import { Search, Filter, ChevronLeft, ChevronRight, X, Calendar, Wrench, User, Tag, RotateCcw } from 'lucide-react'
import clsx from 'clsx'

function LevelBadge({ level }) {
  const map = {
    Fatal: 'badge-fatal',
    Major: 'badge-major',
    Minor: 'badge-minor',
    Kosmetik: 'badge-kosmetik',
  }
  return <span className={clsx('badge', map[level] || 'bg-slate-100 text-slate-600')}>{level || '-'}</span>
}

function StatusBadge({ status }) {
  const map = {
    Open: 'badge-open',
    Closed: 'badge-closed',
    'Under Review': 'badge-under-review',
    'Re-Opened': 'bg-orange-100 text-orange-700',
    Confirmed: 'bg-indigo-100 text-indigo-700',
  }
  return <span className={clsx('badge', map[status] || 'bg-slate-100 text-slate-600')}>{status || '-'}</span>
}

function FixingBadge({ status }) {
  const map = {
    'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Fix in Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Needs Attention': 'bg-red-50 text-red-700 border-red-200',
    'Review in Progress': 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return status ? (
    <span className={clsx('px-2 py-0.5 rounded text-[11px] font-medium border', map[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
      {status}
    </span>
  ) : (
    <span className="text-slate-300 text-xs">-</span>
  )
}

const INITIAL_FILTERS = {
  status: '',
  level: '',
  module_id: '',
  sub_module_id: '',
  priority: '',
  criteria: '',
  fixing_status: '',
  fixing_status_by_vendor: '',
  created_by: '',
  date_from: '',
  date_to: '',
}

export default function DefectsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showFilters, setShowFilters] = useState(true)

  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const { data: filterOptions } = useQuery({ queryKey: ['filterOptions'], queryFn: fetchFilterOptions })

  const params = {
    page,
    page_size: 15,
    ...(search && { search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.level && { level: filters.level }),
    ...(filters.module_id && { module_id: Number(filters.module_id) }),
    ...(filters.sub_module_id && { sub_module_id: Number(filters.sub_module_id) }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.criteria && { criteria: filters.criteria }),
    ...(filters.fixing_status && { fixing_status: filters.fixing_status }),
    ...(filters.fixing_status_by_vendor && { fixing_status_by_vendor: filters.fixing_status_by_vendor }),
    ...(filters.created_by && { created_by: filters.created_by }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['defects', params],
    queryFn: () => fetchDefects(params),
    keepPreviousData: true,
  })

  const updateFilter = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'module_id') {
        next.sub_module_id = ''
      }
      return next
    })
    setPage(1)
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

  // Filter sub-modules by selected module
  const availableSubModules = (filterOptions?.sub_modules || []).filter(
    s => !filters.module_id || s.module_id === Number(filters.module_id)
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Defect List</h1>
          <p className="text-slate-500 text-sm">
            {data?.total || 0} total defect ditemukan
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID, summary, link..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Filter Panel */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors relative',
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filter Detail
            {activeFilterCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-5 space-y-4 bg-white border-slate-200 shadow-sm">
          {/* Row 1: Core Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status / Workflow</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Under Review">Under Review</option>
                <option value="Re-Opened">Re-Opened</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>

            {/* Level of Defect */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Level / Severity</label>
              <select
                value={filters.level}
                onChange={(e) => updateFilter('level', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Level</option>
                <option value="Fatal">Fatal (Score: 25)</option>
                <option value="Major">Major (Score: 10)</option>
                <option value="Minor">Minor (Score: 2)</option>
                <option value="Kosmetik">Kosmetik (Score: 1)</option>
              </select>
            </div>

            {/* Fixing / Review Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Fixing / Review Status
              </label>
              <select
                value={filters.fixing_status}
                onChange={(e) => updateFilter('fixing_status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Fixing Status</option>
                {(filterOptions?.fixing_statuses || ['Done', 'Fix in Progress', 'Needs Attention', 'Review in Progress']).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Fixing Status by Vendor */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Vendor Status
              </label>
              <select
                value={filters.fixing_status_by_vendor}
                onChange={(e) => updateFilter('fixing_status_by_vendor', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Vendor Status</option>
                {(filterOptions?.fixing_statuses_by_vendor || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Priority</option>
                <option value="Highest">Highest</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Row 2: Module & Sub-Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Module */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
              <select
                value={filters.module_id}
                onChange={(e) => updateFilter('module_id', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Module</option>
                {(modules || []).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Sub-Module */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sub-Module</label>
              <select
                value={filters.sub_module_id}
                onChange={(e) => updateFilter('sub_module_id', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Sub-Module</option>
                {availableSubModules.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Created By */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center">
                <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Created By (Tester)
              </label>
              <select
                value={filters.created_by}
                onChange={(e) => updateFilter('created_by', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Tester</option>
                {(filterOptions?.creators || ['Amanda', 'Destra', 'Clara', 'Muamar']).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Criteria */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Criteria</label>
              <select
                value={filters.criteria}
                onChange={(e) => updateFilter('criteria', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Semua Criteria</option>
                <option value="Defect">Defect</option>
                <option value="Non-Defect">Non-Defect</option>
              </select>
            </div>
          </div>

          {/* Row 3: Date Range Filter */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                <span className="text-xs font-semibold text-slate-600 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Tanggal Dibuat:
                </span>

                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => updateFilter('date_from', e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Dari Tanggal"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => updateFilter('date_to', e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Sampai Tanggal"
                  />
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10)
                      updateFilter('date_from', today)
                      updateFilter('date_to', today)
                    }}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date()
                      const past7 = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10)
                      const today = new Date().toISOString().slice(0, 10)
                      updateFilter('date_from', past7)
                      updateFilter('date_to', today)
                    }}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date()
                      const past30 = new Date(now.setDate(now.getDate() - 30)).toISOString().slice(0, 10)
                      const today = new Date().toISOString().slice(0, 10)
                      updateFilter('date_from', past30)
                      updateFilter('date_to', today)
                    }}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                  >
                    30 Hari Terakhir
                  </button>
                </div>
              </div>

              {/* Reset All Filters Button */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center text-xs text-red-600 hover:text-red-800 font-medium self-end sm:self-center"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset Semua Filter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium">Filter Aktif:</span>
          {search && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Search: "{search}"
              <button onClick={() => { setSearch(''); setPage(1) }} className="ml-1.5 hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Status: {filters.status}
              <button onClick={() => clearFilter('status')} className="ml-1.5 hover:text-red-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.level && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Level: {filters.level}
              <button onClick={() => clearFilter('level')} className="ml-1.5 hover:text-orange-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
           {filters.fixing_status && (
             <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               Fixing: {filters.fixing_status}
               <button onClick={() => clearFilter('fixing_status')} className="ml-1.5 hover:text-blue-900">
                 <X className="w-3 h-3" />
               </button>
             </span>
           )}
           {filters.fixing_status_by_vendor && (
             <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
               Vendor: {filters.fixing_status_by_vendor}
               <button onClick={() => clearFilter('fixing_status_by_vendor')} className="ml-1.5 hover:text-cyan-900">
                 <X className="w-3 h-3" />
               </button>
             </span>
           )}
           {filters.module_id && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Module: {(modules || []).find(m => m.id === Number(filters.module_id))?.name || filters.module_id}
              <button onClick={() => clearFilter('module_id')} className="ml-1.5 hover:text-indigo-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.sub_module_id && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Sub-Module: {(filterOptions?.sub_modules || []).find(s => s.id === Number(filters.sub_module_id))?.name || filters.sub_module_id}
              <button onClick={() => clearFilter('sub_module_id')} className="ml-1.5 hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.priority && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Priority: {filters.priority}
              <button onClick={() => clearFilter('priority')} className="ml-1.5 hover:text-yellow-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.created_by && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Tester: {filters.created_by}
              <button onClick={() => clearFilter('created_by')} className="ml-1.5 hover:text-emerald-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_from && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-800">
              Dari: {filters.date_from}
              <button onClick={() => clearFilter('date_from')} className="ml-1.5 hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_to && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-800">
              Sampai: {filters.date_to}
              <button onClick={() => clearFilter('date_to')} className="ml-1.5 hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.criteria && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              Criteria: {filters.criteria}
              <button onClick={() => clearFilter('criteria')} className="ml-1.5 hover:text-teal-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-red-600 hover:underline font-medium ml-1"
          >
            Hapus Semua
          </button>
        </div>
      )}

      {/* Defect Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Module / Sub-Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider max-w-xs">Summary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fixing Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aging</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span>Loading defects...</span>
                    </div>
                  </td>
                </tr>
              ) : (data?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Filter className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada defect yang sesuai filter</p>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          Clear semua filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (data?.items || []).map((defect) => (
                  <tr
                    key={defect.id}
                    onClick={() => navigate(`/defects/${defect.defect_id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-primary-600">{defect.defect_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[180px]">
                        <p className="text-xs font-medium text-slate-700 truncate">{defect.module_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{defect.sub_module_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-slate-700 truncate">{defect.summary}</p>
                    </td>
                    <td className="px-4 py-3"><LevelBadge level={defect.level_of_defect} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-600">{defect.priority || '-'}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={defect.status} /></td>
                    <td className="px-4 py-3"><FixingBadge status={defect.fixing_review_status} /></td>
                    <td className="px-4 py-3"><FixingBadge status={defect.fixing_status_by_vendor} /></td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-sm font-semibold',
                        defect.aging > 14 ? 'text-red-600' : defect.aging > 7 ? 'text-orange-600' : 'text-slate-600'
                      )}>
                        {defect.aging}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{defect.created_by || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{defect.date_created || '-'}</td>
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
              Halaman {data.page} dari {data.total_pages} ({data.total} items)
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
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
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
    </div>
  )
}
