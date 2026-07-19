import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import useSiteStore from '../store/siteStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SiteBannerCard } from '../components/ui/SiteBrand';
import Spinner from '../components/ui/Spinner';

/* ─── helpers ────────────────────────────────────── */
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  if (m < 1440) return `hace ${Math.floor(m/60)}h`;
  return `hace ${Math.floor(m/1440)}d`;
}

function buildCommentTree(comments) {
  const byParent = {};
  comments.forEach(c => {
    const key = c.parent || 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  const attach = (list) => list.map(c => ({ ...c, children: byParent[c.id] ? attach(byParent[c.id]) : [] }));
  return attach(byParent.root || []);
}

function CommentItem({ c, currentUser, isAdmin, onDelete, onReply, depth = 0 }) {
  const canDel = currentUser?.id === c.author?.id || isAdmin;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 9 }}>
        <Avatar user={c.author} size={depth ? 24 : 28} />
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--bg-3)', borderRadius: '2px var(--r3) var(--r3) var(--r3)', padding: '9px 12px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-1)' }}>{c.author.username}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--txt-4)' }}>{timeAgo(c.created_at)}</span>
                {canDel && <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 13, lineHeight: 1, transition: 'color var(--t1)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}>🗑</button>}
              </div>
            </div>
            {c.content && <p style={{ fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.55, margin: 0 }}>{c.content}</p>}
            {c.image && (
              <a href={c.image} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: c.content ? 8 : 0 }}>
                <img src={c.image} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 'var(--r2)', border: '1px solid var(--line)', display: 'block' }} />
              </a>
            )}
          </div>
          {onReply && (
            <button onClick={() => onReply(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 11, fontWeight: 600, padding: '4px 2px 0', transition: 'color var(--t1)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}>Responder</button>
          )}
        </div>
      </div>
      {c.children?.length > 0 && (
        <div style={{ marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {c.children.map(child => (
            <CommentItem key={child.id} c={child} currentUser={currentUser} isAdmin={isAdmin} onDelete={onDelete} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = 38 }) {
  const s = ((user?.first_name?.[0]||'') + (user?.last_name?.[0]||user?.username?.[0]||'')).toUpperCase() || '?';
  const pal = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#e879f9'];
  const bg  = pal[(user?.id||0) % pal.length];
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }}/>;
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',flexShrink:0,background:`linear-gradient(135deg,${bg},${bg}bb)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*.36,color:'#000',userSelect:'none',boxShadow:'0 0 0 2px var(--bg-2)' }}>
      {s}
    </div>
  );
}

/* ─── Event banner ───────────────────────────────── */
function useCountdown(target) {
  const [diff, setDiff] = useState(() => target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

function EventBanner({ event }) {
  const navigate = useNavigate();
  const now = Date.now();
  const start = new Date(event.start_datetime).getTime();
  const end = event.end_datetime ? new Date(event.end_datetime).getTime() : start + 3600000;
  const isLive = now >= start && now <= end;
  const diff = useCountdown(isLive ? end : start);

  const fmt = (ms) => {
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    if (d > 0)  return `${d}d ${h}h ${String(m).padStart(2,'0')}m`;
    if (h > 0)  return `${h}h ${String(m).padStart(2,'0')}m ${String(sc).padStart(2,'0')}s`;
    return `${String(m).padStart(2,'0')}m ${String(sc).padStart(2,'0')}s`;
  };

  const ECOLORS = { webinar:'#60a5fa', workshop:'#a78bfa', ctf:'#f5a623', meetup:'#4ade80', other:'#9ca3af' };
  const color = ECOLORS[event.event_type] || '#9ca3af';
  const countdown = fmt(diff);

  return (
    <div
      onClick={() => navigate('/calendar')}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
        background: isLive ? `linear-gradient(90deg, rgba(220,38,38,0.12), rgba(220,38,38,0.05))` : `linear-gradient(90deg, ${color}18, ${color}08)`,
        border: `1px solid ${isLive ? 'rgba(220,38,38,0.4)' : `${color}44`}`,
        borderRadius: 'var(--r3)', marginBottom: 16, cursor: 'pointer',
        transition: 'all var(--t1)',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {/* Left: icon */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {isLive ? '📡' : '📅'}
      </span>

      {/* Middle: info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isLive ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: '#dc2626', borderRadius: 20, fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', boxShadow: '0 0 12px rgba(220,38,38,0.5)', animation: 'live-pulse 1.8s ease-in-out infinite' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse-dot 1s infinite' }} />
              LIVE
            </span>
          ) : (
            <span style={{ padding: '2px 8px', background: `${color}33`, borderRadius: 20, fontSize: 11, fontWeight: 700, color, letterSpacing: '0.04em' }}>PRÓXIMO</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
        </div>
      </div>

      {/* Right: countdown */}
      {countdown && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>
            {isLive ? 'termina en' : 'empieza en'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: isLive ? '#dc2626' : color, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>
            {countdown}
          </div>
        </div>
      )}

      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  );
}

/* ─── Category tabs ──────────────────────────────── */
function CategoryTabs({ categories, active, onSelect }) {
  return (
    <div className="cat-tabs" style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 16, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
      <style>{`.cat-tabs::-webkit-scrollbar{display:none}.cat-tabs{-webkit-overflow-scrolling:touch}`}</style>
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: '6px 14px', borderRadius: 20, border: `1px solid ${active === null ? 'var(--gold)' : 'var(--line)'}`,
          background: active === null ? 'var(--gold-dim)' : 'var(--bg-2)',
          color: active === null ? 'var(--gold)' : 'var(--txt-2)',
          fontSize: 13, fontWeight: active === null ? 700 : 500, cursor: 'pointer',
          transition: 'all var(--t1)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          style={{
            padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${active === cat.id ? cat.color : 'var(--line)'}`,
            background: active === cat.id ? `${cat.color}22` : 'var(--bg-2)',
            color: active === cat.id ? cat.color : 'var(--txt-2)',
            fontSize: 13, fontWeight: active === cat.id ? 700 : 500, cursor: 'pointer',
            transition: 'all var(--t1)', whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
          <span style={{ fontSize: 14 }}>{cat.icon}</span>
          {cat.name}
        </button>
      ))}
    </div>
  );
}

/* ─── GIPHY picker ───────────────────────────────── */
const GIPHY_API_KEY = 'x3P7ZxVr9BS9HKSY9SodOl5PtBPQnArV';

function GifPicker({ onPick, onClose, anchorRect }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const url = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`;
      fetch(url)
        .then(r => r.json())
        .then(data => setGifs(data.data || []))
        .catch(() => setGifs([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const pick = async (gif) => {
    setPicking(true);
    try {
      const gifUrl = gif.images.original.url;
      const res = await fetch(gifUrl);
      const blob = await res.blob();
      const file = new File([blob], `${gif.id}.gif`, { type: 'image/gif' });
      onPick(file);
    } catch {
      // si falla la descarga, simplemente no se adjunta
    } finally {
      setPicking(false);
      onClose();
    }
  };

  const top = anchorRect ? Math.min(anchorRect.bottom + 8, window.innerHeight - 420) : 80;
  const left = anchorRect ? Math.max(12, Math.min(anchorRect.left, window.innerWidth - 332)) : 12;

  const picker = (
    <div className="anim-fade-down" style={{
      position: 'fixed', top, left,
      width: 320, maxHeight: 380, background: 'var(--bg-2)', border: '1px solid var(--line-2)',
      borderRadius: 'var(--r4)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)', zIndex: 500,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar GIFs..."
          style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '7px 12px', fontSize: 13, color: 'var(--txt-1)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading || picking ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner /></div>
        ) : gifs.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: 20 }}>Sin resultados.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {gifs.map(gif => (
              <img
                key={gif.id}
                src={gif.images.fixed_height_small.url}
                alt={gif.title || 'gif'}
                onClick={() => pick(gif)}
                style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 'var(--r2)', cursor: 'pointer', display: 'block' }}
              />
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--txt-4)', fontStyle: 'italic' }}>Powered by</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--txt-2)', letterSpacing: '-0.3px' }}>GIPHY</span>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 499 }} />
      {picker}
    </>,
    document.body
  );
}

/* ─── Post composer ──────────────────────────────── */
function Composer({ user, categories, onSuccess }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState({ title: '', content: '', category_id: '' });
  const [files, setFiles]     = useState([]);   // { file, preview, name }
  const [posting, setPosting] = useState(false);
  const [error, setError]     = useState('');
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifAnchorRect, setGifAnchorRect] = useState(null);
  const textRef  = useRef(null);
  const fileRef  = useRef(null);

  const close = () => {
    setOpen(false);
    setForm({ title: '', content: '', category_id: '' });
    setFiles([]);
    setError('');
  };

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...picked.map(f => ({ file: f, name: f.name }))]);
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!form.content.trim()) { setError('El contenido es obligatorio.'); return; }
    setError(''); setPosting(true);
    try {
      const body = { content: form.content };
      if (form.title.trim()) body.title = form.title;
      if (form.category_id) body.category_id = form.category_id;
      const { data: post } = await api.post('/community/posts/', body);
      // Upload attachments sequentially
      for (const { file, name } of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('name', name);
        await api.post(`/community/posts/${post.id}/attachments/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      close(); onSuccess();
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.content?.[0] || 'Error al publicar.');
    } finally { setPosting(false); }
  };

  const isImg = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', marginBottom: 16, overflow: 'hidden', transition: 'box-shadow var(--t-mid)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      {!open ? (
        <button onClick={() => { setOpen(true); setTimeout(() => textRef.current?.focus(), 50); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'text', textAlign: 'left' }}>
          <Avatar user={user} size={36} />
          <span style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 20, padding: '9px 16px', color: 'var(--txt-3)', fontSize: 14, transition: 'all var(--t-mid)', pointerEvents: 'none' }}>
            ¿Qué quieres compartir con la comunidad?
          </span>
        </button>
      ) : (
        <div className="anim-fade-scale" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <Avatar user={user} size={36} />
            <span style={{ fontSize: 14, fontWeight: 700, alignSelf: 'center' }}>{user?.first_name || user?.username}</span>
          </div>

          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título (opcional)"
            style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '6px 0', fontSize: 17, fontWeight: 700, color: 'var(--txt-1)', outline: 'none', marginBottom: 10, transition: 'border-color var(--t-mid)' }}
            onFocus={e => e.target.style.borderBottomColor = 'var(--gold)'} onBlur={e => e.target.style.borderBottomColor = 'var(--line)'}
          />
          {/* Category selector */}
          {categories?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {categories.map(cat => (
                <button key={cat.id} type="button" onClick={() => setForm(f => ({ ...f, category_id: f.category_id === cat.id ? '' : cat.id }))}
                  style={{ padding: '4px 11px', borderRadius: 20, border: `1px solid ${form.category_id === cat.id ? cat.color : 'var(--line)'}`, background: form.category_id === cat.id ? `${cat.color}22` : 'transparent', color: form.category_id === cat.id ? cat.color : 'var(--txt-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all var(--t1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>
          )}
          <textarea ref={textRef} value={form.content} onChange={e => { setForm({ ...form, content: e.target.value }); setError(''); }}
            placeholder="Comparte algo útil con la comunidad..." rows={4}
            style={{ width: '100%', background: 'none', border: 'none', padding: '6px 0', fontSize: 14, color: 'var(--txt-1)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.7, marginBottom: 14 }}
          />

          {/* Attached files preview */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {files.map(({ file, name }, i) => (
                <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', maxWidth: 220 }}>
                  <span style={{ fontSize: 16 }}>{isImg(name) ? '🖼' : '📎'}</span>
                  <span style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 15, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}>×</button>
                </div>
              ))}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            {/* Attach button */}
            <label title="Adjuntar ficheros" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', transition: 'all var(--t1)', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-2)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              Adjuntar
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={addFiles} />
            </label>

            {/* GIF button */}
            <div style={{ flexShrink: 0 }}>
              <button type="button" title="Adjuntar GIF"
                onClick={(e) => { setGifAnchorRect(e.currentTarget.getBoundingClientRect()); setGifPickerOpen(v => !v); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: gifPickerOpen ? 'var(--bg-4)' : 'var(--bg-3)', border: `1px solid ${gifPickerOpen ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 700, color: gifPickerOpen ? 'var(--gold)' : 'var(--txt-2)', cursor: 'pointer', transition: 'all var(--t1)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { if (!gifPickerOpen) { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-2)'; } }}>
                GIF
              </button>
              {gifPickerOpen && (
                <GifPicker
                  anchorRect={gifAnchorRect}
                  onPick={(file) => setFiles(prev => [...prev, { file, name: file.name }])}
                  onClose={() => setGifPickerOpen(false)}
                />
              )}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={close} style={{ padding: '7px 16px', background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--r2)', fontSize: 13, color: 'var(--txt-2)', cursor: 'pointer', fontWeight: 500, transition: 'all var(--t-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-2)'; }}>
              Cancelar
            </button>
            <button onClick={submit} disabled={posting || !form.content.trim()}
              style={{ padding: '7px 20px', background: posting || !form.content.trim() ? 'var(--bg-4)' : 'var(--gold)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: posting || !form.content.trim() ? 'var(--txt-4)' : '#000', cursor: posting || !form.content.trim() ? 'not-allowed' : 'pointer', transition: 'all var(--t-mid) var(--ease)' }}>
              {posting ? '...' : '✉ Publicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Post card ──────────────────────────────────── */
/* ─── Post Modal ─────────────────────────────────── */
function PostModal({ postId, onClose, currentUser, isAdmin, onRefresh }) {
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const commentFileRef = useRef(null);

  const pickCommentImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(file);
    setCommentImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const load = useCallback(() => {
    api.get(`/community/posts/${postId}/`)
      .then(r => { setPost(r.data); setLiked(r.data.is_liked); setLikes(r.data.likes_count); })
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next); setLikes(l => next ? l + 1 : l - 1);
    try { await api.post(`/community/posts/${postId}/like/`); }
    catch { setLiked(!next); setLikes(l => next ? l - 1 : l + 1); }
  };

  const handleComment = async () => {
    if (!newComment.trim() && !commentImage) return;
    setSubmitting(true);
    try {
      if (commentImage) {
        const fd = new FormData();
        fd.append('content', newComment);
        fd.append('image', commentImage);
        if (replyTo) fd.append('parent', replyTo.id);
        await api.post(`/community/posts/${postId}/comments/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post(`/community/posts/${postId}/comments/`, { content: newComment, ...(replyTo ? { parent: replyTo.id } : {}) });
      }
      setNewComment('');
      setCommentImage(null);
      setCommentImagePreview(null);
      setReplyTo(null);
      load();
      onRefresh();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (cId) => {
    if (!window.confirm('¿Eliminar comentario?')) return;
    await api.delete(`/community/comments/${cId}/`);
    load(); onRefresh();
  };

  const handleDeletePost = async () => {
    if (!window.confirm('¿Eliminar publicación?')) return;
    await api.delete(`/community/posts/${postId}/`);
    onClose(); onRefresh();
  };

  const isOwner = currentUser?.id === post?.author?.id;

  return createPortal((
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px 24px', overflowY: 'auto' }}
    >
      <div style={{ width: '100%', maxWidth: 680, background: 'var(--bg-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r4)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'a-up .18s var(--ease) both' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => { onClose(); navigate(`/community/posts/${postId}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--r2)', transition: 'all var(--t1)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--txt-3)'; e.currentTarget.style.background = 'none'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Ver publicación completa
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--r2)', background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--t1)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt-3)', fontSize: 14 }}>Cargando…</div>
        ) : !post ? null : (
          <>
            {/* Post body */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              {post.is_pinned && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 11 }}>📌</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em' }}>PUBLICACIÓN FIJADA</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <Avatar user={post.author} size={40} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt-1)' }}>
                      {post.author.first_name || post.author.username}{post.author.last_name ? ' ' + post.author.last_name : ''}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>@{post.author.username}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt-4)' }}>{timeAgo(post.created_at)}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {isAdmin && <ActionBtn onClick={async () => { await api.post(`/community/posts/${postId}/pin/`); load(); onRefresh(); }} active={post.is_pinned} title={post.is_pinned ? 'Desfijar' : 'Fijar'}>📌</ActionBtn>}
                  {(isOwner || isAdmin) && <ActionBtn onClick={handleDeletePost} danger title="Eliminar">🗑</ActionBtn>}
                </div>
              </div>

              {(() => {
                const imageAtts = (post.attachments || []).filter(att => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name));
                return (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {post.title && <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 10, lineHeight: 1.3, letterSpacing: '-0.3px' }}>{post.title}</h2>}
                      <div className="lesson-md" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 16 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                      </div>
                    </div>
                    {imageAtts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        {imageAtts.map(att => (
                          <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={att.file_url} alt={att.name} style={{ height: 200, width: 200, objectFit: 'contain', borderRadius: 'var(--r3)', border: '1px solid var(--line)', display: 'block', background: 'var(--bg-3)' }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 2, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <button onClick={handleLike}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r2)', background: liked ? 'rgba(248,113,113,0.1)' : 'none', border: liked ? '1px solid rgba(248,113,113,0.25)' : '1px solid transparent', color: liked ? '#f87171' : 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all var(--t1)' }}>
                  <span style={{ fontSize: 15 }}>{liked ? '❤️' : '🤍'}</span>{likes}
                </button>
                <button onClick={() => inputRef.current?.focus()}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r2)', background: 'none', border: '1px solid transparent', color: 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <span style={{ fontSize: 15 }}>💬</span>{post.comments_count}
                </button>
              </div>
            </div>

            {/* Non-image attachments in modal */}
            {post.attachments?.filter(att => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name)).length > 0 && (
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {post.attachments.filter(att => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name)).map(att => (
                  <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', textDecoration: 'none', fontSize: 13, color: 'var(--txt-1)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                    {att.file_size_display && <span style={{ fontSize: 11, color: 'var(--txt-3)', flexShrink: 0 }}>{att.file_size_display}</span>}
                  </a>
                ))}
              </div>
            )}

            {/* Comments */}
            <div style={{ padding: '16px 24px', maxHeight: 340, overflowY: 'auto' }}>
              {post.comments.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--txt-4)', textAlign: 'center', padding: '12px 0' }}>Sé el primero en comentar ✨</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                  {buildCommentTree(post.comments).map(c => (
                    <CommentItem key={c.id} c={c} currentUser={currentUser} isAdmin={isAdmin} onDelete={handleDeleteComment} onReply={c => { setReplyTo(c); inputRef.current?.focus(); }} />
                  ))}
                </div>
              )}
            </div>

            {/* Comment input */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--line)' }}>
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 39, fontSize: 12, color: 'var(--txt-3)' }}>
                  Respondiendo a <strong style={{ color: 'var(--txt-1)' }}>{replyTo.author.username}</strong>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 12 }}>× Cancelar</button>
                </div>
              )}
              {commentImagePreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 39 }}>
                  <img src={commentImagePreview} alt="" style={{ height: 56, width: 56, objectFit: 'contain', borderRadius: 'var(--r2)', border: '1px solid var(--line)', background: 'var(--bg-3)' }} />
                  <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 13 }}>× Quitar</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <Avatar user={currentUser} size={30} />
                <div style={{ flex: 1, display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden', transition: 'border-color var(--t1)' }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                  <input
                    ref={inputRef}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } if (e.key === 'Escape') setReplyTo(null); }}
                    placeholder={replyTo ? `Responder a ${replyTo.author.username}...` : "Escribe un comentario..."}
                    style={{ flex: 1, background: 'none', border: 'none', padding: '9px 14px', color: 'var(--txt-1)', fontSize: 13, outline: 'none' }}
                  />
                  <label title="Adjuntar imagen o GIF" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    🖼
                    <input ref={commentFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCommentImage} />
                  </label>
                  <button onClick={handleComment} disabled={submitting || (!newComment.trim() && !commentImage)}
                    style={{ padding: '0 16px', background: (newComment.trim() || commentImage) ? 'var(--gold)' : 'transparent', border: 'none', color: (newComment.trim() || commentImage) ? '#000' : 'var(--txt-4)', fontWeight: 700, fontSize: 15, cursor: (newComment.trim() || commentImage) ? 'pointer' : 'default', transition: 'all var(--t1)' }}>
                    {submitting ? '…' : '↑'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  ), document.body);
}

