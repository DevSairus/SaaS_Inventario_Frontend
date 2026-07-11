/**
 * PITBOX — Landing Page (SPA)
 * Ruta: /bienvenida (pública)
 *
 * Misma estructura y patrones que el landing de DOCUCORE:
 *   - SPA con navegación scroll-spy por secciones
 *   - Layout split 50/50 en Hero y secciones alternas
 *   - Carrusel de capturas del aplicativo (AppCarousel)
 *   - Sección de módulos con tabs
 *   - Stats inline con contadores animados
 *   - Modal de registro con validación de NIT → navega a /registro
 *
 * Font: Oswald (display, condensado tipo tablero de boxes) + IBM Plex Sans (cuerpo)
 * Paleta basada en el favicon existente de Pitbox (cronómetro negro/naranja).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────
   PALETA — basada en el favicon de Pitbox
───────────────────────────────────────── */
const C = {
  ink:      '#0D0D0D',
  inkD:     '#000000',
  graphite: '#17181C',
  graphite2:'#1F2024',
  accent:   '#CF3A0B',
  accentL:  '#F0572B',
  signal:   '#2FAE66',
  signalL:  '#3FCB7A',
  caution:  '#E3A63E',
  ai:       '#8B5CF6',
  aiL:      '#A78BFA',
  white:    '#FFFFFF',
  gray50:   '#F8FAFC',
  gray100:  '#F1F5F9',
  gray200:  '#E2E8F0',
  gray400:  '#94A3B8',
  gray500:  '#64748B',
  gray700:  '#334155',
  gray900:  '#0F172A',
};

/* ─────────────────────────────────────────
   ÍCONOS
───────────────────────────────────────── */
const Ico = ({ d, size = 20, color = 'currentColor', strokeWidth = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const icons = {
  stopwatch:   <><circle cx="12" cy="13" r="8"/><path d="M12 9v4M9 3h6M12 3v2"/></>,
  wrench:      <><path d="M14.7 6.3a4 4 0 10-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4z"/></>,
  invoice:     <><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h6M9 17h6M9 9h2"/></>,
  warehouse:   <><path d="M3 21V9l9-5 9 5v12"/><path d="M9 21v-8h6v8"/></>,
  transfer:    <><path d="M7 3l4 4-4 4M11 7H3"/><path d="M17 21l-4-4 4-4M13 17h8"/></>,
  bell:        <><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></>,
  chart:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  whatsapp:    <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></>,
  scan:        <><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></>,
  check:       <><polyline points="20 6 9 17 4 12"/></>,
  arrow:       <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  arrowRight:  <><polyline points="9 18 15 12 9 6"/></>,
  arrowLeft:   <><polyline points="15 18 9 12 15 6"/></>,
  users:       <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  building:    <><rect x="2" y="2" width="20" height="20" rx="1"/><path d="M8 6h2M14 6h2M8 10h2M14 10h2M8 14h2M14 14h2M10 18v4M14 18v4"/></>,
  car:         <><path d="M5 17h14M5 17a2 2 0 002 2h0a2 2 0 002-2M5 17V11l2-5h10l2 5v6M17 17a2 2 0 002 2h0a2 2 0 002-2M5 11h14"/></>,
  package:     <><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></>,
  menu:        <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  close:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  mail:        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  search:      <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  sparkle:     <><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/><path d="M19 3.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/><path d="M5 15.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L3 17.5l1.5-.5z"/></>,
  bank:        <><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M2 10l10-6 10 6z"/></>,
  book:        <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 8h8M9 12h6"/></>,
  bot:         <><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.4"/><circle cx="15" cy="14" r="1.4"/><path d="M8 18h8"/></>,
};

/* ─────────────────────────────────────────
   HOOKS
───────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useCounter(target, duration = 1600, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return val;
}

/* ─────────────────────────────────────────
   CAPTURAS DEL APLICATIVO (SVG mock screens)
   En producción: reemplazar con <img src="..."> reales
───────────────────────────────────────── */
function ScreenDashboard() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114" />
      <rect width="160" height="340" fill="#0A0A0C" />
      <rect x="16" y="20" width="128" height="32" rx="6" fill="#26170F" />
      <text x="80" y="41" fill={C.accentL} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">PITBOX</text>
      {[['Dashboard',52,true],['Inventario',84,false],['Taller',116,false],['Ventas',148,false],['Compras',180,false],['Alertas',212,false],['Reportes',244,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act ? C.accent : 'transparent'} />
          <text x="28" y={y+17} fill={act ? '#fff' : '#7A7C82'} fontSize="11" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <rect x="168" y="0" width="392" height="48" fill="#101114" />
      <text x="180" y="28" fill="#8B8D94" fontSize="11" fontFamily="system-ui">Inicio / Dashboard</text>
      <text x="180" y="44" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Panel de control</text>
      {[[180,56,'Stock crítico','07',C.caution],[290,56,'Ventas hoy','142',C.signalL],[400,56,'OT abiertas','19',C.accentL],[510,56,'Facturas DIAN','128',C.signalL]].map(([x,y,lbl,val,col],i)=>(
        <g key={i}>
          <rect x={x-2} y={y} width="98" height="62" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
          <text x={x+8} y={y+16} fill="#7A7C82" fontSize="8" fontFamily="system-ui">{lbl}</text>
          <text x={x+8} y={y+36} fill={col} fontSize="18" fontWeight="700" fontFamily="system-ui">{val}</text>
        </g>
      ))}
      <rect x="180" y="130" width="240" height="120" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="194" y="148" fill="#8B8D94" fontSize="10" fontWeight="600" fontFamily="system-ui">Ventas — últimos 30 días</text>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const h = [40,55,35,70,60,80,50,90,65,75,85,72][i];
        return <rect key={i} x={194+i*18} y={230-h} width="12" height={h} rx="2" fill={i===11?C.accentL:`${C.accentL}55`} />;
      })}
      <rect x="180" y="264" width="360" height="64" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="194" y="280" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">PRODUCTO</text>
      <text x="334" y="280" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">BODEGA</text>
      <text x="444" y="280" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">ESTADO</text>
      {[['Filtro de aceite FA-220','Principal','Disponible',C.signal],['Pastillas de freno PF-88','Sucursal Sur','Stock bajo',C.caution]].map(([n,s,e,c],i)=>(
        <g key={i}>
          <text x="194" y={296+i*16} fill="#CBD5E1" fontSize="9" fontFamily="system-ui">{n}</text>
          <text x="334" y={296+i*16} fill="#8B8D94" fontSize="9" fontFamily="system-ui">{s}</text>
          <rect x="440" y={287+i*16} width="60" height="14" rx="7" fill={c+'22'}/>
          <text x="470" y={297+i*16} fill={c} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="system-ui">{e}</text>
        </g>
      ))}
      <rect x="432" y="130" width="108" height="120" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="444" y="148" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">ACTIVIDAD RECIENTE</text>
      {[['OT-0452 en proceso','2m'],['Factura DIAN emitida','8m'],['Transferencia recibida','1h'],['Alerta de stock','2h']].map(([msg,t],i)=>(
        <g key={i}>
          <circle cx="448" cy={163+i*24} r="3" fill={C.accentL}/>
          <text x="458" y={166+i*24} fill="#8B8D94" fontSize="8" fontFamily="system-ui">{msg}</text>
          <text x="534" y={166+i*24} fill="#5C5E64" fontSize="7" textAnchor="end" fontFamily="system-ui">{t}</text>
        </g>
      ))}
    </svg>
  );
}

