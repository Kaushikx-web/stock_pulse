import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Boxes, Network, ShoppingCart,
  ListOrdered, BarChart3, Upload, Settings, ShieldAlert, LogOut
} from 'lucide-react'

const sections = [
  {
    label: null,
    links: [
      { to: '/',          icon: LayoutDashboard, label: 'Dashboard'    },
      { to: '/inventory', icon: Boxes,           label: 'Inventory'    },
      { to: '/erp-core',  icon: Network,         label: 'ERP Core'     },
    ],
  },
  {
    label: 'Operations',
    links: [
      { to: '/po-queue',  icon: ShoppingCart,    label: 'PO Queue'     },
      { to: '/priority',  icon: ListOrdered,     label: 'Mfg Priority' },
    ],
  },
  {
    label: 'Insights',
    links: [
      { to: '/analytics', icon: BarChart3,       label: 'Analytics'    },
      { to: '/upload',    icon: Upload,          label: 'Upload Data'  },
    ],
  },
]

export default function Navbar() {
  const { user, logout } = useAuth()

  const getInitials = (name) => {
    if (!name) return 'SP'
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--holo-glass)',
      borderRight: '1px solid var(--holo-border)',
      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 4px 0 24px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, bottom: 0, left: 0,
      zIndex: 40,
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
    }}>
      {/* Logo: "StockPulse" at the top in green */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--holo-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--holo-green-dim)', border: '1px solid var(--holo-green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(197,241,53,0.3)',
          }}>
            <ShieldAlert size={16} color="var(--holo-green)" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--holo-green)',
              textShadow: '0 0 10px rgba(197,241,53,0.4)',
              lineHeight: 1.1,
              letterSpacing: '0.02em'
            }}>
              StockPulse
            </p>
            <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', marginTop: '2px', letterSpacing: '0.04em' }}>
              AI SUPPLY CHAIN
            </p>
          </div>
        </div>
      </div>

      {/* Nav links using clean thin font */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '14px' }}>
            {section.label && (
              <p style={{
                fontSize: '9px', fontWeight: 600, color: 'var(--holo-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                padding: '0 12px 6px',
              }}>
                {section.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '10px',
                    textDecoration: 'none', fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--holo-green)' : 'var(--holo-text-sub)',
                    background: isActive ? 'var(--holo-glass-active)' : 'transparent',
                    border: isActive ? '1px solid rgba(197, 241, 53, 0.2)' : '1px solid transparent',
                    boxShadow: isActive ? '0 0 15px rgba(197, 241, 53, 0.08)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  })}
                  className={({ isActive }) => !isActive ? 'nav-inactive' : ''}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={15}
                        color={isActive ? 'var(--holo-green)' : 'var(--holo-text-muted)'}
                        strokeWidth={isActive ? 2.2 : 1.5}
                      />
                      <span style={{ letterSpacing: '0.01em' }}>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--holo-border)' }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '10px',
            textDecoration: 'none', fontSize: '13px',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--holo-green)' : 'var(--holo-text-sub)',
            background: isActive ? 'var(--holo-glass-active)' : 'transparent',
            border: isActive ? '1px solid rgba(197, 241, 53, 0.2)' : '1px solid transparent',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          })}
          className={({ isActive }) => !isActive ? 'nav-inactive' : ''}
        >
          {({ isActive }) => (
            <>
              <Settings size={15} color={isActive ? 'var(--holo-green)' : 'var(--holo-text-muted)'} strokeWidth={isActive ? 2.2 : 1.5} />
              <span>System Settings</span>
            </>
          )}
        </NavLink>

        {/* User profile details at bottom */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px', borderRadius: '12px', marginTop: '8px',
            background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--holo-border)',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--holo-green), var(--holo-blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#080a0f', flexShrink: 0,
              boxShadow: '0 0 10px rgba(197, 241, 53, 0.25)',
            }}>
              {getInitials(user.username)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--holo-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', marginTop: '1px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
            <LogOut
              size={13}
              color="var(--holo-text-muted)"
              style={{ cursor: 'pointer' }}
              onClick={logout}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--holo-pink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--holo-text-muted)'}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
