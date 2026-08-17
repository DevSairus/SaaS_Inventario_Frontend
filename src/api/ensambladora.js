import axios from './axios';

// ── Módulo Ensambladora (consulta de vehículos contra el Core) ─────────
// Backend: GET /api/ensambladora/vehiculos/:vin (cache lazy vs el Core,
// ?forzar_online=true refresca) y POST /api/ensambladora/vehiculos/:vin/
// validar-disponibilidad (siempre en línea contra el Core, nunca cache).
export const ensambladoraVehiculosApi = {
  getByVin: (vin, { forzarOnline = false } = {}) =>
    axios.get(`/ensambladora/vehiculos/${encodeURIComponent(vin)}`, {
      params: forzarOnline ? { forzar_online: true } : undefined,
    }),
  // Segunda vía para el mismo vehículo, por placa en vez de VIN (ver
  // requerimientos-pitbox-busqueda-por-placa.md) -- siempre en línea, no
  // hay cache local indexado por placa. Devuelve el mismo shape que
  // getByVin: { success, data: vehiculo }. 404 si la placa no existe en el
  // catálogo (puede que el vehículo simplemente aún no esté matriculado).
  buscarPorPlaca: (placa) => axios.get('/ensambladora/vehiculos/buscar', { params: { placa } }),
  // Informa al Core la placa de un vehículo ya matriculado (ver
  // requerimientos-pitbox-busqueda-por-placa.md, sección 3) -- evento
  // propio `vehiculo.matriculado`, independiente de la venta. 409
  // placa_duplicada si esa placa ya quedó asignada a otro vehículo.
  matricular: (vin, placa) => axios.post(`/ensambladora/vehiculos/${encodeURIComponent(vin)}/matricular`, { placa }),
  validarDisponibilidad: (vin) =>
    axios.post(`/ensambladora/vehiculos/${encodeURIComponent(vin)}/validar-disponibilidad`),
  // Fase 3 — agenda de revisiones pendientes. Armada del lado Pitbox (no
  // existe un listado por CSA en el Core, ver ciclovida.controller.js /
  // agendaRevisiones): { success, data: [vehiculo...], total }.
  agendaRevisiones: ({ forzarOnline = false } = {}) =>
    axios.get('/ensambladora/vehiculos/agenda-revisiones', {
      params: forzarOnline ? { forzar_online: true } : undefined,
    }),
  // Fase 6 — marcar un recall como atendido. campanaId es CampanaRecall.id
  // (el `campana_id` que viaja en cada item de vehiculo.recalls_pendientes,
  // NO el campana_recall_vehiculo_id de la fila de cruce). Sin tabla local:
  // solo confirma con el Core (ver atenderRecall, vehiculos.controller.js).
  atenderRecall: (vin, campanaId) =>
    axios.post(`/ensambladora/vehiculos/${encodeURIComponent(vin)}/recalls/${encodeURIComponent(campanaId)}/atender`),
};

// ── Fase 3 / Fase 9: revisiones periódicas ──────────────────────────────
// politica_id sale de vehiculo.proxima_revision.politica_id (respuesta de
// GET /vehiculos/:vin) -- el CSA nunca lo arma a mano, siempre lo copia de
// ahí, o de una de las políticas de politicasMantenimiento si es una
// revisión fuera de secuencia (ver comentario en crearRevision,
// ciclovida.controller.js).
// Fase 9 agrega el detalle del formulario de mantenimiento en taller (todo
// opcional salvo lo que ya era obligatorio):
//   { vin*, politica_id*, fecha_realizada*, kilometraje_registrado,
//     checklist, observaciones, tarifario_servicio_id, valor_mano_obra,
//     piezas: [{ pieza_codigo, cantidad }] }
export const ensambladoraRevisionesApi = {
  create: (data) => axios.post('/ensambladora/revisiones', data),
};

// ── Fase 3 (seguimiento): comprobante imprimible + link público ─────────
// Mismo patrón que workshopApi.getPDF/generateShareToken (ver
// frontend/src/api/workshop.js) -- el PDF requiere blob porque va con auth
// (Authorization header), el link público en cambio no necesita sesión y
// se consulta directo contra /public/... desde SeguimientoPublicoPage.jsx.
const RUTA_COMPROBANTE = { revision: 'revisiones', garantia: 'garantias' };
export const ensambladoraComprobantesApi = {
  getPdf: (tipo, id) => axios.get(`/ensambladora/${RUTA_COMPROBANTE[tipo]}/${id}/pdf`, { responseType: 'blob' }),
  generarShareToken: (tipo, id) => axios.post(`/ensambladora/${RUTA_COMPROBANTE[tipo]}/${id}/share-token`),
};

