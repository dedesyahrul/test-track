import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchOverview, fetchScoringSummary, fetchModuleSummary,
  fetchTestScriptStats, fetchTestScriptFilterOptions, fetchModules,
  downloadPDFReport, downloadExecutiveExcel, exportTestScripts, exportTestScriptRekap
} from '../services/api'
import {
  Printer, Download, FileSpreadsheet, FileText, CheckCircle2, ShieldAlert,
  Award, Calendar, Layers, RefreshCw, FileCheck, Filter, X, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'

export default function CetakReportPage() {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadingTsExcel, setDownloadingTsExcel] = useState(false)
  const [showTsModal, setShowTsModal] = useState(false)
  const [tsFilters, setTsFilters] = useState({
    status: '',
    module_id: '',
    stage: '',
  })

  const { data: overview } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview })
  const { data: scoring } = useQuery({ queryKey: ['scoringSummary'], queryFn: fetchScoringSummary })
  const { data: moduleSummary } = useQuery({ queryKey: ['moduleSummary'], queryFn: fetchModuleSummary })
  const { data: tsStats } = useQuery({ queryKey: ['testScriptStats'], queryFn: fetchTestScriptStats })
  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const { data: filterOptions } = useQuery({ queryKey: ['testScriptFilterOptions'], queryFn: fetchTestScriptFilterOptions })

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      await downloadPDFReport()
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true)
      await downloadExecutiveExcel()
    } finally {
      setDownloadingExcel(false)
    }
  }

  const handleExportTestScript = async (customStatus = null) => {
    try {
      setDownloadingTsExcel(true)
      const exportParams = {
        ...(customStatus !== null ? { status: customStatus } : (tsFilters.status && { status: tsFilters.status })),
        ...(tsFilters.module_id && { module_id: Number(tsFilters.module_id) }),
        ...(tsFilters.stage && { stage: tsFilters.stage }),
      }
      await exportTestScripts(exportParams)
      setShowTsModal(false)
    } finally {
      setDownloadingTsExcel(false)
    }
  }

  const handleExportRekapTestScript = async () => {
    try {
      setDownloadingTsExcel(true)
      const exportParams = {
        ...(tsFilters.module_id && { module_id: Number(tsFilters.module_id) }),
        ...(tsFilters.stage && { stage: tsFilters.stage }),
      }
      await exportTestScriptRekap(exportParams)
      setShowTsModal(false)
    } finally {
      setDownloadingTsExcel(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions (Hidden during browser print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cetak & Export Report SIT</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cetak laporan eksekutif pengujian SIT ke dokumen PDF atau Executive Excel
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handlePrint}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 text-slate-500" />
            Print Preview
          </button>

          <button
            onClick={() => setShowTsModal(true)}
            className="flex items-center px-4 py-2 bg-teal-600 rounded-lg text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Export Test Script Excel
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="flex items-center px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {downloadingExcel ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Export Executive Excel
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {downloadingPdf ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Printable Report Document Card / Page Preview */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-lg space-y-8 print:shadow-none print:border-none print:p-0">
        
        {/* Document Header / Banner */}
        <div className="border-b-2 border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Award className="w-8 h-8 text-primary-600" />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">EXECUTIVE SIT TESTING REPORT</h2>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Procurement Management System &bull; Mandiri Taspen
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-700">Periode: SIT Active</p>
            <p>Tanggal Cetak: <strong>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
            <p>Environment: <strong>Development / SIT</strong></p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium uppercase">Total Defects</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{overview?.total_defects || 0}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
            <p className="text-xs text-red-600 font-medium uppercase">Open Defects</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{overview?.total_open || 0}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <p className="text-xs text-emerald-600 font-medium uppercase">Closed Defects</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{overview?.total_closed || 0}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
            <p className="text-xs text-blue-600 font-medium uppercase">Resolution Rate</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{overview?.resolution_rate || 0}%</p>
          </div>
        </div>

        {/* Section 1: Scoring Table (Pembobotan Defect) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 text-slate-600" />
            1. Pembobotan & Score Penyelesaian Defect
          </h3>
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2.5 text-left border border-slate-700">Kategori Defect</th>
                <th className="p-2.5 text-center border border-slate-700">Bobot Penilaian</th>
                <th className="p-2.5 text-center border border-slate-700">Status Closed</th>
                <th className="p-2.5 text-center border border-slate-700">Status Open</th>
                <th className="p-2.5 text-right border border-slate-700">Score Defect Open</th>
              </tr>
            </thead>
            <tbody>
              {(scoring?.items || []).map((item, i) => (
                <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 font-semibold text-slate-700 border border-slate-200">{item.category}</td>
                  <td className="p-2.5 text-center border border-slate-200 font-mono">x{item.weight}</td>
                  <td className="p-2.5 text-center border border-slate-200 font-bold text-emerald-600">{item.total_closed}</td>
                  <td className="p-2.5 text-center border border-slate-200 font-bold text-red-600">{item.total_open}</td>
                  <td className="p-2.5 text-right border border-slate-200 font-bold text-slate-900">{item.score_open}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="p-2.5 border border-slate-300">TOTAL SCORE DEFECT</td>
                <td className="p-2.5 text-center border border-slate-300">-</td>
                <td className="p-2.5 text-center border border-slate-300 text-emerald-700">{scoring?.totals?.total_closed || 0}</td>
                <td className="p-2.5 text-center border border-slate-300 text-red-700">{scoring?.totals?.total_open || 0}</td>
                <td className="p-2.5 text-right border border-slate-300 text-primary-700 text-sm">{scoring?.totals?.total_score_open || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Summary Defect per Module */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <Layers className="w-4 h-4 mr-2 text-slate-600" />
            2. Summary Temuan per Modul Aplikasi
          </h3>
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2.5 text-left border border-slate-700">Nama Modul</th>
                <th className="p-2.5 text-center border border-slate-700">Jumlah Defect</th>
                <th className="p-2.5 text-center border border-slate-700">Jumlah Non-Defect</th>
                <th className="p-2.5 text-right border border-slate-700">Total Items</th>
              </tr>
            </thead>
            <tbody>
              {(moduleSummary || []).map((m, i) => (
                <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 font-semibold text-slate-800 border border-slate-200">{m.module}</td>
                  <td className="p-2.5 text-center border border-slate-200 font-bold text-red-600">{m.total_defect}</td>
                  <td className="p-2.5 text-center border border-slate-200 text-slate-500">{m.total_non_defect}</td>
                  <td className="p-2.5 text-right border border-slate-200 font-bold text-slate-900">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Test Script Execution Overview */}
        {tsStats && tsStats.total > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
              3. Summary Eksekusi Test Script Document
            </h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div>
                <p className="text-slate-400 uppercase text-[10px]">Total Test Cases</p>
                <p className="text-lg font-bold text-slate-800">{tsStats.total}</p>
              </div>
              <div>
                <p className="text-emerald-600 uppercase text-[10px]">Pass Rate</p>
                <p className="text-lg font-bold text-emerald-600">{tsStats.pass_rate}%</p>
              </div>
              <div>
                <p className="text-emerald-600 uppercase text-[10px]">Pass Count</p>
                <p className="text-lg font-bold text-emerald-600">{tsStats.pass_count}</p>
              </div>
              <div>
                <p className="text-red-600 uppercase text-[10px]">Fail / Blocked</p>
                <p className="text-lg font-bold text-red-600">{tsStats.fail_count + tsStats.blocked_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Signatures Footer */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Dibuat Oleh,</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">IT Quality Assurance & Testing Team</p>
            <p className="text-[10px] text-slate-400">Mandiri Taspen</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Disetujui Oleh,</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">Project Manager / IT Head</p>
            <p className="text-[10px] text-slate-400">Mandiri Taspen</p>
          </div>
        </div>

      </div>

      {/* Modal Filter Export Test Script Excel */}
      {showTsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-teal-600" />
                Export Test Script Excel
              </h3>
              <button onClick={() => setShowTsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih filter untuk mengekspor dokumen Test Script Excel (Lengkap dengan Banner Metadata & Highlight Status untuk Vendor IT):
            </p>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleExportTestScript('Fail')}
                disabled={downloadingTsExcel}
                className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left transition-colors text-xs font-semibold text-red-700 flex items-center justify-between"
              >
                <span>Export Fail / Gagal Saja</span>
                <FileSpreadsheet className="w-4 h-4 text-red-500" />
              </button>
              <button
                onClick={() => handleExportTestScript(null)}
                disabled={downloadingTsExcel}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>Export Semua Status</span>
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Custom Filter Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Tester</label>
                <select
                  value={tsFilters.status}
                  onChange={(e) => setTsFilters({ ...tsFilters, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Status Status Tester</option>
                  {(filterOptions?.statuses || []).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Filter Modul</label>
                <select
                  value={tsFilters.module_id}
                  onChange={(e) => setTsFilters({ ...tsFilters, module_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Modul Aplikasi</option>
                  {(modules || []).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Stage / Phase</label>
                <select
                  value={tsFilters.stage}
                  onChange={(e) => setTsFilters({ ...tsFilters, stage: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Stage / Phase</option>
                  {(filterOptions?.stages || ['SIT', 'UAT', 'Development']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleExportTestScript(null)}
                disabled={downloadingTsExcel}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
              >
                {downloadingTsExcel ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />}
                Export Detail File (.xlsx)
              </button>
              <button
                onClick={handleExportRekapTestScript}
                disabled={downloadingTsExcel}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
              >
                {downloadingTsExcel ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />}
                Export Rekap 11 Kolom (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
