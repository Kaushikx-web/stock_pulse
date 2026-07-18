import { useState } from 'react'
import { updatePOStatus } from '../api/client'
import { ChevronDown, ChevronUp, FileText, Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react'

const STATUS_STYLE = {
  draft:         { bg: '#F3F4F6',               color: '#6B7280',       dot: '#9CA3AF' },
  sent:          { bg: 'rgba(6,182,212,0.10)',   color: '#06B6D4',       dot: '#06B6D4' },
  received:      { bg: 'rgba(16,185,129,0.10)',  color: '#10B981',       dot: '#10B981' },
  manufacturing: { bg: 'rgba(168,85,247,0.10)',  color: '#A855F7',       dot: '#A855F7' },
  complete:      { bg: 'rgba(16,185,129,0.10)',  color: '#10B981',       dot: '#10B981' },
  cancelled:     { bg: '#F3F4F6',               color: '#9CA3AF',       dot: '#9CA3AF' },
}

export default function POCard({ po, onUpdate, showRank = false }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus) => {
    setLoading(true)
    try {
      await updatePOStatus(po.id, newStatus)
      onUpdate?.()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const score = po.priority_score
  const scoreColor = score > 0.7 ? 'var(--danger)' : score > 0.4 ? 'var(--warning)' : 'var(--success)'
  const statusStyle = STATUS_STYLE[po.status] || STATUS_STYLE.draft

  return (
    <div className="card" style={{ marginBottom: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Rank */}
        {showRank && (
          <div style={{
            width: '32px', height: '32px', borderRadius: '9999px',
            background: 'var(--primary-dim)', border: '1px solid var(--primary-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>#{po.rank}</span>
          </div>
        )}

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
              {po.product_name || po.product?.name || 'Unknown Product'}
            </p>
            {/* Status badge */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '11px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusStyle.dot }} />
              {po.status}
            </span>
            {po.urgency && (
              <span style={{
                padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                background: po.urgency === 'CRITICAL' ? 'var(--danger-dim)' : po.urgency === 'HIGH' ? 'var(--warning-dim)' : '#F3F4F6',
                color: po.urgency === 'CRITICAL' ? 'var(--danger)' : po.urgency === 'HIGH' ? 'var(--warning)' : '#9CA3AF',
              }}>
                {po.urgency}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--sub)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Package size={12} color="var(--muted)" />{po.quantity?.toLocaleString()} units
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Truck size={12} color="var(--muted)" />{po.supplier_name || po.supplier?.name || '—'}
            </span>
            {po.deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} color="var(--muted)" />Due {new Date(po.deadline).toLocaleDateString()}
              </span>
            )}
            {score != null && (
              <span style={{ fontWeight: 600, color: scoreColor, fontFamily: 'monospace', fontSize: '11px' }}>
                Priority: {(score * 100).toFixed(1)}
              </span>
            )}
          </div>

          {po.ai_explanation && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--sub)', fontStyle: 'italic', borderLeft: '3px solid var(--primary-border)', paddingLeft: '10px', lineHeight: 1.5 }}>
              {po.ai_explanation}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {po.status === 'draft' && (
            <>
              <button onClick={() => handleStatusChange('sent')} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                <CheckCircle size={12} /> Approve
              </button>
              <button onClick={() => handleStatusChange('cancelled')} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                <XCircle size={12} /> Reject
              </button>
            </>
          )}
          {po.status === 'sent' && (
            <button onClick={() => handleStatusChange('received')} disabled={loading}
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-border)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              Mark Received
            </button>
          )}
          {po.draft_text && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {expanded ? <ChevronUp size={14} color="var(--sub)" /> : <ChevronDown size={14} color="var(--sub)" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded PO document */}
      {expanded && po.draft_text && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <FileText size={13} color="var(--primary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Purchase Order Document
            </span>
          </div>
          <pre style={{ fontSize: '12px', color: 'var(--sub)', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg)', borderRadius: '10px', padding: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.65, overflowX: 'auto', border: '1px solid var(--border)' }}>
            {po.draft_text}
          </pre>
        </div>
      )}

      {/* Score breakdown */}
      {expanded && po.component_breakdown && (
        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {Object.entries(po.component_breakdown)
            .filter(([k]) => k.endsWith('_weight'))
            .map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'capitalize', marginBottom: '3px' }}>
                  {k.replace('_weight', '').replace('_', ' ')}
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>{(v * 100).toFixed(1)}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
