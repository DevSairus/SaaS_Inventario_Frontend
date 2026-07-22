/**
 * PITBOX — Landing Page (SPA)
 * Ruta: /bienvenida (pública)
 *
 * Rediseño 2026 — dirección visual premium:
 *   - Paleta neutra grafito con acento "latón" (bronce/dorado) + violeta NEXA
 *   - Tipografía: Space Grotesk (títulos) + Inter (cuerpo) — reemplaza el
 *     estilo "tablero de carreras" anterior por un lenguaje SaaS premium
 *   - Taller sigue siendo el corazón del producto (sección propia, primero
 *     después del hero), pero se elevan Ventas/Facturación, Contabilidad
 *     y NEXA como motor de valor y de expansión de ingresos
 *   - Se incorporan funciones que no estaban en el landing anterior:
 *     seguimiento público de OT sin login, consulta RUNT, liquidación de
 *     comisiones e importación de facturas XML de proveedores
 *   - SPA con navegación scroll-spy, carrusel de capturas, tabs de módulos,
 *     contadores animados y modal de registro con validación de NIT
 *     (misma lógica de negocio y rutas que la versión anterior)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NexaIcon from '../components/common/NexaIcon';

/* ─────────────────────────────────────────
   PALETA — dirección premium (grafito + latón + violeta NEXA)
───────────────────────────────────────── */
const C = {
  ink:      '#0B0C10',
  inkD:     '#000000',
  graphite: '#15171D',
  graphite2:'#1B1D24',
  accent:   '#C4903D',
  accentL:  '#E0AC5F',
  signal:   '#22C55E',
  signalL:  '#4ADE80',
  caution:  '#E2665B',
  ai:       '#8B5CF6',
  aiL:      '#A78BFA',
  white:    '#FFFFFF',
  gray50:   '#FAFAF9',
  gray100:  '#F1F0ED',
  gray200:  '#E3E1DB',
  gray400:  '#9C978E',
  gray500:  '#6E6A62',
  gray700:  '#3D3A34',
  gray900:  '#151310',
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
  percent:     <><circle cx="7" cy="7" r="2.4"/><circle cx="17" cy="17" r="2.4"/><line x1="5" y1="19" x2="19" y2="5"/></>,
  globe:       <><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9z"/></>,
  fileDown:    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 14l3 3 3-3"/><path d="M12 11v6"/></>,
  clipboard:   <><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M9 11h6M9 15h6"/></>,
  smartphone:  <><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></>,
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
      <rect x="16" y="20" width="128" height="32" rx="6" fill="#241C10" />
      <text x="80" y="41" fill={C.accentL} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">PITBOX</text>
      {[['Dashboard',52,true],['Taller',84,false],['Ventas',116,false],['Contabilidad',148,false],['Inventario',180,false],['Alertas',212,false],['Reportes',244,false]].map(([lbl,y,act]) => (
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
      {[['OT-0452 en proceso','2m'],['Factura DIAN emitida','8m'],['Transferencia recibida','1h'],['Asiento propuesto por NEXA','2h']].map(([msg,t],i)=>(
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
      <rect x="180" y="280" width="360" height="46" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <Ico d={icons.globe} size={14} color={C.signalL} />
      <text x="204" y="298" fill="#CBD5E1" fontSize="9" fontWeight="600" fontFamily="system-ui">Seguimiento público OT-0452</text>
      <text x="204" y="312" fill="#5C5E64" fontSize="8" fontFamily="system-ui">El cliente ve el estado sin iniciar sesión · pitbox.app/ot/0452</text>
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

function ScreenContabilidad() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Plan de cuentas',52,false],['Contabilidad',84,true],['Reportes',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.accent:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="10.5" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Estados financieros</text>
      {[[180,40,'Activos','$182.4M',C.signalL],[302,40,'Pasivos','$64.1M',C.caution],[424,40,'Patrimonio','$118.3M',C.accentL]].map(([x,y,l,v,c])=>(
        <g key={l}>
          <rect x={x} y={y} width="116" height="50" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
          <text x={x+10} y={y+16} fill="#7A7C82" fontSize="8" fontFamily="system-ui">{l}</text>
          <text x={x+10} y={y+38} fill={c} fontSize="16" fontWeight="700" fontFamily="system-ui">{v}</text>
        </g>
      ))}
      <rect x="180" y="100" width="360" height="22" fill="#0A0A0C"/>
      {['ASIENTO','CUENTA','DÉBITO','ESTADO'].map((h,i)=>(
        <text key={h} x={[188,258,398,478][i]} y="115" fill="#5C5E64" fontSize="8" fontWeight="700" fontFamily="system-ui">{h}</text>
      ))}
      {[
        ['AS-3391','Gastos · Repuestos','$340.000','Propuesto NEXA',C.ai],
        ['AS-3390','Ventas · Ingresos','$1.240.000','Contabilizado',C.signal],
        ['AS-3389','Bancos','$96.000','Contabilizado',C.signal],
        ['AS-3388','IVA por pagar','$58.900','Propuesto NEXA',C.ai],
      ].map(([n,cta,total,e,c],i)=>(
        <g key={i}>
          <rect x="180" y={122+i*27} width="360" height="26" rx="3" fill={i%2?'#161719':'#101114'}/>
          <text x="188" y={139+i*27} fill={C.accentL} fontSize="9" fontFamily="system-ui">{n}</text>
          <text x="258" y={139+i*27} fill="#8B8D94" fontSize="9" fontFamily="system-ui">{cta}</text>
          <text x="398" y={139+i*27} fill="#CBD5E1" fontSize="9" fontFamily="system-ui">{total}</text>
          <rect x="470" y={130+i*27} width="78" height="13" rx="6" fill={c+'22'}/>
          <text x="509" y={140+i*27} fill={c} fontSize="7.5" fontWeight="600" textAnchor="middle" fontFamily="system-ui">{e}</text>
        </g>
      ))}
      <rect x="180" y="240" width="360" height="86" rx="8" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="194" y="258" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">RESULTADO DEL MES</text>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const h = [22,30,18,34,26,40,24,44,32,38,42,36][i];
        return <rect key={i} x={194+i*13.6} y={310-h} width="9" height={h} rx="2" fill={i===11?C.signalL:`${C.signalL}55`} />;
      })}
    </svg>
  );
}

function ScreenNexa() {
  return (
    <svg viewBox="0 0 560 340" style={{ width: '100%', height: 'auto', borderRadius: 12 }}>
      <rect width="560" height="340" fill="#101114"/>
      <rect width="160" height="340" fill="#0A0A0C"/>
      {[['Dashboard',52,false],['NEXA · IA',84,true],['Propuestas',116,false]].map(([lbl,y,act]) => (
        <g key={lbl}>
          <rect x="12" y={y} width="136" height="26" rx="6" fill={act?C.ai:'transparent'}/>
          <text x="28" y={y+17} fill={act?'#fff':'#7A7C82'} fontSize="10.5" fontFamily="system-ui">{lbl}</text>
        </g>
      ))}
      <text x="180" y="28" fill="#F3F1EA" fontSize="16" fontWeight="700" fontFamily="system-ui">Propuestas de NEXA</text>
      <rect x="180" y="44" width="360" height="60" rx="10" fill="#1B1C20" stroke={C.ai+'40'} strokeWidth="1"/>
      <text x="196" y="64" fill="#E5E3DC" fontSize="10" fontFamily="system-ui">Detecté un pago de $340.000 a Repuestos del Sur.</text>
      <text x="196" y="80" fill="#8B8D94" fontSize="9" fontFamily="system-ui">Propongo registrar el gasto y su asiento contable.</text>
      <rect x="196" y="88" width="70" height="12" rx="6" fill={C.ai}/>
      <text x="231" y="97" fill="#fff" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="system-ui">APROBAR</text>
      <rect x="274" y="88" width="70" height="12" rx="6" fill="none" stroke="#3A3B42"/>
      <text x="309" y="97" fill="#8B8D94" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="system-ui">RECHAZAR</text>

      <rect x="180" y="114" width="360" height="46" rx="10" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="196" y="132" fill="#CBD5E1" fontSize="9.5" fontFamily="system-ui">Venta FES-1128 → asiento de ingreso generado</text>
      <text x="196" y="146" fill="#8B8D94" fontSize="8" fontFamily="system-ui">Contabilizado automáticamente al aprobar la venta</text>

      <rect x="180" y="170" width="360" height="46" rx="10" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="196" y="188" fill="#CBD5E1" fontSize="9.5" fontFamily="system-ui">IVA por pagar del período recalculado</text>
      <text x="196" y="202" fill="#8B8D94" fontSize="8" fontFamily="system-ui">Con base en ventas, compras y gastos del mes</text>

      <rect x="180" y="228" width="360" height="98" rx="10" fill="#1B1C20" stroke="#2A2B30" strokeWidth="1"/>
      <text x="196" y="248" fill="#8B8D94" fontSize="9" fontWeight="600" fontFamily="system-ui">NEXA VE MÁS MIENTRAS MÁS ACTIVES</text>
      {['Inventario','Ventas','Tesorería','Contabilidad'].map((m,i)=>(
        <g key={m}>
          <circle cx="204" cy={264+i*17} r="3" fill={C.signalL}/>
          <text x="216" y={268+i*17} fill="#CBD5E1" fontSize="9" fontFamily="system-ui">{m} conectado</text>
        </g>
      ))}
    </svg>
  );
}

const SLIDES = [
  { id: 0, label: 'Taller', desc: 'Órdenes de trabajo, comisiones y seguimiento del vehículo, con un enlace público para que el cliente vea su estado sin iniciar sesión.', Screen: ScreenTaller },
  { id: 1, label: 'Ventas y facturación DIAN', desc: 'Cada venta se factura electrónicamente con validación DIAN integrada, sin exportar a otro sistema.', Screen: ScreenFacturacion },
  { id: 2, label: 'Contabilidad', desc: 'Plan de cuentas, asientos y estados financieros que se generan solos a partir de tu operación diaria.', Screen: ScreenContabilidad },
  { id: 3, label: 'NEXA · IA', desc: 'Tu asistente de inteligencia artificial: propone gastos, pagos y asientos contables listos para aprobar.', Screen: ScreenNexa },
  { id: 4, label: 'Inventario', desc: 'Control multi-bodega con transferencias trazables y alertas automáticas de stock bajo.', Screen: ScreenInventario },
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
              background: i === current ? 'rgba(196,144,61,0.15)' : 'transparent',
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
const NAV_SECTIONS = ['taller', 'producto', 'nexa', 'modulos', 'sectores', 'contacto'];

function Logomark({ size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9,
      background: `linear-gradient(155deg, ${C.graphite2}, ${C.ink})`,
      border: `1px solid rgba(196,144,61,0.4)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ico d={icons.stopwatch} size={size * 0.48} color={C.accentL} strokeWidth={1.8} />
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
    { label: 'Taller', href: '#taller' },
    { label: 'Producto', href: '#producto' },
    { label: 'NEXA · IA', href: '#nexa' },
    { label: 'Módulos', href: '#modulos' },
    { label: 'Sectores', href: '#sectores' },
    { label: 'Contacto', href: '#contacto' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(11,12,16,0.94)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
      transition: 'background 0.3s, border 0.3s',
      padding: '0 clamp(1.5rem, 5vw, 4rem)',
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="#inicio" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logomark />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: C.white, letterSpacing: '-0.01em' }}>
            Pitbox
          </span>
        </a>

        <div style={{ display: 'flex', gap: 30, alignItems: 'center' }} className="pb-nav-links">
          {navLinks.map(({ label, href }) => {
            const id = href.slice(1);
            return (
              <a key={label} href={href} style={{
                color: active === id ? C.accentL : 'rgba(255,255,255,0.68)',
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
            background: C.accent, color: C.white, border: 'none', borderRadius: 9,
            padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s, transform 0.15s',
            boxShadow: '0 4px 16px rgba(196,144,61,0.3)',
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
              textAlign: 'center', padding: 12, borderRadius: 9,
              background: C.accent, color: C.white, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>Solicitar demo →</button>
            <Link to="/login" onClick={() => setOpen(false)} style={{
              textAlign: 'center', padding: 10, borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14,
            }}>Iniciar sesión</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
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
      background: `radial-gradient(ellipse 70% 60% at 65% 40%, rgba(196,144,61,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 15% 85%, rgba(139,92,246,0.10) 0%, transparent 60%), linear-gradient(165deg, ${C.inkD} 0%, #121317 55%, #15171D 100%)`,
      display: 'flex', alignItems: 'center',
      padding: '0 clamp(1.5rem, 5vw, 4rem)',
      paddingTop: 68,
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025,
        backgroundImage: `linear-gradient(${C.white} 1px, transparent 1px), linear-gradient(90deg, ${C.white} 1px, transparent 1px)`,
        backgroundSize: '52px 52px', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', alignItems: 'center', gap: 'clamp(2rem,6vw,6rem)', paddingTop: 'clamp(2rem,5vh,4rem)', paddingBottom: 'clamp(2rem,5vh,4rem)' }}>

        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(196,144,61,0.12)', border: '1px solid rgba(196,144,61,0.3)',
            borderRadius: 100, padding: '6px 14px', marginBottom: 28,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s, transform 0.5s',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accentL, animation: 'pbPulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: C.accentL, fontWeight: 600, letterSpacing: '0.04em' }}>
              Taller · Ventas · Contabilidad · NEXA IA
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.5rem, 4.8vw, 3.6rem)',
            fontWeight: 700, color: C.white, lineHeight: 1.08,
            letterSpacing: '-0.02em', marginBottom: 24,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.55s 0.1s, transform 0.55s 0.1s',
          }}>
            El sistema operativo<br />
            de tu taller <span style={{ color: C.accentL }}>— y de tu negocio.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.12rem)', color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.7, maxWidth: 480, marginBottom: 36,
            fontFamily: "'Inter', sans-serif",
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.55s 0.2s, transform 0.55s 0.2s',
          }}>
            Pitbox controla el taller de principio a fin, y conecta ventas, facturación
            DIAN, tesorería y contabilidad en un mismo lugar — con <b style={{ color: 'rgba(255,255,255,0.85)' }}>NEXA</b>, tu
            asistente de IA, proponiendo cada registro contable listo para aprobar.
          </p>

          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.55s 0.3s, transform 0.55s 0.3s',
          }}>
            <button onClick={onCta} style={{
              background: C.accent, color: C.white, border: 'none', borderRadius: 11,
              padding: '14px 30px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.01em',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 30px rgba(196,144,61,0.32)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 38px rgba(196,144,61,0.42)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(196,144,61,0.32)'; }}
            >
              Solicitar demo <Ico d={icons.arrow} size={16} color="#fff" />
            </button>
            <a href="#producto" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(255,255,255,0.72)', textDecoration: 'none',
              fontSize: 15, fontWeight: 500, padding: '14px 8px',
            }}>
              Ver el producto <Ico d={icons.arrowRight} size={15} color="rgba(255,255,255,0.55)" />
            </a>
          </div>

          <div style={{
            marginTop: 44, display: 'flex', gap: 28, flexWrap: 'wrap',
            opacity: mounted ? 1 : 0, transition: 'opacity 0.55s 0.45s',
          }}>
            {[
              { label: 'Del ingreso del vehículo a la entrega', sub: 'Taller' },
              { label: 'Ventas, tesorería y contabilidad integradas', sub: 'Finanzas' },
              { label: 'Propone asientos y gastos por ti', sub: 'NEXA · IA' },
            ].map(({ label, sub }) => (
              <div key={sub} style={{ maxWidth: 160 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accentL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{sub}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: 'opacity 0.7s 0.2s, transform 0.7s 0.2s',
        }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18,
            boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(196,144,61,0.08)',
            overflow: 'hidden', background: '#101114',
          }}>
            <div style={{ display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A3B42' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A3B42' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3A3B42' }} />
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
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-around', alignItems: 'center' }}>
        {[
          { val: `${d1}+`, label: 'Módulos integrados' },
          { val: `${d2}%`, label: 'Facturación electrónica DIAN' },
          { val: `< ${d3}h`, label: 'Tiempo de activación' },
          { val: 'NEXA', label: 'Más módulos activos, más automatiza' },
        ].map(({ val, label }, i) => (
          <div key={i} style={{
            textAlign: 'center',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 0.5s ${i*0.1}s, transform 0.5s ${i*0.1}s`,
          }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.5rem,3.2vw,2.2rem)', fontWeight: 700, color: C.accentL, letterSpacing: '-0.01em' }}>{val}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: TALLER (núcleo del producto)
───────────────────────────────────────── */
function TallerSpotlight({ onCta }) {
  const [ref, visible] = useInView();
  const items = [
    { icon: icons.wrench, title: 'Órdenes de trabajo completas', desc: 'Vehículo, técnico asignado, repuestos usados y estado en tiempo real, del ingreso a la entrega.' },
    { icon: icons.percent, title: 'Comisiones por técnico', desc: 'Liquidación de comisiones calculada automáticamente sobre cada orden de trabajo cerrada.' },
    { icon: icons.globe, title: 'Seguimiento público sin login', desc: 'Tu cliente ve el estado de su vehículo con un enlace, sin crear cuenta ni contraseña.' },
    { icon: icons.car, title: 'Consulta RUNT integrada', desc: 'Verifica los datos del vehículo directamente desde la orden de trabajo, sin salir de Pitbox.' },
    { icon: icons.smartphone, title: 'App instalable en el taller', desc: 'Tu equipo instala Taller como app desde el celular, sin tienda de aplicaciones, y sigue trabajando aunque se caiga el internet.' },
  ];

  return (
    <section id="taller" style={{
      background: `linear-gradient(175deg, ${C.ink} 0%, #101116 100%)`,
      padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div ref={ref} style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 'clamp(2.5rem,6vw,5rem)', alignItems: 'center', marginBottom: 56,
        }}>
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s, transform 0.6s' }}>
            <div style={{ display: 'inline-block', background: 'rgba(196,144,61,0.12)', border: '1px solid rgba(196,144,61,0.28)', borderRadius: 100, padding: '6px 16px', marginBottom: 18 }}>
              <span style={{ fontSize: 12, color: C.accentL, fontWeight: 700, letterSpacing: '0.05em' }}>El núcleo de Pitbox</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.white,
              letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 18,
            }}>
              Taller que no pierde el hilo de nada
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15.5, lineHeight: 1.75, maxWidth: 480 }}>
              Antes de ser una plataforma de finanzas, Pitbox nació para ordenar el taller.
              Sigue siendo lo que mejor hace: vehículos, técnicos y órdenes de trabajo bajo
              control, con visibilidad total para tu equipo y para el cliente.
            </p>
            <button onClick={onCta} style={{
              marginTop: 28, background: 'transparent', color: C.white,
              border: '1.5px solid rgba(255,255,255,0.22)', borderRadius: 10,
              padding: '12px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'border-color 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentL; e.currentTarget.style.background = 'rgba(196,144,61,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Solicitar demo <Ico d={icons.arrow} size={15} color={C.white} />
            </button>
          </div>

          <div style={{
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            boxShadow: '0 30px 70px rgba(0,0,0,0.5)', overflow: 'hidden',
            opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s 0.15s, transform 0.7s 0.15s',
          }}>
            <ScreenTaller />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
          {items.map(({ icon, title, desc }, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '22px 20px',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.5s ${0.1 + i * 0.08}s, transform 0.5s ${0.1 + i * 0.08}s`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, background: 'rgba(196,144,61,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Ico d={icon} size={18} color={C.accentL} strokeWidth={1.7} />
              </div>
              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 8 }}>{title}</h4>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Mini visualizations */
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

function MiniContabilidad({ accent }) {
  const items = [
    { label: 'Activos', val: 72, col: C.signal },
    { label: 'Pasivos', val: 38, col: C.caution },
    { label: 'Patrimonio', val: 58, col: accent },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map(({ label, val, col }, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.gray700 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{val}%</span>
          </div>
          <div style={{ height: 6, background: '#E3E1DB', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${val}%`, background: col, borderRadius: 3, transition: 'width 1.2s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Ico d={icons.sparkle} size={13} color={C.ai} />
        <span style={{ fontSize: 11.5, color: C.gray500 }}>2 asientos propuestos por NEXA, listos para aprobar</span>
      </div>
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
            <div style={{ height: 6, background: '#E3E1DB', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${val}%`, background: col, borderRadius: 3, transition: 'width 1.2s ease' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: PRODUCTO (ventas, contabilidad, inventario)
───────────────────────────────────────── */
function ProductSection() {
  const features = [
    {
      icon: icons.invoice, accent: C.signal,
      title: 'Ventas y facturación electrónica sin fricción',
      desc: 'Cada venta se factura con validación DIAN integrada en el mismo flujo. El CUFE, la aceptación y la importación de facturas XML de proveedores quedan registrados sin doble digitación.',
      bullets: ['Validación DIAN en el mismo flujo de venta', 'Importación de facturas XML de proveedores', 'Envío automático al correo del cliente', 'Cuentas por cobrar y por pagar'],
      side: 'right',
    },
    {
      icon: icons.book, accent: C.accentL,
      title: 'Contabilidad que se arma sola',
      desc: 'Plan de cuentas, asientos y estados financieros generados a partir de tu operación diaria — ventas, compras y gastos se contabilizan sin que tengas que digitar cada movimiento.',
      bullets: ['Plan de cuentas configurable (PUC)', 'Asientos automáticos por operación', 'Balance y estado de resultados', 'Libros: diario, mayor, auxiliar e IVA'],
      side: 'left',
    },
    {
      icon: icons.warehouse, accent: C.caution,
      title: 'Inventario que se sincroniza solo',
      desc: 'Cada bodega o sede controla su propio stock, con transferencias trazables entre ellas y alertas automáticas antes de que un producto se agote.',
      bullets: ['Multi-bodega y multi-sede', 'Transferencias con trazabilidad', 'Alertas de stock configurables', 'Escaneo de código de barras'],
      side: 'right',
    },
  ];

  return (
    <section id="producto" style={{ background: C.gray50, padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', background: '#F4E9D8', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.05em' }}>Por qué Pitbox</span>
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.gray900,
            letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16,
          }}>
            Del taller a los estados financieros,<br />sin salir de una sola plataforma
          </h2>
          <p style={{ color: C.gray500, fontSize: 'clamp(1rem,2vw,1.1rem)', maxWidth: 560, margin: '0 auto' }}>
            Sin instalaciones complejas, sin sistemas sueltos entre sí. Actívala en menos de 24 horas.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4rem,8vw,6rem)' }}>
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
                    width: 50, height: 50, borderRadius: 13,
                    background: `${accent}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  }}>
                    <Ico d={icon} size={23} color={accent} strokeWidth={1.7} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 'clamp(1.3rem,2.4vw,1.7rem)', fontWeight: 700, color: C.gray900,
                    letterSpacing: '-0.01em', marginBottom: 16,
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
                  background: `linear-gradient(135deg, ${accent}0A, ${accent}04)`,
                  border: `1px solid ${accent}22`,
                  borderRadius: 20, padding: 'clamp(1.5rem,3vw,3rem)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 220,
                }}>
                  <div style={{ width: '100%' }}>
                    {i === 0 && <MiniFacturacion accent={accent} />}
                    {i === 1 && <MiniContabilidad accent={accent} />}
                    {i === 2 && <MiniInventario accent={accent} />}
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
      background: `linear-gradient(165deg, ${C.inkD} 0%, #121317 100%)`,
      padding: 'clamp(4rem,8vw,7rem) 0',
    }}>
      <div ref={ref} style={{
        textAlign: 'center', marginBottom: 48,
        padding: '0 clamp(1.5rem,5vw,4rem)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.6s, transform 0.6s',
      }}>
        <div style={{ display: 'inline-block', background: 'rgba(196,144,61,0.1)', border: '1px solid rgba(196,144,61,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: C.accentL, fontWeight: 700, letterSpacing: '0.05em' }}>El aplicativo en acción</span>
        </div>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 12,
        }}>
          Diseñado para quienes operan<br />todos los días, sin pausas
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, maxWidth: 540, margin: '0 auto' }}>
          Una interfaz clara y rápida para gestionar taller, ventas, contabilidad e inventario en un solo lugar.
        </p>
      </div>
      <AppCarousel />
    </section>
  );
}

/* ─────────────────────────────────────────
   SECCIÓN: NEXA (motor de valor — destacado)
───────────────────────────────────────── */
function NexaBanner({ onCta }) {
  const [ref, visible] = useInView();
  const cards = [
    { icon: icons.bot, title: 'Ve toda tu operación', desc: 'Cuantos más módulos actives, más contexto tiene NEXA: ventas, compras, tesorería e inventario.' },
    { icon: icons.check, title: 'Tú apruebas', desc: 'Cada propuesta de gasto, pago o asiento espera tu visto bueno antes de contabilizarse.' },
    { icon: icons.chart, title: 'Multiplica el valor de Pitbox', desc: 'Con todo activo, NEXA hace el trabajo contable pesado — es donde más tiempo y dinero ahorras.' },
  ];

  return (
    <section id="nexa" style={{
      position: 'relative', overflow: 'hidden',
      background: `radial-gradient(circle at 15% 20%, rgba(139,92,246,0.22), transparent 55%), radial-gradient(circle at 85% 80%, rgba(196,144,61,0.14), transparent 50%), ${C.inkD}`,
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
          <span style={{ fontSize: 12, color: C.aiL, fontWeight: 700, letterSpacing: '0.05em' }}>El motor de valor de Pitbox</span>
        </div>

        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(2rem,4.6vw,3rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 18,
        }}>
          Conoce a <span style={{ color: C.aiL }}>NEXA</span>, tu copiloto contable
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(1rem,2vw,1.15rem)',
          lineHeight: 1.7, maxWidth: 640, margin: '0 auto 20px',
        }}>
          NEXA revisa tu operación, propone gastos, pagos y asientos contables, y solo
          ejecuta lo que tú apruebas.
        </p>
        <p style={{
          color: C.aiL, fontSize: 14.5, fontWeight: 600,
          maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.6,
        }}>
          Entre más módulos de Pitbox tengas activos — inventario, ventas, tesorería,
          contabilidad —, más contexto tiene NEXA y más trabajo contable te ahorra.
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
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        <button onClick={onCta} style={{
          background: C.ai, color: C.white, border: 'none', borderRadius: 11,
          padding: '14px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
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
   SECCIÓN: MÓDULOS (tabs)
───────────────────────────────────────── */
function ModulesSection() {
  const [ref, visible] = useInView();
  const [active, setActive] = useState(0);

  const modules = [
    {
      name: 'Taller',
      icon: icons.wrench, accent: C.accentL,
      desc: 'Órdenes de trabajo con vehículos, técnicos y estado en tiempo real, desde el ingreso hasta la entrega al cliente.',
      bullets: ['Vehículos y ficha del cliente', 'Consulta RUNT integrada', 'Comisiones por técnico', 'Seguimiento público de OT sin login'],
    },
    {
      name: 'Ventas y facturación',
      icon: icons.invoice, accent: C.signal,
      desc: 'Ventas con facturación electrónica y validación DIAN integradas en el mismo flujo, sin doble digitación.',
      bullets: ['CUFE y eventos DIAN en la venta', 'Importación de facturas XML de proveedores', 'Cuentas por cobrar', 'Envío automático al correo'],
    },
    {
      name: 'Contabilidad',
      icon: icons.book, accent: C.accentL,
      desc: 'Plan de cuentas, asientos y reportes financieros generados a partir de tu operación diaria, sin doble digitación.',
      bullets: ['Plan de cuentas configurable', 'Asientos contables automáticos', 'Mapeo de cuentas por tipo de operación', 'Balance y estado de resultados'],
    },
    {
      name: 'Tesorería',
      icon: icons.bank, accent: C.signal,
      desc: 'Cuentas por pagar, gastos operativos y flujo de caja al día, con apertura y cierre de cajas por sede.',
      bullets: ['Cuentas por pagar a proveedores', 'Gastos operativos por categoría', 'Flujo de caja en tiempo real', 'Cajas por sede con arqueo'],
    },
    {
      name: 'NEXA · IA',
      icon: icons.sparkle, accent: C.ai,
      desc: 'Tu asistente de inteligencia artificial: analiza tu operación y propone gastos, pagos y asientos contables listos para aprobar.',
      bullets: ['Propone gastos y pagos automáticamente', 'Genera asientos contables por ti', 'Tú apruebas o rechazas cada acción', 'Nada se contabiliza sin tu visto bueno'],
    },
    {
      name: 'Inventario',
      icon: icons.package, accent: C.caution,
      desc: 'Productos, categorías y existencias sincronizadas en tiempo real, con escaneo de código de barras desde cámara o lector externo.',
      bullets: ['Escaneo de código de barras', 'Categorías y proveedores', 'Ajustes de inventario con soporte', 'Devoluciones a proveedor y de cliente'],
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
      <div ref={ref} style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: '#F4E9D8', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.05em' }}>Módulos</span>
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: 700, color: C.gray900,
            letterSpacing: '-0.02em', lineHeight: 1.15,
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
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, fontWeight: 700, color: C.gray900, marginBottom: 12 }}>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Además incluye</div>
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
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(2rem,6vw,6rem)', alignItems: 'center' }}>
          <div ref={ref}>
            <div style={{ display: 'inline-block', background: '#F4E9D8', borderRadius: 100, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '0.05em' }}>Sectores</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.8rem,3.5vw,2.3rem)', fontWeight: 700, color: C.gray900,
              letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16,
              opacity: visible ? 1 : 0, transition: 'opacity 0.5s',
            }}>
              Pensado para la operación colombiana
            </h2>
            <p style={{ color: C.gray500, fontSize: 15, lineHeight: 1.7, marginBottom: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.1s' }}>
              Cada negocio tiene su propio ritmo. Pitbox se adapta desde un solo punto de venta hasta una red de bodegas y sedes.
            </p>
            <button onClick={() => document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth' })} style={{
              background: C.ink, color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
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
      background: `linear-gradient(150deg, ${C.inkD} 0%, #121317 60%, #15171D 100%)`,
      padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)',
      textAlign: 'center',
    }}>
      <div ref={ref} style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(2rem,4.6vw,2.8rem)', fontWeight: 700, color: C.white,
          letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 20,
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
          Agenda una demo y te mostramos cómo Pitbox controla tu taller, ventas, tesorería y contabilidad — con NEXA proponiendo cada registro por ti.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', opacity: visible ? 1 : 0, transition: 'opacity 0.5s 0.25s' }}>
          <button onClick={onCta} style={{
            background: C.accent, color: C.white, border: 'none', borderRadius: 12,
            padding: '16px 40px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: '0 8px 32px rgba(196,144,61,0.35)',
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
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem 6rem', marginBottom: 40 }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Logomark size={32} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: C.white }}>Pitbox</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 280 }}>
              Plataforma de taller, ventas, facturación electrónica, tesorería y contabilidad para negocios colombianos, con NEXA como asistente de IA. Desarrollado por DataCore.
            </p>
            <a href="mailto:contacto@datacore.com.co" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 13, marginTop: 16, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = C.accentL}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
              <Ico d={icons.mail} size={14} color="currentColor" /> info@esc-datacore.com
            </a>
          </div>
          {[
            { title: 'Producto', links: ['Taller', 'NEXA · IA', 'Módulos', 'Sectores'] },
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
  boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif",
  color: C.gray900, background: C.white,
  transition: 'border-color 0.2s',
};

function ModalField({ label, required, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.gray700, display: 'block', marginBottom: 5, letterSpacing: '0.01em' }}>
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
        background: 'rgba(11,12,16,0.88)', backdropFilter: 'blur(6px)',
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
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: C.gray900 }}>
              Pitbox
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Ico d={icons.close} size={20} color={C.gray400} />
          </button>
        </div>

        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: C.gray900, marginBottom: 4 }}>
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
              padding: '13px 0', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', width: '100%', marginTop: 4,
              fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(196,144,61,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(196,144,61,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(196,144,61,0.3)'; }}
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
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

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
  ::-webkit-scrollbar-thumb { background: rgba(196,144,61,0.3); border-radius: 10px; }
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
    <div style={{ margin: 0, padding: 0, overflowX: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      <Navbar onCta={() => setShowModal(true)} />
      <Hero onCta={() => setShowModal(true)} />
      <StatsBar />
      <TallerSpotlight onCta={() => setShowModal(true)} />
      <ProductSection />
      <NexaBanner onCta={() => setShowModal(true)} />
      <AppShowcase />
      <ModulesSection />
      <Sectors />
      <FinalCta onCta={() => setShowModal(true)} />
      <Footer />
      {showModal && <OnboardingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}