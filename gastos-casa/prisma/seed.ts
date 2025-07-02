import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIAS_BASE = {
  alimentacion: {
    nombre: "Alimentación",
    color: "#22c55e",
    icono: "🍽️",
    subcategorias: ["Supermercado", "Carnicería", "Frutería", "Otros"]
  },
  comprasOnline: {
    nombre: "Compras Online",
    color: "#3b82f6",
    icono: "🛒",
    subcategorias: ["Amazon", "Ropa", "Tecnología", "Otros"]
  },
  gastosFijos: {
    nombre: "Gastos Fijos",
    color: "#ef4444",
    icono: "🏠",
    subcategorias: ["Alquiler", "Luz", "Agua", "Internet", "Comunidad"]
  },
  mascotas: {
    nombre: "Mascotas",
    color: "#f59e0b",
    icono: "🐕",
    subcategorias: ["Comida", "Veterinario", "Accesorios"]
  },
  salidas: {
    nombre: "Salidas",
    color: "#ec4899",
    icono: "🍻",
    subcategorias: ["Restaurantes", "Cine", "Ocio"]
  },
  transporte: {
    nombre: "Transporte",
    color: "#8b5cf6",
    icono: "🚗",
    subcategorias: ["Gasolina", "Transporte público", "Parking", "Uber/Taxi"]
  },
  cumpleanos: {
    nombre: "Cumpleaños y Regalos",
    color: "#06b6d4",
    icono: "🎁",
    subcategorias: ["Regalos", "Celebraciones"]
  }
}

async function main() {
  console.log('Iniciando seeding de la base de datos...')

  // Crear categorías base
  for (const [key, categoria] of Object.entries(CATEGORIAS_BASE)) {
    console.log(`Creando categoría: ${categoria.nombre}`)
    
    const categoriaCreada = await prisma.categoria.create({
      data: {
        nombre: categoria.nombre,
        color: categoria.color,
        icono: categoria.icono,
        subcategorias: {
          create: categoria.subcategorias.map(sub => ({
            nombre: sub
          }))
        }
      }
    })

    console.log(`✓ Categoría ${categoriaCreada.nombre} creada con ${categoria.subcategorias.length} subcategorías`)
  }

  // Crear cuentas de ejemplo
  const cuentas = [
    {
      nombre: "Gastos Jorge",
      tipo: "personal",
      color: "#3b82f6"
    },
    {
      nombre: "Gastos Violeta", 
      tipo: "personal",
      color: "#ec4899"
    },
    {
      nombre: "Gastos Casa",
      tipo: "compartida",
      color: "#22c55e"
    }
  ]

  for (const cuenta of cuentas) {
    console.log(`Creando cuenta: ${cuenta.nombre}`)
    
    const cuentaCreada = await prisma.cuenta.create({
      data: cuenta
    })

    console.log(`✓ Cuenta ${cuentaCreada.nombre} creada`)
  }

  // Crear algunas reglas de categorización básicas
  const reglasBase = [
    {
      nombre: "Mercadona",
      patron: "MERCADONA",
      tipoCoincidencia: "contiene",
      categoria: "Alimentación",
      prioridad: 1
    },
    {
      nombre: "Gasolinera",
      patron: "(REPSOL|BP|CEPSA|SHELL)",
      tipoCoincidencia: "regex",
      categoria: "Transporte",
      subcategoria: "Gasolina",
      prioridad: 1
    },
    {
      nombre: "Amazon",
      patron: "AMAZON",
      tipoCoincidencia: "contiene",
      categoria: "Compras Online",
      subcategoria: "Amazon",
      prioridad: 1
    }
  ]

  for (const regla of reglasBase) {
    console.log(`Creando regla: ${regla.nombre}`)
    
    await prisma.reglaCategorizacion.create({
      data: regla
    })

    console.log(`✓ Regla ${regla.nombre} creada`)
  }

  console.log('Seeding completado exitosamente!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })