import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Bug, Package, FileBarChart, Menu, X, FileUp, FileCheck, Printer, Link2, ListChecks, FileText, CheckCircle2, Inbox } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'SIT Report', href: '/sit-report', icon: FileText },
  { name: 'Defect List', href: '/defects', icon: Bug },
  { name: 'Defect Intake', href: '/defect-intake', icon: Inbox },
  { name: 'Defect Closure Monitor', href: '/defect-closure', icon: CheckCircle2 },
  { name: 'Test Case V2', href: '/test-cases-v2', icon: ListChecks },
  { name: 'Test Script', href: '/test-scripts', icon: FileCheck },
  { name: 'Matriks Traceability', href: '/traceability', icon: Link2 },
  { name: 'Modules', href: '/modules', icon: Package },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Cetak Report', href: '/cetak-report', icon: Printer },
  { name: 'Import / Export', href: '/import', icon: FileUp },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">SIT Monitor</h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Dashboard</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className={clsx('w-5 h-5 mr-3', isActive ? 'text-white' : 'text-slate-400')} />
                {item.name}
              </NavLink>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="px-3 py-2 rounded-lg bg-slate-800">
            <p className="text-xs text-slate-400">Environment</p>
            <p className="text-sm text-emerald-400 font-medium">Development / SIT</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard SIT'}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">SIT Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
