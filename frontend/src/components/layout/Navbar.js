import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useSiteStore from '../../store/siteStore';
import api from '../../api/axios';
import Ico from '../ui/Ico';
import SiteBrand from '../ui/SiteBrand';

const NAV = [
  { to: '/community', label: 'Comunidad', icon: 'chat' },
  { to: '/classroom', label: 'Aula', icon: 'book' },
  { to: '/resources', label: 'Recursos', icon: 'folder' },
  { to: '/calendar',  label: 'Calendario', icon: 'calendar' },
  { to: '/members',   label: 'Miembros', icon: 'users' },
  { to: '/about',     label: 'Sobre nosotros', icon: 'info' },
];

const LABS_URL = 'https://labs.thehackerslabs.com';

/* ── Tiny avatar ─── */
function MiniAvatar({ user, size = 32 }) {
  const s = (user?.first_name?.[0]||'') + (user?.last_name?.[0]||user?.username?.[0]||'');
  const colors = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c'];
  const bg = colors[(user?.id||0) % colors.length];
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />;
  return <div style={{ width:size,height:size,borderRadius:'50%',flexShrink:0,background:`linear-gradient(135deg,${bg},${bg}bb)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*.37,color:'#000',letterSpacing:'-0.5px',userSelect:'none' }}>{s.toUpperCase()||'?'}</div>;
}

function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if (m<1) return 'ahora'; if (m<60) return `${m}m`; if (m<1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`;
}

/* ── Icon button ─── */
function NavIcon({ children, active, badge, onClick, title }) {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ position:'relative',width:36,height:36,borderRadius:'50%',border:`1px solid ${active?'var(--line-2)':'transparent'}`,background:active||h?'var(--bg-3)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,color:active?'var(--txt-1)':'var(--txt-2)',cursor:'pointer',transition:`all var(--t-fast) var(--ease)` }}>
      {children}
      {badge>0&&<span style={{ position:'absolute',top:1,right:1,minWidth:15,height:15,borderRadius:8,padding:'0 3px',background:'var(--gold)',color:'#000',fontSize:9,fontWeight:800,border:'2px solid var(--bg-1)',display:'flex',alignItems:'center',justifyContent:'center',animation:'popIn 300ms var(--ease-back)' }}>{badge>9?'9+':badge}</span>}
    </button>
  );
}

/* ── Shared dropdown shell ─── */
const DROP_STYLE = {
  position:'absolute', right:0, top:'calc(100% + 10px)',
  width:'min(400px, calc(100vw - 24px))', maxHeight:'min(520px, calc(100vh - 80px))',
  background:'var(--bg-2)', border:'1px solid var(--line-2)',
  borderRadius:'var(--r4)', boxShadow:'0 8px 40px rgba(0,0,0,0.28)',
  zIndex:400, display:'flex', flexDirection:'column', overflow:'hidden',
};

function DropHeader({ title, onClose, onBack, extra }) {
  return (
    <div style={{ display:'flex',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid var(--line)',flexShrink:0,gap:8 }}>
      {onBack&&<button onClick={onBack} style={{ width:26,height:26,borderRadius:'50%',background:'var(--bg-3)',border:'none',color:'var(--txt-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Ico name="arrowL" size={13}/></button>}
      <span style={{ fontWeight:700,fontSize:15,flex:1,color:'var(--txt-1)' }}>{title}</span>
      {extra}
      <button onClick={onClose} style={{ width:26,height:26,borderRadius:'50%',background:'var(--bg-3)',border:'none',color:'var(--txt-3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Ico name="x" size={12}/></button>
    </div>
  );
}

/* ── Notifications ─── */
function NotificationsPanel({ onClose }) {
  const [items,setItems] = useState([]); const [loading,setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    api.get('/notifications/').then(r=>setItems(r.data.results||r.data)).finally(()=>setLoading(false));
  },[]);
  const notifIcon = { comment:'chat',like:'heart',event:'calendar',system:'bell',post:'chat',course:'book',lesson:'book' };

  const handleClick = (n) => {
    if (!n.is_read) {
      setItems(prev => prev.map(it => it.id===n.id ? { ...it, is_read:true } : it));
      api.post(`/notifications/${n.id}/read/`).catch(()=>{});
    }
    if (n.link) { navigate(n.link); onClose(); }
  };

  const markAllRead = () => {
    setItems(prev => prev.map(it => ({ ...it, is_read:true })));
    api.post('/notifications/read/').catch(()=>{});
  };

  const markRead = (e, n) => {
    e.stopPropagation();
    if (n.is_read) return;
    setItems(prev => prev.map(it => it.id===n.id ? { ...it, is_read:true } : it));
    api.post(`/notifications/${n.id}/read/`).catch(()=>{});
  };

  const deleteNotif = (e, n) => {
    e.stopPropagation();
    setItems(prev => prev.filter(it => it.id !== n.id));
    api.delete(`/notifications/${n.id}/`).catch(()=>{});
  };

  const hasUnread = items.some(n=>!n.is_read);

  return (
    <div className="anim-fade-down nav-dropdown" style={DROP_STYLE}>
      <DropHeader title="Notificaciones" onClose={onClose}
        extra={hasUnread && <button onClick={markAllRead} style={{ background:'none',border:'none',color:'var(--gold)',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' }}>Marcar todas</button>}
      />
      <div style={{ overflowY:'auto',flex:1 }}>
        {loading?<Loader/>:items.length===0?<Empty icon="bell" text="Sin notificaciones"/>:
          items.map(n=>(
            <div key={n.id} onClick={()=>handleClick(n)} style={{ display:'flex',gap:12,padding:'13px 16px',background:n.is_read?'transparent':'rgba(245,166,35,0.04)',borderBottom:'1px solid var(--line)',cursor:'pointer',transition:'background var(--t1)' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'} onMouseLeave={e=>e.currentTarget.style.background=n.is_read?'transparent':'rgba(245,166,35,0.04)'}>
              <div style={{ width:38,height:38,borderRadius:'50%',flexShrink:0,background:'var(--bg-3)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--txt-2)' }}><Ico name={notifIcon[n.notification_type]||'bell'} size={16}/></div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:13,fontWeight:n.is_read?500:700,color:'var(--txt-1)',marginBottom:2,lineHeight:1.45 }}>{n.title}</p>
                {n.message&&<p style={{ fontSize:12,color:'var(--txt-2)',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.message}</p>}
                <p style={{ fontSize:11,color:'var(--txt-4)',marginTop:4 }}>{timeAgo(n.created_at)}</p>
              </div>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0 }}>
                {!n.is_read
                  ? <button title="Marcar como leída" onClick={e=>markRead(e,n)} style={{ width:20,height:20,borderRadius:'50%',background:'var(--gold)',border:'none',cursor:'pointer',flexShrink:0 }}/>
                  : <div style={{ width:8,height:8 }}/>
                }
                <button title="Eliminar" onClick={e=>deleteNotif(e,n)} style={{ background:'none',border:'none',color:'var(--txt-4)',cursor:'pointer',fontSize:13,lineHeight:1,padding:2 }}
                  onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color='var(--txt-4)'}>🗑</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ── Chat ─── */
function ChatPanel({ onClose }) {
  const { user } = useAuthStore();
  const [convs,setConvs]=useState([]); const [active,setActive]=useState(null); const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState(''); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [members,setMembers]=useState([]);
  const endRef=useRef(null);

  const fetchConvs = useCallback(()=>{ api.get('/chat/').then(r=>setConvs(r.data.results||r.data)).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ fetchConvs(); },[fetchConvs]);
  useEffect(()=>{
    if(!active) return;
    api.get(`/chat/${active.id}/messages/`).then(r=>{ setMsgs(r.data.results||r.data); setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),60); });
  },[active]);
  useEffect(()=>{
    if(!search.trim()){ setMembers([]); return; }
    api.get('/auth/members/',{params:{search}}).then(r=>setMembers((r.data.results||r.data).filter(m=>m.id!==user?.id).slice(0,6)));
  },[search,user]);

  const openChat = async(uid)=>{ const r=await api.post('/chat/start/',{user_id:uid}); setActive(r.data); setSearch(''); setMembers([]); fetchConvs(); };
  const send = async()=>{ if(!input.trim()||!active) return; const t=input; setInput(''); await api.post(`/chat/${active.id}/messages/`,{content:t}); const r=await api.get(`/chat/${active.id}/messages/`); setMsgs(r.data.results||r.data); setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),60); fetchConvs(); };

  return (
    <div className="anim-fade-down nav-dropdown" style={{ ...DROP_STYLE, maxHeight: active ? 560 : 520 }}>
      <DropHeader title={active ? (active.other_user?.first_name||active.other_user?.username||'Chat') : 'Chats'} onClose={onClose} onBack={active?()=>setActive(null):null}/>
      {!active ? (
        <div style={{ display:'flex',flexDirection:'column',flex:1,overflow:'hidden' }}>
          {/* Search */}
          <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--line)',flexShrink:0 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--txt-3)',pointerEvents:'none',display:'flex' }}><Ico name="search" size={14}/></span>
              <input placeholder="Buscar usuarios..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:'100%',background:'var(--bg-3)',border:'1px solid var(--line)',borderRadius:20,padding:'7px 12px 7px 30px',color:'var(--txt-1)',fontSize:13,outline:'none',transition:'border-color var(--t-fast)',boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--gold)'} onBlur={e=>e.target.style.borderColor='var(--line)'} />
            </div>
            {members.length>0&&(
              <div style={{ marginTop:6 }}>
                {members.map(m=>(
                  <div key={m.id} onClick={()=>openChat(m.id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 4px',borderRadius:'var(--r2)',cursor:'pointer',transition:'background var(--t-fast)' }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <MiniAvatar user={m} size={30}/>
                    <div><div style={{ fontSize:13,fontWeight:600 }}>{m.first_name||m.username}</div><div style={{ fontSize:11,color:'var(--txt-3)' }}>@{m.username}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Conversations */}
          <div style={{ overflowY:'auto',flex:1 }}>
            {loading?<Loader/>:convs.length===0?<Empty icon="chat" text="Busca un usuario para chatear"/>:
              convs.map(c=>(
                <div key={c.id} onClick={()=>setActive(c)} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--line)',transition:'background var(--t-fast)' }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <div style={{ position:'relative',flexShrink:0 }}>
                    <MiniAvatar user={c.other_user} size={40}/>
                    {c.unread_count>0&&<span style={{ position:'absolute',top:-2,right:-2,width:16,height:16,background:'var(--gold)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#000',border:'2px solid var(--bg-2)' }}>{c.unread_count}</span>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:2 }}>
                      <span style={{ fontSize:13,fontWeight:700,color:'var(--txt-1)' }}>{c.other_user?.first_name||c.other_user?.username}</span>
                      {c.last_message&&<span style={{ fontSize:11,color:'var(--txt-4)',flexShrink:0,marginLeft:8 }}>{timeAgo(c.last_message.created_at)}</span>}
                    </div>
                    <p style={{ fontSize:12,color:'var(--txt-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.last_message?.content||'Sin mensajes'}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      ):(
        <div style={{ display:'flex',flexDirection:'column',flex:1,overflow:'hidden' }}>
          <div style={{ flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:8 }}>
            {msgs.map((msg,i)=>{ const mine=msg.sender?.id===user?.id; return (
              <div key={msg.id} style={{ display:'flex',justifyContent:mine?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'78%',padding:'8px 13px',borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px',background:mine?'var(--gold)':'var(--bg-3)',color:mine?'#000':'var(--txt-1)',fontSize:13,lineHeight:1.5 }}>
                  <p>{msg.content}</p>
                  <p style={{ fontSize:10,marginTop:3,opacity:.6,textAlign:'right' }}>{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            );})}
            <div ref={endRef}/>
          </div>
          <div style={{ padding:'10px 12px',borderTop:'1px solid var(--line)',display:'flex',gap:8,flexShrink:0 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Escribe un mensaje..."
              style={{ flex:1,background:'var(--bg-3)',border:'1px solid var(--line)',borderRadius:20,padding:'8px 14px',color:'var(--txt-1)',fontSize:13,outline:'none',transition:'border-color var(--t-fast)' }}
              onFocus={e=>e.target.style.borderColor='var(--gold)'} onBlur={e=>e.target.style.borderColor='var(--line)'} />
            <button onClick={send} disabled={!input.trim()} style={{ width:34,height:34,borderRadius:'50%',background:input.trim()?'var(--gold)':'var(--bg-3)',border:'none',cursor:input.trim()?'pointer':'default',color:input.trim()?'#000':'var(--txt-4)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all var(--t1)',flexShrink:0 }}><Ico name="arrowUp" size={15}/></button>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{ padding:'40px 0',textAlign:'center',color:'var(--txt-3)',fontSize:13 }}>Cargando...</div>; }
function Empty({ icon, text }) { return <div style={{ padding:'60px 20px',textAlign:'center',color:'var(--txt-3)' }}><div style={{ display:'flex',justifyContent:'center',marginBottom:10,opacity:.4 }}><Ico name={icon} size={36}/></div><p style={{ fontSize:13 }}>{text}</p></div>; }

/* ── Storage Panel ─── */
function StoragePanel({ onClose, anchorRect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/classroom/storage/').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const barColor = data
    ? data.disk_used_pct >= 90 ? 'var(--red)'
      : data.disk_used_pct >= 70 ? '#f97316'
      : 'var(--green)'
    : 'var(--green)';

  const panel = (
    <div data-storage-panel className="anim-fade-down" style={{
      ...DROP_STYLE,
      width:'min(360px, calc(100vw - 24px))',
      position:'fixed',
      top: anchorRect ? anchorRect.bottom + 10 : 60,
      left: anchorRect ? Math.max(12, anchorRect.left) : 12,
      right:'auto',
    }}>
      <DropHeader title="Almacenamiento" onClose={onClose}/>
      <div style={{ overflowY:'auto',flex:1 }}>
        {loading ? <Loader /> : !data ? (
          <div style={{ padding:'40px 20px',textAlign:'center',color:'var(--txt-3)',fontSize:13 }}>Error al cargar datos.</div>
        ) : (
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--txt-1)' }}>Disco</span>
                <span style={{ fontSize:13, fontWeight:700, color:barColor }}>{data.disk_used_pct}% usado</span>
              </div>
              <div style={{ height:7, background:'var(--bg-4)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${data.disk_used_pct}%`, background:barColor, borderRadius:4, transition:'width .6s ease' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:12, color:'var(--txt-3)' }}>
                <span>Usado: {data.disk_used_display}</span>
                <span>Libre: {data.disk_free_display}</span>
              </div>
            </div>
            <div style={{ background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:'var(--r2)', overflow:'hidden' }}>
              {[['Total del disco',data.disk_total_display],['Espacio usado',data.disk_used_display],['Espacio libre',data.disk_free_display]].map(([l,v],i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:i<2?'1px solid var(--line)':'none' }}>
                  <span style={{ fontSize:13, color:'var(--txt-2)' }}>{l}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--txt-1)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:'var(--r2)', padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, color:'var(--txt-2)' }}>Carpeta de medios</span>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--gold)' }}>{data.media_size_display}</span>
              </div>
              <p style={{ fontSize:11, color:'var(--txt-4)', fontFamily:'monospace', wordBreak:'break-all', lineHeight:1.4 }}>{data.media_root}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

/* ── Support Panel ─── */
function SupportPanel({ onClose, anchorRect }) {
  const panel = (
    <div data-support-panel className="anim-fade-down" style={{
      ...DROP_STYLE,
      width:'min(320px, calc(100vw - 24px))',
      position:'fixed',
      top: anchorRect ? anchorRect.bottom + 10 : 60,
      left: anchorRect ? Math.max(12, anchorRect.left) : 12,
      right:'auto',
    }}>
      <DropHeader title="Soporte" onClose={onClose}/>
      <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:14 }}>
        <p style={{ fontSize:13, color:'var(--txt-2)', lineHeight:1.6, margin:0 }}>
          ¿Tienes alguna duda o problema? Ponte en contacto con nosotros y te ayudamos.
        </p>
        <a href="mailto:info@thehackerslabs.com" style={{
          display:'flex', alignItems:'center', gap:9,
          background:'var(--bg-3)', border:'1px solid var(--line)', borderRadius:'var(--r2)',
          padding:'11px 14px', fontSize:13, fontWeight:700, color:'var(--gold)',
          textDecoration:'none', transition:`all var(--t1)`,
        }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; }}
        >
          <Ico name="chat" size={15}/> info@thehackerslabs.com
        </a>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

/* ── Main Navbar ─── */
export default function Navbar({ onMenuClick = () => {} }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unN,setUnN]=useState(0); const [unC,setUnC]=useState(0);
  const [panel,setPanel]=useState(null);
  const menuRef=useRef(null);
  const storageBtnRef=useRef(null);
  const [storageAnchor,setStorageAnchor]=useState(null);
  const supportBtnRef=useRef(null);
  const [supportAnchor,setSupportAnchor]=useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const fetchCounts=useCallback(()=>{
    api.get('/notifications/unread/').then(r=>setUnN(r.data.unread)).catch(()=>{});
    api.get('/chat/unread/').then(r=>setUnC(r.data.unread)).catch(()=>{});
  },[]);
  useEffect(()=>{ fetchCounts(); const id=setInterval(fetchCounts,30000); return()=>clearInterval(id); },[fetchCounts]);
  useEffect(()=>{
    const h=e=>{
      if(menuRef.current&&menuRef.current.contains(e.target)) return;
      if(storageBtnRef.current&&storageBtnRef.current.contains(e.target)) return;
      if(e.target.closest('[data-storage-panel]')) return;
      if(supportBtnRef.current&&supportBtnRef.current.contains(e.target)) return;
      if(e.target.closest('[data-support-panel]')) return;
      setPanel(null);
    };
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h);
  },[panel]);

  const toggle=(name)=>setPanel(p=>p===name?null:name);
  const close=()=>{ setPanel(null); fetchCounts(); };
  const handleLogout=async()=>{ await logout(); navigate('/login'); };

  const siteName = useSiteStore(s => s.siteName);
  const bannerImage = useSiteStore(s => s.bannerImage);
  const initial = (siteName || 'S')[0].toUpperCase();

  return (
    <>
      <header style={{ position:'sticky',top:0,zIndex:100,background:'var(--navbar-bg)',backdropFilter:'blur(24px) saturate(1.4)',borderBottom:`1px solid var(--line)` }}>

        {/* ── Top row ────────────────────────────────────────── */}
        <div style={{ maxWidth:1280,margin:'0 auto',padding:'0 20px',display:'flex',alignItems:'center',height:52,gap:16 }}>

          {/* Logo */}
          <Link to="/community" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none',flexShrink:0 }}>
            {bannerImage
              ? <img src={bannerImage} alt="logo" style={{ width:36,height:36,borderRadius:8,objectFit:'contain' }} />
              : <img src="/logo.png" alt="logo" style={{ width:36,height:36,objectFit:'contain' }} />
            }
            <SiteBrand style={{ fontWeight:800,fontSize:15,letterSpacing:'-0.3px',color:'var(--txt-1)',whiteSpace:'nowrap' }} />
          </Link>

          {/* Search — centered, takes available space */}
          <div className="nav-search" style={{ flex:1,maxWidth:560,margin:'0 auto',position:'relative' }}>
            <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--txt-3)',pointerEvents:'none',display:'flex' }}>
              <Ico name="search" size={15}/>
            </span>
            <input placeholder="Buscar..."
              style={{ width:'100%',background:'var(--bg-3)',border:`1px solid var(--line)`,borderRadius:24,padding:'8px 18px 8px 38px',color:'var(--txt-1)',fontSize:13,outline:'none',transition:`all var(--t-mid) var(--ease)`,boxSizing:'border-box' }}
              onFocus={e=>{ e.target.style.borderColor='var(--gold)'; e.target.style.boxShadow='0 0 0 3px rgba(245,166,35,0.10)'; }}
              onBlur={e=>{ e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none'; }} />
          </div>

          {/* Right actions */}
          <div ref={menuRef} style={{ display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
            <NavIcon onClick={toggleTheme} title={theme==='dark'?'Modo claro':'Modo oscuro'}>
              <Ico name={theme==='dark'?'sun':'moon'} size={17}/>
            </NavIcon>
            <div style={{ position:'relative' }}>
              <NavIcon active={panel==='chat'} badge={unC} onClick={()=>toggle('chat')} title="Mensajes">
                <Ico name="chat" size={17}/>
              </NavIcon>
              {panel==='chat'&&<ChatPanel onClose={close}/>}
            </div>
            <div style={{ position:'relative' }}>
              <NavIcon active={panel==='notifications'} badge={unN} onClick={()=>toggle('notifications')} title="Notificaciones">
                <Ico name="bell" size={17}/>
              </NavIcon>
              {panel==='notifications'&&<NotificationsPanel onClose={close}/>}
            </div>

            {/* Avatar + dropdown */}
            <div style={{ position:'relative',marginLeft:4 }}>
              <button onClick={()=>toggle('user')} style={{ background:panel==='user'?'var(--bg-3)':'none',border:`1px solid ${panel==='user'?'var(--line-2)':'transparent'}`,borderRadius:'50%',padding:2,cursor:'pointer',transition:`all var(--t-fast)`,display:'flex' }}>
                <MiniAvatar user={user} size={32}/>
              </button>
              {panel==='user'&&(
                <div className="anim-fade-down nav-dropdown" style={{ position:'absolute',right:0,top:'calc(100% + 8px)',background:'var(--bg-2)',border:`1px solid var(--line-2)`,borderRadius:'var(--r4)',padding:6,minWidth:220,boxShadow:'var(--shadow-3)',zIndex:300 }}>
                  <div style={{ padding:'12px 14px 14px',borderBottom:`1px solid var(--line)`,marginBottom:4 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                      <MiniAvatar user={user} size={40}/>
                      <div><div style={{ fontSize:14,fontWeight:700 }}>{user?.first_name} {user?.last_name}</div><div style={{ fontSize:11,color:'var(--txt-3)' }}>@{user?.username}</div></div>
                    </div>
                    <div style={{ display:'flex',gap:6 }}>
                      <span style={{ fontSize:11,padding:'3px 9px',borderRadius:20,background:'var(--gold-dim)',color:'var(--gold)',fontWeight:700,border:'1px solid rgba(245,166,35,0.2)' }}>Nv.{user?.level}</span>
                      <span style={{ fontSize:11,padding:'3px 9px',borderRadius:20,background:'var(--bg-3)',color:'var(--txt-2)' }}>{user?.points?.toLocaleString()} pts</span>
                    </div>
                  </div>
                  {[{icon:'person',l:'Mi Perfil',t:'/profile'},{icon:'cog',l:'Configuración',t:'/profile/settings'}].map(i=>(
                    <Link key={i.t} to={i.t} onClick={()=>setPanel(null)} style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 14px',borderRadius:'var(--r2)',fontSize:13,color:'var(--txt-2)',transition:`all var(--t1)` }} onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-3)'; e.currentTarget.style.color='var(--txt-1)'; }} onMouseLeave={e=>{ e.currentTarget.style.background=''; e.currentTarget.style.color=''; }}><Ico name={i.icon} size={15}/>{i.l}</Link>
                  ))}
                  <div style={{ height:1,background:'var(--line)',margin:'4px 0' }}/>
                  <button onClick={handleLogout} style={{ display:'flex',alignItems:'center',gap:9,width:'100%',textAlign:'left',padding:'8px 14px',borderRadius:'var(--r2)',background:'none',border:'none',fontSize:13,color:'var(--red)',cursor:'pointer',transition:`background var(--t1)` }} onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.08)'} onMouseLeave={e=>e.currentTarget.style.background=''}><Ico name="logout" size={15}/>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nav tabs ───────────────────────────────────────── */}
        <div style={{ borderTop:`1px solid var(--line)` }}>
        <nav style={{ maxWidth:1280,margin:'0 auto',padding:'0 20px',display:'flex',alignItems:'center',gap:2,overflowX:'auto' }}>
          {NAV.map(({to,label,icon})=>(
            <NavLink key={to} to={to} style={({isActive})=>({
              display:'flex',alignItems:'center',gap:7,
              padding:'9px 14px',fontSize:13,fontWeight:isActive?600:500,
              color:isActive?'var(--txt-1)':'var(--txt-3)',
              borderBottom:`2px solid ${isActive?'var(--gold)':'transparent'}`,
              borderRadius:'var(--r2) var(--r2) 0 0',
              whiteSpace:'nowrap',textDecoration:'none',marginBottom:-1,
              transition:`color var(--t1) var(--ease),background var(--t1) var(--ease)`,flexShrink:0,
            })}
              onMouseEnter={e=>{ if(!e.currentTarget.getAttribute('aria-current')){ e.currentTarget.style.color='var(--txt-1)'; e.currentTarget.style.background='var(--bg-3)'; } }}
              onMouseLeave={e=>{ if(!e.currentTarget.getAttribute('aria-current')){ e.currentTarget.style.color=''; e.currentTarget.style.background=''; } }}
            ><Ico name={icon} size={15}/>{label}</NavLink>
          ))}

          {/* Laboratorios — enlace externo a labs.thehackerslabs.com */}
          <a href={LABS_URL} target="_blank" rel="noopener noreferrer" style={{
            display:'flex',alignItems:'center',gap:7,
            padding:'9px 14px',fontSize:13,fontWeight:500,
            color:'var(--txt-3)',
            borderBottom:'2px solid transparent',
            borderRadius:'var(--r2) var(--r2) 0 0',
            whiteSpace:'nowrap',textDecoration:'none',marginBottom:-1,
            transition:`color var(--t1) var(--ease),background var(--t1) var(--ease)`,flexShrink:0,
          }}
            onMouseEnter={e=>{ e.currentTarget.style.color='var(--gold)'; e.currentTarget.style.background='var(--gold-dim)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--txt-3)'; e.currentTarget.style.background=''; }}
          ><Ico name="terminal" size={15}/>Laboratorios<Ico name="external" size={11}/></a>

          <div style={{ position:'relative', flexShrink:0 }}>
            <button ref={supportBtnRef} onClick={()=>{ setSupportAnchor(supportBtnRef.current?.getBoundingClientRect()); toggle('support'); }} style={{
              display:'flex',alignItems:'center',gap:7,
              padding:'9px 14px',fontSize:13,fontWeight:panel==='support'?600:500,
              color:panel==='support'?'var(--txt-1)':'var(--txt-3)',
              borderBottom:`2px solid ${panel==='support'?'var(--gold)':'transparent'}`,
              borderRadius:'var(--r2) var(--r2) 0 0',
              whiteSpace:'nowrap',marginBottom:-1,background:panel==='support'?'var(--bg-3)':'none',
              border:'none',borderLeft:'none',borderRight:'none',borderTop:'none',
              borderBottomWidth:2,borderBottomStyle:'solid',
              borderBottomColor:panel==='support'?'var(--gold)':'transparent',
              cursor:'pointer',transition:`color var(--t1) var(--ease),background var(--t1) var(--ease)`,
            }}
              onMouseEnter={e=>{ e.currentTarget.style.color='var(--txt-1)'; e.currentTarget.style.background='var(--bg-3)'; }}
              onMouseLeave={e=>{ if(panel!=='support'){ e.currentTarget.style.color='var(--txt-3)'; e.currentTarget.style.background='none'; } }}
            ><Ico name="chat" size={15}/>Soporte</button>
            {panel==='support'&&<SupportPanel onClose={close} anchorRect={supportAnchor}/>}
          </div>
          {user?.role==='admin'&&(
            <NavLink to="/admin" style={({isActive})=>({
              display:'flex',alignItems:'center',gap:7,
              padding:'9px 14px',fontSize:13,fontWeight:isActive?700:500,
              color:isActive?'var(--red)':'var(--txt-3)',
              borderBottom:`2px solid ${isActive?'var(--red)':'transparent'}`,
              borderRadius:'var(--r2) var(--r2) 0 0',
              whiteSpace:'nowrap',textDecoration:'none',marginBottom:-1,
              transition:`color var(--t1) var(--ease),background var(--t1) var(--ease)`,flexShrink:0,
            })}
              onMouseEnter={e=>{ if(!e.currentTarget.getAttribute('aria-current')){ e.currentTarget.style.color='var(--red)'; e.currentTarget.style.background='rgba(248,113,113,0.08)'; } }}
              onMouseLeave={e=>{ if(!e.currentTarget.getAttribute('aria-current')){ e.currentTarget.style.color=''; e.currentTarget.style.background=''; } }}
            ><Ico name="shield" size={15}/>Admin</NavLink>
          )}
          {user?.role==='admin'&&(
            <div style={{ position:'relative', flexShrink:0 }}>
              <button ref={storageBtnRef} onClick={()=>{ setStorageAnchor(storageBtnRef.current?.getBoundingClientRect()); toggle('storage'); }} style={{
                display:'flex',alignItems:'center',gap:7,
                padding:'9px 14px',fontSize:13,fontWeight:panel==='storage'?600:500,
                color:panel==='storage'?'var(--txt-1)':'var(--txt-3)',
                borderRadius:'var(--r2) var(--r2) 0 0',
                whiteSpace:'nowrap',marginBottom:-1,background:panel==='storage'?'var(--bg-3)':'none',
                border:'none',borderLeft:'none',borderRight:'none',borderTop:'none',
                borderBottomWidth:2,borderBottomStyle:'solid',
                borderBottomColor:panel==='storage'?'var(--gold)':'transparent',
                cursor:'pointer',transition:`color var(--t1) var(--ease),background var(--t1) var(--ease)`,
              }}
                onMouseEnter={e=>{ e.currentTarget.style.color='var(--txt-1)'; e.currentTarget.style.background='var(--bg-3)'; }}
                onMouseLeave={e=>{ if(panel!=='storage'){ e.currentTarget.style.color='var(--txt-3)'; e.currentTarget.style.background='none'; } }}
              ><Ico name="chart" size={15}/>Almacenamiento</button>
              {panel==='storage'&&<StoragePanel onClose={close} anchorRect={storageAnchor}/>}
            </div>
          )}
        </nav>
        </div>

        {(panel==='chat'||panel==='notifications'||panel==='storage'||panel==='support')&&<div onClick={close} style={{ position:'fixed',inset:0,zIndex:399 }}/>}
      </header>
    </>
  );
}