// ── Fase 9: datos de referencia del formulario de mantenimiento ────────
// Pass-through puro hacia el Core (mismo patrón que tarifarioVigente, ver
// liquidaciones.controller.js) -- ver
// requerimientos-pitbox-formulario-mantenimiento.md, secciones 1.1bis y 1.3.
//   GET /ensambladora/politicas-mantenimiento?linea_id=  -> { success, data: [politica...] }
//   GET /ensambladora/catalogo-piezas?marca_id=&linea_id= -> { success, data: [pieza...] }
export const ensambladoraMantenimientoApi = {
  politicasPorLinea: (lineaId) => axios.get('/ensambladora/politicas-mantenimiento', { params: { linea_id: lineaId } }),
  // lineaId es opcional -- si se pasa, el Core además de las piezas de
  // toda la marca incluye las asociadas puntualmente a esa línea (ver
  // GarantiaFormPage.jsx y RevisionFormPage.jsx).
  catalogoPiezas: (marcaId, lineaId) =>
    axios.get('/ensambladora/catalogo-piezas', { params: { marca_id: marcaId, linea_id: lineaId || undefined } }),
};

// ── Fase 2: venta / alistamiento / entrega ──────────────────────────────
// El módulo Ensambladora en Pitbox expone estos 3 endpoints (roadmap, Fase
// 2 — "Back Pitbox: ✅ Hecho"), que a su vez emiten los eventos
// venta.creada / alistamiento.completado / entrega.completada hacia el
// Core (ver eventoSyncHandlers.js). Los campos de cada payload siguen
// exactamente lo que esos handlers exigen como obligatorio/opcional:
//   venta:        { vin*, fecha_venta*, cliente_documento, cliente_nombre, cliente_telefono, precio }
//   alistamiento: { vin*, fecha*, responsable, checklist, observaciones }
//   entrega:      { vin*, fecha_entrega*, recibido_por, evidencia_url }
// No tuve el backend del módulo Pitbox a la vista (solo el Core), así que
// esta es la mejor inferencia a partir del contrato de eventos — validar
// contra el backend real de Pitbox cuando esté disponible.
export const ensambladoraVentasApi = {
  create: (data) => axios.post('/ensambladora/ventas', data),
};

export const ensambladoraAlistamientosApi = {
  // Para saber si ya existe un alistamiento local antes de ofrecer el
  // formulario de nuevo -- ver listByVin de ensambladoraGarantiasApi, mismo
  // criterio (409 vin_ya_alistado_localmente si de todos modos se insiste).
  listByVin: (vin) => axios.get('/ensambladora/alistamientos', { params: { vin } }),
  create: (data) => axios.post('/ensambladora/alistamientos', data),
};

export const ensambladoraEntregasApi = {
  listByVin: (vin) => axios.get('/ensambladora/entregas', { params: { vin } }),
  // Si hay archivo de evidencia se envía multipart (mismo criterio que
  // workOrdersApi.uploadPhotos); si no, JSON normal con evidencia_url en
  // texto por si ya se tiene un link.
  create: (data, evidenciaFile) => {
    if (evidenciaFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') formData.append(k, v);
      });
      formData.append('evidencia', evidenciaFile);
      return axios.post('/ensambladora/entregas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axios.post('/ensambladora/entregas', data);
  },
};

// ── Fase 5: tarifario y liquidaciones ────────────────────────────────────
// Backend: pass-through puro hacia el Core, sin tabla local (ver
// liquidaciones.controller.js) -- el CSA no "crea" nada acá, solo consulta
// lo que el Core ya generó en su cierre de periodo.
//   GET /ensambladora/liquidaciones        -> { success, data: [liquidacion...] }
//   GET /ensambladora/liquidaciones/:id    -> { success, data: liquidacion } (con items)
//   GET /ensambladora/tarifario?marca_id=  -> { success, data: [tarifa...] }
export const ensambladoraLiquidacionesApi = {
  list: () => axios.get('/ensambladora/liquidaciones'),
  getById: (id) => axios.get(`/ensambladora/liquidaciones/${encodeURIComponent(id)}`),
  tarifarioVigente: (marcaId) => axios.get('/ensambladora/tarifario', { params: { marca_id: marcaId } }),
};

// ── Fase 7: técnicos/asesores ────────────────────────────────────────────
// Gestión local (ensambladora_tecnicos_asesores) + sincronización al Core.
//   GET  /ensambladora/tecnicos              -> listado local (todos, vinculados y no)
//   POST /ensambladora/tecnicos              -> vincular (upsert local + evento al Core)
//   POST /ensambladora/tecnicos/:doc/desvincular
//   GET  /ensambladora/tecnicos/:doc          -> verificar (pass-through al Core;
//        útil para saber si un documento ya es reconocido en la red antes de
//        vincularlo acá)
// ── Cotización de moto no vendida ────────────────────────────────────────
// El asesor elige marca -> línea (con precio_lista si el Core lo tiene
// configurado, autofill editable) y agrega rubros libres (matrícula, etc).
// Mismo criterio pass-through que catalogoPiezas/politicasMantenimiento
// para marcas/líneas; create sincroniza al Core vía evento cotizacion.creada.
export const ensambladoraCotizacionesApi = {
  marcas: () => axios.get('/ensambladora/marcas'),
  lineas: (marcaId) => axios.get('/ensambladora/lineas', { params: { marca_id: marcaId } }),
  create: (data) => axios.post('/ensambladora/cotizaciones', data),
  getPdf: (id) => axios.get(`/ensambladora/cotizaciones/${id}/pdf`, { responseType: 'blob' }),
};

