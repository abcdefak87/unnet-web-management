import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { api } from '../lib/api'
import { isSystemUserAdminBot, isTechnicianAdminBot, getAdminBotBadgeProps } from '../lib/adminBotUtils'
import { 
  Bot, 
  Users, 
  Shield,
  ShieldCheck,
  UserCheck,
  Settings,
  MessageSquare,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLogin?: string
  telegramChatId?: string
}

interface AdminBotTechnician {
  id: string
  name: string
  phone: string
  isAdmin: boolean
  isActive: boolean
  status: string
  telegramChatId?: string
}

export default function AdminBots() {
  const { user } = useAuth()
  const router = useRouter()
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [adminTechnicians, setAdminTechnicians] = useState<AdminBotTechnician[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAdminBots: 0,
    connectedAdminBots: 0,
    systemAdminBots: 0,
    technicianAdminBots: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch system users
      const usersResponse = await api.get('/users')
      const allUsers = usersResponse.data.data || []
      const adminUsers = allUsers.filter((u: SystemUser) => 
        u.role === 'superadmin' || u.role === 'admin'
      )
      setSystemUsers(adminUsers)

      // Fetch technicians with admin role
      const techniciansResponse = await api.get('/technicians')
      const allTechnicians = techniciansResponse.data.data?.technicians || []
      const adminTechs = allTechnicians.filter((t: AdminBotTechnician) => t.isAdmin === true)
      setAdminTechnicians(adminTechs)

      // Calculate stats
      const connectedSystemUsers = adminUsers.filter((u: SystemUser) => u.telegramChatId).length
      const connectedTechnicians = adminTechs.filter((t: AdminBotTechnician) => t.telegramChatId).length
      
      setStats({
        totalAdminBots: connectedSystemUsers + adminTechs.length,
        connectedAdminBots: connectedSystemUsers + connectedTechnicians,
        systemAdminBots: connectedSystemUsers,
        technicianAdminBots: adminTechs.length
      })

    } catch (error) {
      console.error('Failed to fetch admin bot data:', error)
      toast.error('Gagal memuat data admin bot')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTechnicianAdminRole = async (technicianId: string, currentIsAdmin: boolean, technicianName: string) => {
    const newRole = !currentIsAdmin
    const roleText = newRole ? 'Admin Bot' : 'Teknisi Biasa'
    const confirmMessage = `Apakah Anda yakin ingin mengubah ${technicianName} menjadi ${roleText}?`
    
    if (!confirm(confirmMessage)) return

    try {
      await api.put(`/technicians/${technicianId}`, { isAdmin: newRole })
      toast.success(`${technicianName} berhasil diubah menjadi ${roleText}`)
      fetchData()
    } catch (error: any) {
      const message = error.response?.data?.error || 'Gagal mengubah role teknisi'
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Bot className="h-8 w-8 text-purple-600 mr-3" />
                  Admin Bot Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Kelola admin bot untuk sistem dan teknisi
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Admin Bots</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalAdminBots}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Connected to Telegram</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.connectedAdminBots}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Admin Bots</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.systemAdminBots}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Technician Admin Bots</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.technicianAdminBots}</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Admin Bots */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                System Admin Bots
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Superadmin dan admin yang terhubung dengan Telegram bot
              </p>
            </div>
            
            {systemUsers.length === 0 ? (
              <div className="p-6 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada system admin bot</h3>
                <p className="text-gray-500">Belum ada superadmin atau admin yang terhubung dengan Telegram</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {systemUsers.map((systemUser) => (
                  <div key={systemUser.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          {systemUser.role === 'superadmin' ? (
                            <ShieldCheck className="h-6 w-6 text-red-600" />
                          ) : (
                            <Shield className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{systemUser.name}</h4>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p className="flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              {systemUser.email}
                            </p>
                            <p className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              {systemUser.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                            </p>
                            {systemUser.lastLogin && (
                              <p className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Last login: {new Date(systemUser.lastLogin).toLocaleDateString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          systemUser.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {systemUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        {systemUser.telegramChatId ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Connected
                          </span>
                        )}
                        
                        {isSystemUserAdminBot(systemUser) && (
                          <span className={getAdminBotBadgeProps().className}>
                            <Bot className="h-3 w-3 mr-1" />
                            {getAdminBotBadgeProps().text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technician Admin Bots */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 text-orange-600 mr-2" />
                Technician Admin Bots
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Teknisi yang dipromosikan menjadi admin bot
              </p>
            </div>
            
            {adminTechnicians.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada technician admin bot</h3>
                <p className="text-gray-500">Belum ada teknisi yang dipromosikan menjadi admin bot</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {adminTechnicians.map((technician) => (
                  <div key={technician.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{technician.name}</h4>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p className="flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              {technician.phone}
                            </p>
                            <p className="flex items-center">
                              <Activity className="h-4 w-4 mr-2" />
                              Status: {technician.status === 'AVAILABLE' ? 'Tersedia' : 
                                      technician.status === 'BUSY' ? 'Sibuk' : 'Offline'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          technician.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {technician.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        {technician.telegramChatId ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Connected
                          </span>
                        )}
                        
                        {isTechnicianAdminBot(technician) && (
                          <span className={getAdminBotBadgeProps().className}>
                            <Bot className="h-3 w-3 mr-1" />
                            {getAdminBotBadgeProps().text}
                          </span>
                        )}
                        
                        {user?.role === 'superadmin' && (
                          <button
                            onClick={() => toggleTechnicianAdminRole(technician.id, technician.isAdmin, technician.name)}
                            className="btn btn-sm btn-outline"
                          >
                            Remove Admin Bot
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
