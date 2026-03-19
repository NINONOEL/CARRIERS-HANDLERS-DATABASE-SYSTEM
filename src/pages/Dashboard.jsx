import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function parseDateLike(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function ProvinceCarriersChart({ landCounts, waterCounts, compact = false, theme = "light" }) {
  const provinces = MIMAROPA_PROVINCES;
  const totals = provinces.map((p) => (landCounts?.[p] || 0) + (waterCounts?.[p] || 0));
  const maxTotal = Math.max(...totals, 1);

  const barH = compact ? 78 : 160;
  const legendTextCls = theme === "dark" ? "text-white/80" : "text-gray-600";
  const labelTextCls = theme === "dark" ? "text-white/80" : "text-gray-600";

  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {provinces.map((p) => {
          const land = landCounts?.[p] || 0;
          const water = waterCounts?.[p] || 0;
          const total = land + water;

          const landPct = (land / maxTotal) * 100;
          const waterPct = (water / maxTotal) * 100;

          return (
            <div key={p} className="w-12 flex-shrink-0">
              <div
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                style={{ height: barH }}
                title={`${p}\nLand: ${land}\nWater: ${water}\nTotal: ${total}`}
              >
                <div
                  style={{ height: `${landPct}%` }}
                  className="bg-gradient-to-t from-[#F7A825] to-[#D4891A]"
                />
                <div
                  style={{ height: `${waterPct}%` }}
                  className="bg-gradient-to-t from-[#4A90D9] to-[#2C6FAC]"
                />
              </div>
              {!compact && (
                <div className={`text-[10px] mt-1 text-center truncate ${labelTextCls}`} title={p}>
                  {p}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`flex items-center gap-3 mt-2 text-[11px] ${legendTextCls}`}>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#D4891A] inline-block" />
          <span>Land</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#2C6FAC] inline-block" />
          <span>Water</span>
        </div>
      </div>
    </div>
  );
}

function ProvinceValueBarChart({
  countsByProvince,
  colorTop = "#F7A825",
  colorBottom = "#D4891A",
  barHeight = 180,
  showValues = true,
  labelPrefix = "",
}) {
  const provinces = MIMAROPA_PROVINCES;
  const values = provinces.map((p) => countsByProvince?.[p] || 0);
  const maxVal = Math.max(...values, 1);

  const innerH = `${barHeight}px`;

  return (
    <div className="w-full">
      <div className="flex items-end gap-0 overflow-x-auto">
        {provinces.map((p) => {
          const v = countsByProvince?.[p] || 0;
          const pct = (v / maxVal) * 100;
          const short = p
            .replace("Oriental Mindoro", "Oriental…")
            .replace("Occidental Mindoro", "Occidental…");

          return (
            <div key={p} className="flex flex-col items-center w-11 flex-shrink-0">
              {showValues ? (
                <div className="h-5 flex items-center justify-center text-[11px] font-extrabold text-gray-900">
                  {v}
                </div>
              ) : (
                <div className="h-5" />
              )}

              <div
                className="w-11 flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
                style={{ height: innerH }}
              >
                <div
                  style={{
                    height: `${pct}%`,
                    background: `linear-gradient(to top, ${colorBottom}, ${colorTop})`,
                  }}
                  className="mt-auto"
                />
              </div>

              <div
                className="h-9 mt-1 text-[10px] text-center text-gray-600 leading-tight overflow-hidden"
                title={labelPrefix ? `${labelPrefix} - ${p}` : p}
              >
                {short}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function provinceSliceColor(province) {
  // Fixed palette so Land/Water pie charts look consistent.
  const map = {
    "Oriental Mindoro": "#F59E0B", // amber
    "Occidental Mindoro": "#F97316", // orange
    Palawan: "#14B8A6", // teal
    Marinduque: "#3B82F6", // blue
    Romblon: "#8B5CF6", // purple
  };
  return map[province] || "#9CA3AF";
}

function mixHex(hex, mixWith = "#ffffff", amount = 0.25) {
  const toRgb = (h) => {
    const x = h.replace("#", "").trim();
    const full = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const a = toRgb(hex);
  const b = toRgb(mixWith);
  const r = Math.round(a.r * (1 - amount) + b.r * amount);
  const g = Math.round(a.g * (1 - amount) + b.g * amount);
  const bl = Math.round(a.b * (1 - amount) + b.b * amount);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function ProvincePieChart({
  countsByProvince,
  pieSize = 190,
  showLegend = true,
}) {
  const provinces = MIMAROPA_PROVINCES;
  const entries = provinces.map((p) => ({ province: p, value: countsByProvince?.[p] || 0 }));
  const total = entries.reduce((a, e) => a + e.value, 0);
  const footerValue = total;
  const [hovered, setHovered] = useState(null);

  const cx = pieSize / 2;
  const cy = pieSize / 2;
  const rOuter = pieSize * 0.42;
  const rInner = pieSize * 0.24; // donut hole

  const polar = (angleRad, radius) => ({
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  });

  const arcPath = (startRad, endRad) => {
    const startOuter = polar(startRad, rOuter);
    const endOuter = polar(endRad, rOuter);

    const startInner = polar(startRad, rInner);
    const endInner = polar(endRad, rInner);

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${endRad - startRad > Math.PI ? 1 : 0} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${rInner} ${rInner} 0 ${endRad - startRad > Math.PI ? 1 : 0} 0 ${startInner.x} ${startInner.y}`,
      "Z",
    ].join(" ");
  };

  let current = -Math.PI / 2; // start at top

  const slices = entries.map((e) => {
    const frac = total > 0 ? e.value / total : 0;
    const sweep = frac * Math.PI * 2;
    const start = current;
    const end = current + sweep;
    current = end;

    return {
      ...e,
      start,
      end,
      color: provinceSliceColor(e.province),
      d: sweep <= 0 ? null : arcPath(start, end),
    };
  });

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0" style={{ width: pieSize, height: pieSize }}>
          {total <= 0 ? (
            <div className="w-full h-full rounded-full border border-gray-200 bg-white flex items-center justify-center text-[12px] text-gray-500">
              No data
            </div>
          ) : (
          <svg width={pieSize} height={pieSize} viewBox={`0 0 ${pieSize} ${pieSize}`}>
            <defs>
              <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.12" />
              </filter>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
              </linearGradient>
                {provinces.map((p) => {
                  const base = provinceSliceColor(p);
                  const hi = mixHex(base, "#ffffff", 0.35);
                  const lo = mixHex(base, "#000000", 0.08);
                  const id = `sliceGrad-${p.replace(/\s+/g, "-")}`;
                  return (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={hi} />
                      <stop offset="100%" stopColor={lo} />
                    </linearGradient>
                  );
                })}
            </defs>

            {/* Soft ring background */}
            <circle cx={cx} cy={cy} r={rOuter + 2} fill="url(#ringGrad)" opacity="0.9" />

            <g filter="url(#pieShadow)">
              {slices.map((s) => (
                <path
                  key={s.province}
                  d={s.d || undefined}
                    fill={`url(#sliceGrad-${s.province.replace(/\s+/g, "-")})`}
                  stroke="#ffffff"
                    strokeWidth={hovered === s.province ? 3 : 2}
                    strokeLinejoin="round"
                    opacity={s.value > 0 ? (hovered && hovered !== s.province ? 0.55 : 1) : 0.18}
                    style={{ transition: "opacity 180ms ease, stroke-width 180ms ease" }}
                    onMouseEnter={() => setHovered(s.province)}
                    onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>

            {/* Inner cutout */}
              <circle cx={cx} cy={cy} r={rInner} fill="#ffffff" />
            </svg>
          )}

          {/* Center readout (only on hover) */}
          {total > 0 && hovered && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[54%] h-[54%] rounded-full bg-white/90 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center px-2">
                <p className="text-[10px] font-semibold text-gray-500 leading-tight">Province</p>
                <p className="text-[11px] font-extrabold text-gray-800 leading-tight line-clamp-2">
                  {hovered}
                </p>
                <p className="text-lg font-extrabold tabular-nums text-gray-900 leading-tight mt-1">
                  {countsByProvince?.[hovered] || 0}
                </p>
                <p className="text-[10px] text-gray-500 leading-tight">
                  {total > 0 ? Math.round(((countsByProvince?.[hovered] || 0) / total) * 100) : 0}% of total
                </p>
              </div>
            </div>
          )}
        </div>

        {showLegend && (
          <div className="flex-1 pt-1 flex flex-col">
            <div className="space-y-1.5">
              {entries.map((e) => (
                <div key={e.province} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: provinceSliceColor(e.province) }} />
                    <span className="text-[12px] text-gray-700 truncate">{e.province}</span>
                  </div>
                  <span className="w-10 text-right text-[12px] font-extrabold text-gray-900 tabular-nums">
                    {e.value}
                  </span>
                </div>
              ))}
            </div>

            {/* TOTAL aligned under the numbers column */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between gap-3 bg-[#f4f7e8] border border-[#849C44]/20 rounded-lg px-2 py-1.5">
                <span className="text-[11px] font-bold text-[#637d28]">TOTAL</span>
                <span className="w-10 text-right text-[13px] font-extrabold tabular-nums text-gray-900">
                  {footerValue}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ carriers: 0, handlers: 0, land: 0, water: 0, renewal: 0 });
  const [loading, setLoading] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({ carriers: 0, handlers: 0, land: 0, water: 0, renewal: 0 });
  const [carriersProvinceCounts, setCarriersProvinceCounts] = useState({ land: {}, water: {} });
  const [carriersModalOpen, setCarriersModalOpen] = useState(false);
  const [animatedTransport, setAnimatedTransport] = useState({ land: 0, water: 0 });
  const [handlersModalOpen, setHandlersModalOpen] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [handlersProvinceCounts, setHandlersProvinceCounts] = useState(() => {
    const base = {};
    MIMAROPA_PROVINCES.forEach((p) => { base[p] = 0; });
    return base;
  });
  const [animatedHandlersProvinceCounts, setAnimatedHandlersProvinceCounts] = useState(() => {
    const base = {};
    MIMAROPA_PROVINCES.forEach((p) => { base[p] = 0; });
    return base;
  });
  const [animatedNatureByProvince, setAnimatedNatureByProvince] = useState(() => {
    const base = {};
    NATURE_OF_BUSINESS.forEach((k) => {
      base[k] = {};
      MIMAROPA_PROVINCES.forEach((p) => { base[k][p] = 0; });
    });
    return base;
  });
  const [animatedCarriersProvinceCounts, setAnimatedCarriersProvinceCounts] = useState(() => ({
    land:  Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    water: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
  }));
  const [renewalBreakdown, setRenewalBreakdown] = useState(() => ({
    expired: 0,
    due7: 0,
    due15: 0,
    due30: 0,
    byProvince: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    byType: { carriers: 0, handlers: 0 },
    dueByType: {
      due7: { carriers: 0, handlers: 0 },
      due15: { carriers: 0, handlers: 0 },
      due30: { carriers: 0, handlers: 0 },
    },
    byTypeProvince: {
      carriers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      handlers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    },
  }));
  const [animatedRenewalBreakdown, setAnimatedRenewalBreakdown] = useState(() => ({
    expired: 0,
    due7: 0,
    due15: 0,
    due30: 0,
    byProvince: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    byTypeProvince: {
      carriers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      handlers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    },
  }));
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
  const [natureByProvince, setNatureByProvince] = useState(() => {
    const base = {};
    NATURE_OF_BUSINESS.forEach((k) => {
      base[k] = {};
      MIMAROPA_PROVINCES.forEach((p) => { base[k][p] = 0; });
    });
    return base;
  });
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
      renewal: stats.renewal > 0 ? 1 : 0,
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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due7Date = new Date(today);
    due7Date.setDate(due7Date.getDate() + 7);
    const due15Date = new Date(today);
    due15Date.setDate(due15Date.getDate() + 15);
    const renewalDeadline = new Date(today);
    renewalDeadline.setDate(renewalDeadline.getDate() + 30);

    const landByProv = {};
    const waterByProv = {};
    MIMAROPA_PROVINCES.forEach((p) => {
      landByProv[p] = 0;
      waterByProv[p] = 0;
    });

    landSnap.forEach((d) => {
      const prov = d.data()?.province;
      if (prov in landByProv) landByProv[prov] += 1;
    });
    waterSnap.forEach((d) => {
      const prov = d.data()?.province;
      if (prov in waterByProv) waterByProv[prov] += 1;
    });

    setCarriersProvinceCounts({ land: landByProv, water: waterByProv });

    const handlersByProv = {};
    MIMAROPA_PROVINCES.forEach((p) => { handlersByProv[p] = 0; });
    handlerSnap.forEach((d) => {
      const prov = d.data()?.province;
      if (prov in handlersByProv) handlersByProv[prov] += 1;
    });
    setHandlersProvinceCounts(handlersByProv);

    let renewal = 0;
    let expired = 0;
    let due7 = 0;
    let due15 = 0;
    let due30 = 0;
    let renewalCarriers = 0;
    let renewalHandlers = 0;
    const dueByType = {
      due7: { carriers: 0, handlers: 0 },
      due15: { carriers: 0, handlers: 0 },
      due30: { carriers: 0, handlers: 0 },
    };
    const renewalByProvince = Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0]));
    const renewalByTypeProvince = {
      carriers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      handlers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    };
    const countRenewalFromSnap = (snap, sourceType) => {
      snap.forEach((d) => {
        const row = d.data?.() || {};
        const dt = parseDateLike(row.validityDate);
        if (!dt) return;
        const dayOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        if (dayOnly < today) expired += 1;
        if (dayOnly >= today && dayOnly <= due7Date) {
          due7 += 1;
          dueByType.due7[sourceType] += 1;
        }
        if (dayOnly >= today && dayOnly <= due15Date) {
          due15 += 1;
          dueByType.due15[sourceType] += 1;
        }
        if (dayOnly >= today && dayOnly <= renewalDeadline) {
          due30 += 1;
          dueByType.due30[sourceType] += 1;
        }
        if (dayOnly <= renewalDeadline) {
          renewal += 1;
          if (sourceType === "carriers") renewalCarriers += 1;
          if (sourceType === "handlers") renewalHandlers += 1;
          const prov = row?.province;
          if (prov in renewalByProvince) {
            renewalByProvince[prov] += 1;
            renewalByTypeProvince[sourceType][prov] += 1;
          }
        }
      });
    };
    countRenewalFromSnap(landSnap, "carriers");
    countRenewalFromSnap(waterSnap, "carriers");
    countRenewalFromSnap(handlerSnap, "handlers");

    setStats({ carriers: land + water, handlers, land, water, renewal });
    setRenewalBreakdown({
      expired,
      due7,
      due15,
      due30,
      byProvince: renewalByProvince,
      byType: { carriers: renewalCarriers, handlers: renewalHandlers },
      dueByType,
      byTypeProvince: renewalByTypeProvince,
    });

    const normalizedMap = {};
    for (const label of NATURE_OF_BUSINESS) normalizedMap[normalizeNature(label)] = label;

    const nextNature = {};
    const nextNatureByProv = {};
    NATURE_OF_BUSINESS.forEach((k) => {
      nextNature[k] = 0;
      nextNatureByProv[k] = {};
      MIMAROPA_PROVINCES.forEach((p) => { nextNatureByProv[k][p] = 0; });
    });
    let missing = 0;
    let unmatched = 0;
    let matched = 0;
    handlerSnap.forEach((d) => {
      const row = d.data?.() || {};
      const prov = row.province;
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
          if (prov && prov in nextNatureByProv[key]) {
            nextNatureByProv[key][prov] += 1;
          }
        } else {
          unmatched += 1;
        }
      }
      if (!any) missing += 1;
    });
    setNatureCounts(nextNature);
    setNatureByProvince(nextNatureByProv);
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
      animateCountUp({
        from: 0,
        to: stats.renewal || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedStats((prev) => ({ ...prev, renewal: v })),
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
  }, [animateKey, loading, stats.carriers, stats.handlers, stats.land, stats.water, stats.renewal, natureCounts]);

  useEffect(() => {
    if (!carriersModalOpen || loading) return;

    // Reset province counts to 0
    setAnimatedTransport({ land: 0, water: 0 });
    setAnimatedCarriersProvinceCounts({
      land:  Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      water: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
    });

    let animCleanups = [];
    const tid = setTimeout(() => {
      animCleanups = [
        animateCountUp({
          from: 0,
          to: stats.land || 0,
          durationMs: 2000,
          onUpdate: (v) => setAnimatedTransport((prev) => ({ ...prev, land: v })),
        }),
        animateCountUp({
          from: 0,
          to: stats.water || 0,
          durationMs: 2000,
          onUpdate: (v) => setAnimatedTransport((prev) => ({ ...prev, water: v })),
        }),
        ...MIMAROPA_PROVINCES.map((p) =>
          animateCountUp({
            from: 0,
            to: carriersProvinceCounts.land[p] || 0,
            durationMs: 2000,
            onUpdate: (v) => setAnimatedCarriersProvinceCounts((prev) => ({
              ...prev, land: { ...prev.land, [p]: v },
            })),
          })
        ),
        ...MIMAROPA_PROVINCES.map((p) =>
          animateCountUp({
            from: 0,
            to: carriersProvinceCounts.water[p] || 0,
            durationMs: 2000,
            onUpdate: (v) => setAnimatedCarriersProvinceCounts((prev) => ({
              ...prev, water: { ...prev.water, [p]: v },
            })),
          })
        ),
      ];
    }, 30);

    return () => {
      clearTimeout(tid);
      animCleanups.forEach((c) => c && c());
    };
  }, [carriersModalOpen, loading, stats.land, stats.water, carriersProvinceCounts]);

  useEffect(() => {
    if (!handlersModalOpen || loading) return;

    // Reset all modal numbers to 0
    setAnimatedNatureCounts(() => {
      const reset = {};
      NATURE_OF_BUSINESS.forEach((k) => { reset[k] = 0; });
      return reset;
    });
    setAnimatedHandlersProvinceCounts(() => {
      const reset = {};
      MIMAROPA_PROVINCES.forEach((p) => { reset[p] = 0; });
      return reset;
    });
    setAnimatedNatureByProvince(() => {
      const reset = {};
      NATURE_OF_BUSINESS.forEach((k) => {
        reset[k] = {};
        MIMAROPA_PROVINCES.forEach((p) => { reset[k][p] = 0; });
      });
      return reset;
    });

    let animCleanups = [];
    const tid = setTimeout(() => {
      animCleanups = [
        // 6 category totals
        ...NATURE_OF_BUSINESS.map((k) =>
          animateCountUp({
            from: 0,
            to: natureCounts[k] || 0,
            durationMs: 2000,
            onUpdate: (v) => setAnimatedNatureCounts((prev) => ({ ...prev, [k]: v })),
          })
        ),
        // handlers pie chart – province totals
        ...MIMAROPA_PROVINCES.map((p) =>
          animateCountUp({
            from: 0,
            to: handlersProvinceCounts[p] || 0,
            durationMs: 2000,
            onUpdate: (v) => setAnimatedHandlersProvinceCounts((prev) => ({ ...prev, [p]: v })),
          })
        ),
        // per-category per-province breakdown bars
        ...NATURE_OF_BUSINESS.flatMap((k) =>
          MIMAROPA_PROVINCES.map((p) =>
            animateCountUp({
              from: 0,
              to: natureByProvince[k]?.[p] || 0,
              durationMs: 2000,
              onUpdate: (v) =>
                setAnimatedNatureByProvince((prev) => ({
                  ...prev,
                  [k]: { ...prev[k], [p]: v },
                })),
            })
          )
        ),
      ];
    }, 30);

    return () => {
      clearTimeout(tid);
      animCleanups.forEach((c) => c && c());
    };
  }, [handlersModalOpen, loading, natureCounts, handlersProvinceCounts, natureByProvince]);

  useEffect(() => {
    if (!carriersModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setCarriersModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carriersModalOpen]);

  useEffect(() => {
    if (!handlersModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setHandlersModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlersModalOpen]);

  useEffect(() => {
    if (!renewalModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setRenewalModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renewalModalOpen]);

  useEffect(() => {
    if (!renewalModalOpen || loading) return;
    setAnimatedRenewalBreakdown({
      expired: 0,
      due7: 0,
      due15: 0,
      due30: 0,
      byProvince: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      byTypeProvince: {
        carriers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
        handlers: Object.fromEntries(MIMAROPA_PROVINCES.map((p) => [p, 0])),
      },
    });

    const cleanups = [
      animateCountUp({
        from: 0,
        to: renewalBreakdown.expired || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedRenewalBreakdown((prev) => ({ ...prev, expired: v })),
      }),
      animateCountUp({
        from: 0,
        to: renewalBreakdown.due7 || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedRenewalBreakdown((prev) => ({ ...prev, due7: v })),
      }),
      animateCountUp({
        from: 0,
        to: renewalBreakdown.due15 || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedRenewalBreakdown((prev) => ({ ...prev, due15: v })),
      }),
      animateCountUp({
        from: 0,
        to: renewalBreakdown.due30 || 0,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedRenewalBreakdown((prev) => ({ ...prev, due30: v })),
      }),
      ...MIMAROPA_PROVINCES.map((p) =>
        animateCountUp({
          from: 0,
          to: renewalBreakdown.byProvince?.[p] || 0,
          durationMs: 2000,
          onUpdate: (v) =>
            setAnimatedRenewalBreakdown((prev) => ({
              ...prev,
              byProvince: { ...prev.byProvince, [p]: v },
            })),
        })
      ),
      ...MIMAROPA_PROVINCES.map((p) =>
        animateCountUp({
          from: 0,
          to: renewalBreakdown.byTypeProvince?.carriers?.[p] || 0,
          durationMs: 2000,
          onUpdate: (v) =>
            setAnimatedRenewalBreakdown((prev) => ({
              ...prev,
              byTypeProvince: {
                ...prev.byTypeProvince,
                carriers: { ...prev.byTypeProvince.carriers, [p]: v },
              },
            })),
        })
      ),
      ...MIMAROPA_PROVINCES.map((p) =>
        animateCountUp({
          from: 0,
          to: renewalBreakdown.byTypeProvince?.handlers?.[p] || 0,
          durationMs: 2000,
          onUpdate: (v) =>
            setAnimatedRenewalBreakdown((prev) => ({
              ...prev,
              byTypeProvince: {
                ...prev.byTypeProvince,
                handlers: { ...prev.byTypeProvince.handlers, [p]: v },
              },
            })),
        })
      ),
    ];
    return () => cleanups.forEach((c) => c && c());
  }, [renewalModalOpen, loading, renewalBreakdown]);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Carriers */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCarriersModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setCarriersModalOpen(true);
          }}
          className="w-full bg-gradient-to-br from-[#849C44] to-[#637d28] rounded-xl p-4 sm:p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Icon icon="mdi:truck-fast" width={22} />
            </div>
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Land &amp; Water</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{animatedStats.carriers}</p>
          <p className="text-white/85 text-xs mt-1 font-medium">Total Carriers</p>

          <p className="text-white/80 text-[11px] mt-3">
            Click to view Land vs Water by province
          </p>
        </div>

        {/* Total Handlers */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setHandlersModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setHandlersModalOpen(true);
          }}
          className="w-full bg-gradient-to-br from-[#B83210] to-[#8B2510] rounded-xl p-4 sm:p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Icon icon="mdi:account-group" width={22} />
            </div>
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">All Provinces</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{animatedStats.handlers}</p>
          <p className="text-white/85 text-xs mt-1 font-medium">Total Handlers</p>
          <p className="text-white/80 text-[11px] mt-3">
            Click to view Nature of Business categories
          </p>
        </div>

        {/* Expiring / For Renewal */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setRenewalModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setRenewalModalOpen(true);
          }}
          className="w-full bg-gradient-to-br from-[#F7A825] to-[#D4891A] rounded-xl p-4 sm:p-5 text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Icon icon="mdi:calendar-alert" width={22} />
            </div>
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Next 30 Days</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{animatedStats.renewal}</p>
          <p className="text-white/90 text-xs mt-1 font-medium">Expiring / For Renewal</p>
          <p className="text-white/80 text-[11px] mt-3">
            Click to view renewal breakdown by timeline and province
          </p>
        </div>
      </div>

      {/* Carriers Modal */}
      {carriersModalOpen && (
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3"
            onClick={() => setCarriersModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-[#849C44] to-[#637d28] text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:truck-fast" width={22} />
                    <div>
                      <h3 className="font-bold text-lg">Carriers by Province</h3>
                      <p className="text-xs text-white/85">Land and Water transport breakdown</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCarriersModalOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Close"
                  title="Close"
                >
                  <Icon icon="mdi:close" width={20} className="text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-[#F7A825] to-[#D4891A] rounded-xl p-4 text-white shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-white/20 rounded-lg p-2">
                        <Icon icon="mdi:truck" width={20} />
                      </div>
                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Carriers</span>
                    </div>
                    <p className="text-3xl font-extrabold tabular-nums">{animatedTransport.land}</p>
                    <p className="text-white/85 text-xs mt-1 font-medium">Land Transport</p>
                  </div>

                  <div className="bg-gradient-to-br from-[#4A90D9] to-[#2C6FAC] rounded-xl p-4 text-white shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-white/20 rounded-lg p-2">
                        <Icon icon="mdi:ferry" width={20} />
                      </div>
                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Carriers</span>
                    </div>
                    <p className="text-3xl font-extrabold tabular-nums">{animatedTransport.water}</p>
                    <p className="text-white/85 text-xs mt-1 font-medium">Water Transport</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Province Breakdown</p>
                      <p className="text-xs text-gray-500">
                        Separate pie charts for Land and Water by province
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-sm bg-[#D4891A] inline-block" />
                        <p className="text-xs font-bold text-gray-700">Land Transport</p>
                      </div>
                      <ProvincePieChart countsByProvince={animatedCarriersProvinceCounts.land} pieSize={200} showLegend />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-sm bg-[#2C6FAC] inline-block" />
                        <p className="text-xs font-bold text-gray-700">Water Transport</p>
                      </div>
                      <ProvincePieChart countsByProvince={animatedCarriersProvinceCounts.water} pieSize={200} showLegend />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Handlers Modal (Nature of Business) */}
      {handlersModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3"
            onClick={() => setHandlersModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-[#B83210] to-[#8B2510] text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:account-group" width={22} />
                    <div>
                      <h3 className="font-bold text-lg">Handlers – Nature of Business</h3>
                      <p className="text-xs text-white/85">Category counts (auto-updates after edits)</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHandlersModalOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Close"
                  title="Close"
                >
                  <Icon icon="mdi:close" width={20} className="text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-gray-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {NATURE_OF_BUSINESS.map((label) => {
                    const provCounts = animatedNatureByProvince[label] || {};
                    return (
                      <div
                        key={label}
                        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500">Category</p>
                            <p className="text-sm font-bold text-gray-800 leading-snug">{label}</p>
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-[#fff3f0] border border-[#B83210]/20 flex items-center justify-center flex-shrink-0">
                            <Icon icon="mdi:briefcase" width={18} className="text-[#B83210]" />
                          </div>
                        </div>

                        {/* Total */}
                        <div className="mt-3 flex items-end justify-between">
                          <p className="text-2xl font-extrabold tabular-nums text-gray-900">
                            {animatedNatureCounts[label] ?? 0}
                          </p>
                          <p className="text-xs text-gray-500">total handlers</p>
                        </div>

                        {/* Province breakdown */}
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                          {MIMAROPA_PROVINCES.map((prov) => {
                            const count = provCounts[prov] || 0;
                            const total = natureCounts[label] || 1;
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={prov} className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-600 truncate flex-1 min-w-0">{prov}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#B83210] to-[#8B2510]"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-6 text-right text-[11px] font-bold tabular-nums text-gray-800">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Handlers by Province - Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#fff3f0] border border-[#B83210]/20 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:chart-pie" width={18} className="text-[#B83210]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Total Handlers by Province</p>
                      <p className="text-xs text-gray-500">Distribution across all MIMAROPA provinces</p>
                    </div>
                  </div>
                  <ProvincePieChart
                    countsByProvince={animatedHandlersProvinceCounts}
                    pieSize={200}
                    showLegend
                  />
                </div>

                <div className="text-[11px] text-gray-500">
                  {natureMeta.missing > 0 || natureMeta.unmatched > 0 ? (
                    <>
                      Note: {natureMeta.missing} record(s) have no Nature of Business, and {natureMeta.unmatched} record(s) have values that don’t match the 6 categories.
                    </>
                  ) : (
                    <>All handler records with Nature of Business are matched to the 6 categories.</>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Renewal Modal */}
      {renewalModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3"
            onClick={() => setRenewalModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-[#F7A825] to-[#D4891A] text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:calendar-alert" width={22} />
                    <div>
                      <h3 className="font-bold text-lg">Expiring / For Renewal</h3>
                      <p className="text-xs text-white/90">Live data from carriers and handlers records</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewalModalOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Close"
                  title="Close"
                >
                  <Icon icon="mdi:close" width={20} className="text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-gray-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-red-300 bg-red-50/50 p-3 shadow-sm min-h-[96px] flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center mb-2">
                      <Icon icon="mdi:alert-circle" width={18} className="text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-red-700 leading-tight">TOTAL EXPIRED</p>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 leading-tight mt-1">{animatedRenewalBreakdown.expired}</p>
                  </div>
                  <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 shadow-sm min-h-[96px] flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center mb-2">
                      <Icon icon="mdi:calendar-clock" width={18} className="text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-amber-700 leading-tight">Expiring in 7 days</p>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 leading-tight mt-1">{animatedRenewalBreakdown.due7}</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-tight">
                      Carriers: {renewalBreakdown.dueByType.due7.carriers} • Handlers: {renewalBreakdown.dueByType.due7.handlers}
                    </p>
                  </div>
                  <div className="rounded-xl border border-orange-300 bg-orange-50/50 p-3 shadow-sm min-h-[96px] flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center mb-2">
                      <Icon icon="mdi:calendar" width={18} className="text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-orange-700 leading-tight">Expiring in 15 days</p>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 leading-tight mt-1">{animatedRenewalBreakdown.due15}</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-tight">
                      Carriers: {renewalBreakdown.dueByType.due15.carriers} • Handlers: {renewalBreakdown.dueByType.due15.handlers}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#849C44]/35 bg-[#f4f7e8] p-3 shadow-sm min-h-[96px] flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-xl bg-[#849C44] flex items-center justify-center mb-2">
                      <Icon icon="mdi:calendar-check" width={18} className="text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-[#637d28] leading-tight">Expiring in 30 days</p>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 leading-tight mt-1">{animatedRenewalBreakdown.due30}</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-tight">
                      Carriers: {renewalBreakdown.dueByType.due30.carriers} • Handlers: {renewalBreakdown.dueByType.due30.handlers}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Carriers Renewal by Province</p>
                        <p className="text-xs text-gray-500">Expired + expiring within 30 days</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#637d28] bg-[#f4f7e8] border border-[#849C44]/20 rounded-md px-2 py-1">
                        Total {renewalBreakdown.byType.carriers}
                      </span>
                    </div>
                    <ProvincePieChart
                      countsByProvince={animatedRenewalBreakdown.byTypeProvince.carriers}
                      pieSize={190}
                      showLegend
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Handlers Renewal by Province</p>
                        <p className="text-xs text-gray-500">Expired + expiring within 30 days</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#8B2510] bg-[#fff3f0] border border-[#B83210]/20 rounded-md px-2 py-1">
                        Total {renewalBreakdown.byType.handlers}
                      </span>
                    </div>
                    <ProvincePieChart
                      countsByProvince={animatedRenewalBreakdown.byTypeProvince.handlers}
                      pieSize={190}
                      showLegend
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-500">
                  Definitions: Expired means validity date is before today. Expiring means validity date is today up to the next 30 days.
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

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
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
              >
                <Icon icon="mdi:chart-box-outline" width={14} />
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
                  <p className="text-[11px] text-gray-500">Open Land form by province</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/carriers/summary")}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4f651f] bg-[#f4f7e8] border border-[#849C44]/35 hover:bg-[#e9f0d6] hover:border-[#849C44]/55 px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
              >
                <Icon icon="mdi:chart-box-outline" width={14} />
                View summary
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MIMAROPA_PROVINCES.map((prov) => {
                const c = PROVINCE_COLORS[prov];
                return (
                  <button
                    key={`carriers-${prov}`}
                    onClick={() => navigate(`/carriers/land?province=${encodeURIComponent(prov)}`)}
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
