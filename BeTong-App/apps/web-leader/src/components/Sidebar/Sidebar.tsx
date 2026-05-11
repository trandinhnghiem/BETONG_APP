import { Link } from 'react-router-dom'
import { FiHome, FiBarChart2, FiFileText, FiTrendingUp } from 'react-icons/fi'
import './Sidebar.css'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Leader Dashboard</h2>
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className="nav-link">
          <FiHome size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/orders" className="nav-link">
          <FiBarChart2 size={20} />
          <span>Orders</span>
        </Link>
        <Link to="/analytics" className="nav-link">
          <FiTrendingUp size={20} />
          <span>Analytics</span>
        </Link>
        <Link to="/reports" className="nav-link">
          <FiFileText size={20} />
          <span>Reports</span>
        </Link>
      </nav>
    </aside>
  )
}