export const ensambladoraTecnicosApi = {
  list: () => axios.get('/ensambladora/tecnicos'),
  vincular: (data) => axios.post('/ensambladora/tecnicos', data),
  desvincular: (documento) => axios.post(`/ensambladora/tecnicos/${encodeURIComponent(documento)}/desvincular`),
  verificar: (documento) => axios.get(`/ensambladora/tecnicos/${encodeURIComponent(documento)}`),
};

// ── Fase 8: panel de monitoreo de sincronización ─────────────────────────
// Sobre ensambladora_eventos_sync (outbox/inbox de este tenant, tabla
// creada desde Fase 0) -- ver sync.controller.js. Reintentar solo tiene
// efecto real en eventos SALIENTES en error que nunca llegaron al Core;
// si el evento sí llegó pero falló una validación de negocio, el reintento
// hay que hacerlo desde el panel del Core (la idempotencia por event_id
// haría que esto solo devuelva el estado viejo, ver LEEME de Fase 8).
export const ensambladoraSyncApi = {
  listEvents: (filtros = {}) => axios.get('/ensambladora/sync/events', { params: filtros }),
  reintentar: (eventId) => axios.post(`/ensambladora/sync/events/${encodeURIComponent(eventId)}/reintentar`),
  marcarRevisado: (eventId, revisadoPor) =>
    axios.post(`/ensambladora/sync/events/${encodeURIComponent(eventId)}/marcar-revisado`, { revisado_por: revisadoPor }),
};

// ── Auditoría de garantía/alistamiento/etc (ver auditoria.controller.js) ──
export const ensambladoraAuditoriaApi = {
  list: (filtros = {}) => axios.get('/ensambladora/auditoria', { params: filtros }),
};

// ── Fase 4: garantías ────────────────────────────────────────────────────
// Radicar: { vin*, tecnico_documento, items*: [{pieza_codigo*, codigo_falla,
// cantidad, evidencia_url}] }. Si algún item trae foto, se manda multipart:
// `items` va como JSON string (sin evidencia_url) y cada foto en un campo
// `evidencia_<index>` -- el backend arma el evidencia_url final subiendo a
// Cloudinary (ver crearGarantia, garantias.controller.js).
// Cerrar: usa el id LOCAL (no el id que trae vehiculo.garantias del Core) --
// por eso existe listByVin, para cruzar core_orden_garantia_id -> id local.
export const ensambladoraGarantiasApi = {
  listByVin: (vin) => axios.get('/ensambladora/garantias', { params: { vin } }),
  listAll: () => axios.get('/ensambladora/garantias/todas'),
  create: (data, itemFiles = {}) => {
    const hasFiles = Object.keys(itemFiles).length > 0;
    if (hasFiles) {
      const formData = new FormData();
      formData.append('vin', data.vin);
      if (data.tecnico_documento) formData.append('tecnico_documento', data.tecnico_documento);
      formData.append('items', JSON.stringify(data.items));
      Object.entries(itemFiles).forEach(([idx, file]) => {
        if (file) formData.append(`evidencia_${idx}`, file);
      });
      return axios.post('/ensambladora/garantias', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axios.post('/ensambladora/garantias', data);
  },
  cerrar: (localId, data) => axios.post(`/ensambladora/garantias/${encodeURIComponent(localId)}/cerrar`, data),
  getDetalle: (localId) => axios.get(`/ensambladora/garantias/${encodeURIComponent(localId)}`),
  // Reenviar una garantía "devuelta": igual convención multipart que create,
  // más `items_eliminar` (ids de items existentes a borrar). Cada item en
  // `data.items` con `id` corrige un renglón existente; sin `id` es nuevo.
  reenviar: (localId, data, itemFiles = {}) => {
    const hasFiles = Object.keys(itemFiles).length > 0;
    if (hasFiles) {
      const formData = new FormData();
      formData.append('items', JSON.stringify(data.items));
      formData.append('items_eliminar', JSON.stringify(data.items_eliminar || []));
      Object.entries(itemFiles).forEach(([idx, file]) => {
        if (file) formData.append(`evidencia_${idx}`, file);
      });
      return axios.post(`/ensambladora/garantias/${encodeURIComponent(localId)}/reenviar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axios.post(`/ensambladora/garantias/${encodeURIComponent(localId)}/reenviar`, data);
  },
};
