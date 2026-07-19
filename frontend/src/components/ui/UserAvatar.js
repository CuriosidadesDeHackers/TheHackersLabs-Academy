import React from 'react';

const COLORS = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#f472b6','#818cf8','#fbbf24'];

export default function UserAvatar({ user, size = 36 }) {
  const initials = ((user?.first_name?.[0] || '') + (user?.username?.[0] || '')).toUpperCase() || '?';
  const bg = COLORS[(user?.id || 0) % COLORS.length];
  if (user?.avatar_url)
    return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${bg},${bg}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: '#000', flexShrink: 0 }}>
      {initials}
    </div>
  );
}
