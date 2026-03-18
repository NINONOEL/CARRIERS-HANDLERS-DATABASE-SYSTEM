import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/":                        { title: "Dashboard",                 sub: "Overview & Statistics" },
  "/carriers/summary":        { title: "Carriers – Summary",        sub: "Province-wise Summary" },
  "/carriers/land":           { title: "Carriers – Land Transport",  sub: "Land Transport Records" },
  "/carriers/water":          { title: "Carriers – Water Transport", sub: "Water Transport Records" },
  "/handlers/summary":        { title: "Handlers – Summary",        sub: "Province-wise Summary" },
  "/handlers/Marinduque":     { title: "Handlers – Marinduque",     sub: "Handler Records" },
  "/handlers/Occidental Mindoro":  { title: "Handlers – Occidental Mindoro", sub: "Handler Records" },
  "/handlers/Oriental Mindoro":    { title: "Handlers – Oriental Mindoro",   sub: "Handler Records" },
  "/handlers/Romblon":        { title: "Handlers – Romblon",        sub: "Handler Records" },
  "/handlers/Palawan":        { title: "Handlers – Palawan",        sub: "Handler Records" },
  "/registry/carriers":       { title: "Carriers Registry",         sub: "All Carrier Records" },
  "/registry/handlers":       { title: "Handlers Registry",         sub: "All Handler Records" },
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const info = pageTitles[location.pathname] || { title: "Carriers & Handlers DB", sub: "" };
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Icon icon="mdi:menu" width={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 leading-tight">{info.title}</h1>
        {info.sub && <p className="text-xs text-gray-500">{info.sub}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500">{dateStr}</p>
          <p className="text-xs font-semibold text-[#849C44]">DA MIMAROPA – Regulatory Division</p>
        </div>
        <div className="flex items-center gap-2 bg-[#f4f7e8] border border-[#849C44]/30 rounded-full px-3 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#849C44] to-[#637d28] flex items-center justify-center">
            <Icon icon="mdi:account" width={16} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-[#637d28]">Admin</span>
        </div>
      </div>
    </header>
  );
}
