import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";

/**
 * MultiSelect with max selection (default 2).
 * Fully stylable dropdown menu + chips in the button.
 */
export default function MultiSelect({
  name,
  value,
  onChange,
  onValueChange,
  options,
  placeholder = "Select",
  disabled = false,
  maxSelected = 3,
  className = "",
  buttonClassName = "",
}) {
  const isUnlimited = !Number.isFinite(maxSelected);

  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const resolvedOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);
  const selectedValues = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const emit = (nextArr) => {
    onValueChange?.(nextArr);
    onChange?.({ target: { name, value: nextArr } });
  };

  const close = () => setOpen(false);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  const toggleValue = (v) => {
    const exists = selectedSet.has(v);
    if (exists) {
      emit(selectedValues.filter((x) => x !== v));
      return;
    }
    if (!isUnlimited && selectedValues.length >= maxSelected) return;
    emit([...selectedValues, v]);
  };

  const removeValue = (v) => {
    if (!selectedSet.has(v)) return;
    emit(selectedValues.filter((x) => x !== v));
  };

  const clearAll = () => {
    if (selectedValues.length === 0) return;
    emit([]);
  };

  const selectedLabels = useMemo(() => {
    const map = new Map(resolvedOptions.map((o) => [o.value, o.label]));
    return selectedValues.map((v) => map.get(v) ?? v);
  }, [resolvedOptions, selectedValues]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between gap-3",
          "border border-gray-300 rounded-lg px-3 py-2",
          "text-sm text-gray-800 bg-white shadow-sm",
          "transition-all focus:outline-none focus:border-[#849C44] focus:ring-4 focus:ring-[#849C44]/15",
          "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          buttonClassName,
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="truncate text-gray-500">{placeholder}</span>
          ) : (
            selectedLabels.map((lbl, idx) => {
              const v = selectedValues[idx];
              return (
              <span
                key={`${lbl}-${idx}`}
                className="max-w-full inline-flex items-center gap-1 rounded-full bg-[#f4f7e8] border border-[#849C44]/25 px-2 py-0.5 text-xs font-semibold text-[#637d28]"
                title={lbl}
              >
                <span className="truncate max-w-40">{lbl}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeValue(v);
                  }}
                  className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-[#637d28]/10 transition-colors"
                  aria-label={`Remove ${lbl}`}
                >
                  <Icon icon="mdi:close" width={12} className="text-[#637d28]" />
                </button>
              </span>
            );
            })
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
              }}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear all"
              title="Clear all"
            >
              <Icon icon="mdi:close-circle" width={14} />
            </button>
          )}
          {!isUnlimited ? (
            <span className="text-[11px] text-gray-400">
              {selectedValues.length}/{maxSelected}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">{selectedValues.length} selected</span>
          )}
          <Icon
            icon="mdi:chevron-down"
            width={18}
            className={`text-gray-500 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-300 bg-white shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-auto py-1">
            {resolvedOptions.map((opt) => {
              const isSelected = selectedSet.has(opt.value);
              const isDisabled =
                !!opt.disabled ||
                (!isSelected && !isUnlimited && selectedValues.length >= maxSelected);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && toggleValue(opt.value)}
                  className={[
                    "w-full text-left px-3 py-2 text-sm",
                    isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50",
                    isSelected ? "bg-[#f4f7e8] text-[#637d28] font-semibold" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{opt.label}</span>
                    {isSelected ? (
                      <Icon icon="mdi:check" width={16} className="text-[#637d28]" />
                    ) : (
                      <span className="w-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

