import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">◈</span>
        PaperLens
      </Link>
      <div className="navbar-links">
        <Link to="/papers">Browse</Link>
        {user && <Link to="/editor">Write</Link>}
      </div>
      <div className="navbar-auth">
        {user ? (
          <>
            <span className="nav-user">{user.name}</span>
            <button className="btn-outline" onClick={logout}>Sign out</button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Sign in
          </button>
        )}
      </div>
    </nav>
  )
}