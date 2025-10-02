import { useLocation, useNavigate } from 'react-router-dom'
import { Search, MessageCircle, Star, User } from 'lucide-react'

const BottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { id: 'find', label: 'Find', icon: Search, path: '/find/budget' },
    { id: 'ai', label: 'AI', icon: MessageCircle, path: '/ai' },
    { id: 'saved', label: 'Saved', icon: Star, path: '/saved' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
  ]

  const isActive = (path) => {
    if (path === '/find/budget') {
      return location.pathname.startsWith('/find')
    }
    return location.pathname === path
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-carexpert-off-white">
      <div className="flex justify-around py-3 pb-8">
        {navItems.map((item) => {
          const IconComponent = item.icon
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center transition-colors duration-200 ${
                isActive(item.path) ? 'text-carexpert-red' : 'text-gray-500'
              }`}
            >
              <IconComponent size={24} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BottomNav