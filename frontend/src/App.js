import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import api from './api/axios';
import useAuthStore from './store/authStore';
import useSiteStore from './store/siteStore';
import SiteBrand from './components/ui/SiteBrand';
import Layout from './components/layout/Layout';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import Analytics from './pages/Analytics';
import Classroom from './pages/Classroom';
import CourseDetail from './pages/CourseDetail';
import LessonPage from './pages/LessonPage';
import Calendar from './pages/Calendar';
import Resources from './pages/Resources';
import Members from './pages/Members';
import About from './pages/About';
import CertificateVerify from './pages/CertificateVerify';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Membership from './pages/Membership';
import Spinner from './components/ui/Spinner';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner fullscreen />;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner fullscreen />;
  return !isAuthenticated ? children : <Navigate to="/community" />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  // `user.role` comes from a GET response the client can tamper with (e.g. via a proxy),
  // so it must never be trusted to grant access on its own. Re-confirm admin access against
  // a real admin-only endpoint, which the backend re-validates from the authenticated user's
  // DB row on every call, before rendering anything admin-only.
  const [verified, setVerified] = useState(null); // null = checking, true/false = result

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setVerified(null);
    api.get('/auth/admin/users/', { params: { page_size: 1 } })
      .then(() => { if (active) setVerified(true); })
      .catch(() => { if (active) setVerified(false); });
    return () => { active = false; };
  }, [isAuthenticated]);

  if (isLoading || (isAuthenticated && verified === null)) return <Spinner fullscreen />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!verified) return <Navigate to="/community" />;
  return children;
}

function MemberRoute({ children }) {
  const { isAuthenticated, isLoading, user, membership } = useAuthStore();
  if (isLoading) return <Spinner fullscreen />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'admin' || user?.role === 'instructor') return children;
  if (!membership?.is_active) return <Navigate to="/membership" />;
  return children;
}

function RootPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner fullscreen />;
  if (isAuthenticated) return <Navigate to="/community" replace />;
  return <PublicLanding />;
}

function PublicAboutPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { bannerImage: pubBanner } = useSiteStore();
  if (isLoading) return <Spinner fullscreen />;

  if (isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
        <Navbar />
        <div className="main-content"><About /></div>
      </div>
    );
  }

  // Unauthenticated: minimal public header
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', color: 'var(--txt-1)' }}>
      <header style={{ position:'sticky', top:0, zIndex:100, background:'var(--navbar-bg)', backdropFilter:'blur(24px) saturate(1.4)', borderBottom:'1px solid var(--line)', padding:'0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', height:48, maxWidth:1160, margin:'0 auto' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', flexShrink:0 }}>
            <img src="/logo.png" alt="logo" style={{ width:32, height:32, objectFit:'contain' }} />
            <span style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.3px', color:'var(--txt-1)' }}><SiteBrand /></span>
          </Link>
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/login" className="public-auth-login" style={{ fontSize:13, color:'var(--txt-2)', textDecoration:'none', padding:'6px 14px', borderRadius:'var(--r2)', border:'1px solid var(--line)', fontWeight:600, transition:'all var(--t1)' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--line-2)'; e.currentTarget.style.color='var(--txt-1)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='var(--txt-2)'; }}>
              Iniciar sesión
            </Link>
            <Link to="/register" className="public-auth-register" style={{ fontSize:13, background:'var(--gold)', color:'#000', textDecoration:'none', padding:'6px 16px', borderRadius:'var(--r2)', fontWeight:700, transition:'background var(--t1)' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--gold-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--gold)'}>
              Registrarse
            </Link>
          </div>
        </div>
      </header>
      <div className="main-content"><About /></div>
    </div>
  );
}

function PublicLanding() {
  const { bannerImage: landingBanner } = useSiteStore();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', color: 'var(--txt-1)' }}>
      {/* Public header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        borderBottom: '1px solid var(--line)',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 48, maxWidth: 1160, margin: '0 auto' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--txt-1)' }}>
              <SiteBrand />
            </span>
          </Link>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" className="public-auth-login" style={{
              fontSize: 13, color: 'var(--txt-2)', textDecoration: 'none',
              padding: '6px 14px', borderRadius: 'var(--r2)',
              border: '1px solid var(--line)', fontWeight: 600,
              transition: 'all var(--t1)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--txt-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--txt-2)'; }}
            >
              Iniciar sesión
            </Link>
            <Link to="/register" className="public-auth-register" style={{
              fontSize: 13, background: 'var(--gold)', color: '#000',
              textDecoration: 'none', padding: '6px 16px',
              borderRadius: 'var(--r2)', fontWeight: 700,
              transition: 'background var(--t1)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* About content */}
      <div className="main-content">
        <About />
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);
  const fetchSettings = useSiteStore(s => s.fetchSettings);
  useEffect(() => { init(); fetchSettings(); }, [init, fetchSettings]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<RootPage />} />

        {/* Public about (visible without login) */}
        <Route path="/about" element={<PublicAboutPage />} />

        {/* Public certificate verification */}
        <Route path="/verify/:certId" element={<CertificateVerify />} />

        {/* Auth pages */}
        <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

        {/* Private app with full layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="community"             element={<MemberRoute><Community /></MemberRoute>} />
          <Route path="community/posts/:postId" element={<MemberRoute><PostDetail /></MemberRoute>} />
          <Route path="classroom"    element={<MemberRoute><Classroom /></MemberRoute>} />
          <Route path="classroom/:id" element={<MemberRoute><CourseDetail /></MemberRoute>} />
          <Route path="classroom/:courseId/lesson/:lessonId" element={<MemberRoute><LessonPage /></MemberRoute>} />
          <Route path="resources"    element={<MemberRoute><Resources /></MemberRoute>} />
          <Route path="calendar"     element={<Calendar />} />
          <Route path="members"      element={<Members />} />
          <Route path="profile/*"    element={<Profile />} />
          <Route path="membership"   element={<Membership />} />
          <Route path="admin"        element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="analytics"    element={<AdminRoute><Analytics /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
