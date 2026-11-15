import { DOCUMENT_TYPE_OPTIONS } from '../../constants/documentTypes';

/**
 * Tipo de documento del cliente (códigos DIAN, constants/documentTypes.js)
 * para las creaciones rápidas de cliente (venta, OT, OT rápida). Antes esas
 * pantallas solo pedían "Cédula/NIT" y todo quedaba como cédula de
 * ciudadanía (13): un cliente con PPT, pasaporte o NIT salía mal en la
 * factura electrónica.
 */
export default function DocumentTypeSelect({ value, onChange, className = '', name = 'document_type' }) {
  return (
    <select
      name={name}
      value={value || '13'}
      onChange={(e) => onChange(e.target.value, e)}
      className={className}
      aria-label="Tipo de documento"
      title="Tipo de documento"
    >
      {DOCUMENT_TYPE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
