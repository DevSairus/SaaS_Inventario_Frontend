// Tipos de identificación DIAN (schemeID) para clientes, proveedores y
// vendedores ocasionales. El código se envía tal cual en el XML. Los mismos
// que reconoce la importación por Excel (backend thirdPartyImport.service.js).
export const DOCUMENT_TYPE_OPTIONS = [
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '31', label: 'NIT' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '41', label: 'Pasaporte' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '91', label: 'NUIP' },
  { value: '48', label: 'PPT (Permiso de Protección Temporal)' },
  { value: '47', label: 'PEP (Permiso Especial de Permanencia)' },
  { value: '42', label: 'Documento de identificación extranjero' },
  { value: '21', label: 'Tarjeta de extranjería' },
  { value: '50', label: 'NIT de otro país' },
  { value: '11', label: 'Registro civil' },
];
