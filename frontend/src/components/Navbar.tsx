import { NavLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">Job Application Tracker</div>
      <nav className="navbar-links">
        <NavLink to="/board" className={({ isActive }) => (isActive ? 'active' : '')}>
          Board
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
          Analytics
        </NavLink>
      </nav>
      <div className="navbar-user">
        {user && <span className="navbar-username">{user.username}</span>}
        <button type="button" onClick={logout} className="btn btn-ghost">
          Log out
        </button>
      </div>
    </header>
  );
}
