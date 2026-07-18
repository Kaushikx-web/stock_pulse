import { useLocation } from 'react-router-dom'
import { Bell, Search, Download } from 'lucide-react'

const PAGE_META = {
  '/':          { title: 'Dashboard',          sub: 'Holographic system overview & real-time analytics overlay.' },
  '/inventory': { title: 'Inventory',           sub: 'Stock status, material levels & tracking modules.' },
  '/erp-core':  { title: 'ERP Core',            sub: 'Central operation metrics, supplier reliability & infrastructure status.' },
  '/po-queue':  { title: 'Purchase Orders',     sub: 'Draft, authorize, and sync supply chain POs.' },
  '/priority':  { title: 'Manufacturing Priority', sub: 'Calculated urgency score queue with AI explanations.' },
  '/analytics': { title: 'Analytics',           sub: 'Profitability review, P&L breakdown & AI insights.' },
  '/upload':    { title: 'Upload Data',         sub: 'Upload spreadsheet logs with automatic header mapping.' },
  '/settings':  { title: 'System Settings',     sub: 'Configure database nodes, session credentials, and user indexes.' },
}

export default function Header() {
  const location = useLocation()
  const meta = PAGE_META[location.pathname] || PAGE_META['/']

  return (
    <header style={{
      height: '72px',
      background: 'rgba(13, 16, 23, 0.35)',
      borderBottom: '1px solid var(--holo-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: '20px',
      position: 'fixed',
      top: 0, right: 0,
      left: '240px',
      zIndex: 30,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--holo-text)', lineHeight: 1.2, letterSpacing: '-0.01em', fontFamily: "'Space Grotesk', sans-serif" }}>
          {meta.title}
        </h1>
        <p style={{ fontSize: '11px', color: 'var(--holo-text-sub)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meta.sub}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: '220px' }}>
        <Search size={13} color="var(--holo-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          placeholder="Search system..."
          style={{
            width: '100%', padding: '8px 12px 8px 36px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--holo-border)',
            borderRadius: '10px', fontSize: '12px', color: 'var(--holo-text)',
            outline: 'none', fontFamily: 'Inter, sans-serif',
            transition: 'all 0.25s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--holo-green-border)'; e.target.style.boxShadow = '0 0 10px rgba(197, 241, 53, 0.15)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--holo-border)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Notification Bell */}
      <button style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--holo-green-border)'; e.currentTarget.style.background = 'rgba(197,241,53,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--holo-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      >
        <Bell size={15} color="var(--holo-text-sub)" />
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--holo-green)', boxShadow: '0 0 8px var(--holo-green)',
        }} />
      </button>

      {/* Export Button */}
      <button style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '10px',
        background: 'var(--holo-green)', color: '#080a0f',
        border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
        boxShadow: '0 0 15px rgba(197,241,53,0.25)',
        transition: 'all 0.2s',
        fontFamily: 'Space Grotesk, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 25px rgba(197,241,53,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 15px rgba(197,241,53,0.25)'; }}
      >
        <Download size={13} strokeWidth={2.5} />
        <span>Export</span>
      </button>
    </header>
  )
}
