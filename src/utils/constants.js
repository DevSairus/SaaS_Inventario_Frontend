// Roles
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERARIO: 'operario',
  CLIENTE: 'cliente',
  TECHNICIAN: 'technician',
});

// Estados de factura
export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
});

// Estados de pago
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  REFUNDED: 'refunded',
});

export const PAYMENT_METHODS = Object.freeze({
  CASH: 'efectivo',
  TRANSFER: 'transferencia',
  CARD: 'tarjeta',
  CHECK: 'cheque',
  PSE: 'pse',
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  pse: 'PSE',
});

// PQRS Types
export const PQRS_TYPES = Object.freeze({
  PETICION: 'peticion',
  QUEJA: 'queja',
  RECLAMO: 'reclamo',
  SUGERENCIA: 'sugerencia',
});

// PQRS Status
export const PQRS_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
});

// Priorities
export const PRIORITIES = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

export const PLANS = Object.freeze({
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
});

// Rutas de la app (centralizadas para evitar hardcodeos dispersos)
export const ROUTES = Object.freeze({
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  SUPERADMIN_DASHBOARD: '/superadmin/dashboard',
  PROFILE: '/profile',
  PRODUCTS: '/products',
  SALES: '/sales',
});

// Claves de storage (compat con `src/utils/authStorage.js`)
export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'token',
  USER: 'user',
});
