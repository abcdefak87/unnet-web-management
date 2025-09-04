// Utility functions for admin bot detection across the application

export interface AdminBotUser {
  id: string
  role?: string
  isAdmin?: boolean
  telegramChatId?: string
}

export interface AdminBotTechnician {
  id: string
  isAdmin: boolean
  isActive: boolean
  telegramChatId?: string
}

/**
 * Check if a system user is an admin bot
 * Only superadmin role is automatically admin bot, but only if they have Telegram connection
 */
export const isSystemUserAdminBot = (user: AdminBotUser): boolean => {
  // Only superadmin users with Telegram connection are admin bots
  return user.role === 'superadmin' && !!user.telegramChatId
}

/**
 * Check if a technician is an admin bot
 * Based on the isAdmin field
 */
export const isTechnicianAdminBot = (technician: AdminBotTechnician): boolean => {
  return technician.isAdmin === true
}

/**
 * Get admin bot badge component props
 */
export const getAdminBotBadgeProps = () => ({
  className: "inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800",
  text: "Admin Bot"
})

/**
 * Check if any user (system user or technician) is an admin bot
 */
export const isAdminBot = (entity: AdminBotUser | AdminBotTechnician): boolean => {
  // Check if it's a system user with role
  if ('role' in entity && entity.role) {
    return isSystemUserAdminBot(entity as AdminBotUser)
  }
  
  // Check if it's a technician with isAdmin field
  if ('isAdmin' in entity) {
    return isTechnicianAdminBot(entity as AdminBotTechnician)
  }
  
  return false
}
