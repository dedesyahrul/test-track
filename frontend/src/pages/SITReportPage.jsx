import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  fetchCascadingFilters, fetchSITReportSummary, fetchSITReportTable,
  fetchSITReportDetail, generateAIConclusion, exportSITReportExcel, downloadPDFReport
} from '../services/api'
import {
  FileText, FileSpreadsheet, Download, RefreshCw, Search, Filter, RotateCcw,
  CheckCircle2, XCircle, AlertOctagon, HelpCircle, Layers, ShieldAlert,
  ChevronLeft, ChevronRight, Eye, Sparkles, X, Printer, Calendar, User, FileCheck
} from 'lucide-react'
import clsx from 'clsx'

function SeverityBadge({ level }) {
  const map = {
    Fatal: 'bg-red-50 text-red-700 border-red-200',
    Major: 'bg-orange-50 text-orange-700 border-orange-200',
    Minor: 'bg-amber-50 text-amber-700 border-amber-200',
    Kosmetik: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return level && level !== '-' ? (
    <span className={clsx('px-2 py-0.5 rounded text-[11px] font-semibold border', map[level] || 'bg-slate-50 text-slate-600 border-slate-200')}>
      {level}
    </span>
  ) : <span className="text-slate-300 text-xs">-</span>
}

function StatusDefectBadge({ status }) {
  const s = (status || '').toLowerCase()
  if (s.includes('closed')) return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Closed</span>
  if (s.includes('open')) return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">Open</span>
  if (s.includes('ready')) return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Ready to Test</span>
  return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">{status || '-'}</span>
}

const INITIAL_FILTERS = {
  project_id: '',
  phase: '',
  import_file_name: '',
  module_id: '',
  sub_module_id: '',
  tester: '',
  date_from: '',
  date_to: '',
}

const cleanParams = (obj) => {
  const cleaned = {}
  Object.keys(obj || {}).forEach(k => {
    if (obj[k] !== '' && obj[k] !== null && obj[k] !== undefined) {
      cleaned[k] = obj[k]
    }
  })
  return cleaned
}

export default function SITReportPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [aiModalRow, setAiModalRow] = useState(null)
  const [aiNarrative, setAiNarrative] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Clean params for queries
  const cleanFilterParams = cleanParams(filters)
  const cleanAppliedParams = cleanParams(appliedFilters)

  // Cascading Filters Query
  const { data: casFilters } = useQuery({
    queryKey: ['cascadingFilters', cleanFilterParams],
    queryFn: () => fetchCascadingFilters(cleanFilterParams),
  })

  // Summary Query
  const { data: summary } = useQuery({
    queryKey: ['sitReportSummary', cleanAppliedParams],
    queryFn: () => fetchSITReportSummary(cleanAppliedParams),
  })

  // Table Data Query
  const tableParams = {
    page,
    page_size: 15,
    ...(search && { search }),
    ...cleanAppliedParams,
  }

  const { data: tableData, isLoading: loadingTable } = useQuery({
    queryKey: ['sitReportTable', tableParams],
    queryFn: () => fetchSITReportTable(tableParams),
    keepPreviousData: true,
  })

  // Detail Query
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['sitReportDetail', selectedRowId],
    queryFn: () => fetchSITReportDetail(selectedRowId),
    enabled: !!selectedRowId,
  })

  // AI Conclusion Mutation
  const aiMutation = useMutation({
    mutationFn: generateAIConclusion,
    onSuccess: (res) => {
      setAiNarrative(res.narrative)
    },
  })

  const handleApplyFilter = () => {
    setAppliedFilters(filters)
    setPage(1)
  }

  const handleResetFilter = () => {
    setFilters(INITIAL_FILTERS)
    setAppliedFilters(INITIAL_FILTERS)
    setSearch('')
    setPage(1)
  }

  const handleGenerateAI = (row) => {
    setAiModalRow(row)
    setAiNarrative(null)
    const payload = {
      module: row.modul,
      test_script: row.test_script,
      total_test_script: row.total_test_script,
      jumlah_testing: row.jumlah_testing,
      pass: row.pass,
      fail: row.fail,
      not_run: row.not_run,
      na: row.na,
      total_defect: row.linked_defect_count,
      open: row.fail,
    }
    aiMutation.mutate(payload)
  }

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      await exportSITReportExcel(cleanAppliedParams)
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true)
      await downloadPDFReport()
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SIT Report</h1>
          <p className="text-slate-500 text-sm mt-1">
            Laporan Agregasi Pengujian SIT & Analisis Kualitas Otomatis dari Database
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Export Excel 18 Kolom
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {exportingPdf ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Cascading Dependent Filters Panel (per Section 2) */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
          <Filter className="w-4 h-4 mr-1.5 text-slate-400" />
          Filter Cascading Interaktif
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Project</option>
              {(casFilters?.projects || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Phase */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phase</label>
            <select
              value={filters.phase}
              onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Phase</option>
              {(casFilters?.phases || ['Phase 2 - SIT']).map(ph => (
                <option key={ph} value={ph}>{ph}</option>
              ))}
            </select>
          </div>

          {/* Nama File Import */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama File Import</label>
            <select
              value={filters.import_file_name}
              onChange={(e) => setFilters({ ...filters, import_file_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua File Import</option>
              {(casFilters?.import_files || []).map(fn => (
                <option key={fn} value={fn}>{fn}</option>
              ))}
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
            <select
              value={filters.module_id}
              onChange={(e) => setFilters({ ...filters, module_id: e.target.value, sub_module_id: '' })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Module</option>
              {(casFilters?.modules || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Sub Module */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sub Module</label>
            <select
              value={filters.sub_module_id}
              onChange={(e) => setFilters({ ...filters, sub_module_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Sub Module</option>
              {(casFilters?.sub_modules || []).map(sm => (
                <option key={sm.id} value={sm.id}>{sm.name}</option>
              ))}
            </select>
          </div>

          {/* Tester */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tester Name</label>
            <select
              value={filters.tester}
              onChange={(e) => setFilters({ ...filters, tester: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Semua Tester</option>
              {(casFilters?.testers || []).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Periode Testing Range</label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
              />
              <span className="text-[10px] text-slate-400">s/d</span>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center space-x-2 pt-4">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" /> Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards (per Section 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card p-4">
          <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Script</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.total_script || 0}</p>
        </div>

        <div className="stat-card p-4">
          <p className="text-[11px] text-slate-400 font-semibold uppercase">Jumlah Testing</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.jumlah_testing || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-emerald-600 font-semibold uppercase">PASS</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{summary?.pass_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-red-600 font-semibold uppercase">FAIL</p>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.fail_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-slate-400">
          <p className="text-[11px] text-slate-500 font-semibold uppercase">NOT RUN</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{summary?.not_run_count || 0}</p>
        </div>

        <div className="stat-card p-4 border-l-4 border-l-purple-400">
          <p className="text-[11px] text-purple-600 font-semibold uppercase">Total Defect</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{summary?.total_defect || 0}</p>
        </div>
      </div>

      {/* Additional Defect Summary Bar */}
      <div className="card p-4 bg-slate-50/70 border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-semibold">
          <div className="p-2 bg-red-100/60 rounded-lg text-red-800">
            <span className="text-[10px] uppercase block text-red-500">Fixing (Open)</span>
            <span className="text-lg font-bold">{summary?.fixing_count || 0}</span>
          </div>
          <div className="p-2 bg-blue-100/60 rounded-lg text-blue-800">
            <span className="text-[10px] uppercase block text-blue-500">Ready to Test</span>
            <span className="text-lg font-bold">{summary?.ready_to_test_count || 0}</span>
          </div>
          <div className="p-2 bg-purple-100/60 rounded-lg text-purple-800">
            <span className="text-[10px] uppercase block text-purple-500">Retest</span>
            <span className="text-lg font-bold">{summary?.retest_count || 0}</span>
          </div>
          <div className="p-2 bg-emerald-100/60 rounded-lg text-emerald-800">
            <span className="text-[10px] uppercase block text-emerald-500">Closed</span>
            <span className="text-lg font-bold">{summary?.closed_count || 0}</span>
          </div>
          <div className="p-2 bg-orange-100/60 rounded-lg text-orange-800">
            <span className="text-[10px] uppercase block text-orange-500">Reopen</span>
            <span className="text-lg font-bold">{summary?.reopen_count || 0}</span>
          </div>
        </div>
      </div>

      {/* 18-Column Report Table (per Section 4) */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-primary-600" />
            Tabel Laporan SIT (18 Kolom Agregasi Otomatis)
          </h3>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter cepat tabel..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white border-b border-slate-700 whitespace-nowrap">
                <th className="px-3 py-3 text-center w-10">No</th>
                <th className="px-3 py-3 text-left">Nama File Import</th>
                <th className="px-3 py-3 text-left">Modul</th>
                <th className="px-3 py-3 text-left">Test Script</th>
                <th className="px-3 py-3 text-center">Total Script</th>
                <th className="px-3 py-3 text-center">Jumlah Testing</th>
                <th className="px-3 py-3 text-center text-red-300">FAIL</th>
                <th className="px-3 py-3 text-center">Not Run</th>
                <th className="px-3 py-3 text-center">N/A</th>
                <th className="px-3 py-3 text-center text-emerald-300">PASS</th>
                <th className="px-3 py-3 text-center">Fixing (Jumlah)</th>
                <th className="px-3 py-3 text-left max-w-xs">Keterangan Temuan</th>
                <th className="px-3 py-3 text-center">Defect ID</th>
                <th className="px-3 py-3 text-center">Severity Bug</th>
                <th className="px-3 py-3 text-center">Status Defect</th>
                <th className="px-3 py-3 text-left max-w-xs">Summary Defect</th>
                <th className="px-3 py-3 text-left">PIC Fixing</th>
                <th className="px-3 py-3 text-left max-w-xs">Keterangan / Log Retest</th>
                <th className="px-3 py-3 text-left max-w-xs">Note (Retesting)</th>
                <th className="px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingTable ? (
                <tr>
                  <td colSpan={21} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span>Mengagregasi data report dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : (tableData?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data SIT Report ditemukan
                  </td>
                </tr>
              ) : (
                (tableData?.items || []).map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center font-bold">{row.no}</td>
                    <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">{row.nama_file_import}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{row.modul}</td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{row.test_script}</td>
                    <td className="px-3 py-3 text-center font-bold">{row.total_test_script}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">{row.jumlah_testing}</td>
                    <td className={clsx('px-3 py-3 text-center font-bold rounded', row.fail > 0 ? 'text-red-700 bg-red-50' : 'text-slate-400')}>
                      {row.fail}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">{row.not_run}</td>
                    <td className="px-3 py-3 text-center text-slate-400">{row.na}</td>
                    <td className={clsx('px-3 py-3 text-center font-bold rounded', row.pass > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400')}>
                      {row.pass}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-orange-600">{row.fixing_history_text ?? row.fixing ?? 0}</td>
                    <td className="px-3 py-3 max-w-xs whitespace-pre-wrap font-mono text-[11px] text-slate-700">
                      {row.keterangan_temuan}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-red-600 whitespace-nowrap">{row.defect_id}</td>
                    <td className="px-3 py-3 text-center"><SeverityBadge level={row.severity_bug} /></td>
                    <td className="px-3 py-3 text-center"><StatusDefectBadge status={row.status_defect} /></td>
                    <td className="px-3 py-3 max-w-xs whitespace-pre-wrap text-[11px] text-slate-800 font-medium">
                      {row.summary_defect || '-'}
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{row.pic_fixing}</td>
                    <td className="px-3 py-3 max-w-xs whitespace-pre-wrap text-[11px] text-slate-600">
                      {row.keterangan_log_retest}
                    </td>
                    <td className="px-3 py-3 max-w-xs text-[11px] font-medium text-slate-700 bg-slate-50/80 p-2 rounded">
                      {row.note}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setSelectedRowId(row.id || row.no)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="Lihat Detail Report"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleGenerateAI(row)}
                        className="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700"
                        title="Generate AI Conclusion"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </td>
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
              Halaman {tableData.page} dari {tableData.total_pages} ({tableData.total} rows)
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

      {/* Modal Detail SIT Report */}
      {selectedRowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Detail SIT Report #{selectedRowId}
              </h3>
              <button onClick={() => setSelectedRowId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-8 text-center text-slate-400">Loading detail...</div>
            ) : detailData ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl">
                  <div><span className="text-slate-400">Module:</span> <p className="font-semibold text-slate-800">{detailData.module}</p></div>
                  <div><span className="text-slate-400">Test Script:</span> <p className="font-semibold text-slate-800">{detailData.test_script}</p></div>
                  <div><span className="text-slate-400">Test Case ID:</span> <p className="font-semibold text-primary-600 font-mono">{detailData.test_case_id}</p></div>
                  <div><span className="text-slate-400">Status:</span> <p className="font-semibold text-slate-800">{detailData.status}</p></div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-1 uppercase text-[11px]">Test Case Summary:</h4>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium">{detailData.summary}</p>
                </div>

                {/* Defect Details Table */}
                {detailData.defects && detailData.defects.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-700 uppercase text-[11px]">Defect Details & Retest History</h4>
                    <table className="w-full text-xs border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="p-2 text-left">Defect ID</th>
                          <th className="p-2 text-center">Severity</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2 text-left">PIC</th>
                          <th className="p-2 text-left">Latest Retest Log</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.defects.map((def, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-2 font-mono font-bold text-red-600">{def.defect_id}</td>
                            <td className="p-2 text-center"><SeverityBadge level={def.severity} /></td>
                            <td className="p-2 text-center"><StatusDefectBadge status={def.status} /></td>
                            <td className="p-2">{def.pic}</td>
                            <td className="p-2 text-slate-600 whitespace-pre-wrap">{def.latest_retest}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-700 mb-1 uppercase text-[11px]">Retest Timeline History:</h4>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-600 whitespace-pre-wrap">{detailData.retest_history}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal AI Conclusion */}
      {aiModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                AI-Generated Conclusion
              </h3>
              <button onClick={() => setAiModalRow(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 space-y-1">
              <p className="font-bold">{aiModalRow.modul} &bull; {aiModalRow.test_script}</p>
              <p className="text-[11px] text-purple-600">Faktual: {aiModalRow.pass} PASS, {aiModalRow.fail} FAIL, {aiModalRow.linked_defect_count} Defect.</p>
            </div>

            {aiMutation.isPending ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span>Menghasilkan narasi simpulan AI berdasarkan data faktual DB...</span>
              </div>
            ) : aiNarrative ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 font-serif">
                "{aiNarrative}"
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
