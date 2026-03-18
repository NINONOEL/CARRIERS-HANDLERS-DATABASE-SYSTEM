import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Custom styled select (dropdown list is fully stylable).
 *
 * Props:
 * - name?: string
 * - value: string
 * - onChange?: (eventLike: { target: { name?: string, value: string } }) => void
 * - onValueChange?: (value: string) => void
 * - options: Array<{ value: string, label: string, disabled?: boolean }>
 * - placeholder?: string
 * - disabled?: boolean
 * - className?: string
 * - buttonClassName?: string
 */
export default function Select({
  name,
  value,
  onChange,
  onValueChange,
  options,
  placeholder = "Select",
  disabled = false,
  className = "",
  buttonClassName = "",
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const resolvedOptions = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    const hasEmpty = base.some((o) => o.value === "");
    return hasEmpty ? base : [{ value: "", label: placeholder }, ...base];
  }, [options, placeholder]);

  const selected = useMemo(
    () => resolvedOptions.find((o) => o.value === value),
    [resolvedOptions, value]
  );

  const emit = (next) => {
    onValueChange?.(next);
    onChange?.({ target: { name, value: next } });
  };

  const close = () => {
    setOpen(false);
    setActiveIdx(-1);
  };

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

  useEffect(() => {
    if (!open) return;
    const idx = resolvedOptions.findIndex((o) => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
  }, [open, resolvedOptions, value]);

  const onKeyDown = (e) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(resolvedOptions.length - 1, (i < 0 ? 0 : i + 1)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, (i < 0 ? 0 : i - 1)));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const opt = resolvedOptions[activeIdx];
      if (!opt || opt.disabled) return;
      emit(opt.value);
      close();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
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
        <span className={`truncate ${value ? "text-gray-800" : "text-gray-500"}`}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          icon="mdi:chevron-down"
          width={18}
          className={`text-gray-500 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-xl border border-gray-300 bg-white shadow-xl overflow-hidden"
        >
          <div className="max-h-60 overflow-auto py-1">
            {resolvedOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIdx;
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={!!opt.disabled}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    if (opt.disabled) return;
                    emit(opt.value);
                    close();
                  }}
                  className={[
                    "w-full text-left px-3 py-2 text-sm",
                    opt.disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700",
                    isSelected ? "bg-[#f4f7e8] text-[#637d28] font-semibold" : "",
                    !isSelected && isActive && !opt.disabled ? "bg-gray-50" : "",
                    !opt.disabled ? "hover:bg-gray-50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Icon icon="mdi:check" width={16} className="text-[#637d28]" />}
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

