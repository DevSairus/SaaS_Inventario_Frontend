/**
 * Lista ordenada de tours del demo. Para sumar un tour nuevo:
 *   1. crear tours/<nombre>.jsx con su pantalla mock y su guion (ver ordenTrabajo.jsx);
 *   2. definir `audience` en el tour: 'cliente' (lo que ve o recibe el cliente final) o
 *      'negocio' (lo que hace el taller en el backoffice);
 *   3. importarlo aquí y agregarlo a TOURS dentro de su grupo.
 *
 * El menú agrupa por `audience`, así que los tours del mismo grupo deben ir seguidos.
 */
import tourAgendaCitas from './agendaCitas.jsx';
import tourCotizacionAprobada from './cotizacionAprobada.jsx';
import tourSeguimientoOrden from './seguimientoOrden.jsx';
import tourConsultaRunt from './consultaRunt.jsx';
import tourOrdenTrabajo from './ordenTrabajo.jsx';
import tourFacturaDian from './facturaDian.jsx';
import tourPedidosProveedor from './pedidosProveedor.jsx';
import tourImportarFactura from './importarFactura.jsx';

/** Grupos del menú, en orden. */
export const AUDIENCES = [
  { id: 'cliente', label: 'Lo que vive tu cliente', hint: 'Citas, cotizaciones y seguimiento' },
  { id: 'negocio', label: 'Cómo manejas tu negocio', hint: 'Taller, ventas e inventario' },
];

// Cliente: de la cita a la entrega. Negocio: registrar el vehículo → abrir la orden → facturar,
// y después compras e inventario.
const TOURS = [
  tourAgendaCitas, tourCotizacionAprobada, tourSeguimientoOrden,
  tourConsultaRunt, tourOrdenTrabajo, tourFacturaDian, tourPedidosProveedor, tourImportarFactura,
];

export default TOURS;
