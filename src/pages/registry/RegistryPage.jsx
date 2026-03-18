import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, where, writeBatch
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { sanitizeForFirestore } from "../../firebase/utils";
import { Icon } from "@iconify/react";
import {
  MIMAROPA_PROVINCES, MUNICIPALITIES, BODY_TYPES,
  NATURE_OF_BUSINESS, PROVINCE_COLORS
} from "../../constants/mimaropa";
import { FormField, inputCls, selectCls } from "../../components/shared/FormField";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Select from "../../components/shared/Select";
import MultiSelect from "../../components/shared/MultiSelect";

const CARRIER_COLS = [
  { key: "no",                 label: "No." },
  { key: "nameOfEstablishment",label: "Establishment" },
  { key: "_applicant",         label: "Applicant" },
  { key: "province",           label: "Province" },
  { key: "municipality",       label: "Municipality" },
  { key: "sex",                label: "Sex" },
  { key: "registrationNumber", label: "Reg. No." },
  { key: "plateNo",            label: "Plate No." },
  { key: "bodyType",           label: "Body Type" },
  { key: "typeOfApplication",  label: "Type" },
  { key: "validity",           label: "Validity" },
];

const HANDLER_COLS = [
  { key: "no",                 label: "No." },
  { key: "nameOfEstablishment",label: "Establishment" },
  { key: "_applicant",         label: "Applicant" },
  { key: "province",           label: "Province" },
  { key: "municipality",       label: "Municipality" },
  { key: "sex",                label: "Sex" },
  { key: "natureOfBusiness",   label: "Nature of Business" },
  { key: "registrationNumber", label: "Reg. No." },
  { key: "typeOfApplication",  label: "Type" },
  { key: "validity",           label: "Validity" },
  { key: "withSeminarCertificate", label: "Seminar Cert." },
];

function Badge({ value }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const map = {
    New:     "bg-blue-100 text-blue-700",
    Renew:   "bg-purple-100 text-purple-700",
    Updated: "bg-green-100 text-green-700",
    Expired: "bg-red-100 text-red-700",
  };
  const cls = map[value] || "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{value}</span>;
}

