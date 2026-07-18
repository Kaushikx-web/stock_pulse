import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser, registerUser } from '../api/client'
import {
  ShieldCheck, Mail, Lock, User, Loader2,
  AlertCircle, Copy, Check, Database, ChevronDown, ChevronUp
} from 'lucide-react'

const SQL_SETUP = `-- Run this in Supabase SQL Editor → New Query → Run

CREATE TABLE IF NOT EXISTS public.users (
    id           SERIAL PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id);
ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id);
ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id);
ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id);`

function InputField({ label, icon: Icon, type = 'text', placeholder, value, onChange, required }) {
  return (
    <div>
      <label style={{
        fontSize: '10px', color: 'var(--holo-text-muted)', display: 'block',
        marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={13} color="var(--holo-text-muted)" style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none'
        }} />
        <input
          required={required}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{
            width: '100%',
            padding: '10px 12px 10px 34px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--holo-border)',
            borderRadius: '8px',
            color: 'var(--holo-text)',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
            fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--holo-green-border)'}
          onBlur={e => e.target.style.borderColor = 'var(--holo-border)'}
        />
      </div>
    </div>
  )
}

function SetupGuide() {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SETUP)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{
      border: '1px solid rgba(197,241,53,0.25)',
      background: 'rgba(197,241,53,0.04)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--holo-green)',
        }}
      >
        <Database size={14} color="var(--holo-green)" />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '12px', fontWeight: 700 }}>
          One-time database setup required
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          <p style={{ fontSize: '11px', color: 'var(--holo-text-sub)', lineHeight: 1.5, marginBottom: '10px' }}>
            The <code style={{ color: 'var(--holo-green)', background: 'rgba(197,241,53,0.1)', padding: '1px 4px', borderRadius: '3px' }}>users</code> table is missing in your Supabase project.
            Copy this SQL, open your <strong style={{ color: 'var(--holo-text)' }}>Supabase Dashboard → SQL Editor → New Query</strong>, paste it, and click <strong style={{ color: 'var(--holo-text)' }}>Run</strong>.
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0,
              padding: '12px 40px 12px 12px',
              fontSize: '10px',
              lineHeight: 1.6,
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              border: '1px solid var(--holo-border)',
              overflowX: 'auto',
              maxHeight: '140px',
              whiteSpace: 'pre',
            }}>
              {SQL_SETUP}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                background: copied ? 'rgba(197,241,53,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${copied ? 'var(--holo-green-border)' : 'var(--holo-border)'}`,
                borderRadius: '6px', cursor: 'pointer',
                color: copied ? 'var(--holo-green)' : 'var(--holo-text-muted)',
                padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy SQL</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSetup, setShowSetup] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShowSetup(false)

    try {
      if (isRegister) {
        await registerUser({ username, email, password })
        const logRes = await loginUser({ username_or_email: username, password })
        login(logRes.data.user, logRes.data.token)
        navigate('/')
      } else {
        const logRes = await loginUser({ username_or_email: email, password })
        login(logRes.data.user, logRes.data.token)
        navigate('/')
      }
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      const status = err.response?.status

      if (status === 503 || detail.toLowerCase().includes("users' table")) {
        setShowSetup(true)
        setError(null)
      } else if (!detail && !err.response) {
        setError('Cannot reach the backend server. Make sure it is running on port 8000.')
      } else {
        setError(detail || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (toRegister) => {
    setIsRegister(toRegister)
    setError(null)
    setShowSetup(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{
        background: 'var(--holo-glass)',
        border: '1px solid var(--holo-border)',
        borderRadius: '18px',
        padding: '30px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'var(--holo-green-dim)', border: '1px solid var(--holo-green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 0 20px rgba(197,241,53,0.35)'
          }}>
            <ShieldCheck size={22} color="var(--holo-green)" />
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: '21px', fontWeight: 800,
            color: 'var(--holo-text)', margin: 0, letterSpacing: '-0.01em'
          }}>
            StockPulse
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--holo-text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>
            Holographic supply chain credential gate
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--holo-border)',
          borderRadius: '10px', padding: '4px', marginBottom: '22px'
        }}>
          {['Sign In', 'Create Account'].map((label, i) => {
            const active = i === 1 ? isRegister : !isRegister
            return (
              <button
                key={label}
                type="button"
                onClick={() => switchTab(i === 1)}
                style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: '7px',
                  fontSize: '12px', fontWeight: 700,
                  background: active ? 'var(--holo-glass-active)' : 'transparent',
                  color: active ? 'var(--holo-green)' : 'var(--holo-text-muted)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: active ? '0 0 12px rgba(197,241,53,0.1)' : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Database setup guide */}
        {showSetup && <SetupGuide />}

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
          }}>
            <AlertCircle size={13} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#EF4444', lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {isRegister && (
            <InputField
              label="User ID / Username"
              icon={User}
              type="text"
              placeholder="e.g. diya_01"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          )}

          <InputField
            label={isRegister ? 'Email Address' : 'User ID or Email'}
            icon={Mail}
            type={isRegister ? 'email' : 'text'}
            placeholder={isRegister ? 'diya@gmail.com' : 'diya_01 or diya@gmail.com'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <InputField
            label="Password"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(197,241,53,0.4)' : 'var(--holo-green)',
              border: 'none', borderRadius: '10px',
              color: '#0d1117', fontSize: '13px', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: loading ? 'none' : '0 0 20px rgba(197,241,53,0.25)',
              transition: 'all 0.2s', marginTop: '4px',
            }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Verifying…</>
              : isRegister ? 'Register Credentials' : 'Access System'
            }
          </button>

        </form>

      </div>
    </div>
  )
}
