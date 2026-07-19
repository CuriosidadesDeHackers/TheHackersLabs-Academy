import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { Avatar, Card, Btn, Input, Badge, Spinner } from '../components/ui/index';

/* ── Image compression via Canvas ─────────────────────── */
async function compressImage(file, maxPx = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else        { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ── helpers ──────────────────────────────────────── */
const INTERVAL_LABEL = { monthly: '/mes', quarterly: '/trimestre', annual: '/año', lifetime: '' };
const LEVEL_COLORS = ['','#6b7280','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#f5a623','#ef4444','#14b8a6'];
const LEVEL_NAMES  = ['','Rookie','Apprentice','Hacker','Analyst','Expert','Elite','Veteran','Master','Legend'];
const THRESHOLDS   = [0,100,300,600,1000,1500,2200,3000,4000,5500];

function levelProgress(user) {
  const level = user?.level || 1;
  const pts   = user?.points || 0;
  const next  = THRESHOLDS[Math.min(level, 9)];
  const curr  = THRESHOLDS[level - 1];
  const pct   = next > curr ? Math.round(((pts - curr) / (next - curr)) * 100) : 100;
  return { level, pts, next, pct };
}

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ value, label, color }) {
  return (
    <Card style={{ padding: '18px', textAlign: 'center' }} hover>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || 'var(--gold)', letterSpacing: '-0.5px', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 500 }}>{label}</div>
    </Card>
  );
}

/* ── Public profile ─────────────────────────────────── */
function CertificatesSection() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/classroom/certificates/')
      .then(r => setCerts(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || certs.length === 0) return null;

  return (
    <Card style={{ padding: '18px 22px', marginTop: 20 }} className="a-up">
      <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 14 }}>🎓 Certificados obtenidos</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {certs.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 'var(--r2)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)' }}>{c.course_title}</div>
              <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>
                Emitido el {new Date(c.issued_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} · THL-{c.cert_id}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {c.image_url && (
                <a href={c.image_url} download target="_blank" rel="noreferrer">
                  <Btn variant="secondary" size="sm">⬇️ Descargar</Btn>
                </a>
              )}
              <a href={c.verify_url} target="_blank" rel="noreferrer">
                <Btn variant="ghost" size="sm">🔗 Verificar</Btn>
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PublicProfile({ userId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading]  = useState(true);
  const { user: me } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/auth/members/${userId}/`)
      .then(r => setProfile(r.data))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner label="Cargando perfil..." />;
  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--txt-3)' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-2)' }}>Usuario no encontrado</p>
    </div>
  );

  const { level, pts, next, pct } = levelProgress(profile);
  const color = LEVEL_COLORS[level] || 'var(--gold)';
  const isMe  = me?.id === profile.id;

  return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      <style>{`@media(max-width:480px){.profile-cover{height:110px!important}.profile-avatar-wrap{bottom:-28px!important;left:16px!important}.profile-info{padding:40px 16px 18px!important}}`}</style>
      {/* Cover + avatar */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }} className="a-up">
        {/* Cover — sin overflow:hidden para que el avatar no se corte */}
        <div className="profile-cover" style={{ height: 150, position: 'relative', background: `linear-gradient(135deg, ${color}22 0%, var(--bg-3) 100%)` }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '32px 32px', opacity: .6 }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          {isMe && (
            <button onClick={() => navigate('/profile/settings')}
              style={{ position: 'absolute', bottom: 14, right: 16, padding: '7px 16px', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--r2)', color: 'var(--txt-1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all var(--t1)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.75)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}>
              ✏️ Editar perfil
            </button>
          )}
          {/* Avatar on cover edge */}
          <div className="profile-avatar-wrap" style={{ position: 'absolute', bottom: -36, left: 28, border: '4px solid var(--bg-2)', borderRadius: '50%' }}>
            <Avatar user={profile} size={72} />
          </div>
        </div>

        {/* Info */}
        <div className="profile-info" style={{ padding: '48px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 3 }}>
                {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile.username}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--txt-3)', marginBottom: 8 }}>@{profile.username}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={color}>Nv.{level} · {LEVEL_NAMES[level]}</Badge>
                {profile.role !== 'member' && <Badge color="var(--purple)">{profile.role}</Badge>}
                {profile.membership_status && <Badge color="var(--green)">{profile.membership_status}</Badge>}
              </div>
            </div>
            {isMe && (
              <Btn variant="secondary" size="sm" onClick={() => navigate('/profile/settings')}>⚙️ Configuración</Btn>
            )}
          </div>

          {profile.bio && (
            <p style={{ fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.7, maxWidth: 520, marginBottom: 14 }}>{profile.bio}</p>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {profile.location && <span style={{ fontSize: 13, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 5 }}>📍 {profile.location}</span>}
            {profile.github   && <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity var(--t1)' }} onMouseEnter={e => e.currentTarget.style.opacity='.7'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>⌨️ GitHub</a>}
            {profile.linkedin && <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity var(--t1)' }} onMouseEnter={e => e.currentTarget.style.opacity='.7'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>💼 LinkedIn</a>}
            {profile.twitter  && <a href={`https://twitter.com/${profile.twitter}`}  target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity var(--t1)' }} onMouseEnter={e => e.currentTarget.style.opacity='.7'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>🐦 Twitter</a>}
            <span style={{ fontSize: 13, color: 'var(--txt-3)', marginLeft: 'auto' }}>Miembro desde {new Date(profile.date_joined).toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</span>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }} className="stagger">
        <StatCard value={pts.toLocaleString()} label="Puntos totales" color="var(--gold)" />
        <StatCard value={`Nv. ${level}`}       label={LEVEL_NAMES[level]} color={color} />
        <StatCard value={profile.membership_status || '—'} label="Membresía" color="var(--green)" />
      </div>

      {/* XP bar */}
      <Card style={{ padding: '18px 22px' }} className="a-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Progreso al nivel {level + 1}</span>
            <span style={{ fontSize: 12, color: 'var(--txt-3)', marginLeft: 10 }}>
              {pts.toLocaleString()} / {next.toLocaleString()} pts
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-4)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)`, borderRadius: 4, transition: 'width .8s var(--ease)', boxShadow: `0 0 10px ${color}66` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--txt-4)' }}>
          <span>{LEVEL_NAMES[level]}</span>
          <span>{LEVEL_NAMES[Math.min(level + 1, 9)] || 'Máximo nivel'}</span>
        </div>
      </Card>

      {isMe && <CertificatesSection />}
    </div>
  );
}

/* ── Settings sidebar nav ──────────────────────────── */
const SETTINGS_ITEMS = [
  { to: '/profile/settings/profile',       icon: '👤', label: 'Profile' },
  { to: '/profile/settings/account',       icon: '🔐', label: 'Account' },
  { to: '/profile/settings/membership',    icon: '💳', label: 'Membership' },
  { to: '/profile/settings/notifications', icon: '🔔', label: 'Notifications' },
];

function SettingsLayout({ children }) {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  return (
    <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>
      {/* Sidebar */}
      <div className="settings-sidebar a-up" style={{ position: 'sticky', top: 90 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* User mini card */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar user={user} size={38} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.first_name || user?.username}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>@{user?.username}</div>
            </div>
          </div>
          {/* Nav items */}
          {SETTINGS_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', fontSize: 14, textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(245,166,35,0.07)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--txt-2)',
                borderLeft: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
                borderBottom: '1px solid var(--line)',
                transition: 'all var(--t1)',
              })}
              onMouseEnter={e => { if (!e.currentTarget.style.color.includes('gold')) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt-1)'; } }}
              onMouseLeave={e => { if (!e.currentTarget.style.color.includes('gold')) { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; } }}
            >
              <span style={{ fontSize: 17 }}>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          <div style={{ padding: '12px 14px' }}>
            <Btn variant="ghost" size="sm" full onClick={() => navigate(`/profile/${user?.id}`)}>
              Ver mi perfil →
            </Btn>
          </div>
        </Card>
      </div>

      {/* Content */}
      <div className="a-up">{children}</div>
    </div>
  );
}

/* ── Profile settings form ─────────────────────────── */
function SettingsProfile() {
  const { user, updateProfile, fetchProfile } = useAuthStore();
  const [form, setForm] = useState({ first_name:'',last_name:'',bio:'',location:'',website:'',twitter:'',linkedin:'',github:'' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) setForm({ first_name:user.first_name||'',last_name:user.last_name||'',bio:user.bio||'',location:user.location||'',website:user.website||'',twitter:user.twitter||'',linkedin:user.linkedin||'',github:user.github||'' });
  }, [user]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try { await updateProfile(form); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Solo se admiten imágenes.'); return; }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('avatar', compressed);
      await updateProfile(fd);
      await fetchProfile();
    } catch {
      setAvatarError('Error al subir la foto. Inténtalo de nuevo.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const f = (key, label, placeholder, hint) => (
    <Input label={label} placeholder={placeholder} hint={hint}
      value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
  );

  return (
    <SettingsLayout>
      <Card style={{ padding: '28px 32px' }}>
        {/* Avatar section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar user={user} size={72} />
            {avatarUploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Foto de perfil</p>
            <p style={{ fontSize: 12, color: 'var(--txt-3)', marginBottom: 8 }}>Se comprime automáticamente a 400×400px · JPEG</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <Btn variant="secondary" size="xs" onClick={() => fileInputRef.current?.click()} loading={avatarUploading}>
              {avatarUploading ? 'Subiendo...' : 'Cambiar foto'}
            </Btn>
            {avatarError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{avatarError}</p>}
          </div>
        </div>

        {/* Name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          {f('first_name','NOMBRE','Carlos')}
          {f('last_name','APELLIDO','García')}
        </div>
        <div style={{ marginBottom: 18 }}>
          {f('bio','BIO','Cuéntanos sobre ti y tu experiencia...','Máximo 150 caracteres')}
          <div style={{ fontSize: 11, color: form.bio.length > 130 ? 'var(--red)' : 'var(--txt-4)', textAlign: 'right', marginTop: 5 }}>
            {form.bio.length} / 150
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>{f('location','UBICACIÓN','Madrid, España','Tu ubicación aproximada')}</div>
        <div style={{ marginBottom: 24 }}>{f('website','SITIO WEB','https://tu-web.com')}</div>

        {/* Social links */}
        <div style={{ paddingTop: 20, borderTop: '1px solid var(--line)', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 16, letterSpacing: '.06em' }}>🔗 REDES SOCIALES — Solo el nombre de usuario</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
            {f('github','GITHUB','usuario')}
            {f('linkedin','LINKEDIN','usuario')}
            {f('twitter','TWITTER / X','usuario')}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <Btn onClick={save} loading={saving} variant={saved ? 'accent' : 'primary'}>
            {!saving && (saved ? '✓ CAMBIOS GUARDADOS' : 'ACTUALIZAR PERFIL')}
          </Btn>
          {saved && <span style={{ fontSize: 13, color: 'var(--green)', animation: 'fadeUp .3s var(--ease)' }}>Los cambios se han guardado correctamente.</span>}
        </div>
      </Card>
    </SettingsLayout>
  );
}

/* ── Account settings ──────────────────────────────── */
function SettingsAccount() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ old_password: '', new_password: '' });
  const [msg, setMsg]   = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const change = async () => {
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      await api.post('/auth/change-password/', form);
      setMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
      setForm({ old_password: '', new_password: '' });
    } catch (e) {
      setMsg({ type: 'err', text: e.response?.data?.old_password || 'Error al cambiar la contraseña.' });
    } finally { setLoading(false); }
  };

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Email info */}
        <Card style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Información de cuenta</h3>
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '14px 16px', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '.06em', marginBottom: 4 }}>EMAIL</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.email}</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--txt-4)' }}>El email no se puede cambiar. Contacta con el admin si necesitas actualizarlo.</p>
        </Card>

        {/* Change password */}
        <Card style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Cambiar contraseña</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <Input label="CONTRASEÑA ACTUAL" type="password" placeholder="••••••••" icon="🔒"
              value={form.old_password} onChange={e => setForm({ ...form, old_password: e.target.value })} />
            <Input label="NUEVA CONTRASEÑA" type="password" placeholder="Mínimo 8 caracteres" icon="🔑"
              value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} hint="Usa una combinación de letras, números y símbolos" />
          </div>
          {msg.text && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 16, fontSize: 13, background: msg.type==='ok'?'rgba(74,222,128,.09)':'rgba(248,113,113,.09)', color: msg.type==='ok'?'var(--green)':'var(--red)', border: `1px solid ${msg.type==='ok'?'rgba(74,222,128,.25)':'rgba(248,113,113,.25)'}` }}>
              {msg.type==='ok'?'✅':'⚠'} {msg.text}
            </div>
          )}
          <Btn onClick={change} loading={loading} disabled={!form.old_password||!form.new_password}>
            {!loading && 'CAMBIAR CONTRASEÑA'}
          </Btn>
        </Card>

        {/* Danger zone */}
        <Card style={{ padding: '24px 28px', borderColor: 'rgba(248,113,113,0.2)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--red)' }}>Zona de peligro</h3>
          <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 16 }}>Estas acciones son irreversibles. Procede con cuidado.</p>
          <Btn variant="danger" size="sm">Eliminar mi cuenta</Btn>
        </Card>
      </div>
    </SettingsLayout>
  );
}

/* ── Membership settings ───────────────────────────── */
function SettingsMembership() {
  const { membership, refreshMembership } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState({ type: '', text: '' });
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    api.get('/memberships/plans/')
      .then(r => setPlans(r.data.results || r.data))
      .catch(() => setError('No se pudieron cargar los planes.'))
      .finally(() => setLoading(false));
  }, []);

  // Si ya hay una membresía activa (no lifetime, no pendiente de cancelar),
  // cambiamos el plan de la suscripción existente en vez de crear una segunda
  // suscripción que cobraría por duplicado.
  const hasOtherPlan = membership?.is_active && membership.status !== 'lifetime' && !membership.cancel_at_period_end;

  const subscribe = async (plan) => {
    setSubscribingId(plan.id); setError('');
    try {
      if (hasOtherPlan) {
        await api.post('/memberships/change-plan/', { plan_id: plan.id });
        await refreshMembership();
        setSubscribingId(null);
        return;
      }
      const { data } = await api.post('/memberships/checkout/', { plan_id: plan.id });
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar de plan. Inténtalo de nuevo.');
      setSubscribingId(null);
    }
  };

  const cancelSubscription = async () => {
    setCancelLoading(true); setCancelMsg({ type: '', text: '' });
    try {
      await api.post('/memberships/cancel/');
      await refreshMembership();
      setCancelMsg({ type: 'ok', text: 'Tu suscripción no se renovará. Mantendrás el acceso hasta el final del periodo ya pagado.' });
      setConfirmingCancel(false);
    } catch (e) {
      setCancelMsg({ type: 'err', text: e.response?.data?.detail || 'Error al cancelar la suscripción.' });
    } finally { setCancelLoading(false); }
  };

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Current membership */}
        <Card style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tu membresía</h3>
          {membership?.is_active ? (
            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '.06em', marginBottom: 4 }}>PLAN ACTUAL</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{membership.plan?.name || '—'}</div>
              </div>
              <Badge color="var(--green)">{membership.status}</Badge>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>No tienes una membresía activa. Elige un plan abajo para empezar.</p>
          )}

          {membership?.is_active && membership.status !== 'lifetime' && membership.cancel_at_period_end && (
            <p style={{ fontSize: 13, color: 'var(--txt-3)', marginTop: 14 }}>
              Tu suscripción no se renovará. Mantendrás el acceso hasta el {membership.end_date ? new Date(membership.end_date).toLocaleDateString('es-ES') : 'final del periodo actual'}.
            </p>
          )}
          {membership?.is_active && membership.status !== 'lifetime' && !membership.cancel_at_period_end && (
            <div style={{ marginTop: 16 }}>
              {!confirmingCancel ? (
                <Btn variant="secondary" size="sm" onClick={() => setConfirmingCancel(true)}>Cancelar suscripción</Btn>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--txt-2)', marginBottom: 12 }}>
                    ¿Seguro que quieres cancelar tu suscripción? Mantendrás el acceso hasta el final del periodo ya pagado, pero no se renovará.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn variant="danger" size="sm" loading={cancelLoading} onClick={cancelSubscription}>
                      {!cancelLoading && 'Sí, cancelar'}
                    </Btn>
                    <Btn variant="ghost" size="sm" disabled={cancelLoading} onClick={() => setConfirmingCancel(false)}>
                      Volver
                    </Btn>
                  </div>
                </div>
              )}
              {cancelMsg.text && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r2)', fontSize: 13, background: cancelMsg.type==='ok'?'rgba(74,222,128,.09)':'rgba(248,113,113,.09)', color: cancelMsg.type==='ok'?'var(--green)':'var(--red)', border: `1px solid ${cancelMsg.type==='ok'?'rgba(74,222,128,.25)':'rgba(248,113,113,.25)'}` }}>
                  {cancelMsg.type==='ok'?'✅':'⚠'} {cancelMsg.text}
                </div>
              )}
            </div>
          )}
          {membership?.is_active && membership.status === 'lifetime' && (
            <p style={{ fontSize: 12, color: 'var(--txt-4)', marginTop: 12 }}>Tu plan Lifetime no requiere renovación y no se puede cancelar.</p>
          )}
        </Card>

        {/* Available plans */}
        <Card style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Planes disponibles</h3>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--r2)', fontSize: 13, color: 'var(--red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          )}
          {loading ? (
            <Spinner />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {plans.map(plan => {
                const isCurrent = membership?.is_active && membership?.plan?.id === plan.id;
                const isFeatured = plan.interval === 'quarterly';
                return (
                  <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', background: isFeatured ? 'rgba(245,166,35,0.08)' : 'var(--bg-3)', border: isFeatured ? '1px solid var(--gold-border)' : '1px solid transparent', borderRadius: 'var(--r2)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{plan.name}</span>
                        {isFeatured && (
                          <span style={{ background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '.05em' }}>
                            RECOMENDADO
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>
                        {Number(plan.price).toFixed(2)}€ {INTERVAL_LABEL[plan.interval] || ''}
                      </div>
                    </div>
                    {isCurrent ? (
                      <Badge color="var(--green)">Plan actual</Badge>
                    ) : (
                      <Btn size="sm" loading={subscribingId === plan.id} onClick={() => subscribe(plan)}>
                        {subscribingId !== plan.id && (hasOtherPlan ? 'Cambiar a este plan' : 'Suscribirme')}
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </SettingsLayout>
  );
}

/* ── Notification settings ─────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? 'var(--gold)' : 'var(--bg-4)', position: 'relative', transition: 'background var(--t2)', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left var(--t2) var(--ease)', boxShadow: '0 1px 4px rgba(0,0,0,.4)' }} />
    </button>
  );
}

function SettingsNotifications() {
  const NOTIF_ITEMS = [
    { key: 'comments',  label: 'Comentarios en tus posts',    desc: 'Cuando alguien comenta en tus publicaciones',      default: true },
    { key: 'likes',     label: 'Likes en tus posts',          desc: 'Cuando alguien da like a tus publicaciones',       default: true },
    { key: 'events',    label: 'Nuevos eventos',              desc: 'Alertas de webinars, CTFs y workshops próximos',   default: false },
    { key: 'members',   label: 'Nuevos miembros',             desc: 'Cuando alguien nuevo se une a la comunidad',       default: false },
    { key: 'leaderboard',label:'Cambios en el ranking',       desc: 'Cuando subas o bajes posiciones en el leaderboard',default: false },
  ];
  const [prefs, setPrefs] = useState(() => Object.fromEntries(NOTIF_ITEMS.map(n => [n.key, n.default])));

  return (
    <SettingsLayout>
      <Card style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Preferencias de notificaciones</h3>
        <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 24 }}>Elige qué notificaciones quieres recibir en la plataforma.</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {NOTIF_ITEMS.map((n, i) => (
            <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < NOTIF_ITEMS.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ flex: 1, paddingRight: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{n.label}</div>
                <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>{n.desc}</div>
              </div>
              <Toggle on={prefs[n.key]} onChange={v => setPrefs(p => ({ ...p, [n.key]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <Btn>GUARDAR PREFERENCIAS</Btn>
        </div>
      </Card>
    </SettingsLayout>
  );
}

/* ── Router ─────────────────────────────────────────── */
export default function Profile() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const location = window.location.pathname;

  // /profile/settings and /profile/settings/* → settings area
  if (location === '/profile/settings' || location.startsWith('/profile/settings/')) {
    return (
      <Routes>
        {/* /profile/settings → redirect to /profile/settings/profile */}
        <Route path="settings" element={<Navigate to="/profile/settings/profile" replace />} />
        {/* matches /profile/settings/profile */}
        <Route path="settings/profile" element={<SettingsProfile />} />
        {/* matches /profile/settings/account */}
        <Route path="settings/account" element={<SettingsAccount />} />
        {/* matches /profile/settings/membership */}
        <Route path="settings/membership" element={<SettingsMembership />} />
        {/* matches /profile/settings/notifications */}
        <Route path="settings/notifications" element={<SettingsNotifications />} />
      </Routes>
    );
  }

  const targetId = id || user?.id;
  if (!targetId) return <Spinner />;
  return <PublicProfile userId={targetId} />;
}
