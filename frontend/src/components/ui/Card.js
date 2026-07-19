import React from 'react';

export default function Card({ children, style, hoverable, onClick, glass, ...props }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      style={{
        background: glass
          ? 'rgba(28,28,30,0.8)'
          : hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered && hoverable ? '#333336' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered && hoverable ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered && hoverable ? 'var(--shadow)' : 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        backdropFilter: glass ? 'blur(12px)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
