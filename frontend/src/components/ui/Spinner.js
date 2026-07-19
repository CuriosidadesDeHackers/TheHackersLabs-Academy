import React from 'react';

export default function Spinner({ fullscreen, size = 36, label }) {
  const wrap = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12,
    ...(fullscreen
      ? { minHeight: '100vh', background: 'var(--bg-0)' }
      : { padding: '48px 0' }),
  };
  return (
    <div style={wrap}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2.5px solid var(--line)`,
        borderTopColor: 'var(--gold)',
        animation: 'spin 0.75s linear infinite',
      }} />
      {label && <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>{label}</span>}
    </div>
  );
}
