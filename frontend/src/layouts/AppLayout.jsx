import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  BarChart3,
  Sparkles,
  User,
  LogOut,
  Menu,
  GraduationCap,
} from 'lucide-react';
import useAuthStore from '../store/authStore.js';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Quiz Center', path: '/quiz', icon: Brain },
    { name: 'Deep Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'AI Recommendations', path: '/recommendations', icon: Sparkles },
    { name: 'Student Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Page Content Wrapper */}
      <div className="drawer-content flex flex-col">
        {/* Top Navbar */}
        <header className="navbar bg-base-100 shadow-sm border-b border-base-200 sticky top-0 z-30 px-4">
          <div className="flex-none lg:hidden">
            <label htmlFor="app-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost btn-sm">
              <Menu className="w-5 h-5" />
            </label>
          </div>

          <div className="flex-1 px-2 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI StudyTwin
            </span>
          </div>

          <div className="flex-none flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-8 h-8 font-bold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-bold leading-none">{user.name}</p>
                  <p className="text-[11px] text-base-content/60 leading-none mt-1">{user.email}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm btn-circle text-error"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Drawer */}
      <div className="drawer-side z-40 border-r border-base-200">
        <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <aside className="menu p-4 w-64 min-h-full bg-base-100 text-base-content flex flex-col justify-between">
          <div className="space-y-6">
            {/* Sidebar Brand Header */}
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="p-2 bg-primary rounded-xl text-primary-content">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight block">AI StudyTwin</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-base-content/50 block">
                  Cognitive LMS
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <ul className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      end={link.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          isActive
                            ? 'bg-primary text-primary-content shadow-sm'
                            : 'hover:bg-base-200 text-base-content/80'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {link.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer Card in Sidebar */}
          <div className="bg-base-200/70 p-3.5 rounded-2xl border border-base-300 text-xs space-y-1.5">
            <span className="font-bold text-base-content flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Digital Twin Active
            </span>
            <p className="text-base-content/70 leading-relaxed text-[11px]">
              Continuous telemetry updates automatically after each quiz submission.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
