/**
 * SiteBrand — renders the platform name from global site settings.
 * Usage: <SiteBrand /> → "The Hackers Labs Academy" (or whatever is configured)
 */
import React from 'react';
import useSiteStore from '../../store/siteStore';

export default function SiteBrand({ style, dotColor = 'var(--gold)' }) {
  const siteName = useSiteStore(s => s.siteName);
  const dot = siteName.includes('.') ? '.' : '';
  const parts = dot ? siteName.split('.') : [siteName];
  return (
    <span style={style}>
      {parts[0]}
      {dot && <span style={{ color: dotColor }}>{dot}</span>}
      {parts.slice(1).join('.')}
    </span>
  );
}

/**
 * SiteBannerCard — the banner card with configurable background and title.
 * Replaces the hardcoded blue gradient card with "S The Hackers Labs Academy".
 */
export function SiteBannerCard({ height = 90, style }) {
  const bannerImage = useSiteStore(s => s.bannerImage);

  return (
    <div style={{
      height,
      background: bannerImage
        ? `url(${bannerImage}) center/cover no-repeat`
        : 'linear-gradient(135deg,#1a237e 0%,#283593 60%,#1565c0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* Slight dark overlay when there's an image for readability */}
      {bannerImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>
          <SiteBrand dotColor="var(--gold)" />
        </span>
      </div>
    </div>
  );
}
