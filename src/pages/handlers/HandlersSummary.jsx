import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Icon } from "@iconify/react";
import { MIMAROPA_PROVINCES, PROVINCE_COLORS, NATURE_OF_BUSINESS } from "../../constants/mimaropa";

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

export default function HandlersSummary() {
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal]   = useState(0);
  const [animateKey, setAnimateKey] = useState(0);
  const [animatedTotals, setAnimatedTotals] = useState({ total: 0, newApps: 0, renew: 0, expired: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "handlers"));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const combined = {};
        MIMAROPA_PROVINCES.forEach((p) => {
          combined[p] = { new: 0, renew: 0, updated: 0, expired: 0, total: 0 };
        });
        snap.forEach((doc) => {
          const d = doc.data();
          const prov = d.province;
          if (combined[prov]) {
            combined[prov].total++;
            if (d.typeOfApplication === "New")   combined[prov].new++;
            if (d.typeOfApplication === "Renew") combined[prov].renew++;
            if (d.validity === "Updated") combined[prov].updated++;
            const dt = parseDateLike(d.validityDate);
            if (dt) {
              const dayOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
              if (dayOnly < today) combined[prov].expired++;
            }
          }
        });
        setData(combined);
        setTotal(snap.size);
      } catch (e) {
        console.error(e);
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
    window.addEventListener("handlers:summary:animate", handler);
    return () => window.removeEventListener("handlers:summary:animate", handler);
  }, []);

  useEffect(() => {
    if (loading) return;

    const newTarget = MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.new || 0), 0);
    const renewTarget = MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.renew || 0), 0);
    const expiredTarget = MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.expired || 0), 0);
    const totalTarget = total || 0;

    const cleanups = [
      animateCountUp({
        from: 0,
        to: totalTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, total: v })),
      }),
      animateCountUp({
        from: 0,
        to: newTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, newApps: v })),
      }),
      animateCountUp({
        from: 0,
        to: renewTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, renew: v })),
      }),
      animateCountUp({
        from: 0,
        to: expiredTarget,
        durationMs: 2000,
        onUpdate: (v) => setAnimatedTotals((prev) => ({ ...prev, expired: v })),
      }),
    ];

    return () => cleanups.forEach((c) => c && c());
  }, [animateKey, loading, data, total]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Icon icon="mdi:loading" width={32} className="animate-spin text-[#849C44]" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-[#F7A825] to-[#D4891A] rounded-xl p-4 text-white col-span-2 sm:col-span-1">
          <Icon icon="mdi:account-group" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.total}</p>
          <p className="text-xs text-white/80">Total Handlers</p>
        </div>
        <div className="bg-blue-500 rounded-xl p-4 text-white">
          <Icon icon="mdi:plus-circle" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.newApps}</p>
          <p className="text-xs text-white/80">New Applications</p>
        </div>
        <div className="bg-purple-500 rounded-xl p-4 text-white">
          <Icon icon="mdi:refresh" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.renew}</p>
          <p className="text-xs text-white/80">Renewals</p>
        </div>
        <div className="bg-[#B83210] rounded-xl p-4 text-white">
          <Icon icon="mdi:alert-circle" width={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold tabular-nums">{animatedTotals.expired}</p>
          <p className="text-xs text-white/80">Expired</p>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#F7A825] to-[#D4891A] px-5 py-3 flex items-center gap-2">
          <Icon icon="mdi:account-group" width={18} className="text-white" />
          <h3 className="font-bold text-white text-sm">Handlers Summary by Province</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Province</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">New</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Renew</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Updated</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Expired</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {MIMAROPA_PROVINCES.map((prov) => {
                const d = data[prov];
                const c = PROVINCE_COLORS[prov];
                return (
                  <tr key={prov} className="border-b border-gray-50 record-row">
                    <td className={`px-4 py-2.5 font-semibold ${c.text} flex items-center gap-1.5`}>
                      <Icon icon="mdi:map-marker" width={13} /> {prov}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{d?.new || 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{d?.renew || 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{d?.updated || 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{d?.expired || 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-700">{d?.total ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t-2 border-amber-200">
                <td className="px-4 py-2.5 font-bold text-amber-800">TOTAL</td>
                <td className="px-4 py-2.5 text-center font-bold text-blue-700">{MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.new || 0), 0)}</td>
                <td className="px-4 py-2.5 text-center font-bold text-purple-700">{MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.renew || 0), 0)}</td>
                <td className="px-4 py-2.5 text-center font-bold text-green-700">{MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.updated || 0), 0)}</td>
                <td className="px-4 py-2.5 text-center font-bold text-red-700">{MIMAROPA_PROVINCES.reduce((a, p) => a + (data[p]?.expired || 0), 0)}</td>
                <td className="px-4 py-2.5 text-center font-bold text-amber-800">{total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
