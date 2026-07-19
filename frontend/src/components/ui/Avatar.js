import React from 'react';

const GRADIENTS = [
  'linear-gradient(135deg,#f5a623,#c4841a)',
  'linear-gradient(135deg,#60a5fa,#2563eb)',
  'linear-gradient(135deg,#34d399,#059669)',
  'linear-gradient(135deg,#f87171,#dc2626)',
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
  'linear-gradient(135deg,#fb923c,#ea580c)',
  'linear-gradient(135deg,#38bdf8,#0284c7)',
  'linear-gradient(135deg,#4ade80,#16a34a)',
];

function getGradient(str = '') {
  let hash = 0;
  for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function Avatar({ user, size = 36, online }) {
  const name = user?.username || user?.email || '?';
  const initials = user
    ? ((user.first_name?.[0] || '') + (user.last_name?.[0] || user.username?.[0] || '')).toUpperCase() || name[0].toUpperCase()
    : '?';

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: getGradient(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700,
          fontSize: Math.max(10, size * 0.36),
          letterSpacing: '-0.5px',
          userSelect: 'none',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: Math.max(8, size * 0.26), height: Math.max(8, size * 0.26),
          borderRadius: '50%',
          background: online ? 'var(--success)' : 'var(--text-muted)',
          border: `2px solid var(--bg-card)`,
        }} />
      )}
    </div>
  );
}
