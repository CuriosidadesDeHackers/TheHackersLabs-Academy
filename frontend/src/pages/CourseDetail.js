import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { Btn, Spinner, Badge, Input } from '../components/ui/index';

// ─── Small helpers ────────────────────────────────────────────────────────────

function IconBtn({ children, onClick, title, variant = 'ghost', style: sx }) {
  const [h, setH] = useState(false);
  const colors = {
    ghost: { bg: h ? 'var(--bg-4)' : 'transparent', color: 'var(--txt-3)', border: 'var(--line)' },
    danger: { bg: h ? 'rgba(248,113,113,0.18)' : 'rgba(248,113,113,0.08)', color: 'var(--red)', border: 'rgba(248,113,113,0.2)' },
    accent: { bg: h ? 'rgba(245,166,35,0.18)' : 'rgba(245,166,35,0.08)', color: 'var(--gold)', border: 'rgba(245,166,35,0.3)' },
  };
  const c = colors[variant] || colors.ghost;
  return (
    <button
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        borderRadius: 'var(--r2)', padding: '3px 7px', fontSize: 12,
        cursor: 'pointer', transition: 'all var(--t1)', flexShrink: 0, lineHeight: 1.4,
        ...sx,
      }}
    >{children}</button>
  );
}

// ─── Lesson form modal ────────────────────────────────────────────────────────

const EMPTY_LESSON = { title: '', content_type: 'video', video_url: '', embed_code: '', content: '', duration_minutes: 0, is_free_preview: false };

function LessonModal({ open, onClose, onSaved, initial, moduleId }) {
  const [form, setForm] = useState(EMPTY_LESSON);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);
  const videoFileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        title: initial.title || '',
        content_type: initial.content_type || 'video',
        video_url: initial.video_url || '',
        embed_code: initial.embed_code || '',
        content: initial.content || '',
        duration_minutes: initial.duration_minutes || 0,
        is_free_preview: !!initial.is_free_preview,
      } : EMPTY_LESSON);
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/auth/admin/upload-media/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('video_url', data.url);
    } catch {
      setError('Error al subir el archivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      let res;
      if (initial) {
        res = await api.patch(`/classroom/lessons/${initial.id}/edit/`, form);
      } else {
        res = await api.post(`/classroom/modules/${moduleId}/lessons/`, form);
      }
      onSaved(res.data, !!initial);
      onClose();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Error al guardar la lección.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal((
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', overflowY: 'auto', padding: '40px 20px', boxSizing: 'border-box' }}
    >
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', width: '100%', maxWidth: 540, padding: 28, boxShadow: 'var(--s3)', margin: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt-1)' }}>{initial ? 'Editar lección' : 'Nueva lección'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="TÍTULO" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Título de la lección" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>TIPO</label>
            <select
              value={form.content_type}
              onChange={e => set('content_type', e.target.value)}
              style={{ background: 'var(--bg-3)', border: '1.5px solid var(--line)', borderRadius: 'var(--r2)', padding: '10px 14px', color: 'var(--txt-1)', fontSize: 14, outline: 'none', cursor: 'pointer' }}
            >
              <option value="video">Video</option>
              <option value="text">Texto</option>
              <option value="embed">Embed</option>
            </select>
          </div>

          {form.content_type === 'video' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>URL DEL VIDEO</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={form.video_url}
                  onChange={e => set('video_url', e.target.value)}
                  placeholder="https://... o sube un archivo"
                  style={{ flex: 1, background: 'var(--bg-3)', border: '1.5px solid var(--line)', borderRadius: 'var(--r2)', padding: '10px 14px', color: 'var(--txt-1)', fontSize: 14, outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => videoFileRef.current?.click()}
                  disabled={uploading}
                  style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold)', borderRadius: 'var(--r2)', padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {uploading ? 'Subiendo…' : '⬆ Subir'}
                </button>
              </div>
              {form.video_url && (
                <span style={{ fontSize: 11, color: 'var(--txt-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.video_url}</span>
              )}
              <input ref={videoFileRef} type="file" accept="video/*,image/*" style={{ display: 'none' }} onChange={uploadVideo} />
            </div>
          )}
          {form.content_type === 'embed' && (
            <Input label="CÓDIGO EMBED" textarea rows={3} value={form.embed_code} onChange={e => set('embed_code', e.target.value)} placeholder="<iframe ...>" />
          )}
          <Input label="CONTENIDO (texto/notas)" textarea rows={3} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Descripción o notas de la lección" />

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Input label="DURACIÓN (min)" type="number" min="0" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value) || 0)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--txt-2)', paddingTop: 18 }}>
              <input type="checkbox" checked={form.is_free_preview} onChange={e => set('is_free_preview', e.target.checked)}
                style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
              Preview gratuita
            </label>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--r2)', padding: '8px 12px' }}>⚠ {error}</p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" size="sm" type="button" onClick={onClose}>Cancelar</Btn>
            <Btn size="sm" type="submit" loading={saving}>{initial ? 'Guardar' : 'Crear lección'}</Btn>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
}

