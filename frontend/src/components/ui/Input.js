import React, { useState } from 'react';

export default function Input({ label, error, hint, style, icon, textarea, rows = 4, ...props }) {
  const [focused, setFocused] = useState(false);
  const Tag = textarea ? 'textarea' : 'input';

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: `1.5px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    padding: icon ? '10px 14px 10px 38px' : '10px 14px',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(248,113,113,0.12)' : 'var(--accent-glow)'}` : 'none',
    resize: textarea ? 'vertical' : undefined,
    fontFamily: 'inherit',
    lineHeight: 1.6,
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, color: focused ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.15s' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: focused ? 'var(--accent)' : 'var(--text-muted)', fontSize: 16, pointerEvents: 'none',
          }}>{icon}</span>
        )}
        <Tag
          rows={textarea ? rows : undefined}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>⚠ {error}</span>}
      {hint && !error && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}
