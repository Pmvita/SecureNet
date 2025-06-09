import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  navigationItems: NavigationItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navigationItems,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1 className="logo">SecureNet</h1>
          <button
            className="collapse-button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="navigation">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="top-bar">
          <div className="breadcrumb">
            {navigationItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </div>
          <div className="user-menu">
            <button className="user-button">
              <span className="user-avatar">👤</span>
              <span className="user-name">Admin</span>
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <style>{`
        .dashboard-layout {
          display: grid;
          grid-template-columns: auto 1fr;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .sidebar {
          width: 240px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .sidebar.collapsed {
          width: 64px;
        }

        .sidebar-header {
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
        }

        .logo {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
        }

        .collapse-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          font-size: 1rem;
          transition: color 0.2s;
        }

        .collapse-button:hover {
          color: var(--text-primary);
        }

        .navigation {
          padding: 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s;
          border-radius: 0.25rem;
          margin: 0 0.5rem;
        }

        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--primary-color);
          color: white;
        }

        .nav-icon {
          font-size: 1.25rem;
          min-width: 1.5rem;
          text-align: center;
        }

        .nav-label {
          margin-left: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .top-bar {
          height: 64px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
        }

        .breadcrumb {
          font-size: 1.25rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .user-menu {
          display: flex;
          align-items: center;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          color: var(--text-primary);
          border-radius: 0.25rem;
          transition: background-color 0.2s;
        }

        .user-button:hover {
          background: var(--bg-hover);
        }

        .user-avatar {
          font-size: 1.25rem;
        }

        .user-name {
          font-size: 0.875rem;
        }

        .content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            height: 100vh;
            z-index: 1000;
            transform: translateX(0);
            transition: transform 0.3s ease;
          }

          .sidebar.collapsed {
            transform: translateX(-100%);
          }

          .main-content {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}; 