function ScreenTaller() {
  const rows = [
    ['OT-0448','Mazda 3 · ABC123','Juan Pérez','Entregado',C.signal],
    ['OT-0449','NKS 125 · XYZ88','Carlos Ruiz','Listo',C.signalL],
    ['OT-0450','Renault Logan · JKL45','Ana Torres','En proceso',C.accentL],
    ['OT-0451','Chevrolet Spark · MN098','Luis Gómez','En proceso',C.accentL],
    ['OT-0452','Kia Picanto · QWE21','María Díaz','En espera',C.caution],
  ];
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Dashboard',52,false],['Taller',84,true],['Vehículos',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.accent:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="11" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Órdenes de trabajo</text>
      {[[180,40,'Abiertas','12',C.accentL],[272,40,'En espera','3',C.caution],[364,40,'Listas hoy','5',C.signalL],[456,40,'Entregadas hoy','8',C.signal]].map(([x,y,l,v,c])=>(
        <g key={l}>
          <rect x={x} y={y} width="84" height="50" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
          <text x={x+10} y={y+16} fill="#7A7C82" fontSize="8" fontFamily="system-ui">{l}</text>
          <text x={x+10} y={y+38} fill={c} fontSize="22" fontWeight="700" fontFamily="system-ui">{v}</text>
        </g>
      ))}
      <rect x="180" y="100" width="360" height="22" fill="#0A0A0C"/>
      {['OT','VEHÍCULO','CLIENTE','ESTADO'].map((h,i)=>(
        <text key={h} x={[188,238,368,470][i]} y="115" fill="#5C5E64" fontSize="8" fontWeight="700" fontFamily="system-ui">{h}</text>
      ))}
      {rows.map(([r,veh,cli,e,c],i)=>(
        <g key={i}>
          <rect x="180" y={122+i*27} width="360" height="26" rx="3" fill={i%2?'#161719':'#101114'}/>
          <text x="188" y={139+i*27} fill={C.accentL} fontSize="9" fontFamily="system-ui">{r}</text>
          <text x="238" y={139+i*27} fill="#8B8D94" fontSize="9" fontFamily="system-ui">{veh}</text>
          <text x="368" y={139+i*27} fill="#5C5E64" fontSize="9" fontFamily="system-ui">{cli}</text>
          <rect x="460" y={130+i*27} width="66" height="13" rx="6" fill={c+'22'}/>
          <text x="493" y={140+i*27} fill={c} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="system-ui">{e}</text>
        </g>
      ))}
    </svg>
  );
}

function ScreenInventario() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Dashboard',52,false],['Inventario',84,true],['Transferencias',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.accent:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="11" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Inventario multi-bodega</text>
      <rect x="180" y="42" width="360" height="26" rx="6" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="192" y="59" fill="#5C5E64" fontSize="10" fontFamily="system-ui">Buscar por SKU o nombre...</text>
      <rect x="180" y="82" width="360" height="22" fill="#0A0A0C"/>
      {['SKU','PRODUCTO','PRINCIPAL','SUCURSAL SUR'].map((h,i)=>(
        <text key={h} x={[188,238,398,470][i]} y="97" fill="#5C5E64" fontSize="8" fontWeight="700" fontFamily="system-ui">{h}</text>
      ))}
      {[
        ['FA-220','Filtro de aceite',34,12,C.signal],
        ['PF-88','Pastillas de freno',6,2,C.caution],
        ['BJ-14','Batería 12V 45A',9,5,C.signal],
        ['LL-500','Llanta 195/65 R15',18,10,C.signal],
        ['CR-77','Correa de distribución',3,0,C.accent],
        ['BU-09','Bujía NGK',52,30,C.signal],
      ].map(([sku,name,a,b,c],i)=>(
        <g key={i}>
          <rect x="180" y={104+i*24} width="360" height="23" rx="3" fill={i%2?'#161719':'#101114'}/>
          <text x="188" y={120+i*24} fill={C.accentL} fontSize="9" fontFamily="system-ui">{sku}</text>
          <text x="238" y={120+i*24} fill="#CBD5E1" fontSize="9" fontFamily="system-ui">{name}</text>
          <text x="398" y={120+i*24} fill={a<8?C.caution:'#8B8D94'} fontSize="9" fontFamily="system-ui">{a} und</text>
          <text x="470" y={120+i*24} fill={b<5?C.caution:'#8B8D94'} fontSize="9" fontFamily="system-ui">{b} und</text>
        </g>
      ))}
    </svg>
  );
}

function ScreenFacturacion() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Ventas',52,false],['Facturación DIAN',84,true],['Clientes',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.accent:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="10.5" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Facturación electrónica</text>
      {[[180,40,'Emitidas hoy','128',C.signalL],[302,40,'Aceptadas DIAN','126',C.signal],[424,40,'Con novedad','2',C.caution]].map(([x,y,l,v,c])=>(
        <g key={l}>
          <rect x={x} y={y} width="116" height="50" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
          <text x={x+10} y={y+16} fill="#7A7C82" fontSize="8" fontFamily="system-ui">{l}</text>
          <text x={x+10} y={y+38} fill={c} fontSize="22" fontWeight="700" fontFamily="system-ui">{v}</text>
        </g>
      ))}
      <rect x="180" y="100" width="360" height="22" fill="#0A0A0C"/>
      {['FACTURA','CLIENTE','TOTAL','DIAN'].map((h,i)=>(
        <text key={h} x={[188,258,398,478][i]} y="115" fill="#5C5E64" fontSize="8" fontWeight="700" fontFamily="system-ui">{h}</text>
      ))}
      {[
        ['FES-1128','Taller Rápido S.A.S.','$284.500','Aceptada',C.signal],
        ['FES-1127','Ana María Ríos','$96.000','Aceptada',C.signal],
        ['FES-1126','Repuestos del Sur','$1.240.000','Aceptada',C.signal],
        ['FES-1125','Juan Camilo Rendón','$58.900','En validación',C.caution],
        ['FES-1124','Distribuidora Andina','$742.300','Aceptada',C.signal],
      ].map(([n,cli,total,e,c],i)=>(
        <g key={i}>
          <rect x="180" y={122+i*27} width="360" height="26" rx="3" fill={i%2?'#161719':'#101114'}/>
          <text x="188" y={139+i*27} fill={C.accentL} fontSize="9" fontFamily="system-ui">{n}</text>
          <text x="258" y={139+i*27} fill="#8B8D94" fontSize="9" fontFamily="system-ui">{cli}</text>
          <text x="398" y={139+i*27} fill="#CBD5E1" fontSize="9" fontFamily="system-ui">{total}</text>
          <rect x="478" y={130+i*27} width="70" height="13" rx="6" fill={c+'22'}/>
          <text x="513" y={140+i*27} fill={c} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="system-ui">{e}</text>
        </g>
      ))}
    </svg>
  );
}

