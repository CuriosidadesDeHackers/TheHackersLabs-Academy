import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosBase from 'axios';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import useSiteStore from '../store/siteStore';
import SiteBrand, { SiteBannerCard } from '../components/ui/SiteBrand';

const PUBLIC_API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/* ── MiniAvatar ─────────────────────────────── */
function MiniAvatar({ user, size = 32 }) {
  const initials = ((user?.first_name?.[0] || '') + (user?.username?.[0] || '')).toUpperCase() || '?';
  const colors = ['#f5a623', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c'];
  const bg = colors[(user?.id || 0) % colors.length];
  if (user?.avatar_url)
    return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${bg},${bg}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: '#000', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

/* ── Video/Image embed ──────────────────────── */
function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}
function getVimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function isImageUrl(url) {
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url);
}

function VideoEmbed({ url, isAdmin, onChange }) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(url);
  const [uploading, setUploading] = useState(false);
  const fileRef                 = useRef(null);
  const inputRef                = useRef(null);

  const ytId    = url ? getYouTubeId(url) : null;
  const vmId    = url ? getVimeoId(url) : null;
  const isImage = url && isImageUrl(url);
  const isDirect = url && !ytId && !vmId && !isImage;
  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : vmId ? `https://player.vimeo.com/video/${vmId}` : null;

  const save = () => { onChange(draft.trim()); setEditing(false); };

  const pickFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/auth/admin/upload-media/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch {
      alert('Error al subir el archivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ marginBottom: 0, borderRadius: 'var(--r4)', overflow: 'hidden', background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-4)', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          {editing ? (
            <>
              <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="URL de YouTube, Vimeo o archivo directo..." autoFocus
                onKeyDown={e => e.key === 'Enter' && save()}
                style={{ flex: 1, minWidth: 0, background: 'var(--bg-2)', border: '1px solid var(--gold)', borderRadius: 'var(--r2)', padding: '5px 10px', color: 'var(--txt-1)', fontSize: 13, outline: 'none' }} />
              <button onClick={save} style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => { setDraft(url); setEditing(false); }} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12, color: 'var(--txt-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url ? (isImage ? '🖼 ' : '🎬 ') + url : 'Sin contenido configurado'}
              </span>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r2)', padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploading ? 'Subiendo…' : '⬆ Subir imagen/video'}
              </button>
              <button onClick={() => { setDraft(url); setEditing(true); }}
                style={{ background: 'transparent', color: 'var(--txt-2)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '4px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                URL
              </button>
              {url && <button onClick={() => onChange('')} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>}
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={pickFile} />
            </>
          )}
        </div>
      )}
      {embedSrc ? (
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe src={embedSrc} title="Presentación" frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>
      ) : isImage ? (
        <img src={url} alt="Presentación" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: 'var(--bg-3)' }} />
      ) : isDirect ? (
        <video controls style={{ width: '100%', display: 'block' }}><source src={url} /></video>
      ) : isAdmin ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--txt-3)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
            <path d="M4 16l4-4 4 4 4-6 4 6M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z"/>
          </svg>
          <span>Pulsa "⬆ Subir imagen/video" para añadir contenido de presentación</span>
        </div>
      ) : null}
    </div>
  );
}

