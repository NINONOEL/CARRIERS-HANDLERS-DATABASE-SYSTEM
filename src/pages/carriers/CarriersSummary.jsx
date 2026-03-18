import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Icon } from "@iconify/react";
import { MIMAROPA_PROVINCES, PROVINCE_COLORS } from "../../constants/mimaropa";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCountUp({ from, to, durationMs, onUpdate }) {
  // Match Dashboard behavior: avoid flashing `0` at start.
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

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${color}`}>
      <Icon icon={icon} width={18} />
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function CarriersSummary() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ land: 0, water: 0 });
  const [animateKey, setAnimateKey] = useState(0);
  const [animatedTotals, setAnimatedTotals] = useState({ total: 0, land: 0, water: 0, expired: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [landSnap, waterSnap] = await Promise.all([
          getDocs(collection(db, "carriers_land")),
          getDocs(collection(db, "carriers_water")),
        ]);

        const combined = {};
        MIMAROPA_PROVINCES.forEach((p) => {
          combined[p] = {
            land: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
            water: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
          };
        });

        landSnap.forEach((doc) => {
          const d = doc.data();
          const prov = d.province;
          if (combined[prov]) {
            combined[prov].land.total++;
            if (d.typeOfApplication === "New")   combined[prov].land.new++;
            if (d.typeOfApplication === "Renew") combined[prov].land.renew++;
            if (d.validity === "Updated") combined[prov].land.updated++;
            if (d.validity === "Expired") combined[prov].land.expired++;
          }
        });

        waterSnap.forEach((doc) => {
          const d = doc.data();
          const prov = d.province;
          if (combined[prov]) {
            combined[prov].water.total++;
            if (d.typeOfApplication === "New")   combined[prov].water.new++;
            if (d.typeOfApplication === "Renew") combined[prov].water.renew++;
            if (d.validity === "Updated") combined[prov].water.updated++;
            if (d.validity === "Expired") combined[prov].water.expired++;
          }
        });

        setData(combined);
        setTotals({ land: landSnap.size, water: waterSnap.size });
      } catch (e) {
        console.error(e);
        const empty = {};
        MIMAROPA_PROVINCES.forEach((p) => {
          empty[p] = {
            land: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
            water: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
          };
        });
        setData(empty);
        setTotals({ land: 0, water: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const handler = () => {
      setAnimateKey((k) => k + 1);
    };
    window.addEventListener("carriers:summary:animate", handler);
    return () => window.removeEventListener("carriers:summary:animate", handler);
  }, []);

  useEffect(() => {
    if (loading) return;

    const expiredTarget = MIMAROPA_PROVINCES.reduce(
      (a, p) => a + (data[p]?.land.expired || 0) + (data[p]?.water.expired || 0),
      0
    );
    const totalTarget = (totals.land || 0) + (totals.water || 0);
    const landTarget = totals.land || 0;
    const waterTarget = totals.water || 0;

    const cleanups = [
      animateCountUp({
        from: 0,
        to: totalTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, total: v })),
      }),
      animateCountUp({
        from: 0,
        to: landTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, land: v })),
      }),
      animateCountUp({
        from: 0,
        to: waterTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, water: v })),
      }),
      animateCountUp({
        from: 0,
        to: expiredTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, expired: v })),
      }),
    ];

    return () => cleanups.forEach((c) => c && c());
  }, [animateKey, loading, data, totals.land, totals.water]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Icon icon="mdi:loading" width={32} className="animate-spin text-[#849C44]" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#849C44] to-[#637d28] rounded-xl p-4 text-white col-span-2 sm:col-span-1">
          <Icon icon="mdi:truck-fast" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.total}</p>
          <p className="text-xs text-white/80">Total Carriers</p>
        </div>
        <div className="bg-[#F7A825] rounded-xl p-4 text-white">
          <Icon icon="mdi:truck" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.land}</p>
          <p className="text-xs text-white/80">Land Transport</p>
        </div>
        <div className="bg-[#4A90D9] rounded-xl p-4 text-white">
          <Icon icon="mdi:ferry" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.water}</p>
          <p className="text-xs text-white/80">Water Transport</p>
        </div>
        <div className="bg-[#B83210] rounded-xl p-4 text-white">
          <Icon icon="mdi:alert-circle" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.expired}</p>
          <p className="text-xs text-white/80">Expired</p>
        </div>
      </div>

      {/* Province Tables */}
      <div className="space-y-4">
        {MIMAROPA_PROVINCES.map((prov) => {
          const c = PROVINCE_COLORS[prov] || {};
          const d = data[prov] || {
            land: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
            water: { new: 0, renew: 0, updated: 0, expired: 0, total: 0 },
          };
          const land = d.land || { new: 0, renew: 0, updated: 0, expired: 0, total: 0 };
          const water = d.water || { new: 0, renew: 0, updated: 0, expired: 0, total: 0 };
          return (
            <div key={prov} className={`bg-white rounded-xl border ${c.border || "border-gray-200"} shadow-sm overflow-hidden`}>
              <div className={`${c.bg || "bg-gray-50"} px-5 py-3 flex items-center gap-2`}>
                <Icon icon="mdi:map-marker" width={18} className={c.text || "text-gray-700"} />
                <h3 className={`font-bold text-sm ${c.text || "text-gray-700"}`}>{prov}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Transport Type</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">New</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Renew</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Updated</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Expired</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Land Transport", key: "land", icon: "mdi:truck", counts: land },
                      { label: "Water Transport", key: "water", icon: "mdi:ferry", counts: water },
                    ].map((row) => (
                      <tr key={row.key} className="border-b border-gray-50 record-row">
                        <td className="px-4 py-2.5 flex items-center gap-1.5 font-medium text-gray-700">
                          <Icon icon={row.icon} width={14} className="text-[#849C44]" /> {row.label}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{row.counts.new}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{row.counts.renew}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{row.counts.updated}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{row.counts.expired}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-700">
                          {row.counts.total ?? 0}
                        </td>
                      </tr>
                    ))}
                    <tr className={`${c.bg || "bg-gray-50"} font-semibold`}>
                      <td className={`px-4 py-2.5 ${c.text || "text-gray-700"} font-bold`}>Province Total</td>
                      <td className="px-4 py-2.5 text-center text-blue-700 font-bold">{land.new + water.new}</td>
                      <td className="px-4 py-2.5 text-center text-purple-700 font-bold">{land.renew + water.renew}</td>
                      <td className="px-4 py-2.5 text-center text-green-700 font-bold">{land.updated + water.updated}</td>
                      <td className="px-4 py-2.5 text-center text-red-700 font-bold">{land.expired + water.expired}</td>
                      <td className={`px-4 py-2.5 text-center font-bold ${c.text || "text-gray-700"}`}>{(land.total ?? 0) + (water.total ?? 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
