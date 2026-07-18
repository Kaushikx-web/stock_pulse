import { useEffect, useState } from 'react'
import { getRegisteredUsers } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Settings, Users, Calendar, ShieldAlert, Key, Loader2, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [registeredUsers, setRegisteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { user, token } = useAuth()

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getRegisteredUsers()
      setRegisteredUsers(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch user directory. Make sure the database users table exists.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings size={22} style={{ color: 'var(--holo-green)' }} /> System Settings
          </h1>
          <p className="page-subtitle">Configure system options, view session parameters, and inspect registered User IDs</p>
        </div>
        <button onClick={loadUsers} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh Database
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px' }}>
        
        {/* Left Side: Current User Session Details */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--holo-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="var(--holo-green)" /> Session Key details
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active User ID</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--holo-green)', marginTop: '2px' }}>{user?.username || '—'}</p>
            </div>
            
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Registered Email</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--holo-text)', marginTop: '2px' }}>{user?.email || '—'}</p>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--holo-border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--holo-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>API Auth Session Token</p>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--holo-text-sub)', marginTop: '4px', wordBreak: 'break-all' }}>
                Bearer {token ? `${token.slice(0, 15)}...` : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Registered User IDs Directory */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--holo-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--holo-green)" /> Registered User Directory
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--holo-text-muted)', marginBottom: '16px' }}>
            Table of User IDs entered by registered users on this StockPulse node.
          </p>

          {error && (
            <div style={{
              display: 'flex', gap: '8px', background: 'var(--holo-pink-dim)', border: '1px solid var(--holo-pink-border)',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: 'var(--holo-pink)'
            }}>
              <ShieldAlert size={14} style={{ shrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--holo-border)' }}>
                  <th className="table-header py-2 px-3">User ID (Entered Username)</th>
                  <th className="table-header py-2 px-3">Associated Email</th>
                  <th className="table-header py-2 px-3 text-right">Registration Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center" style={{ color: 'var(--holo-text-muted)' }}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" color="var(--holo-green)" />
                        Querying database directory...
                      </div>
                    </td>
                  </tr>
                ) : registeredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center" style={{ color: 'var(--holo-text-muted)' }}>
                      No registered user IDs found.
                    </td>
                  </tr>
                ) : (
                  registeredUsers.map((u, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--holo-border)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td className="table-cell font-semibold" style={{ color: 'var(--holo-green)' }}>{u.username}</td>
                      <td className="table-cell" style={{ color: 'var(--holo-text-sub)' }}>{u.email}</td>
                      <td className="table-cell text-right font-mono" style={{ color: 'var(--holo-text-muted)', fontSize: '11px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <Calendar size={11} /> {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  )
}
