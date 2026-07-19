import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import SiteBrand from '../components/ui/SiteBrand';

const FEATURES = [
  'Cursos de ciberseguridad estructurados',
  'Comunidad activa de profesionales',
  'Eventos, workshops y CTFs mensuales',
  'Sistema de niveles y rankings',
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

function Field({ label, type = 'text', value, onChange, error, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-3)',
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--line)'}`,
          borderRadius: 'var(--r2)',
          padding: '11px 14px',
          color: 'var(--txt-1)',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color var(--t1)',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
        onBlur={e => (e.target.style.borderColor = error ? 'var(--red)' : 'var(--line)')}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/community');
    } catch {
      setError('Email o contrasena incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-0)' }}>
      {/* Left branding panel */}
      <div
        className="login-left"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '10%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
            <img src="/logo.png" alt="logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>
              <SiteBrand dotColor='#f5a623' />
            </span>
          </div>

          <h2 style={{
            fontSize: 36, fontWeight: 900, lineHeight: 1.15,
            letterSpacing: '-1px', marginBottom: 14, color: '#fff',
          }}>
            La comunidad privada<br />
            <span style={{ color: '#f5a623' }}>de ciberseguridad</span><br />
            en espanol
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7, maxWidth: 380, marginBottom: 44 }}>
            Aprende, conecta y crece con los mejores profesionales de seguridad.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CheckIcon />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 44px',
        borderLeft: '1px solid var(--line)',
        background: 'var(--bg-1)',
      }}>
        {/* Mobile logo (only visible when left panel is hidden) */}
        <div className="login-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--txt-1)' }}>
            <SiteBrand />
          </span>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.4px', color: 'var(--txt-1)' }}>
            Bienvenido de vuelta
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 14 }}>Inicia sesion en tu cuenta</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.09)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 'var(--r2)',
            padding: '11px 14px',
            marginBottom: 20,
            color: 'var(--red)',
            fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <Field
            label="Contrasena"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <Link to="/forgot-password" style={{ alignSelf: 'flex-end', marginTop: -8, fontSize: 12.5, color: 'var(--txt-3)', textDecoration: 'none' }}>
            ¿Olvidaste tu contraseña?
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px',
              background: loading ? 'var(--gold-dim, #c4841a)' : 'var(--gold)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--r2)',
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all var(--t1)',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,166,35,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            {loading ? 'Accediendo...' : 'Acceder'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 24,
          borderTop: '1px solid var(--line)',
          textAlign: 'center',
          color: 'var(--txt-3)',
          fontSize: 14,
        }}>
          No tienes cuenta?{' '}
          <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
            Registrarse gratis
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 780px) {
          .login-left { display: none !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
