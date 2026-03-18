import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Toaster } from "react-hot-toast";
import { Icon } from "@iconify/react";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen h-dvh overflow-hidden font-poppins bg-[#f8f6f0]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Mobile sidebar drawer + backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Toggle tab — sticks out from the sidebar's right edge, always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ left: collapsed ? "64px" : "256px" }}
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50 items-center justify-center w-4 h-9 bg-[#849C44] rounded-r-md shadow-md hover:bg-[#637d28] hover:w-5 transition-all duration-300"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Icon
          icon="mdi:chevron-left"
          width={13}
          className={`text-white transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#f8f6f0] p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: "Poppins, sans-serif", fontSize: "13px" },
          success: { iconTheme: { primary: "#849C44", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#B83210", secondary: "#fff" } },
        }}
      />
    </div>
  );
}
