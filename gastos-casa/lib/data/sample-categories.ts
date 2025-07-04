// Sample data for testing the CategoryDonutChart component
export const sampleCategoryData = [
  {
    categoria: 'Alimentación',
    total: 366.74,
    porcentaje: 45.2,
    transacciones: 24,
    subcategorias: [
      { nombre: 'Supermercado', total: 250.00, porcentaje: 68.1, transacciones: 15 },
      { nombre: 'Restaurantes', total: 100.00, porcentaje: 27.3, transacciones: 6 },
      { nombre: 'Cafeterías', total: 16.74, porcentaje: 4.6, transacciones: 3 }
    ]
  },
  {
    categoria: 'Gastos Fijos',
    total: 186.42,
    porcentaje: 23.0,
    transacciones: 8,
    subcategorias: [
      { nombre: 'Suscripciones', total: 89.99, porcentaje: 48.3, transacciones: 5 },
      { nombre: 'Internet', total: 56.43, porcentaje: 30.3, transacciones: 1 },
      { nombre: 'Telefonía', total: 40.00, porcentaje: 21.4, transacciones: 2 }
    ]
  },
  {
    categoria: 'Transporte',
    total: 125.80,
    porcentaje: 15.5,
    transacciones: 12,
    subcategorias: [
      { nombre: 'Combustible', total: 75.50, porcentaje: 60.0, transacciones: 4 },
      { nombre: 'Transporte Público', total: 35.30, porcentaje: 28.1, transacciones: 6 },
      { nombre: 'Parking', total: 15.00, porcentaje: 11.9, transacciones: 2 }
    ]
  },
  {
    categoria: 'Entretenimiento',
    total: 95.20,
    porcentaje: 11.7,
    transacciones: 6,
    subcategorias: [
      { nombre: 'Cine', total: 45.00, porcentaje: 47.3, transacciones: 3 },
      { nombre: 'Libros', total: 28.20, porcentaje: 29.6, transacciones: 2 },
      { nombre: 'Videojuegos', total: 22.00, porcentaje: 23.1, transacciones: 1 }
    ]
  },
  {
    categoria: 'Salud',
    total: 37.50,
    porcentaje: 4.6,
    transacciones: 3,
    subcategorias: [
      { nombre: 'Farmacia', total: 25.50, porcentaje: 68.0, transacciones: 2 },
      { nombre: 'Médicos', total: 12.00, porcentaje: 32.0, transacciones: 1 }
    ]
  }
]