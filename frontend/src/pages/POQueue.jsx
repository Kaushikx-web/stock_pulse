import { useEffect, useState } from 'react'
import { getPOs, draftAutoPOs, getProducts, draftManualPO } from '../api/client'
import POCard from '../components/POCard'
import { ShoppingCart, RefreshCw, Plus, Loader2 } from 'lucide-react'

const STATUS_FILTERS = ['all', 'draft', 'sent', 'received', 'manufacturing', 'complete', 'cancelled']

export default function POQueue() {
  const [pos, setPos] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [drafting, setDrafting] = useState(false)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [manualDrafting, setManualDrafting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPOs(filter === 'all' ? null : filter)
      setPos(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await getProducts()
      setProducts(res.data)
    } catch (e) {}
  }

  useEffect(() => { load(); loadProducts() }, [filter])

  const handleAutoDraft = async () => {
    setDrafting(true)
    try {
      await draftAutoPOs()
      setFilter('draft')
    } catch (e) {
      console.error(e)
    } finally {
      setDrafting(false)
    }
  }

  const handleManualDraft = async () => {
    if (!selectedProduct) return
    setManualDrafting(true)
    try {
      await draftManualPO(selectedProduct)
      setFilter('draft')
      setSelectedProduct('')
    } catch (e) {
      console.error(e)
    } finally {
      setManualDrafting(false)
    }
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart size={22} style={{ color: 'var(--holo-green)' }} /> PO Queue
          </h1>
          <p className="page-subtitle">
            Draft, authorize, and track purchase orders across operations
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={handleAutoDraft}
            disabled={drafting}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {drafting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Auto-Draft Low Stock
          </button>
        </div>
      </div>

      {/* Manual Draft Module */}
      <div className="card mb-5 flex items-center gap-3 flex-wrap">
        <p className="text-sm font-semibold" style={{ color: 'var(--holo-text-sub)' }}>Manual PO Generator:</p>
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
          className="input text-sm flex-1 min-w-48"
          style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--holo-text)', border: '1px solid var(--holo-border)' }}
        >
          <option value="" style={{ background: '#0e1118' }}>Select target product…</option>
          {products.map(p => (
            <option key={p.id} value={p.id} style={{ background: '#0e1118' }}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleManualDraft}
          disabled={!selectedProduct || manualDrafting}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {manualDrafting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create Draft
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={filter === s
              ? { background: 'var(--holo-green-dim)', color: 'var(--holo-green)', border: '1px solid var(--holo-green-border)' }
              : { background: 'rgba(255, 255, 255, 0.02)', color: 'var(--holo-text-sub)', border: '1px solid var(--holo-border)' }
            }
          >
            {s === 'all' ? 'All Queue' : s}
          </button>
        ))}
      </div>

      {/* PO List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--holo-green)', borderTopColor: 'transparent' }} />
        </div>
      ) : pos.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingCart size={40} className="mx-auto mb-4" style={{ color: 'var(--holo-text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--holo-text-sub)' }}>No purchase orders found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--holo-text-muted)' }}>
            Trigger "Auto-Draft Low Stock" to execute automated PO generation.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-3" style={{ color: 'var(--holo-text-muted)' }}>{pos.length} order(s) registered in ledger</p>
          {pos.map(po => (
            <POCard
              key={po.id}
              po={po}
              onUpdate={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
