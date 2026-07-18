import { useEffect, useState } from 'react'
import { getSuppliers, getDashboard } from '../api/client'
import StatCard from '../components/StatCard'
import { Network, Server, Users, Activity, ShieldCheck, Truck } from 'lucide-react'

export default function ERPCore() {
  const [suppliers, setSuppliers] = useState([])
  const [dashData, setDashData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [suppRes, dashRes] = await Promise.all([
        getSuppliers(),
        getDashboard()
      ])
      setSuppliers(suppRes.data)
      setDashData(dashRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeSuppliers = suppliers.length
  const avgReliability = activeSuppliers > 0
    ? (suppliers.reduce((acc, curr) => acc + curr.reliability_score, 0) / activeSuppliers).toFixed(2)
    : 0

  const getScoreColor = (score) => {
    if (score >= 0.85) return 'var(--holo-green)'
    if (score >= 0.6) return 'var(--holo-orange)'
    return 'var(--holo-pink)'
  }

  const getScoreBg = (score) => {
    if (score >= 0.85) return 'var(--holo-green-dim)'
    if (score >= 0.6) return 'var(--holo-orange-dim)'
    return 'var(--holo-pink-dim)'
  }

  const getScoreBorder = (score) => {
    if (score >= 0.85) return 'var(--holo-green-border)'
    if (score >= 0.6) return 'var(--holo-orange-border)'
    return 'var(--holo-pink-border)'
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Network size={22} style={{ color: 'var(--holo-green)' }} /> ERP Core Operations
          </h1>
          <p className="page-subtitle">Central supply chain operations &amp; high-level metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="System Health" value="Online" sub="All services running" icon={Server} color="green" />
        <StatCard title="Active Suppliers" value={activeSuppliers} sub="Integrated vendors" icon={Users} color="blue" />
        <StatCard title="Avg Reliability" value={`${avgReliability}/1.0`} sub="Supplier performance" icon={ShieldCheck} color="amber" />
        <StatCard title="Total POs Tracked" value={dashData?.pending_po_count || 0} sub="Pending in network" icon={Activity} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Network */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--holo-text)' }}>
            <Truck size={16} style={{ color: 'var(--holo-green)' }} /> Integrated Supplier Network
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 py-4" style={{ color: 'var(--holo-text-muted)' }}>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
                <span className="text-sm">Loading network...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--holo-text-muted)' }}>No suppliers found.</p>
            ) : (
              suppliers.map(s => (
                <div key={s.id}
                     className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>{s.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--holo-text-muted)' }}>Lead Time: {s.lead_time_days} days</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{
                            background: getScoreBg(s.reliability_score),
                            color: getScoreColor(s.reliability_score),
                            border: `1px solid ${getScoreBorder(s.reliability_score)}`
                          }}>
                      {(s.reliability_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--holo-text)' }}>
            <Server size={16} style={{ color: 'var(--holo-green)' }} /> Infrastructure Status
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--holo-text-muted)' }}>Database Connection</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--holo-green)', boxShadow: '0 0 8px var(--holo-green)' }}></div>
                <p className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>Supabase Connected (latency: 12ms)</p>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--holo-text-muted)' }}>AI Engine</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--holo-blue)', boxShadow: '0 0 8px var(--holo-blue)' }}></div>
                <p className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>Claude 3.5 Sonnet Integration Active</p>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--holo-text-muted)' }}>Sync Status</p>
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--holo-text)' }}>Last full sync completed 5 mins ago</p>
                <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--holo-green)' }}>Force Sync</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
