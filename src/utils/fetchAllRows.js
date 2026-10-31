// Recorre todas las páginas de un listado (el backend topa cada página, p. ej.
// productos en 200). Solo para cruces masivos (importar un Excel contra el
// catálogo), no para llenar selectores: ahí va búsqueda remota.
//   fetchPage(page, limit) → Promise<{ rows, total }>
// Con el total de la primera página, el resto se pide en paralelo (de a
// `concurrency`); sin total, sigue página por página hasta una incompleta.
export default async function fetchAllRows(fetchPage, { pageSize = 200, maxRows = 50000, concurrency = 4 } = {}) {
  const first = await fetchPage(1, pageSize);
  const all = [...(first.rows || [])];
  if (all.length < pageSize) return all;

  if (first.total != null) {
    const lastPage = Math.ceil(Math.min(first.total, maxRows) / pageSize);
    const pages = [];
    for (let p = 2; p <= lastPage; p++) pages.push(p);
    const results = new Array(pages.length);
    let next = 0;
    const worker = async () => {
      while (next < pages.length) {
        const i = next++;
        results[i] = (await fetchPage(pages[i], pageSize)).rows || [];
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, worker));
    results.forEach((rows) => all.push(...rows));
    return all;
  }

  for (let page = 2; all.length < maxRows; page++) {
    const { rows = [] } = await fetchPage(page, pageSize);
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
