import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import { Spinner } from '../components/ui/index';
import useAuthStore from '../store/authStore';
import './AdminPanel.css';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const WDAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const ECOLORS = { webinar:'#60a5fa', workshop:'#a78bfa', ctf:'#f5a623', meetup:'#4ade80', other:'#9ca3af' };
const ETYPES  = { webinar:'Webinar', workshop:'Workshop', ctf:'CTF', meetup:'Meetup', other:'Otro' };

const pad = n => String(n).padStart(2, '0');

function fmtDateRange(start, end) {
  const s = new Date(start);
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  const day = s.toLocaleDateString('es-ES', opts);
  const t1  = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  if (!end) return `${day} @ ${t1}`;
  const e  = new Date(end);
  const t2 = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return `${day} @ ${t1} – ${t2}`;
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function googleCalUrl(ev) {
  const fmt = d => new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const s = fmt(ev.start_datetime);
  const e = ev.end_datetime ? fmt(ev.end_datetime) : fmt(new Date(new Date(ev.start_datetime).getTime()+3600000));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${s}/${e}&details=${encodeURIComponent(ev.description||'')}${ev.link ? '&location='+encodeURIComponent(ev.link) : ''}`;
}

/* ── Event detail modal ──────────────────────────────────── */
function EventModal({ event, onClose, onAttend, isAdmin, onEdit, onDelete, onNotify, notifying }) {
  const color = ECOLORS[event.event_type] || '#9ca3af';
  const [notified, setNotified] = useState(false);

  const handleNotify = async () => {
    await onNotify();
    setNotified(true);
    setTimeout(() => setNotified(false), 4000);
  };

  return createPortal((
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', overflowY:'auto', padding:'40px 16px', boxSizing:'border-box' }}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:500, margin:'auto', flexShrink:0 }}>

        {/* Header */}
        <div className="ap-modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
            <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background:`${color}22`, color, border:`1px solid ${color}44`, flexShrink:0 }}>
              {ETYPES[event.event_type] || event.event_type}
            </span>
            <span className="ap-modal-title" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{event.title}</span>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {isAdmin && <>
              <button className="ap-btn ap-btn-ghost" onClick={onEdit} style={{ fontSize:12, padding:'4px 12px' }}>Editar</button>
              <button className="ap-btn" onClick={onDelete} style={{ fontSize:12, padding:'4px 12px', background:'var(--red)', color:'#fff', border:'none' }}>Eliminar</button>
            </>}
            <button className="ap-icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="ap-modal-body">
          {/* Banner image */}
          {event.banner_image && (
            <div style={{ borderRadius:'var(--r3)', overflow:'hidden', marginBottom:16 }}>
              <img src={event.banner_image} alt="" style={{ width:'100%', height:160, objectFit:'contain', display:'block', background:'var(--bg-3)' }} />
            </div>
          )}

          {/* Date */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--txt-1)', textTransform:'capitalize' }}>{fmtDateRange(event.start_datetime, event.end_datetime)}</div>
              <div style={{ fontSize:12, color:'var(--txt-3)', marginTop:1 }}>Hora de Madrid</div>
            </div>
          </div>

          {/* Attendees */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span style={{ fontSize:13, color:'var(--txt-3)' }}>{event.attendees_count} asistente{event.attendees_count !== 1 ? 's' : ''}</span>
          </div>

          {/* Link */}
          {event.link && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <a href={event.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color, textDecoration:'none', wordBreak:'break-all' }}
                onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'}
                onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}
              >{event.link}</a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p style={{ fontSize:14, color:'var(--txt-2)', lineHeight:1.75, marginBottom:4, whiteSpace:'pre-line' }}>{event.description}</p>
          )}

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => onAttend(event.id)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', background: event.is_attending ? 'rgba(74,222,128,0.12)' : 'var(--gold)', color: event.is_attending ? 'var(--green)' : '#000', border: event.is_attending ? '1px solid rgba(74,222,128,0.3)' : 'none', borderRadius:'var(--r3)', fontSize:14, fontWeight:800, cursor:'pointer', transition:'all 0.15s' }}>
                {event.is_attending
                  ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Apuntado</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Apuntarse</>
                }
              </button>
              <a href={googleCalUrl(event)} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 16px', background:'var(--bg-3)', color:'var(--txt-2)', border:'1px solid var(--line)', borderRadius:'var(--r3)', fontSize:13, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap', transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--line-2)';e.currentTarget.style.color='var(--txt-1)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.color='var(--txt-2)';}}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Google Cal
              </a>
            </div>
            {isAdmin && (
              <button onClick={handleNotify} disabled={notifying}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background: notified ? 'rgba(74,222,128,0.1)' : 'var(--bg-3)', color: notified ? 'var(--green)' : 'var(--txt-2)', border:`1px solid ${notified ? 'rgba(74,222,128,0.3)' : 'var(--line)'}`, borderRadius:'var(--r3)', fontSize:13, fontWeight:600, cursor: notifying ? 'default' : 'pointer', transition:'all 0.15s', opacity: notifying ? 0.6 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                {notified ? '¡Notificación enviada!' : notifying ? 'Enviando...' : 'Notificar a todos los miembros'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

/* ── Event form modal ────────────────────────────────────── */
const EMPTY_FORM = { title:'', description:'', event_type:'other', start_datetime:'', end_datetime:'', link:'' };

function EventFormModal({ initial, onSave, onClose }) {
  const [form, setForm]           = useState(initial ? {
    title: initial.title || '',
    description: initial.description || '',
    event_type: initial.event_type || 'other',
    start_datetime: toLocalInput(initial.start_datetime),
    end_datetime:   toLocalInput(initial.end_datetime),
    link: initial.link || '',
  } : { ...EMPTY_FORM });
  const [bannerFile,    setBannerFile]    = useState(null);
  // only use existing image if it's an actual uploaded file (media URL), not a leftover URL string
  const [bannerPreview, setBannerPreview] = useState(
    initial?.banner_image?.includes('/media/') ? initial.banner_image : null
  );
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const fileRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pickBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeBanner = () => { setBannerFile(null); setBannerPreview(null); };

  const submit = async () => {
    if (!form.title.trim() || !form.start_datetime) { setErr('Título y fecha de inicio son obligatorios.'); return; }
    setSaving(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'start_datetime') fd.append(k, new Date(v).toISOString());
        else if (k === 'end_datetime') fd.append(k, v ? new Date(v).toISOString() : '');
        else fd.append(k, v);
      });
      if (bannerFile)                         fd.append('banner_image', bannerFile);
      else if (!bannerPreview && initial?.banner_image) fd.append('banner_image', '');

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (initial?.id) await api.patch(`/events/${initial.id}/`, fd, cfg);
      else             await api.post('/events/', fd, cfg);
      onSave();
    } catch (e) {
      const d = e.response?.data;
      setErr(typeof d === 'string' ? d.slice(0,120) : d?.detail || JSON.stringify(d) || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  return createPortal((
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', overflowY:'auto', padding:'40px 16px', boxSizing:'border-box' }} onClick={onClose}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:500, margin:'auto', flexShrink:0 }}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">{initial?.id ? 'Editar evento' : 'Nuevo evento'}</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div className="ap-form-group">
            <label className="ap-label">Título *</label>
            <input className="ap-input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Estudio en comunidad" autoFocus />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Tipo</label>
            <select className="ap-select" value={form.event_type} onChange={e=>set('event_type',e.target.value)}>
              {Object.entries(ETYPES).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="ap-form-group" style={{ margin:0 }}>
              <label className="ap-label">Inicio *</label>
              <input className="ap-input" type="datetime-local" value={form.start_datetime} onChange={e=>set('start_datetime',e.target.value)} />
            </div>
            <div className="ap-form-group" style={{ margin:0 }}>
              <label className="ap-label">Fin</label>
              <input className="ap-input" type="datetime-local" value={form.end_datetime} onChange={e=>set('end_datetime',e.target.value)} />
            </div>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Enlace (Discord, Zoom…)</label>
            <input className="ap-input" type="url" value={form.link} onChange={e=>set('link',e.target.value)} placeholder="https://discord.com/..." />
          </div>

          {/* Banner image upload */}
          <div className="ap-form-group">
            <label className="ap-label">Imagen de portada</label>
            {bannerPreview ? (
              <div style={{ position:'relative', borderRadius:'var(--r3)', overflow:'hidden', marginBottom:0 }}>
                <img src={bannerPreview} alt="" style={{ width:'100%', height:120, objectFit:'contain', display:'block', background:'var(--bg-3)' }} />
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:0, transition:'opacity 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.opacity=1}
                  onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                  <button onClick={()=>fileRef.current?.click()} style={{ background:'rgba(255,255,255,0.9)', color:'#000', border:'none', borderRadius:'var(--r2)', padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Cambiar</button>
                  <button onClick={removeBanner} style={{ background:'rgba(200,50,50,0.85)', color:'#fff', border:'none', borderRadius:'var(--r2)', padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Quitar</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>fileRef.current?.click()}
                style={{ width:'100%', height:90, background:'var(--bg-3)', border:'2px dashed var(--line-2)', borderRadius:'var(--r3)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, color:'var(--txt-3)', transition:'all var(--t1)' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line-2)';e.currentTarget.style.color='var(--txt-3)';}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{ fontSize:12, fontWeight:600 }}>Subir imagen de portada</span>
                <span style={{ fontSize:11 }}>JPG, PNG, WebP</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pickBanner} />
          </div>

          <div className="ap-form-group">
            <label className="ap-label">Descripción</label>
            <textarea className="ap-input" value={form.description} onChange={e=>set('description',e.target.value)} rows={4}
              placeholder="Espacio abierto a la comunidad..."
              style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
          </div>
          {err && <p style={{ fontSize:12, color:'var(--red)', margin:'0 0 8px' }}>{err}</p>}
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={submit} disabled={saving}>
              {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

/* ── View toggle ─────────────────────────────────────────── */
function ViewToggle({ view, setView }) {
  return (
    <div style={{ display:'flex', gap:2, background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:'var(--r2)', padding:3 }}>
      {[{id:'list',label:'Lista'},{id:'calendar',label:'Mes'}].map(({id,label})=>(
        <button key={id} onClick={()=>setView(id)}
          style={{ padding:'6px 14px', borderRadius:'calc(var(--r2) - 2px)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all var(--t1)', background: view===id ? 'var(--bg-1)' : 'transparent', color: view===id ? 'var(--txt-1)' : 'var(--txt-3)', border: view===id ? '1px solid var(--line)' : '1px solid transparent', boxShadow: view===id ? 'var(--s1)' : 'none' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Mini event chip (calendar grid) ─────────────────────── */
function EventDot({ event, onClick }) {
  const color = ECOLORS[event.event_type] || '#9ca3af';
  return (
    <div onClick={e=>{e.stopPropagation();onClick(event);}} title={event.title}
      style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0, cursor:'pointer' }} />
  );
}

/* ── Main Calendar ───────────────────────────────────────── */
export default function Calendar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'instructor';

  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState('calendar');
  const [date,        setDate]        = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [openEvent,   setOpenEvent]   = useState(null);   // event object for detail modal
  const [formModal,   setFormModal]   = useState(null);   // null | event | 'new'
  const [notifying,   setNotifying]   = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(null);

  const fetchEvents = useCallback(() =>
    api.get('/events/').then(r => setEvents(r.data.results || r.data)).finally(() => setLoading(false)),
  []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const attend = async (id) => {
    await api.post(`/events/${id}/attend/`);
    await fetchEvents();
    setOpenEvent(ev => ev?.id === id ? { ...ev, is_attending: !ev.is_attending, attendees_count: ev.is_attending ? ev.attendees_count - 1 : ev.attendees_count + 1 } : ev);
  };

  const notifyAll = async (eventId) => {
    setNotifying(true);
    try { await api.post(`/events/${eventId}/notify/`); }
    finally { setNotifying(false); }
  };

  const deleteEvent = async (id) => {
    await api.delete(`/events/${id}/`);
    setConfirmDel(null);
    setOpenEvent(null);
    fetchEvents();
  };

  const Y = date.getFullYear(), M = date.getMonth();
  const daysInMonth = new Date(Y, M+1, 0).getDate();
  const firstDay = (() => { const d = new Date(Y,M,1).getDay(); return d===0?6:d-1; })();
  const today = new Date();

  const evDay = d => events.filter(e => {
    const ed = new Date(e.start_datetime);
    return ed.getFullYear()===Y && ed.getMonth()===M && ed.getDate()===d;
  });

  const upcoming = events
    .filter(e => new Date(e.start_datetime) >= new Date())
    .sort((a,b) => new Date(a.start_datetime)-new Date(b.start_datetime));

  if (loading) return <Spinner label="Cargando eventos..." />;

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--txt-1)', marginBottom:2 }}>Calendar</h1>
          <p style={{ fontSize:13, color:'var(--txt-3)' }}>
            {today.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {isAdmin && (
            <button onClick={()=>setFormModal('new')}
              style={{ display:'flex', alignItems:'center', gap:6, background:'var(--gold)', color:'#000', border:'none', borderRadius:'var(--r2)', padding:'8px 16px', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo evento
            </button>
          )}
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {upcoming.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'var(--r4)', color:'var(--txt-3)', fontSize:13 }}>
              No hay eventos próximos
            </div>
          ) : upcoming.map(ev => {
            const color = ECOLORS[ev.event_type] || '#9ca3af';
            const d = new Date(ev.start_datetime);
            return (
              <div key={ev.id} onClick={()=>setOpenEvent(ev)}
                style={{ display:'flex', alignItems:'stretch', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'var(--r3)', overflow:'hidden', cursor:'pointer', transition:'all var(--t2)' }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-3)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--s2)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-2)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                {/* Banner strip */}
                {ev.banner_image && <div style={{ width:90, flexShrink:0, background:`url(${ev.banner_image}) center/cover no-repeat` }} />}
                {/* Date column */}
                <div style={{ width:72, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-3)', borderLeft:`3px solid ${color}`, padding:'14px 0', gap:2 }}>
                  <span style={{ fontSize:10, fontWeight:800, color, letterSpacing:'0.08em', textTransform:'uppercase' }}>{MONTHS_SHORT[d.getMonth()]}</span>
                  <span style={{ fontSize:26, fontWeight:900, color:'var(--txt-1)', lineHeight:1 }}>{d.getDate()}</span>
                </div>
                {/* Content */}
                <div style={{ flex:1, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background:color+'22', color }}>
                      {ETYPES[ev.event_type]||ev.event_type}
                    </span>
                    <span style={{ fontSize:12, color:'var(--txt-3)' }}>{pad(d.getHours())}:{pad(d.getMinutes())}</span>
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--txt-1)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</h3>
                  {ev.description && <p style={{ fontSize:12, color:'var(--txt-2)', margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{ev.description}</p>}
                </div>
                {/* Attend */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'center', padding:'14px 16px', gap:6, flexShrink:0 }}>
                  <button onClick={e=>{e.stopPropagation();attend(ev.id);}}
                    style={{ padding:'7px 16px', borderRadius:'var(--r2)', fontSize:12, fontWeight:700, cursor:'pointer', background: ev.is_attending ? 'rgba(74,222,128,0.1)' : 'var(--gold)', color: ev.is_attending ? 'var(--green)' : '#000', border: ev.is_attending ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent' }}>
                    {ev.is_attending ? '✓ Apuntado' : 'Apuntarse'}
                  </button>
                  <span style={{ fontSize:11, color:'var(--txt-3)' }}>{ev.attendees_count} asistente{ev.attendees_count!==1?'s':''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'var(--r4)', overflow:'hidden' }}>
          {/* Nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {[{dir:-1,ch:'‹'},{dir:1,ch:'›'}].map(({dir,ch},idx)=>(
                <button key={idx} onClick={()=>{setDate(new Date(Y,M+dir));setSelectedDay(null);}}
                  style={{ width:32,height:32,borderRadius:'var(--r2)',background:'var(--bg-3)',border:'1px solid var(--line)',cursor:'pointer',color:'var(--txt-2)',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',transition:'all var(--t1)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-4)';e.currentTarget.style.color='var(--txt-1)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-3)';e.currentTarget.style.color='var(--txt-2)';}}>
                  {ch}
                </button>
              ))}
              <h2 style={{ fontSize:15, fontWeight:700, minWidth:160, textAlign:'center', color:'var(--txt-1)' }}>{MONTHS[M]} {Y}</h2>
            </div>
            <button onClick={()=>{setDate(new Date());setSelectedDay(null);}}
              style={{ padding:'5px 14px', background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:20, fontSize:12, fontWeight:600, color:'var(--txt-2)', cursor:'pointer', transition:'all var(--t1)' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--line-2)';e.currentTarget.style.color='var(--txt-1)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.color='var(--txt-2)';}}>
              Hoy
            </button>
          </div>

          {/* Week headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 8px' }}>
            {WDAYS.map(d=>(
              <div key={d} style={{ padding:'10px 4px', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--txt-3)', letterSpacing:'0.04em' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 8px 8px', gap:0, borderTop:'1px solid var(--line)' }}>
            {Array.from({length:firstDay}).map((_,i)=>(
              <div key={`e${i}`} style={{ minHeight:76, borderRight:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}/>
            ))}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=i+1;
              const isToday = today.getDate()===day && today.getMonth()===M && today.getFullYear()===Y;
              const isSel   = selectedDay===day;
              const dayEvts = evDay(day);
              const col = (firstDay + i) % 7;
              return (
                <div key={day} onClick={()=>setSelectedDay(isSel?null:day)}
                  style={{ minHeight:76, padding:6, cursor:'pointer',
                    background: isSel ? 'rgba(245,166,35,0.12)' : isToday ? 'rgba(245,166,35,0.06)' : 'transparent',
                    borderRight: col < 6 ? '1px solid var(--line)' : 'none',
                    borderBottom: '1px solid var(--line)',
                    outline: isSel ? '2px solid var(--gold)' : isToday ? '1px solid rgba(245,166,35,0.4)' : 'none',
                    outlineOffset: '-1px',
                    transition: 'background var(--t1)' }}
                  onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='var(--bg-3)';}}
                  onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isToday?'rgba(245,166,35,0.06)':'transparent';}}>
                  <div style={{ width:26,height:26,borderRadius:'50%',background:isToday?'var(--gold)':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:isToday?800:400,color:isToday?'#000':'var(--txt-2)',marginBottom:4 }}>
                    {day}
                  </div>
                  {dayEvts.length>0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {dayEvts.slice(0,3).map(ev=><EventDot key={ev.id} event={ev} onClick={setOpenEvent}/>)}
                      {dayEvts.length>3 && <span style={{ fontSize:9, color:'var(--txt-3)', lineHeight:'7px' }}>+{dayEvts.length-3}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day panel */}
          {selectedDay !== null && (
            <div style={{ borderTop:'1px solid var(--line)', padding:'16px 20px' }}>
              {evDay(selectedDay).length===0 ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'var(--txt-3)' }}>No hay eventos el {selectedDay} de {MONTHS[M]}.</span>
                  {isAdmin && <button onClick={()=>setFormModal('new')} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:'var(--r2)', padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Nuevo evento</button>}
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize:13, fontWeight:700, color:'var(--gold)', marginBottom:12 }}>{selectedDay} de {MONTHS[M]}</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {evDay(selectedDay).map(ev=>{
                      const color=ECOLORS[ev.event_type]||'#9ca3af';
                      return (
                        <div key={ev.id} onClick={()=>setOpenEvent(ev)}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:'var(--r3)', cursor:'pointer', transition:'background var(--t1)' }}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--bg-4)'}
                          onMouseLeave={e=>e.currentTarget.style.background='var(--bg-3)'}>
                          <div style={{ width:4, height:36, borderRadius:2, background:color, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--txt-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</div>
                            <div style={{ fontSize:11, color:'var(--txt-3)', marginTop:1 }}>{pad(new Date(ev.start_datetime).getHours())}:{pad(new Date(ev.start_datetime).getMinutes())} · {ev.attendees_count} asistente{ev.attendees_count!==1?'s':''}</div>
                          </div>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:color+'22', color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{ETYPES[ev.event_type]||ev.event_type}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Detail modal ── */}
      {openEvent && (
        <EventModal
          event={openEvent}
          onClose={()=>setOpenEvent(null)}
          onAttend={attend}
          isAdmin={isAdmin}
          onEdit={()=>{setFormModal(openEvent);setOpenEvent(null);}}
          onDelete={()=>{setConfirmDel(openEvent.id);}}
          onNotify={()=>notifyAll(openEvent.id)}
          notifying={notifying}
        />
      )}

      {/* ── Form modal ── */}
      {formModal && (
        <EventFormModal
          initial={formModal==='new' ? null : formModal}
          onSave={()=>{setFormModal(null);fetchEvents();}}
          onClose={()=>setFormModal(null)}
        />
      )}

      {/* ── Confirm delete ── */}
      {confirmDel && createPortal((
        <div style={{ position:'fixed', inset:0, zIndex:1200, display:'flex', overflowY:'auto', padding:'40px 16px', boxSizing:'border-box' }} onClick={()=>setConfirmDel(null)}>
          <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:380, margin:'auto', flexShrink:0 }}>
            <div className="ap-modal-header">
              <span className="ap-modal-title">Eliminar evento</span>
              <button className="ap-icon-btn" onClick={()=>setConfirmDel(null)}>✕</button>
            </div>
            <div className="ap-modal-body">
              <p className="ap-confirm-text">Esta acción es irreversible. ¿Eliminar este evento?</p>
              <div className="ap-modal-footer">
                <button className="ap-btn ap-btn-ghost" onClick={()=>setConfirmDel(null)}>Cancelar</button>
                <button className="ap-btn ap-btn-red" onClick={()=>deleteEvent(confirmDel)}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