function ScreenAlertas() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Dashboard',52,false],['Alertas de stock',84,true],['Reportes',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.accent:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="10.5" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Alertas de stock activas</text>
      <rect x="180" y="46" width="360" height="220" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      {[
        ['Correa de distribución CR-77','Principal','0 und','Agotado',C.accent],
        ['Pastillas de freno PF-88','Sucursal Sur','2 und','Crítico',C.caution],
        ['Batería 12V 45A','Principal','5 und','Bajo',C.caution],
        ['Filtro de aire FI-33','Sucursal Sur','4 und','Bajo',C.caution],
        ['Aceite 20W50 x1L','Principal','6 und','Bajo',C.caution],
      ].map(([n,bod,stk,e,c],i)=>(
        <g key={i}>
          <rect x="192" y={58+i*40} width="336" height="34" rx="6" fill="#101114"/>
          <circle cx="208" cy={75+i*40} r="4" fill={c}/>
          <text x="222" y={72+i*40} fill="#E5E3DC" fontSize="10" fontFamily="system-ui">{n}</text>
          <text x="222" y={85+i*40} fill="#5C5E64" fontSize="8" fontFamily="system-ui">{bod} · {stk}</text>
          <rect x="452" y={65+i*40} width="62" height="16" rx="8" fill={c+'22'}/>
          <text x="483" y={76+i*40} fill={c} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="system-ui">{e}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────
   CARRUSEL
───────────────────────────────────────── */
const SLIDES = [
  { id: 0, label: 'Panel de control', desc: 'Vista general de ventas, inventario, taller y facturación en tiempo real.', Screen: ScreenDashboard },
  { id: 1, label: 'Taller y OT', desc: 'Cada vehículo con su orden de trabajo, técnico asignado y estado actualizado al instante.', Screen: ScreenTaller },
  { id: 2, label: 'Inventario multi-bodega', desc: 'Existencias por bodega o sede, con búsqueda por SKU y alertas visuales de stock bajo.', Screen: ScreenInventario },
  { id: 3, label: 'Facturación DIAN', desc: 'Ventas facturadas electrónicamente con validación DIAN integrada, sin doble digitación.', Screen: ScreenFacturacion },
  { id: 4, label: 'Alertas de stock', desc: 'Notificaciones automáticas antes de que un producto se agote en cualquier bodega.', Screen: ScreenAlertas },
];

function AppCarousel() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  const goTo = useCallback((next, dir = 'right') => {
    if (next === current) return;
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setCurrent(next);
      setVisible(true);
      setAnimDir(null);
    }, 260);
  }, [current]);

  const prev = () => goTo((current - 1 + SLIDES.length) % SLIDES.length, 'left');
  const next = () => goTo((current + 1) % SLIDES.length, 'right');

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const slide = SLIDES[current];
  const Scr = slide.Screen;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(1.5rem,5vw,4rem)' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {SLIDES.map((s, i) => (
          <button key={i} onClick={() => { clearInterval(timerRef.current); goTo(i, i > current ? 'right' : 'left'); }}
            style={{
              padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${i === current ? C.accentL : 'rgba(255,255,255,0.15)'}`,
              background: i === current ? 'rgba(240,87,43,0.15)' : 'transparent',
              color: i === current ? C.accentL : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => { clearInterval(timerRef.current); prev(); }} style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico d={icons.arrowLeft} size={18} color={C.white} />
        </button>

        <div style={{ flex: 1, overflow: 'hidden', borderRadius: 16 }}>
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : `translateX(${animDir === 'right' ? '32px' : '-32px'})`,
            transition: 'opacity 0.26s ease, transform 0.26s ease',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            background: '#101114',
          }}>
            <Scr />
          </div>
        </div>

        <button onClick={() => { clearInterval(timerRef.current); next(); }} style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico d={icons.arrowRight} size={18} color={C.white} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          {slide.desc}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => { clearInterval(timerRef.current); goTo(i, i > current ? 'right' : 'left'); }} style={{
              width: i === current ? 24 : 8, height: 8, borderRadius: 4,
              background: i === current ? C.accentL : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'width 0.3s, background 0.3s',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   NAVBAR
───────────────────────────────────────── */
const NAV_SECTIONS = ['nexa', 'producto', 'modulos', 'sectores', 'contacto'];

function Logomark({ size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: C.ink, border: `2px solid ${C.accent}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ico d={icons.stopwatch} size={size * 0.5} color={C.accent} strokeWidth={2} />
    </div>
  );
}

function Navbar({ onCta }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const sections = NAV_SECTIONS.map(id => document.getElementById(id));
      const found = sections.find(el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top <= 100 && r.bottom > 100;
      });
      if (found) setActive(found.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'NEXA · IA', href: '#nexa' },
    { label: 'Producto', href: '#producto' },
    { label: 'Módulos', href: '#modulos' },
    { label: 'Sectores', href: '#sectores' },
    { label: 'Contacto', href: '#contacto' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(13,13,13,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'background 0.3s, border 0.3s',
      padding: '0 clamp(1.5rem, 5vw, 4rem)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="#inicio" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logomark />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Pitbox
          </span>
        </a>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="pb-nav-links">
          {navLinks.map(({ label, href }) => {
            const id = href.slice(1);
            return (
              <a key={label} href={href} style={{
                color: active === id ? C.accentL : 'rgba(255,255,255,0.72)',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                transition: 'color 0.2s', letterSpacing: '0.01em',
                borderBottom: active === id ? `2px solid ${C.accentL}` : '2px solid transparent',
                paddingBottom: 2,
              }}>{label}</a>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} className="pb-nav-ctas">
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
          <button onClick={onCta} style={{
            background: C.accent, color: C.white, border: 'none', borderRadius: 8,
            padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s, transform 0.15s',
            boxShadow: '0 4px 14px rgba(207,58,11,0.35)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accentL; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Solicitar demo →
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="pb-hamburger" style={{
          background: 'none', border: 'none', color: C.white, cursor: 'pointer', display: 'none',
        }}>
          <Ico d={open ? icons.close : icons.menu} size={24} color={C.white} />
        </button>
      </div>

      {open && (
        <div style={{ background: C.inkD, padding: '1rem 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {navLinks.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setOpen(false)} style={{
              display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: 15, padding: '10px 0',
              textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>{label}</a>
          ))}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setOpen(false); onCta(); }} style={{
              textAlign: 'center', padding: 12, borderRadius: 8,
              background: C.accent, color: C.white, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>Solicitar demo →</button>
            <Link to="/login" onClick={() => setOpen(false)} style={{
              textAlign: 'center', padding: 10, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14,
            }}>Iniciar sesión</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .pb-nav-links, .pb-nav-ctas { display: none !important; }
          .pb-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

/* ─────────────────────────────────────────
   HERO — split layout
───────────────────────────────────────── */
function Hero({ onCta }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  return (
    <section id="inicio" style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse 70% 60% at 65% 45%, rgba(207,58,11,0.14) 0%, transparent 70%), linear-gradient(160deg, ${C.inkD} 0%, #141416 55%, #17181C 100%)`,
      display: 'flex', alignItems: 'center',
      padding: '0 clamp(1.5rem, 5vw, 4rem)',
      paddingTop: 68,
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(${C.white} 1px, transparent 1px), linear-gradient(90deg, ${C.white} 1px, transparent 1px)`,
        backgroundSize: '48px 48px', pointerEvents: 'none',
      }} />
      {/* franja diagonal de "línea de boxes" */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, opacity: 0.9,
        backgroundImage: `repeating-linear-gradient(-45deg, ${C.accent} 0px, ${C.accent} 22px, ${C.inkD} 22px, ${C.inkD} 44px)`,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', alignItems: 'center', gap: 'clamp(2rem,6vw,6rem)', paddingTop: 'clamp(2rem,5vh,4rem)', paddingBottom: 'clamp(2rem,5vh,4rem)' }}>

        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(207,58,11,0.15)', border: '1px solid rgba(207,58,11,0.3)',
            borderRadius: 100, padding: '6px 14px', marginBottom: 28,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s, transform 0.5s',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accentL, animation: 'pbPulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: C.accentL, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Inventario · Taller · Contabilidad · IA NEXA
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(2.6rem, 5vw, 3.8rem)',
            fontWeight: 700, color: C.white, lineHeight: 1.08,
            letterSpacing: '-0.01em', marginBottom: 24, textTransform: 'uppercase',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.55s 0.1s, transform 0.55s 0.1s',
          }}>
            Tu operación,<br />
            <span style={{ color: C.accentL }}>a ritmo de pit stop</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.12rem)', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, maxWidth: 460, marginBottom: 36,
            fontFamily: "'IBM Plex Sans', sans-serif",
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.55s 0.2s, transform 0.55s 0.2s',
          }}>
            Pitbox controla inventario multi-bodega, ventas, compras, taller, tesorería y
            contabilidad desde un único panel — con NEXA, tu asistente de IA, proponiendo
            registros contables listos para aprobar con un clic.
          </p>

          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.55s 0.3s, transform 0.55s 0.3s',
          }}>
            <button onClick={onCta} style={{
              background: C.accent, color: C.white, border: 'none', borderRadius: 10,
              padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 32px rgba(207,58,11,0.38)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(207,58,11,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(207,58,11,0.38)'; }}
            >
              Solicitar demo <Ico d={icons.arrow} size={16} color="#fff" />
            </button>
          </div>

          <div style={{
            marginTop: 44, display: 'flex', gap: 28, flexWrap: 'wrap',
            opacity: mounted ? 1 : 0, transition: 'opacity 0.55s 0.45s',
          }}>
            {[
              { label: 'Multi-bodega y multi-sede', sub: 'Operación' },
              { label: 'Tesorería y contabilidad integradas', sub: 'Finanzas' },
              { label: 'Propone asientos y gastos', sub: 'NEXA · IA' },
            ].map(({ label, sub }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{sub}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s 0.25s, transform 0.7s 0.25s',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)', padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Ico d={icons.search} size={10} color="rgba(255,255,255,0.35)" /> pitbox.app/dashboard
              </div>
            </div>
            <ScreenDashboard />
            <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>3 bodegas activas · 19 OT abiertas</span>
              <div style={{ background: C.accent, borderRadius: 5, padding: '3px 8px', fontSize: 9, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pbPulse 2s infinite' }} />
                operando
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   STATS BAR con contadores
───────────────────────────────────────── */
function StatsBar() {
  const [ref, visible] = useInView();
  const d1 = useCounter(12, 1200, visible);
  const d2 = useCounter(100, 1500, visible);
  const d3 = useCounter(24, 1000, visible);

  return (
    <div ref={ref} style={{
      background: C.graphite,
      borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1.5rem,5vw,4rem)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-around', alignItems: 'center' }}>
        {[
          { val: `${d1}+`, label: 'Módulos integrados' },
          { val: `${d2}%`, label: 'Facturación electrónica DIAN' },
          { val: `< ${d3}h`, label: 'Tiempo de activación' },
          { val: 'NEXA', label: 'Asistente de IA para contabilidad y gastos' },
        ].map(({ val, label }, i) => (
          <div key={i} style={{
            textAlign: 'center',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 0.5s ${i*0.1}s, transform 0.5s ${i*0.1}s`,
          }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 'clamp(1.6rem,3.4vw,2.4rem)', fontWeight: 700, color: C.accentL, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>{val}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Mini visualizations */
function MiniTaller() {
  const steps = ['En espera', 'En proceso', 'Listo', 'Entregado'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= 2 ? C.accent : '#E2E8F0' }} />
        ))}
      </div>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: i <= 2 ? C.accent : '#E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {i <= 2 && <Ico d={icons.check} size={11} color="#fff" strokeWidth={2.5} />}
          </div>
          <span style={{ fontSize: 13, color: i <= 2 ? C.gray900 : C.gray400, fontWeight: i === 2 ? 700 : 500 }}>OT-0452 · {s}</span>
        </div>
      ))}
    </div>
  );
}

function MiniFacturacion({ accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
        background: `${accent}12`, border: `2px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico d={icons.invoice} size={44} color={accent} strokeWidth={1.4} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.gray900, marginBottom: 8 }}>FES-1128 emitida</div>
      {[
        ['Validación DIAN aceptada', accent],
        ['CUFE generado automáticamente', accent],
        ['Enviada al correo del cliente', '#64748B'],
      ].map(([txt, col], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: col }}>{txt}</span>
        </div>
      ))}
    </div>
  );
}

function MiniInventario({ accent }) {
  const items = [
    { label: 'Bodega Principal', val: 88, col: C.signal },
    { label: 'Sucursal Sur', val: 61, col: accent },
    { label: 'Sucursal Norte', val: 74, col: C.signal },
    { label: 'Referencias en alerta', val: 7, col: C.caution, isCount: true },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(({ label, val, col, isCount }, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.gray700 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{isCount ? val : `${val}%`}</span>
          </div>
          {!isCount && (
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${val}%`, background: col, borderRadius: 3, transition: 'width 1.2s ease' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniNexa({ accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: accent, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico d={icons.sparkle} size={13} color="#fff" strokeWidth={1.8} />
        </div>
        <div style={{
          background: C.white, border: `1px solid ${accent}30`, borderRadius: '4px 12px 12px 12px',
          padding: '10px 12px', fontSize: 12.5, color: C.gray700, lineHeight: 1.5, maxWidth: 240,
        }}>
          Detecté un pago de $340.000 a Repuestos del Sur. ¿Registro el gasto y el asiento contable?
        </div>
      </div>
      <div style={{
        marginLeft: 34, background: `${accent}0C`, border: `1px solid ${accent}25`,
        borderRadius: 12, padding: '10px 12px',
      }}>
        <div style={{ fontSize: 11, color: C.gray500, marginBottom: 8 }}>
          Gasto · Proveedores &nbsp;·&nbsp; <span style={{ fontWeight: 700, color: C.gray900 }}>$340.000</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7,
            background: accent, color: '#fff', fontSize: 11.5, fontWeight: 700,
          }}>Aprobar</div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7,
            border: `1px solid ${C.gray200}`, color: C.gray500, fontSize: 11.5, fontWeight: 600,
          }}>Rechazar</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: NEXA (banner de IA — destacado)
───────────────────────────────────────── */
function NexaBanner({ onCta }) {
  const [ref, visible] = useInView();
  const cards = [
    { icon: icons.bot, title: 'Detecta y propone', desc: 'Analiza ventas, compras y gastos, y arma la propuesta contable por ti.' },
    { icon: icons.check, title: 'Tú apruebas', desc: 'Cada propuesta espera tu visto bueno antes de contabilizarse.' },
    { icon: icons.book, title: 'Queda en el libro', desc: 'Al aprobar, el asiento contable se registra listo para postear.' },
  ];

  return (
    <section id="nexa" style={{
      position: 'relative', overflow: 'hidden',
      background: `radial-gradient(circle at 15% 20%, rgba(139,92,246,0.25), transparent 55%), radial-gradient(circle at 85% 80%, rgba(207,58,11,0.18), transparent 50%), ${C.inkD}`,
      padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)',
      borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div ref={ref} style={{
        maxWidth: 1100, margin: '0 auto', textAlign: 'center',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s, transform 0.6s',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
          borderRadius: 100, padding: '6px 16px', marginBottom: 24,
        }}>
          <Ico d={icons.sparkle} size={13} color={C.aiL} />
          <span style={{ fontSize: 12, color: C.aiL, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nuevo · Inteligencia artificial</span>
        </div>

        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 18, textTransform: 'uppercase',
        }}>
          Conoce a <span style={{ color: C.aiL }}>NEXA</span>, tu copiloto contable
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(1rem,2vw,1.15rem)',
          lineHeight: 1.7, maxWidth: 620, margin: '0 auto 48px',
        }}>
          NEXA es la inteligencia artificial de Pitbox: revisa tu operación, propone gastos,
          pagos y asientos contables, y solo ejecuta lo que tú apruebas. Tesorería y
          contabilidad al día, sin digitar cada movimiento a mano.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          gap: 20, marginBottom: 48, textAlign: 'left',
        }}>
          {cards.map(({ icon, title, desc }, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '24px 22px',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.5s ${0.1 + i * 0.1}s, transform 0.5s ${0.1 + i * 0.1}s`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Ico d={icon} size={20} color={C.aiL} strokeWidth={1.7} />
              </div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8, textTransform: 'uppercase' }}>{title}</h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        <button onClick={onCta} style={{
          background: C.ai, color: C.white, border: 'none', borderRadius: 10,
          padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(139,92,246,0.4)'; }}
        >
          Ver NEXA en acción <Ico d={icons.arrow} size={16} color="#fff" />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: PRODUCTO (features split)
───────────────────────────────────────── */
function ProductSection() {
  const features = [
    {
      icon: icons.wrench, accent: C.accentL,
      title: 'Taller que no pierde el hilo',
      desc: 'Cada vehículo entra con su orden de trabajo, técnico asignado y repuestos usados. El estado avanza de En espera a Entregado, visible para tu equipo y para el cliente en cada momento.',
      bullets: ['Vehículos y clientes vinculados', 'Comisiones calculadas por técnico', 'Reporte de productividad', 'Notificación automática al cliente'],
      side: 'right',
    },
    {
      icon: icons.invoice, accent: C.signal,
      title: 'Facturación electrónica sin fricción',
      desc: 'Cada venta se factura con validación DIAN integrada, sin exportar a otro sistema ni digitar dos veces. El CUFE y la aceptación quedan registrados junto a la venta.',
      bullets: ['Validación DIAN en el mismo flujo de venta', 'Envío automático al correo del cliente', 'Historial de eventos DIAN', 'Sin doble digitación'],
      side: 'left',
    },
    {
      icon: icons.warehouse, accent: C.caution,
      title: 'Inventario que se sincroniza solo',
      desc: 'Cada bodega o sede controla su propio stock, con transferencias trazables entre ellas y alertas automáticas antes de que un producto se agote.',
      bullets: ['Multi-bodega y multi-sede', 'Transferencias con trazabilidad', 'Alertas de stock configurables', 'Escaneo de código de barras'],
      side: 'right',
    },
    {
      icon: icons.sparkle, accent: C.ai,
      title: 'NEXA: contabilidad con inteligencia artificial',
      desc: 'NEXA observa tus ventas, compras y gastos, y propone el registro contable correspondiente. Tú solo apruebas o rechazas: nada se contabiliza sin tu decisión.',
      bullets: ['Propone gastos y pagos automáticamente', 'Genera asientos contables listos para postear', 'Aprobación de un clic', 'Trazabilidad completa de cada propuesta'],
      side: 'left',
    },
  ];

  return (
    <section id="producto" style={{ background: C.gray50, padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', background: '#FDECE4', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Por qué Pitbox</span>
          </div>
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, color: C.gray900,
            letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 16, textTransform: 'uppercase',
          }}>
            Todo lo que necesita tu operación.<br />Nada que no necesites.
          </h2>
          <p style={{ color: C.gray500, fontSize: 'clamp(1rem,2vw,1.1rem)', maxWidth: 560, margin: '0 auto' }}>
            Sin instalaciones complejas, sin sistemas sueltos entre sí. Una plataforma completa que puedes activar en menos de 24 horas.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4rem,8vw,7rem)' }}>
          {features.map(({ icon, accent, title, desc, bullets, side }, i) => {
            const [ref, visible] = useInView();
            const isRight = side === 'right';
            return (
              <div ref={ref} key={i} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
                gap: 'clamp(2rem,5vw,5rem)',
                alignItems: 'center',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.6s, transform 0.6s',
              }}>
                <div style={{ order: isRight ? 1 : 2 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, background: `${accent}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  }}>
                    <Ico d={icon} size={24} color={accent} strokeWidth={1.7} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 'clamp(1.3rem,2.6vw,1.8rem)', fontWeight: 700, color: C.gray900,
                    letterSpacing: '-0.01em', marginBottom: 16, textTransform: 'uppercase',
                  }}>{title}</h3>
                  <p style={{ fontSize: 15, color: C.gray500, lineHeight: 1.7, marginBottom: 24 }}>{desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bullets.map((b, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: `${accent}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Ico d={icons.check} size={11} color={accent} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 14, color: C.gray700 }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  order: isRight ? 2 : 1,
                  background: `linear-gradient(135deg, ${accent}08, ${accent}04)`,
                  border: `1px solid ${accent}20`,
                  borderRadius: 20, padding: 'clamp(1.5rem,3vw,3rem)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 220,
                }}>
                  <div style={{ width: '100%' }}>
                    {i === 0 && <MiniTaller />}
                    {i === 1 && <MiniFacturacion accent={accent} />}
                    {i === 2 && <MiniInventario accent={accent} />}
                    {i === 3 && <MiniNexa accent={accent} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: CARRUSEL DE CAPTURAS
───────────────────────────────────────── */
function AppShowcase() {
  const [ref, visible] = useInView();
  return (
    <section style={{
      background: `linear-gradient(160deg, ${C.inkD} 0%, #141416 100%)`,
      padding: 'clamp(4rem,8vw,7rem) 0',
    }}>
      <div ref={ref} style={{
        textAlign: 'center', marginBottom: 48,
        padding: '0 clamp(1.5rem,5vw,4rem)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s, transform 0.6s',
      }}>
        <div style={{ display: 'inline-block', background: 'rgba(240,87,43,0.12)', border: '1px solid rgba(240,87,43,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: C.accentL, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>El aplicativo en acción</span>
        </div>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 12, textTransform: 'uppercase',
        }}>
          Diseñado para quienes operan<br />todos los días, sin pausas
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, maxWidth: 540, margin: '0 auto' }}>
          Una interfaz clara y rápida para gestionar inventario, taller, ventas y facturación en un solo lugar.
        </p>
      </div>
      <AppCarousel />
    </section>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: MÓDULOS (tabs)
