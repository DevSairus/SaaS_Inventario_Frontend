// Catálogo de marcas de vehículos más comunes en el mercado colombiano,
// agrupadas por tipo de vehículo — usado para autocompletar el campo
// "Marca" en cotizaciones/ventas (filtra por vehicle_type si está elegido,
// o muestra todas si no se ha especificado el tipo).
export const VEHICLE_BRANDS_BY_TYPE = {
  automovil: [
    'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Nissan', 'Kia', 'Hyundai',
    'Ford', 'Volkswagen', 'Suzuki', 'Chery', 'JAC', 'Great Wall (GWM)',
    'Mitsubishi', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Peugeot',
    'Fiat', 'Citroën', 'Subaru', 'Volvo', 'Jeep', 'Dodge', 'Mini',
    'BYD', 'MG', 'DFSK', 'Baic', 'Seat', 'Skoda', 'Daihatsu', 'Lexus',
    'Acura', 'Infiniti', 'Genesis', 'Porsche', 'Land Rover', 'Jaguar',
    'Alfa Romeo', 'Chrysler', 'GMC', 'Cadillac', 'Buick', 'Opel',
    'Ssangyong', 'Changan', 'GAC', 'Omoda', 'Jetour', 'Maxus',
  ],
  camioneta: [
    'Chevrolet', 'Toyota', 'Nissan', 'Ford', 'Renault', 'Kia', 'Hyundai',
    'Mazda', 'Great Wall (GWM)', 'JAC', 'Foton', 'Mitsubishi', 'Volkswagen',
    'Jeep', 'Dodge', 'BYD', 'Land Rover', 'GMC', 'Ssangyong', 'Changan',
    'Maxus', 'Isuzu',
  ],
  camion: [
    'Chevrolet', 'Ford', 'Foton', 'JAC', 'Hino', 'Isuzu', 'International',
    'Kenworth', 'Freightliner', 'Volvo', 'Mercedes-Benz', 'Dongfeng', 'Faw',
    'Scania', 'Mack', 'Man', 'Iveco', 'Dina',
  ],
  motocicleta: [
    'Yamaha', 'Honda', 'Suzuki', 'Bajaj', 'AKT', 'Auteco', 'TVS', 'KTM',
    'Kawasaki', 'Hero', 'Kymco', 'UM', 'Benelli', 'Royal Enfield', 'Ducati',
    'Italika', 'Victory', 'Akt Motos', 'Boxer', 'CFMoto', 'SYM', 'Vento',
    'Hyosung', 'Zongshen', 'Loncin', 'Keeway', 'Bmw Motorrad',
  ],
  otro: [],
};

export const ALL_VEHICLE_BRANDS = [
  ...new Set(Object.values(VEHICLE_BRANDS_BY_TYPE).flat()),
].sort();

// Marcas sugeridas según el tipo de vehículo elegido; sin tipo, todas.
export function brandsForType(vehicleType) {
  if (!vehicleType || !VEHICLE_BRANDS_BY_TYPE[vehicleType]?.length) {
    return ALL_VEHICLE_BRANDS;
  }
  return [...VEHICLE_BRANDS_BY_TYPE[vehicleType]].sort();
}
