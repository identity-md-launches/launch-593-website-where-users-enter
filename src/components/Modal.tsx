import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose, wide = false, busy = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = '';
      previous?.focus();
      // A responsive breakpoint can hide the original trigger while the dialog is open.
      if (document.activeElement === document.body) {
        Array.from(document.querySelectorAll<HTMLButtonElement>('main button'))
          .find(button => !button.disabled && button.getClientRects().length > 0)?.focus({ preventScroll: true });
      }
    };
  }, []);
  return <dialog ref={dialog} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby="modal-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="modal-content">
      <div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
      {children}
    </div>
  </dialog>;
}
