import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import { api } from '../lib/api'
import { 
  MessageCircle, 
  Send, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Settings,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Telegram() {
  const { user } = useAuth()
  const router = useRouter()
  const [botStatus, setBotStatus] = useState<{status: string, message?: string} | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTechnicians: 0,
    activeTechnicians: 0,
    totalMessages: 0,
    activeJobs: 0,
    totalAdminBots: 0
  })

  useEffect(() => {
    fetchBotStatus()
    fetchStats()
  }, [])

  const fetchBotStatus = async () => {
    try {
      const response = await api.get('/telegram/status')
      setBotStatus(response.data)
    } catch (error) {
      console.error('Failed to fetch bot status:', error)
      setBotStatus({ status: 'error', message: 'Failed to connect to bot' })
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/telegram/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testBot = async () => {
    try {
      toast.loading('Testing bot connection...')
      const response = await api.post('/telegram/test')
      toast.dismiss()
      toast.success('Bot test successful!')
      fetchBotStatus()
    } catch (error) {
      toast.dismiss()
      toast.error('Bot test failed')
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
                  <Bot className="h-8 w-8 text-blue-600 mr-3" />
                  Telegram Bot Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor and manage the Telegram bot for technician coordination
                </p>
              </div>
              <button
                onClick={testBot}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <Activity className="h-4 w-4 mr-2" />
                Test Bot
              </button>
            </div>
          </div>

          {/* Bot Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bot Status</h2>
            <div className="flex items-center space-x-4">
              {botStatus?.status === 'active' ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Bot is running</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Bot is offline</span>
                </div>
              )}
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
            {botStatus?.message && (
              <p className="mt-2 text-sm text-gray-600">{botStatus.message}</p>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Technicians</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalTechnicians}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Technicians</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeTechnicians}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Messages Sent</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeJobs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Admin Bots</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalAdminBots}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bot Commands */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Bot Commands</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">/start</h3>
                <p className="text-sm text-gray-600 mt-1">Initialize bot and register technician</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">/jobs</h3>
                <p className="text-sm text-gray-600 mt-1">View available jobs</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">/status</h3>
                <p className="text-sm text-gray-600 mt-1">Check assigned jobs status</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">/help</h3>
                <p className="text-sm text-gray-600 mt-1">Show help and available commands</p>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bot Configuration</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Bot Token</span>
                <span className="text-sm text-gray-500">Configured ✓</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Webhook URL</span>
                <span className="text-sm text-gray-500">Active ✓</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-gray-700">Polling</span>
                <span className="text-sm text-gray-500">Enabled ✓</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
