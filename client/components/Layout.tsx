import React, { ReactNode, useState, useEffect } from 'react'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import { 
  LogOut, 
  User, 
  Home, 
  LayoutDashboard, 
  UserCheck, 
  BarChart3, 
  MessageSquare, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
  Users, 
  Package, 
  Settings, 
  Menu, 
  X, 
  Bot
} from 'lucide-react'
import Link from 'next/link'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'gudang'] },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Persetujuan', href: '/persetujuan', icon: CheckCircle, roles: ['superadmin', 'admin'] },
      { name: 'Pekerjaan', href: '/jobs', icon: Briefcase, roles: ['superadmin', 'admin', 'user'] },
      { name: 'Teknisi', href: '/technicians', icon: Users, roles: ['superadmin', 'admin', 'user'] },
    ]
  },
  {
    title: 'Management',
    items: [
      { name: 'Pelanggan', href: '/pelanggan', icon: UserCheck, roles: ['superadmin', 'admin'] },
      { name: 'Inventori', href: '/inventory', icon: Package, roles: ['superadmin', 'gudang', 'admin'] },
    ]
  },
  {
    title: 'Reports & System',
    items: [
      { name: 'Laporan', href: '/reports', icon: BarChart3, roles: ['superadmin', 'admin', 'gudang'] },
      { name: 'Telegram Bot', href: '/telegram', icon: MessageSquare, roles: ['superadmin'] },
      { name: 'Users', href: '/users', icon: Settings, roles: ['superadmin'] },
    ]
  }
]

