// Une dos listas de registros sin repetir id (gana el primero). Útil para
// combinar una precarga corta con lo que se elige desde una búsqueda remota.
export default function mergeById(base = [], extra = []) {
  const seen = new Set(base.map((x) => String(x.id)));
  return base.concat(extra.filter((x) => x && !seen.has(String(x.id))));
}
