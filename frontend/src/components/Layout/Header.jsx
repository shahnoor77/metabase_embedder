import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { LogOut, User } from 'lucide-react'

export default function Header() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics Platform</h1>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">
                {user.first_name} {user.last_name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
