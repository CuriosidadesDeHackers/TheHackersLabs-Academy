import { create } from 'zustand';
import api from '../api/axios';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function lightenHex(hex, amount = 0.14) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyAccentColor(hex) {
  if (!hex || !hex.startsWith('#')) return;
  const rgb = hexToRgb(hex);
  let tag = document.getElementById('accent-color-vars');
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'accent-color-vars';
    document.head.appendChild(tag);
  }
  tag.textContent = `:root {
    --gold: ${hex};
    --gold-2: ${lightenHex(hex)};
    --gold-dim: rgba(${rgb},0.12);
    --gold-border: rgba(${rgb},0.25);
    --gold-glow: 0 0 20px rgba(${rgb},0.2);
  }`;
}

const DEFAULT_COMMUNITY_DESCRIPTION = 'Aprende ciberseguridad con una comunidad activa. Cursos, retos CTF, eventos y networking.';
const CACHE_KEY = 'site_settings_cache';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(settings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch {}
}

const cached = readCache();
if (cached?.accentColor) applyAccentColor(cached.accentColor);

const useSiteStore = create((set) => ({
  siteName: cached?.siteName || 'The Hackers Labs',
  bannerImage: cached?.bannerImage || null,
  accentColor: cached?.accentColor || '#f97316',
  communityDescription: cached?.communityDescription || DEFAULT_COMMUNITY_DESCRIPTION,
  loaded: false,

  fetchSettings: async () => {
    try {
      const { data } = await api.get('/auth/site-settings/');
      const color = data.accent_color || '#f97316';
      applyAccentColor(color);
      const settings = {
        siteName: data.site_name || 'The Hackers Labs',
        bannerImage: data.banner_image || null,
        accentColor: color,
        communityDescription: data.community_description || DEFAULT_COMMUNITY_DESCRIPTION,
      };
      writeCache(settings);
      set({ ...settings, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  updateSettings: (siteName, bannerImage, accentColor, communityDescription) => {
    if (accentColor) applyAccentColor(accentColor);
    set((state) => {
      const next = {
        ...state,
        ...(siteName !== undefined ? { siteName } : {}),
        ...(bannerImage !== undefined ? { bannerImage } : {}),
        ...(accentColor ? { accentColor } : {}),
        ...(communityDescription !== undefined ? { communityDescription } : {}),
      };
      writeCache({
        siteName: next.siteName,
        bannerImage: next.bannerImage,
        accentColor: next.accentColor,
        communityDescription: next.communityDescription,
      });
      return next;
    });
  },
}));

export default useSiteStore;
