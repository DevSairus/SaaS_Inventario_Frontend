import { workOrdersApi, vehiclesApi } from './workshop';
import db from '../pwa/offlineQueue/db';

function isNetworkError(error) {
  return !error.response && !!error.request;
}

async function enqueue({ entity, operation, method, url, payload, localEntityId = null, baseVersion = null }) {
  const id = crypto.randomUUID();
  await db.mutationQueue.add({
    id,
    entity,
    operation,
    method,
    url,
    payload,
    localEntityId,
    serverEntityId: null,
    baseVersion,
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  });
  return id;
}

// Si la llamada real falla por un error de RED (offline/timeout, no un 4xx/5xx
// de negocio), encola la mutación y devuelve un objeto "optimista" para que la
// UI pueda seguir sin bloquear al usuario mientras el técnico está sin señal.
async function offlineAware(apiCallFn, queueSpec) {
  try {
    return await apiCallFn();
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await enqueue(queueSpec);
    return {
      data: {
        success: true,
        data: { ...queueSpec.payload, id: queueSpec.localEntityId, _pendingSync: true },
      },
    };
  }
}

// Alcance offline: create/update/changeStatus/addItem/removeItem/updateChecklist
// de Órdenes de Trabajo, y create/update de Vehículos (ver plan PWA Fase 4).
// Todo lo demás (getPDF, generateSale, fotos, share/whatsapp, remove) NO pasa
// por aquí — se sigue llamando a workOrdersApi/vehiclesApi directamente y
// requiere conexión real.
export const workOrdersApiOffline = {
  ...workOrdersApi,

  create: (data) => {
    const localEntityId = crypto.randomUUID();
    return offlineAware(() => workOrdersApi.create(data), {
      entity: 'work_order',
      operation: 'create',
      method: 'POST',
      url: '/workshop/work-orders',
      payload: data,
      localEntityId,
    });
  },

  update: (id, data, baseVersion = null) =>
    offlineAware(() => workOrdersApi.update(id, data), {
      entity: 'work_order',
      operation: 'update',
      method: 'PUT',
      url: `/workshop/work-orders/${id}`,
      payload: data,
      localEntityId: id,
      baseVersion,
    }),

  changeStatus: (id, data, baseVersion = null) =>
    offlineAware(() => workOrdersApi.changeStatus(id, data), {
      entity: 'work_order',
      operation: 'changeStatus',
      method: 'PATCH',
      url: `/workshop/work-orders/${id}/status`,
      payload: data,
      localEntityId: id,
      baseVersion,
    }),

  addItem: (id, data) =>
    offlineAware(() => workOrdersApi.addItem(id, data), {
      entity: 'work_order',
      operation: 'addItem',
      method: 'POST',
      url: `/workshop/work-orders/${id}/items`,
      payload: data,
      localEntityId: id,
    }),

  removeItem: (id, itemId) =>
    offlineAware(() => workOrdersApi.removeItem(id, itemId), {
      entity: 'work_order',
      operation: 'removeItem',
      method: 'DELETE',
      url: `/workshop/work-orders/${id}/items/${itemId}`,
      payload: null,
      localEntityId: id,
    }),

  updateChecklist: (id, data, baseVersion = null) =>
    offlineAware(() => workOrdersApi.updateChecklist(id, data), {
      entity: 'work_order',
      operation: 'updateChecklist',
      method: 'PATCH',
      url: `/workshop/work-orders/${id}/checklist`,
      payload: data,
      localEntityId: id,
      baseVersion,
    }),
};

export const vehiclesApiOffline = {
  ...vehiclesApi,

  create: (data) => {
    const localEntityId = crypto.randomUUID();
    return offlineAware(() => vehiclesApi.create(data), {
      entity: 'vehicle',
      operation: 'create',
      method: 'POST',
      url: '/workshop/vehicles',
      payload: data,
      localEntityId,
    });
  },

  update: (id, data, baseVersion = null) =>
    offlineAware(() => vehiclesApi.update(id, data), {
      entity: 'vehicle',
      operation: 'update',
      method: 'PUT',
      url: `/workshop/vehicles/${id}`,
      payload: data,
      localEntityId: id,
      baseVersion,
    }),
};
