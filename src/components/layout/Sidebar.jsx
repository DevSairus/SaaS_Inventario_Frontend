// Sidebar.jsx — toggle manual, sin hover-expand

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useThemeStore from "../../store/themeStore";

const I = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  wrench:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  cart:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  box:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  chart:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  file:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  gear:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  users:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[17px] h-[17px] shrink-0"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-2.5 h-2.5 shrink-0 transition-transform duration-200"><polyline points="9 18 15 12 9 6"/></svg>,
  collapse:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[15px] h-[15px] shrink-0"><path d="M11 19l-7-7 7-7"/><path d="M19 19l-7-7 7-7"/></svg>,
};

const NAV = [
  { id: "dashboard", label: "Dashboard",  icon: "dashboard", path: "/dashboard" },
  {
    id: "workshop", label: "Taller", icon: "wrench",
    children: [
      { label: "Órdenes de Trabajo",    path: "/workshop/work-orders" },
      { label: "Vehículos",             path: "/workshop/vehicles" },
      { label: "Productividad",         path: "/workshop/productivity" },
      { label: "Reporte Taller",        path: "/workshop/report" },
      { label: "Liquidación Servicios", path: "/workshop/commission-settlements" },
      { label: "Comisiones Productos",  path: "/workshop/commission-products" },
    ],
  },
  {
    id: "sales", label: "Ventas", icon: "cart",
    children: [
      { label: "Nueva Venta",      path: "/sales/new" },
      { label: "Historial Ventas", path: "/sales" },
      { label: "Cartera",          path: "/accounts-receivable" },
      { label: "Devoluciones",     path: "/sales/customer-returns" },
      { label: "Clientes",         path: "/customers" },
    ],
  },
  {
    id: "inventory", label: "Inventario", icon: "box",
    children: [
      { label: "Productos",         path: "/products" },
      { label: "Compras",           path: "/purchases" },
      { label: "Movimientos",       path: "/movements" },
      { label: "Transferencias",    path: "/inventory/transfers" },
      { label: "Consumos Internos", path: "/inventory/internal-consumptions" },
      { label: "Dev. Proveedores",  path: "/inventory/supplier-returns" },
      { label: "Bodegas",           path: "/warehouses" },
      { label: "Proveedores",       path: "/suppliers" },
      { label: "Alertas de Stock",  path: "/stock-alerts" },
    ],
  },
  { id: "reports",  label: "Informes", icon: "chart", path: "/reports" },
  {
    id: "dian", label: "DIAN", icon: "file",
    children: [
      { label: "Configuración DIAN", path: "/dian/config" },
      { label: "Eventos DIAN",       path: "/dian/eventos" },
    ],
  },
  { id: "users",    label: "Usuarios",  icon: "users", path: "/users" },
  { id: "settings", label: "Ajustes",   icon: "gear",  path: "/settings" },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const currentPath = location.pathname;

  const activeGroupId = NAV.find(item =>
    item.children?.some(c => currentPath === c.path || currentPath.startsWith(c.path + "/"))
  )?.id ?? null;

  const [openGroup, setOpenGroup] = useState(activeGroupId);
  const expanded = !isCollapsed;

  const isActive    = (path) => currentPath === path || currentPath.startsWith(path + "/");
  const groupActive = (item) => item.path ? isActive(item.path) : item.children?.some(c => isActive(c.path));

  const toggleGroup = (id) => {
    if (!expanded) { setIsCollapsed(false); setOpenGroup(id); return; }
    setOpenGroup(p => p === id ? null : id);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const NavContent = ({ inMobile = false }) => (
    <>
      {NAV.map((item) => {
        const active = groupActive(item);
        const isOpen = openGroup === item.id;

        if (!item.children) {
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => inMobile && setIsMobileOpen(false)}
              title={!expanded && !inMobile ? item.label : undefined}
              className={[
                "relative flex items-center gap-2.5 h-8 px-[14px] text-[12.5px] font-medium transition-colors duration-100",
                active ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]",
              ].join(" ")}
            >
              {active && <ActiveBar />}
              {I[item.icon]}
              {(expanded || inMobile) && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        }

        return (
          <div key={item.id}>
            <button
              onClick={() => toggleGroup(item.id)}
              title={!expanded && !inMobile ? item.label : undefined}
              className={[
                "w-full relative flex items-center gap-2.5 h-8 px-[14px] text-[12.5px] font-medium transition-colors duration-100",
                active ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]",
              ].join(" ")}
            >
              {active && <ActiveBar />}
              {I[item.icon]}
              {(expanded || inMobile) && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                  <span style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}>{I.chevron}</span>
                </>
              )}
            </button>
            {(expanded || inMobile) && (
              <div style={{ maxHeight: isOpen ? `${item.children.length * 28}px` : "0px", overflow: "hidden", transition: "max-height 190ms ease" }}>
                {item.children.map((child) => {
                  const childActive = isActive(child.path);
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => inMobile && setIsMobileOpen(false)}
                      className={[
                        "flex items-center h-7 pl-10 pr-4 text-[11.5px] whitespace-nowrap transition-colors duration-100",
                        childActive ? "text-blue-400 bg-blue-500/10 font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <span className={`w-1 h-1 rounded-full mr-2 shrink-0 ${childActive ? "bg-blue-400" : "bg-gray-600"}`} />
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside
        style={{ width: expanded ? "232px" : "52px", transition: "width 200ms cubic-bezier(0.4,0,0.2,1)" }}
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-gray-900 border-r border-white/[0.06] overflow-hidden"
      >
        <div className="flex items-center h-10 border-b border-white/[0.06] shrink-0 px-[14px]">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-3 h-3">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          {expanded && (
            <>
              <span className="text-white font-semibold text-[13px] whitespace-nowrap ml-2.5 flex-1">AutoTaller</span>
              <button onClick={() => setIsCollapsed(true)} title="Colapsar menú" className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors">
                {I.collapse}
              </button>
            </>
          )}
          {!expanded && (
            <button onClick={() => setIsCollapsed(false)} title="Expandir menú" className="absolute right-0 top-0 h-10 w-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
          <NavContent />
        </nav>

        <div className="border-t border-white/[0.06] shrink-0">
          {expanded ? (
            <div className="flex items-center justify-between px-[14px] py-2">
              <span className="text-[11px] text-gray-500">Modo oscuro</span>
              <button
                onClick={toggleTheme}
                title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${dark ? 'bg-blue-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ) : (
            <button onClick={toggleTheme} title={dark ? 'Modo claro' : 'Modo oscuro'} className="w-full flex items-center justify-center h-8 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
              {dark
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[15px] h-[15px]"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[15px] h-[15px]"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>
          )}
          {expanded ? (
            <div className="flex items-center gap-2.5 h-10 px-[14px]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {(user?.first_name?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-medium text-gray-200 truncate leading-tight">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10.5px] text-gray-500 capitalize truncate leading-tight">{user?.role ?? "usuario"}</p>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión" className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                {I.logout}
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Cerrar sesión" className="w-full flex items-center justify-center h-10 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              {I.logout}
            </button>
          )}
        </div>
      </aside>

      <div className="hidden lg:block shrink-0" style={{ width: expanded ? "232px" : "52px", transition: "width 200ms cubic-bezier(0.4,0,0.2,1)" }} />

      {/* ── MOBILE overlay sidebar ── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="relative w-64 flex flex-col bg-gray-900 h-full shadow-2xl">
            <div className="flex items-center justify-between h-10 px-[14px] border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-3 h-3">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <span className="text-white font-semibold text-[13px]">AutoTaller</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-1">
              <NavContent inMobile />
            </nav>

            <div className="border-t border-white/[0.06] shrink-0">
              {/* Toggle dark mode móvil */}
              <div className="flex items-center justify-between px-[14px] py-2">
                <span className="text-[11px] text-gray-500">Modo oscuro</span>
                <button
                  onClick={toggleTheme}
                  title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${dark ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center gap-2.5 h-10 px-[14px]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {(user?.first_name?.[0] ?? "U").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-gray-200 truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10.5px] text-gray-500 capitalize truncate">{user?.role ?? "usuario"}</p>
                </div>
                <button onClick={handleLogout} className="p-1 rounded-md text-gray-500 hover:text-red-400 transition-colors">
                  {I.logout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActiveBar() {
  return <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-500 rounded-r-full" />;
}