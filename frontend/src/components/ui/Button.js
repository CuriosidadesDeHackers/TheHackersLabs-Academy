import React from 'react';

const variants = {
  primary: {
    base: { background: 'var(--accent)', color: '#000', border: '1px solid transparent', fontWeight: 700 },
    hover: { background: 'var(--accent-hover)', boxShadow: 'var(--shadow-accent)' },
  },
  secondary: {
    base: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontWeight: 500 },
    hover: { background: 'var(--bg-card-hover)', borderColor: '#3a3a3e' },
  },
  danger: {
    base: { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)', fontWeight: 600 },
    hover: { background: 'rgba(248,113,113,0.14)', borderColor: 'rgba(248,113,113,0.4)' },
  },
  ghost: {
    base: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent', fontWeight: 500 },
    hover: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border)' },
  },
  accent: {
    base: { background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontWeight: 600 },
    hover: { background: 'rgba(245,166,35,0.22)', borderColor: 'rgba(245,166,35,0.6)' },
  },
};

const sizes = {
  xs: { padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-xs)', gap: 4 },
  sm: { padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)', gap: 5 },
  md: { padding: '9px 18px', fontSize: '14px', borderRadius: 'var(--radius-sm)', gap: 6 },
  lg: { padding: '12px 24px', fontSize: '15px', borderRadius: 'var(--radius-md)', gap: 8 },
};

export default function Button({
  children, variant = 'primary', size = 'md',
  style: extraStyle, disabled, loading, icon, ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...v.base,
        ...(hovered && !disabled ? v.hover : {}),
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: s.borderRadius,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...extraStyle,
      }}
      {...props}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14, border: '2px solid currentColor',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite', display: 'inline-block',
        }} />
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
          {icon}{children}
        </span>
      ) : children}
    </button>
  );
}