function EditModal({ record, type, onClose, onSaved }) {
  const isCarrier = type === "carriers_land" || type === "carriers_water";
  const normalizeNature = (v) => {
    if (!v) return "";
    return String(v)
      .trim()
      .toLowerCase()
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s*&\s*/g, " & ")
      .replace(/\s+and\s+/g, " & ")
      .replace(/\s+/g, " ")
      .trim();
  };
  const canonicalizeNatureArray = (arr) => {
    const map = {};
    for (const label of NATURE_OF_BUSINESS) map[normalizeNature(label)] = label;
    const out = [];
    for (const raw of Array.isArray(arr) ? arr : []) {
      const key = map[normalizeNature(raw)];
      if (key && !out.includes(key)) out.push(key);
      else if (!key && raw && !out.includes(raw)) out.push(raw);
      if (out.length >= 3) break;
    }
    return out;
  };
  const toDateInput = (v) => {
    if (!v) return "";
    // Firestore Timestamp
    if (typeof v === "object" && typeof v.toDate === "function") {
      const d = v.toDate();
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    // JS Date
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
    // ISO-ish string (keep yyyy-mm-dd)
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return "";
  };

  const coerceNatureArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).slice(0, 3);
    const s = String(v).trim();
    if (!s) return [];
    // If stored as comma-separated string in some records, split it.
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);
    return [s];
  };

  const [form, setForm] = useState(() => {
    const base = { ...record };
    if (!isCarrier) {
      base.natureOfBusiness = canonicalizeNatureArray(coerceNatureArray(base.natureOfBusiness));
    }
    // Normalize date inputs so they appear in the edit modal.
    base.birthDate = toDateInput(base.birthDate);
    base.validityDate = toDateInput(base.validityDate);
    return base;
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: t === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const collName = type === "carriers_land" || type === "carriers_water" ? type : "handlers";
      const ref = doc(db, collName, record.id);
      const { id, ...rest } = form;
      if (!isCarrier) {
        rest.natureOfBusiness = canonicalizeNatureArray(
          Array.isArray(rest.natureOfBusiness) ? rest.natureOfBusiness : coerceNatureArray(rest.natureOfBusiness)
        );
      }
      await updateDoc(ref, sanitizeForFirestore(rest));
      toast.success("Record updated!");
      onSaved({ ...form });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay-full z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 overflow-y-auto">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] min-h-[320px] bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden my-auto">
        {/* Fixed header – hindi sumasama sa scroll */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#849C44] via-[#768f3d] to-[#637d28] px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon icon="mdi:pencil" width={20} />
            </div>
            <div>
              <p className="font-bold text-sm">Edit Record #{form.no}</p>
              <p className="text-white/80 text-xs">Update details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <Icon icon="mdi:close" width={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-5 bg-gray-50/50">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <FormField label="Name of Establishment">
              <input name="nameOfEstablishment" value={form.nameOfEstablishment || ""} onChange={handleChange} className={inputCls} />
            </FormField>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Applicant</p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Last Name">
                <input name="lastName" value={form.lastName || ""} onChange={handleChange} className={inputCls} />
              </FormField>
              <FormField label="First Name">
                <input name="firstName" value={form.firstName || ""} onChange={handleChange} className={inputCls} />
              </FormField>
              <FormField label="M.I.">
                <input name="middleInitial" value={form.middleInitial || ""} onChange={handleChange} className={inputCls} maxLength={3} />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Address</p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Province">
                <select name="province" value={form.province || ""} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {MIMAROPA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Municipality">
                <select name="municipality" value={form.municipality || ""} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {(MUNICIPALITIES[form.province] || []).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>
              <FormField label="Barangay">
                <input name="barangay" value={form.barangay || ""} onChange={handleChange} className={inputCls} />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sex">
              <select name="sex" value={form.sex || ""} onChange={handleChange} className={selectCls}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </FormField>
            <FormField label="Birth Date">
              <input type="date" name="birthDate" value={form.birthDate || ""} onChange={handleChange} className={inputCls} />
            </FormField>
          </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone No.">
              <input name="phoneNo" value={form.phoneNo || ""} onChange={handleChange} className={inputCls} />
            </FormField>
            <FormField label="Email">
              <input name="email" value={form.email || ""} onChange={handleChange} className={inputCls} />
            </FormField>
          </div>
          </div>

          {isCarrier ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Registration No.">
                <input name="registrationNumber" value={form.registrationNumber || ""} onChange={handleChange} className={inputCls} />
              </FormField>
              <FormField label="Plate No.">
                <input name="plateNo" value={form.plateNo || ""} onChange={handleChange} className={inputCls} />
              </FormField>
              <FormField label="Body Type">
                <input name="bodyType" value={form.bodyType || ""} onChange={handleChange} className={inputCls} />
              </FormField>
            </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nature of Business">
                <MultiSelect
                  name="natureOfBusiness"
                  value={Array.isArray(form.natureOfBusiness) ? form.natureOfBusiness : (form.natureOfBusiness ? [form.natureOfBusiness] : [])}
                  onValueChange={(arr) => setForm((prev) => ({ ...prev, natureOfBusiness: arr }))}
                  options={NATURE_OF_BUSINESS.map((n) => ({ value: n, label: n }))}
                  placeholder="Select"
                  maxSelected={3}
                />
              </FormField>
              <FormField label="Registration No.">
                <input name="registrationNumber" value={form.registrationNumber || ""} onChange={handleChange} className={inputCls} />
              </FormField>
            </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Type of Application">
              <select name="typeOfApplication" value={form.typeOfApplication || ""} onChange={handleChange} className={selectCls}>
                <option value="">Select</option>
                <option>New</option>
                <option>Renew</option>
              </select>
            </FormField>
            <FormField label="Validity Date">
              <input type="date" name="validityDate" value={form.validityDate || ""} onChange={handleChange} className={inputCls} />
            </FormField>
            <FormField label="Validity Status">
              <select name="validity" value={form.validity || ""} onChange={handleChange} className={selectCls}>
                <option value="">Select</option>
                <option>Updated</option>
                <option>Expired</option>
              </select>
            </FormField>
          </div>
          </div>

          {!isCarrier && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <input
                type="checkbox"
                id="editSeminar"
                name="withSeminarCertificate"
                checked={form.withSeminarCertificate || false}
                onChange={handleChange}
                className="w-4 h-4 accent-[#849C44]"
              />
              <label htmlFor="editSeminar" className="text-sm font-medium text-amber-800 cursor-pointer flex items-center gap-2">
                <Icon icon="mdi:certificate" width={16} className="text-amber-600" />
                With Seminar Certificate
              </label>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-[#849C44] to-[#637d28] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Icon icon="mdi:loading" width={16} className="animate-spin" /> : <Icon icon="mdi:content-save" width={16} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default function RegistryPage({ mode }) {
  const location = useLocation();
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [filterProvince, setFilterProvince] = useState("");
  const [filterType, setFilterType]         = useState("");
  const [filterValidity, setFilterValidity] = useState("");
  const [search, setSearch]                 = useState("");
  const [subType, setSubType]               = useState("land");
  const [page, setPage]                     = useState(1);
  const pageSize = 10;

  const normalizeNature = (v) => {
    if (!v) return "";
    return String(v)
      .trim()
      .toLowerCase()
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s*&\s*/g, " & ")
      .replace(/\s+and\s+/g, " & ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const canonicalizeNatureArray = (arr) => {
    const map = {};
    for (const label of NATURE_OF_BUSINESS) map[normalizeNature(label)] = label;
    const out = [];
    for (const raw of Array.isArray(arr) ? arr : []) {
      const key = map[normalizeNature(raw)];
      const chosen = key || (raw ? String(raw).trim() : "");
      if (chosen && !out.includes(chosen)) out.push(chosen);
      if (out.length >= 3) break;
    }
    return out;
  };

  const coerceNatureArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    const s = String(v).trim();
    if (!s) return [];
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
    return [s];
  };

  const normalizeAllHandlersNature = async () => {
    if (!window.confirm("Normalize Nature of Business for ALL handlers records?\n\nThis will standardize values to match the dropdown labels.")) {
      return;
    }

    const tId = toast.loading("Normalizing Nature of Business…");
    try {
      const snap = await getDocs(collection(db, "handlers"));
      let scanned = 0;
      let toUpdate = 0;
      let updated = 0;

      let batch = writeBatch(db);
      let batchCount = 0;

      for (const d of snap.docs) {
        scanned += 1;
        const row = d.data() || {};

        const raw =
          row.natureOfBusiness ??
          row.nature_of_business ??
          row.natureOfBusinessType ??
          row.nature;

        const nextArr = canonicalizeNatureArray(coerceNatureArray(raw));

        // If empty, keep as-is (user can set later).
        if (nextArr.length === 0) continue;

        const currentArr = canonicalizeNatureArray(coerceNatureArray(row.natureOfBusiness));
        const same =
          currentArr.length === nextArr.length &&
          currentArr.every((v, i) => v === nextArr[i]);

        if (same) continue;

        toUpdate += 1;
        batch.update(d.ref, sanitizeForFirestore({ natureOfBusiness: nextArr }));
        batchCount += 1;

        if (batchCount >= 400) {
          await batch.commit();
          updated += batchCount;
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        updated += batchCount;
      }

      toast.success(`Done. Scanned ${scanned}, updated ${updated} record(s).`, { id: tId });
      // Refresh table so you see standardized values immediately.
      await fetchRecords();
    } catch (e) {
      console.error(e);
      toast.error("Normalization failed.", { id: tId });
    }
  };

  // Allow deep-linking (Dashboard quick access):
  // `/registry/carriers?province=Palawan` (+ optional `subType=land|water`)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const province = params.get("province") || "";
    const qsSubType = params.get("subType");

    if (province) setFilterProvince(province);
    if (mode === "carriers" && (qsSubType === "land" || qsSubType === "water")) setSubType(qsSubType);
    if (province || qsSubType) setPage(1);
  }, [location.search, mode]);

  const collectionName = mode === "carriers"
    ? `carriers_${subType}`
    : "handlers";

  const columns = mode === "carriers" ? CARRIER_COLS : HANDLER_COLS;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, collectionName));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.no || 0) - (b.no || 0));
      setRecords(docs);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDeleteConfirm = async () => {
    if (!deleteRecord) return;
    try {
      await deleteDoc(doc(db, collectionName, deleteRecord.id));
      setRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
      toast.success("Record deleted.");
    } catch (e) {
      console.error(e);
      toast.error("Delete failed.");
    } finally {
      setDeleteRecord(null);
    }
  };

  const handleSaved = (updated) => {
    setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  const filtered = records.filter((r) => {
    const matchProv    = !filterProvince || r.province === filterProvince;
    const matchType    = !filterType    || r.typeOfApplication === filterType;
    const matchValidity= !filterValidity|| r.validity === filterValidity;
    const searchLower  = search.toLowerCase();
    const matchSearch  = !search || [
      r.lastName, r.firstName, r.nameOfEstablishment,
      r.registrationNumber, r.plateNo, r.province
    ].some((v) => v?.toLowerCase().includes(searchLower));
    return matchProv && matchType && matchValidity && matchSearch;
  });

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginated = filtered.slice(startIndex, endIndex);

  const getCellValue = (row, key) => {
    if (key === "_applicant") return `${row.lastName || ""}, ${row.firstName || ""} ${row.middleInitial || ""}`.trim();
    if (key === "typeOfApplication" || key === "validity") return <Badge value={row[key]} />;
    if (key === "withSeminarCertificate") return row[key]
      ? <span className="text-green-600"><Icon icon="mdi:check-circle" width={16} /></span>
      : <span className="text-red-400"><Icon icon="mdi:close-circle" width={16} /></span>;
    if (key === "natureOfBusiness") {
      const v = row[key];
      if (Array.isArray(v)) return v.join(", ");
    }
    return row[key] || <span className="text-gray-300">—</span>;
  };

  const accentColor = mode === "carriers"
    ? (subType === "land" ? "from-[#849C44] to-[#637d28]" : "from-[#4A90D9] to-[#2C6FAC]")
    : "from-[#F7A825] to-[#D4891A]";

  const accentIcon = mode === "carriers"
    ? (subType === "land" ? "mdi:truck" : "mdi:ferry")
    : "mdi:account-group";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between bg-gradient-to-r ${accentColor} rounded-xl p-4 text-white shadow-md`}>
        <div className="flex items-center gap-3">
          <Icon icon={accentIcon} width={28} />
          <div>
            <h2 className="font-bold text-lg">{mode === "carriers" ? "Carriers" : "Handlers"} Registry</h2>
            <p className="text-white/80 text-xs">
              {totalRecords} record{totalRecords !== 1 ? "s" : ""} found · Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "handlers" && (
            <button
              onClick={normalizeAllHandlersNature}
              className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 transition-all text-xs font-semibold flex items-center gap-2"
              title="Normalize Nature of Business to match dropdown labels"
            >
              <Icon icon="mdi:format-letter-case" width={16} />
              <span className="hidden sm:inline">Normalize NOB</span>
            </button>
          )}
          <button onClick={fetchRecords} className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-all" title="Refresh">
            <Icon icon="mdi:refresh" width={18} />
          </button>
        </div>
      </div>

      {/* Sub-type toggle for carriers */}
      {mode === "carriers" && (
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 w-fit shadow-sm">
          {["land", "water"].map((t) => (
            <button
              key={t}
              onClick={() => setSubType(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                subType === t
                  ? t === "land"
                    ? "bg-gradient-to-r from-[#849C44] to-[#637d28] text-white shadow-sm"
                    : "bg-gradient-to-r from-[#4A90D9] to-[#2C6FAC] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon icon={t === "land" ? "mdi:truck" : "mdi:ferry"} width={16} />
              {t === "land" ? "Land Transport" : "Water Transport"}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-40">
            <Icon icon="mdi:magnify" width={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, reg. no., province..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 flex-1 outline-none"
            />
          </div>
          <div className="min-w-44">
            <Select
              value={filterProvince}
              onValueChange={setFilterProvince}
              options={MIMAROPA_PROVINCES.map((p) => ({ value: p, label: p }))}
              placeholder="All Provinces"
              buttonClassName="py-2 text-xs bg-gray-50"
            />
          </div>
          <div className="min-w-40">
            <Select
              value={filterType}
              onValueChange={setFilterType}
              options={[
                { value: "New", label: "New" },
                { value: "Renew", label: "Renew" },
              ]}
              placeholder="All Types"
              buttonClassName="py-2 text-xs bg-gray-50"
            />
          </div>
          <div className="min-w-44">
            <Select
              value={filterValidity}
              onValueChange={setFilterValidity}
              options={[
                { value: "Updated", label: "Updated" },
                { value: "Expired", label: "Expired" },
              ]}
              placeholder="All Validity"
              buttonClassName="py-2 text-xs bg-gray-50"
            />
          </div>
          {(filterProvince || filterType || filterValidity || search) && (
            <button
              onClick={() => { setFilterProvince(""); setFilterType(""); setFilterValidity(""); setSearch(""); }}
              className="text-xs text-gray-400 hover:text-[#849C44] flex items-center gap-1"
            >
              <Icon icon="mdi:close" width={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Icon icon="mdi:loading" width={32} className="animate-spin text-[#849C44]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Icon icon="mdi:database-off" width={40} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">No records found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {columns.map((col) => (
                    <th key={col.key} className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, idx) => {
                  const displayIndex = startIndex + idx + 1;
                  const c = PROVINCE_COLORS[row.province] || {};
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 record-row odd:bg-white even:bg-gray-50"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate"
                        >
                          {col.key === "no" ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                              {displayIndex}
                            </span>
                          ) : col.key === "province" ? (
                            <span className={`${c.text || ""} font-medium flex items-center gap-1`}>
                              <Icon icon="mdi:map-marker" width={11} />{row.province}
                            </span>
                          ) : getCellValue(row, col.key)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditRecord({ ...row, _collType: collectionName })}
                            className="p-1.5 rounded-lg bg-[#f4f7e8] text-[#849C44] hover:bg-[#849C44] hover:text-white transition-all"
                            title="Edit"
                          >
                            <Icon icon="mdi:pencil" width={14} />
                          </button>
                          <button
                            onClick={() => setDeleteRecord(row)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            title="Delete"
                          >
                            <Icon icon="mdi:delete" width={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > pageSize && (
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <p>
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {startIndex + 1}–{Math.min(endIndex, totalRecords)}
            </span>{" "}
            of <span className="font-semibold text-gray-700">{totalRecords}</span> records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40 bg-white hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="px-2 text-xs font-medium text-gray-700">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editRecord && (
        <EditModal
          record={editRecord}
          type={collectionName}
          onClose={() => setEditRecord(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteRecord && createPortal(
        <div className="modal-overlay-full z-40 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/80">
            <div className="bg-gradient-to-r from-[#B83210] to-[#8B2510] px-5 py-3 rounded-t-2xl flex items-center gap-2 text-white">
              <Icon icon="mdi:delete-alert" width={20} />
              <p className="font-semibold text-sm">Delete Record</p>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              <p>Sigurado ka ba na gusto mong i-delete ang record na ito?</p>
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-800">
                <p className="font-semibold">
                  #{deleteRecord.no} – {deleteRecord.lastName}, {deleteRecord.firstName}
                </p>
                {deleteRecord.nameOfEstablishment && (
                  <p className="mt-0.5">{deleteRecord.nameOfEstablishment}</p>
                )}
                {deleteRecord.province && (
                  <p className="mt-0.5 text-[11px]">
                    {deleteRecord.province} {deleteRecord.municipality ? `• ${deleteRecord.municipality}` : ""}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Hindi na maibabalik ang data pagkatapos i-delete.
              </p>
            </div>
            <div className="px-5 pb-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteRecord(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5"
              >
                <Icon icon="mdi:delete" width={14} />
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
