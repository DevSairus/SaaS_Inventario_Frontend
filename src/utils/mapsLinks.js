// Enlaces a Google Maps (sin llave ni costo: solo abren el mapa en otra pestaña).
// Google entiende la nomenclatura colombiana ("CR 54 CL 36 -69, Itagüí"), que
// OpenStreetMap no resuelve.

/** Busca una dirección escrita, completada con ciudad y departamento. */
export const googleMapsSearchUrl = (address, city, department) => {
  const query = [address, city, department, 'Colombia'].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/** Vista satelital centrada en un punto (para ver el techo). */
export const googleMapsPointUrl = (lat, lon) =>
  `https://www.google.com/maps/@?api=1&map_action=map&center=${Number(lat)},${Number(lon)}&zoom=20&basemap=satellite`;

/**
 * "4.43891, -75.23218" (lo que copia Google Maps con clic derecho) → { latitude, longitude }.
 * null si el texto no es un par de coordenadas dentro de Colombia.
 */
export const parseLatLon = (text) => {
  const m = String(text || '').trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{2,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (!(latitude >= -5 && latitude <= 14 && longitude >= -82 && longitude <= -66)) return null;
  return { latitude, longitude };
};
