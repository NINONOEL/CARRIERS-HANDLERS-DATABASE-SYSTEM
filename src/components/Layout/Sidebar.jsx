import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    icon: "mdi:view-dashboard",
    path: "/",
  },
  {
    label: "Carriers",
    icon: "mdi:truck-fast",
    path: "/carriers",
    children: [
      { label: "Summary",         icon: "mdi:chart-bar",        path: "/carriers/summary" },
      { label: "Land Transport",  icon: "mdi:truck",            path: "/carriers/land" },
      { label: "Water Transport", icon: "mdi:ferry",            path: "/carriers/water" },
    ],
  },
  {
    label: "Handlers",
    icon: "mdi:account-group",
    path: "/handlers",
    children: [
      { label: "Summary",        icon: "mdi:chart-bar",        path: "/handlers/summary" },
      { label: "Or. Mindoro",    icon: "mdi:map-marker",       path: "/handlers/Oriental Mindoro" },
      { label: "Occ. Mindoro",   icon: "mdi:map-marker",       path: "/handlers/Occidental Mindoro" },
      { label: "Palawan",        icon: "mdi:map-marker",       path: "/handlers/Palawan" },
      { label: "Marinduque",     icon: "mdi:map-marker",       path: "/handlers/Marinduque" },
      { label: "Romblon",        icon: "mdi:map-marker",       path: "/handlers/Romblon" },
    ],
  },
  {
    label: "Registry",
    icon: "mdi:database",
    path: "/registry",
    children: [
      { label: "Carriers Registry",  icon: "mdi:clipboard-list",    path: "/registry/carriers" },
      { label: "Handlers Registry",  icon: "mdi:clipboard-account", path: "/registry/handlers" },
    ],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({ Carriers: false, Handlers: false, Registry: false });

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className={`relative flex flex-col h-full bg-white border-r border-gray-200 shadow-xl flex-shrink-0 transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ── Logo Header ── */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/10 bg-gradient-to-br from-[#849C44] via-[#6e8a35] to-[#556b28] flex-shrink-0">
        {/* Logo */}
        <img
          src="/DALOGO.jpg"
          alt="DA MIMAROPA"
          className="w-9 h-9 rounded-full object-cover border-2 border-white/60 shadow-md flex-shrink-0"
        />

        {/* Title — fades with collapse */}
        <div
          className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? "opacity-0 max-h-0 max-w-0" : "opacity-100 max-h-20 max-w-full"
          }`}
        >
          <p className="text-white font-bold text-xs leading-tight whitespace-nowrap">DA MIMAROPA</p>
          <p className="text-white/75 text-[10px] leading-tight whitespace-nowrap">Carriers &amp; Handlers DB</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navItems.map((item, idx) => (
          <div
            key={item.label}
            className="animate-fade-in-left"
            style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
          >
            {item.children ? (
              <>
                {/* Parent button */}
                <div className="relative group">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive(item.path)
                        ? "text-[#849C44] bg-[#f4f7e8]"
                        : "text-gray-500 hover:bg-[#f4f7e8]/80 hover:text-[#849C44]"
                    }`}
                  >
                    {/* Active left bar */}
                    {isActive(item.path) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#849C44] rounded-r-full" />
                    )}

                    <Icon
                      icon={item.icon}
                      width={20}
                      className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive(item.path) ? "text-[#849C44]" : ""
                      }`}
                    />

                    {/* Label — fades with collapse */}
                    <span
                      className={`flex-1 text-left whitespace-nowrap overflow-hidden transition-all duration-300 ${
                        collapsed ? "w-0 opacity-0 max-w-0" : "opacity-100 max-w-full"
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Chevron rotates on open/close */}
                    {!collapsed && (
                      <Icon
                        icon="mdi:chevron-down"
                        width={16}
                        className={`transition-transform duration-300 flex-shrink-0 ${
                          openMenus[item.label] ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    )}
                  </button>

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50">
                      {item.label}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                    </div>
                  )}
                </div>

                {/* Submenu — animated slide down */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    !collapsed && openMenus[item.label]
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-4 mt-1 pb-1 border-l-2 border-[#849C44]/25 pl-3 space-y-0.5">
                    {item.children.map((child, cIdx) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => {
                          onNavigate?.();
                          if (child.path === "/carriers/summary") window.dispatchEvent(new Event("carriers:summary:animate"));
                          if (child.path === "/handlers/summary") window.dispatchEvent(new Event("handlers:summary:animate"));
                        }}
                        style={{ animationDelay: `${cIdx * 30}ms`, animationFillMode: "both" }}
                        className={({ isActive }) =>
                          `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-[#849C44] to-[#637d28] text-white shadow-md shadow-[#849C44]/25"
                              : "text-gray-500 hover:bg-[#f4f7e8] hover:text-[#849C44] hover:translate-x-1"
                          }`
                        }
                      >
                        <Icon
                          icon={child.icon}
                          width={14}
                          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        />
                        <span className="whitespace-nowrap overflow-hidden">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Top-level link */
              <div className="relative group">
                <NavLink
                  to={item.path}
                  end
                  onClick={() => {
                    onNavigate?.();
                    if (item.path === "/") window.dispatchEvent(new Event("dashboard:animate"));
                  }}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#849C44] to-[#637d28] text-white shadow-md shadow-[#849C44]/30"
                        : "text-gray-500 hover:bg-[#f4f7e8]/80 hover:text-[#849C44]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        icon={item.icon}
                        width={20}
                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      />
                      <span
                        className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                          collapsed ? "w-0 opacity-0 max-w-0" : "opacity-100 max-w-full"
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Active glow dot */}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm" />
                      )}
                    </>
                  )}
                </NavLink>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50">
                    {item.label}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div
        className={`border-t border-gray-100 overflow-hidden transition-all duration-300 ${
          collapsed ? "py-2 px-1" : "py-3 px-4"
        }`}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <Icon icon="mdi:leaf" width={16} className="text-[#849C44]/50" />
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 text-center whitespace-nowrap">
            © 2025 DA MIMAROPA Region
          </p>
        )}
      </div>
    </aside>
  );
}
