import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import SiteBrand from '../components/ui/SiteBrand';

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

export default function Register() {
  const location = useLocation();
  const refCode = new URLSearchParams(location.search).get('ref') || '';
  const [form, setForm] = useState({ email: '', username: '', first_name: '', last_name: '', password: '', password2: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.password2) {
      setErrors({ password2: 'Las contrasenas no coinciden.' });
      return;
    }
    setLoading(true);
    try {
      await register(refCode ? { ...form, ref: refCode } : form);
      navigate('/community');
    } catch (err) {
      setErrors(err.response?.data || {});
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({
    value: form[key],
    onChange: e => setForm({ ...form, [key]: e.target.value }),
    error: errors[key]?.[0] || errors[key],
  });

  const globalError = typeof errors.non_field_errors === 'string'
    ? errors.non_field_errors
    : errors.non_field_errors?.[0];

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
        maxWidth: 500,
        background: 'var(--bg-1)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r4)',
        padding: '40px 40px',
        boxShadow: 'var(--s3)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--txt-1)' }}>
            <SiteBrand />
          </span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4, letterSpacing: '-0.4px' }}>
            Crear cuenta
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 14 }}>
            Unete a la comunidad de ciberseguridad
          </p>
        </div>

        {/* Global error */}
        {globalError && (
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
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nombre" placeholder="Carlos" {...f('first_name')} />
            <Field label="Apellido" placeholder="Garcia" {...f('last_name')} />
          </div>

          <Field label="Email" type="email" placeholder="tu@email.com" {...f('email')} />
          <Field label="Usuario" placeholder="cgarcia" {...f('username')} />
          <Field label="Contrasena" type="password" placeholder="Minimo 8 caracteres" {...f('password')} />
          <Field label="Confirmar contrasena" type="password" placeholder="••••••••" {...f('password2')} />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
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
          Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
            Iniciar sesion
          </Link>
        </div>
      </div>
    </div>
  );
}