export default function Layout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()


  useEffect(() => {
    setMounted(true)
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarExpanded')
    if (savedState !== null) {
      setDesktopSidebarOpen(JSON.parse(savedState))
    }
  }, [])

  useEffect(() => {
    // Save sidebar state to localStorage
    if (mounted) {
      localStorage.setItem('sidebarExpanded', JSON.stringify(desktopSidebarOpen))
    }
  }, [desktopSidebarOpen, mounted])

  // Filter navigation groups based on user role
  const filteredNavigationGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => user?.role && item.roles.includes(user.role))
  })).filter(group => group.items.length > 0)


  // Auto-expand/collapse logic
  const shouldShowExpanded = desktopSidebarOpen || isHovering

  const isActive = (href: string) => {
    return router.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Mobile sidebar backdrop */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ease-out ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={() => setSidebarOpen(false)} 
        />
        
        {/* Mobile sidebar */}
        <div className={`relative flex-1 flex flex-col max-w-80 w-full bg-white/95 backdrop-blur-md border-r border-gray-200/50 shadow-2xl transform transition-all duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto scrollbar-hide">
            <div className="flex-shrink-0 flex items-center justify-center px-6 mb-8">
              <div className="text-center">
                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent tracking-tight">
                  UNNET
                </h1>
                <p className="text-xs font-semibold text-gray-500 tracking-[0.2em] uppercase mt-1">
                  MANAGEMENT
                </p>
              </div>
            </div>
            <nav className="mt-2 px-3 space-y-4">
              {filteredNavigationGroups.map((group, groupIndex) => (
                <div key={group.title}>
                  {/* Group title */}
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {group.title}
                    </h3>
                  </div>
                  
                  {/* Group items */}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      
                      return (
                        <Link 
                          key={item.name} 
                          href={item.href}
                          className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-out transform hover:scale-[1.02] ${
                            active
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700'
                          }`}
                        >
                          <Icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${
                            active ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                          } group-hover:scale-110`} />
                          <span className="font-medium flex-1">{item.name}</span>
                          {active && (
                            <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                  
                  {/* Divider between groups (except last group) */}
                  {groupIndex < filteredNavigationGroups.length - 1 && (
                    <div className="mt-4 px-4">
                      <div className="border-t border-gray-200/60"></div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Enhanced User Profile Section */}
              <div className="mt-6 pt-4 border-t border-gray-200/60">
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role === 'superadmin' ? 'Super Admin' : 
                         user?.role === 'admin' ? 'Admin' :
                         user?.role === 'gudang' ? 'Gudang' : 
                         user?.role === 'user' ? 'User' : user?.role}
                      </p>
                    </div>
                    {profileDropdownOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </button>
                  
                  {/* Profile dropdown menu */}
                  {profileDropdownOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                      </div>
                      <Link 
                        href="/profile" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Profile Settings
                      </Link>
                      <button 
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          logout()
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div 
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ease-out z-30 ${
          shouldShowExpanded ? 'lg:w-72' : 'lg:w-20'
        }`}
        onMouseEnter={() => !desktopSidebarOpen && setIsHovering(true)}
        onMouseLeave={() => !desktopSidebarOpen && setIsHovering(false)}
      >
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200/50 bg-white/95 backdrop-blur-md shadow-xl">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto scrollbar-hide">
            {/* Header with brand and toggle */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <div className={`transition-all duration-300 ease-out ${
                shouldShowExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              } overflow-hidden`}>
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent tracking-tight">
                    UNNET
                  </h1>
                  <p className="text-[10px] font-semibold text-gray-500 tracking-[0.2em] uppercase">
                    MANAGEMENT
                  </p>
                  <div className="pt-2 space-y-1">
                    <div className="text-xs text-gray-600 font-medium truncate">
                      {user?.email}
                    </div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                      {user?.role === 'superadmin' ? 'Super Admin' : 
                       user?.role === 'admin' ? 'Admin' :
                       user?.role === 'gudang' ? 'Gudang' : 
                       user?.role === 'user' ? 'User' : user?.role}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Toggle button */}
              <button
                onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                className={`p-2.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-600 hover:text-gray-800 transition-all duration-200 flex-shrink-0 ml-auto ${
                  shouldShowExpanded ? '' : 'mx-auto'
                }`}
                title={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {shouldShowExpanded ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-4">
              {filteredNavigationGroups.map((group, groupIndex) => (
                <div key={group.title}>
                  {/* Group title - only show when expanded */}
                  {shouldShowExpanded && (
                    <div className="px-3 py-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {group.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* Group items */}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      
                      return (
                        <Link 
                          key={item.name} 
                          href={item.href}
                          className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-out transform hover:scale-[1.02] ${
                            active
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700'
                          } ${!shouldShowExpanded ? 'justify-center' : ''}`}
                          title={!shouldShowExpanded ? item.name : ''}
                        >
                          <Icon className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                            active ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                          } group-hover:scale-110 ${shouldShowExpanded ? 'mr-3' : ''}`} />
                          
                          <span className={`transition-all duration-300 ease-out font-medium flex-1 ${
                            shouldShowExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                          } overflow-hidden whitespace-nowrap`}>
                            {item.name}
                          </span>
                          
                          {active && shouldShowExpanded && (
                            <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                          
                          {active && !shouldShowExpanded && (
                            <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                  
                  {/* Divider between groups (except last group) - only when expanded */}
                  {shouldShowExpanded && groupIndex < filteredNavigationGroups.length - 1 && (
                    <div className="mt-4 px-3">
                      <div className="border-t border-gray-200/60"></div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
          
          {/* Enhanced User Profile Section */}
          <div className={`flex-shrink-0 border-t border-gray-200/60 transition-all duration-300 ${
            shouldShowExpanded ? 'opacity-100 p-4' : 'opacity-100 p-2'
          }`}>
            <div className="relative">
              {shouldShowExpanded ? (
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <Wifi className="h-3 w-3 text-green-500 ml-1" />
                        </div>
                        <span className="text-xs text-gray-500">Online</span>
                      </div>
                      {profileDropdownOpen ? (
                        <ChevronUp className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-full flex justify-center p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 relative"
                  title={user?.name || user?.email}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </button>
              )}
              
              {/* Profile dropdown menu */}
              {profileDropdownOpen && (
                <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 ${
                  shouldShowExpanded ? 'left-0 right-0' : 'left-1/2 transform -translate-x-1/2 w-64'
                }`}>
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                    <div className="text-xs text-blue-600 font-medium capitalize">
                      {user?.role === 'superadmin' ? 'Super Admin' : 
                       user?.role === 'admin' ? 'Admin' :
                       user?.role === 'gudang' ? 'Gudang' : 
                       user?.role === 'user' ? 'User' : user?.role}
                    </div>
                  </div>
                  {(user?.role === 'superadmin' || user?.role === 'admin') && (
                    <Link 
                      href="/reports"
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        router.pathname === '/reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="mr-3 h-5 w-5" />
                      Reports
                    </Link>
                  )}
                  <Link 
                    href="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-500" />
                    Profile Settings
                  </Link>
                  <button 
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ease-out ${
        shouldShowExpanded ? 'lg:pl-72' : 'lg:pl-20'
      }`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="p-2 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-600 hover:text-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                UNNET
              </h1>
            </div>
            
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </div>
        
        <main className="flex-1 min-h-0">
          <div className="h-full">
            <div className="container-responsive section-padding h-full">
              {title && (
                <div className="mb-8">
                  <div className="page-header rounded-2xl p-6 mb-6">
                    <h1 className="page-title">{title}</h1>
                    <div className="flex items-center mt-2 space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-600">System Online</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="h-full">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

