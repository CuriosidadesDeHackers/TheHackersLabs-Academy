import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CommunitySidebar } from './Community';

const TABS = [
  { label: 'Todos',   role: 'all' },
  { label: 'Admin',   role: 'admin' },
  { label: 'Docente', role: 'instructor' },
  { label: 'Alumno',  role: 'member' },
];

const LEVEL_COLORS = ['','#6b7280','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#f5a623','#ef4444','#14b8a6'];

function MemberAvatar({ user, size = 48 }) {
  const colors = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c'];
  const bg = colors[(user?.id || 0) % colors.length];
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || user?.username?.[0] || '')).toUpperCase() || '?';
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${bg},${bg}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.36, color: '#000', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function MemberRow({ member, onClick }) {
  const [hovered, setHovered] = useState(false);
  const joined = new Date(member.date_joined).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const lvlColor = LEVEL_COLORS[member.level || 1] || 'var(--txt-3)';
  const fullName = member.first_name ? `${member.first_name} ${member.last_name || ''}`.trim() : member.username;
  const roleLabel = member.role === 'admin' ? 'Admin' : member.role === 'instructor' ? 'Docente' : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        cursor: 'pointer',
        background: hovered ? 'var(--bg-3)' : 'transparent',
        borderBottom: '1px solid var(--line)',
        transition: 'background var(--t1)',
      }}
    >
      {/* Avatar with online dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <MemberAvatar user={member} size={48} />
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--green)', border: '2px solid var(--bg-2)',
        }} />
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt-1)' }}>{fullName}</span>
          <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>@{member.username}</span>
          {/* Level badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, color: lvlColor,
            background: `${lvlColor}22`, border: `1px solid ${lvlColor}55`,
            borderRadius: 'var(--r2)', padding: '1px 6px', letterSpacing: '.04em',
          }}>
            Nv.{member.level || 1}
          </span>
          {/* Role badge */}
          {roleLabel && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--gold)',
              background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
              borderRadius: 'var(--r2)', padding: '1px 6px', letterSpacing: '.04em',
            }}>
              {roleLabel}
            </span>
          )}
        </div>

        {member.bio && (
          <p style={{
            fontSize: 13, color: 'var(--txt-2)', marginBottom: 5, lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          }}>
            {member.bio}
          </p>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Miembro desde {joined}</span>
          {member.location && (
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{member.location}</span>
          )}
        </div>
      </div>

      {/* Right: points + membership */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold)' }}>
          {(member.points || 0).toLocaleString()} pts
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>
          {member.membership_status === 'active' ? 'Activo'
            : member.membership_status === 'lifetime' ? 'Lifetime'
            : member.membership_status === 'cancelled' ? 'Cancelando'
            : member.membership_status === 'expired' ? 'Expirado'
            : 'Free'}
        </span>
      </div>
    </div>
  );
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [courseCount, setCourseCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const navigate = useNavigate();

  const fetchMembers = useCallback((q = '', role = 'all', pageNum = 1) => {
    const params = { page: pageNum };
    if (q) params.search = q;
    if (role && role !== 'all') params.role = role;
    return api.get('/auth/members/', { params }).then(r => {
      const data = r.data;
      const results = Array.isArray(data) ? data : (data.results || []);
      setMembers(prev => pageNum === 1 ? results : [...prev, ...results]);
      setTotal(Array.isArray(data) ? results.length : (data.count ?? results.length));
      setHasMore(Array.isArray(data) ? false : !!data.next);
      setPage(pageNum);
    });
  }, []);

  // Initial load
  useEffect(() => { setLoading(true); fetchMembers('', 'all', 1).finally(() => setLoading(false)); }, [fetchMembers]);

  // Sidebar stats (cursos / posts)
  useEffect(() => {
    Promise.all([
      api.get('/classroom/courses/').catch(() => ({ data: [] })),
      api.get('/community/posts/').catch(() => ({ data: [] })),
    ]).then(([c, p]) => {
      const cArr = Array.isArray(c.data) ? c.data : (c.data.results || []);
      const pArr = Array.isArray(p.data) ? p.data : (p.data.results || []);
      setCourseCount(c.data.count ?? cArr.length);
      setPostCount(p.data.count ?? pArr.length);
      setLoadingStats(false);
    });
  }, []);

  // Debounced search
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => fetchMembers(search, activeTab, 1).finally(() => setLoading(false)), 400);
    return () => clearTimeout(timer);
  }, [search, activeTab, fetchMembers]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchMembers(search, activeTab, page + 1).finally(() => setLoadingMore(false));
  };

  const handleTabClick = (role) => {
    setActiveTab(role);
    setLoading(true);
  };

  return (
    <div className="members-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>
      <style>{`.members-layout { grid-template-columns: 1fr 280px; } @media(max-width:860px){.members-layout{grid-template-columns:1fr!important}} @media(max-width:860px){.members-sidebar{display:none!important}}`}</style>
      {/* Main column */}
      <div className="a-up">
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 2 }}>Members</h1>
              <p style={{ color: 'var(--txt-3)', fontSize: 13 }}>
                {loading ? 'Cargando...' : `${total} miembros`}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg
              viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--txt-3)', pointerEvents: 'none' }}
            >
              <circle cx="8.5" cy="8.5" r="5.5" /><path d="M13.5 13.5L18 18" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Buscar miembros..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg-2)', border: '1px solid var(--line)',
                borderRadius: 'var(--r3)', padding: '9px 14px 9px 36px',
                color: 'var(--txt-1)', fontSize: 14, outline: 'none',
                transition: 'border-color var(--t1)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--line)'}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(tab => (
              <button
                key={tab.role}
                onClick={() => handleTabClick(tab.role)}
                style={{
                  padding: '6px 14px',
                  background: activeTab === tab.role ? 'var(--gold-dim)' : 'var(--bg-2)',
                  border: `1px solid ${activeTab === tab.role ? 'var(--gold-border)' : 'var(--line)'}`,
                  borderRadius: 'var(--r3)',
                  fontSize: 13, fontWeight: activeTab === tab.role ? 700 : 500,
                  color: activeTab === tab.role ? 'var(--gold)' : 'var(--txt-2)',
                  cursor: 'pointer', transition: 'all var(--t1)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members list */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
              Cargando miembros...
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, display: 'inline-block', color: 'var(--txt-3)' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ color: 'var(--txt-3)', fontSize: 14 }}>No se encontraron miembros</p>
            </div>
          ) : (
            members.map((m, idx) => (
              <MemberRow
                key={m.id}
                member={m}
                onClick={() => navigate(`/profile/${m.id}`)}
              />
            ))
          )}
        </div>

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: '9px 22px', background: 'var(--bg-2)', border: '1px solid var(--line)',
                borderRadius: 'var(--r3)', color: 'var(--txt-2)', fontSize: 13, fontWeight: 600,
                cursor: loadingMore ? 'default' : 'pointer', transition: 'all var(--t1)',
              }}
              onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="a-up members-sidebar">
        <CommunitySidebar
          memberCount={total}
          courseCount={courseCount}
          postCount={postCount}
          recentMembers={members}
          loadingStats={loadingStats}
        />
      </div>
    </div>
  );
}
