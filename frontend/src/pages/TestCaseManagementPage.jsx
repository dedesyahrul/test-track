import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTestCasesV2, fetchTestCaseDetailV2, executeTestCaseV2, importTestCasesV2Excel,
  fetchModules
} from '../services/api'
import {
  Layers, Play, CheckCircle2, XCircle, AlertOctagon, HelpCircle, Clock,
  Upload, Search, Filter, RefreshCw, X, ChevronLeft, ChevronRight, Eye,
  Plus, Calendar, User, FileText, ArrowRight, Check, ShieldAlert
} from 'lucide-react'
import clsx from 'clsx'

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase()
  if (s === 'PASS') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PASS</span>
  }
  if (s === 'FAIL') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">FAIL</span>
  }
  if (s === 'BLOCKED') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">BLOCKED</span>
  }
  if (s === 'IN PROGRESS') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">IN PROGRESS</span>
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">NOT RUN</span>
}

export default function TestCaseManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleId, setModuleId] = useState('')
  
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(null)
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  // Execution state
  const [execTesterName, setExecTesterName] = useState('Amanda')
  const [execNotes, setExecNotes] = useState('')
  const [execStepResults, setExecStepResults] = useState({}) // { step_id: { status: 'PASS', keterangan: '' } }

  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: fetchModules })

  const params = {
    page,
    page_size: 15,
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(moduleId && { module_id: Number(moduleId) }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['testCasesV2', params],
    queryFn: () => fetchTestCasesV2(params),
    keepPreviousData: true,
  })

  const { data: tcDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['testCaseDetailV2', selectedTestCaseId],
    queryFn: () => fetchTestCaseDetailV2(selectedTestCaseId),
    enabled: !!selectedTestCaseId,
  })

  const executeMutation = useMutation({
    mutationFn: ({ id, data }) => executeTestCaseV2(id, data),
    onSuccess: () => {
      setShowExecutionModal(false)
      setExecStepResults({})
      setExecNotes('')
      queryClient.invalidateQueries()
    },
  })

  const importMutation = useMutation({
    mutationFn: importTestCasesV2Excel,
    onSuccess: (res) => {
      setImportResult(res)
      setSelectedFile(null)
      queryClient.invalidateQueries()
    },
  })

  const handleStartTesting = (tc) => {
    setSelectedTestCaseId(tc.id)
    // Initialize step results
    const initResults = {}
    if (tc.steps) {
      tc.steps.forEach(st => {
        initResults[st.id] = { status: 'PASS', keterangan: '' }
      })
    }
    setExecStepResults(initResults)
    setShowExecutionModal(true)
  }

  const handleStepResultChange = (stepId, field, val) => {
    setExecStepResults(prev => ({
      ...prev,
      [stepId]: {
        ...(prev[stepId] || { status: 'PASS', keterangan: '' }),
        [field]: val
      }
    }))
  }

  const handleSubmitExecution = () => {
    if (!selectedTestCaseId) return
    const payload = {
      test_case_id: selectedTestCaseId,
      tester_name: execTesterName,
      completion_testing_date: new Date().toISOString().slice(0, 10),
      notes: execNotes,
      step_results: Object.entries(execStepResults).map(([stepId, res]) => ({
        test_step_id: Number(stepId),
        status: res.status,
        keterangan: res.keterangan,
      }))
    }
    executeMutation.mutate({ id: selectedTestCaseId, data: payload })
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Case Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen Skenario Pengujian, Eksekusi Test Step, dan Riwayat Retesting
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel V2
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, Skenario..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status Case</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium text-slate-700"
            >
              <option value="">Semua Status Case</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="NOT RUN">NOT RUN</option>
            </select>
          </div>

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

      {/* Main Test Case Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider w-36">Test Case ID</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider max-w-xs">Test Case Summary</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Module / Sheet</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Stage / Component</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Total Step</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Last Tester</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Last Testing Date</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span>Loading Test Cases...</span>
                    </div>
                  </td>
                </tr>
              ) : (data?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada Test Case ditemukan
                  </td>
                </tr>
              ) : (
                (data?.items || []).map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary-600">
                      {tc.test_case_id}
                      {tc.cycle && (
                        <span className="block mt-0.5 text-[10px] text-slate-400 font-normal">Cycle {tc.cycle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-slate-800 line-clamp-1">{tc.summary}</p>
                      {tc.import_file_name && (
                        <p className="text-[10px] text-slate-400 truncate" title={tc.import_file_name}>File: {tc.import_file_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{tc.module_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{tc.sheet_name ? `Tab: ${tc.sheet_name}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-medium">{tc.stage}</p>
                      <p className="text-[11px] text-slate-400">{tc.component || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {tc.total_steps} Steps
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={tc.calculated_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tc.last_tester || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{tc.last_testing_date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedTestCaseId(tc.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="Lihat Detail & Steps"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStartTesting(tc)}
                          className="flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Testing / Retest
                        </button>
                      </div>
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
              Halaman {data.page} dari {data.total_pages} ({data.total} test cases)
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    page === i + 1 ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {i + 1}
                </button>
              ))}
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

      {/* Modal Detail Test Case & Steps */}
      {selectedTestCaseId && !showExecutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="py-12 text-center text-slate-400">Loading detail...</div>
            ) : tcDetail ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-base font-bold text-primary-600">{tcDetail.test_case_id}</span>
                    <StatusBadge status={tcDetail.calculated_status} />
                  </div>
                  <button onClick={() => setSelectedTestCaseId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800">{tcDetail.summary}</h3>
                  {tcDetail.case_description && (
                    <p className="text-xs text-slate-500 mt-1">{tcDetail.case_description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl">
                  <div><span className="text-slate-400">Module:</span> <p className="font-semibold text-slate-800">{tcDetail.module_name}</p></div>
                  <div><span className="text-slate-400">Sheet Tab:</span> <p className="font-semibold text-slate-800">{tcDetail.sheet_name || '-'}</p></div>
                  <div><span className="text-slate-400">File Import:</span> <p className="font-semibold text-slate-800 truncate" title={tcDetail.import_file_name}>{tcDetail.import_file_name || '-'}</p></div>
                  <div><span className="text-slate-400">Stage / Phase:</span> <p className="font-semibold text-slate-800">{tcDetail.stage}</p></div>
                  <div><span className="text-slate-400">Component:</span> <p className="font-semibold text-slate-800">{tcDetail.component || '-'}</p></div>
                  <div><span className="text-slate-400">Total Steps:</span> <p className="font-semibold text-slate-800">{tcDetail.total_steps} Steps</p></div>
                  <div><span className="text-slate-400">Cycle / Date Metadata:</span> <p className="font-semibold text-slate-800">Cycle {tcDetail.cycle || 1} ({tcDetail.year || 2026}-{tcDetail.month || 8}-{tcDetail.day || 1})</p></div>
                  <div><span className="text-slate-400">Terakhir Diuji:</span> <p className="font-semibold text-slate-800">{tcDetail.last_tester ? `${tcDetail.last_tester} (${tcDetail.last_testing_date || ''})` : '-'}</p></div>
                </div>

                {tcDetail.prerequisite && (
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-slate-600">Prerequisite / Test Data:</span>
                    <p className="bg-slate-50 p-2.5 rounded-lg text-slate-700 font-mono">{tcDetail.prerequisite}</p>
                  </div>
                )}

                {/* Test Steps Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-700">Daftar Langkah Pengujian (Test Steps)</h4>
                  <table className="w-full text-xs border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="p-2 text-center w-10">No</th>
                        <th className="p-2 text-left">Test Step</th>
                        <th className="p-2 text-left">Expected Result</th>
                        <th className="p-2 text-center w-24">Latest Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tcDetail.steps.map((st) => {
                        const stepResult = tcDetail.latest_execution?.step_results?.find(sr => sr.test_step_id === st.id)
                        return (
                          <tr key={st.id}>
                            <td className="p-2 text-center font-bold">{st.step_no}</td>
                            <td className="p-2 font-mono whitespace-pre-wrap">{st.test_step}</td>
                            <td className="p-2 text-slate-600 whitespace-pre-wrap">{st.expected_result || '-'}</td>
                            <td className="p-2 text-center">
                              <StatusBadge status={stepResult?.status || 'NOT_RUN'} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleStartTesting(tcDetail)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center shadow-sm"
                  >
                    <Play className="w-4 h-4 mr-1.5" /> Start Testing / Retest
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Testing / Retest Mode (#1, #2...) */}
      {showExecutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-emerald-600" />
                  Testing / Retest Mode &bull; {tcDetail?.test_case_id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{tcDetail?.summary}</p>
              </div>
              <button onClick={() => setShowExecutionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <label className="block text-slate-500 mb-1">Nama Tester:</label>
                <input
                  type="text"
                  value={execTesterName}
                  onChange={(e) => setExecTesterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Tanggal Eksekusi:</label>
                <input
                  type="date"
                  value={new Date().toISOString().slice(0, 10)}
                  disabled
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded font-medium text-slate-500"
                />
              </div>
            </div>

            {/* Test Step Results Input Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-700">Hasil Pengujian per Test Step</h4>
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-2 text-center w-10">No</th>
                    <th className="p-2 text-left">Test Step</th>
                    <th className="p-2 text-center w-32">Hasil Result</th>
                    <th className="p-2 text-left">Keterangan / Defect Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(tcDetail?.steps || []).map((st) => {
                    const stepRes = execStepResults[st.id] || { status: 'PASS', keterangan: '' }
                    return (
                      <tr key={st.id}>
                        <td className="p-2 text-center font-bold">{st.step_no}</td>
                        <td className="p-2 font-mono whitespace-pre-wrap">{st.test_step}</td>
                        <td className="p-2 text-center">
                          <select
                            value={stepRes.status}
                            onChange={(e) => handleStepResultChange(st.id, 'status', e.target.value)}
                            className={clsx(
                              'w-full px-2 py-1 rounded text-xs font-bold focus:outline-none',
                              stepRes.status === 'PASS' && 'bg-emerald-100 text-emerald-800 border border-emerald-300',
                              stepRes.status === 'FAIL' && 'bg-red-100 text-red-800 border border-red-300',
                              stepRes.status === 'BLOCKED' && 'bg-orange-100 text-orange-800 border border-orange-300',
                              stepRes.status === 'NOT_RUN' && 'bg-slate-100 text-slate-700 border border-slate-300'
                            )}
                          >
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                            <option value="BLOCKED">BLOCKED</option>
                            <option value="NOT_RUN">NOT_RUN</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Keterangan / Kode Defect..."
                            value={stepRes.keterangan}
                            onChange={(e) => handleStepResultChange(st.id, 'keterangan', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setShowExecutionModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                onClick={handleSubmitExecution}
                disabled={executeMutation.isPending}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center"
              >
                {executeMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                Simpan Hasil Eksekusi Testing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel V2 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-primary-600" />
                Import Excel Test Case V2
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Format Import Excel V2 (per Pengembangan.md):</p>
              <p>Otomatis memilah <strong>1 Test Case + N Test Steps + Initial Execution</strong>.</p>
              <p>Tidak ada duplikasi record Test Case ID di database.</p>
            </div>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-primary-400 rounded-xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-primary-50/50 transition-colors"
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">Pilih / Drop File Excel Test Case di sini</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                <button
                  onClick={() => importMutation.mutate(selectedFile)}
                  disabled={importMutation.isPending}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center"
                >
                  {importMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Proses Import V2
                </button>
              </div>
            )}

            {importResult && (
              <div className={clsx('p-4 rounded-xl border text-xs', importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
                <p className="font-bold">{importResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
