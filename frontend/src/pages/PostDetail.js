import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dy = Math.floor(h / 24);
  if (dy < 30) return `${dy}d`;
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function Avatar({ user, size = 38 }) {
  const colors = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#38bdf8','#34d399'];
  const bg = colors[(user?.id || 0) % colors.length];
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '') || user?.username?.[0] || '?').toUpperCase();
  return user?.avatar_url
    ? <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${bg},${bg}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: '#000', flexShrink: 0 }}>{initials}</div>;
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

function CommentItem({ c, user, isAdmin, onDelete, onReply, depth = 0 }) {
  const canDel = user?.id === c.author?.id || isAdmin;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar user={c.author} size={depth ? 26 : 32} />
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--bg-3)', borderRadius: '2px var(--r3) var(--r3) var(--r3)', padding: '10px 14px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)' }}>{c.author.first_name || c.author.username}</span>
                <span style={{ fontSize: 11, color: 'var(--txt-4)' }}>@{c.author.username} · {timeAgo(c.created_at)}</span>
              </div>
              {canDel && (
                <button onClick={() => onDelete(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 13, lineHeight: 1, transition: 'color var(--t1)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}>🗑</button>
              )}
            </div>
            {c.content && <p style={{ fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.6, margin: 0 }}>{c.content}</p>}
            {c.image && (
              <a href={c.image} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: c.content ? 8 : 0 }}>
                <img src={c.image} alt="" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 'var(--r2)', border: '1px solid var(--line)', display: 'block' }} />
              </a>
            )}
          </div>
          {onReply && (
            <button onClick={() => onReply(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 12, fontWeight: 600, padding: '5px 2px 0', transition: 'color var(--t1)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-4)'}>Responder</button>
          )}
        </div>
      </div>
      {c.children?.length > 0 && (
        <div style={{ marginLeft: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.children.map(child => (
            <CommentItem key={child.id} c={child} user={user} isAdmin={isAdmin} onDelete={onDelete} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const commentInputRef = useRef(null);

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
      .catch(() => navigate('/community'))
      .finally(() => setLoading(false));
  }, [postId, navigate]);

  useEffect(() => { load(); }, [load]);

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
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (cId) => {
    if (!window.confirm('¿Eliminar comentario?')) return;
    await api.delete(`/community/comments/${cId}/`); load();
  };

  const handleDeletePost = async () => {
    if (!window.confirm('¿Eliminar publicación?')) return;
    await api.delete(`/community/posts/${postId}/`);
    navigate('/community');
  };

  if (loading) return (
    <div className="main-content" style={{ paddingTop: 40, color: 'var(--txt-3)', textAlign: 'center' }}>Cargando…</div>
  );
  if (!post) return null;

  const isOwner = user?.id === post.author?.id;
  const cat = post.category;

  return (
    <div className="main-content" style={{ maxWidth: 720, paddingTop: 32 }}>
      {/* Back */}
      <button
        onClick={() => navigate('/community')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--txt-3)', fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0, transition: 'color var(--t1)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Volver a la comunidad
      </button>

      {/* Post card */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', marginBottom: 16 }}>
        {post.is_pinned && (
          <div style={{ background: 'linear-gradient(90deg, rgba(245,166,35,0.12), transparent)', borderBottom: '1px solid rgba(245,166,35,0.2)', padding: '5px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>📌</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em' }}>PUBLICACIÓN FIJADA</span>
          </div>
        )}
        <div style={{ padding: '24px' }}>
          {/* Author */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <Avatar user={post.author} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt-1)' }}>
                  {post.author.first_name || post.author.username}{post.author.last_name ? ' ' + post.author.last_name : ''}
                </span>
                <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>@{post.author.username}</span>
                {cat && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (cat.color || '#60a5fa') + '1a', color: cat.color || '#60a5fa', border: `1px solid ${(cat.color || '#60a5fa')}33` }}>{cat.icon} {cat.name}</span>}
              </div>
              <span style={{ fontSize: 12, color: 'var(--txt-4)' }}>{timeAgo(post.created_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {isAdmin && (
                <button onClick={async () => { await api.post(`/community/posts/${postId}/pin/`); load(); }}
                  style={{ padding: '5px 10px', borderRadius: 'var(--r2)', background: post.is_pinned ? 'rgba(245,166,35,0.15)' : 'var(--bg-3)', border: '1px solid var(--line)', color: post.is_pinned ? 'var(--gold)' : 'var(--txt-3)', fontSize: 12, cursor: 'pointer' }}>
                  📌
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={handleDeletePost}
                  style={{ padding: '5px 10px', borderRadius: 'var(--r2)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                  🗑
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {(() => {
            const imageAtts = (post.attachments || []).filter(att => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name));
            const fileAtts = (post.attachments || []).filter(att => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name));
            return (
              <>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {post.title && <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 14, lineHeight: 1.3, letterSpacing: '-0.4px' }}>{post.title}</h1>}
                    <div className="lesson-md" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 20 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                    </div>
                  </div>
                  {imageAtts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      {imageAtts.map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer">
                          <img src={att.file_url} alt={att.name} style={{ height: 220, width: 220, objectFit: 'contain', borderRadius: 'var(--r3)', border: '1px solid var(--line)', display: 'block', background: 'var(--bg-3)' }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {fileAtts.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {fileAtts.map(att => (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', textDecoration: 'none', fontSize: 13, color: 'var(--txt-1)' }}>
                        📎 <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <button onClick={handleLike}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--r2)', background: liked ? 'rgba(248,113,113,0.1)' : 'none', border: liked ? '1px solid rgba(248,113,113,0.25)' : '1px solid transparent', color: liked ? '#f87171' : 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all var(--t1)' }}>
              <span style={{ fontSize: 16 }}>{liked ? '❤️' : '🤍'}</span>{likes}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', color: 'var(--txt-3)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>💬</span>{post.comments_count}
            </span>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)', margin: 0 }}>
            {post.comments_count} {post.comments_count === 1 ? 'comentario' : 'comentarios'}
          </h3>
        </div>

        {/* Comment input */}
        <div style={{ padding: '16px 24px', borderBottom: post.comments.length ? '1px solid var(--line)' : 'none' }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 42, fontSize: 12, color: 'var(--txt-3)' }}>
              Respondiendo a <strong style={{ color: 'var(--txt-1)' }}>{replyTo.author.username}</strong>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 12 }}>× Cancelar</button>
            </div>
          )}
          {commentImagePreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 42 }}>
              <img src={commentImagePreview} alt="" style={{ height: 56, width: 56, objectFit: 'contain', borderRadius: 'var(--r2)', border: '1px solid var(--line)', background: 'var(--bg-3)' }} />
              <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-4)', fontSize: 13 }}>× Quitar</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Avatar user={user} size={32} />
            <div style={{ flex: 1, display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden', transition: 'border-color var(--t1)' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--line)'}>
              <input
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } if (e.key === 'Escape') setReplyTo(null); }}
                placeholder={replyTo ? `Responder a ${replyTo.author.username}...` : "Escribe un comentario..."}
                style={{ flex: 1, background: 'none', border: 'none', padding: '9px 14px', color: 'var(--txt-1)', fontSize: 13, outline: 'none' }}
              />
              <label title="Adjuntar imagen o GIF" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', cursor: 'pointer', color: 'var(--txt-3)' }}>
                🖼
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCommentImage} />
              </label>
              <button onClick={handleComment} disabled={submitting || (!newComment.trim() && !commentImage)}
                style={{ padding: '0 18px', background: (newComment.trim() || commentImage) ? 'var(--gold)' : 'transparent', border: 'none', color: (newComment.trim() || commentImage) ? '#000' : 'var(--txt-4)', fontWeight: 700, fontSize: 15, cursor: (newComment.trim() || commentImage) ? 'pointer' : 'default', transition: 'all var(--t1)' }}>
                {submitting ? '…' : '↑'}
              </button>
            </div>
          </div>
        </div>

        {/* Comment list */}
        {post.comments.length > 0 && (
          <div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {buildCommentTree(post.comments).map(c => (
              <CommentItem key={c.id} c={c} user={user} isAdmin={isAdmin} onDelete={handleDeleteComment} onReply={c => { setReplyTo(c); commentInputRef.current?.focus(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