───────────────────────────────────────── */
function ModulesSection() {
  const [ref, visible] = useInView();
  const [active, setActive] = useState(0);

  const modules = [
    {
      name: 'Inventario',
      icon: icons.package, accent: C.accentL,
      desc: 'Productos, categorías y existencias sincronizadas en tiempo real, con escaneo de código de barras desde cámara o lector externo.',
      bullets: ['Escaneo de código de barras', 'Categorías y proveedores', 'Ajustes de inventario con soporte', 'Devoluciones a proveedor y de cliente'],
    },
    {
      name: 'Taller',
      icon: icons.wrench, accent: C.accentL,
      desc: 'Órdenes de trabajo con vehículos, técnicos y estado en tiempo real, desde el ingreso hasta la entrega al cliente.',
      bullets: ['Vehículos y ficha del cliente', 'Estados: espera, proceso, listo, entregado', 'Comisiones por técnico', 'Reporte de productividad'],
    },
    {
      name: 'Facturación DIAN',
      icon: icons.invoice, accent: C.signal,
      desc: 'Ventas con facturación electrónica y validación DIAN integradas en el mismo flujo, sin doble digitación.',
      bullets: ['CUFE y eventos DIAN en la venta', 'Cuentas por cobrar', 'Devoluciones de cliente', 'Envío automático al correo'],
    },
    {
      name: 'Tesorería',
      icon: icons.bank, accent: C.signal,
      desc: 'Cuentas por pagar, gastos operativos y flujo de caja al día, con apertura y cierre de cajas por sede.',
      bullets: ['Cuentas por pagar a proveedores', 'Gastos operativos por categoría', 'Flujo de caja en tiempo real', 'Cajas por sede con arqueo'],
    },
    {
      name: 'Contabilidad',
      icon: icons.book, accent: C.accentL,
      desc: 'Plan de cuentas, asientos y reportes financieros generados a partir de tu operación diaria, sin doble digitación.',
      bullets: ['Plan de cuentas configurable', 'Asientos contables automáticos', 'Mapeo de cuentas por tipo de operación', 'Balance y estado de resultados'],
    },
    {
      name: 'NEXA · IA',
      icon: icons.sparkle, accent: C.ai,
      desc: 'Tu asistente de inteligencia artificial: analiza tu operación y propone gastos, pagos y asientos contables listos para aprobar.',
      bullets: ['Propone gastos y pagos automáticamente', 'Regenera asientos contables por ti', 'Tú apruebas o rechazas cada acción', 'Nada se contabiliza sin tu visto bueno'],
    },
    {
      name: 'Alertas y reportes',
      icon: icons.bell, accent: C.caution,
      desc: 'Notificaciones automáticas de stock bajo y reportes de ventas, compras y productividad al día.',
      bullets: ['Alertas de stock configurables', 'Reportes de ventas y compras', 'Indicadores de comisiones', 'Exportación de datos'],
    },
    {
      name: 'WhatsApp',
      icon: icons.whatsapp, accent: C.signal,
      desc: 'Notificaciones automáticas a tus clientes sobre el estado de su orden de trabajo o su compra.',
      bullets: ['Aviso automático de OT lista', 'Confirmación de compra', 'Configuración por sede', 'Sin plantillas manuales'],
    },
  ];

  const mod = modules[active];

  return (
    <section id="modulos" style={{ background: C.gray50, padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)' }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: '#FDECE4', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Módulos</span>
          </div>
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.gray900,
            letterSpacing: '-0.01em', lineHeight: 1.15, textTransform: 'uppercase',
          }}>
            Un módulo para cada parte de tu operación
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
          {modules.map(({ name, icon }, i) => (
            <button key={name} onClick={() => setActive(i)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${active === i ? C.accent : C.gray200}`,
              background: active === i ? C.accent : C.white,
              color: active === i ? 'white' : C.gray500,
              transition: 'all 0.2s',
            }}>
              <Ico d={icon} size={15} color={active === i ? 'white' : C.gray500} />
              {name}
            </button>
          ))}
        </div>

        <div style={{
          background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 20,
          padding: 'clamp(2rem,4vw,3rem)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: 'clamp(2rem,4vw,3rem)', alignItems: 'center',
        }}>
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: `${mod.accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Ico d={mod.icon} size={26} color={mod.accent} strokeWidth={1.6} />
            </div>
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: C.gray900, marginBottom: 12, textTransform: 'uppercase' }}>
              {mod.name}
            </h3>
            <p style={{ fontSize: 15, color: C.gray500, lineHeight: 1.7, marginBottom: 24 }}>{mod.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mod.bullets.map((b, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: `${mod.accent}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ico d={icons.check} size={11} color={mod.accent} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 14, color: C.gray700 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.gray50, borderRadius: 12, padding: 24, border: `1px solid ${C.gray100}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>Además incluye</div>
            {['Roles y permisos por sede', 'Transferencias entre bodegas', 'Compras y cuentas por pagar', 'Panel de superadministrador', 'Consumos internos', 'Historial de auditoría'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gray400, marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.gray500, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: SECTORES
───────────────────────────────────────── */
function Sectors() {
  const [ref, visible] = useInView();
  const segs = [
    { icon: icons.car, title: 'Talleres mecánicos', desc: 'Vehículos, órdenes de trabajo, técnicos y comisiones en un solo panel.' },
    { icon: icons.package, title: 'Almacenes de repuestos', desc: 'Inventario por referencia con alertas de stock y escaneo de código de barras.' },
    { icon: icons.warehouse, title: 'Distribuidoras', desc: 'Multi-bodega con transferencias trazables entre sedes y control de compras.' },
    { icon: icons.building, title: 'Ferreterías y comercio', desc: 'Ventas, facturación electrónica y reportes al día para negocios de uno o varios puntos.' },
  ];

  return (
    <section id="sectores" style={{ background: C.white, padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(2rem,6vw,6rem)', alignItems: 'center' }}>
          <div ref={ref}>
            <div style={{ display: 'inline-block', background: '#FDECE4', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sectores</span>
            </div>
            <h2 style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 700, color: C.gray900,
              letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 16, textTransform: 'uppercase',
              opacity: visible ? 1 : 0, transition: 'opacity 0.5s',
            }}>
              Pensado para la operación colombiana
            </h2>
            <p style={{ color: C.gray500, fontSize: 15, lineHeight: 1.7, marginBottom: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.1s' }}>
              Cada negocio tiene su propio ritmo. Pitbox se adapta desde un solo punto de venta hasta una red de bodegas y sedes.
            </p>
            <button onClick={() => document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth' })} style={{
              background: C.ink, color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.02em',
              opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.2s',
            }}>
              Ver todos los módulos →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {segs.map(({ icon, title, desc }, i) => (
              <div key={i} style={{
                background: C.gray50, border: `1px solid ${C.gray100}`,
                borderRadius: 14, padding: '24px 20px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.5s ${i*0.1}s, transform 0.5s ${i*0.1}s`,
              }}>
                <div style={{ marginBottom: 14 }}>
                  <Ico d={icon} size={22} color={C.accent} strokeWidth={1.6} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.gray900, marginBottom: 8 }}>{title}</h4>
                <p style={{ fontSize: 13, color: C.gray500, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   CTA FINAL
───────────────────────────────────────── */
function FinalCta({ onCta }) {
  const [ref, visible] = useInView();
  return (
    <section style={{
      background: `linear-gradient(135deg, ${C.inkD} 0%, #141416 60%, #17181C 100%)`,
      padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)',
      textAlign: 'center',
    }}>
      <div ref={ref} style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 20, textTransform: 'uppercase',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s, transform 0.5s',
        }}>
          Pon tu operación en la línea de salida
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(1rem,2vw,1.1rem)',
          lineHeight: 1.7, marginBottom: 36,
          opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.15s',
        }}>
          Agenda una demo y te mostramos cómo Pitbox controla tu inventario, taller, tesorería y contabilidad — con NEXA proponiendo cada registro por ti.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.25s' }}>
          <button onClick={onCta} style={{
            background: C.accent, color: C.white, border: 'none', borderRadius: 12,
            padding: '16px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em',
            boxShadow: '0 8px 32px rgba(207,58,11,0.4)',
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Solicitar demo →
          </button>
        </div>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 'clamp(1rem,4vw,3rem)', flexWrap: 'wrap' }}>
          {['Sin instalaciones complejas', 'Activación multi-sede', 'Soporte en español'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Ico d={icons.check} size={14} color={C.signalL} strokeWidth={2.5} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FOOTER
───────────────────────────────────────── */
function Footer() {
  return (
    <footer id="contacto" style={{
      background: C.inkD, borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,5vw,4rem) 2rem',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem 6rem', marginBottom: 40 }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Logomark size={32} />
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, color: C.white, textTransform: 'uppercase' }}>Pitbox</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 280 }}>
              Plataforma de inventario, taller, tesorería, contabilidad y facturación electrónica para negocios colombianos, con NEXA como asistente de IA. Desarrollado por DataCore.
            </p>
            <a href="mailto:contacto@datacore.com.co" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 13, marginTop: 16, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = C.accentL}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
              <Ico d={icons.mail} size={14} color="currentColor" /> contacto@datacore.com.co
            </a>
          </div>
          {[
            { title: 'Producto', links: ['Funciones', 'NEXA · IA', 'Módulos', 'Sectores'] },
            { title: 'Empresa', links: ['Acerca de', 'Contacto', 'Iniciar sesión'] },
          ].map(({ title, links }) => (
            <div key={title} style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map(l => (
                  <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.white}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© {new Date().getFullYear()} DataCore. Todos los derechos reservados.</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Hecho en Colombia 🇨🇴</span>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────
   MODAL DE CONTACTO
   Flujo: llena datos → navega a /registro con prefill
───────────────────────────────────────── */
const MODAL_INPUT_BASE = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: `1.5px solid ${C.gray200}`, fontSize: 14, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'system-ui',
  color: C.gray900, background: C.white,
  transition: 'border-color 0.2s',
};

function ModalField({ label, required, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.gray700, display: 'block', marginBottom: 5, letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: C.accent, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.caution }}>{error}</p>}
    </div>
  );
}

function validateNIT(nit) {
  const clean = String(nit).replace(/[^0-9]/g, '');
  if (clean.length < 9) return false;
  const base = clean.slice(0, -1);
  const dv   = parseInt(clean.slice(-1), 10);
  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < base.length; i++)
    sum += parseInt(base[base.length - 1 - i], 10) * primes[i];
  const rem = sum % 11;
  return (rem > 1 ? 11 - rem : rem) === dv;
}

function OnboardingModal({ onClose }) {
  const [form, setForm] = useState({
    nombre: '', cargo: '', negocio: '', nit: '', email: '', telefono: '',
  });
  const [errors, setErrors] = useState({});

  function setField(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: '' }));
    };
  }

  function validate() {
    const errs = {};
    if (!form.nombre.trim())  errs.nombre  = 'Requerido';
    if (!form.negocio.trim()) errs.negocio = 'Requerido';
    if (!form.email.trim())   errs.email   = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                               errs.email   = 'Correo inválido';
    if (form.nit && !validateNIT(form.nit))
                               errs.nit     = 'NIT inválido — verifique el dígito de verificación';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const focusAccent = e => { e.target.style.borderColor = C.accent; };
  const blurBase    = e => { e.target.style.borderColor = C.gray200; };

  const linkRef = useRef(null);

  function handleContinue() {
    if (!validate()) return;
    linkRef.current?.click();
  }

  const prefill = {
    nombre:   form.nombre,
    cargo:    form.cargo,
    negocio:  form.negocio,
    nit:      form.nit,
    email:    form.email,
    telefono: form.telefono,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(13,13,13,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.white, borderRadius: 20,
        padding: 'clamp(1.5rem,4vw,2.5rem)',
        width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'pbModalIn 0.28s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logomark size={30} />
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, fontWeight: 700, color: C.gray900, textTransform: 'uppercase' }}>
              Pitbox
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Ico d={icons.close} size={20} color={C.gray400} />
          </button>
        </div>

        <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: C.gray900, marginBottom: 4, textTransform: 'uppercase' }}>
          Solicita tu demo
        </h3>
        <p style={{ fontSize: 13, color: C.gray500, marginBottom: 24, lineHeight: 1.6 }}>
          Cuéntanos sobre tu negocio y te contactamos para mostrarte Pitbox en acción.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="Nombre completo" required error={errors.nombre}>
              <input
                value={form.nombre}
                onChange={setField('nombre')}
                placeholder="Carlos Ramírez"
                style={{ ...MODAL_INPUT_BASE, borderColor: errors.nombre ? C.caution : C.gray200 }}
                onFocus={focusAccent}
                onBlur={blurBase}
              />
            </ModalField>
            <ModalField label="Cargo">
              <input
                value={form.cargo}
                onChange={setField('cargo')}
                placeholder="Administrador"
                style={MODAL_INPUT_BASE}
                onFocus={focusAccent}
                onBlur={blurBase}
              />
            </ModalField>
          </div>

          <ModalField label="Nombre del negocio" required error={errors.negocio}>
            <input
              value={form.negocio}
              onChange={setField('negocio')}
              placeholder="Taller El Motor S.A.S."
              style={{ ...MODAL_INPUT_BASE, borderColor: errors.negocio ? C.caution : C.gray200 }}
              onFocus={focusAccent}
              onBlur={blurBase}
            />
          </ModalField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ModalField label="NIT" error={errors.nit}>
              <input
                value={form.nit}
                onChange={setField('nit')}
                placeholder="900123456-7"
                style={{ ...MODAL_INPUT_BASE, borderColor: errors.nit ? C.caution : C.gray200 }}
                onFocus={focusAccent}
                onBlur={blurBase}
                maxLength={15}
              />
            </ModalField>
            <ModalField label="Teléfono / WhatsApp">
              <input
                value={form.telefono}
                onChange={setField('telefono')}
                placeholder="3001234567"
                style={MODAL_INPUT_BASE}
                onFocus={focusAccent}
                onBlur={blurBase}
              />
            </ModalField>
          </div>

          <ModalField label="Correo" required error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={setField('email')}
              placeholder="correo@tunegocio.com"
              style={{ ...MODAL_INPUT_BASE, borderColor: errors.email ? C.caution : C.gray200 }}
              onFocus={focusAccent}
              onBlur={blurBase}
            />
          </ModalField>

          <button
            onClick={handleContinue}
            style={{
              background: C.accent, color: C.white,
              border: 'none', borderRadius: 10,
              padding: '13px 0', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', width: '100%', marginTop: 4,
              fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(207,58,11,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(207,58,11,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(207,58,11,0.3)'; }}
          >
            Continuar <Ico d={icons.arrow} size={16} color="#fff" />
          </button>

          <Link
            ref={linkRef}
            to="/registro"
            state={{ prefill }}
            onClick={onClose}
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          />

          <p style={{ textAlign: 'center', fontSize: 12, color: C.gray400, marginTop: 2 }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" onClick={onClose} style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ESTILOS GLOBALES
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes pbPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes pbModalIn {
    from { opacity: 0; transform: scale(0.97) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  html { scroll-behavior: smooth; }
  * { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(240,87,43,0.3); border-radius: 10px; }
`;

/* ─────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────── */
export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = GLOBAL_CSS;
    style.id = 'pitbox-landing-styles';
    if (!document.getElementById('pitbox-landing-styles')) document.head.appendChild(style);
    return () => { const el = document.getElementById('pitbox-landing-styles'); if (el) el.remove(); };
  }, []);

  return (
    <div style={{ margin: 0, padding: 0, overflowX: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <Navbar onCta={() => setShowModal(true)} />
      <Hero onCta={() => setShowModal(true)} />
      <StatsBar />
      <NexaBanner onCta={() => setShowModal(true)} />
      <ProductSection />
      <AppShowcase />
      <ModulesSection />
      <Sectors />
      <FinalCta onCta={() => setShowModal(true)} />
      <Footer />
      {showModal && <OnboardingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
