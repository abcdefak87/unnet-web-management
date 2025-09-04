import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/Layout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { api } from '../../lib/api'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  Calendar,
  Download,
  Filter
} from 'lucide-react'

export default function Reports() {
  const { user } = useAuth()
  const router = useRouter()
  const [reportType, setReportType] = useState('dashboard')
  const [dateRange, setDateRange] = useState('30')
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [reportType, dateRange])

  const fetchReportData = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/reports/${reportType}?days=${dateRange}`)
      setReportData(response.data)
    } catch (error: any) {
      console.error('Failed to fetch report data:', error)
      if (error.response?.status === 403) {
        console.error('Access denied - insufficient permissions for reports')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Laporan & Analytics</h1>
              <p className="text-gray-600">Analisis performa dan statistik sistem</p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="form-input"
              >
                <option value="dashboard">Dashboard</option>
                <option value="jobs">Laporan Jobs</option>
                <option value="inventory">Laporan Inventory</option>
                <option value="technicians">Performa Teknisi</option>
              </select>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="form-input"
              >
                <option value="7">7 Hari Terakhir</option>
                <option value="30">30 Hari Terakhir</option>
                <option value="90">3 Bulan Terakhir</option>
                <option value="365">1 Tahun Terakhir</option>
              </select>
              
              <button className="btn-outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Report Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stats Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-md bg-blue-100">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {reportData?.totalJobs || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-md bg-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {reportData?.completionRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-md bg-purple-100">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Active Technicians</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {reportData?.activeTechnicians || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-md bg-orange-100">
                      <Package className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Inventory Value</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        Rp {(reportData?.inventoryValue || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Jobs Trend</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart akan ditampilkan di sini</p>
                </div>
              </div>
              
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technician Performance</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart akan ditampilkan di sini</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

