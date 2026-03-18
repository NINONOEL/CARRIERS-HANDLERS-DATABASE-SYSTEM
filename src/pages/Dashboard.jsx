import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { Icon } from "@iconify/react";
import { MIMAROPA_PROVINCES, PROVINCE_COLORS, NATURE_OF_BUSINESS } from "../constants/mimaropa";
import { useNavigate } from "react-router-dom";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCountUp({ from, to, durationMs, onUpdate }) {
  // Avoid flashing `0` at the start of the animation.
  // If we're counting up from 0 to a positive number, start displaying `1` immediately.
  let startFrom = from;
  if (from === 0 && to > 0) {
    startFrom = 1;
    onUpdate(1);
  }

  const start = performance.now();
  const diff = to - startFrom;

  let rafId = 0;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = easeOutCubic(t);
    const value = Math.round(startFrom + diff * eased);
    onUpdate(value);
    if (t < 1) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

function normalizeNature(v) {
  if (!v) return "";
  return String(v)
    .trim()
    .toLowerCase()
    // normalize separators/spacing
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s+and\s+/g, " & ")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export default function Dashboard() {
  const [stats, setStats] = useState({ carriers: 0, handlers: 0, land: 0, water: 0 });
  const [loading, setLoading] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({ carriers: 0, handlers: 0, land: 0, water: 0 });
  const [natureCounts, setNatureCounts] = useState(() => {
    const base = {};
    NATURE_OF_BUSINESS.forEach((k) => { base[k] = 0; });
    return base;
  });
  const [animatedNatureCounts, setAnimatedNatureCounts] = useState(() => {
    const base = {};
    NATURE_OF_BUSINESS.forEach((k) => { base[k] = 0; });
    return base;
  });
  const [natureMeta, setNatureMeta] = useState({ missing: 0, unmatched: 0, matched: 0 });
  const navigate = useNavigate();
  const [animateKey, setAnimateKey] = useState(0);

  const resetAndAnimate = () => {
    // Match Summary behavior even when Dashboard doesn't remount:
    // reset displayed numbers before re-running the animation,
    // but avoid a visible `0` flash by immediately seeding `1` when target > 0.
    setAnimatedStats({
      carriers: stats.carriers > 0 ? 1 : 0,
      land: stats.land > 0 ? 1 : 0,
      water: stats.water > 0 ? 1 : 0,
      handlers: stats.handlers > 0 ? 1 : 0,
    });
    setAnimatedNatureCounts((prev) => {
      const next = { ...prev };
      for (const k of NATURE_OF_BUSINESS) next[k] = (natureCounts[k] || 0) > 0 ? 1 : 0;
      return next;
    });
    setAnimateKey((k) => k + 1);
  };

  const fetchStats = async () => {
    const [landSnap, waterSnap, handlerSnap] = await Promise.all([
      getDocs(collection(db, "carriers_land")),
      getDocs(collection(db, "carriers_water")),
      getDocs(collection(db, "handlers")),
    ]);

    const land = landSnap.size;
    const water = waterSnap.size;
    const handlers = handlerSnap.size;
    setStats({ carriers: land + water, handlers, land, water });

    const normalizedMap = {};
    for (const label of NATURE_OF_BUSINESS) normalizedMap[normalizeNature(label)] = label;

    const nextNature = {};
    NATURE_OF_BUSINESS.forEach((k) => { nextNature[k] = 0; });
    let missing = 0;
    let unmatched = 0;
    let matched = 0;
    handlerSnap.forEach((d) => {
      const row = d.data?.() || {};
      const raw =
        row.natureOfBusiness ??
        row.nature_of_business ??
        row.natureOfBusinessType ??
        row.nature;
      const values = Array.isArray(raw) ? raw : [raw];
      let any = false;
      for (const item of values) {
        const normalized = normalizeNature(item);
        if (!normalized) continue;
        any = true;
        const key = normalizedMap[normalized];
        if (key) {
          nextNature[key] += 1;
          matched += 1;
        } else {
          unmatched += 1;
        }
      }
      if (!any) missing += 1;
    });
    setNatureCounts(nextNature);
    setNatureMeta({ missing, unmatched, matched });
  };

  useEffect(() => {
    // Start animation ASAP when Dashboard is visited.
    resetAndAnimate();
    (async () => {
      try {
        await fetchStats();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const cleanups = [
      animateCountUp({
        from: 0,
        to: stats.carriers || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedStats((prev) => ({ ...prev, carriers: v })),
      }),
      animateCountUp({
        from: 0,
        to: stats.land || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedStats((prev) => ({ ...prev, land: v })),
      }),
      animateCountUp({
        from: 0,
        to: stats.water || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedStats((prev) => ({ ...prev, water: v })),
      }),
      animateCountUp({
        from: 0,
        to: stats.handlers || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedStats((prev) => ({ ...prev, handlers: v })),
      }),
      ...NATURE_OF_BUSINESS.map((k) =>
        animateCountUp({
          from: 0,
          to: natureCounts[k] || 0,
          durationMs: 2000,
          onUpdate: (v) => setAnimatedNatureCounts((prev) => ({ ...prev, [k]: v })),
        })
      ),
    ];

    return () => cleanups.forEach((c) => c && c());
  }, [animateKey, loading, stats.carriers, stats.handlers, stats.land, stats.water, natureCounts]);

  useEffect(() => {
    // Re-trigger animation even if user clicks "Dashboard" while already on it.
    const handler = async () => {
      // Refresh data so counts reflect recently edited/saved records.
      try {
        await fetchStats();
      } catch (e) {
        console.error(e);
      }
      resetAndAnimate();
    };
    window.addEventListener("dashboard:animate", handler);
    return () => window.removeEventListener("dashboard:animate", handler);
  }, []);

  const cards = [
    { label: "Total Carriers",       value: animatedStats.carriers, icon: "mdi:truck-fast",       color: "from-[#849C44] to-[#637d28]",  sub: "Land & Water" },
    { label: "Land Transport",       value: animatedStats.land,     icon: "mdi:truck",             color: "from-[#F7A825] to-[#D4891A]",  sub: "Carriers" },
    { label: "Water Transport",      value: animatedStats.water,    icon: "mdi:ferry",             color: "from-[#4A90D9] to-[#2C6FAC]",  sub: "Carriers" },
    { label: "Total Handlers",       value: animatedStats.handlers, icon: "mdi:account-group",     color: "from-[#B83210] to-[#8B2510]",  sub: "All Provinces" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#849C44] to-[#637d28] rounded-2xl p-4 sm:p-6 text-white shadow-lg flex items-center gap-4 sm:gap-6">
        <img src="/DALOGO.jpg" alt="DA MIMAROPA" className="w-20 h-20 rounded-full border-4 border-white/30 object-cover hidden sm:block" />
        <div>
          <h2 className="text-2xl font-bold leading-tight">Carriers & Handlers Database</h2>
          <p className="text-white/85 text-sm mt-1">Department of Agriculture – MIMAROPA Region | Regulatory Division</p>
          <p className="text-white/70 text-xs mt-2">Manage and monitor carrier & handler registrations across the MIMAROPA provinces.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 sm:p-5 text-white shadow-md`}>
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Icon icon={c.icon} width={22} />
              </div>
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{c.sub}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">{c.value}</p>
            <p className="text-white/85 text-xs mt-1 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Handlers — Nature of Business */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Icon icon="mdi:briefcase" width={18} className="text-[#849C44]" />
          Handlers – Nature of Business
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NATURE_OF_BUSINESS.map((label) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500">Category</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{label}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#f4f7e8] border border-[#849C44]/25 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:account-group" width={18} className="text-[#637d28]" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-extrabold tabular-nums text-gray-900">
                  {animatedNatureCounts[label] ?? 0}
                </p>
                <p className="text-xs text-gray-500">handlers</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          {natureMeta.missing > 0 || natureMeta.unmatched > 0 ? (
            <>
              Note: {natureMeta.missing} record(s) have no Nature of Business, and {natureMeta.unmatched} record(s) have values that don’t match the 6 categories.
            </>
          ) : (
            <>All handler records with Nature of Business are matched to the 6 categories.</>
          )}
        </p>
      </div>

      {/* Province Quick Access */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Icon icon="mdi:map" width={18} className="text-[#849C44]" />
          MIMAROPA Provinces – Quick Access
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Handlers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Icon icon="mdi:account-group" width={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">Handlers</p>
                  <p className="text-[11px] text-gray-500">Per province quick access</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/handlers/summary")}
                className="text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md transition-all"
              >
                View summary
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MIMAROPA_PROVINCES.map((prov) => {
                const c = PROVINCE_COLORS[prov];
                return (
                  <button
                    key={`handlers-${prov}`}
                    onClick={() => navigate(`/handlers/${prov}`)}
                    className={`province-card ${c.bg} border ${c.border} rounded-xl p-4 text-left`}
                  >
                    <div className={`w-8 h-8 ${c.icon} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon icon="mdi:map-marker" width={16} className="text-white" />
                    </div>
                    <p className={`text-xs font-semibold ${c.text} leading-tight`}>{prov}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carriers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#f4f7e8] rounded-lg flex items-center justify-center">
                  <Icon icon="mdi:truck-fast" width={18} className="text-[#849C44]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">Carriers</p>
                  <p className="text-[11px] text-gray-500">Filter registry by province</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/registry/carriers")}
                className="text-[11px] text-[#637d28] hover:text-[#4c5f1d] hover:bg-[#f4f7e8] px-2 py-1 rounded-md transition-all"
              >
                Open registry
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MIMAROPA_PROVINCES.map((prov) => {
                const c = PROVINCE_COLORS[prov];
                return (
                  <button
                    key={`carriers-${prov}`}
                    onClick={() => navigate(`/registry/carriers?province=${encodeURIComponent(prov)}`)}
                    className={`province-card ${c.bg} border ${c.border} rounded-xl p-4 text-left`}
                  >
                    <div className={`w-8 h-8 ${c.icon} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon icon="mdi:map-marker" width={16} className="text-white" />
                    </div>
                    <p className={`text-xs font-semibold ${c.text} leading-tight`}>{prov}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
