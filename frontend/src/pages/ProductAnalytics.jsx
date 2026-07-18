import { useEffect, useState } from 'react'
import { getPnL } from '../api/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw,
  ChevronDown, ChevronUp, Loader2, Trophy, AlertOctagon
} from 'lucide-react'

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
          {p.name}: ${Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

function ProfitLossBadge({ profit }) {
  if (profit >= 0) {
    return (
      <span className="badge badge-received" style={{ fontSize: '9px', padding: '2px 8px' }}>
        ▲ PROFIT
      </span>
    )
  }
  return (
    <span className="badge badge-critical" style={{ fontSize: '9px', padding: '2px 8px' }}>
      ▼ LOSS
    </span>
  )
}

function ProductPLCard({ p, rank }) {
  const [expanded, setExpanded] = useState(false)
  const isProfit = p.profit >= 0
  const marginColor = p.margin_pct > 30
    ? 'var(--holo-green)'
    : p.margin_pct > 10
    ? 'var(--holo-orange)'
    : 'var(--holo-pink)'

  return (
    <div className="card mb-4 transition-all duration-200"
         style={{ borderColor: expanded ? 'var(--holo-green-border)' : 'var(--holo-border)' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {rank && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg font-mono"
                style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--holo-text-muted)', border: '1px solid var(--holo-border)' }}>
                #{rank}
              </span>
            )}
            <h3 className="font-semibold truncate" style={{ color: 'var(--holo-text)' }}>{p.product_name}</h3>
            <span className="badge badge-normal" style={{ fontSize: '10px' }}>
              {p.category}
            </span>
            {/* PROFIT / LOSS TAG */}
            <ProfitLossBadge profit={p.profit} />
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <p className="text-[10px]" style={{ color: 'var(--holo-text-muted)' }}>Revenue</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>${p.total_revenue.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px]" style={{ color: 'var(--holo-text-muted)' }}>Cost</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--holo-text)' }}>${p.total_cost.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px]" style={{ color: 'var(--holo-text-muted)' }}>Net Profit</p>
              <p className="text-sm font-bold" style={{ color: isProfit ? 'var(--holo-green)' : 'var(--holo-pink)' }}>
                {isProfit ? '+' : ''}${p.profit.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px]" style={{ color: 'var(--holo-text-muted)' }}>Margin</p>
              <p className="text-sm font-bold" style={{ color: marginColor }}>{p.margin_pct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isProfit
            ? <TrendingUp size={18} style={{ color: 'var(--holo-green)' }} />
            : <TrendingDown size={18} style={{ color: 'var(--holo-pink)' }} />
          }
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-secondary py-1 px-2 text-xs"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* AI Insight */}
      {p.ai_insight && (
        <div className="mt-3 pl-3" style={{ borderLeft: '2px solid var(--holo-green-border)' }}>
          <p className="text-xs italic" style={{ color: 'var(--holo-text-sub)' }}>{p.ai_insight}</p>
        </div>
      )}

      {/* Expanded: trend chart */}
      {expanded && p.trend?.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--holo-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--holo-text-muted)' }}>
            Monthly Revenue vs Cost
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={p.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--holo-text-muted)', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--holo-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--holo-text-sub)' }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="revenue" name="Revenue"
                    stroke="var(--holo-blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--holo-blue)' }} />
              <Line type="monotone" dataKey="cost" name="Cost"
                    stroke="var(--holo-pink)" strokeWidth={2} dot={{ r: 3, fill: 'var(--holo-pink)' }} />
              <Line type="monotone" dataKey="profit" name="Profit"
                    stroke="var(--holo-green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--holo-green)' }}
                    strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function ProductAnalytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('profit')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPnL()
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const allProducts = data?.products || []

  const products = allProducts
    .filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'profit')  return b.profit - a.profit
      if (sortBy === 'margin')  return b.margin_pct - a.margin_pct
      if (sortBy === 'revenue') return b.total_revenue - a.total_revenue
      return 0
    })

  // Top 3 & Bottom 3 by profit
  const sorted       = [...allProducts].sort((a, b) => b.profit - a.profit)
  const topPerformers  = sorted.slice(0, 3)
  const worstPerformers = sorted.slice(-3).reverse()

  const totals = allProducts.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.total_revenue,
      cost:    acc.cost    + p.total_cost,
      profit:  acc.profit  + p.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 }
  )

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={22} style={{ color: 'var(--holo-green)' }} /> Product Analytics Ledger
          </h1>
          <p className="page-subtitle">Per-product P&amp;L analysis &amp; AI financial recommendation engine</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh Calculations
        </button>
      </div>

      {/* Portfolio Totals */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: totals.revenue, color: 'var(--holo-blue)'  },
            { label: 'Total Cost',    value: totals.cost,    color: 'var(--holo-pink)'   },
            { label: 'Total Profit',  value: totals.profit,  color: totals.profit >= 0 ? 'var(--holo-green)' : 'var(--holo-pink)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--holo-text-muted)' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>
                {value < 0 ? '-' : ''}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {label === 'Total Profit' && (
                <span className="badge mt-2 text-[10px]"
                  style={{
                    background: totals.profit >= 0 ? 'var(--holo-green-dim)' : 'var(--holo-pink-dim)',
                    color: totals.profit >= 0 ? 'var(--holo-green)' : 'var(--holo-pink)',
                    border: `1px solid ${totals.profit >= 0 ? 'var(--holo-green-border)' : 'var(--holo-pink-border)'}`,
                  }}>
                  {totals.profit >= 0 ? '▲ TOTAL PROFIT' : '▼ TOTAL LOSS'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Top & Worst Performers ── */}
      {!loading && allProducts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performers */}
          <div className="card" style={{ border: '1px solid var(--holo-green-border)' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--holo-text)' }}>
              <Trophy size={15} style={{ color: 'var(--holo-orange)' }} /> Top Performing Products
            </h2>
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <div key={p.product_id}
                     className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors"
                     style={{ background: 'var(--holo-green-dim)', border: '1px solid var(--holo-green-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--holo-text)' }}>
                      <span className="text-xs mr-1.5" style={{ color: 'var(--holo-text-muted)' }}>#{i + 1}</span>
                      {p.product_name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--holo-text-muted)' }}>{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--holo-green)' }}>
                      +${p.profit.toLocaleString()}
                    </p>
                    <span className="badge text-[9px]"
                      style={{ background: 'var(--holo-green-dim)', color: 'var(--holo-green)', border: '1px solid var(--holo-green-border)' }}>
                      ▲ PROFIT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performers */}
          <div className="card" style={{ border: '1px solid var(--holo-pink-border)' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--holo-text)' }}>
              <AlertOctagon size={15} style={{ color: 'var(--holo-pink)' }} /> Worst Performing Products
            </h2>
            <div className="space-y-2">
              {worstPerformers.map((p, i) => (
                <div key={p.product_id}
                     className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors"
                     style={{ background: 'var(--holo-pink-dim)', border: '1px solid var(--holo-pink-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--holo-text)' }}>{p.product_name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--holo-text-muted)' }}>{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: p.profit < 0 ? 'var(--holo-pink)' : 'var(--holo-green)' }}>
                      {p.profit >= 0 ? '+' : ''}${p.profit.toLocaleString()}
                    </p>
                    <span className="badge text-[9px]"
                      style={{
                        background: p.profit < 0 ? 'var(--holo-pink-dim)' : 'var(--holo-green-dim)',
                        color: p.profit < 0 ? 'var(--holo-pink)' : 'var(--holo-green)',
                        border: `1px solid ${p.profit < 0 ? 'var(--holo-pink-border)' : 'var(--holo-green-border)'}`,
                      }}>
                      {p.profit < 0 ? '▼ LOSS' : '▲ PROFIT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── All Products ── */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Filter ledger database..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm flex-1 min-w-48"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="input text-sm"
          style={{ width: 'auto', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--holo-text)' }}
        >
          <option value="profit" style={{ background: '#0e1118' }}>Sort: Net Profit</option>
          <option value="margin" style={{ background: '#0e1118' }}>Sort: Margin %</option>
          <option value="revenue" style={{ background: '#0e1118' }}>Sort: Gross Revenue</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <BarChart3 size={40} className="mx-auto mb-4" style={{ color: 'var(--holo-text-muted)' }} />
          <p style={{ color: 'var(--holo-text-sub)' }}>No products registered in ledger</p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-3" style={{ color: 'var(--holo-text-muted)' }}>
            {products.length} products · {products.filter(p => p.profit >= 0).length} profitable · {products.filter(p => p.profit < 0).length} operating at loss
          </p>
          {products.map((p, i) => (
            <ProductPLCard key={p.product_id} p={p} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
