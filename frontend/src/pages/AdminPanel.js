import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import useSiteStore, { applyAccentColor } from '../store/siteStore';
import './AdminPanel.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS = { admin: 'Admin', instructor: 'Docente', member: 'Alumno' };
const ROLE_COLORS = { admin: 'var(--red)', instructor: 'var(--blue)', member: 'var(--txt-3)' };
const STATUS_LABELS = { active: 'Activa', cancelled: 'Cancelada', expired: 'Expirada', lifetime: 'Lifetime' };
const STATUS_COLORS = { active: 'var(--green)', cancelled: 'var(--red)', expired: 'var(--txt-3)', lifetime: 'var(--gold)' };

function Badge({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--r5)',
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      color, background: `${color}18`, border: `1px solid ${color}33`,
    }}>
      {text}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return createPortal((
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">{title}</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">{children}</div>
      </div>
    </div>
  ), document.body);
}

function UserCombobox({ users, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = users.find(u => String(u.id) === String(value));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter(u => u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q))
    : users;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="ap-select"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        {selected ? `${selected.email} (${selected.username})` : (placeholder || 'Selecciona usuario...')}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r3)',
          boxShadow: 'var(--s3)', maxHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por email o usuario..."
            style={{
              padding: '9px 12px', background: 'var(--bg-3)', border: 'none', borderBottom: '1px solid var(--line)',
              color: 'var(--txt-1)', fontSize: 13, outline: 'none',
            }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 270 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--txt-3)' }}>Sin resultados</div>
            )}
            {filtered.map(u => (
              <div
                key={u.id}
                onClick={() => { onChange(u.id); setOpen(false); setQuery(''); }}
                style={{
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--txt-2)',
                  background: String(u.id) === String(value) ? 'var(--gold-dim)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = String(u.id) === String(value) ? 'var(--gold-dim)' : 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = String(u.id) === String(value) ? 'var(--gold-dim)' : 'transparent'}
              >
                {u.email} <span style={{ color: 'var(--txt-4)' }}>({u.username})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [courses, setCourses] = useState([]);

  // Modals
  const [pwdModal, setPwdModal] = useState(null);   // user object
  const [courseModal, setCourseModal] = useState(null); // user object
  const [newPwd, setNewPwd] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // user id
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/auth/admin/users/', { params });
      const results = Array.isArray(data) ? data : (data.results || []);
      setUsers(results);
      setUsersTotal(Array.isArray(data) ? results.length : (data.count ?? results.length));
      setUsersHasMore(Array.isArray(data) ? false : !!data.next);
      setUsersPage(1);
    } catch {
      setUsers([]);
      setUsersTotal(0);
      setUsersHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  const loadMoreUsers = async () => {
    setLoadingMore(true);
    try {
      const params = { page: usersPage + 1 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/auth/admin/users/', { params });
      const results = Array.isArray(data) ? data : (data.results || []);
      setUsers(prev => [...prev, ...results]);
      setUsersHasMore(Array.isArray(data) ? false : !!data.next);
      setUsersPage(p => p + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/classroom/courses/');
      setCourses(Array.isArray(data) ? data : (data.results || []));
    } catch {
      setCourses([]);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const patchUser = async (id, payload) => {
    await api.patch(`/auth/admin/users/${id}/`, payload);
    fetchUsers();
  };

  const saveEmail = async (id) => {
    const email = emailDraft.trim();
    if (!email) { setEditingEmailId(null); return; }
    try {
      await api.patch(`/auth/admin/users/${id}/`, { email });
      setEditingEmailId(null);
      setEmailError('');
      fetchUsers();
    } catch (err) {
      setEmailError(err?.response?.data?.email?.[0] || 'No se pudo actualizar el email');
    }
  };

  const deleteUser = async (id) => {
    await api.delete(`/auth/admin/users/${id}/`);
    setConfirmDelete(null);
    fetchUsers();
  };

  const setPassword = async () => {
    if (!newPwd.trim()) return;
    await api.post(`/auth/admin/users/${pwdModal.id}/set-password/`, { new_password: newPwd });
    setPwdModal(null);
    setNewPwd('');
  };

  const assignCourse = async () => {
    if (!selectedCourse) return;
    await api.post(`/auth/admin/users/${courseModal.id}/assign-course/`, { course_id: selectedCourse });
    setCourseModal(null);
    setSelectedCourse('');
  };

  return (
    <div>
      {/* Filters */}
      <div className="ap-filters">
        <input
          className="ap-input"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="ap-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="instructor">Docente</option>
          <option value="member">Alumno</option>
        </select>
      </div>

      {loading ? (
        <div className="ap-loading">Cargando usuarios...</div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Membresía</th>
                <th>Puntos</th>
                <th>Activo</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={8} className="ap-empty">Sin resultados</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="ap-user-cell">
                      <div className="ap-avatar" style={{ background: ROLE_COLORS[u.role] + '33' }}>
                        {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="ap-username">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}</span>
                    </div>
                  </td>
                  <td className="ap-muted">
                    {editingEmailId === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="ap-input"
                            value={emailDraft}
                            autoFocus
                            onChange={e => setEmailDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEmail(u.id);
                              if (e.key === 'Escape') { setEditingEmailId(null); setEmailError(''); }
                            }}
                          />
                          <button className="ap-btn ap-btn-blue" onClick={() => saveEmail(u.id)}>Guardar</button>
                          <button className="ap-btn ap-btn-ghost" onClick={() => { setEditingEmailId(null); setEmailError(''); }}>Cancelar</button>
                        </div>
                        {emailError && <div style={{ color: 'var(--red, #e55)', fontSize: 12 }}>{emailError}</div>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{u.email}</span>
                        <button
                          className="ap-btn ap-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          title="Editar email"
                          onClick={() => { setEditingEmailId(u.id); setEmailDraft(u.email); setEmailError(''); }}
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge text={ROLE_LABELS[u.role] || u.role} color={ROLE_COLORS[u.role] || 'var(--txt-2)'} />
                  </td>
                  <td>
                    {u.membership_status
                      ? <Badge text={STATUS_LABELS[u.membership_status] || u.membership_status} color={STATUS_COLORS[u.membership_status] || 'var(--txt-2)'} />
                      : <span className="ap-muted">—</span>}
                  </td>
                  <td className="ap-muted">{u.points ?? 0}</td>
                  <td>
                    <button
                      className={`ap-toggle ${u.is_active ? 'ap-toggle-on' : 'ap-toggle-off'}`}
                      onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                      title={u.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {u.is_active ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="ap-muted">{new Date(u.date_joined).toLocaleDateString('es-ES')}</td>
                  <td>
                    <div className="ap-actions">
                      <select
                        className="ap-select-sm"
                        value={u.role}
                        onChange={e => patchUser(u.id, { role: e.target.value })}
                        title="Cambiar rol"
                      >
                        <option value="member">Alumno</option>
                        <option value="instructor">Docente</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="ap-btn ap-btn-blue" onClick={() => { setPwdModal(u); setNewPwd(''); }}>
                        Contraseña
                      </button>
                      <button className="ap-btn ap-btn-gold" onClick={() => { setCourseModal(u); setSelectedCourse(''); }}>
                        Curso
                      </button>
                      <button className="ap-btn ap-btn-red" onClick={() => setConfirmDelete(u.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usersHasMore && (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <button className="ap-btn" onClick={loadMoreUsers} disabled={loadingMore}>
                {loadingMore ? 'Cargando...' : `Cargar más (${users.length} de ${usersTotal})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Password modal */}
      {pwdModal && (
        <Modal title={`Cambiar contraseña — ${pwdModal.email}`} onClose={() => setPwdModal(null)}>
          <input
            className="ap-input"
            type="password"
            placeholder="Nueva contraseña"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            autoFocus
          />
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={() => setPwdModal(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-blue" onClick={setPassword}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* Assign course modal */}
      {courseModal && (
        <Modal title={`Asignar curso a — ${courseModal.email}`} onClose={() => setCourseModal(null)}>
          <select className="ap-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">Selecciona un curso...</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={() => setCourseModal(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={assignCourse}>Asignar</button>
          </div>
        </Modal>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <Modal title="Confirmar eliminación" onClose={() => setConfirmDelete(null)}>
          <p className="ap-confirm-text">Esta acción es irreversible. ¿Eliminar este usuario?</p>
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-red" onClick={() => deleteUser(confirmDelete)}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Subscriptions tab ────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [createForm, setCreateForm] = useState({ user_id: '', plan: '', status: 'active' });

  const fetchAllUsers = async () => {
    let page = 1;
    let users = [];
    while (true) {
      const { data } = await api.get('/auth/admin/users/', { params: { page } });
      if (Array.isArray(data)) { users = data; break; }
      users = users.concat(data.results || []);
      if (!data.next) break;
      page += 1;
    }
    return users;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, pRes, users] = await Promise.all([
        api.get('/memberships/admin/memberships/'),
        api.get('/memberships/plans/'),
        fetchAllUsers(),
      ]);
      setMemberships(Array.isArray(mRes.data) ? mRes.data : (mRes.data.results || []));
      setPlans(Array.isArray(pRes.data) ? pRes.data : (pRes.data.results || []));
      setAllUsers(users);
    } catch {
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const patchMembership = async (id, payload) => {
    await api.patch(`/memberships/admin/memberships/${id}/`, payload);
    fetchAll();
  };

  const deleteMembership = async (id) => {
    await api.delete(`/memberships/admin/memberships/${id}/`);
    setConfirmDelete(null);
    fetchAll();
  };

  const createMembership = async () => {
    if (!createForm.user_id) return;
    await api.post('/memberships/admin/memberships/', createForm);
    setCreateModal(false);
    setCreateForm({ user_id: '', plan: '', status: 'active' });
    fetchAll();
  };

  return (
    <div>
      <div className="ap-filters">
        <button className="ap-btn ap-btn-gold" onClick={() => setCreateModal(true)}>
          + Nueva membresía
        </button>
      </div>

      {loading ? (
        <div className="ap-loading">Cargando membresías...</div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {memberships.length === 0 && (
                <tr><td colSpan={6} className="ap-empty">Sin membresías</td></tr>
              )}
              {memberships.map(m => (
                <tr key={m.id}>
                  <td>
                    <div>
                      <div className="ap-username">{m.user?.username}</div>
                      <div className="ap-muted" style={{ fontSize: 11 }}>{m.user?.email}</div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="ap-select-sm"
                      value={m.plan || ''}
                      onChange={e => patchMembership(m.id, { plan: e.target.value || null })}
                    >
                      <option value="">Sin plan</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ap-select-sm"
                      value={m.status}
                      onChange={e => patchMembership(m.id, { status: e.target.value })}
                      style={{ color: STATUS_COLORS[m.status] || 'inherit' }}
                    >
                      <option value="active">Activa</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="expired">Expirada</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      className="ap-select-sm"
                      value={m.start_date ? m.start_date.slice(0, 10) : ''}
                      onChange={e => e.target.value && patchMembership(m.id, { start_date: e.target.value })}
                    />
                  </td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="date"
                      className="ap-select-sm"
                      value={m.end_date ? m.end_date.slice(0, 10) : ''}
                      onChange={e => patchMembership(m.id, { end_date: e.target.value || null })}
                    />
                    {m.end_date && (
                      <button
                        className="ap-btn ap-btn-ghost"
                        title="Quitar fecha de fin"
                        onClick={() => patchMembership(m.id, { end_date: null })}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                  <td>
                    <button className="ap-btn ap-btn-red" onClick={() => setConfirmDelete(m.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create membership modal */}
      {createModal && (
        <Modal title="Nueva membresía" onClose={() => setCreateModal(false)}>
          <div className="ap-form-group">
            <label className="ap-label">Usuario</label>
            <UserCombobox
              users={allUsers}
              value={createForm.user_id}
              onChange={(id) => setCreateForm(f => ({ ...f, user_id: id }))}
            />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Plan</label>
            <select className="ap-select" value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="">Sin plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.interval}</option>
              ))}
            </select>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Estado</label>
            <select className="ap-select" value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Activa</option>
              <option value="lifetime">Lifetime</option>
              <option value="cancelled">Cancelada</option>
              <option value="expired">Expirada</option>
            </select>
          </div>
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={() => setCreateModal(false)}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={createMembership}>Crear</button>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <Modal title="Confirmar eliminación" onClose={() => setConfirmDelete(null)}>
          <p className="ap-confirm-text">¿Eliminar esta membresía?</p>
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-red" onClick={() => deleteMembership(confirmDelete)}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Stripe config tab ────────────────────────────────────────────────────────

function StripeTab() {
  const [config, setConfig] = useState({ stripe_public_key: '', stripe_secret_key: '', stripe_webhook_secret: '', notification_email: '' });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [planDrafts, setPlanDrafts] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, planRes] = await Promise.all([
        api.get('/memberships/admin/stripe-config/'),
        api.get('/memberships/admin/plans/'),
      ]);
      setConfig(cfgRes.data);
      const pList = Array.isArray(planRes.data) ? planRes.data : (planRes.data.results || []);
      // Only show active plans
      const active = pList.filter(p => p.is_active);
      setPlans(active);
      const drafts = {};
      active.forEach(p => {
        drafts[p.id] = {
          name: p.name || '',
          price: p.price || '',
          description: p.description || '',
          stripe_price_id: p.stripe_price_id || '',
        };
      });
      setPlanDrafts(drafts);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.patch('/memberships/admin/stripe-config/', config);
      setSavedMsg('Configuración guardada.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavedMsg('Error al guardar.');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async (planId) => {
    setSavingPlanId(planId);
    try {
      const draft = planDrafts[planId];
      await api.patch(`/memberships/admin/plans/${planId}/`, {
        name: draft.name,
        price: parseFloat(draft.price) || 0,
        description: draft.description,
        stripe_price_id: draft.stripe_price_id,
      });
      setPlans(ps => ps.map(p => p.id === planId ? { ...p, ...draft, price: parseFloat(draft.price) || 0 } : p));
      setSavingPlanId(null);
      setSavedMsg('Plan guardado.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavingPlanId(null);
    }
  };

  const updateDraft = (planId, field, value) => {
    setPlanDrafts(d => ({ ...d, [planId]: { ...d[planId], [field]: value } }));
  };

  if (loading) return <div className="ap-loading">Cargando configuración...</div>;

  const isConfigured = config.stripe_public_key && config.stripe_secret_key;

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Status badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
        padding: '8px 14px', borderRadius: 'var(--r3)',
        background: isConfigured ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
        border: `1px solid ${isConfigured ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.2)'}`,
        fontSize: 13, fontWeight: 600,
        color: isConfigured ? 'var(--green)' : 'var(--red)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConfigured ? 'var(--green)' : 'var(--red)', display: 'inline-block' }} />
        {isConfigured ? 'Stripe configurado' : 'Stripe no configurado — los pagos no funcionarán'}
      </div>

      {/* Keys section */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: '22px 24px', marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 18 }}>Claves de Stripe</h3>

        {[
          { label: 'Clave pública (pk_...)', key: 'stripe_public_key', type: 'text', placeholder: 'pk_test_...' },
          { label: 'Clave secreta (sk_...)', key: 'stripe_secret_key', type: 'password', placeholder: 'sk_test_...' },
          { label: 'Webhook Secret (whsec_...)', key: 'stripe_webhook_secret', type: 'password', placeholder: 'whsec_...' },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key} className="ap-form-group">
            <label className="ap-label">{label}</label>
            <input
              className="ap-input"
              type={type}
              placeholder={placeholder}
              value={config[key]}
              onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
              autoComplete="off"
            />
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            className="ap-btn ap-btn-gold"
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar claves'}
          </button>
          {savedMsg && (
            <span style={{ fontSize: 13, color: savedMsg.includes('Error') ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
              {savedMsg}
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 16, lineHeight: 1.6 }}>
          Obtén tus claves en <strong>dashboard.stripe.com → Developers → API keys</strong>. Para el webhook, crea un endpoint en Stripe apuntando a <code style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>/api/memberships/webhook/</code> y copia el signing secret aquí.
        </p>
      </div>

      {/* Notifications section */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: '22px 24px', marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 6 }}>Notificaciones de suscripción</h3>
        <p style={{ fontSize: 12, color: 'var(--txt-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Cuando alguien se suscriba a un plan mensual, trimestral, anual o lifetime, se enviará un correo a esta dirección avisando de la nueva suscripción.
        </p>
        <div className="ap-form-group" style={{ margin: 0 }}>
          <label className="ap-label">Email de notificaciones</label>
          <input
            className="ap-input"
            type="email"
            placeholder="tu-correo@ejemplo.com"
            value={config.notification_email}
            onChange={e => setConfig(c => ({ ...c, notification_email: e.target.value }))}
            autoComplete="off"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button
            className="ap-btn ap-btn-gold"
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar email'}
          </button>
          {savedMsg && (
            <span style={{ fontSize: 13, color: savedMsg.includes('Error') ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
              {savedMsg}
            </span>
          )}
        </div>
      </div>

      {/* Plans section */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>Planes de membresía</h3>
            <p style={{ fontSize: 12, color: 'var(--txt-3)', lineHeight: 1.5 }}>
              Edita nombre, precio y descripción de cada plan. Los cambios se reflejan en la página de membresía al instante.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
          {plans.map(plan => {
            const draft = planDrafts[plan.id] || {};
            const interval = plan.interval === 'monthly' ? 'mensual' : plan.interval === 'annual' ? 'anual' : plan.interval;
            return (
              <div key={plan.id} style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,166,35,0.15)', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{interval}</span>
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Nombre del plan</label>
                  <input className="ap-input" value={draft.name ?? ''} onChange={e => updateDraft(plan.id, 'name', e.target.value)} placeholder="Mensual" />
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Precio (€)</label>
                  <input className="ap-input" type="number" min="0" step="0.01" value={draft.price ?? ''} onChange={e => updateDraft(plan.id, 'price', e.target.value)} placeholder="30.00" />
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Descripción</label>
                  <input className="ap-input" value={draft.description ?? ''} onChange={e => updateDraft(plan.id, 'description', e.target.value)} placeholder="Acceso completo..." />
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Stripe Price ID</label>
                  <input className="ap-input" style={{ fontFamily: 'monospace', fontSize: 12 }} value={draft.stripe_price_id ?? ''} onChange={e => updateDraft(plan.id, 'stripe_price_id', e.target.value)} placeholder="price_..." />
                </div>
                <button
                  className="ap-btn ap-btn-gold"
                  style={{ marginTop: 4 }}
                  onClick={() => savePlan(plan.id)}
                  disabled={savingPlanId === plan.id}
                >
                  {savingPlanId === plan.id ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            );
          })}
        </div>
        {plans.length === 0 && <p style={{ fontSize: 13, color: 'var(--txt-3)', textAlign: 'center', padding: '20px 0' }}>No hay planes activos.</p>}
        <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 16, lineHeight: 1.5 }}>
          El <strong>Stripe Price ID</strong> (<code style={{ background: 'var(--bg-4)', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>price_...</code>) se obtiene en Stripe → Products. Solo es necesario si tienes Stripe configurado.
        </p>
      </div>
    </div>
  );
}

// ── General tab (site settings) ─────────────────────────────────────────────

const ACCENT_PRESETS = [
  { name: 'Amarillo',  color: '#f5d42a' },
  { name: 'Naranja',   color: '#f97316' },
  { name: 'Rojo',      color: '#ef4444' },
  { name: 'Rosa',      color: '#ec4899' },
  { name: 'Morado',    color: '#a855f7' },
  { name: 'Azul',      color: '#3b82f6' },
  { name: 'Cian',      color: '#06b6d4' },
  { name: 'Verde',     color: '#22c55e' },
];

function GeneralTab() {
  const { siteName: globalName, bannerImage: globalBanner, accentColor: globalAccent, communityDescription: globalDescription, updateSettings } = useSiteStore();
  const [name, setName]           = useState('');
  const [preview, setPreview]     = useState(null);
  const [file, setFile]           = useState(null);
  const [accentColor, setAccent]  = useState('#f5d42a');
  const [description, setDescription] = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const fileRef                   = useRef(null);

  useEffect(() => {
    setName(globalName || '');
    setPreview(globalBanner || null);
    setAccent(globalAccent || '#f5d42a');
    setDescription(globalDescription || '');
  }, [globalName, globalBanner, globalAccent, globalDescription]);

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removeBanner = () => { setFile(null); setPreview(null); };

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const form = new FormData();
      form.append('site_name', name);
      form.append('accent_color', accentColor);
      form.append('community_description', description);
      if (file)          form.append('banner_image', file);
      else if (!preview) form.append('banner_image', '');   // clear
      const { data } = await api.patch('/auth/admin/site-settings/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateSettings(data.site_name, data.banner_image, data.accent_color, data.community_description);
      setMsg('Guardado correctamente.');
    } catch {
      setMsg('Error al guardar.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>Configuración general</h3>
      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 24 }}>
        Personaliza el nombre y la imagen de fondo de la tarjeta de la comunidad.
      </p>

      {/* Name */}
      <div className="ap-form-group">
        <label className="ap-label">Nombre de la plataforma</label>
        <input
          className="ap-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="The Hackers Labs Academy"
        />
        <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 4 }}>
          Aparece en el sidebar, navbar, login, tarjeta de comunidad y todas las páginas.
        </p>
      </div>

      {/* Accent color */}
      <div className="ap-form-group">
        <label className="ap-label">Color de acento</label>
        <p style={{ fontSize: 12, color: 'var(--txt-3)', marginBottom: 10 }}>
          Se aplica a botones, enlaces, badges y elementos destacados de toda la web.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ACCENT_PRESETS.map(({ name: pName, color }) => {
            const active = accentColor === color;
            return (
              <button
                key={color}
                title={pName}
                onClick={() => { setAccent(color); applyAccentColor(color); }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: color, border: 'none', cursor: 'pointer', padding: 0,
                  outline: active ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 3,
                  boxShadow: active ? `0 0 12px ${color}88` : 'none',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.18s ease',
                }}
              />
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 8 }}>
          Color actual: <span style={{ color: accentColor, fontWeight: 700 }}>{accentColor}</span>
        </p>
      </div>

      {/* Community description */}
      <div className="ap-form-group">
        <label className="ap-label">Descripción de la comunidad</label>
        <textarea
          className="ap-input"
          rows={3}
          maxLength={300}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Aprende ciberseguridad con una comunidad activa..."
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 4 }}>
          Aparece en la tarjeta de la comunidad, en Comunidad y en Miembros.
        </p>
      </div>

      {/* Banner image */}
      <div className="ap-form-group">
        <label className="ap-label">Imagen de fondo de la tarjeta</label>

        {/* Preview */}
        <div style={{
          height: 110, borderRadius: 'var(--r3)', overflow: 'hidden',
          background: preview
            ? `url(${preview}) center/cover no-repeat`
            : 'linear-gradient(135deg,#1a237e 0%,#283593 60%,#1565c0 100%)',
          border: '1px solid var(--line)', marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          {preview && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,var(--gold),#c4841a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#000', fontFamily: 'JetBrains Mono,monospace' }}>
              {(name || 'S')[0].toUpperCase()}
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{name || 'The Hackers Labs Academy'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="ap-btn ap-btn-blue"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {preview && (
            <button className="ap-btn" onClick={removeBanner}>
              Quitar imagen
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 6 }}>
          Recomendado: imagen horizontal de al menos 600 × 150 px. JPG o PNG.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button className="ap-btn ap-btn-gold" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {msg && <span style={{ fontSize: 13, color: msg.includes('Error') ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{msg}</span>}
      </div>
    </div>
  );
}

// ── Progress tab ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'var(--gold)' }) {
  return (
    <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function ProgressTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);       // user id
  const [detail, setDetail] = useState(null);           // { user, courses }
  const [detailLoading, setDetailLoading] = useState(false);
  const [expanded, setExpanded] = useState({});         // courseId → bool

  useEffect(() => {
    api.get('/classroom/admin/user-progress/')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (userId) => {
    if (selected === userId) { setSelected(null); setDetail(null); return; }
    setSelected(userId);
    setDetail(null);
    setExpanded({});
    setDetailLoading(true);
    try {
      const r = await api.get(`/classroom/admin/user-progress/${userId}/`);
      setDetail(r.data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const toggleCourse = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const pctColor = (p) => p >= 80 ? 'var(--green)' : p >= 40 ? 'var(--gold)' : 'var(--txt-3)';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>Progreso de alumnos</h3>
        <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>Haz clic en un alumno para ver el detalle de cursos, módulos y clases completadas.</p>
      </div>

      {loading ? <div className="ap-loading">Cargando...</div> : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Clases completadas</th>
                <th>Progreso</th>
                <th>Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={6} className="ap-empty">Sin datos</td></tr>}
              {users.map(u => (
                <React.Fragment key={u.id}>
                  <tr
                    onClick={() => openDetail(u.id)}
                    style={{ cursor: 'pointer', background: selected === u.id ? 'rgba(245,166,35,0.06)' : 'transparent' }}
                  >
                    <td>
                      <div className="ap-user-cell">
                        <div className="ap-avatar" style={{ background: ROLE_COLORS[u.role] + '33' }}>
                          {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="ap-username">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}</span>
                      </div>
                    </td>
                    <td className="ap-muted">{u.email}</td>
                    <td><Badge text={ROLE_LABELS[u.role] || u.role} color={ROLE_COLORS[u.role] || 'var(--txt-2)'} /></td>
                    <td className="ap-muted">{u.completed_lessons} / {u.total_lessons}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar pct={u.percent} color={pctColor(u.percent)} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: pctColor(u.percent), minWidth: 32 }}>{u.percent}%</span>
                      </div>
                    </td>
                    <td className="ap-muted" style={{ fontSize: 12 }}>
                      {u.last_activity ? new Date(u.last_activity).toLocaleDateString('es-ES') : '—'}
                    </td>
                  </tr>

                  {/* Inline detail panel */}
                  {selected === u.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, background: 'var(--bg-2)' }}>
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                          {detailLoading && <div style={{ fontSize: 13, color: 'var(--txt-3)', padding: '8px 0' }}>Cargando detalle...</div>}
                          {detail && detail.courses.length === 0 && (
                            <p style={{ fontSize: 13, color: 'var(--txt-3)', margin: 0 }}>Este alumno no tiene progreso registrado aún.</p>
                          )}
                          {detail && detail.courses.map(course => (
                            <div key={course.id} style={{ marginBottom: 10, border: '1px solid var(--line)', borderRadius: 'var(--r3)', overflow: 'hidden' }}>
                              {/* Course header */}
                              <div
                                onClick={() => toggleCourse(course.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: 'var(--bg-3)', userSelect: 'none' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                  style={{ transform: expanded[course.id] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.5 }}>
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt-1)', flex: 1 }}>{course.title}</span>
                                <ProgressBar pct={course.percent} color={pctColor(course.percent)} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: pctColor(course.percent), minWidth: 40, textAlign: 'right' }}>
                                  {course.completed}/{course.total}
                                </span>
                              </div>

                              {/* Modules + lessons */}
                              {expanded[course.id] && (
                                <div style={{ padding: '8px 14px 12px 32px' }}>
                                  {course.modules.map(mod => (
                                    <div key={mod.id} style={{ marginBottom: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-2)' }}>{mod.title}</span>
                                        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{mod.completed}/{mod.total}</span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12 }}>
                                        {mod.lessons.map(lesson => (
                                          <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                              background: lesson.completed ? 'var(--green)' : 'var(--bg-4)',
                                              border: `2px solid ${lesson.completed ? 'var(--green)' : 'var(--line-2)'}`,
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                              {lesson.completed && (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                              )}
                                            </div>
                                            <span style={{ fontSize: 13, color: lesson.completed ? 'var(--txt-1)' : 'var(--txt-3)', flex: 1 }}>{lesson.title}</span>
                                            {lesson.completed_at && (
                                              <span style={{ fontSize: 11, color: 'var(--txt-4)' }}>
                                                {new Date(lesson.completed_at).toLocaleDateString('es-ES')}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Affiliates tab ───────────────────────────────────────────────────────────

const BASE_URL = window.location.origin;

function genCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function AffiliatesTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { item: obj }
  const [copied, setCopied] = useState(null); // affiliate id that was just copied
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/memberships/admin/affiliates/')
      .then(r => setLinks(Array.isArray(r.data) ? r.data : (r.data.results || [])))
      .catch(() => setErr('No se pudieron cargar los afiliados.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => setModal({ item: { label: '', code: genCode(), commission_pct: 20, notes: '' } });
  const openEdit = (link) => setModal({ item: { ...link } });

  const handleSave = async (item) => {
    if (!item.code.trim()) return;
    setErr('');
    try {
      if (item.id) await api.patch(`/memberships/admin/affiliates/${item.id}/`, item);
      else         await api.post('/memberships/admin/affiliates/', item);
      setModal(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.code?.[0] || e.response?.data?.detail || 'Error al guardar el afiliado.');
    }
  };

  const remove = async (link) => {
    try {
      await api.delete(`/memberships/admin/affiliates/${link.id}/`);
      load();
    } catch {
      setErr('Error al eliminar el afiliado.');
    }
  };

  const copyUrl = (link) => {
    const url = `${BASE_URL}/register?ref=${encodeURIComponent(link.code)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(link.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>Enlaces de afiliado</h3>
          <p style={{ fontSize: 13, color: 'var(--txt-3)', lineHeight: 1.5 }}>
            Crea links de referido con su % de comisión. Cada registro hecho con el enlace queda asociado al afiliado, y aquí ves cuántos referidos tiene, cuántos están suscritos y la comisión estimada.
          </p>
        </div>
        <button className="ap-btn ap-btn-gold" onClick={openCreate}>+ Nuevo enlace</button>
      </div>

      {err && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--r2)', fontSize: 13, color: 'var(--red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          {err}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <AffiliateModal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {loading ? (
        <div className="ap-loading">Cargando afiliados...</div>
      ) : links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt-3)', fontSize: 14 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          No hay enlaces de afiliado todavía. Pulsa "+ Nuevo enlace" para crear el primero.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const url = `${BASE_URL}/register?ref=${encodeURIComponent(link.code)}`;
            const isCopied = copied === link.id;
            return (
              <div key={link.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r3)', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Commission badge */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 'var(--r3)', background: 'rgba(245,166,35,0.1)', border: '1px solid var(--gold-border)' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{link.commission_pct}%</span>
                  <span style={{ fontSize: 9, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>comisión</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt-1)' }}>{link.label || link.code}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 'var(--r5)', background: 'var(--bg-4)', color: 'var(--txt-3)', letterSpacing: '0.05em' }}>{link.code}</span>
                    {!link.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r5)', background: 'rgba(248,113,113,0.12)', color: 'var(--red)' }}>INACTIVO</span>
                    )}
                  </div>
                  {/* URL row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '6px 10px', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{url}</span>
                    <button
                      onClick={() => copyUrl(link)}
                      style={{ flexShrink: 0, background: isCopied ? 'var(--green)' : 'var(--bg-4)', color: isCopied ? '#000' : 'var(--txt-2)', border: 'none', borderRadius: 'var(--r2)', padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {isCopied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: link.notes ? 8 : 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                      <strong style={{ color: 'var(--txt-1)' }}>{link.referred_count}</strong> referidos
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                      <strong style={{ color: 'var(--txt-1)' }}>{link.active_count}</strong> con membresía activa
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                      Comisión estimada: <strong style={{ color: 'var(--gold)' }}>{Number(link.commission_estimate).toFixed(2)}€</strong>
                    </span>
                  </div>
                  {link.notes && <p style={{ fontSize: 12, color: 'var(--txt-3)', margin: 0, lineHeight: 1.5 }}>{link.notes}</p>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="ap-btn ap-btn-blue" onClick={() => openEdit(link)}>Editar</button>
                  <button className="ap-btn ap-btn-red" onClick={() => remove(link)}>Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 20, lineHeight: 1.6 }}>
        El enlace lleva al registro con el código ya incluido (<code style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>?ref=CODIGO</code>). Cuando alguien se registra desde ese enlace, queda asociado al afiliado en la base de datos, y la comisión estimada se calcula sobre el precio del plan de quienes tienen una membresía activa actualmente.
      </p>
    </div>
  );
}

function AffiliateModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return createPortal((
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">{item.id ? 'Editar enlace' : 'Nuevo enlace de afiliado'}</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div className="ap-form-group">
            <label className="ap-label">Nombre / etiqueta</label>
            <input className="ap-input" value={form.label} onChange={e => set('label', e.target.value)} placeholder="ej. Juan García" autoFocus />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Código único</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="ap-input" value={form.code} onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="MICODIGO" style={{ fontFamily: 'monospace', flex: 1 }} />
              <button className="ap-btn" onClick={() => set('code', genCode())} title="Generar código aleatorio" style={{ flexShrink: 0 }}>↻</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 4 }}>Solo letras y números. Se usa en la URL de registro.</p>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Comisión (%)</label>
            <input className="ap-input" type="number" min="0" max="100" step="1" value={form.commission_pct} onChange={e => set('commission_pct', parseInt(e.target.value, 10) || 0)} placeholder="20" />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Notas internas (opcional)</label>
            <input className="ap-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Canal de YouTube, Instagram..." />
          </div>
          {form.id && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--txt-2)', marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active !== false} onChange={e => set('is_active', e.target.checked)} />
              Afiliado activo (si lo desmarcas, su código deja de funcionar en el registro)
            </label>
          )}
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={() => onSave(form)} disabled={!form.code.trim()}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

// ── CategoriesTab ────────────────────────────────────────────────────────────

const CATEGORY_COLORS = ['#60a5fa','#f87171','#34d399','#a78bfa','#fbbf24','#fb923c','#38bdf8','#e879f9','#f5a623','#4ade80'];
const EMPTY_CAT = { name:'', description:'', icon:'💬', color:'#60a5fa', order:0 };

function CategoryModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_CAT });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr('El nombre es obligatorio.'); return; }
    setSaving(true); setErr('');
    try {
      if (initial?.id) await api.patch(`/community/categories/${initial.id}/`, form);
      else             await api.post('/community/categories/', form);
      onSave();
    } catch (e) {
      const d = e.response?.data;
      setErr(d?.name?.[0] || d?.detail || JSON.stringify(d) || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
        <div className="ap-modal-header">
          <span className="ap-modal-title">{initial?.id ? 'Editar categoría' : 'Nueva categoría'}</span>
          <button className="ap-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:12, marginBottom:12 }}>
            <div className="ap-form-group" style={{ margin:0 }}>
              <label className="ap-label">Icono</label>
              <input className="ap-input" value={form.icon} onChange={e=>set('icon',e.target.value)} style={{ fontSize:22, textAlign:'center', padding:'8px 4px' }} maxLength={2} />
            </div>
            <div className="ap-form-group" style={{ margin:0 }}>
              <label className="ap-label">Nombre *</label>
              <input className="ap-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="General" autoFocus />
            </div>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Color</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              {CATEGORY_COLORS.map(c => (
                <button key={c} type="button" onClick={()=>set('color',c)}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, border: form.color===c ? `3px solid var(--txt-1)` : '2px solid transparent', cursor:'pointer', transition:'all var(--t1)', boxShadow: form.color===c ? `0 0 0 2px var(--bg-1)` : 'none' }} />
              ))}
              <input type="color" value={form.color} onChange={e=>set('color',e.target.value)}
                style={{ width:28, height:28, borderRadius:'50%', border:'2px dashed var(--line)', cursor:'pointer', background:'none', padding:0 }} title="Custom color" />
            </div>
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Descripción</label>
            <textarea className="ap-input" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{ resize:'vertical', fontFamily:'inherit' }} />
          </div>
          <div className="ap-form-group">
            <label className="ap-label">Orden</label>
            <input className="ap-input" type="number" value={form.order} onChange={e=>set('order', parseInt(e.target.value)||0)} style={{ width:80 }} />
          </div>
          {err && <p style={{ fontSize:12, color:'var(--red)', margin:'0 0 8px' }}>{err}</p>}
          <div className="ap-modal-footer">
            <button className="ap-btn ap-btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-gold" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : initial?.id ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | cat object | 'new'

  const load = () => {
    setLoading(true);
    api.get('/community/categories/').then(r => setCats(r.data.results || r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    await api.delete(`/community/categories/${id}/`);
    load();
  };

  return (
    <div>
      <div className="ap-section-header">
        <div>
          <h2 className="ap-section-title">Categorías de comunidad</h2>
          <p className="ap-section-sub">Organiza los posts por secciones temáticas</p>
        </div>
        <button className="ap-btn ap-btn-gold" onClick={() => setModal('new')}>+ Nueva categoría</button>
      </div>

      {loading ? <p className="ap-empty">Cargando…</p> : cats.length === 0 ? (
        <p className="ap-empty">No hay categorías aún.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {cats.map(cat => (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'var(--r3)' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{cat.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--txt-1)' }}>{cat.name}</span>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:cat.color, display:'inline-block', flexShrink:0 }} />
                </div>
                {cat.description && <p style={{ fontSize:12, color:'var(--txt-3)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.description}</p>}
              </div>
              <span style={{ fontSize:11, color:'var(--txt-4)', marginRight:8 }}>orden: {cat.order}</span>
              <button className="ap-btn ap-btn-ghost" style={{ padding:'5px 12px', fontSize:12 }} onClick={() => setModal(cat)}>Editar</button>
              <button className="ap-btn" style={{ padding:'5px 12px', fontSize:12, background:'transparent', border:'1px solid var(--line)', color:'var(--red)', borderRadius:'var(--r2)' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(248,113,113,0.1)';e.currentTarget.style.borderColor='var(--red)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--line)';}}
                onClick={() => del(cat.id)}>Eliminar</button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CategoryModal
          initial={modal === 'new' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── AdminPanel ───────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [tab, setTab] = useState('general');

  return (
    <div className="ap-root">
      <div className="ap-header">
        <h1 className="ap-title">Panel de Administración</h1>
        <p className="ap-subtitle">Gestión de usuarios, suscripciones y pagos</p>
      </div>

      <div className="ap-tabs">
        <button className={`ap-tab ${tab === 'general' ? 'ap-tab-active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button className={`ap-tab ${tab === 'users' ? 'ap-tab-active' : ''}`} onClick={() => setTab('users')}>Usuarios</button>
        <button className={`ap-tab ${tab === 'subscriptions' ? 'ap-tab-active' : ''}`} onClick={() => setTab('subscriptions')}>Suscripciones</button>
        <button className={`ap-tab ${tab === 'stripe' ? 'ap-tab-active' : ''}`} onClick={() => setTab('stripe')}>Stripe & Planes</button>
        <button className={`ap-tab ${tab === 'progress' ? 'ap-tab-active' : ''}`} onClick={() => setTab('progress')}>Progreso</button>
        <button className={`ap-tab ${tab === 'affiliates' ? 'ap-tab-active' : ''}`} onClick={() => setTab('affiliates')}>Afiliados</button>
        <button className={`ap-tab ${tab === 'categories' ? 'ap-tab-active' : ''}`} onClick={() => setTab('categories')}>Categorías</button>
      </div>

      <div className="ap-content">
        {tab === 'general'    && <GeneralTab />}
        {tab === 'users'      && <UsersTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'stripe'     && <StripeTab />}
        {tab === 'progress'   && <ProgressTab />}
        {tab === 'affiliates' && <AffiliatesTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}
