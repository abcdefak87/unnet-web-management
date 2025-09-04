import { useEffect } from 'react'
import { useRouter } from '../lib/router'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'superadmin' | 'admin' | 'gudang' | 'user'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Prevent redirect if already on login page
        if (router.pathname !== '/login') {
          // Use replace to avoid adding to history
          router.replace('/login')
        }
        return
      }
      
      if (requiredRole && user.role !== requiredRole && user.role !== 'superadmin') {
        // Only redirect if not already on dashboard to prevent circular redirects
        if (router.pathname !== '/dashboard') {
          router.replace('/dashboard')
        }
        return
      }
    }
  }, [user, loading, router, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Ditolak</h1>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

