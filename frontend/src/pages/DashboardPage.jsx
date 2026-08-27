import { useQuery } from '@tanstack/react-query'
import {
  fetchOverview, fetchDefectsByLevel, fetchDefectsByModule,
  fetchDefectsByStatus, fetchDefectTrend, fetchTesterWorkload,
  fetchPriorityDistribution, fetchAgingDistribution, fetchFixingStatus
} from '../services/api'
import {
  Bug, CheckCircle, AlertCircle, Clock, TrendingUp, Target,
  BarChart3, Timer
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts'
import clsx from 'clsx'

const COLORS = {
  Fatal: '#ef4444',
  Major: '#f97316',
  Minor: '#eab308',
  Kosmetik: '#3b82f6',
}

const STATUS_COLORS = {
  Open: '#ef4444',
  Closed: '#22c55e',
  'Under Review': '#a855f7',
  'Re-Opened': '#f97316',
  Confirmed: '#6366f1',
}

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e', '#a855f7']

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center text-xs">
          <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
          <span className="text-emerald-600 font-medium">{trend}%</span>
          <span className="text-slate-400 ml-1">resolution rate</span>
        </div>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview'], queryFn: fetchOverview
  })
  const { data: byLevel } = useQuery({
    queryKey: ['defectsByLevel'], queryFn: fetchDefectsByLevel
  })
  const { data: byModule } = useQuery({
    queryKey: ['defectsByModule'], queryFn: fetchDefectsByModule
  })
  const { data: byStatus } = useQuery({
    queryKey: ['defectsByStatus'], queryFn: fetchDefectsByStatus
  })
  const { data: trend } = useQuery({
    queryKey: ['defectTrend'], queryFn: fetchDefectTrend
  })
  const { data: workload } = useQuery({
    queryKey: ['testerWorkload'], queryFn: fetchTesterWorkload
  })
  const { data: priority } = useQuery({
    queryKey: ['priorityDist'], queryFn: fetchPriorityDistribution
  })
  const { data: aging } = useQuery({
    queryKey: ['agingDist'], queryFn: fetchAgingDistribution
  })
  const { data: fixing } = useQuery({
    queryKey: ['fixingStatus'], queryFn: fetchFixingStatus
  })

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SIT Overview</h1>
          <p className="text-slate-500 mt-1">
            {overview?.project_name || 'Procurement Management System'} &mdash; {overview?.sit_date || 'Active'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bug}
          label="Total Defect"
          value={overview?.total_defects || 0}
          sub={`${overview?.total_non_defect || 0} non-defect`}
          color="bg-red-500"
        />
        <StatCard
          icon={AlertCircle}
          label="Open Defect"
          value={overview?.total_open || 0}
          sub={`${overview?.total_under_review || 0} under review`}
          color="bg-orange-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Closed Defect"
          value={overview?.total_closed || 0}
          color="bg-emerald-500"
          trend={overview?.resolution_rate}
        />
        <StatCard
          icon={Timer}
          label="Avg. Aging"
          value={`${overview?.avg_aging || 0} hari`}
          sub={`Defect rate: ${overview?.defect_rate || 0}%`}
          color="bg-primary-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Defect Trend</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend || []}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#ef4444" fill="url(#colorCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="closed" name="Closed" stroke="#22c55e" fill="url(#colorClosed)" strokeWidth={2} />
                <Line type="monotone" dataKey="cumulative_open" name="Cumulative Open" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defects by Module */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Defects by Module</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byModule || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="module" type="category" width={140} tick={{ fontSize: 10 }}
                  tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '...' : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="closed" name="Closed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="open" name="Open" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Severity Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byLevel || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="level"
                  label={({ level, count }) => `${level}: ${count}`}
                  labelLine={false}
                >
                  {(byLevel || []).map((entry) => (
                    <Cell key={entry.level} fill={COLORS[entry.level] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(byLevel || []).map(l => (
                <div key={l.level} className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[l.level] }} />
                  <span className="text-slate-600">{l.level}: <strong>{l.count}</strong> (Score: {l.score})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Status Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="status"
                  label={({ status, count }) => `${count}`}
                >
                  {(byStatus || []).map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {(byStatus || []).map((s, i) => (
                <div key={s.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600">{s.status}</span>
                  </div>
                  <span className="font-bold text-slate-800">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aging Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Aging Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aging || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Jumlah Defect" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {(aging || []).map((entry, i) => (
                    <Cell key={i} fill={['#22c55e', '#eab308', '#f97316', '#ef4444'][i] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tester Workload */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Tester Workload</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tester" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retested" name="Retested" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fixing Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Fixing / Review Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {(fixing || []).map((item, i) => {
                const total = (fixing || []).reduce((a, b) => a + b.count, 0)
                const pct = total > 0 ? (item.count / total * 100).toFixed(1) : 0
                const colors = {
                  'Done': 'bg-emerald-500',
                  'Fix in Progress': 'bg-blue-500',
                  'Needs Attention': 'bg-red-500',
                  'Review in Progress': 'bg-purple-500',
                }
                return (
                  <div key={item.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{item.status}</span>
                      <span className="text-slate-800 font-bold">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={clsx('h-2.5 rounded-full transition-all duration-500', colors[item.status] || 'bg-slate-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">Priority Distribution</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(priority || []).map((p) => {
              const colorMap = {
                'Highest': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' },
                'High': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
                'Medium': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-500' },
                'Low': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' },
              }
              const c = colorMap[p.priority] || colorMap['Medium']
              return (
                <div key={p.priority} className={clsx('rounded-xl border p-4', c.bg, c.border)}>
                  <p className={clsx('text-xs font-medium uppercase tracking-wider', c.text)}>{p.priority}</p>
                  <p className={clsx('text-3xl font-bold mt-1', c.text)}>{p.count}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
