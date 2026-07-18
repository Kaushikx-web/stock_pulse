import { useEffect, useState } from 'react'
import { getInventory, getProducts } from '../api/client'
import StatCard from '../components/StatCard'
import { Boxes, PackageOpen, AlertTriangle, RefreshCw, Search } from 'lucide-react'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, prodRes] = await Promise.all([
        getInventory(),
        getProducts()
      ])
      setInventory(invRes.data)
      setProducts(prodRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Merge inventory with products
  const mergedData = inventory.map(inv => {
    const prod = products.find(p => p.id === inv.product_id)
    return {
      ...inv,
      product_name: prod ? prod.name : 'Unknown',
      category: prod ? prod.category : 'Unknown',
      unit_cost: prod ? prod.unit_cost : 0,
      unit_price: prod ? prod.unit_price : 0,
    }
  }).filter(item => item.product_name.toLowerCase().includes(search.toLowerCase()))

  const totalItems = mergedData.reduce((acc, curr) => acc + curr.current_stock, 0)
  const lowStockCount = mergedData.filter(i => i.current_stock < i.reorder_threshold).length
  const totalValue = mergedData.reduce((acc, curr) => acc + (curr.current_stock * curr.unit_cost), 0)

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Boxes size={22} style={{ color: 'var(--holo-green)' }} /> Inventory Manager
          </h1>
          <p className="page-subtitle">Holographic real-time ledger of materials and products</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Ledger
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Units in Stock" value={totalItems.toLocaleString()} sub="Across all warehouses" icon={PackageOpen} color="blue" />
        <StatCard title="Low Stock Items" value={lowStockCount} sub="Below reorder threshold" icon={AlertTriangle} color="red" />
        <StatCard title="Total Inventory Value" value={`$${totalValue.toLocaleString()}`} sub="At cost value" icon={Boxes} color="lime" />
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--holo-text-muted)' }} />
          <input
            type="text"
            placeholder="Filter database..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-sm w-full pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--holo-border)' }}>
                <th className="table-header py-3 px-4">Product Name</th>
                <th className="table-header py-3 px-4">Category</th>
                <th className="table-header py-3 px-4 font-mono">Location</th>
                <th className="table-header py-3 px-4 text-right">In Stock</th>
                <th className="table-header py-3 px-4 text-right">Reorder Pt.</th>
                <th className="table-header py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm" style={{ color: 'var(--holo-text-muted)' }}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
                      Connecting...
                    </div>
                  </td>
                </tr>
              ) : mergedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm" style={{ color: 'var(--holo-text-muted)' }}>No items matching index query</td>
                </tr>
              ) : (
                mergedData.map(item => {
                  const isLow = item.current_stock < item.reorder_threshold
                  return (
                    <tr key={item.id} className="transition-colors" style={{ borderBottom: '1px solid var(--holo-border)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td className="table-cell font-semibold" style={{ color: 'var(--holo-text)' }}>{item.product_name}</td>
                      <td className="table-cell">
                        <span className="badge badge-normal" style={{ fontSize: '10px' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="table-cell font-mono" style={{ color: 'var(--holo-text-sub)' }}>{item.warehouse_id}</td>
                      <td className="table-cell text-right font-mono font-bold" style={{ color: isLow ? 'var(--holo-pink)' : 'var(--holo-text)' }}>{item.current_stock.toLocaleString()}</td>
                      <td className="table-cell text-right font-mono" style={{ color: 'var(--holo-text-muted)' }}>{item.reorder_threshold.toLocaleString()}</td>
                      <td className="table-cell text-center">
                        {isLow ? (
                          <span className="badge badge-critical">Low Stock</span>
                        ) : (
                          <span className="badge badge-received">Optimal</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