function PostCard({ post, onRefresh, onOpenModal, currentUser, isAdmin }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [hov, setHov] = useState(false);
  const commentInputRef = useRef(null);
  const isOwner = currentUser?.id === post.author?.id;

  const handleLike = async () => {
    const next = !liked;
    setLiked(next); setLikes(l => next ? l + 1 : l - 1);
    try { await api.post(`/community/posts/${post.id}/like/`); }
    catch { setLiked(!next); setLikes(l => next ? l - 1 : l + 1); }
  };

  const handlePin = async () => { await api.post(`/community/posts/${post.id}/pin/`); onRefresh(); };
  const handleDelete = async () => { if (!window.confirm('¿Eliminar publicación?')) return; await api.delete(`/community/posts/${post.id}/`); onRefresh(); };
  const handleDeleteComment = async (cId) => { if (!window.confirm('¿Eliminar comentario?')) return; await api.delete(`/community/comments/${cId}/`); onRefresh(); };

  const pickCommentImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(file);
    setCommentImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleComment = async () => {
    if (!newComment.trim() && !commentImage) return;
    setSubmitting(true);
    try {
      if (commentImage) {
        const fd = new FormData();
        fd.append('content', newComment);
        fd.append('image', commentImage);
        if (replyTo) fd.append('parent', replyTo.id);
        await api.post(`/community/posts/${post.id}/comments/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post(`/community/posts/${post.id}/comments/`, { content: newComment, ...(replyTo ? { parent: replyTo.id } : {}) });
      }
      setNewComment('');
      setCommentImage(null);
      setCommentImagePreview(null);
      setReplyTo(null);
      onRefresh();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="anim-fade-up"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'var(--bg-2)', border: `1px solid ${hov ? 'var(--line-2)' : 'var(--line)'}`, borderRadius: 'var(--r4)', overflow: 'hidden', marginBottom: 10, transition: 'border-color var(--t-mid), box-shadow var(--t-mid)', boxShadow: hov ? 'var(--shadow-2)' : 'var(--shadow-1)' }}>

      {/* Pin stripe */}
      {post.is_pinned && (
        <div style={{ background: 'linear-gradient(90deg, rgba(245,166,35,0.12), transparent)', borderBottom: '1px solid rgba(245,166,35,0.2)', padding: '5px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11 }}>📌</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em' }}>PUBLICACIÓN FIJADA</span>
        </div>
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <Avatar user={post.author} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{post.author.first_name || post.author.username}{post.author.last_name ? ' ' + post.author.last_name : ''}</span>
              <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>@{post.author.username}</span>
              {post.category && (
                <span style={{ padding: '2px 9px', borderRadius: 20, border: `1px solid ${post.category.color}55`, background: `${post.category.color}18`, color: post.category.color, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 12 }}>{post.category.icon}</span>{post.category.name}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--txt-4)', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
              {/* Admin/owner actions */}
              <div style={{ display: 'flex', gap: 3 }}>
                {isAdmin && <ActionBtn onClick={handlePin} active={post.is_pinned} title={post.is_pinned ? 'Desfijar' : 'Fijar'}>📌</ActionBtn>}
                {(isOwner || isAdmin) && <ActionBtn onClick={handleDelete} danger title="Eliminar">🗑</ActionBtn>}
              </div>
            </div>

            {(() => {
              const imageAtts = (post.attachments || []).filter(att => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name));
              const fileAtts = (post.attachments || []).filter(att => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name));
              return (
                <>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div onClick={() => onOpenModal(post.id)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                      {post.title && <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 7, lineHeight: 1.3, letterSpacing: '-0.2px', color: 'var(--txt-1)', transition: 'color var(--t1)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-1)'}
                      >{post.title}</h3>}
                      <p style={{ fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                    </div>
                    {imageAtts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {imageAtts.map(att => (
                          <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <img src={att.file_url} alt={att.name} style={{ height: 150, width: 150, objectFit: 'contain', borderRadius: 'var(--r3)', border: '1px solid var(--line)', display: 'block', background: 'var(--bg-3)' }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Non-image attachments */}
                  {fileAtts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {fileAtts.map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', textDecoration: 'none', fontSize: 12, color: 'var(--txt-2)' }}>
                          📎 <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <button onClick={handleLike}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r2)', background: liked ? 'rgba(248,113,113,0.1)' : 'none', border: liked ? '1px solid rgba(248,113,113,0.25)' : '1px solid transparent', color: liked ? '#f87171' : 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all var(--t-fast) var(--ease)' }}
                onMouseEnter={e => { if (!liked) { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.color = '#f87171'; } e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { if (!liked) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-3)'; } e.currentTarget.style.transform = 'scale(1)'; }}>
                <span style={{ fontSize: 15, animation: liked ? 'heartbeat 0.6s ease' : 'none' }}>{liked ? '❤️' : '🤍'}</span>
                {likes}
              </button>
              <button onClick={() => setShowComments(!showComments)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r2)', background: showComments ? 'var(--bg-3)' : 'none', border: showComments ? '1px solid var(--line)' : '1px solid transparent', color: showComments ? 'var(--txt-1)' : 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all var(--t-fast)' }}
                onMouseEnter={e => { if (!showComments) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt-1)'; } }}
                onMouseLeave={e => { if (!showComments) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-3)'; } }}>
                <span style={{ fontSize: 15 }}>💬</span>{post.comments_count}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments inline */}
      {showComments && (
        <div className="anim-fade-up" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)', padding: '14px 18px 16px' }}>
          {post.comments.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--txt-4)', textAlign: 'center', padding: '8px 0 12px' }}>Sé el primero en comentar ✨</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {buildCommentTree(post.comments).map(c => (
              <CommentItem key={c.id} c={c} currentUser={currentUser} isAdmin={isAdmin} onDelete={handleDeleteComment} onReply={c => { setReplyTo(c); commentInputRef.current?.focus(); }} />
            ))}
          </div>
          {/* Comment input */}
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 37, fontSize: 12, color: 'var(--txt-3)' }}>
              Respondiendo a <strong style={{ color: 'var(--txt-1)' }}>{replyTo.author.username}</strong>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 12 }}>× Cancelar</button>
            </div>
          )}
          {commentImagePreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 37 }}>
              <img src={commentImagePreview} alt="" style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: 'var(--r2)', border: '1px solid var(--line)', background: 'var(--bg-3)' }} />
              <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 12 }}>× Quitar</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <Avatar user={currentUser} size={28} />
            <div style={{ flex: 1, display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden', transition: 'border-color var(--t-fast)' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--line)'}>
              <input ref={commentInputRef} value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } if (e.key === 'Escape') setReplyTo(null); }}
                placeholder={replyTo ? `Responder a ${replyTo.author.username}...` : "Escribe un comentario..."} style={{ flex: 1, background: 'none', border: 'none', padding: '8px 14px', color: 'var(--txt-1)', fontSize: 13, outline: 'none' }} />
              <label title="Adjuntar imagen o GIF" style={{ display: 'flex', alignItems: 'center', padding: '0 9px', cursor: 'pointer', color: 'var(--txt-3)' }}>
                🖼
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCommentImage} />
              </label>
              <button onClick={handleComment} disabled={submitting || (!newComment.trim() && !commentImage)}
                style={{ padding: '0 14px', background: (newComment.trim() || commentImage) ? 'var(--gold)' : 'transparent', border: 'none', color: (newComment.trim() || commentImage) ? '#000' : 'var(--txt-4)', fontWeight: 700, fontSize: 14, cursor: (newComment.trim() || commentImage) ? 'pointer' : 'default', transition: 'all var(--t-mid) var(--ease)' }}>
                {submitting ? '…' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, active, danger, title }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 26, height: 26, borderRadius: 'var(--r1)', background: h ? (danger ? 'rgba(248,113,113,0.1)' : 'var(--bg-3)') : active ? 'var(--gold-dim)' : 'transparent', border: `1px solid ${h || active ? (danger ? 'rgba(248,113,113,0.3)' : 'var(--line)') : 'transparent'}`, cursor: 'pointer', color: h ? (danger ? 'var(--red)' : 'var(--txt-1)') : active ? 'var(--gold)' : 'var(--txt-3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--t-fast)' }}>
      {children}
    </button>
  );
}

/* ─── Community sidebar ──────────────────────────── */
export function CommunitySidebar({ memberCount, courseCount, postCount, recentMembers, loadingStats }) {
  const colors = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c'];
  const [onlineMembers, setOnlineMembers] = useState([]);
  const { user, membership } = useAuthStore();
  const { communityDescription } = useSiteStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const hasMembership = membership?.is_active || user?.role === 'admin' || user?.role === 'instructor';

  useEffect(() => {
    api.get('/auth/members/?online=true').then(r => {
      const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
      setOnlineMembers(list);
    }).catch(() => {});
  }, []);

  // Use online members if any, fall back to recent members
  const displayList = onlineMembers.length > 0 ? onlineMembers : recentMembers;
  const isShowingOnline = onlineMembers.length > 0;
  const shown = displayList.slice(0, 8);
  const overflow = isShowingOnline ? onlineMembers.length - shown.length : memberCount - shown.length;

  return (
    <div style={{ position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Main card */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', boxShadow: 'var(--s1)' }}>
        {/* Banner */}
        <SiteBannerCard height={90} />

        <div style={{ padding: '16px 16px 20px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 18, textAlign: 'center' }}>
            {[
              { v: loadingStats ? '—' : courseCount, l: 'Cursos' },
              { v: loadingStats ? '—' : postCount,   l: 'Posts' },
            ].map(({ v, l }) => (
              <div key={l} style={{ background: 'var(--bg-3)', borderRadius: 'var(--r2)', padding: '10px 4px' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)', lineHeight: 1, letterSpacing: '-0.5px' }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Online now / recent members */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {isShowingOnline && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)', animation: 'pulse-dot 2s infinite' }} />
            )}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
              {isShowingOnline ? `Online ahora (${onlineMembers.length})` : 'Últimos miembros'}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {shown.map(m => (
              <div key={m.id} title={m.first_name || m.username} style={{ position: 'relative' }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-2)' }} />
                  : <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${colors[m.id % colors.length]},${colors[m.id % colors.length]}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#000', border: '2px solid var(--bg-2)' }}>
                      {((m.first_name?.[0] || '') + (m.username?.[0] || '')).toUpperCase() || '?'}
                    </div>
                }
                {isShowingOnline && (
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid var(--bg-2)', display: 'block' }} />
                )}
              </div>
            ))}
            {overflow > 0 && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-4)', border: '2px solid var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)' }}>
                +{overflow}
              </div>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 14, lineHeight: 1.55 }}>
            {communityDescription}
          </p>

          {/* CTA */}
          {hasMembership ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" fill="rgba(74,222,128,0.15)"/>
                  <path d="M8 12l3 3 5-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Ya eres miembro</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{ width: '100%', background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '9px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all var(--t1)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-3)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                  Ajustes
                </button>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 10, lineHeight: 1.5 }}>
                Activa tu membresía para acceder a todos los cursos.
              </p>
              <button
                onClick={() => navigate('/membership')}
                style={{ width: '100%', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '11px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'background var(--t1)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}
              >
                Ver planes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function Community() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activePostId, setActivePostId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [nextEvent, setNextEvent] = useState(null);
  const isAdmin = user?.role === 'admin' || user?.is_staff;

  useEffect(() => {
    api.get('/community/categories/').then(r => setCategories(r.data.results || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/events/').then(r => {
      const events = r.data.results || r.data;
      const now = Date.now();
      // first: events happening right now
      const live = events.find(e => {
        const s = new Date(e.start_datetime).getTime();
        const en = e.end_datetime ? new Date(e.end_datetime).getTime() : s + 3600000;
        return now >= s && now <= en;
      });
      if (live) { setNextEvent(live); return; }
      // then: next upcoming
      const upcoming = events
        .filter(e => new Date(e.start_datetime).getTime() > now)
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      setNextEvent(upcoming[0] || null);
    }).catch(() => {});
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1 };
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get('/community/posts/', { params });
      const results = Array.isArray(data) ? data : (data.results || []);
      setPosts(results);
      setPostsTotal(Array.isArray(data) ? results.length : (data.count ?? results.length));
      setPostsHasMore(Array.isArray(data) ? false : !!data.next);
      setPostsPage(1);
    } finally { setLoading(false); }
  }, [activeCategory]);

  const loadMorePosts = async () => {
    setLoadingMore(true);
    try {
      const params = { page: postsPage + 1 };
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get('/community/posts/', { params });
      const results = Array.isArray(data) ? data : (data.results || []);
      setPosts(prev => [...prev, ...results]);
      setPostsHasMore(Array.isArray(data) ? false : !!data.next);
      setPostsPage(p => p + 1);
    } finally { setLoadingMore(false); }
  };

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    Promise.all([
      api.get('/auth/members/').catch(() => ({ data: [] })),
      api.get('/classroom/courses/').catch(() => ({ data: [] })),
    ]).then(([m, c]) => {
      const mList = Array.isArray(m.data) ? m.data : (m.data.results || []);
      const cArr  = Array.isArray(c.data) ? c.data : (c.data.results || []);
      setMembers(mList);
      setMembersTotal(Array.isArray(m.data) ? mList.length : (m.data.count ?? mList.length));
      setCourseCount(c.data.count || cArr.length);
      setLoadingStats(false);
    });
  }, []);


  return (
    <>
      <div className="community-grid">
      {/* ── Left column ── */}
      <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Community</h1>
        <p style={{ color: 'var(--txt-3)', fontSize: 13, marginTop: 3 }}>{posts.length} publicaciones</p>
      </div>

      {nextEvent && <EventBanner event={nextEvent} />}

      <CategoryTabs categories={categories} active={activeCategory} onSelect={setActiveCategory} />

      <Composer user={user} categories={categories} onSuccess={fetchPosts} />

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', height: 120, animation: 'shimmer 1.5s linear infinite', backgroundImage: 'linear-gradient(90deg, var(--bg-2) 0%, var(--bg-3) 50%, var(--bg-2) 100%)', backgroundSize: '200% 100%' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--txt-3)' }}>
          <div style={{ fontSize: 44, marginBottom: 14, filter: 'grayscale(0.3)' }}>💬</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-2)', marginBottom: 6 }}>No hay publicaciones todavía</p>
          <p style={{ fontSize: 13 }}>¡Sé el primero en compartir algo!</p>
        </div>
      ) : (
        <div className="stagger">{posts.map(p => (
          <PostCard key={p.id} post={p} onRefresh={fetchPosts} onOpenModal={setActivePostId} currentUser={user} isAdmin={isAdmin} />
        ))}</div>
      )}
      {postsHasMore && (
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
          <button
            onClick={loadMorePosts}
            disabled={loadingMore}
            style={{
              padding: '9px 22px', background: 'var(--bg-2)', border: '1px solid var(--line)',
              borderRadius: 'var(--r3)', color: 'var(--txt-2)', fontSize: 13, fontWeight: 600,
              cursor: loadingMore ? 'default' : 'pointer', transition: 'all var(--t1)',
            }}
            onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.borderColor = 'var(--gold)'; }}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
          >
            {loadingMore ? 'Cargando...' : 'Cargar más publicaciones'}
          </button>
        </div>
      )}
      </div>{/* end left column */}

      {/* Post modal — rendered at page level, outside any CSS transform */}
      {activePostId && (
        <PostModal
          postId={activePostId}
          onClose={() => setActivePostId(null)}
          currentUser={user}
          isAdmin={isAdmin}
          onRefresh={() => { setActivePostId(null); fetchPosts(); }}
        />
      )}

      {/* Right sidebar */}
      <div className="community-sidebar">
        <CommunitySidebar
          memberCount={membersTotal}
          courseCount={courseCount}
          postCount={postsTotal}
          recentMembers={members}
          loadingStats={loadingStats}
        />
      </div>
    </div>
    </>
  );
}