/* ── Editable inline text ───────────────────── */
function EditableText({ value, onSave, isAdmin, multiline = false, style: sx, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!isAdmin) return <span style={sx}>{value}</span>;

  if (editing) {
    return (
      <span style={{ display: 'block' }}>
        {multiline ? (
          <textarea
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            rows={4}
            style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--gold)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        ) : (
          <input
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--gold)', borderRadius: 'var(--r2)', padding: '5px 8px', color: 'var(--txt-1)', fontSize: 'inherit', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        )}
        <span style={{ display: 'flex', gap: 6, marginTop: 5 }}>
          <button onClick={save} style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
          <button onClick={cancel} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
        </span>
      </span>
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Clic para editar"
      style={{ ...sx, cursor: 'text', borderRadius: 4, transition: 'background var(--t1)', display: 'block' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.07)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {value || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>{placeholder || 'Clic para añadir texto...'}</span>}
    </span>
  );
}

/* ── Editable feature list ───────────────────── */
function EditableFeatures({ items, onSave, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);

  const startEdit = () => { setDraft(items.map(f => ({ ...f }))); setEditing(true); };
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(items); setEditing(false); };
  const update = (i, k, v) => setDraft(d => d.map((f, j) => j === i ? { ...f, [k]: v } : f));
  const remove = (i) => setDraft(d => d.filter((_, j) => j !== i));
  const add = () => setDraft(d => [...d, { emoji: '✨', text: '' }]);

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(245,166,35,0.04)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r3)', padding: 14 }}>
        {draft.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={f.emoji} onChange={e => update(i, 'emoji', e.target.value)}
              style={{ width: 38, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '5px 6px', color: 'var(--txt-1)', fontSize: 16, textAlign: 'center', outline: 'none' }} />
            <input value={f.text} onChange={e => update(i, 'text', e.target.value)}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '5px 8px', color: 'var(--txt-1)', fontSize: 14, outline: 'none' }} />
            <button onClick={() => remove(i)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.7 }} title="Eliminar">✕</button>
          </div>
        ))}
        <button onClick={add} style={{ background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--txt-3)', borderRadius: 'var(--r2)', padding: '6px', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>+ Añadir ítem</button>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={save} style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
          <button onClick={cancel} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isAdmin ? startEdit : undefined}
      title={isAdmin ? 'Clic para editar' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: isAdmin ? 'text' : 'default', borderRadius: 'var(--r2)', padding: isAdmin ? '6px 4px' : 0, transition: 'background var(--t1)' }}
      onMouseEnter={isAdmin ? e => e.currentTarget.style.background = 'rgba(245,166,35,0.04)' : undefined}
      onMouseLeave={isAdmin ? e => e.currentTarget.style.background = 'transparent' : undefined}
    >
      {items.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{f.emoji}</span>
          <p style={{ fontSize: 15, color: 'var(--txt-2)', lineHeight: 1.65, margin: 0 }}>{f.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Editable bullet list ───────────────────── */
function EditableBullets({ items, onSave, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);

  const startEdit = () => { setDraft([...items]); setEditing(true); };
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(items); setEditing(false); };
  const update = (i, v) => setDraft(d => d.map((x, j) => j === i ? v : x));
  const remove = (i) => setDraft(d => d.filter((_, j) => j !== i));
  const add = () => setDraft(d => [...d, '']);

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, background: 'rgba(245,166,35,0.04)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r3)', padding: 14 }}>
        {draft.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={item} onChange={e => update(i, e.target.value)}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '5px 8px', color: 'var(--txt-1)', fontSize: 14, outline: 'none' }} />
            <button onClick={() => remove(i)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '0 4px', opacity: 0.7 }}>✕</button>
          </div>
        ))}
        <button onClick={add} style={{ background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--txt-3)', borderRadius: 'var(--r2)', padding: '6px', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>+ Añadir ítem</button>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={save} style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
          <button onClick={cancel} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isAdmin ? startEdit : undefined}
      title={isAdmin ? 'Clic para editar' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, cursor: isAdmin ? 'text' : 'default', borderRadius: 'var(--r2)', padding: isAdmin ? '6px 4px' : 0, transition: 'background var(--t1)' }}
      onMouseEnter={isAdmin ? e => e.currentTarget.style.background = 'rgba(245,166,35,0.04)' : undefined}
      onMouseLeave={isAdmin ? e => e.currentTarget.style.background = 'transparent' : undefined}
    >
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--txt-3)', marginTop: 9, flexShrink: 0 }} />
          <p style={{ fontSize: 15, color: 'var(--txt-2)', lineHeight: 1.7, margin: 0 }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Testimonial video card ─────────────────── */
function TestimonialCard({ item, isAdmin, onEdit, onRemove }) {
  // mediaUrl = server-uploaded file; url = YouTube/Vimeo/legacy; videoData = old base64 fallback
  const videoSrc = item.mediaUrl || item.videoData || null;
  const ytId = item.url ? getYouTubeId(item.url) : null;
  const vmId = item.url ? getVimeoId(item.url) : null;
  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : vmId ? `https://player.vimeo.com/video/${vmId}` : null;
  const isLocalVideo = !embedSrc && videoSrc;

  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {embedSrc ? (
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe src={embedSrc} title={item.name || 'Testimonio'} frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>
      ) : isLocalVideo ? (
        <video controls style={{ width: '100%', display: 'block', maxHeight: 280 }}>
          <source src={videoSrc} />
        </video>
      ) : (
        <div style={{ paddingTop: '56.25%', position: 'relative', background: 'var(--bg-3)' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt-3)', fontSize: 12 }}>Sin vídeo</div>
        </div>
      )}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          {item.name && <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)', margin: 0, lineHeight: 1.3 }}>{item.name}</p>}
          {item.subtitle && <p style={{ fontSize: 12, color: 'var(--txt-3)', margin: '2px 0 0', lineHeight: 1.4 }}>{item.subtitle}</p>}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r2)', padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Editar</button>
            <button onClick={onRemove} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TestimonialEditModal({ item, onSave, onClose }) {
  const [mode, setMode]       = useState(item?.mediaUrl ? 'local' : 'url');
  const [url, setUrl]         = useState(item?.url || '');
  const [mediaUrl, setMediaUrl] = useState(item?.mediaUrl || null);
  const [videoName, setVideoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [name, setName]       = useState(item?.name || '');
  const [subtitle, setSubtitle] = useState(item?.subtitle || '');
  const fileRef = React.useRef(null);

  const pickVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLoading(true);
    setError('');
    setVideoName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('access_token');
      const r = await axiosBase.post(`${PUBLIC_API}/auth/admin/upload-media/`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMediaUrl(r.data.url);
    } catch {
      setError('Error al subir el vídeo. Inténtalo de nuevo.');
      setVideoName('');
    } finally {
      setLoading(false);
    }
  };

  const canSave = mode === 'url' ? url.trim() : mediaUrl;

  const save = () => {
    if (!canSave) return;
    onSave({
      url: mode === 'url' ? url.trim() : '',
      mediaUrl: mode === 'local' ? mediaUrl : null,
      name: name.trim(),
      subtitle: subtitle.trim(),
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r4)', padding: 24, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--txt-1)' }}>{item ? 'Editar testimonio' : 'Añadir testimonio'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 'var(--r2)', padding: 3, gap: 3 }}>
          {[['url','🔗 Enlace (YouTube/Vimeo)'],['local','📁 Archivo local']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: '7px 12px', borderRadius: 'var(--r2)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all var(--t1)',
                background: mode === m ? 'var(--bg-1)' : 'transparent',
                color: mode === m ? 'var(--txt-1)' : 'var(--txt-3)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* URL input */}
        {mode === 'url' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            URL del vídeo
            <input value={url} onChange={e => setUrl(e.target.value)} autoFocus placeholder="https://youtu.be/..."
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 14, outline: 'none', fontWeight: 400 }} />
          </label>
        )}

        {/* Local file picker — uploads to server, stores URL */}
        {mode === 'local' && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Archivo de vídeo</label>
            {mediaUrl ? (
              <div style={{ borderRadius: 'var(--r2)', overflow: 'hidden', background: 'var(--bg-3)' }}>
                <video src={mediaUrl} controls style={{ width: '100%', maxHeight: 160, display: 'block' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
                  <span style={{ fontSize: 12, color: 'var(--txt-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoName || 'vídeo subido'}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--txt-2)', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cambiar</button>
                    <button onClick={() => { setMediaUrl(null); setVideoName(''); }} style={{ background: 'rgba(220,50,50,0.15)', color: 'var(--red)', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Quitar</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                style={{ width: '100%', height: 90, background: 'var(--bg-3)', border: '2px dashed var(--line-2)', borderRadius: 'var(--r3)', cursor: loading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--txt-3)', transition: 'all var(--t1)' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
                {loading
                  ? <><div style={{ width: 20, height: 20, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><span style={{ fontSize: 12 }}>Subiendo…</span></>
                  : <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Subir vídeo al servidor</span>
                    <span style={{ fontSize: 11 }}>MP4, WebM, MOV</span>
                  </>
                }
              </button>
            )}
            {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red)' }}>{error}</p>}
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={pickVideo} />
          </div>
        )}

        {/* Name & subtitle */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nombre del alumno
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan García"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 14, outline: 'none', fontWeight: 400 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Descripción corta (opcional)
          <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Pentester Junior"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 14, outline: 'none', fontWeight: 400 }} />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={save} disabled={!canSave || loading}
            style={{ background: canSave && !loading ? 'var(--gold)' : 'var(--bg-4)', color: canSave && !loading ? '#000' : 'var(--txt-4)', border: 'none', borderRadius: 'var(--r2)', padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: canSave && !loading ? 'pointer' : 'not-allowed' }}>
            Guardar
          </button>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function EditableTestimonials({ items, onSave, isAdmin }) {
  const [modal, setModal] = useState(null); // null | { index: number|null, item: obj }

  const openAdd = () => setModal({ index: null, item: null });
  const openEdit = (i) => setModal({ index: i, item: items[i] });
  const closeModal = () => setModal(null);

  const handleSave = (data) => {
    if (!data.url && !data.mediaUrl) { closeModal(); return; }
    if (modal.index === null) onSave([...items, data]);
    else onSave(items.map((x, i) => i === modal.index ? data : x));
    closeModal();
  };
  const handleRemove = (i) => onSave(items.filter((_, j) => j !== i));

  return (
    <>
      {modal && <TestimonialEditModal item={modal.item} onSave={handleSave} onClose={closeModal} />}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 20, marginBottom: isAdmin ? 12 : 0 }}>
          {items.map((item, i) => (
            <TestimonialCard key={i} item={item} isAdmin={isAdmin}
              onEdit={() => openEdit(i)}
              onRemove={() => handleRemove(i)} />
          ))}
        </div>
      )}
      {isAdmin && (
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--txt-3)', borderRadius: 'var(--r3)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', transition: 'all var(--t1)', marginTop: items.length ? 4 : 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Añadir vídeo testimonio
        </button>
      )}
      {!isAdmin && items.length === 0 && null}
    </>
  );
}

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const LINE_CLAMP = 5;
  return (
    <div style={{ flex: 1 }}>
      <p style={{
        fontSize: 13, color: 'var(--txt-3)', lineHeight: 1.6, margin: 0,
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: expanded ? 'unset' : LINE_CLAMP,
        overflow: 'hidden',
      }}>{text}</p>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ background: 'none', border: 'none', padding: '4px 0 0', fontSize: 12, color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}
      >
        {expanded ? 'Ver menos' : 'Ver más'}
      </button>
    </div>
  );
}

/* ── Courses available (editable, local images) ─ */
const DEFAULT_COURSES = [];

function CourseEditModal({ item, onSave, onClose }) {
  const [title, setTitle]       = useState(item?.title || '');
  const [desc, setDesc]         = useState(item?.desc || '');
  const [emoji, setEmoji]       = useState(item?.emoji || '🔐');
  const [imgData, setImgData]   = useState(item?.imgData || null);
  const [loading, setLoading]   = useState(false);
  const fileRef = React.useRef(null);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => { setImgData(ev.target.result); setLoading(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), desc: desc.trim(), emoji, imgData });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r4)', padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--txt-1)' }}>{item ? 'Editar curso' : 'Añadir curso'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Image upload */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>Imagen del curso</label>
          {imgData ? (
            <div style={{ position: 'relative', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
              <img src={imgData} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: 'var(--bg-3)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(255,255,255,0.9)', color: '#000', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cambiar</button>
                <button onClick={() => setImgData(null)} style={{ background: 'rgba(220,50,50,0.85)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={loading}
              style={{ width: '100%', height: 90, background: 'var(--bg-3)', border: '2px dashed var(--line-2)', borderRadius: 'var(--r3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--txt-3)', transition: 'all var(--t1)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
              {loading ? <span style={{ fontSize: 13 }}>Cargando…</span> : <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Subir imagen local</span>
                <span style={{ fontSize: 11 }}>JPG, PNG, WebP</span>
              </>}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} />
        </div>

        {/* Emoji + title */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Icono
            <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2}
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 4px', color: 'var(--txt-1)', fontSize: 22, textAlign: 'center', outline: 'none', fontWeight: 400 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nombre del curso *
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Hacking Web Avanzado"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 14, outline: 'none', fontWeight: 400 }} />
          </label>
        </div>

        {/* Description */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Resumen del temario
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Aprende a identificar y explotar vulnerabilidades web como SQL injection, XSS, SSRF…"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 10px', color: 'var(--txt-1)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontWeight: 400 }} />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={save} disabled={!title.trim()}
            style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'not-allowed', opacity: title.trim() ? 1 : 0.5 }}>Guardar</button>
          <button onClick={onClose}
            style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function EditableCourses({ items, onSave, isAdmin }) {
  const [modal, setModal] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const openAdd  = () => setModal({ index: null, item: null });
  const openEdit = (i) => setModal({ index: i, item: items[i] });
  const close    = () => setModal(null);
  const handleSave = (data) => {
    onSave(modal.index === null ? [...items, data] : items.map((x, i) => i === modal.index ? data : x));
    close();
  };
  const handleRemove = (i) => onSave(items.filter((_, j) => j !== i));

  const handleDragStart = (i) => (e) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (i) => (e) => {
    e.preventDefault();
    if (dragIndex !== null && i !== overIndex) setOverIndex(i);
  };
  const handleDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setOverIndex(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    onSave(next);
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  return (
    <>
      {modal && <CourseEditModal item={modal.item} onSave={handleSave} onClose={close} />}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 16, marginBottom: isAdmin ? 12 : 0 }}>
          {items.map((course, i) => (
            <div key={i}
              draggable={isAdmin}
              onDragStart={isAdmin ? handleDragStart(i) : undefined}
              onDragOver={isAdmin ? handleDragOver(i) : undefined}
              onDrop={isAdmin ? handleDrop(i) : undefined}
              onDragEnd={isAdmin ? handleDragEnd : undefined}
              style={{
                background: 'var(--bg-2)',
                border: `1px solid ${overIndex === i && dragIndex !== null && dragIndex !== i ? 'var(--gold)' : 'var(--line)'}`,
                borderRadius: 'var(--r3)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                opacity: dragIndex === i ? 0.4 : 1,
                cursor: isAdmin ? 'grab' : 'default',
                transition: 'border-color var(--t1), opacity var(--t1)',
              }}>
              {course.imgData ? (
                <img src={course.imgData} alt={course.title} draggable={false} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: 'var(--bg-3)' }} />
              ) : (
                <div style={{ height: 80, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{course.emoji || '📚'}</div>
              )}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {isAdmin && <span title="Arrastrar para reordenar" style={{ color: 'var(--txt-3)', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>⠿</span>}
                  {course.imgData && <span style={{ fontSize: 18 }}>{course.emoji || '📚'}</span>}
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)', lineHeight: 1.3 }}>{course.title}</span>
                </div>
                {course.desc && <ExpandableText text={course.desc} />}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <button onClick={() => openEdit(i)} style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: 'var(--r2)', padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => handleRemove(i)} style={{ background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--txt-3)', borderRadius: 'var(--r3)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', transition: 'all var(--t1)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Añadir curso
        </button>
      )}
    </>
  );
}

/* ── localStorage helpers ───────────────────── */
const DEFAULT_INTRO = 'En The Hackers Labs Academy dejamos las teorías y te damos experiencia práctica en ciberseguridad.';
const DEFAULT_FEATURES = [
  { emoji: '💻', text: 'Cursos prácticos de Ciberseguridad & Hacking Ético divididos en rápidas píldoras.' },
  { emoji: '🔐', text: 'Hacking Web, Bug Bounty, eJPT, Azure y mucho más contenido estructurado.' },
  { emoji: '🥷', text: 'Acceso a laboratorios prácticos que recrean vulnerabilidades reales de Bug Bounty.' },
  { emoji: '📚', text: 'Recursos, guías, scripts y plantillas que te ahorrarán infinidad de tiempo.' },
  { emoji: '👨‍🏫', text: 'Materiales de preparación para certificaciones: eJPT, OSCP, CEH y más.' },
  { emoji: '🏆', text: 'Sistema de gamificación con niveles, puntos y rankings semanales.' },
  { emoji: '💡', text: 'Cómo destacar en entrevistas y construir un currículum sólido en ciberseguridad.' },
  { emoji: '🔴', text: 'Preguntas y respuestas directas con instructores y la comunidad.' },
];
const DEFAULT_TARGETS = [
  'Personas que quieren iniciar una carrera en ciberseguridad sin saber por dónde empezar.',
  'Estudiantes de informática que buscan especializarse en hacking ético o seguridad defensiva.',
  'Profesionales IT que quieren reforzar sus conocimientos de seguridad o preparar una certificación.',
  'CTF players y hackers que quieren aprender en comunidad y compartir conocimiento.',
  'Cualquier persona curiosa que quiera entender cómo funciona el hacking y cómo protegerse.',
];
const DEFAULT_TESTIMONIALS = [];

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ── Main component ─────────────────────────── */
export default function About() {
  const { user, membership, isAuthenticated } = useAuthStore();
  const { communityDescription, updateSettings } = useSiteStore();
  const isAdmin = user?.role === 'admin';
  const [videoUrl, setVideoUrl] = useState('');
  const [intro, setIntro] = useState(() => lsGet('about_intro', DEFAULT_INTRO));
  const [features, setFeatures] = useState(() => lsGet('about_features', DEFAULT_FEATURES));
  const [targets, setTargets] = useState(() => lsGet('about_targets', DEFAULT_TARGETS));
  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [members, setMembers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [courseCount, setCourseCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  const handleVideoChange = async (url) => {
    setVideoUrl(url);
    try { await api.patch('/auth/admin/site-settings/', { presentation_url: url }); } catch {}
  };
  const handleIntroSave = (v) => { setIntro(v); lsSet('about_intro', v); };
  const handleFeaturesSave = (v) => { setFeatures(v); lsSet('about_features', v); };
  const handleTargetsSave = (v) => { setTargets(v); lsSet('about_targets', v); };
  const handleSidebarTextSave = async (v) => {
    updateSettings(undefined, undefined, undefined, v);
    try { await api.patch('/auth/admin/site-settings/', { community_description: v }); } catch {}
  };
  const handleTestimonialsSave = async (v) => {
    setTestimonials(v);
    try { await api.patch('/auth/admin/site-settings/', { about_testimonials: JSON.stringify(v) }); } catch {}
  };
  const handleCoursesSave = async (v) => {
    setCourses(v);
    try { await api.patch('/auth/admin/site-settings/', { about_courses: JSON.stringify(v) }); } catch {}
  };

  useEffect(() => {
    // Use plain axios (no auth interceptor) so public data loads for non-logged-in visitors
    axiosBase.get(`${PUBLIC_API}/auth/site-settings/`).then(async r => {
      let dbTestimonials = Array.isArray(r.data.about_testimonials) ? r.data.about_testimonials : [];
      let dbCourses      = Array.isArray(r.data.about_courses)      ? r.data.about_courses      : [];

      setTestimonials(dbTestimonials);
      setCourses(dbCourses);
      if (r.data.presentation_url) setVideoUrl(r.data.presentation_url);

      // One-time migration: if DB is empty and admin has localStorage data, push it up
      if (user?.role === 'admin') {
        try {
          const lsT = localStorage.getItem('about_testimonials');
          const lsC = localStorage.getItem('about_courses');
          if (dbTestimonials.length === 0 && lsT) {
            const parsed = JSON.parse(lsT);
            if (parsed?.length) {
              await api.patch('/auth/admin/site-settings/', { about_testimonials: lsT });
              setTestimonials(parsed);
              localStorage.removeItem('about_testimonials');
            }
          }
          if (dbCourses.length === 0 && lsC) {
            const parsed = JSON.parse(lsC);
            if (parsed?.length) {
              await api.patch('/auth/admin/site-settings/', { about_courses: lsC });
              setCourses(parsed);
              localStorage.removeItem('about_courses');
            }
          }
        } catch {}
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    Promise.all([
      api.get('/auth/members/').catch(() => ({ data: [] })),
      api.get('/classroom/courses/').catch(() => ({ data: [] })),
      api.get('/community/posts/').catch(() => ({ data: [] })),
      api.get('/auth/members/?online=true').catch(() => ({ data: [] })),
      api.get('/memberships/plans/').catch(() => ({ data: [] })),
    ]).then(([m, c, p, o, pl]) => {
      const mList = Array.isArray(m.data) ? m.data : (m.data.results || []);
      const oList = Array.isArray(o.data) ? o.data : (o.data.results || []);
      const cArr  = Array.isArray(c.data) ? c.data : (c.data.results || c.data || []);
      const pCount = p.data.count || (Array.isArray(p.data) ? p.data : (p.data.results || [])).length || 0;
      const plList = Array.isArray(pl.data) ? pl.data : (pl.data.results || []);
      setMembers(mList);
      setOnlineMembers(oList);
      setCourseCount(c.data.count || cArr.length || 0);
      setPostCount(pCount);
      setPlans(plList);
      setLoading(false);
    });
  }, []);

  const memberCount = members.length;
  const recentMembers = members.slice(0, 10);
  const monthlyPlan = plans.find(p => p.interval === 'monthly');
  const quarterlyPlan = plans.find(p => p.interval === 'quarterly');
  const annualPlan = plans.find(p => p.interval === 'annual');
  const monthlyPrice = monthlyPlan ? parseFloat(monthlyPlan.price).toFixed(2) : '29.99';
  const quarterlyPrice = quarterlyPlan ? parseFloat(quarterlyPlan.price).toFixed(2) : null;
  const annualPrice = annualPlan ? parseFloat(annualPlan.price).toFixed(2) : null;
  const displayOnline = onlineMembers.length > 0;
  const displayMembers = displayOnline ? onlineMembers.slice(0, 10) : recentMembers;

  return (
    <>
      <style>{`
        .about-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; align-items: start; max-width: 960px; margin: 0 auto; }
        .about-grid > * { min-width: 0; }
        .about-sticky { position: sticky; top: 72px; }
        @media (max-width: 860px) { .about-grid { grid-template-columns: 1fr; } .about-sticky { position: static; } }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0 64px' }}>
        <div className="about-grid">

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Title */}
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'var(--txt-1)', marginBottom: 12 }}>
              <SiteBrand />
            </h1>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--line)', marginBottom: 20 }} />

            {/* Video */}
            {(isAdmin || videoUrl) && (
              <VideoEmbed url={videoUrl} isAdmin={isAdmin} onChange={handleVideoChange} />
            )}

            {/* Metadata row — below video */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '14px 0 24px', padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--txt-3)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <span style={{ fontWeight: 600 }}>Privada</span>
              </div>
              <span style={{ color: 'var(--line-2)' }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{monthlyPrice}€</span>
                <span style={{ color: 'var(--txt-3)' }}>/mes</span>
              </div>
              {quarterlyPrice && (
                <>
                  <span style={{ color: 'var(--line-2)' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{quarterlyPrice}€</span>
                    <span style={{ color: 'var(--txt-3)' }}>/trimestre</span>
                  </div>
                </>
              )}
              {annualPrice && (
                <>
                  <span style={{ color: 'var(--line-2)' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{annualPrice}€</span>
                    <span style={{ color: 'var(--txt-3)' }}>/año</span>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 32 }}>
              {isAdmin ? (
                <EditableText
                  value={intro}
                  onSave={handleIntroSave}
                  isAdmin={isAdmin}
                  multiline
                  style={{ fontSize: 16, color: 'var(--txt-2)', lineHeight: 1.8, marginBottom: 16, display: 'block' }}
                />
              ) : (
                <p style={{ fontSize: 16, color: 'var(--txt-2)', lineHeight: 1.8, marginBottom: 16 }}>{intro}</p>
              )}
              <p style={{ fontSize: 15, color: 'var(--txt-2)', lineHeight: 1.8, marginBottom: 20, fontWeight: 600 }}>
                Dentro encontrarás:
              </p>
              <EditableFeatures items={features} onSave={handleFeaturesSave} isAdmin={isAdmin} />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--line)', marginBottom: 28 }} />

            {/* For whom */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 16, letterSpacing: '-0.3px' }}>
                ¿Para quién es?
              </h2>
              <EditableBullets items={targets} onSave={handleTargetsSave} isAdmin={isAdmin} />
            </div>

            {/* Testimonial videos — always visible */}
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '32px 0 28px' }} />
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 6, letterSpacing: '-0.3px' }}>
                  Lo que dicen los que ya están dentro
                </h2>
                <p style={{ fontSize: 14, color: 'var(--txt-3)', marginBottom: 20, lineHeight: 1.5 }}>
                  Testimonios reales de alumnos de la comunidad.
                </p>
                <EditableTestimonials items={testimonials} onSave={handleTestimonialsSave} isAdmin={isAdmin} />
              </div>
            </>

            {/* Cursos disponibles — always visible */}
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '32px 0 28px' }} />
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 6, letterSpacing: '-0.3px' }}>
                  Cursos disponibles
                </h2>
                <p style={{ fontSize: 14, color: 'var(--txt-3)', marginBottom: 20, lineHeight: 1.5 }}>
                  Explora el temario de cada curso y elige por dónde empezar.
                </p>
                <EditableCourses items={courses} onSave={handleCoursesSave} isAdmin={isAdmin} />
              </div>
            </>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="about-sticky">
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', boxShadow: 'var(--s2)' }}>

              {/* Banner */}
              <SiteBannerCard height={130} />

              {/* Editable sidebar tagline */}
              <div style={{ padding: '12px 18px 0', borderBottom: '1px solid var(--line)' }}>
                <EditableText
                  value={communityDescription}
                  onSave={handleSidebarTextSave}
                  isAdmin={isAdmin}
                  multiline={false}
                  placeholder="Añade una descripción corta..."
                  style={{ fontSize: 13, color: 'var(--txt-3)', lineHeight: 1.5, display: 'block', paddingBottom: 12 }}
                />
              </div>

              {/* Stats row */}
              {isAuthenticated && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
                  {[
                    { v: loading ? '…' : courseCount, l: 'Cursos' },
                    { v: loading ? '…' : postCount,   l: 'Posts' },
                  ].map(({ v, l }, i, arr) => (
                    <div key={l} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--txt-1)', lineHeight: 1, letterSpacing: '-0.5px' }}>{v}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Online now / recent members */}
              {isAuthenticated && (
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    {displayOnline && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                    )}
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                      {displayOnline ? `Online ahora (${onlineMembers.length})` : 'Últimos miembros'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {displayMembers.map(u => (
                      <div key={u.id} title={u.first_name || u.username} style={{ position: 'relative' }}>
                        <MiniAvatar user={u} size={32} />
                        {displayOnline && (
                          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid var(--bg-2)', display: 'block' }} />
                        )}
                      </div>
                    ))}
                    {!displayOnline && memberCount > 10 && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)' }}>
                        +{memberCount - 10}
                      </div>
                    )}
                    {displayOnline && onlineMembers.length > 10 && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)' }}>
                        +{onlineMembers.length - 10}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ padding: '16px 18px' }}>
                {!user ? (
                  /* Unauthenticated: join CTA */
                  <>
                    <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 12, lineHeight: 1.5 }}>
                      Únete a la comunidad y accede a todos los cursos y contenido.
                    </p>
                    <button
                      onClick={() => navigate('/register')}
                      style={{ width: '100%', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '11px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', letterSpacing: '0.01em', transition: 'background var(--t1)', marginBottom: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}
                    >
                      Crear cuenta
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      style={{ width: '100%', background: 'transparent', color: 'var(--txt-2)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '9px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all var(--t1)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-2)'; }}
                    >
                      Iniciar sesión
                    </button>
                  </>
                ) : (membership?.is_active || user.role === 'admin' || user.role === 'instructor') ? (
                  /* Has access */
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" fill="rgba(74,222,128,0.15)"/>
                        <path d="M8 12l3 3 5-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Ya eres miembro</span>
                    </div>
                    <button
                      onClick={() => navigate('/community')}
                      style={{ width: '100%', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '11px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', letterSpacing: '0.01em', transition: 'background var(--t1)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}
                    >
                      Ir a la comunidad
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        style={{ width: '100%', marginTop: 8, background: 'transparent', color: 'var(--txt-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '9px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all var(--t1)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-3)'; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                        </svg>
                        Ajustes
                      </button>
                    )}
                  </>
                ) : (
                  /* Authenticated but no active membership */
                  <>
                    <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 12, lineHeight: 1.5 }}>
                      Activa tu membresía para acceder a todos los cursos y la comunidad.
                    </p>
                    <button
                      onClick={() => navigate('/membership')}
                      style={{ width: '100%', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '11px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', letterSpacing: '0.01em', transition: 'background var(--t1)' }}
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

        </div>
      </div>
    </>
  );
}
