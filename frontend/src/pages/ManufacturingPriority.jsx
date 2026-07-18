import { useEffect, useState } from 'react'
import { getRankedPOs } from '../api/client'
import POCard from '../components/POCard'
import { ListOrdered, RefreshCw, Info, Loader2 } from 'lucide-react'

export default function ManufacturingPriority() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getRankedPOs()
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ListOrdered size={22} style={{ color: 'var(--holo-green)' }} /> Manufacturing Priority Queue
          </h1>
          <p className="page-subtitle">
            Holographic real-time ranking of POs by stockout urgency &amp; financial impact
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Re-Rank Index
        </button>
      </div>

      {/* Formula explanation in custom glass highlight */}
      <div className="card mb-6"
           style={{ borderColor: 'var(--holo-green-border)', background: 'var(--holo-green-dim)' }}>
        <div className="flex items-start gap-3">
          <Info size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--holo-green)' }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--holo-green)' }}>Deterministic Scoring Formula</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--holo-text-sub)' }}>
              <code className="font-mono" style={{ color: 'var(--holo-green)' }}>
                score = 0.35 × urgency + 0.25 × deadline_proximity + 0.20 × order_value + 0.20 × supplier_risk
              </code>
              <br />
              All calculations run in plain Python — Claude AI only writes the plain-English explanation below.
            </p>
          </div>
        </div>
      </div>

      {/* AI Queue Summary */}
      {data?.summary && (
        <div className="card mb-5"
             style={{ background: 'var(--holo-glass)', border: '1px solid var(--holo-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--holo-text-muted)' }}>AI Queue Summary</p>
          <p className="text-sm italic" style={{ color: 'var(--holo-text-sub)' }}>{data.summary}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
        </div>
      ) : !data?.ranked?.length ? (
        <div className="card text-center py-16">
          <ListOrdered size={40} className="mx-auto mb-4" style={{ color: 'var(--holo-text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--holo-text-sub)' }}>No active purchase orders to rank</p>
          <p className="text-sm mt-1" style={{ color: 'var(--holo-text-muted)' }}>
            Go to PO Queue and create some draft orders first
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-3" style={{ color: 'var(--holo-text-muted)' }}>
            {data.ranked.length} orders ranked by composite priority score
          </p>
          {data.ranked.map(po => (
            <POCard
              key={po.id}
              po={po}
              onUpdate={load}
              showRank
            />
          ))}
        </div>
      )}
    </div>
  )
}
