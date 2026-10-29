import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog modal (dirender ke document.body agar tidak terpengaruh gaya induk, mis. space-y atau transform):
// Esc dan klik latar menutup (kecuali dismissible = false saat menyimpan), fokus terkunci di dalam
// dialog, gulir halaman dikunci, dan fokus dikembalikan ke tombol pemicu saat ditutup.
export default function Modal({ open, onClose, title, subtitle, size = 'md', dismissible = true, footer, children, testId = 'modal' }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  closeRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog && dialog.querySelector('[data-autofocus]');
    (first || dialog)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstItem || document.activeElement === dialog)) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid={testId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`relative bg-dark-primary rounded-2xl border border-white/[0.08] w-full ${SIZE[size] || SIZE.md} max-h-[90vh] overflow-hidden flex flex-col shadow-2xl outline-none`}>
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={!dismissible} aria-label="Tutup"
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-40 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}