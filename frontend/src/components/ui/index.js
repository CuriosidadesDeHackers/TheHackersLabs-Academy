/* Shared primitive components used across all pages */
import React, { useState } from 'react';

/* ── Re-exports ─────────────────────────────── */
export { default as UserAvatar } from './UserAvatar';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as useHover } from '../../hooks/useHover';
export { default as useApi } from '../../hooks/useApi';
export { timeAgo, formatBytes, formatDate } from '../../utils/format';

/* ── Avatar ────────────────────────────────── */
export function Avatar({ user, size = 38, ring }) {
  const s = ((user?.first_name?.[0]||'')+(user?.last_name?.[0]||user?.username?.[0]||'')).toUpperCase()||'?';
  const pal = ['#f5a623','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#e879f9','#facc15','#38bdf8'];
  const bg  = pal[(user?.id||0)%pal.length];
  const base = { width:size,height:size,borderRadius:'50%',flexShrink:0,userSelect:'none',boxShadow:ring?`0 0 0 2px var(--bg-1),0 0 0 3.5px ${bg}`:undefined };
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" style={{ ...base,objectFit:'cover',display:'block' }}/>;
  return <div style={{ ...base,background:`linear-gradient(135deg,${bg},${bg}bb)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*.37,color:'#000' }}>{s}</div>;
}

/* ── Card ──────────────────────────────────── */
export function Card({ children, style, hover, onClick, accent, glass }) {
  const [h,setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>hover&&setH(false)}
      style={{
        background: glass?'rgba(36,36,42,0.8)':h?'var(--bg-3)':'var(--bg-2)',
        border:`1px solid ${h&&hover?'var(--line-2)':'var(--line)'}`,
        borderRadius:'var(--r4)',
        borderTop: accent?`2px solid var(--gold)`:undefined,
        boxShadow: h&&hover?'var(--s2)':'var(--s1)',
        transform: h&&hover?'translateY(-2px)':'none',
        cursor: onClick?'pointer':'default',
        transition:'all var(--t2) var(--ease)',
        backdropFilter: glass?'blur(12px)':undefined,
        ...style,
      }}
    >{children}</div>
  );
}

/* ── Btn ───────────────────────────────────── */
const VARIANTS = {
  primary:   { bg:'var(--gold)',   color:'#000',           border:'transparent',      hBg:'var(--gold-2)' },
  secondary: { bg:'var(--bg-3)',   color:'var(--txt-1)',   border:'var(--line-2)',     hBg:'var(--bg-4)' },
  ghost:     { bg:'transparent',   color:'var(--txt-2)',   border:'var(--line)',       hBg:'var(--bg-3)' },
  danger:    { bg:'rgba(248,113,113,0.1)', color:'var(--red)', border:'rgba(248,113,113,0.2)', hBg:'rgba(248,113,113,0.16)' },
  accent:    { bg:'var(--gold-dim)', color:'var(--gold)', border:'var(--gold-border)', hBg:'var(--gold-dim)' },
};
const SIZES = {
  xs:{ p:'3px 9px',  fs:11, r:'4px' },
  sm:{ p:'6px 13px', fs:13, r:'5px' },
  md:{ p:'9px 18px', fs:14, r:'6px' },
  lg:{ p:'11px 24px',fs:15, r:'7px' },
};

export function Btn({ children, variant='primary', size='md', style:sx, disabled, loading, full, ...p }) {
  const [h,setH] = useState(false);
  const v = VARIANTS[variant]||VARIANTS.primary;
  const s = SIZES[size]||SIZES.md;
  return (
    <button disabled={disabled||loading}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:s.p,fontSize:s.fs,fontWeight:variant==='primary'||variant==='accent'?700:600,borderRadius:s.r,border:`1px solid ${v.border}`,background:h&&!disabled?v.hBg:v.bg,color:v.color,cursor:disabled||loading?'not-allowed':'pointer',opacity:disabled||loading?.55:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all var(--t1) var(--ease)',transform:h&&!disabled&&!loading?'translateY(-1px)':'none',width:full?'100%':undefined,boxShadow:h&&variant==='primary'&&!disabled?'0 4px 14px var(--gold-border)':undefined,letterSpacing:'0.01em',whiteSpace:'nowrap',...sx }}
      {...p}
    >
      {loading?<span style={{ width:12,height:12,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }}/>:children}
    </button>
  );
}

/* ── Input ─────────────────────────────────── */
export function Input({ label, error, hint, icon, textarea, rows=4, style:sx, ...p }) {
  const [f,setF] = useState(false);
  const Tag = textarea?'textarea':'input';
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
      {label&&<label style={{ fontSize:11,fontWeight:700,color:f?'var(--gold)':'var(--txt-3)',letterSpacing:'0.06em',transition:'color var(--t1)' }}>{label}</label>}
      <div style={{ position:'relative' }}>
        {icon&&<span style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:f?'var(--gold)':'var(--txt-3)',fontSize:14,pointerEvents:'none',transition:'color var(--t1)' }}>{icon}</span>}
        <Tag rows={textarea?rows:undefined}
          style={{ width:'100%',background:'var(--bg-3)',border:`1.5px solid ${error?'var(--red)':f?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r2)',padding:icon?'10px 14px 10px 36px':'10px 14px',color:'var(--txt-1)',fontSize:14,outline:'none',boxShadow:f?`0 0 0 3px ${error?'rgba(248,113,113,0.1)':'var(--gold-dim)'}`:undefined,resize:textarea?'vertical':undefined,fontFamily:'inherit',lineHeight:1.6,transition:'all var(--t2) var(--ease)',...sx }}
          onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e)}}
          onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e)}}
          {...p}/>
      </div>
      {error&&<span style={{ fontSize:12,color:'var(--red)',display:'flex',alignItems:'center',gap:4 }}>⚠ {error}</span>}
      {hint&&!error&&<span style={{ fontSize:12,color:'var(--txt-3)' }}>{hint}</span>}
    </div>
  );
}

