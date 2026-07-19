import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { Btn, Spinner } from '../components/ui/index';
import './AdminPanel.css';

/* ── Helpers ── */
function getYouTubeId(url) {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}
function getVimeoId(url) {
  const m = url?.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function VideoPlayer({ url }) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  const vmId = getVimeoId(url);
  const src = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : vmId
    ? `https://player.vimeo.com/video/${vmId}`
    : null;

  return (
    <div style={{ borderRadius: 'var(--r4)', overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 24, background: '#000' }}>
      {src ? (
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe
            src={src}
            title="Lección"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        /* Direct URL (mp4, etc.) */
        <video controls style={{ width: '100%', display: 'block', maxHeight: 480 }}>
          <source src={url} />
        </video>
      )}
    </div>
  );
}

function NewLessonModal({ open, title, videoUrl, content, pendingFiles, onTitleChange, onVideoUrlChange, onContentChange, onAddFile, onRemoveFile, onCancel, onCreate, creating }) {
  const fileRef = useRef(null);
  if (!open) return null;

  const addFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onAddFile(file);
    e.target.value = '';
  };

  return createPortal((
    <div className="ap-overlay" onClick={onCancel}>
      <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">Nueva lección</span>
          <button className="ap-icon-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div className="ap-form-group">
            <label className="ap-label">Título</label>
            <input
              autoFocus
              className="ap-input"
              placeholder="Título de la lección"
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) onCreate(); if (e.key === 'Escape') onCancel(); }}
            />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">URL de YouTube (opcional)</label>
            <input
              className="ap-input"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={e => onVideoUrlChange(e.target.value)}
            />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Contenido / descripción</label>
            <textarea
              className="ap-input"
              rows={6}
              placeholder="Descripción o notas de la lección"
              value={content}
              onChange={e => onContentChange(e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Recursos descargables</label>
            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {pendingFiles.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <button
                      onClick={() => onRemoveFile(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                      title="Quitar"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px dashed var(--line)', borderRadius: 'var(--r2)', cursor: 'pointer', fontSize: 13, color: 'var(--txt-3)', transition: 'border-color var(--t1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Subir archivo
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={addFile} />
            </label>
          </div>
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={onCancel}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={onCreate} disabled={creating || !title.trim()} style={{ opacity: (!title.trim() || creating) ? 0.5 : 1 }}>
              {creating ? 'Creando…' : 'Crear lección'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [openMods, setOpenMods] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [earnedCertificate, setEarnedCertificate] = useState(null);
  const [courseCertificate, setCourseCertificate] = useState(null);

  // Admin inline edit (lesson content)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', video_url: '', duration_minutes: 0 });
  const [saving, setSaving] = useState(false);
  const [detectingDuration, setDetectingDuration] = useState(false);

  // Admin create lesson inline
  const [newLesson, setNewLesson] = useState({ moduleId: null, title: '', video_url: '', content: '' });
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);

  // Admin create module inline
  const [newModTitle, setNewModTitle] = useState('');
  const [showNewMod, setShowNewMod] = useState(false);
  const [creatingMod, setCreatingMod] = useState(false);

  // Admin drag & drop
  const [draggingModule, setDraggingModule] = useState(null);
  const [draggingLesson, setDraggingLesson] = useState(null);
  const [modDropIndex, setModDropIndex] = useState(null); // index where the line is shown
  const [lessonDropIndicator, setLessonDropIndicator] = useState(null); // { modId, index }

  const computeDropIndex = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (e.clientY - rect.top) > rect.height / 2 ? index + 1 : index;
  };

  useEffect(() => {
    Promise.all([
      api.get(`/classroom/lessons/${lessonId}/`),
      api.get(`/classroom/courses/${courseId}/`),
    ])
      .then(([l, c]) => {
        setLesson(l.data);
        setCourse(c.data);
        // Open the module that contains the current lesson
        const mod = c.data.modules?.find(m => m.lessons?.some(ls => ls.id === parseInt(lessonId)));
        if (mod) setOpenMods({ [mod.id]: true });
        // Load attachments
        api.get(`/classroom/lessons/${lessonId}/attachments/`)
          .then(r => setAttachments(r.data.results || r.data))
          .catch(() => {});
      })
      .catch(err => {
        if (err.response?.status === 403) navigate('/membership');
        else navigate(`/classroom/${courseId}`);
      })
      .finally(() => setLoading(false));
  }, [lessonId, courseId, navigate]);

  const setLessonCompleted = (done) => {
    setLesson(p => ({ ...p, is_completed: done }));
    setCourse(p => ({
      ...p,
      modules: p.modules?.map(m => ({
        ...m,
        lessons: m.lessons?.map(l =>
          l.id === parseInt(lessonId) ? { ...l, is_completed: done } : l
        ),
      })),
    }));
  };

  const markComplete = async () => {
    setCompleting(true);
    try {
      const { data } = await api.post(`/classroom/lessons/${lessonId}/complete/`);
      setLessonCompleted(true);
      if (data.certificate_issued && data.certificate) {
        setEarnedCertificate(data.certificate);
      }
    } finally {
      setCompleting(false);
    }
  };

  const unmarkComplete = async () => {
    setCompleting(true);
    try {
      await api.delete(`/classroom/lessons/${lessonId}/complete/`);
      setLessonCompleted(false);
    } finally {
      setCompleting(false);
    }
  };

  const startEdit = () => {
    setEditForm({
      title: lesson.title,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      duration_minutes: lesson.duration_minutes || 0,
    });
    setEditing(true);
    if (!lesson.duration_minutes && lesson.video_url) detectDuration(lesson.video_url);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/classroom/lessons/${lessonId}/edit/`, editForm);
      setLesson(p => ({ ...p, ...data }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const detectDuration = async (url) => {
    if (!url) return;
    let oembedUrl = null;
    if (/vimeo\.com/.test(url)) {
      oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    } else if (/youtube\.com|youtu\.be/.test(url)) {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    }
    if (!oembedUrl) return;
    setDetectingDuration(true);
    try {
      const res = await fetch(oembedUrl);
      if (!res.ok) return;
      const data = await res.json();
      if (data.duration) {
        setEditForm(p => ({ ...p, duration_minutes: Math.max(1, Math.round(data.duration / 60)) }));
      }
    } catch {
      // Auto-detección no disponible (p. ej. CORS); el usuario puede introducir los minutos a mano.
    } finally {
      setDetectingDuration(false);
    }
  };

  const uploadAttachment = async (file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    try {
      const { data } = await api.post(`/classroom/lessons/${lessonId}/attachments/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments(p => [...p, data]);
    } catch (e) {
      alert('Error al subir el archivo');
    }
  };

  const deleteAttachment = async (id) => {
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    await api.delete(`/classroom/attachments/${id}/`);
    setAttachments(p => p.filter(a => a.id !== id));
  };

  const createLesson = async () => {
    if (!newLesson.title.trim()) return;
    setCreatingLesson(true);
    try {
      const { data } = await api.post(`/classroom/modules/${newLesson.moduleId}/lessons/`, {
        title: newLesson.title.trim(),
        content_type: 'video',
        video_url: newLesson.video_url.trim(),
        content: newLesson.content.trim(),
        order: 999,
      });
      for (const file of pendingFiles) {
        const form = new FormData();
        form.append('file', file);
        form.append('name', file.name);
        try {
          await api.post(`/classroom/lessons/${data.id}/attachments/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // skip failed uploads, lesson is already created
        }
      }
      setCourse(p => ({
        ...p,
        modules: p.modules.map(m =>
          m.id === newLesson.moduleId
            ? { ...m, lessons: [...(m.lessons || []), data] }
            : m
        ),
      }));
      setNewLesson({ moduleId: null, title: '', video_url: '', content: '' });
      setPendingFiles([]);
    } finally {
      setCreatingLesson(false);
    }
  };

  const createModule = async () => {
    if (!newModTitle.trim()) return;
    setCreatingMod(true);
    try {
      const { data } = await api.post(`/classroom/courses/${courseId}/modules/`, {
        title: newModTitle.trim(),
        order: (course?.modules?.length || 0) + 1,
      });
      setCourse(p => ({ ...p, modules: [...(p.modules || []), { ...data, lessons: [] }] }));
      setOpenMods(p => ({ ...p, [data.id]: true }));
      setNewModTitle('');
      setShowNewMod(false);
    } finally {
      setCreatingMod(false);
    }
  };

  const toggle = (id) => setOpenMods(p => ({ ...p, [id]: !p[id] }));

  const deleteModule = async (mod) => {
    if (!window.confirm(`¿Eliminar el módulo "${mod.title}" y todas sus lecciones?`)) return;
    try {
      await api.delete(`/classroom/modules/${mod.id}/delete/`);
      setCourse(p => ({ ...p, modules: p.modules.filter(m => m.id !== mod.id) }));
    } catch {
      alert('Error al eliminar el módulo.');
    }
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    try {
      await api.delete(`/classroom/lessons/${lesson.id}/delete/`);
      setCourse(p => ({ ...p, modules: p.modules.map(m => ({ ...m, lessons: m.lessons.filter(l => l.id !== lesson.id) })) }));
    } catch {
      alert('Error al eliminar la lección.');
    }
  };

  // ─ Drag & drop: reorder modules ─
  const handleModuleDragStart = (mi) => (e) => {
    setDraggingLesson(null);
    setLessonDropIndicator(null);
    setDraggingModule(mi);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'module');
  };

  const handleModuleDragOver = (mi) => (e) => {
    e.preventDefault();
    if (draggingModule === null) return;
    setModDropIndex(computeDropIndex(e, mi));
  };

  const handleModuleDrop = async () => {
    const fromIndex = draggingModule;
    const targetIndex = modDropIndex;
    setDraggingModule(null);
    setModDropIndex(null);
    if (fromIndex === null || targetIndex === null || !course) return;
    let insertAt = targetIndex;
    if (fromIndex < insertAt) insertAt -= 1;
    if (fromIndex === insertAt) return;
    const mods = [...course.modules];
    const [moved] = mods.splice(fromIndex, 1);
    mods.splice(insertAt, 0, moved);
    setCourse(p => ({ ...p, modules: mods }));
    try {
      await Promise.all(mods.map((m, i) => api.patch(`/classroom/modules/${m.id}/`, { order: i })));
    } catch {
      alert('Error al reordenar el módulo.');
    }
  };

  // ─ Drag & drop: reorder / move lessons (within or across modules) ─
  const handleLessonDragStart = (modId, lessonId) => (e) => {
    setDraggingModule(null);
    setModDropIndex(null);
    setDraggingLesson({ modId, lessonId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'lesson');
  };

  const handleLessonDragOver = (modId, li) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingLesson) return;
    setLessonDropIndicator({ modId, index: computeDropIndex(e, li) });
  };

  const handleModuleHeaderDragOver = (mod) => (e) => {
    e.preventDefault();
    if (draggingLesson) setLessonDropIndicator({ modId: mod.id, index: mod.lessons?.length || 0 });
  };

  const handleLessonDrop = async () => {
    if (!draggingLesson || !lessonDropIndicator || !course) { setDraggingLesson(null); setLessonDropIndicator(null); return; }
    const { modId: srcModId, lessonId } = draggingLesson;
    const { modId: targetModId, index: targetIndex } = lessonDropIndicator;
    setDraggingLesson(null);
    setLessonDropIndicator(null);

    const modules = course.modules.map(m => ({ ...m, lessons: [...(m.lessons || [])] }));
    const srcMod = modules.find(m => m.id === srcModId);
    const tgtMod = modules.find(m => m.id === targetModId);
    if (!srcMod || !tgtMod) return;
    const srcIdx = srcMod.lessons.findIndex(l => l.id === lessonId);
    if (srcIdx === -1) return;
    const [moved] = srcMod.lessons.splice(srcIdx, 1);
    let insertAt = targetIndex;
    if (srcMod.id === tgtMod.id && srcIdx < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(insertAt, tgtMod.lessons.length));
    tgtMod.lessons.splice(insertAt, 0, { ...moved, module: tgtMod.id });

    setCourse(p => ({ ...p, modules }));
    if (srcMod.id !== tgtMod.id) setOpenMods(p => ({ ...p, [tgtMod.id]: true }));

    try {
      const calls = tgtMod.lessons.map((l, i) =>
        api.patch(`/classroom/lessons/${l.id}/edit/`, l.id === lessonId ? { order: i, module: tgtMod.id } : { order: i })
      );
      if (srcMod.id !== tgtMod.id) {
        srcMod.lessons.forEach((l, i) => calls.push(api.patch(`/classroom/lessons/${l.id}/edit/`, { order: i })));
      }
      await Promise.all(calls);
    } catch {
      alert('Error al mover la lección.');
    }
  };

  const progress = course?.user_progress || 0;

  useEffect(() => {
    if (progress === 100 && courseId && !courseCertificate) {
      api.get(`/classroom/certificates/?course=${courseId}`)
        .then(r => {
          const list = r.data.results || r.data;
          if (list.length) setCourseCertificate(list[0]);
        })
        .catch(() => {});
    }
  }, [progress, courseId, courseCertificate]);

  if (loading) return <Spinner label="Cargando lección..." />;
  if (!lesson) return null;

  const isAdmin = user?.role === 'admin';

  const allLessons = course?.modules?.flatMap(m => m.lessons) || [];
  const idx = allLessons.findIndex(l => l.id === parseInt(lessonId));
  const prev = allLessons[idx - 1];
  const next = allLessons[idx + 1];

  return (
    <div className="course-grid">
      {/* ── Sidebar ── */}
      <div className="course-sidebar">
        {/* Back button */}
        <button
          onClick={() => navigate(`/classroom/${courseId}`)}
          style={{ background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0, transition: 'color var(--t1)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}
        >
          ← {course?.title}
        </button>

        {/* Progress card */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '16px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, lineHeight: 1.35 }}>{course?.title}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--txt-3)' }}>Progreso</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'var(--gold)', borderRadius: 3, transition: 'width .6s var(--ease)' }} />
          </div>
          {progress === 100 && courseCertificate && (
            <a href={courseCertificate.image_url} download target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 12 }}>
              <Btn variant="primary" size="sm" full>🎓 Descargar certificado</Btn>
            </a>
          )}
        </div>

        {/* Module tree */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden', background: 'var(--bg-2)', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }} className="a-up">
          {course?.modules?.map((mod, mi) => (
            <React.Fragment key={mod.id}>
            {isAdmin && draggingModule !== null && modDropIndex === mi && <div style={{ height: 3, margin: '-1.5px 0', background: 'var(--gold)', borderRadius: 2 }} />}
            <div
              style={{ borderBottom: '1px solid var(--line)', opacity: draggingModule === mi ? 0.4 : 1 }}
              onDragOver={isAdmin ? handleModuleDragOver(mi) : undefined}
              onDrop={isAdmin ? (e) => { e.preventDefault(); if (draggingModule !== null) handleModuleDrop(); } : undefined}
            >

              {/* Module header */}
              <div
                style={{ display: 'flex', alignItems: 'center', background: openMods[mod.id] ? 'var(--bg-3)' : 'transparent' }}
                onDragOver={isAdmin && draggingLesson ? handleModuleHeaderDragOver(mod) : undefined}
                onDrop={isAdmin && draggingLesson ? (e) => { e.preventDefault(); e.stopPropagation(); handleLessonDrop(); } : undefined}
              >
                {isAdmin && (
                  <span
                    draggable
                    onDragStart={handleModuleDragStart(mi)}
                    onDragEnd={() => { setDraggingModule(null); setModDropIndex(null); }}
                    title="Arrastrar para reordenar"
                    style={{ cursor: 'grab', color: 'var(--txt-4)', fontSize: 14, padding: '0 4px 0 12px', flexShrink: 0, userSelect: 'none' }}
                  >⠿</span>
                )}
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
                {/* Admin: add / delete module */}
                {isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginRight: 10 }} onClick={e => e.stopPropagation()}>
                    <button
                      title="Nueva lección"
                      onClick={() => { setNewLesson({ moduleId: mod.id, title: '', video_url: '', content: '' }); setPendingFiles([]); setOpenMods(p => ({ ...p, [mod.id]: true })); }}
                      style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold)', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                    >+</button>
                    <button title="Eliminar módulo" onClick={() => deleteModule(mod)}
                      style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                  </div>
                )}
              </div>

              {/* Lessons */}
              {openMods[mod.id] && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {mod.lessons?.map((l, li) => {
                    const active = l.id === parseInt(lessonId);
                    const isDraggingThis = draggingLesson?.lessonId === l.id;
                    return (
                      <React.Fragment key={l.id}>
                        {isAdmin && draggingLesson && lessonDropIndicator?.modId === mod.id && lessonDropIndicator?.index === li && (
                          <div style={{ height: 3, margin: '-1.5px 0', background: 'var(--gold)', borderRadius: 2 }} />
                        )}
                        <div
                          onClick={() => navigate(`/classroom/${courseId}/lesson/${l.id}`)}
                          onDragOver={isAdmin ? handleLessonDragOver(mod.id, li) : undefined}
                          onDrop={isAdmin ? (e) => { e.preventDefault(); e.stopPropagation(); handleLessonDrop(); } : undefined}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px 13px 20px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: active ? 'var(--gold-dim)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, opacity: isDraggingThis ? 0.4 : 1, transition: 'background var(--t1)' }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-3)'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {isAdmin && (
                            <span
                              draggable
                              onDragStart={e => { e.stopPropagation(); handleLessonDragStart(mod.id, l.id)(e); }}
                              onDragEnd={() => { setDraggingLesson(null); setLessonDropIndicator(null); }}
                              onClick={e => e.stopPropagation()}
                              title="Arrastrar para mover/reordenar"
                              style={{ cursor: 'grab', color: 'var(--txt-4)', fontSize: 13, flexShrink: 0, userSelect: 'none' }}
                            >⠿</span>
                          )}
                          {l.is_completed ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="12" fill="var(--green)" opacity="0.15"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                          ) : active ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" fill="var(--gold-dim)" stroke="var(--gold)" strokeWidth="1.5"/><path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="var(--gold)"/></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="var(--line-2)" strokeWidth="1.5"/><path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="var(--txt-3)"/></svg>
                          )}
                          <span style={{ fontSize: 13, color: active ? 'var(--gold)' : l.is_completed ? 'var(--txt-3)' : 'var(--txt-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, fontWeight: active ? 700 : 400 }}>{l.title}</span>
                          {l.duration_minutes > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--txt-3)', flexShrink: 0 }}>{l.duration_minutes}m</span>
                          )}
                          {isAdmin && (
                            <button title="Eliminar lección" onClick={e => { e.stopPropagation(); deleteLesson(l); }}
                              style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🗑</button>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {isAdmin && draggingLesson && lessonDropIndicator?.modId === mod.id && lessonDropIndicator?.index === (mod.lessons?.length || 0) && (
                    <div style={{ height: 3, margin: '-1.5px 0', background: 'var(--gold)', borderRadius: 2 }} />
                  )}
                  {isAdmin && (
                    <div
                      onDragOver={handleLessonDragOver(mod.id, mod.lessons?.length || 0)}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleLessonDrop(); }}
                      style={{ height: 10 }}
                    />
                  )}
                </div>
              )}
            </div>
            </React.Fragment>
          ))}
          {isAdmin && draggingModule !== null && modDropIndex === (course?.modules?.length || 0) && (
            <div style={{ height: 3, margin: '-1.5px 0', background: 'var(--gold)', borderRadius: 2 }} />
          )}

          {/* Admin: new module inline form */}
          {isAdmin && (
            showNewMod ? (
              <div style={{ padding: '12px 14px', background: 'var(--bg-1)', borderTop: course?.modules?.length ? '1px solid var(--line)' : 'none' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Nueva sección</p>
                <input
                  autoFocus
                  placeholder="Título de la sección"
                  value={newModTitle}
                  onChange={e => setNewModTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createModule(); if (e.key === 'Escape') { setShowNewMod(false); setNewModTitle(''); } }}
                  style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '7px 10px', color: 'var(--txt-1)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowNewMod(false); setNewModTitle(''); }} style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px', color: 'var(--txt-3)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={createModule} disabled={creatingMod || !newModTitle.trim()} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (!newModTitle.trim() || creatingMod) ? 0.5 : 1 }}>
                    {creatingMod ? '…' : 'Crear sección'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewMod(true)}
                style={{ width: '100%', padding: '11px 18px', background: 'transparent', border: 'none', borderTop: course?.modules?.length ? '1px solid var(--line)' : 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'color var(--t1)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nueva sección
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="a-up">
        {/* Header */}
        {!editing && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.3px', color: 'var(--txt-1)' }}>{lesson.title}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {isAdmin && (
                <Btn variant="ghost" size="sm" onClick={startEdit} style={{ fontSize: 12 }}>✏ Editar</Btn>
              )}
              {lesson.is_completed ? (
                <button
                  onClick={unmarkComplete}
                  disabled={completing}
                  title="Click para desmarcar"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 'var(--r2)', fontSize: 13, color: 'var(--green)', fontWeight: 700, cursor: completing ? 'wait' : 'pointer', transition: 'all var(--t1)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.25)'; e.currentTarget.style.color = 'var(--green)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Completada
                </button>
              ) : (
                <Btn onClick={markComplete} loading={completing} size="sm">
                  Marcar completada
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* Video */}
        {lesson.content_type === 'video' && lesson.video_url && (
          <VideoPlayer url={lesson.video_url} />
        )}

        {/* Embed */}
        {lesson.content_type === 'embed' && lesson.embed_code && (
          <div
            dangerouslySetInnerHTML={{ __html: lesson.embed_code }}
            style={{ marginBottom: 24, borderRadius: 'var(--r4)', overflow: 'hidden', border: '1px solid var(--line)' }}
          />
        )}

        {/* Markdown content */}
        {lesson.content && (
          <div className="lesson-md" style={{ marginBottom: 24 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {lesson.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              Recursos y adjuntos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map(att => (
                <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', textDecoration: 'none', transition: 'all var(--t1)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--bg-4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--txt-3)', flexShrink: 0 }}>{att.file_size_display}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <Btn
            onClick={() => prev && navigate(`/classroom/${courseId}/lesson/${prev.id}`)}
            disabled={!prev}
            variant="secondary"
          >← Anterior</Btn>
          <Btn
            onClick={() => next && navigate(`/classroom/${courseId}/lesson/${next.id}`)}
            disabled={!next}
          >Siguiente →</Btn>
        </div>
      </div>

      {earnedCertificate && createPortal((
        <div className="ap-overlay" onClick={() => setEarnedCertificate(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="ap-modal-header">
              <span className="ap-modal-title">Curso completado</span>
              <button className="ap-icon-btn" onClick={() => setEarnedCertificate(null)}>✕</button>
            </div>
            <div className="ap-modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: 46, marginBottom: 6 }}>🎉</div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--txt-1)' }}>¡Enhorabuena!</h2>
              <p style={{ fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.6 }}>
                Has completado el curso <strong style={{ color: 'var(--gold)' }}>{earnedCertificate.course_title}</strong>.
                Tu certificado ya está disponible.
              </p>
            </div>
            <div className="ap-modal-footer" style={{ justifyContent: 'center', padding: '0 20px 20px' }}>
              <button className="ap-btn ap-btn-ghost" onClick={() => setEarnedCertificate(null)}>Cerrar</button>
              <a href={earnedCertificate.image_url} download target="_blank" rel="noreferrer">
                <button className="ap-btn ap-btn-gold">⬇ Descargar certificado</button>
              </a>
            </div>
          </div>
        </div>
      ), document.body)}

      {editing && createPortal((
        <div className="ap-overlay" onClick={() => setEditing(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="ap-modal-header">
              <span className="ap-modal-title">Editando lección</span>
              <button className="ap-icon-btn" onClick={() => setEditing(false)}>✕</button>
            </div>
            <div className="ap-modal-body">
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt-3)', display: 'block', marginBottom: 4 }}>Título</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 12px', color: 'var(--txt-1)', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt-3)', display: 'block', marginBottom: 4 }}>URL del vídeo</label>
                <input
                  value={editForm.video_url}
                  onChange={e => setEditForm(p => ({ ...p, video_url: e.target.value }))}
                  onBlur={e => detectDuration(e.target.value)}
                  placeholder="https://youtube.com/..."
                  style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 12px', color: 'var(--txt-1)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt-3)', display: 'block', marginBottom: 4 }}>
                  Duración (minutos){detectingDuration && <span style={{ color: 'var(--txt-3)', fontWeight: 400 }}> — detectando…</span>}
                </label>
                <input
                  type="number"
                  min={0}
                  value={editForm.duration_minutes}
                  onChange={e => setEditForm(p => ({ ...p, duration_minutes: parseInt(e.target.value, 10) || 0 }))}
                  style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 12px', color: 'var(--txt-1)', fontSize: 13, boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 4, display: 'block' }}>
                  Se detecta automáticamente desde la URL del vídeo (YouTube/Vimeo); puedes ajustarla a mano si es necesario.
                </span>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt-3)', display: 'block', marginBottom: 4 }}>Contenido / descripción</label>
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                  rows={6}
                  style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '8px 12px', color: 'var(--txt-1)', fontSize: 13, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Adjuntos */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
                  Recursos descargables
                </label>
                {attachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {attachments.map(att => (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--txt-3)', flexShrink: 0 }}>{att.file_size_display}</span>
                        <button
                          onClick={() => deleteAttachment(att.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                          title="Eliminar"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px dashed var(--line)', borderRadius: 'var(--r2)', cursor: 'pointer', fontSize: 13, color: 'var(--txt-3)', transition: 'border-color var(--t1)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Subir archivo
                  <input type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadAttachment(e.target.files[0])} />
                </label>
              </div>

              <div className="ap-modal-footer">
                <button className="ap-btn ap-btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
                <button className="ap-btn ap-btn-gold" onClick={saveEdit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      <NewLessonModal
        open={newLesson.moduleId !== null}
        title={newLesson.title}
        videoUrl={newLesson.video_url}
        content={newLesson.content}
        pendingFiles={pendingFiles}
        onTitleChange={t => setNewLesson(p => ({ ...p, title: t }))}
        onVideoUrlChange={v => setNewLesson(p => ({ ...p, video_url: v }))}
        onContentChange={c => setNewLesson(p => ({ ...p, content: c }))}
        onAddFile={f => setPendingFiles(p => [...p, f])}
        onRemoveFile={i => setPendingFiles(p => p.filter((_, j) => j !== i))}
        onCancel={() => { setNewLesson(p => ({ ...p, moduleId: null })); setPendingFiles([]); }}
        onCreate={createLesson}
        creating={creatingLesson}
      />
    </div>
  );
}
