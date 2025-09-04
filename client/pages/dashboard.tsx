import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import websocketService from '../lib/websocket'
import { 
  Users, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Wifi,
  Server,
  DollarSign,
  Package,
  Briefcase
} from 'lucide-react'

// Loading skeleton component
const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="mt-4">
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
)

// Error fallback component
const ErrorFallback = ({ error, resetError }: { error: Error, resetError: () => void }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-red-800 mb-2">Terjadi Kesalahan</h3>
    <p className="text-red-600 mb-4">{error?.message || 'Gagal memuat data'}</p>
    <button 
      onClick={resetError}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      Coba Lagi
    </button>
  </div>
)

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const resetError = () => {
    setError(null)
    setIsLoading(true)
    fetchDashboard()
  }

  const fetchDashboard = async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      // Only fetch reports/dashboard - all roles can access this
      const response = await api.get('/reports/dashboard', {
        signal: abortControllerRef.current.signal
      })
      setDashboardData(response.data)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      // Handle specific error types
      if (err.name === 'AbortError' || err.message?.includes('Abort')) {
        console.log('Request was cancelled, ignoring error')
        return
      }
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const { user } = useAuth()

  useEffect(() => {
    // Only fetch if component is mounted and user exists
    if (typeof window !== 'undefined' && user) {
      const timer = setTimeout(() => {
        fetchDashboard()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [user])

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (!user) return

    // Connect to WebSocket
    websocketService.connect(user.id.toString(), user.role)

    // Define callback functions
    const jobUpdateCallback = (data: any) => {
      console.log('Real-time job update:', data)
      // Refresh dashboard data when jobs are updated
      fetchDashboard()
    }

    const inventoryUpdateCallback = (data: any) => {
      console.log('Real-time inventory update:', data)
      // Refresh dashboard data when inventory changes
      fetchDashboard()
    }

    // Listen for job updates
    websocketService.onJobUpdate(jobUpdateCallback)

    // Listen for inventory updates
    websocketService.onInventoryUpdate(inventoryUpdateCallback)

    return () => {
      websocketService.offJobUpdate(jobUpdateCallback)
      websocketService.offInventoryUpdate(inventoryUpdateCallback)
      // Cancel any pending requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [user])

  const stats = dashboardData?.data?.stats || {}
  const recentJobs = dashboardData?.data?.recentJobs || []
  const topTechnicians = dashboardData?.data?.topTechnicians || []

  // Kartu statistik utama - diorganisir dalam kategori
  const primaryStats = [
    {
      name: 'Total Pelanggan',
      value: stats.totalCustomers || 0,
      icon: Users,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      change: 'Terdaftar'
    },
    {
      name: 'Total Pekerjaan',
      value: stats.totalJobs || 0,
      icon: Briefcase,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      change: `+${stats.todayJobs || 0} hari ini`
    },
    {
      name: 'Total Teknisi',
      value: stats.totalTechnicians || 0,
      icon: Users,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      change: `${stats.activeTechnicians || 0} aktif`
    },
    {
      name: 'Pendapatan Bulanan',
      value: `Rp ${(stats.monthlyRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      change: '+15%'
    }
  ]

  const operationalStats = [
    {
      name: 'Pekerjaan Terbuka',
      value: stats.openJobs || 0,
      icon: Clock,
      color: 'bg-orange-500',
      change: 'Menunggu teknisi'
    },
    {
      name: 'Pekerjaan Selesai',
      value: stats.completedJobs || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: `${stats.thisMonthJobs || 0} bulan ini`
    },
    {
      name: 'Stok Rendah',
      value: stats.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: 'Item perlu restock'
    }
  ]

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: 'badge-warning',
      ASSIGNED: 'badge-info',
      IN_PROGRESS: 'badge-info',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    }
    return badges[status as keyof typeof badges] || 'badge-gray'
  }

  const getTypeBadge = (type: string) => {
    return type === 'INSTALLATION' ? 'badge-info' : 'badge-warning'
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 -mx-4 sm:-mx-6 md:-mx-8">
          <div className="w-full">
            <div className="space-y-6 py-4 px-2 sm:px-4">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Ringkasan aktivitas dan performa sistem</p>
            </div>

            {/* Statistik Utama */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600" />
                Ringkasan Utama
              </h2>
          {error ? (
            <ErrorFallback error={error} resetError={resetError} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                // Show skeleton loading cards
                Array.from({ length: 4 }).map((_, index) => (
                  <StatCardSkeleton key={index} />
                ))
              ) : (
                primaryStats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div 
                      key={stat.name} 
                      className="card-stats group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          // Handle card click/navigation
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 mb-2 group-hover:text-gray-700 transition-colors">
                            {stat.name}
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {stat.value}
                          </p>
                          <div className="flex items-center text-sm">
                            <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                              {stat.change}
                            </span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

            {/* Statistik Operasional */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Server className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-green-600" />
                Status Operasional
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {operationalStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.name} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-4 sm:p-5 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`p-2 sm:p-3 rounded-lg ${stat.color}`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-xl sm:text-2xl font-bold text-gray-900">
                          {stat.value}
                        </dd>
                        <dd className="text-sm text-gray-500">
                          {stat.change}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Recent Jobs */}
              <div className="bg-white rounded-lg shadow-md border border-gray-100">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                    Pekerjaan Terbaru
                  </h3>
                </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-4 sm:p-6 text-center">
                  <div className="loading-spinner h-8 w-8 mx-auto"></div>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="p-4 sm:p-6 text-center text-gray-500">
                  Belum ada pekerjaan
                </div>
              ) : (
                recentJobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} className="table-row px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">
                            {job.jobNumber}
                          </p>
                          <span className={`badge ${getTypeBadge(job.type)}`}>
                            {job.type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'}
                          </span>
                          <span className={`badge ${getStatusBadge(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {job.customer?.name || 'Customer tidak ditemukan'} - {job.address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200">
              <a
                href="/jobs"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Lihat semua pekerjaan →
              </a>
            </div>
          </div>

              {/* Top Technicians */}
              <div className="bg-white rounded-lg shadow-md border border-gray-100">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" />
                    Teknisi Terbaik
                  </h3>
                </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-4 sm:p-6 text-center">
                  <div className="loading-spinner h-8 w-8 mx-auto"></div>
                </div>
              ) : topTechnicians.length === 0 ? (
                <div className="p-4 sm:p-6 text-center text-gray-500">
                  Belum ada data teknisi
                </div>
              ) : (
                topTechnicians.slice(0, 5).map((tech: any, index: number) => (
                  <div key={tech.id} className="table-row px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-600">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {tech.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {tech.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {tech._count?.jobAssignments || 0} pekerjaan
                        </p>
                        <p className="text-xs text-gray-500">
                          selesai
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200">
              <a
                href="/technicians"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Lihat semua teknisi →
              </a>
            </div>
          </div>
        </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 sm:p-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-purple-600" />
                Aksi Cepat
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <a
                  href="/jobs/create"
                  className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg font-medium text-sm sm:text-base"
                >
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Buat Pekerjaan Baru
                </a>
                <a
                  href="/technicians"
                  className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg font-medium text-sm sm:text-base"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Kelola Teknisi
                </a>
                <a
                  href="/inventory"
                  className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg font-medium text-sm sm:text-base"
                >
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Kelola Inventori
                </a>
                <a
                  href="/reports"
                  className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg font-medium text-sm sm:text-base"
                >
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Lihat Laporan
                </a>
              </div>
            </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

