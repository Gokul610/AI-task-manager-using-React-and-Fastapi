// frontend/src/components/layout/Header.jsx

import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import authService from '../../services/authService';
import StreakCounter from '../gamification/StreakCounter';

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // --- MODIFIED ---
  // Updated NavLink styles to add the "glow" shadow on active links
  const navLinkClass = ({ isActive }) =>
    `text-lg font-medium pb-1 transition-all duration-300 ${
      isActive
        ? 'text-primary shadow-primary-glow' // Active link uses primary color and new glow
        : 'text-muted-foreground hover:text-foreground' // Inactive uses muted, hover uses default foreground
    }`;
  // ------------------

  return (
    // --- MODIFIED: Updated rounding and flex layout ---
    <header className="flex items-center justify-between p-4 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-card mb-8 sticky top-4 z-40">
    {/* ------------------ */}
      
      {/* Left Section: Title */}
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label="rocket">🎯</span>
        <h1 className="text-2xl font-bold">
          AI Task Manager
        </h1>
      </div>

      {/* Center Section: Navigation */}
      <nav className="flex items-center gap-6">
        <NavLink to="/dashboard" className={navLinkClass}>
          Tasks
        </NavLink>
        <NavLink to="/insights" className={navLinkClass}>
          Insights
        </NavLink>
      </nav>

      {/* Right Section: Streak & Logout */}
      <div className="flex items-center gap-4">
        <StreakCounter />
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Log Out
        </button>
      </div>
    </header>
  );
};

export default Header;