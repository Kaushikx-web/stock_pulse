import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('stockpulse_token') || null)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stockpulse_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (userData, sessionToken) => {
    localStorage.setItem('stockpulse_token', sessionToken)
    localStorage.setItem('stockpulse_user', JSON.stringify(userData))
    setToken(sessionToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('stockpulse_token')
    localStorage.removeItem('stockpulse_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    return { token: null, user: null, login: () => {}, logout: () => {}, isAuthenticated: false }
  }
  return context
}
