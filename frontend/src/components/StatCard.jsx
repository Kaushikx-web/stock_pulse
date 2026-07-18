export default function StatCard({ title, value, sub, icon: Icon, color = 'primary', trend }) {
  const palette = {
    primary: { bg: 'var(--primary-dim)',  border: 'var(--primary-border)', accent: 'var(--primary)'  },
    blue:    { bg: 'var(--primary-dim)',  border: 'var(--primary-border)', accent: 'var(--primary)'  },
    brand:   { bg: 'var(--primary-dim)',  border: 'var(--primary-border)', accent: 'var(--primary)'  },
    green:   { bg: 'var(--success-dim)',  border: 'rgba(16,185,129,0.25)', accent: 'var(--success)'  },
    emerald: { bg: 'var(--success-dim)',  border: 'rgba(16,185,129,0.25)', accent: 'var(--success)'  },
    red:     { bg: 'var(--danger-dim)',   border: 'rgba(239,68,68,0.25)',  accent: 'var(--danger)'   },
    pink:    { bg: 'var(--danger-dim)',   border: 'rgba(239,68,68,0.25)',  accent: 'var(--danger)'   },
    amber:   { bg: 'var(--warning-dim)',  border: 'rgba(245,158,11,0.25)', accent: 'var(--warning)'  },
    cyan:    { bg: 'var(--cyan-dim)',     border: 'rgba(6,182,212,0.25)',  accent: 'var(--cyan)'     },
  }
  const c = palette[color] || palette.primary

  return (
    <div className="stat-card" style={{ borderColor: c.border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            {title}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>{sub}</p>
          )}
          {trend !== undefined && (
            <p style={{ fontSize: '12px', marginTop: '8px', fontWeight: 600, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: '12px', flexShrink: 0,
          }}>
            <Icon size={20} color={c.accent} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
