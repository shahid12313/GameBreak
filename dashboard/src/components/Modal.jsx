import { createPortal } from 'react-dom';

/** A single shared modal shell used by every "add/edit X" form in the
 *  dashboard, so each page only has to supply its own form body. */
export default function Modal({ title, onClose, children, footer }) {
  const root = document.getElementById('modalRoot');
  if (!root) return null;
  return createPortal(
    <div className="modal-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    root
  );
}