/* ── Badge ─────────────────────────────────── */
export function Badge({ children, color='var(--gold)', style:sx }) {
  return <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:color+'1a',color,border:`1px solid ${color}33`,letterSpacing:'0.04em',whiteSpace:'nowrap',...sx }}>{children}</span>;
}

/* ── Spinner ───────────────────────────────── */
export function Spinner({ fullscreen, size=32, label }) {
  const wrap = { display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,
    ...(fullscreen?{minHeight:'100vh',background:'var(--bg-0)'}:{padding:'60px 0'}) };
  return <div style={wrap}><div style={{ width:size,height:size,borderRadius:'50%',border:`2.5px solid var(--bg-4)`,borderTopColor:'var(--gold)',animation:'spin .75s linear infinite' }}/>{label&&<span style={{ fontSize:13,color:'var(--txt-3)' }}>{label}</span>}</div>;
}

/* ── Section header ─────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:22,fontWeight:800,letterSpacing:'-0.4px',color:'var(--txt-1)' }} className="a-up">{title}</h1>
        {subtitle&&<p style={{ color:'var(--txt-3)',fontSize:13,marginTop:4 }} className="a-up">{subtitle}</p>}
      </div>
      {action&&<div className="a-up">{action}</div>}
    </div>
  );
}

/* ── Empty state ────────────────────────────── */
export function Empty({ icon='📭', title, desc }) {
  return (
    <div style={{ textAlign:'center',padding:'70px 0',color:'var(--txt-3)' }} className="a-up">
      <div style={{ fontSize:44,marginBottom:14,animation:'float 3s ease-in-out infinite' }}>{icon}</div>
      {title&&<p style={{ fontSize:15,fontWeight:600,color:'var(--txt-2)',marginBottom:6 }}>{title}</p>}
      {desc&&<p style={{ fontSize:13 }}>{desc}</p>}
    </div>
  );
}

/* ── Skeleton row ───────────────────────────── */
export function SkeletonCard({ height=110 }) {
  return <div className="skeleton" style={{ height,marginBottom:10,width:'100%' }}/>;
}

/* ── Divider ─────────────────────────────────── */
export function Divider({ label }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:12,margin:'8px 0' }}>
      <div style={{ flex:1,height:1,background:'var(--line)' }}/>
      {label&&<span style={{ fontSize:11,color:'var(--txt-3)',fontWeight:600,letterSpacing:'0.06em' }}>{label}</span>}
      {label&&<div style={{ flex:1,height:1,background:'var(--line)' }}/>}
    </div>
  );
}
