import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { sanitizeForFirestore } from "../../firebase/utils";
import { Icon } from "@iconify/react";
import { MIMAROPA_PROVINCES, MUNICIPALITIES, BODY_TYPES, PROVINCE_COLORS } from "../../constants/mimaropa";
import { FormField, inputCls } from "../../components/shared/FormField";
import Select from "../../components/shared/Select";
import toast from "react-hot-toast";

const transportLabel = { land: "Land Transport", water: "Water Transport" };
const transportIcon  = { land: "mdi:truck",       water: "mdi:ferry" };

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCountUp({ from, to, durationMs, onUpdate }) {
  // Match Summary behavior: avoid flashing 0 at start.
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

const emptyForm = {
  nameOfEstablishment: "",
  lastName: "", firstName: "", middleInitial: "",
  province: "", municipality: "", barangay: "",
  sex: "", birthDate: "",
  phoneNo: "", email: "",
  registrationNumber: "",
  plateNo: "",
  bodyType: "",
  typeOfApplication: "",
  validityDate: "", validity: "",
};

export default function CarriersPage({ type }) {
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [count, setCount]   = useState({});
  const [animatedCount, setAnimatedCount] = useState({});
  const collectionName = `carriers_${type}`;

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const snap = await getDocs(collection(db, collectionName));
        const c = {};
        snap.forEach((doc) => {
          const p = doc.data().province;
          c[p] = (c[p] || 0) + 1;
        });
        setCount(c);
      } catch (e) { console.error(e); }
    };
    fetchCounts();
  }, [collectionName]);

  useEffect(() => {
    if (selectedProvince) return;

    // Reset displayed counts and animate each province card.
    setAnimatedCount({});
    const cleanups = [];
    for (const prov of MIMAROPA_PROVINCES) {
      const target = count?.[prov] || 0;
      cleanups.push(
        animateCountUp({
          from: 0,
          to: target,
          durationMs: 2000,
          onUpdate: (v) => setAnimatedCount((prev) => ({ ...prev, [prov]: v })),
        })
      );
    }
    return () => cleanups.forEach((c) => c && c());
  }, [type, selectedProvince, count]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "province") updated.municipality = "";
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lastName || !form.firstName || !form.province || !form.municipality) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const snap = await getDocs(query(collection(db, collectionName), where("province", "==", form.province)));
      const no = snap.size + 1;
      const payload = sanitizeForFirestore({
        ...form,
        no,
        transportType: type,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, collectionName), payload);
      toast.success("Record saved successfully!");
      setCount((prev) => ({ ...prev, [form.province]: (prev[form.province] || 0) + 1 }));
      setForm({ ...emptyForm, province: form.province, municipality: form.municipality });
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Failed to save record.";
      toast.error(msg.includes("permission") ? "Permission denied. Update Firestore rules (see firestore.rules)." : msg);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProvince) {
    return (
      <div className="space-y-5">
        <div className={`flex items-center gap-3 bg-gradient-to-r ${type === "land" ? "from-[#849C44] to-[#637d28]" : "from-[#4A90D9] to-[#2C6FAC]"} rounded-xl p-5 text-white shadow-md`}>
          <Icon icon={transportIcon[type]} width={32} />
          <div>
            <h2 className="text-xl font-bold">{transportLabel[type]} – Carriers</h2>
            <p className="text-white/80 text-sm">Select a province to add or view carrier records</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MIMAROPA_PROVINCES.map((prov) => {
            const c = PROVINCE_COLORS[prov];
            return (
              <button
                key={prov}
                onClick={() => { setSelectedProvince(prov); setForm({ ...emptyForm, province: prov }); }}
                className={`province-card ${c.bg} border-2 ${c.border} rounded-xl p-5 text-left`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon icon="mdi:map-marker" width={20} className="text-white" />
                  </div>
                  <span className={`text-xs font-bold ${c.text} bg-white/60 px-2 py-0.5 rounded-full`}>
                    {animatedCount[prov] ?? 0} records
                  </span>
                </div>
                <p className={`font-bold ${c.text} text-base`}>{prov}</p>
                <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                  <Icon icon={transportIcon[type]} width={12} />
                  {transportLabel[type]}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const c = PROVINCE_COLORS[selectedProvince];

  return (
    <div className="space-y-4">
      {/* Back & Title */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setSelectedProvince(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          aria-label="Back to provinces"
        >
          <span className="w-7 h-7 rounded-lg bg-[#f4f7e8] flex items-center justify-center">
            <Icon icon="mdi:arrow-left" width={18} className="text-[#637d28]" />
          </span>
          <span className="leading-none">Back</span>
        </button>
        <div className={`flex items-center gap-2 ${c.bg} border ${c.border} rounded-lg px-3 py-1.5`}>
          <Icon icon="mdi:map-marker" width={16} className={c.text} />
          <span className={`text-xs font-bold ${c.text}`}>{selectedProvince}</span>
        </div>
        <div className={`flex items-center gap-2 ${type === "land" ? "bg-[#f4f7e8]" : "bg-blue-50"} rounded-lg px-3 py-1.5`}>
          <Icon icon={transportIcon[type]} width={16} className={type === "land" ? "text-[#849C44]" : "text-blue-600"} />
          <span className={`text-xs font-bold ${type === "land" ? "text-[#849C44]" : "text-blue-600"}`}>{transportLabel[type]}</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={`${c.bg} border-b ${c.border} px-4 sm:px-6 py-4 flex items-center gap-3`}>
          <Icon icon={transportIcon[type]} width={22} className={c.text} />
          <div className="min-w-0">
            <h3 className={`font-bold ${c.text} leading-tight`}>New Carrier Record – {selectedProvince}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill out the required fields then click <span className="font-semibold">Save Record</span>.
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4">
          {/* Name of Establishment */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:storefront" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Establishment</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name of Establishment" required className="sm:col-span-2">
                <input name="nameOfEstablishment" value={form.nameOfEstablishment} onChange={handleChange} placeholder="Enter establishment name" className={inputCls} />
              </FormField>
            </div>
          </div>

          {/* Applicant */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:account" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Applicant</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Last Name" required>
                <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className={inputCls} />
              </FormField>
              <FormField label="First Name" required>
                <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" className={inputCls} />
              </FormField>
              <FormField label="M.I.">
                <input name="middleInitial" value={form.middleInitial} onChange={handleChange} placeholder="M.I." className={inputCls} maxLength={3} />
              </FormField>
            </div>
          </div>

          {/* Business Address */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:map-marker" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Business Address</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Province" required>
                <Select
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  options={MIMAROPA_PROVINCES.map((p) => ({ value: p, label: p }))}
                  placeholder="Select Province"
                />
              </FormField>
              <FormField label="Municipality" required>
                <Select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  disabled={!form.province}
                  options={(MUNICIPALITIES[form.province] || []).map((m) => ({ value: m, label: m }))}
                  placeholder="Select Municipality"
                />
              </FormField>
              <FormField label="Barangay">
                <input name="barangay" value={form.barangay} onChange={handleChange} placeholder="Barangay" className={inputCls} />
              </FormField>
            </div>
          </div>

          {/* Personal Info */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:card-account-details" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Personal Info</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField label="Sex">
                <Select
                  name="sex"
                  value={form.sex}
                  onChange={handleChange}
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                  placeholder="Select"
                />
              </FormField>
              <FormField label="Birth Date">
                <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className={inputCls} />
              </FormField>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:phone" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Details</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Phone No.">
                <input name="phoneNo" value={form.phoneNo} onChange={handleChange} placeholder="09XX-XXX-XXXX" className={inputCls} />
              </FormField>
              <FormField label="Email">
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className={inputCls} />
              </FormField>
            </div>
          </div>

          {/* Transport Info */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon={transportIcon[type]} width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Transport Information</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Registration Number">
                <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="Reg. No." className={inputCls} />
              </FormField>
              <FormField label="Plate No.">
                <input name="plateNo" value={form.plateNo} onChange={handleChange} placeholder="Plate No." className={inputCls} />
              </FormField>
              <FormField label="Body Type">
                <input name="bodyType" value={form.bodyType} onChange={handleChange} placeholder="Body Type (e.g. WATER TRANSPORT)" className={inputCls} />
              </FormField>
            </div>
          </div>

          {/* Application & Validity */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:calendar-check" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Application &amp; Validity</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Type of Application">
                <Select
                  name="typeOfApplication"
                  value={form.typeOfApplication}
                  onChange={handleChange}
                  options={[
                    { value: "New", label: "New" },
                    { value: "Renew", label: "Renew" },
                  ]}
                  placeholder="Select"
                />
              </FormField>
              <FormField label="Validity Date">
                <input type="date" name="validityDate" value={form.validityDate} onChange={handleChange} className={inputCls} />
              </FormField>
              <FormField label="Validity Status">
                <Select
                  name="validity"
                  value={form.validity}
                  onChange={handleChange}
                  options={[
                    { value: "Updated", label: "Updated" },
                    { value: "Expired", label: "Expired" },
                  ]}
                  placeholder="Select"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-300 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-gradient-to-r from-[#849C44] to-[#637d28] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60"
          >
            {saving ? <Icon icon="mdi:loading" width={18} className="animate-spin" /> : <Icon icon="mdi:content-save" width={18} />}
            {saving ? "Saving..." : "Save Record"}
          </button>
          <button type="button" onClick={() => setForm({ ...emptyForm, province: selectedProvince })}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:shadow-sm transition-all">
            <Icon icon="mdi:refresh" width={16} /> Reset
          </button>
        </div>
      </form>
    </div>
  );
}