// ─── Inline module name editor ────────────────────────────────────────────────

function ModuleNameEditor({ mod, onSave, onCancel }) {
  const [title, setTitle] = useState(mod.title);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch(`/classroom/modules/${mod.id}/`, { title: title.trim() });
      onSave(res.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 10px', background: 'var(--bg-3)' }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
        style={{ flex: 1, background: 'var(--bg-4)', border: '1px solid var(--gold)', borderRadius: 'var(--r2)', padding: '5px 9px', color: 'var(--txt-1)', fontSize: 13, outline: 'none' }}
      />
      <Btn size="xs" onClick={handleSave} loading={saving}>✓</Btn>
      <Btn size="xs" variant="ghost" onClick={onCancel}>✕</Btn>
    </div>
  );
}

// ─── Course edit inline form ──────────────────────────────────────────────────

function CourseEditForm({ course, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: course.title || '',
    short_description: course.short_description || '',
    description: course.description || '',
    is_published: !!course.is_published,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/classroom/courses/${course.id}/edit/`, form);
      onSaved(res.data);
    } catch (err) {
      const d = err.response?.data;
      setError(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="TÍTULO" value={form.title} onChange={e => set('title', e.target.value)} />
      <Input label="DESCRIPCIÓN CORTA" value={form.short_description} onChange={e => set('short_description', e.target.value)} />
      <Input label="DESCRIPCIÓN" textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--txt-2)' }}>
        <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} style={{ accentColor: 'var(--green)', width: 15, height: 15 }} />
        Publicado
      </label>
      {error && <p style={{ fontSize: 12, color: 'var(--red)' }}>⚠ {error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn size="sm" type="submit" loading={saving}>Guardar cambios</Btn>
        <Btn size="sm" variant="ghost" type="button" onClick={onCancel}>Cancelar</Btn>
      </div>
    </form>
  );
}

// ─── Attachment Manager ───────────────────────────────────────────────────────

function AttachmentManager({ lessonId, canEdit }) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/classroom/lessons/${lessonId}/attachments/`);
      setAttachments(r.data.results || r.data);
    } catch {}
    setLoaded(true);
  }, [lessonId]);

  // Non-editors: load attachments on mount to show download list
  useEffect(() => { if (!canEdit) load(); }, [lessonId, canEdit, load]);

  const handleToggle = () => {
    if (!open && !loaded) load();
    setOpen(o => !o);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/classroom/lessons/${lessonId}/attachments/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch {
      alert('Error al subir el archivo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    try {
      await api.delete(`/classroom/attachments/${id}/`);
      setAttachments(a => a.filter(x => x.id !== id));
    } catch {
      alert('Error al eliminar el adjunto.');
    }
  };

  return (
    <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-3)' }} onClick={e => e.stopPropagation()}>
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
          <button
            onClick={handleToggle}
            style={{ background: 'none', border: 'none', color: open ? 'var(--gold)' : 'var(--txt-3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', transition: 'color var(--t1)' }}
          >
            <span>📎</span>
            <span style={{ fontWeight: 600 }}>Adjuntos {loaded && attachments.length > 0 ? `(${attachments.length})` : ''}</span>
            <span style={{ fontSize: 9 }}>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ marginLeft: 'auto', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', color: 'var(--gold)', borderRadius: 'var(--r2)', padding: '3px 9px', fontSize: 11, cursor: uploading ? 'wait' : 'pointer', fontWeight: 600 }}
              >
                {uploading ? 'Subiendo...' : '+ Subir'}
              </button>
            </>
          )}
        </div>
      )}

      {!canEdit && attachments.length > 0 && (
        <div style={{ padding: '6px 12px 4px', fontSize: 11, color: 'var(--txt-3)', fontWeight: 600 }}>
          📎 Adjuntos ({attachments.length})
        </div>
      )}

      {(open || (!canEdit && attachments.length > 0)) && (
        <div style={{ padding: '0 12px 8px' }}>
          {!loaded && <p style={{ fontSize: 11, color: 'var(--txt-3)', padding: '4px 0' }}>Cargando...</p>}
          {loaded && attachments.length === 0 && canEdit && (
            <p style={{ fontSize: 11, color: 'var(--txt-3)', padding: '4px 0', fontStyle: 'italic' }}>Sin adjuntos. Sube el primero.</p>
          )}
          {attachments.map(att => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, fontSize: 11, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-2)'}
              >{att.name}</a>
              <span style={{ fontSize: 10, color: 'var(--txt-4)', flexShrink: 0 }}>{att.file_size_display}</span>
              {canEdit && (
                <button onClick={() => handleDelete(att.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 2px', opacity: 0.7, flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                  title="Eliminar adjunto"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openMods, setOpenMods] = useState({});
  const [editingCourse, setEditingCourse] = useState(false);

  // Module state
  const [editingModId, setEditingModId] = useState(null);
  const [addingModule, setAddingModule] = useState(false);
  const [newModTitle, setNewModTitle] = useState('');
  const [savingMod, setSavingMod] = useState(false);

  // Lesson modal
  const [lessonModal, setLessonModal] = useState({ open: false, moduleId: null, lesson: null });

  useEffect(() => {
    api.get(`/classroom/courses/${id}/`)
      .then(r => {
        const firstLesson = r.data.modules?.[0]?.lessons?.[0];
        if (firstLesson) {
          navigate(`/classroom/${id}/lesson/${firstLesson.id}`, { replace: true });
          return;
        }
        setCourse(r.data);
        if (r.data.modules?.[0]) setOpenMods({ [r.data.modules[0].id]: true });
      })
      .catch(() => navigate('/classroom'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Spinner label="Cargando curso..." />;
  if (!course) return null;

  const role = user?.role || 'member';
  const isAdmin = role === 'admin';
  const isOwnerInstructor = role === 'instructor' && course.instructor?.id === user?.id;
  const canEdit = isAdmin || isOwnerInstructor;

  const allLessons = course.modules?.flatMap(m => m.lessons) || [];
  const completed = allLessons.filter(l => l.is_completed).length;
  const progress = allLessons.length ? Math.round((completed / allLessons.length) * 100) : 0;
  const toggle = (mid) => setOpenMods(p => ({ ...p, [mid]: !p[mid] }));

  // ─ Course update ─
  const handleCourseSaved = (updated) => {
    setCourse(prev => ({ ...prev, ...updated }));
    setEditingCourse(false);
  };

  // ─ Module actions ─
  const handleModuleSaved = (updated) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === updated.id ? { ...m, ...updated } : m),
    }));
    setEditingModId(null);
  };

  const handleAddModule = async () => {
    if (!newModTitle.trim()) return;
    setSavingMod(true);
    try {
      const res = await api.post(`/classroom/courses/${id}/modules/`, { title: newModTitle.trim(), order: (course.modules?.length || 0) * 10 });
      setCourse(prev => ({ ...prev, modules: [...(prev.modules || []), { ...res.data, lessons: [] }] }));
      setNewModTitle('');
      setAddingModule(false);
      setOpenMods(p => ({ ...p, [res.data.id]: true }));
    } catch (err) {
      alert('Error al crear el módulo.');
    } finally {
      setSavingMod(false);
    }
  };

  const handleDeleteModule = async (mod) => {
    if (!window.confirm(`¿Eliminar el módulo "${mod.title}" y todas sus lecciones?`)) return;
    try {
      await api.delete(`/classroom/modules/${mod.id}/delete/`);
      setCourse(prev => ({ ...prev, modules: prev.modules.filter(m => m.id !== mod.id) }));
    } catch {
      alert('Error al eliminar el módulo.');
    }
  };

  // ─ Lesson actions ─
  const handleLessonSaved = (savedLesson, isEdit) => {
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (isEdit && m.lessons.some(l => l.id === savedLesson.id)) {
          return { ...m, lessons: m.lessons.map(l => l.id === savedLesson.id ? { ...l, ...savedLesson } : l) };
        }
        if (!isEdit && m.id === lessonModal.moduleId) {
          return { ...m, lessons: [...m.lessons, { ...savedLesson, is_completed: false }] };
        }
        return m;
      }),
    }));
  };

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    try {
      await api.delete(`/classroom/lessons/${lesson.id}/delete/`);
      setCourse(prev => ({
        ...prev,
        modules: prev.modules.map(m => ({ ...m, lessons: m.lessons.filter(l => l.id !== lesson.id) })),
      }));
    } catch {
      alert('Error al eliminar la lección.');
    }
  };

  return (
    <div className="course-grid">
      {/* ── Sidebar ── */}
      <div className="course-sidebar">
        <button
          onClick={() => navigate('/classroom')}
          style={{ background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0, transition: 'color var(--t1)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}
        >
          ← Classroom
        </button>

        {/* Progress card */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '16px', marginBottom: 12 }} className="a-up">
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, lineHeight: 1.35 }}>{course.title}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--txt-3)' }}>Progreso</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'var(--gold)', borderRadius: 3, transition: 'width .6s var(--ease)' }} />
          </div>
        </div>

        {/* Module tree */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', background: 'var(--bg-2)' }} className="a-up">
          {course.modules?.map((mod, mi) => (
            <div key={mod.id} style={{ borderBottom: '1px solid var(--line)' }}>

              {/* Module header */}
              {editingModId === mod.id ? (
                <ModuleNameEditor mod={mod} onSave={handleModuleSaved} onCancel={() => setEditingModId(null)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', background: openMods[mod.id] ? 'var(--bg-3)' : 'transparent' }}>
                  <button
                    onClick={() => toggle(mod.id)}
                    style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-1)', textAlign: 'left', minWidth: 0 }}
                    onMouseEnter={e => e.currentTarget.parentElement.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.parentElement.style.background = openMods[mod.id] ? 'var(--bg-3)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform var(--t1)', transform: openMods[mod.id] ? 'rotate(90deg)' : 'none' }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--txt-1)' }}>{mod.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--txt-3)', flexShrink: 0, marginLeft: 8 }}>
                      {mod.lessons?.length || 0} lecciones
                    </span>
                  </button>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 3, paddingRight: 12, flexShrink: 0 }}>
                      <IconBtn title="Editar módulo" variant="accent" onClick={() => setEditingModId(mod.id)}>✏</IconBtn>
                      <IconBtn title="Eliminar módulo" variant="danger" onClick={() => handleDeleteModule(mod)}>🗑</IconBtn>
                    </div>
                  )}
                </div>
              )}

              {/* Lessons */}
              {openMods[mod.id] && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {mod.lessons?.map(l => (
                    <div key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <div
                        onClick={() => navigate(`/classroom/${id}/lesson/${l.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px 13px 44px', cursor: 'pointer', transition: 'background var(--t1)', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Completion icon */}
                        {l.is_completed ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--green)" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="12" fill="var(--green)" opacity="0.15"/>
                            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" stroke="var(--line-2)" strokeWidth="1.5"/>
                            <path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="var(--txt-3)"/>
                          </svg>
                        )}

                        {/* Title */}
                        <span style={{ fontSize: 13, color: l.is_completed ? 'var(--txt-3)' : 'var(--txt-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                          {l.title}
                        </span>

                        {/* Meta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {l.is_free_preview && !canEdit && (
                            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)' }}>FREE</span>
                          )}
                          {l.duration_minutes > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{l.duration_minutes}m</span>
                          )}
                          {canEdit && (
                            <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                              <IconBtn title="Editar lección" variant="accent" onClick={() => setLessonModal({ open: true, moduleId: mod.id, lesson: l })}>✏</IconBtn>
                              <IconBtn title="Eliminar lección" variant="danger" onClick={() => handleDeleteLesson(l)}>🗑</IconBtn>
                            </div>
                          )}
                        </div>
                      </div>
                      <AttachmentManager lessonId={l.id} canEdit={canEdit} />
                    </div>
                  ))}

                  {/* Add lesson */}
                  {canEdit && (
                    <div style={{ padding: '8px 12px' }}>
                      <button
                        onClick={() => setLessonModal({ open: true, moduleId: mod.id, lesson: null })}
                        style={{ background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--txt-3)', borderRadius: 'var(--r2)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%', transition: 'all var(--t1)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-3)'; }}
                      >+ Añadir lección</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add module */}
          {canEdit && (
            <div style={{ borderTop: course.modules?.length ? '1px solid var(--line)' : 'none' }}>
              {addingModule ? (
                <div style={{ padding: '8px 10px', display: 'flex', gap: 6, background: 'var(--bg-3)' }}>
                  <input
                    autoFocus
                    value={newModTitle}
                    onChange={e => setNewModTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') { setAddingModule(false); setNewModTitle(''); } }}
                    placeholder="Nombre del módulo"
                    style={{ flex: 1, background: 'var(--bg-4)', border: '1px solid var(--gold)', borderRadius: 'var(--r2)', padding: '5px 9px', color: 'var(--txt-1)', fontSize: 12, outline: 'none' }}
                  />
                  <Btn size="xs" onClick={handleAddModule} loading={savingMod}>✓</Btn>
                  <Btn size="xs" variant="ghost" onClick={() => { setAddingModule(false); setNewModTitle(''); }}>✕</Btn>
                </div>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '10px 14px', color: 'var(--txt-3)', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'all var(--t1)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--txt-3)'; }}
                >
                  + Añadir módulo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="a-up">
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', marginBottom: 20 }}>
          {/* Banner */}
          <div style={{ height: 220, background: course.banner ? `url(${course.banner}) center/cover` : 'linear-gradient(135deg,#1a237e,#283593)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            {!course.banner && '🎓'}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {editingCourse ? (
              <CourseEditForm course={course} onSaved={handleCourseSaved} onCancel={() => setEditingCourse(false)} />
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!course.is_published && <Badge color="var(--red)">BORRADOR</Badge>}
                  <Badge color="var(--blue)">{allLessons.length} lecciones</Badge>
                  <Badge color="var(--green)">{completed} completadas</Badge>
                  {canEdit && (
                    <Btn
                      size="xs"
                      variant="accent"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setEditingCourse(true)}
                    >
                      ✏ Editar curso
                    </Btn>
                  )}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 12 }}>{course.title}</h1>
                <p style={{ color: 'var(--txt-2)', lineHeight: 1.75, marginBottom: 20 }}>{course.description}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lesson modal */}
      <LessonModal
        open={lessonModal.open}
        onClose={() => setLessonModal({ open: false, moduleId: null, lesson: null })}
        onSaved={handleLessonSaved}
        initial={lessonModal.lesson}
        moduleId={lessonModal.moduleId}
      />
    </div>
  );
}
