import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const PERIODS = [
  { v: 'all',     label: 'Historico' },
  { v: 'monthly', label: 'Este mes' },
  { v: 'weekly',  label: 'Esta semana' },
];

const LEVEL_COLORS = ['','#6b7280','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#f5a623','#ef4444','#14b8a6'];

const ACTIONS = [
  { label: 'Completar leccion', pts: 20 },
  { label: 'Crear post',        pts: 10 },
  { label: 'Comentar',          pts: 5  },
  { label: 'Recibir like',      pts: 2  },
];

function MemberAvatar({ user, size = 40 }) {
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

function RankBadge({ rank }) {
  const styles = {
    1: { color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)' },
    2: { color: '#9ca3af',     background: 'rgba(156,163,175,.12)', border: '1px solid rgba(156,163,175,.3)' },
    3: { color: '#cd7c47',     background: 'rgba(205,124,71,.12)',  border: '1px solid rgba(205,124,71,.3)' },
  };
  const s = styles[rank];
  if (!s) {
    return (
      <span style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--txt-3)', flexShrink: 0 }}>
        #{rank}
      </span>
    );
  }
  return (
    <span style={{ width: 32, textAlign: 'center', fontSize: 12, fontWeight: 800, borderRadius: 'var(--r2)', padding: '2px 0', flexShrink: 0, ...s }}>
      #{rank}
    </span>
  );
}

function RankRow({ entry, rank, maxPts }) {
  const [hovered, setHovered] = useState(false);
  const pct = maxPts > 0 ? (entry.points / maxPts) * 100 : 0;
  const lvlColor = LEVEL_COLORS[entry.user?.level || 1] || 'var(--txt-3)';
  const fullName = entry.user?.first_name
    ? `${entry.user.first_name} ${entry.user.last_name || ''}`.trim()
    : entry.user?.username || 'Usuario';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--line)',
        background: hovered ? 'var(--bg-3)' : rank <= 3 ? 'rgba(245,166,35,0.025)' : 'transparent',
        transition: 'background var(--t1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Rank */}
        <RankBadge rank={rank} />

        {/* Avatar */}
        <MemberAvatar user={entry.user} size={40} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt-1)' }}>{fullName}</span>
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>@{entry.user?.username}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: lvlColor,
              background: `${lvlColor}22`, border: `1px solid ${lvlColor}44`,
              borderRadius: 'var(--r2)', padding: '1px 6px',
            }}>
              Nv.{entry.user?.level || 1}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 2,
              background: rank === 1 ? 'var(--gold)' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7c47' : 'var(--blue)',
              transition: 'width .6s var(--ease)',
            }} />
          </div>
        </div>

        {/* Points */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--gold)' }}>
            {entry.points.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, color: 'var(--txt-3)', marginLeft: 3 }}>pts</span>
        </div>
      </div>
    </div>
  );
}

function PointsPanel({ open, onToggle }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', marginTop: 20 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--txt-1)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Como ganar puntos</span>
        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: 'var(--txt-3)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform var(--t1)' }}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-3)' }}>
                <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Accion</th>
                <th style={{ padding: '8px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((a, i) => (
                <tr key={a.label} style={{ borderTop: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-1)' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: 'var(--txt-2)' }}>{a.label}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>+{a.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Leaderboards() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/leaderboards/', { params: { period } })
      .then(r => {
        const data = r.data || [];
        // Ensure each entry has a `rank` field
        const ranked = data.map((entry, idx) => ({
          ...entry,
          rank: entry.rank ?? idx + 1,
        }));
        setRanking(ranked);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const maxPts = ranking.length > 0 ? Math.max(...ranking.map(e => e.points || 0)) : 1;

  return (
    <div className="a-up">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 2 }}>Leaderboards</h1>
            <p style={{ color: 'var(--txt-3)', fontSize: 13 }}>Ranking de la comunidad</p>
          </div>

          {/* Period tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.v}
                onClick={() => setPeriod(p.v)}
                style={{
                  padding: '6px 14px',
                  background: period === p.v ? 'var(--bg-4)' : 'transparent',
                  border: period === p.v ? '1px solid var(--line)' : '1px solid transparent',
                  borderRadius: 'var(--r2)',
                  fontSize: 13, fontWeight: period === p.v ? 700 : 500,
                  color: period === p.v ? 'var(--txt-1)' : 'var(--txt-3)',
                  cursor: 'pointer', transition: 'all var(--t1)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking list */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
            Cargando ranking...
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--txt-3)', fontSize: 14 }}>No hay datos disponibles</p>
          </div>
        ) : (
          ranking.map((entry, idx) => (
            <RankRow
              key={entry.user?.id ?? idx}
              entry={entry}
              rank={entry.rank}
              maxPts={maxPts}
            />
          ))
        )}
      </div>

      {/* Collapsible "how to earn points" panel */}
      <PointsPanel open={panelOpen} onToggle={() => setPanelOpen(v => !v)} />
    </div>
  );
}
