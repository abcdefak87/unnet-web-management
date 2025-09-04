import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { useRealtime } from '../../contexts/RealtimeContext'
import { useRealtimeData } from '../../hooks/useRealtimeData'
import Layout from '../../components/Layout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { api } from '../../lib/api'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'

export default function Jobs() {
  const { user } = useAuth()
  const { isConnected } = useRealtime()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  // Real-time data hook
  const endpoint = `/jobs?${new URLSearchParams({
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
    page: page.toString(),
    limit: '10'
  }).toString()}`
  
  const { data: jobsData, loading: isLoading, updateData: setJobsData, refetch } = useRealtimeData<any>({
    endpoint,
    dependencies: [search, statusFilter, typeFilter, page]
  })

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus job ini?')) {
      return
    }

    try {
      await api.delete(`/jobs/${jobId}`)
      alert('Job berhasil dihapus!')
      // Refresh data to reflect changes
      refetch()
    } catch (error: any) {
      console.error('Failed to delete job:', error)
      
      if (error.response?.status === 404) {
        alert('Job sudah tidak ada atau telah dihapus sebelumnya.')
        // Refresh to sync with server state
        refetch()
      } else {
        alert(error.response?.data?.message || 'Gagal menghapus job. Silakan coba lagi.')
      }
    }
  }

  // Listen for real-time job updates
  useEffect(() => {
    if (isConnected) {
      // Real-time updates are handled by useRealtimeData hook
      console.log('🔄 Real-time job updates active')
    }
  }, [isConnected])

  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData as any)?.data?.jobs || []
  const pagination = Array.isArray(jobsData) ? {} : (jobsData as any)?.data?.pagination || {}

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

  const getStatusText = (status: string) => {
    const texts = {
      OPEN: 'Terbuka',
      ASSIGNED: 'Ditugaskan',
      IN_PROGRESS: 'Dikerjakan',
      COMPLETED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    }
    return texts[status as keyof typeof texts] || status
  }

  const getTypeBadge = (type: string) => {
    return type === 'INSTALLATION' ? 'badge-info' : 'badge-warning'
  }

  const getTypeText = (type: string) => {
    return type === 'INSTALLATION' ? 'Pemasangan' : 'Perbaikan'
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      LOW: 'badge-gray',
      MEDIUM: 'badge-info',
      HIGH: 'badge-warning',
      URGENT: 'badge-danger',
    }
    return badges[priority as keyof typeof badges] || 'badge-gray'
  }

  return (
    <ProtectedRoute>
      <Layout title="Kelola Jobs">
        <div className="space-y-6">
          {/* Real-time Status Indicator */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? '🔗 Real-time updates active' : '🔌 Reconnecting...'}
              </span>
            </div>
            <button
              onClick={refetch}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="form-input pl-10"
                    placeholder="Cari job, pelanggan, atau alamat..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
              </div>
              
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="OPEN">Terbuka</option>
                <option value="ASSIGNED">Ditugaskan</option>
                <option value="IN_PROGRESS">Dikerjakan</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
              
              <select
                className="form-input"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Semua Tipe</option>
                <option value="INSTALLATION">Pemasangan</option>
                <option value="REPAIR">Perbaikan</option>
              </select>
            </div>
          </div>
          
          {user?.role !== 'user' && (
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <button
                onClick={() => router.push('/jobs/create')}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Buat Job Baru
              </button>
            </div>
          )}
        </div>

        {/* Jobs Table */}
        <div className="table-container">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="table-cell-nowrap">
                    Job
                  </th>
                  <th className="table-cell-nowrap">
                    Pelanggan
                  </th>
                  <th className="table-cell-nowrap">
                    Teknisi
                  </th>
                  <th className="table-cell-center table-cell-nowrap">
                    Status
                  </th>
                  <th className="table-cell-nowrap">
                    Tanggal
                  </th>
                  <th className="table-cell-center table-cell-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Tidak ada job ditemukan
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-gray-900">
                              {job.jobNumber}
                            </div>
                            <span className={`badge ${getTypeBadge(job.type)}`}>
                              {getTypeText(job.type)}
                            </span>
                            <span className={`badge ${getPriorityBadge(job.priority)}`}>
                              {job.priority}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {job.title}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {job.customer.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {job.customer.phone}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-xs">{job.address}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {job.technicians.length === 0 ? (
                            <div>
                              <span className="text-sm text-gray-500">Belum ditugaskan</span>
                              <div className="text-xs text-green-600 mt-1">
                                📋 Tersedia (0/2 teknisi)
                              </div>
                            </div>
                          ) : (
                            <div>
                              {job.technicians.map((jt: any, index: number) => (
                                <div key={jt.id} className="text-sm text-gray-900 mb-1">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-1" />
                                    {jt.technician.name}
                                  </div>
                                </div>
                              ))}
                              <div className="text-xs text-blue-600 mt-1">
                                🔧 {job.technicians.length}/2 teknisi ditugaskan
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell-center">
                        <span className={`badge ${getStatusBadge(job.status)}`}>
                          {getStatusText(job.status)}
                        </span>
                      </td>
                      
                      <td className="table-cell-nowrap">
                        {new Date(job.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      
                      <td className="table-cell-center">
                        <div className="table-actions">
                          <button
                            onClick={() => router.push(`/jobs/${job.id}`)}
                            className="table-action-btn-view"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(user?.role === 'admin' || user?.role === 'superadmin') && (
                            <>
                              <button
                                onClick={() => router.push(`/jobs/${job.id}/edit`)}
                                className="table-action-btn-edit"
                                title="Edit Job"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="table-action-btn-delete"
                                title="Hapus Job"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="btn-outline disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                  className="btn-outline disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    results
                  </p>
                </div>
                
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                      .map((p, index, array) => (
                        <React.Fragment key={p}>
                          {index > 0 && array[index - 1] !== p - 1 && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              p === page
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                    
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

