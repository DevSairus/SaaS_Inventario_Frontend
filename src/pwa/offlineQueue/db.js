import Dexie from 'dexie';

// Cola de mutaciones offline de la PWA "Taller" (OT y vehículos únicamente,
// ver frontend/src/api/workshopOffline.js). Vive en IndexedDB para sobrevivir
// recargas de página mientras el técnico está sin conexión.
class OfflineDB extends Dexie {
  constructor() {
    super('PitboxOfflineDB');
    this.version(1).stores({
      // id (uuid, PK), resto son índices útiles para consultas del syncManager y la UI.
      mutationQueue: 'id, entity, status, createdAt',
    });
  }
}

const db = new OfflineDB();

export default db;
