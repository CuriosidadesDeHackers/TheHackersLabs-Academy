import React, { useEffect, useState } from 'react';
import api from '../api/axios';

function StatCard({ label, value, sub, color = 'var(--gold)', icon }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, letterSpacing: '-1px', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--txt-3)', lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color = 'var(--gold)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--txt-2)', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: 'var(--bg-4)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.8s var(--ease)' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)', minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SignupChart({ data }) {
  if (!data?.length) return <p style={{ fontSize: 13, color: 'var(--txt-3)', textAlign: 'center', padding: '20px 0' }}>Sin datos de registro este mes</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((d, i) => {
        const h = Math.max(Math.round((d.count / max) * 80), 3);
        return (
          <div key={i} title={`${d.date}: ${d.count} registros`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: h, background: 'var(--gold)', borderRadius: '3px 3px 0 0', opacity: 0.85, minWidth: 3, transition: 'height 0.6s var(--ease)' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/admin/analytics/')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudieron cargar las analíticas.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="main-content" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--txt-3)' }}>Cargando analíticas…</div>
  );
  if (error) return (
    <div className="main-content" style={{ paddingTop: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
  );
  if (!data) return null;

  const { users, content, memberships } = data;

  return (
    <div className="main-content" style={{ paddingTop: 28, paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--txt-1)', letterSpacing: '-0.4px', marginBottom: 4 }}>Analíticas</h1>
        <p style={{ fontSize: 14, color: 'var(--txt-3)' }}>Vista general de la plataforma en tiempo real</p>
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Usuarios totales"    value={users.total}                  icon="👥" />
        <StatCard label="Online ahora"        value={users.online_now}              icon="🟢" color="var(--green)" />
        <StatCard label="Nuevos esta semana"  value={users.new_this_week}           icon="📈" />
        <StatCard label="Nuevos este mes"     value={users.new_this_month}          icon="📅" />
        <StatCard label="Membresías activas"  value={memberships.active}            icon="💳" color="var(--green)" />
        <StatCard label="Ingresos estimados"  value={`${memberships.revenue_estimate}€`} icon="💰" color="#4ade80" sub="suma de planes activos" />
        <StatCard label="Cursos publicados"   value={`${content.published_courses}/${content.courses}`} icon="📚" />
        <StatCard label="Posts esta semana"   value={content.posts_this_week}       icon="✍️" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Signup chart */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Registros últimos 30 días</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--txt-1)', letterSpacing: '-0.5px' }}>{users.new_this_month}</p>
            </div>
            <span style={{ fontSize: 22 }}>📊</span>
          </div>
          <SignupChart data={users.signups_chart} />
          <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 6, textAlign: 'center' }}>Cada barra = 1 día</p>
        </div>

        {/* Roles + plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Roles */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '18px 20px', flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Usuarios por rol</p>
            <MiniBar label="Members"     value={users.by_role.member}     max={users.total} color="var(--blue)" />
            <MiniBar label="Instructors" value={users.by_role.instructor} max={users.total} color="var(--purple)" />
            <MiniBar label="Admins"      value={users.by_role.admin}      max={users.total} color="var(--gold)" />
          </div>
          {/* Plans */}
          {memberships.by_plan?.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '18px 20px', flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Membresías por plan</p>
              {memberships.by_plan.map((p, i) => (
                <MiniBar key={i} label={p.plan__name || '—'} value={p.count} max={memberships.active} color="var(--green)" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content stats + Top posts + Recent users */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Content stats */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 22px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Contenido</p>
          {[
            { label: 'Lecciones',                     v: content.lessons },
            { label: 'Posts totales',                  v: content.posts },
            { label: 'Comentarios',                    v: content.comments },
            { label: 'Lecciones completadas (7d)',     v: content.completions_this_week },
          ].map(({ label, v }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, color: 'var(--txt-2)' }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt-1)' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--txt-2)' }}>Cursos publicados</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt-1)' }}>{content.published_courses} / {content.courses}</span>
          </div>
        </div>

        {/* Top posts */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 22px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Top posts por likes</p>
          {content.top_posts?.length ? content.top_posts.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: i < 3 ? 'var(--gold)' : 'var(--txt-4)', minWidth: 16, marginTop: 2 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--txt-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{p.title || '(sin título)'}</p>
                <p style={{ fontSize: 11, color: 'var(--txt-3)', margin: 0 }}>@{p.author__username} · {p.lc} ❤️</p>
              </div>
            </div>
          )) : <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>Sin posts aún</p>}
        </div>
      </div>

      {/* Recent signups */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: '20px 22px', marginTop: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Últimos registros</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Usuario', 'Email', 'Rol', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--txt-3)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.recent?.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--txt-1)', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--txt-2)' }}>{u.email}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: u.role === 'admin' ? 'rgba(245,166,35,0.15)' : u.role === 'instructor' ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.12)', color: u.role === 'admin' ? 'var(--gold)' : u.role === 'instructor' ? 'var(--purple)' : 'var(--blue)' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--txt-3)' }}>{new Date(u.date_joined).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
