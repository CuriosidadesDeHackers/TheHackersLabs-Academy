import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Ico from '../ui/Ico';
import SiteBrand from '../ui/SiteBrand';

const LEVEL_LABELS = ['','Rookie','Apprentice','Hacker','Analyst','Expert','Elite','Veteran','Master','Legend'];
const LEVEL_COLORS = ['','#6b7280','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#f5a623','#ef4444','#14b8a6'];
const THRESHOLDS   = [0,100,300,600,1000,1500,2200,3000,4000,5500];

const NAV = [
  { to: '/community',    icon: 'chat',     label: 'Community' },
  { to: '/classroom',    icon: 'book',     label: 'Classroom' },
  { to: '/calendar',     icon: 'calendar', label: 'Calendar' },
  { to: '/members',      icon: 'users',    label: 'Members' },
  { to: '/about',        icon: 'info',     label: 'About' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuthStore();
  const level = user?.level || 1;
  const pts   = user?.points || 0;
  const next  = THRESHOLDS[Math.min(level, 9)];
  const curr  = THRESHOLDS[level - 1] || 0;
  const pct   = next > curr ? Math.round(((pts - curr) / (next - curr)) * 100) : 100;
  const color = LEVEL_COLORS[level] || 'var(--gold)';

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 'var(--r2)', marginBottom: 2,
    color: isActive ? 'var(--gold)' : 'var(--txt-2)',
    background: isActive ? 'var(--gold-dim)' : 'transparent',
    fontWeight: isActive ? 600 : 400, fontSize: 14,
    textDecoration: 'none',
    borderLeft: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
    transition: 'all var(--t1)',
  });

  const hoverOn  = e => { if (!e.currentTarget.style.color.includes('gold')) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt-1)'; } };
  const hoverOff = e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="app-sidebar-overlay"
        />
      )}

      <aside className={`app-sidebar${open ? ' open' : ''}`}>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'absolute', top: 12, right: 12,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--bg-3)', border: 'none',
            color: 'var(--txt-3)', cursor: 'pointer',
          }}
          className="sidebar-close-btn"
        >
          <Ico name="x" size={13} />
        </button>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <SiteBrand style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt-1)', letterSpacing: '-0.3px' }} />
              <div style={{ fontSize: 10, color: 'var(--txt-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Comunidad</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} onClick={onClose}
              style={({ isActive }) => linkStyle(isActive)}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <Ico name={icon} size={17} />
              <span>{label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '10px 4px' }} />
              <NavLink to="/analytics" onClick={onClose}
                style={({ isActive }) => ({
                  ...linkStyle(isActive),
                  color: isActive ? 'var(--gold)' : 'var(--txt-2)',
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  borderLeftColor: isActive ? 'var(--gold)' : 'transparent',
                })}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <Ico name="chart" size={17} />
                <span>Analíticas</span>
              </NavLink>
              <NavLink to="/admin" onClick={onClose}
                style={({ isActive }) => ({
                  ...linkStyle(isActive),
                  color: isActive ? 'var(--red)' : 'var(--txt-2)',
                  background: isActive ? 'rgba(248,113,113,0.1)' : 'transparent',
                  borderLeftColor: isActive ? 'var(--red)' : 'transparent',
                })}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = 'var(--red)'; }}
                onMouseLeave={hoverOff}
              >
                <Ico name="shield" size={17} />
                <span>Admin</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User card */}
        {user && (
          <div style={{
            margin: 10, borderRadius: 'var(--r3)',
            background: 'var(--bg-3)', border: `1px solid var(--line)`,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg,${color},${color}aa)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0,
                }}>
                  {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                </div>
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--green)', border: `2px solid var(--bg-3)`,
                }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.first_name || user.username}
                </div>
                <div style={{ fontSize: 11, color, fontWeight: 600 }}>
                  Nv.{level} · {LEVEL_LABELS[level] || 'Hacker'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{pts} pts</span>
              <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>Nv.{level + 1}</span>
            </div>
            <div style={{ background: 'var(--bg-4)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(pct, 100)}%`,
                background: `linear-gradient(90deg,${color},${color}cc)`,
                borderRadius: 4, transition: 'width 0.6s var(--ease)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 4, textAlign: 'right' }}>
              {pct}% completado
            </div>
          </div>
        )}
      </aside>

      <style>{`
        .sidebar-close-btn { display: none; }
        @media (max-width: 900px) {
          .sidebar-close-btn { display: flex; }
        }
      `}</style>
    </>
  );
}
