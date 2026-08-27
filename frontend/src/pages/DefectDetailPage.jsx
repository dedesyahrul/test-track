import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchDefect } from '../services/api'
import { ArrowLeft, Clock, User, Calendar, Tag, FileText, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export default function DefectDetailPage() {
  const { defectId } = useParams()
  const navigate = useNavigate()
  const { data: defect, isLoading, error } = useQuery({
    queryKey: ['defect', defectId],
    queryFn: () => fetchDefect(defectId),
    enabled: !!defectId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !defect) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">Defect not found</p>
        <button onClick={() => navigate('/defects')} className="text-primary-600 text-sm font-medium hover:underline">
          Back to defect list
        </button>
      </div>
    )
  }

  const levelColor = {
    Fatal: 'bg-red-100 text-red-800 border-red-200',
    Major: 'bg-orange-100 text-orange-800 border-orange-200',
    Minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Kosmetik: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const statusColor = {
    Open: 'bg-red-100 text-red-700',
    Closed: 'bg-green-100 text-green-700',
    'Under Review': 'bg-purple-100 text-purple-700',
    Confirmed: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start space-x-4">
        <button
          onClick={() => navigate('/defects')}
          className="mt-1 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{defect.defect_id}</h1>
            <span className={clsx('badge text-sm', levelColor[defect.level_of_defect] || 'bg-slate-100 text-slate-600')}>
              {defect.level_of_defect || 'N/A'}
            </span>
            <span className={clsx('badge text-sm', statusColor[defect.status] || 'bg-slate-100 text-slate-600')}>
              {defect.status}
            </span>
            {defect.defect_criteria === 'Non-Defect' && (
              <span className="badge bg-slate-100 text-slate-600 text-sm">Non-Defect</span>
            )}
          </div>
          <p className="text-lg text-slate-700 mt-2">{defect.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-slate-400" />
                Description
              </h3>
            </div>
            <div className="card-body">
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {defect.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Keterangan / History */}
          {defect.keterangan && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-slate-700">Activity Log</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {defect.keterangan.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-slate-600">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Retesting notes */}
          {defect.retesting && (
            <div className="card border-yellow-200 bg-yellow-50/50">
              <div className="card-header border-yellow-100">
                <h3 className="text-sm font-semibold text-yellow-800">Retesting Notes</h3>
              </div>
              <div className="card-body">
                <p className="text-sm text-yellow-700">{defect.retesting}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-700">Details</h3>
            </div>
            <div className="card-body space-y-4">
              <DetailRow icon={Tag} label="Module" value={defect.module_name} />
              <DetailRow icon={Tag} label="Sub-Module" value={defect.sub_module_name} />
              <DetailRow icon={Tag} label="Issue Link" value={defect.issue_link} />
              <DetailRow icon={Tag} label="Stage" value={defect.stage} />
              <DetailRow icon={Tag} label="Environment" value={defect.environment} />
              <DetailRow icon={Tag} label="Priority" value={defect.priority} />
              <DetailRow icon={Tag} label="Criteria" value={defect.defect_criteria} />
              {defect.scoring_level && (
                <DetailRow icon={Tag} label="Score" value={`${defect.scoring_level} pts`} />
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-700">Timeline</h3>
            </div>
            <div className="card-body space-y-4">
              <DetailRow icon={Calendar} label="Created" value={defect.date_created} />
              <DetailRow icon={Calendar} label="Re-Opened" value={defect.date_reopened || '-'} />
              <DetailRow icon={Calendar} label="Closed" value={defect.date_closed || '-'} />
              <DetailRow icon={Clock} label="Aging" value={`${defect.aging} hari`} />
              <DetailRow icon={Tag} label="Fixing Status" value={defect.fixing_review_status || '-'} />
            </div>
          </div>

          {/* People */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-700">People</h3>
            </div>
            <div className="card-body space-y-4">
              <DetailRow icon={User} label="Created by" value={defect.created_by || '-'} />
              <DetailRow icon={User} label="Last Retested by" value={defect.last_retested_by || '-'} />
              <DetailRow icon={User} label="Fixed by" value={defect.fixing_confirmed_by || '-'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start space-x-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 font-medium break-words">{value || '-'}</p>
      </div>
    </div>
  )
}
