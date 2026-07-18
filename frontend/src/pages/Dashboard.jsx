import { useEffect, useState, useCallback } from 'react'
import { getDashboard, getPOs } from '../api/client'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  TrendingUp, RefreshCw, BarChart2, DollarSign,
  Activity, Layers, Coins, ShoppingCart, AlertTriangle, Package, X
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(19, 22, 30, 0.95)', border: '1px solid var(--holo-border)',
      borderRadius: '12px', padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: '12px',
      backdropFilter: 'blur(10px)'
    }}>
      <p style={{ color: 'var(--holo-text-sub)', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }} />
          {p.name}: {typeof p.value === 'number' ? `$${Math.round(p.value).toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingPOs, setPendingPOs] = useState([])
  const [fromUpload, setFromUpload] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, poRes] = await Promise.all([
        getDashboard(),
        getPOs()
      ])
      setData(dashRes.data)
      const pending = (poRes.data || []).filter(po => po.status === 'draft' || po.status === 'sent')
      setPendingPOs(pending)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch every time we navigate TO the dashboard (location.key changes on each navigation)
  useEffect(() => {
    // Detect if we came from an upload (passed via router state)
    if (location.state?.fromUpload) {
      setFromUpload(true)
      setTimeout(() => setFromUpload(false), 4000)
      // Clear the state so back-navigation doesn't re-trigger the toast
      window.history.replaceState({}, '')
    }
    load()
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const trend = data?.daily_revenue_trend?.map(r => ({
    date: r.date.slice(5),
    revenue: Math.round(r.revenue),
    target: Math.round(r.revenue * 1.25), // Smooth overlay line representation
  })) || []

  const total30DayRevenue = trend.reduce((s, r) => s + r.revenue, 0)
  const avgDailyRevenue = trend.length ? Math.round(total30DayRevenue / trend.length) : 0

  // Calculate percentage change in revenue (simulated based on first vs second half trend)
  const getRevenueChange = () => {
    if (trend.length < 2) return '+0.0%'
    const half = Math.floor(trend.length / 2)
    const firstHalf = trend.slice(0, half).reduce((s, r) => s + r.revenue, 0)
    const secondHalf = trend.slice(half).reduce((s, r) => s + r.revenue, 0)
    if (firstHalf === 0) return '+0.0%'
    const pct = ((secondHalf - firstHalf) / firstHalf) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid var(--holo-green-dim)', borderTopColor: 'var(--holo-green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Upload Refresh Toast ── */}
      {fromUpload && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(197,241,53,0.08)',
          border: '1px solid var(--holo-green-border)',
          borderRadius: '12px', padding: '12px 18px',
          animation: 'fadeInDown 0.4s ease',
        }}>
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(197,241,53,0.15)', border: '1px solid var(--holo-green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <RefreshCw size={14} color="var(--holo-green)" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--holo-green)' }}>Dashboard refreshed with new data</p>
            <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', marginTop: '1px' }}>Your uploaded data is now live in Supabase and reflected below</p>
          </div>
          <button
            onClick={() => setFromUpload(false)}
            style={{ marginLeft: 'auto', color: 'var(--holo-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* ── Top Row: BTC Tracker, Overview Chart, Wallet Control ── */}
      {/* Refresh bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-12px' }}>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--holo-border)',
            borderRadius: '8px', padding: '6px 14px',
            color: loading ? 'var(--holo-text-muted)' : 'var(--holo-green)',
            fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--holo-green-border)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--holo-border)' }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.3fr', gap: '20px' }}>
        
        {/* Left Column: 30-Day Revenue Summary Card (BTC Tracker layout) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--holo-orange-dim)', border: '1px solid var(--holo-orange-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(245,166,35,0.2)'
                }}>
                  <Coins size={18} color="var(--holo-orange)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--holo-text)' }}>30-Day Revenue</h3>
                  <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)' }}>Sales Ledger summary</p>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--holo-border)', fontSize: '11px', color: 'var(--holo-text-sub)' }}>
                Live
              </div>
            </div>
            
            <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--holo-text)', letterSpacing: '-0.02em', fontFamily: 'Space Grotesk, sans-serif' }}>
              ${(data?.total_all_time_revenue ?? total30DayRevenue).toLocaleString()}
            </p>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)', borderRadius: '10px', padding: '8px 12px', flex: 1, minWidth: '70px' }}>
                <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase' }}>Products</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--holo-text)', marginTop: '2px' }}>{data?.total_products || 0}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)', borderRadius: '10px', padding: '8px 12px', flex: 1, minWidth: '70px' }}>
                <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase' }}>Inventory</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--holo-text)', marginTop: '2px' }}>{data?.inventory_count || 0}</p>
              </div>
              <div style={{ background: 'var(--holo-green-dim)', border: '1px solid var(--holo-green-border)', borderRadius: '10px', padding: '8px 12px', flex: 1, minWidth: '70px' }}>
                <p style={{ fontSize: '10px', color: 'var(--holo-green)', textTransform: 'uppercase' }}>Suppliers</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--holo-green)', marginTop: '2px' }}>{data?.supplier_count || 0}</p>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--holo-border)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--holo-text-muted)' }}>30-Day Revenue</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--holo-text)' }}>${total30DayRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Center Column: Overview mini line chart (daily sales volume) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--holo-text)' }}>Sales Trend</h3>
              <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)' }}>Daily revenue volume index</p>
            </div>
            <div style={{ background: 'var(--holo-green-dim)', color: 'var(--holo-green)', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--holo-green-border)', fontWeight: 600 }}>
              {getRevenueChange()}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend.slice(-10)}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--holo-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--holo-green)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--holo-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" fill="url(#glowGrad)" stroke="var(--holo-green)" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="var(--holo-orange)" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--holo-text-muted)' }}>No sales history</div>
            )}
          </div>
        </div>

        {/* Right Column: Stock Alerts List (Replacing Pending POs) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px', padding: '16px 20px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--holo-text)' }}>Stock Alerts</span>
              <span className="badge badge-critical" style={{ fontSize: '9px', padding: '2px 8px' }}>
                {data?.recent_alerts?.length || 0} Alerts
              </span>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', maxHeight: '150px' }}>
              {(!data?.recent_alerts || data.recent_alerts.length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--holo-text-muted)', fontSize: '12px' }}>
                  <AlertTriangle size={20} style={{ marginBottom: '6px', opacity: 0.5 }} />
                  All products well-stocked
                </div>
              ) : (
                data.recent_alerts.map((a, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)'
                  }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--holo-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.product_name}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', marginTop: '1px' }}>
                        {a.warehouse_id} · Min: {a.reorder_threshold}
                      </p>
                    </div>
                    <span className="badge badge-critical" style={{ fontSize: '8px', padding: '2px 6px', flexShrink: 0 }}>
                      -{a.shortfall} Units
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--holo-border)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--holo-text-muted)' }}>Total active products: {data?.total_products || 0}</span>
            <Link to="/inventory" style={{ fontSize: '11px', color: 'var(--holo-green)', fontWeight: 600, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Manage Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Massive Interactive Chart Dashboard ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>General Statistics</h2>
            <p style={{ fontSize: '12px', color: 'var(--holo-text-sub)', marginTop: '2px' }}>Aggregate monthly revenue analysis and supply chain flow</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--holo-border)',
              borderRadius: '8px', padding: '6px 12px', color: 'var(--holo-text)', fontSize: '12px', outline: 'none'
            }}>
              <option value="2024">Year 2024</option>
              <option value="2023">Year 2023</option>
            </select>
            <select style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--holo-border)',
              borderRadius: '8px', padding: '6px 12px', color: 'var(--holo-text)', fontSize: '12px', outline: 'none'
            }}>
              <option value="All">All Categories</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 4fr', gap: '32px' }}>
          {/* Left indicator metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gross Revenue</p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
                ${total30DayRevenue.toLocaleString()}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--holo-green)', display: 'inline-block' }} />
                <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Average</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--holo-green)', fontFamily: 'Space Grotesk, sans-serif' }}>
                ${avgDailyRevenue.toLocaleString()}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--holo-blue)', display: 'inline-block' }} />
                <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Supply Chain Alert Rate</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
                {data?.total_products ? `${Math.round((data.low_stock_count / data.total_products) * 100)}%` : '0%'}
              </p>
            </div>
          </div>

          {/* Large Composed Chart */}
          <div style={{ flex: 1, minWidth: 0, height: '260px' }}>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--holo-blue)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--holo-blue)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--holo-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--holo-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Daily Revenue" fill="url(#barGlow)" radius={[8,8,0,0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="target" name="Target Boundary" stroke="var(--holo-green)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--holo-green)', strokeWidth: 0 }} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--holo-text-muted)' }}>
                No trend history recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Best Widget Performance & Source Tables ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Left Side: Best Performing Products (replacing Widgets) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>🏆 Best Product Performance</h2>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>See All</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1.3fr', gap: '8px', padding: '0 0 10px', borderBottom: '1px solid var(--holo-border)', marginBottom: '8px' }}>
            <span className="table-header">Product</span>
            <span className="table-header text-right">Revenue</span>
            <span className="table-header text-right">Margin</span>
            <span className="table-header text-right">Fulfillment</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(data?.top_products || []).slice(0, 4).map((p, idx) => {
              const conversion = 90 - idx * 6
              const color = idx === 0 ? 'var(--holo-green)' : idx === 1 ? 'var(--holo-blue)' : idx === 2 ? 'var(--holo-orange)' : 'var(--holo-pink)'
              return (
                <div key={p.product_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1.3fr', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--holo-text-muted)', flexShrink: 0 }}>#{idx + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--holo-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</p>
                      <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)' }}>{p.category}</p>
                    </div>
                  </div>
                  <span className="text-right font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--holo-text-sub)' }}>${p.total_revenue.toLocaleString()}</span>
                  <span className="text-right font-mono" style={{ fontSize: '12px', color: 'var(--holo-green)' }}>{(p.margin_pct ?? 35).toFixed(0)}%</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', minWidth: '40px' }}>
                        <div style={{ width: `${conversion}%`, height: '100%', background: color }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: color }}>{conversion}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data?.top_products?.length) && (
              <p style={{ color: 'var(--holo-text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No product history</p>
            )}
          </div>
        </div>

        {/* Right Side: Pending Purchase Orders (Replacing Stock Alerts) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--holo-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
              <ShoppingCart size={15} style={{ display: 'inline', color: 'var(--holo-green)', marginRight: '6px', verticalAlign: 'middle' }} />
              Pending Purchase Orders
            </h2>
            <span className="badge badge-received" style={{ fontSize: '9px', padding: '2px 8px' }}>
              {pendingPOs.length} Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2.2fr', gap: '8px', padding: '0 0 10px', borderBottom: '1px solid var(--holo-border)', marginBottom: '8px' }}>
            <span className="table-header">Product</span>
            <span className="table-header text-right">Quantity</span>
            <span className="table-header text-center">Status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pendingPOs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '28px', marginBottom: '8px' }}>📦</p>
                <p style={{ color: 'var(--holo-text-sub)', fontSize: '13px' }}>No active pending orders</p>
              </div>
            )}
            {pendingPOs.slice(0, 4).map((po, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2.2fr', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--holo-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {po.product_name || po.product?.name || 'Unknown'}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)' }}>{po.supplier_name || '—'}</p>
                </div>
                <span className="text-right font-mono" style={{ fontSize: '12px', color: 'var(--holo-text-sub)' }}>{po.quantity?.toLocaleString()}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className={po.status === 'draft' ? "badge badge-draft" : "badge badge-sent"} style={{ fontSize: '9px', padding: '2px 8px' }}>
                    {po.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
      
    </div>
  )
}
