import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import './AdminPanel.css';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function FileIcon({ extension }) {
  const isPdf = extension === 'pdf';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: '100%', background: 'var(--bg-3)' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isPdf ? '#f87171' : 'var(--txt-3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: isPdf ? '#f87171' : 'var(--txt-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {extension || 'archivo'}
      </span>
    </div>
  );
}

function ResourcePreview({ resource }) {
  const ext = resource.extension;
  if (IMAGE_EXTS.includes(ext)) {
    return <img src={resource.file_url} alt={resource.name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'var(--bg-3)', display: 'block' }} />;
  }
  if (ext === 'pdf') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-3)' }}>
        <iframe
          src={`${resource.file_url}#toolbar=0&view=FitH`}
          title={resource.name}
          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
        />
      </div>
    );
  }
  return <FileIcon extension={ext} />;
}

function UploadForm({ onUploaded, onClose }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    if (!file) { setError('Selecciona un archivo.'); return; }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name.trim() || file.name);
      const { data } = await api.post('/resources/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(data);
      onClose();
    } catch {
      setError('No se ha podido subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  return createPortal((
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">Subir recurso</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div className="ap-form-group">
            <label className="ap-label">Archivo</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px dashed var(--line)', borderRadius: 'var(--r2)', cursor: 'pointer', fontSize: 13, color: file ? 'var(--txt-1)' : 'var(--txt-3)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              {file ? file.name : 'Seleccionar archivo (PDF, imagen, etc.)'}
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0])} />
            </label>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Nombre</label>
            <input className="ap-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del recurso" />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={submit} disabled={uploading || !file} style={{ opacity: (uploading || !file) ? 0.5 : 1 }}>
              {uploading ? 'Subiendo…' : 'Subir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

function ResourceCard({ resource, isAdmin, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${resource.name}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/resources/${resource.id}/`);
      onDelete(resource.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <a
      href={resource.file_url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        background: 'var(--bg-2)', border: `1px solid ${hovered ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--r4)', overflow: 'hidden', opacity: deleting ? 0.4 : 1,
        boxShadow: hovered ? 'var(--s2)' : 'var(--s1)', transition: 'box-shadow var(--t2) var(--ease), border-color var(--t2) var(--ease)',
      }}
    >
      <div style={{ aspectRatio: '16 / 9', position: 'relative', overflow: 'hidden' }}>
        <ResourcePreview resource={resource} />
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resource.name}
          </span>
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Eliminar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', flexShrink: 0, padding: 2 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>
          {resource.file_size_display} · {formatDate(resource.uploaded_at)}
        </span>
      </div>
    </a>
  );
}

export default function Resources() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    api.get('/resources/')
      .then(r => setResources(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="a-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 2 }}>Recursos</h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 13 }}>
            {loading ? 'Cargando…' : `${resources.length} archivo${resources.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {isAdmin && (
          <button className="ap-btn ap-btn-gold" onClick={() => setShowUpload(true)} style={{ flexShrink: 0 }}>
            + Subir archivo
          </button>
        )}
      </div>

      {loading ? null : resources.length === 0 ? (
        <div className="ap-empty">No hay recursos disponibles todavía.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 16 }}>
          {resources.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={isAdmin}
              onDelete={id => setResources(prev => prev.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onUploaded={r => setResources(prev => [r, ...prev])}
        />
      )}
    </div>
  );
}
