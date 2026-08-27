import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import DefectsPage from './pages/DefectsPage'
import DefectDetailPage from './pages/DefectDetailPage'
import ModulesPage from './pages/ModulesPage'
import ReportsPage from './pages/ReportsPage'
import ImportPage from './pages/ImportPage'
import TestScriptsPage from './pages/TestScriptsPage'
import CetakReportPage from './pages/CetakReportPage'
import TraceabilityPage from './pages/TraceabilityPage'
import TestCaseManagementPage from './pages/TestCaseManagementPage'
import SITReportPage from './pages/SITReportPage'
import DefectClosurePage from './pages/DefectClosurePage'

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sit-report" element={<SITReportPage />} />
          <Route path="/defects" element={<DefectsPage />} />
          <Route path="/defects/:defectId" element={<DefectDetailPage />} />
          <Route path="/defect-closure" element={<DefectClosurePage />} />
          <Route path="/test-cases-v2" element={<TestCaseManagementPage />} />
          <Route path="/test-scripts" element={<TestScriptsPage />} />
          <Route path="/traceability" element={<TraceabilityPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cetak-report" element={<CetakReportPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}
