import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importExcel, downloadTemplate, exportDefects } from '../services/api'
import {
  Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle,
  X, FileUp, RefreshCw, FileDown, Info
} from 'lucide-react'
import clsx from 'clsx'

export default function ImportPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [result, setResult] = useState(null)

  const importMutation = useMutation({
    mutationFn: importExcel,
    onSuccess: (data) => {
      setResult(data)
      setSelectedFile(null)
      // Invalidate all queries to refresh dashboard data
      queryClient.invalidateQueries()
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Gagal mengimport file',
        errors: [error.message],
      })
    },
  })

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file)
      setResult(null)
    }
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import / Export</h1>
          <p className="text-slate-500 text-sm mt-1">Import defect dari Excel atau export data yang ada</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => downloadTemplate()}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2 text-slate-400" />
            Download Template
          </button>
          <button
            onClick={() => exportDefects()}
            className="flex items-center px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card border-blue-200 bg-blue-50/50">
        <div className="p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Format Import Excel</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 text-xs">
              <li>File harus berformat <strong>.xlsx</strong></li>
              <li>Sistem <strong>auto-detect baris data</strong> -- header & rumus di row 1-8 otomatis di-skip</li>
              <li>Kolom wajib: <strong>Module, Sub-Module, Summary, Level of Defect, Status, Date Created, Created by</strong></li>
              <li>Defect ID, Scoring, Priority, Aging akan di-<strong>generate/calculate otomatis</strong> jika kosong</li>
              <li>Formula Excel (<code>=IF, =SWITCH</code>) otomatis di-handle</li>
              <li>Jika Defect ID sudah ada di database, data akan di-<strong>update</strong></li>
              <li>Kolom <strong>Z (Fixing Status by Vendor)</strong> untuk status vendor defect</li>
              <li>Import akan <strong>sync semua tabel relasi</strong> (report_summary, defect_scoring, testers)</li>
              <li>Download template untuk melihat format lengkap</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center">
            <Upload className="w-4 h-4 mr-2 text-slate-400" />
            Import Excel
          </h3>
        </div>
        <div className="card-body">
          {!selectedFile ? (
            /* Drop Zone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
                dragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center space-y-4">
                <div className={clsx(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                  dragActive ? 'bg-primary-100' : 'bg-slate-100'
                )}>
                  <FileSpreadsheet className={clsx(
                    'w-8 h-8',
                    dragActive ? 'text-primary-500' : 'text-slate-400'
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {dragActive ? 'Lepaskan file di sini' : 'Drag & drop file Excel di sini'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">atau klik untuk memilih file (.xlsx)</p>
                </div>
              </div>
            </div>
          ) : (
            /* File Selected */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className={clsx(
                    'flex items-center px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all',
                    importMutation.isPending
                      ? 'bg-primary-400 cursor-wait'
                      : 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25'
                  )}
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Import Sekarang
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Result */}
      {result && (
        <div className={clsx(
          'card border-l-4',
          result.success ? 'border-l-emerald-500' : 'border-l-red-500'
        )}>
          <div className="card-header">
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <h3 className={clsx(
                'text-sm font-semibold',
                result.success ? 'text-emerald-700' : 'text-red-700'
              )}>
                {result.success ? 'Import Berhasil' : 'Import Gagal'}
              </h3>
            </div>
          </div>
          <div className="card-body">
            <p className="text-sm text-slate-700 mb-4">{result.message}</p>

            {result.success && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-800">{result.total_rows}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Rows</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Baru</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-[10px] text-blue-500 uppercase tracking-wider">Diperbarui</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{result.skipped}</p>
                  <p className="text-[10px] text-orange-500 uppercase tracking-wider">Dilewati</p>
                </div>
              </div>
            )}

            {result.new_modules && result.new_modules.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Module baru dibuat:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.new_modules.map((m, i) => (
                    <span key={i} className="badge bg-blue-100 text-blue-700">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.new_sub_modules && result.new_sub_modules.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Sub-Module baru dibuat:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.new_sub_modules.map((m, i) => (
                    <span key={i} className="badge bg-indigo-100 text-indigo-700">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.new_testers && result.new_testers.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Tester baru ditambahkan:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.new_testers.map((m, i) => (
                    <span key={i} className="badge bg-purple-100 text-purple-700">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.synced_tables && result.synced_tables.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Tabel ter-sync:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.synced_tables.map((t, i) => (
                    <span key={i} className="badge bg-emerald-100 text-emerald-700">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {result.data_start_row && (
              <p className="text-xs text-slate-400 mb-3">
                Data terbaca mulai dari <strong>Row {result.data_start_row}</strong> (header rows di atasnya otomatis di-skip)
              </p>
            )}

            {result.errors && result.errors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-1">Errors ({result.errors.length}):</p>
                <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 font-mono">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Reference */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">Referensi Kolom Excel</h3>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-slate-500 font-medium">Kolom</th>
                  <th className="px-3 py-2 text-left text-slate-500 font-medium">Nama</th>
                  <th className="px-3 py-2 text-center text-slate-500 font-medium">Wajib</th>
                  <th className="px-3 py-2 text-left text-slate-500 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                   ['A', 'Defect ID#', false, 'Auto-generate jika kosong'],
                   ['B', 'Module', true, 'Nama module (dibuat otomatis jika baru)'],
                   ['C', 'Sub-Module', true, 'Nama sub-module'],
                   ['D', 'Summary', true, 'Ringkasan defect'],
                   ['E', 'Stage', false, 'Default: Testing: SIT'],
                   ['F', 'Environment', false, 'Default: Development'],
                   ['G', 'Description', false, 'Deskripsi detail'],
                   ['H', 'Issue Link', false, 'Link test case'],
                   ['I', 'Impact of Issue', false, 'Dampak issue'],
                   ['J', 'Level of Defect', true, 'Fatal / Major / Minor / Kosmetik'],
                   ['K', 'Scoring Level', false, 'Auto dari Level (25/10/2/1)'],
                   ['L', 'Priority', false, 'Auto dari Level'],
                   ['M', 'Criteria', false, 'Defect / Non-Defect'],
                   ['N', 'Status', true, 'Open / Closed / Under Review / Re-Opened / Confirmed'],
                   ['O', 'Date Created', true, 'Format: YYYY-MM-DD'],
                   ['P', 'Date Re-Opened', false, ''],
                   ['Q', 'Date Closed', false, ''],
                   ['R', 'Aging', false, 'Auto-calculate jika kosong'],
                   ['S', 'Created by', true, 'Nama tester'],
                   ['T', 'Last Retested by', false, ''],
                   ['U', 'Fixing / Confirmed by', false, ''],
                   ['V', 'Fix Date', false, ''],
                   ['W', 'Fixing Status', false, 'Done / Fix in Progress / Needs Attention'],
                   ['X', 'Keterangan', false, 'Catatan / log aktivitas'],
                   ['Y', 'Retesting', false, 'Catatan retesting'],
                   ['Z', 'Fixing Status by Vendor', false, 'Status vendor (misal: Fixed, In Progress, Pending)'],
                ].map(([col, name, required, desc]) => (
                  <tr key={col} className={required ? 'bg-blue-50/30' : ''}>
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-600">{col}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-700">{name}</td>
                    <td className="px-3 py-1.5 text-center">
                      {required ? (
                        <span className="badge bg-blue-100 text-blue-700 text-[10px]">Wajib</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
