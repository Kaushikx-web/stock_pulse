import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import POQueue from './pages/POQueue'
import ManufacturingPriority from './pages/ManufacturingPriority'
import ProductAnalytics from './pages/ProductAnalytics'
import Inventory from './pages/Inventory'
import ERPCore from './pages/ERPCore'
import SettingsPage from './pages/Settings'
import Login from './pages/Login'

function AppContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--holo-bg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient background glow orbs */}
        <div className="glow-orb-green" style={{ top: '10%', left: '15%' }} />
        <div className="glow-orb-blue" style={{ bottom: '15%', right: '10%' }} />
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*"     element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--holo-bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient background glow orbs */}
      <div className="glow-orb-green" style={{ top: '10%', left: '15%' }} />
      <div className="glow-orb-blue" style={{ bottom: '15%', right: '10%' }} />
      
      <Navbar />
      
      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        <Header />
        <main style={{
          flex: 1,
          marginTop: '72px',
          padding: '28px',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/erp-core"  element={<ERPCore />} />
            <Route path="/upload"    element={<Upload />} />
            <Route path="/po-queue"  element={<POQueue />} />
            <Route path="/priority"  element={<ManufacturingPriority />} />
            <Route path="/analytics" element={<ProductAnalytics />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
