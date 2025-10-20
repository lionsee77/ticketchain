'use client'

import { useState, useEffect } from 'react'

interface User {
  username: string
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuthState = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token) {
      setIsAuthenticated(true)
      if (userData) {
        try {
          setUser(JSON.parse(userData))
        } catch (e) {
          setUser(null)
        }
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Check initial auth state
    checkAuthState()

    // Listen for auth state changes
    const handleAuthChange = () => {
      checkAuthState()
    }

    // Listen for storage changes (when auth state changes in other tabs/components)
    window.addEventListener('storage', handleAuthChange)
    
    // Listen for custom auth events
    window.addEventListener('authStateChanged', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleAuthChange)
      window.removeEventListener('authStateChanged', handleAuthChange)
    }
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setIsAuthenticated(true)
    setUser(userData)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged'))
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged'))
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    checkAuthState,
  }
}