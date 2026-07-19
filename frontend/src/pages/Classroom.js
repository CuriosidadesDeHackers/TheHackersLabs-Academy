import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { Btn, PageHeader, Empty, SkeletonCard, Input } from '../components/ui/index';

/* ─── Paywall modal ──────────────────────────────────────────────────────── */
function PaywallModal({ onClose }) {
  const [plans, setPlans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [error, setError]           = useState('');
  const overlayRef                  = useRef(null);

  useEffect(() => {
    api.get('/memberships/plans/')
      .then(r => setPlans(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const handleSubscribe = async (plan) => {
    setCheckingId(plan.id); setError('');
    try {
      const { data } = await api.post('/memberships/checkout/', { plan_id: plan.id });
      window.location.href = data.checkout_url;
    } catch (err) {
      // Stripe not configured → simulate
      try {
        await api.post('/memberships/subscribe/', { plan_id: plan.id });
        window.location.reload();
      } catch {
        setError('Error al procesar el pago. Inténtalo de nuevo.');
        setCheckingId(null);
      }
    }
  };

  const INTERVAL = { monthly: '/mes', quarterly: '/trimestre', annual: '/año', lifetime: 'pago único' };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ width: '100%', maxWidth: 680, background: 'var(--bg-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r4)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', animation: 'a-up .18s var(--ease) both', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', textAlign: 'center', borderBottom: '1px solid var(--line)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 'var(--r2)', background: 'var(--bg-3)', border: 'none', color: 'var(--txt-3)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,166,35,0.12)', border: '2px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 6, letterSpacing: '-0.3px' }}>Acceso exclusivo para miembros</h2>
          <p style={{ fontSize: 14, color: 'var(--txt-3)', lineHeight: 1.6 }}>Elige un plan y empieza a aprender ahora mismo. Cancela cuando quieras.</p>
        </div>

        {/* Plans */}
        <div style={{ padding: '24px 32px 28px' }}>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--txt-3)', padding: 24 }}>Cargando planes…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 12, alignItems: 'center', paddingTop: 10 }}>
              {plans.map(plan => {
                const isFeatured = plan.interval === 'quarterly';
                return (
                  <div key={plan.id} style={{ background: isFeatured ? 'linear-gradient(160deg,rgba(245,166,35,0.12),var(--bg-2))' : 'var(--bg-2)', border: `1px solid ${isFeatured ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 'var(--r3)', padding: isFeatured ? '24px 18px 20px' : '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', boxShadow: isFeatured ? '0 0 24px rgba(245,166,35,0.14)' : 'none', transform: isFeatured ? 'translateY(-4px)' : 'none', zIndex: isFeatured ? 1 : 0 }}>
                    {isFeatured && <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: '#000', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>⭐ RECOMENDADO</span>}
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4 }}>{plan.name}</p>
                      {plan.description && <p style={{ fontSize: 12, color: 'var(--txt-3)', lineHeight: 1.5 }}>{plan.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: isFeatured ? 'var(--gold)' : 'var(--txt-1)', letterSpacing: '-0.5px' }}>{Number(plan.price).toFixed(2)}€</span>
                      <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{INTERVAL[plan.interval] || ''}</span>
                    </div>
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={!!checkingId}
                      style={{ width: '100%', padding: '10px 0', background: isFeatured ? 'var(--gold)' : 'var(--bg-3)', border: isFeatured ? 'none' : '1px solid var(--line)', borderRadius: 'var(--r2)', color: isFeatured ? '#000' : 'var(--txt-1)', fontWeight: 800, fontSize: 14, cursor: checkingId ? 'wait' : 'pointer', transition: 'all var(--t1)', marginTop: 'auto' }}
                      onMouseEnter={e => { if (!checkingId) e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      {checkingId === plan.id ? 'Redirigiendo…' : 'Suscribirme'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--txt-4)', textAlign: 'center', marginTop: 16 }}>
            🔒 Pago seguro con Stripe · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
}

const GRADS = [
  'linear-gradient(135deg,#1a237e 0%,#283593 100%)',
  'linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%)',
  'linear-gradient(135deg,#4a148c 0%,#6a1b9a 100%)',
  'linear-gradient(135deg,#bf360c 0%,#d84315 100%)',
  'linear-gradient(135deg,#006064 0%,#00838f 100%)',
  'linear-gradient(135deg,#37474f 0%,#546e7a 100%)',
];

function InstructorAvatar({ user, size = 24 }) {
  const colors = ['#f5a623', '#60a5fa', '#4ade80', '#f87171', '#a78bfa'];
  const bg = colors[(user?.id || 0) % colors.length];
  const initials = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase();
  if (user?.avatar_url)
    return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${bg},${bg}bb)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: '#000', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function CourseCard({ course, index, canEdit, onEdit, onDelete, onCourseClick, canReorder, isDragging, dropSide, onDragStartHandle, onDragOverCard, onDropCard, onDragEndHandle }) {
  const navigate = useNavigate();
  const [h, setH] = useState(false);
  const progress = course.user_progress || 0;
  const barColor = progress === 100 ? 'var(--green)' : progress > 0 ? 'var(--gold)' : 'var(--line-2)';

  const handleEdit = (e) => { e.stopPropagation(); onEdit(course); };
  const handleDelete = (e) => { e.stopPropagation(); onDelete(course); };

  const instructorName = course.instructor
    ? (course.instructor.first_name
        ? `${course.instructor.first_name}${course.instructor.last_name ? ' ' + course.instructor.last_name : ''}`
        : course.instructor.username)
    : null;

  return (
    <div
      onClick={() => onCourseClick ? onCourseClick(course.id) : navigate(`/classroom/${course.id}`)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onDragOver={canReorder ? onDragOverCard : undefined}
      onDrop={canReorder ? onDropCard : undefined}
      style={{
        background: 'var(--bg-2)',
        border: `1px solid ${h ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--r4)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: h ? 'var(--s3)' : 'var(--s1)',
        transition: 'box-shadow var(--t2) var(--ease), border-color var(--t2) var(--ease)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {dropSide && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, [dropSide === 'before' ? 'left' : 'right']: -2,
          width: 3, background: 'var(--gold)', borderRadius: 2, zIndex: 5,
        }} />
      )}
      {/* Thumbnail */}
      <div style={{
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: course.banner ? 'var(--bg-3)' : GRADS[index % GRADS.length],
      }}>
        {course.banner && (
          <img
            src={course.banner}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Hover overlay with play icon */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: h ? 1 : 0,
          transition: 'opacity var(--t2) var(--ease)',
          pointerEvents: 'none',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white" opacity="0.9">
            <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
            <path d="M10 8l6 4-6 4V8z" />
          </svg>
        </div>

        {/* Completed badge — top left */}
        {progress === 100 && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(74,222,128,0.18)',
            color: 'var(--green)',
            fontSize: 10, fontWeight: 700,
            padding: '3px 9px', borderRadius: 5,
            border: '1px solid rgba(74,222,128,0.35)',
            backdropFilter: 'blur(4px)',
          }}>
            Completado
          </span>
        )}

        {/* Draft badge — top left (admin only, shown when not published) */}
        {!course.is_published && (
          <span style={{
            position: 'absolute', top: progress === 100 ? 36 : 10, left: 10,
            background: 'rgba(248,113,113,0.82)',
            color: '#fff',
            fontSize: 10, fontWeight: 700,
            padding: '3px 9px', borderRadius: 5,
            letterSpacing: '.04em',
          }}>
            Borrador
          </span>
        )}

        {/* Drag handle — top left (below badges), admin only */}
        {canReorder && (
          <div
            draggable
            onClick={e => e.stopPropagation()}
            onDragStart={e => { e.stopPropagation(); onDragStartHandle(e); }}
            onDragEnd={onDragEndHandle}
            title="Arrastrar para reordenar"
            style={{
              position: 'absolute', bottom: 8, left: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26,
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 'var(--r2)',
              color: '#fff',
              fontSize: 14,
              cursor: 'grab',
              opacity: h ? 1 : 0,
              transition: 'opacity var(--t2) var(--ease)',
              pointerEvents: h ? 'auto' : 'none',
              userSelect: 'none',
            }}
          >⠿</div>
        )}

        {/* Edit / Delete — top right, visible on hover for canEdit */}
        {canEdit && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 8, right: 8,
              display: 'flex', gap: 4,
              opacity: h ? 1 : 0,
              transition: 'opacity var(--t2) var(--ease)',
              pointerEvents: h ? 'auto' : 'none',
            }}
          >
            <button
              onClick={handleEdit}
              title="Editar curso"
              style={{
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                borderRadius: 'var(--r2)',
                padding: '5px 9px',
                fontSize: 12,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              title="Eliminar curso"
              style={{
                background: 'rgba(248,113,113,0.82)',
                border: '1px solid rgba(248,113,113,0.4)',
                color: '#fff',
                borderRadius: 'var(--r2)',
                padding: '5px 9px',
                fontSize: 12,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '14px 16px 0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <h3 style={{
          fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: 'var(--txt-1)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          margin: 0,
        }}>
          {course.title}
        </h3>

        {/* Instructor + lessons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt-3)' }}>
          {course.instructor && (
            <>
              <InstructorAvatar user={course.instructor} size={20} />
              <span style={{ color: 'var(--txt-2)', fontWeight: 500 }}>{instructorName}</span>
              <span style={{ color: 'var(--txt-3)' }}>·</span>
            </>
          )}
          <span>{course.total_lessons} {course.total_lessons === 1 ? 'leccion' : 'lecciones'}</span>
        </div>
      </div>

      {/* Progress bar — pinned to bottom */}
      <div style={{ padding: '12px 16px 14px' }}>
        <div style={{ height: 5, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width .6s var(--ease)',
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Compact landscape card for "Continue Learning" strip ── */
function ContinueCard({ course, index, onCourseClick }) {
  const navigate = useNavigate();
  const [h, setH] = useState(false);
  const progress = course.user_progress || 0;

  const instructorName = course.instructor
    ? (course.instructor.first_name || course.instructor.username)
    : null;

  return (
    <div
      onClick={() => onCourseClick ? onCourseClick(course.id) : navigate(`/classroom/${course.id}`)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 'clamp(220px, 45vw, 280px)',
        minWidth: 'clamp(220px, 45vw, 280px)',
        height: 90,
        display: 'flex',
        flexDirection: 'row',
        background: 'var(--bg-2)',
        border: `1px solid ${h ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--r3)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: h ? 'var(--s2)' : 'var(--s1)',
        transition: 'box-shadow var(--t2) var(--ease), border-color var(--t2) var(--ease)',
        flexShrink: 0,
      }}
    >
      {/* Thumbnail left */}
      <div style={{
        width: 120,
        minWidth: 120,
        position: 'relative',
        background: course.banner ? 'var(--bg-3)' : GRADS[index % GRADS.length],
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {course.banner && (
          <img
            src={course.banner}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.22)',
          opacity: h ? 1 : 0,
          transition: 'opacity var(--t2) var(--ease)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" opacity="0.9">
            <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
            <path d="M10 8l6 4-6 4V8z" />
          </svg>
        </div>
      </div>

      {/* Info right */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p style={{
            fontSize: 12, fontWeight: 700, color: 'var(--txt-1)', lineHeight: 1.3, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {course.title}
          </p>
          {instructorName && (
            <p style={{ fontSize: 11, color: 'var(--txt-3)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {instructorName}
            </p>
          )}
        </div>
        {/* Progress bar */}
        <div>
          <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--gold)', borderRadius: 2,
              transition: 'width .6s var(--ease)',
            }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--txt-3)', margin: '4px 0 0' }}>{progress}% completado</p>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: '', short_description: '', description: '', is_published: false };

function CourseModal({ open, onClose, onSaved, initial }) {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [bannerFile, setBannerFile] = useState(null);    // File object to upload
  const [bannerPreview, setBannerPreview] = useState(null); // URL for preview
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const overlayRef = useRef(null);
  const fileRef    = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        title: initial.title || '',
        short_description: initial.short_description || '',
        description: initial.description || '',
        is_published: !!initial.is_published,
      } : EMPTY_FORM);
      setBannerFile(null);
      setBannerPreview(initial?.banner || null);
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pickBanner = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeBanner = () => { setBannerFile(null); setBannerPreview(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      let res;
      // Use FormData when there's a new banner file, otherwise plain JSON
      if (bannerFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('banner', bannerFile);
        const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
        res = initial
          ? await api.patch(`/classroom/courses/${initial.id}/edit/`, fd, cfg)
          : await api.post('/classroom/courses/create/', fd, cfg);
      } else if (!bannerPreview && initial?.banner) {
        // Banner was removed
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('banner', '');
        const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
        res = await api.patch(`/classroom/courses/${initial.id}/edit/`, fd, cfg);
      } else {
        res = initial
          ? await api.patch(`/classroom/courses/${initial.id}/edit/`, form)
          : await api.post('/classroom/courses/create/', form);
      }
      onSaved(res.data, !!initial);
      onClose();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Error al guardar el curso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="ap-modal" style={{ maxWidth: 520 }}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">{initial ? 'Editar curso' : 'Crear nuevo curso'}</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Banner picker */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em', marginBottom: 8 }}>IMAGEN DE PORTADA</p>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                height: 130, borderRadius: 'var(--r3)', overflow: 'hidden', cursor: 'pointer',
                background: bannerPreview
                  ? `url(${bannerPreview}) center/cover no-repeat`
                  : 'var(--bg-3)',
                border: `1px dashed ${bannerPreview ? 'transparent' : 'var(--line-2)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'border-color var(--t1)', position: 'relative',
              }}
              onMouseEnter={e => { if (!bannerPreview) e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onMouseLeave={e => { if (!bannerPreview) e.currentTarget.style.borderColor = 'var(--line-2)'; }}
            >
              {bannerPreview && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity var(--t1)' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Cambiar imagen</span>
              </div>}
              {!bannerPreview && <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--txt-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 13, color: 'var(--txt-4)' }}>Subir imagen de portada</span>
                <span style={{ fontSize: 11, color: 'var(--txt-4)' }}>JPG, PNG · recomendado 1280×720</span>
              </>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickBanner} />
            </div>
            {bannerPreview && (
              <button type="button" onClick={removeBanner}
                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}>
                × Quitar imagen
              </button>
            )}
          </div>

          <Input
            label="TÍTULO"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Nombre del curso"
          />
          <Input
            label="DESCRIPCIÓN CORTA"
            value={form.short_description}
            onChange={e => set('short_description', e.target.value)}
            placeholder="Resumen breve (máx. 300 car.)"
          />
          <Input
            label="DESCRIPCIÓN COMPLETA"
            textarea
            rows={4}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descripción detallada del curso"
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--txt-2)' }}>
            <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)}
              style={{ accentColor: 'var(--green)', width: 15, height: 15 }} />
            Publicado
          </label>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--r2)', padding: '8px 12px' }}>
              ⚠ {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" size="sm" type="button" onClick={onClose}>Cancelar</Btn>
            <Btn size="sm" type="submit" loading={saving}>
              {initial ? 'Guardar cambios' : 'Crear curso'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, course, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null);
  if (!open || !course) return null;
  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', width: '100%', maxWidth: 380, padding: 28, boxShadow: 'var(--s3)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 10 }}>Eliminar curso</h2>
        <p style={{ fontSize: 13, color: 'var(--txt-2)', marginBottom: 20, lineHeight: 1.6 }}>
          ¿Seguro que quieres eliminar <strong style={{ color: 'var(--txt-1)' }}>{course.title}</strong>? Esta acción no se puede deshacer y eliminará todos sus módulos y lecciones.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" size="sm" loading={loading} onClick={onConfirm}>Eliminar</Btn>
        </div>
      </div>
    </div>
  );
}

export default function Classroom() {
  const { user, membership } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const role = user?.role || 'member';
  const isAdmin = role === 'admin';
  const canManage = isAdmin || role === 'instructor';
  const hasMembership = role === 'admin' || role === 'instructor' || membership?.is_active;

  useEffect(() => {
    api.get('/classroom/courses/')
      .then(r => setCourses(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (savedCourse, isEdit) => {
    if (isEdit) {
      setCourses(prev => prev.map(c => c.id === savedCourse.id ? { ...c, ...savedCourse } : c));
    } else {
      setCourses(prev => [savedCourse, ...prev]);
    }
  };

  const openCreate = () => { setEditCourse(null); setModalOpen(true); };
  const openEdit = (course) => { setEditCourse(course); setModalOpen(true); };
  const openDelete = (course) => setDeleteCourse(course);

  const [draggingCourseIndex, setDraggingCourseIndex] = useState(null);
  const [courseDropTarget, setCourseDropTarget] = useState(null); // { index, side }

  const handleCourseDragStart = (index) => (e) => {
    setDraggingCourseIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'course');
  };

  const handleCourseDragOver = (index) => (e) => {
    e.preventDefault();
    if (draggingCourseIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const side = (e.clientX - rect.left) > rect.width / 2 ? 'after' : 'before';
    setCourseDropTarget({ index, side });
  };

  const handleCourseDrop = (index) => (e) => {
    e.preventDefault();
    if (draggingCourseIndex === null || !courseDropTarget) { setDraggingCourseIndex(null); setCourseDropTarget(null); return; }
    let targetIndex = courseDropTarget.side === 'after' ? index + 1 : index;
    const fromIndex = draggingCourseIndex;
    setDraggingCourseIndex(null);
    setCourseDropTarget(null);
    if (fromIndex < targetIndex) targetIndex -= 1;
    if (fromIndex === targetIndex) return;
    const list = [...courses];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(targetIndex, 0, moved);
    setCourses(list);
    list.forEach((c, i) => {
      api.patch(`/classroom/courses/${c.id}/edit/`, { order: i }).catch(() => {});
    });
  };

  const handleCourseDragEnd = () => { setDraggingCourseIndex(null); setCourseDropTarget(null); };

  const confirmDelete = async () => {
    if (!deleteCourse) return;
    setDeleting(true);
    try {
      await api.delete(`/classroom/courses/${deleteCourse.id}/delete/`);
      setCourses(prev => prev.filter(c => c.id !== deleteCourse.id));
      setDeleteCourse(null);
    } catch (err) {
      alert('Error al eliminar el curso. Inténtalo de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const visibleCourses = courses;
  const inProgressCourses = visibleCourses.filter(c => (c.user_progress || 0) > 0 && (c.user_progress || 0) < 100);

  const handleCourseClick = (courseId) => {
    if (!hasMembership) { setPaywallOpen(true); return; }
    navigate(`/classroom/${courseId}`);
  };

  return (
    <div>
      <style>{`
        @media (max-width: 640px) {
          .classroom-grid { grid-template-columns: 1fr !important; }
          .continue-scroll { grid-template-columns: repeat(2, clamp(180px, 42vw, 240px)) !important; }
        }
        @media (max-width: 400px) {
          .continue-scroll { grid-template-columns: 1fr !important; }
          .continue-scroll > * { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', margin: 0, lineHeight: 1.2 }}>
            Classroom
          </h1>
          {!loading && (
            <p style={{ fontSize: 13, color: 'var(--txt-3)', margin: '4px 0 0' }}>
              {visibleCourses.length} {visibleCourses.length === 1 ? 'curso' : 'cursos'}
            </p>
          )}
        </div>
        {isAdmin && (
          <Btn size="sm" onClick={openCreate}>
            + New course
          </Btn>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: 20 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} height={290} />)}
        </div>
      ) : visibleCourses.length === 0 ? (
        <Empty
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          }
          title="No hay cursos disponibles"
          desc="El equipo está preparando el contenido."
        />
      ) : (
        <>
          {/* Continue Learning strip */}
          {inProgressCourses.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-2)', letterSpacing: '.04em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                Continue learning
              </h2>
              <div
                className="continue-scroll"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 6,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--line) transparent',
                }}
              >
                {inProgressCourses.map((c, i) => (
                  <ContinueCard key={c.id} course={c} index={i} onCourseClick={handleCourseClick} />
                ))}
              </div>
            </section>
          )}

          {/* Main course grid */}
          <div
            className="stagger classroom-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))',
              gap: 20,
            }}
          >
            {visibleCourses.map((c, i) => (
              <CourseCard
                key={c.id}
                course={c}
                index={i}
                canEdit={canManage && (isAdmin || c.instructor?.id === user?.id)}
                onEdit={openEdit}
                onDelete={openDelete}
                onCourseClick={handleCourseClick}
                canReorder={isAdmin}
                isDragging={draggingCourseIndex === i}
                dropSide={courseDropTarget?.index === i ? courseDropTarget.side : null}
                onDragStartHandle={handleCourseDragStart(i)}
                onDragOverCard={handleCourseDragOver(i)}
                onDropCard={handleCourseDrop(i)}
                onDragEndHandle={handleCourseDragEnd}
              />
            ))}
          </div>
        </>
      )}

      {paywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}

      <CourseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        initial={editCourse}
      />

      <DeleteConfirmModal
        open={!!deleteCourse}
        course={deleteCourse}
        onClose={() => setDeleteCourse(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
