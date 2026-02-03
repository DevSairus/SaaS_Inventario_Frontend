import { INVOICE_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from './constants';

// ========== FACTURAS ==========

export const getInvoiceStatusText = (status) => {
  const statuses = {
    [INVOICE_STATUS.DRAFT]: 'Borrador',
    [INVOICE_STATUS.ISSUED]: 'Emitida',
    [INVOICE_STATUS.PAID]: 'Pagada',
    [INVOICE_STATUS.OVERDUE]: 'Vencida',
    [INVOICE_STATUS.CANCELLED]: 'Cancelada',
  };
  return statuses[status] || status;
};

export const getInvoiceStatusColor = (status) => {
  const colors = {
    [INVOICE_STATUS.DRAFT]: 'badge-gray',
    [INVOICE_STATUS.ISSUED]: 'badge-info',
    [INVOICE_STATUS.PAID]: 'badge-success',
    [INVOICE_STATUS.OVERDUE]: 'badge-danger',
    [INVOICE_STATUS.CANCELLED]: 'badge-gray',
  };
  return colors[status] || 'badge-gray';
};

// ========== PAGOS ==========

export const getPaymentStatusText = (status) => {
  const statuses = {
    [PAYMENT_STATUS.PENDING]: 'Pendiente',
    [PAYMENT_STATUS.CONFIRMED]: 'Confirmado',
    [PAYMENT_STATUS.REJECTED]: 'Rechazado',
    [PAYMENT_STATUS.REFUNDED]: 'Reembolsado',
  };
  return statuses[status] || status;
};

export const getPaymentStatusColor = (status) => {
  const colors = {
    [PAYMENT_STATUS.PENDING]: 'badge-warning',
    [PAYMENT_STATUS.CONFIRMED]: 'badge-success',
    [PAYMENT_STATUS.REJECTED]: 'badge-danger',
    [PAYMENT_STATUS.REFUNDED]: 'badge-info',
  };
  return colors[status] || 'badge-gray';
};

export const getPaymentMethodText = (method) => {
  const methods = {
    [PAYMENT_METHODS.CASH]: 'Efectivo',
    [PAYMENT_METHODS.TRANSFER]: 'Transferencia',
    [PAYMENT_METHODS.CARD]: 'Tarjeta',
    [PAYMENT_METHODS.ONLINE]: 'Pago en línea',
  };
  return methods[method] || method;
};

// ========== PQRS ==========

export const getPQRSTypeText = (type) => {
  const types = {
    peticion: 'Petición',
    queja: 'Queja',
    reclamo: 'Reclamo',
    sugerencia: 'Sugerencia',
  };
  return types[type] || type;
};

export const getPQRSTypeColor = (type) => {
  const colors = {
    peticion: 'badge-info',
    queja: 'badge-warning',
    reclamo: 'badge-danger',
    sugerencia: 'badge-success',
  };
  return colors[type] || 'badge-gray';
};

export const getPQRSStatusText = (status) => {
  const statuses = {
    open: 'Abierto',
    in_progress: 'En progreso',
    resolved: 'Resuelto',
    closed: 'Cerrado',
    rejected: 'Rechazado',
  };
  return statuses[status] || status;
};

export const getPQRSStatusColor = (status) => {
  const colors = {
    open: 'badge-warning',
    in_progress: 'badge-info',
    resolved: 'badge-success',
    closed: 'badge-gray',
    rejected: 'badge-danger',
  };
  return colors[status] || 'badge-gray';
};

export const getPriorityText = (priority) => {
  const priorities = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return priorities[priority] || priority;
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'badge-gray',
    medium: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-danger',
  };
  return colors[priority] || 'badge-gray';
};

// ========== UTILIDADES ==========

export const calculateOverdueDays = (dueDate) => {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return 'U';
  
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  
  return `${first}${last}` || 'U';
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Descargar archivo blob
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
