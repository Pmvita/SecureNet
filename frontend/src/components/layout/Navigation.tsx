import React from 'react';
import { NavLink } from 'react-router-dom';
import type { BaseProps } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface NavigationProps extends BaseProps {
  items: NavItem[];
  collapsed?: boolean;
}

export function Navigation({ items, collapsed = false, className, ...props }: NavigationProps) {
  return (
    <nav className={`navigation ${collapsed ? 'collapsed' : ''} ${className || ''}`} {...props}>
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.path} className="nav-item">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.icon && <span className="nav-icon">{item.icon}</span>}
              {!collapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <style>{`
        .navigation {
          padding: 1rem 0;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .nav-item {
          margin: 0.25rem 0;
        }

        .nav-link {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .nav-link.active {
          color: var(--primary-color);
          background: var(--primary-light);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          margin-right: 0.75rem;
        }

        .nav-label {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .nav-badge {
          padding: 0.125rem 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          background: var(--primary-color);
          border-radius: 1rem;
          min-width: 1.5rem;
          text-align: center;
        }

        .navigation.collapsed .nav-link {
          padding: 0.75rem;
          justify-content: center;
        }

        .navigation.collapsed .nav-icon {
          margin-right: 0;
        }

        .navigation.collapsed .nav-badge {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          transform: translate(50%, -50%);
        }

        @media (max-width: 768px) {
          .navigation {
            padding: 0.5rem;
          }

          .nav-list {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .nav-item {
            margin: 0;
          }

          .nav-link {
            padding: 0.5rem;
            white-space: nowrap;
          }

          .nav-icon {
            margin-right: 0.5rem;
          }
        }
      `}</style>
    </nav>
  );
} 