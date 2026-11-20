// utils/formErrors.js
//
// Marca los campos que faltan o están mal en un formulario: borde rojo,
// texto debajo, scroll y foco al primero, y un aviso que dice QUÉ falta.
//
// Cada campo marcable se envuelve (o es) un elemento con
// `data-field="nombre"`. La marca se quita sola cuando el usuario toca ese
// campo. Sirve igual para validación local y para los `fieldErrors` del
// backend (middleware/validate.js).
//
//   if (flagMissing([
//     !formData.supplier_id && { field: 'supplier_id', label: 'Proveedor' },
//     !items.length && { field: 'items', label: 'Al menos un producto' },
//   ])) return;
import toast from 'react-hot-toast';

const CLEAR_EVENTS = ['input', 'change', 'click', 'focusin'];

function clearMark(el) {
  el.classList.remove('field-error');
  el.querySelectorAll(':scope > .field-error-hint').forEach((n) => n.remove());
}

function markElement(el, hint) {
  clearMark(el);
  el.classList.add('field-error');
  if (hint) {
    const span = document.createElement('span');
    span.className = 'field-error-hint';
    span.textContent = hint;
    el.appendChild(span);
  }
  const off = () => {
    clearMark(el);
    CLEAR_EVENTS.forEach((ev) => el.removeEventListener(ev, off, true));
  };
  // Se espera un tick para que el click del botón "Guardar" no la borre.
  setTimeout(() => CLEAR_EVENTS.forEach((ev) => el.addEventListener(ev, off, true)), 0);
}

/** Quita todas las marcas dentro de `root` (o de la página). */
export function clearFieldErrors(root = document) {
  root.querySelectorAll('.field-error').forEach(clearMark);
}

/**
 * Marca los campos con error. `errors` admite valores falsy (se ignoran),
 * así se puede escribir `cond && { field, label }`.
 * Devuelve true si había al menos un error.
 */
export function flagMissing(errors, { title = 'Falta completar', root = document, toastId = 'form-errors' } = {}) {
  const list = (errors || []).filter(Boolean);
  if (!list.length) return false;

  let first = null;
  list.forEach(({ field, hint }) => {
    if (!field) return;
    const el = root.querySelector(`[data-field="${CSS.escape(field)}"]`);
    if (!el) return;
    markElement(el, hint);
    if (!first) first = el;
  });

  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = first.matches('input,select,textarea,button')
      ? first
      : first.querySelector('input:not([type=hidden]),select,textarea');
    focusable?.focus?.({ preventScroll: true });
  }

  const labels = list.map((e) => e.label || e.hint || e.field).filter(Boolean);
  toast.error(
    labels.length === 1 ? `${title}: ${labels[0]}` : `${title}:\n• ${labels.join('\n• ')}`,
    { id: toastId, duration: 6000 },
  );
  return true;
}

/**
 * Marca los campos que reporta el backend (`fieldErrors` de un 422) y
 * muestra el mensaje. Devuelve true si la respuesta traía campos.
 */
export function flagServerErrors(error, { root = document } = {}) {
  const data = error?.response?.data;
  const fieldErrors = data?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object' || !Object.keys(fieldErrors).length) return false;
  return flagMissing(
    Object.entries(fieldErrors).map(([field, msg]) => ({ field, label: msg })),
    { title: 'Revisa', root },
  );
}
