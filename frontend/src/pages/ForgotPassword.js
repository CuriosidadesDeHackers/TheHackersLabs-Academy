import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import SiteBrand from '../components/ui/SiteBrand';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/', { email });
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-0)',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-1)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r4)',
        padding: '40px 40px',
        boxShadow: 'var(--s3)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--txt-1)' }}>
            <SiteBrand />
          </span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(74,222,128,0.12)', border: '2px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 8 }}>Revisa tu correo</h1>
            <p style={{ color: 'var(--txt-3)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Si existe una cuenta asociada a <strong style={{ color: 'var(--txt-2)' }}>{email}</strong>, te hemos enviado un enlace para restablecer tu contraseña.
            </p>
            <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              ← Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4, letterSpacing: '-0.4px' }}>
                ¿Olvidaste tu contraseña?
              </h1>
              <p style={{ color: 'var(--txt-3)', fontSize: 14 }}>
                Te enviaremos un enlace para restablecerla
              </p>
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
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--r2)',
                    padding: '11px 14px',
                    color: 'var(--txt-1)',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

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
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
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
              <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
                ← Volver a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
