export function FormField({ label, required, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  "form-input w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder-gray-400 transition-all";

export const selectCls =
  "form-input w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white shadow-sm transition-all focus:border-[#849C44] focus:ring-4 focus:ring-[#849C44]/15 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
