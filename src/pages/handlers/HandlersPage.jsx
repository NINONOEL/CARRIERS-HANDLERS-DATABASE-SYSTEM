import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { sanitizeForFirestore } from "../../firebase/utils";
import { Icon } from "@iconify/react";
import { MIMAROPA_PROVINCES, MUNICIPALITIES, NATURE_OF_BUSINESS, PROVINCE_COLORS } from "../../constants/mimaropa";
import { FormField, inputCls } from "../../components/shared/FormField";
import Select from "../../components/shared/Select";
import MultiSelect from "../../components/shared/MultiSelect";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

const emptyForm = {
  nameOfEstablishment: "",
  lastName: "", firstName: "", middleInitial: "",
  province: "", municipality: "", barangay: "",
  sex: "", birthDate: "",
  phoneNo: "", email: "",
  natureOfBusiness: [],
  registrationNumber: "",
  typeOfApplication: "",
  validityDate: "", validity: "",
  withSeminarCertificate: false,
};

export default function HandlersPage() {
  const { province } = useParams();
  const [form, setForm]       = useState({ ...emptyForm, province: province || "" });
  const [saving, setSaving]   = useState(false);
  const [count, setCount]     = useState(0);

  const c = PROVINCE_COLORS[province] || PROVINCE_COLORS["Marinduque"];

  useEffect(() => {
    setForm({ ...emptyForm, province: province || "" });
    const fetchCount = async () => {
      try {
        const snap = await getDocs(query(collection(db, "handlers"), where("province", "==", province)));
        setCount(snap.size);
      } catch (e) { console.error(e); }
    };
    if (province) fetchCount();
  }, [province]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
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
    if (!Array.isArray(form.natureOfBusiness) || form.natureOfBusiness.length === 0) {
      toast.error("Please select at least one Nature of Business.");
      return;
    }
    setSaving(true);
    try {
      const snap = await getDocs(query(collection(db, "handlers"), where("province", "==", form.province)));
      const no = snap.size + 1;
      const payload = sanitizeForFirestore({
        ...form,
        no,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "handlers"), payload);
      toast.success("Handler record saved successfully!");
      setCount((prev) => prev + 1);
      setForm({ ...emptyForm, province: form.province, municipality: form.municipality });
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Failed to save record.";
      toast.error(msg.includes("permission") ? "Permission denied. Update Firestore rules (see firestore.rules)." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${c.bg} border ${c.border} rounded-2xl p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center`}>
            <Icon icon="mdi:map-marker" width={20} className="text-white" />
          </div>
          <div>
            <h2 className={`font-bold ${c.text} text-lg`}>{province}</h2>
            <p className="text-gray-500 text-xs">Handlers Registration Form</p>
          </div>
        </div>
        <div className={`${c.bg} border ${c.border} rounded-lg px-3 py-1.5 text-center`}>
          <p className={`text-lg font-bold ${c.text}`}>{count}</p>
          <p className="text-xs text-gray-500">Records</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={`${c.bg} border-b ${c.border} px-4 sm:px-6 py-4 flex items-center gap-3`}>
          <Icon icon="mdi:account-plus" width={22} className={c.text} />
          <div className="min-w-0">
            <h3 className={`font-bold ${c.text} leading-tight`}>New Handler Record – {province}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill out the required fields then click <span className="font-semibold">Save Record</span>.
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4">
          {/* Establishment */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:storefront" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Establishment</p>
            </div>
            <FormField label="Name of Establishment" required>
              <input name="nameOfEstablishment" value={form.nameOfEstablishment} onChange={handleChange} placeholder="Enter establishment name" className={inputCls} />
            </FormField>
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

          {/* Nature of Business */}
          <div className="rounded-xl border border-gray-300 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Icon icon="mdi:briefcase" width={18} className="text-gray-700" />
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Business Details</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nature of Business (select up to 3)" required>
                <MultiSelect
                  name="natureOfBusiness"
                  value={Array.isArray(form.natureOfBusiness) ? form.natureOfBusiness : (form.natureOfBusiness ? [form.natureOfBusiness] : [])}
                  onValueChange={(arr) => setForm((prev) => ({ ...prev, natureOfBusiness: arr }))}
                  options={NATURE_OF_BUSINESS.map((n) => ({ value: n, label: n }))}
                  placeholder="Select Nature of Business"
                  maxSelected={3}
                />
              </FormField>
              <FormField label="Registration Number">
                <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="Reg. No." className={inputCls} />
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

          {/* Seminar Certificate */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <input
              type="checkbox"
              id="withSeminarCertificate"
              name="withSeminarCertificate"
              checked={form.withSeminarCertificate}
              onChange={handleChange}
              className="w-4 h-4 accent-[#849C44]"
            />
            <label htmlFor="withSeminarCertificate" className="text-sm font-medium text-amber-800 cursor-pointer flex items-center gap-2">
              <Icon icon="mdi:certificate" width={16} className="text-amber-600" />
              With Seminar Certificate
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-300 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-gradient-to-r from-[#F7A825] to-[#D4891A] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60"
          >
            {saving ? <Icon icon="mdi:loading" width={18} className="animate-spin" /> : <Icon icon="mdi:content-save" width={18} />}
            {saving ? "Saving..." : "Save Record"}
          </button>
          <button type="button" onClick={() => setForm({ ...emptyForm, province: province || "" })}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:shadow-sm transition-all">
            <Icon icon="mdi:refresh" width={16} /> Reset
          </button>
        </div>
      </form>
    </div>
  );
}
