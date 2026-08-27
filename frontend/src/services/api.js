import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Dashboard
export const fetchOverview = () => api.get('/dashboard/overview').then(r => r.data)
export const fetchDefectsByLevel = () => api.get('/dashboard/defects-by-level').then(r => r.data)
export const fetchDefectsByModule = () => api.get('/dashboard/defects-by-module').then(r => r.data)
export const fetchDefectsByStatus = () => api.get('/dashboard/defects-by-status').then(r => r.data)
export const fetchDefectTrend = () => api.get('/dashboard/defect-trend').then(r => r.data)
export const fetchTesterWorkload = () => api.get('/dashboard/tester-workload').then(r => r.data)
export const fetchScoring = () => api.get('/dashboard/scoring').then(r => r.data)
export const fetchPriorityDistribution = () => api.get('/dashboard/priority-distribution').then(r => r.data)
export const fetchAgingDistribution = () => api.get('/dashboard/aging-distribution').then(r => r.data)
export const fetchFixingStatus = () => api.get('/dashboard/fixing-status').then(r => r.data)

// Defects
export const fetchDefects = (params) => api.get('/defects/', { params }).then(r => r.data)
export const fetchDefect = (id) => api.get(`/defects/${id}`).then(r => r.data)
export const fetchFilterOptions = () => api.get('/defects/filter-options').then(r => r.data)
export const createDefect = (data) => api.post('/defects/', data).then(r => r.data)
export const updateDefect = (id, data) => api.patch(`/defects/${id}`, data).then(r => r.data)

// Modules
export const fetchModules = () => api.get('/modules/').then(r => r.data)
export const fetchSubModules = (moduleId) => api.get(`/modules/${moduleId}/sub-modules`).then(r => r.data)
export const fetchModuleDefectDetail = (moduleId) => api.get(`/modules/${moduleId}/defect-detail`).then(r => r.data)

// Reports
export const fetchReportSummary = () => api.get('/reports/summary-by-submodule').then(r => r.data)
export const fetchScoringSummary = () => api.get('/reports/scoring-summary').then(r => r.data)
export const fetchDailySummary = () => api.get('/reports/daily-summary').then(r => r.data)
export const fetchModuleSummary = () => api.get('/reports/module-summary').then(r => r.data)
export const downloadPDFReport = () =>
  api.get('/reports/pdf', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Executive_SIT_Report_${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  })
export const downloadExecutiveExcel = () =>
  api.get('/reports/export-excel', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `Executive_SIT_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })

// Import / Export
export const importExcel = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const downloadTemplate = () =>
  api.get('/import/template', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_sit.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  })
export const exportDefects = () =>
  api.get('/import/export', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `export_sit_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })

// Defect Closure Monitor
export const fetchClosureSummary = (params) => api.get('/defects/closure-monitor/summary', { params }).then(r => r.data)
export const fetchClosureTable = (params) => api.get('/defects/closure-monitor/table', { params }).then(r => r.data)

// Test Scripts
export const fetchTestScripts = (params) => api.get('/test-scripts/', { params }).then(r => r.data)
export const fetchTestScriptStats = () => api.get('/test-scripts/stats').then(r => r.data)
export const fetchUniqueTestScriptStatuses = () => api.get('/test-scripts/statuses').then(r => r.data)
export const fetchTestScriptFilterOptions = () => api.get('/test-scripts/filter-options').then(r => r.data)
export const importTestScriptExcel = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/test-scripts/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const downloadTestScriptTemplate = () =>
  api.get('/test-scripts/template', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_test_script.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  })
export const exportTestScripts = (params) =>
  api.get('/test-scripts/export', { params, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    const statusPart = params?.status ? `_${params.status}` : ''
    a.download = `Test_Script${statusPart}_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })
export const exportTestScriptRekap = (params) =>
  api.get('/test-scripts/export-rekap', { params, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Test_Script_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })

export const fetchTestScriptCrossCheck = () =>
  api.get('/test-scripts/cross-check').then(r => r.data)

// Test Cases V2
export const fetchTestCasesV2 = (params) => api.get('/test-cases-v2/', { params }).then(r => r.data)
export const fetchTestCaseDetailV2 = (id) => api.get(`/test-cases-v2/${id}`).then(r => r.data)
export const executeTestCaseV2 = (id, data) => api.post(`/test-cases-v2/${id}/execute`, data).then(r => r.data)
export const importTestCasesV2Excel = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/test-cases-v2/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// SIT Report (per Pengembangan.md)
export const fetchCascadingFilters = (params) => api.get('/sit-report/cascading-filters', { params }).then(r => r.data)
export const fetchSITReportSummary = (params) => api.get('/sit-report/summary', { params }).then(r => r.data)
export const fetchSITReportTable = (params) => api.get('/sit-report/table', { params }).then(r => r.data)
export const fetchSITReportDetail = (id) => api.get(`/sit-report/detail/${id}`).then(r => r.data)
export const generateAIConclusion = (payload) => api.post('/sit-report/ai-conclusion', payload).then(r => r.data)
export const exportSITReportExcel = (params) =>
  api.get('/sit-report/export-excel', { params, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `SIT_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })

// Traceability Matrix
export const fetchHealthIndex = () => api.get('/traceability/health-index').then(r => r.data)
export const fetchTraceabilityMatrix = (params) => api.get('/traceability/matrix', { params }).then(r => r.data)
export const syncTraceabilityStatuses = () => api.post('/traceability/sync-statuses').then(r => r.data)
export const exportTraceabilityExcel = () =>
  api.get('/traceability/export-excel', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `Traceability_Matrix_RTM_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  })

export default api

