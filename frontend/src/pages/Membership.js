import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const INTERVAL_LABEL = {
  monthly: '/mes',
  quarterly: '/trimestre',
  annual: '/año',
  lifetime: '',
};

function PlanCard({ plan, isCurrent, onSubscribe, subscribing, hasOtherPlan }) {
  const isFeatured = plan.interval === 'quarterly';
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isFeatured ? 'linear-gradient(160deg,rgba(245,166,35,0.1),var(--bg-2) 55%)' : 'var(--bg-2)',
        border: `2px solid ${isFeatured ? 'var(--gold)' : hover ? 'var(--line-2)' : 'var(--line)'}`,
        borderRadius: 'var(--r4)',
        padding: isFeatured ? '32px 26px 28px' : '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        boxShadow: isFeatured ? '0 0 36px rgba(245,166,35,0.16)' : hover ? 'var(--s2)' : 'var(--s1)',
        transition: 'all var(--t2) var(--ease)',
        transform: isFeatured ? 'translateY(-6px)' : hover && !isCurrent ? 'translateY(-4px)' : 'none',
        zIndex: isFeatured ? 1 : 0,
      }}
    >
      {/* Featured ribbon */}
      {isFeatured && (
        <span style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gold)', color: '#000',
          fontSize: 11, fontWeight: 800, padding: '4px 14px',
          borderRadius: 20, letterSpacing: '.06em', whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(245,166,35,0.4)',
        }}>
          ⭐ RECOMENDADO
        </span>
      )}

      {/* Badges */}
      {isCurrent && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(74,222,128,0.15)', color: 'var(--green)',
            border: '1px solid rgba(74,222,128,0.3)',
            fontSize: 10, fontWeight: 800, padding: '3px 10px',
            borderRadius: 20, letterSpacing: '.06em',
          }}>
            PLAN ACTUAL
          </span>
        </div>
      )}

      <div style={{ marginTop: isFeatured ? 6 : 0 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4 }}>
          {plan.name}
        </h3>
        {plan.description && (
          <p style={{ fontSize: 13, color: 'var(--txt-3)', lineHeight: 1.5 }}>{plan.description}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: isFeatured ? 'var(--gold)' : 'var(--txt-1)', lineHeight: 1 }}>
          {Number(plan.price).toFixed(2)}€
        </span>
        <span style={{ fontSize: 14, color: 'var(--txt-3)', paddingBottom: 4 }}>
          {INTERVAL_LABEL[plan.interval] || ''}
        </span>
      </div>

      <div style={{ height: 1, background: 'var(--line)' }} />

      {isCurrent ? (
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 14, color: 'var(--green)', fontWeight: 700 }}>
          Tu plan activo
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          disabled={subscribing}
          style={{
            width: '100%', padding: '12px 0',
            background: isFeatured ? 'var(--gold)' : 'var(--bg-3)',
            color: isFeatured ? '#000' : 'var(--txt-1)',
            border: `1px solid ${isFeatured ? 'var(--gold)' : 'var(--line)'}`,
            borderRadius: 'var(--r3)', fontSize: 14, fontWeight: 700,
            cursor: subscribing ? 'not-allowed' : 'pointer',
            opacity: subscribing ? 0.7 : 1,
            transition: 'all var(--t1)',
          }}
        >
          {subscribing ? (hasOtherPlan ? 'Cambiando...' : 'Redirigiendo...') : (hasOtherPlan ? 'Cambiar a este plan' : 'Suscribirme')}
        </button>
      )}
    </div>
  );
}

export default function Membership() {
  const navigate = useNavigate();
  const location = useLocation();
  const { membership, refreshMembership } = useAuthStore();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle Stripe return (?success=1)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === '1') {
      setSuccess(true);
      // Poll membership a couple of times to pick up webhook
      let attempts = 0;
      const poll = setInterval(async () => {
        await refreshMembership();
        attempts++;
        if (attempts >= 4) clearInterval(poll);
      }, 2000);
      return () => clearInterval(poll);
    }
  }, [location.search, refreshMembership]);

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

  const handleSubscribe = useCallback(async (plan) => {
    setSubscribingId(plan.id);
    setError('');
    try {
      if (hasOtherPlan) {
        await api.post('/memberships/change-plan/', { plan_id: plan.id });
        await refreshMembership();
        setSubscribingId(null);
        return;
      }
      const { data } = await api.post('/memberships/checkout/', { plan_id: plan.id });
      // Stripe configured → redirect to checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Error al cambiar de plan. Inténtalo de nuevo.');
      setSubscribingId(null);
    }
  }, [hasOtherPlan, refreshMembership]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 0' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--txt-1)', letterSpacing: '-0.5px', marginBottom: 12 }}>
          Elige tu plan
        </h1>
        <p style={{ fontSize: 16, color: 'var(--txt-3)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Accede a todos los cursos y contenido premium con una sola suscripción. Sin compromisos.
        </p>
        {membership?.is_active && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 16, padding: '8px 18px',
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
            borderRadius: 'var(--r3)', fontSize: 13, color: 'var(--green)', fontWeight: 600,
          }}>
            Tienes una membresía activa: {membership.plan?.name}
          </div>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          marginBottom: 28, padding: '16px 20px',
          background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: 'var(--r3)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" fill="rgba(74,222,128,0.2)"/>
            <path d="M8 12l3 3 5-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>
              ¡Pago completado!
            </p>
            <p style={{ fontSize: 13, color: 'var(--txt-2)' }}>
              {membership?.is_active
                ? 'Tu membresía ya está activa. ¡Bienvenido!'
                : 'Tu membresía se activará en instantes. Si no se activa en unos minutos, contacta al soporte.'}
            </p>
          </div>
          {membership?.is_active && (
            <button
              onClick={() => navigate('/community')}
              style={{ marginLeft: 'auto', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 'var(--r2)', padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              Ir a la comunidad
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 24, padding: '12px 16px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 'var(--r3)', fontSize: 13, color: 'var(--red)', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Plans grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 320, borderRadius: 'var(--r4)',
              background: 'var(--bg-2)', border: '1px solid var(--line)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 14 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ width: 280, flexShrink: 0 }}>
              <PlanCard
                plan={plan}
                isCurrent={membership?.is_active && membership?.plan?.id === plan.id}
                onSubscribe={handleSubscribe}
                subscribing={subscribingId === plan.id}
                hasOtherPlan={hasOtherPlan}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: 'var(--txt-3)',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Volver
        </button>
      </div>
    </div>
  );
}
