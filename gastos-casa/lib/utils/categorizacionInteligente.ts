import { CATEGORIA_TIPO_SUGERIDO } from './plan503020';
import { Tipo503020 } from '@/lib/types/database';

interface MovimientoRaw {
  descripcion: string;
  importe: number;
  categoria?: string;
  subcategoria?: string;
}

interface SugerenciaCategorizacion {
  categoria: string;
  subcategoria?: string;
  tipo503020: Tipo503020;
  confianza: number;
  razon: string;
}

// Patrones mejorados para categorización inteligente
const PATRONES_INTELIGENTES = {
  [Tipo503020.NECESIDADES]: [
    // Alimentación
    { patron: /supermercado|mercado|carrefour|dia|lidl|aldi|eroski|consum/i, categoria: 'Alimentación', subcategoria: 'Supermercado', peso: 0.9 },
    { patron: /farmacia|parafarmacia|medicamento|medicina/i, categoria: 'Salud', subcategoria: 'Farmacia', peso: 0.95 },
    
    // Vivienda
    { patron: /alquiler|renta|inmobiliaria|arrendamiento/i, categoria: 'Vivienda', subcategoria: 'Alquiler', peso: 0.95 },
    { patron: /hipoteca|banco.*vivienda|prestamo.*vivienda/i, categoria: 'Vivienda', subcategoria: 'Hipoteca', peso: 0.95 },
    { patron: /electricidad|endesa|iberdrola|luz|eon|gas natural/i, categoria: 'Vivienda', subcategoria: 'Electricidad', peso: 0.9 },
    { patron: /agua|aqua|suministro.*agua|canal.*isabel/i, categoria: 'Vivienda', subcategoria: 'Agua', peso: 0.9 },
    { patron: /gas|repsol.*gas|cepsa.*gas/i, categoria: 'Vivienda', subcategoria: 'Gas', peso: 0.9 },
    { patron: /internet|wifi|fibra|movistar|vodafone|orange|jazztel/i, categoria: 'Vivienda', subcategoria: 'Internet', peso: 0.85 },
    
    // Transporte
    { patron: /gasolina|gasolinera|combustible|repsol|cepsa|shell|bp/i, categoria: 'Transporte', subcategoria: 'Combustible', peso: 0.9 },
    { patron: /metro|bus|autobus|emt|transporte.*publico|abono.*transporte/i, categoria: 'Transporte', subcategoria: 'Transporte Público', peso: 0.9 },
    { patron: /seguro.*coche|seguro.*auto|mapfre.*auto|axa.*auto/i, categoria: 'Transporte', subcategoria: 'Seguro Auto', peso: 0.9 },
    { patron: /taller|mecanico|reparacion.*auto|itv|inspeccion/i, categoria: 'Transporte', subcategoria: 'Mantenimiento', peso: 0.85 },
    
    // Educación
    { patron: /universidad|colegio|instituto|escuela|educacion|matricula|curso/i, categoria: 'Educación', subcategoria: 'Matrícula', peso: 0.9 },
    { patron: /libros|material.*escolar|papeleria/i, categoria: 'Educación', subcategoria: 'Material', peso: 0.8 },
    
    // Seguros básicos
    { patron: /seguro.*salud|sanitas|adeslas|dkv|asisa/i, categoria: 'Salud', subcategoria: 'Seguro Médico', peso: 0.9 },
    { patron: /seguro.*hogar|seguro.*casa|mapfre.*hogar/i, categoria: 'Vivienda', subcategoria: 'Seguro Hogar', peso: 0.9 }
  ],

  [Tipo503020.DESEOS]: [
    // Ocio y entretenimiento
    { patron: /cine|teatro|concierto|evento|entrada|espectaculo/i, categoria: 'Ocio', subcategoria: 'Entretenimiento', peso: 0.9 },
    { patron: /netflix|amazon.*prime|disney|spotify|apple.*music|youtube.*premium/i, categoria: 'Ocio', subcategoria: 'Suscripciones', peso: 0.95 },
    { patron: /gimnasio|fitness|deportes|entrenamiento/i, categoria: 'Ocio', subcategoria: 'Deporte', peso: 0.9 },
    
    // Restaurantes y comida fuera
    { patron: /restaurante|resto|bar|cafe|pizzeria|hamburgues|mcdonalds|burger.*king|kfc/i, categoria: 'Restaurantes', subcategoria: 'Restaurantes', peso: 0.9 },
    { patron: /just.*eat|uber.*eats|glovo|deliveroo|dominos/i, categoria: 'Restaurantes', subcategoria: 'Delivery', peso: 0.95 },
    
    // Compras no esenciales
    { patron: /zara|h&m|mango|primark|el.*corte.*ingles|amazon.*(?!prime)/i, categoria: 'Compras', subcategoria: 'Ropa', peso: 0.8 },
    { patron: /perfumeria|cosmetica|sephora|douglas/i, categoria: 'Compras', subcategoria: 'Belleza', peso: 0.85 },
    { patron: /fnac|mediamarkt|pccomponentes|electronica/i, categoria: 'Compras', subcategoria: 'Electrónicos', peso: 0.8 },
    
    // Viajes y turismo
    { patron: /hotel|hostal|booking|airbnb|trivago/i, categoria: 'Viajes', subcategoria: 'Alojamiento', peso: 0.9 },
    { patron: /vueling|ryanair|iberia|easyjet|vuelo|avion/i, categoria: 'Viajes', subcategoria: 'Transporte', peso: 0.9 },
    { patron: /renfe|ave|tren|autocar|alsa/i, categoria: 'Viajes', subcategoria: 'Transporte', peso: 0.85 }
  ],

  [Tipo503020.AHORRO]: [
    // Inversiones y ahorro
    { patron: /inversion|bolsa|acciones|fondos|etf|broker/i, categoria: 'Inversión', subcategoria: 'Inversiones', peso: 0.95 },
    { patron: /pension|plan.*pension|jubilacion/i, categoria: 'Ahorro', subcategoria: 'Pensiones', peso: 0.95 },
    { patron: /deposito|cuenta.*ahorro|plazo.*fijo/i, categoria: 'Ahorro', subcategoria: 'Depósitos', peso: 0.9 },
    
    // Pagos de deudas (considerado ahorro por reducir pasivos)
    { patron: /prestamo|credito|financiacion|cuota.*prestamo/i, categoria: 'Ahorro', subcategoria: 'Pago Deudas', peso: 0.8 }
  ]
};

// Palabras clave que indican gastos no esenciales
const INDICADORES_NO_ESENCIALES = [
  'regalo', 'capricho', 'lujo', 'premium', 'deluxe', 'oferta', 'rebaja',
  'black.*friday', 'cyber.*monday', 'descuento'
];

// Palabras clave que indican gastos esenciales
const INDICADORES_ESENCIALES = [
  'urgente', 'necesario', 'emergencia', 'reparacion', 'medico', 'salud',
  'trabajo', 'obligatorio', 'impuesto', 'tasa'
];

export function categorizarMovimientoInteligente(movimiento: MovimientoRaw): SugerenciaCategorizacion | null {
  const descripcion = movimiento.descripcion.toLowerCase();
  const importe = Math.abs(movimiento.importe);
  
  let mejorSugerencia: SugerenciaCategorizacion | null = null;
  let mejorPuntuacion = 0;

  // Buscar en todos los patrones
  for (const [tipo503020, patrones] of Object.entries(PATRONES_INTELIGENTES)) {
    for (const patron of patrones) {
      if (patron.patron.test(descripcion)) {
        let puntuacion = patron.peso;
        
        // Ajustar puntuación según el importe y contexto
        puntuacion = ajustarPuntuacionPorContexto(
          puntuacion,
          descripcion,
          importe,
          tipo503020 as Tipo503020
        );
        
        if (puntuacion > mejorPuntuacion) {
          mejorPuntuacion = puntuacion;
          mejorSugerencia = {
            categoria: patron.categoria,
            subcategoria: patron.subcategoria,
            tipo503020: tipo503020 as Tipo503020,
            confianza: Math.round(puntuacion * 100),
            razon: `Detectado patrón: ${patron.patron.source}`
          };
        }
      }
    }
  }

  // Si no se encontró una coincidencia directa, intentar categorización por reglas heurísticas
  if (!mejorSugerencia) {
    mejorSugerencia = categorizarPorHeuristicas(descripcion, importe);
  }

  return mejorSugerencia;
}

function ajustarPuntuacionPorContexto(
  puntuacionBase: number,
  descripcion: string,
  importe: number,
  tipo503020: Tipo503020
): number {
  let puntuacion = puntuacionBase;

  // Ajustar por indicadores de necesidad
  const esEsencial = INDICADORES_ESENCIALES.some(ind => 
    new RegExp(ind, 'i').test(descripcion)
  );
  const esNoEsencial = INDICADORES_NO_ESENCIALES.some(ind => 
    new RegExp(ind, 'i').test(descripcion)
  );

  if (esEsencial && tipo503020 === Tipo503020.NECESIDADES) {
    puntuacion += 0.1;
  } else if (esNoEsencial && tipo503020 === Tipo503020.DESEOS) {
    puntuacion += 0.1;
  } else if (esEsencial && tipo503020 === Tipo503020.DESEOS) {
    puntuacion -= 0.2; // Penalizar deseos marcados como esenciales
  }

  // Ajustar por importe
  if (tipo503020 === Tipo503020.NECESIDADES) {
    // Gastos muy altos en necesidades suelen ser reales (alquiler, etc.)
    if (importe > 500) puntuacion += 0.05;
  } else if (tipo503020 === Tipo503020.DESEOS) {
    // Gastos pequeños frecuentes suelen ser caprichos
    if (importe < 50) puntuacion += 0.05;
  } else if (tipo503020 === Tipo503020.AHORRO) {
    // Ahorros suelen ser importes redondos
    if (importe % 50 === 0 || importe % 100 === 0) puntuacion += 0.05;
  }

  return Math.min(puntuacion, 1.0);
}

function categorizarPorHeuristicas(descripcion: string, importe: number): SugerenciaCategorizacion | null {
  // Heurísticas básicas cuando no hay coincidencia directa
  
  // Gastos muy grandes probablemente son necesidades
  if (importe > 1000) {
    return {
      categoria: 'Gastos Fijos',
      tipo503020: Tipo503020.NECESIDADES,
      confianza: 60,
      razon: 'Importe alto sugiere gasto esencial'
    };
  }

  // Gastos pequeños y frecuentes probablemente son deseos
  if (importe < 20) {
    return {
      categoria: 'Compras',
      subcategoria: 'Varios',
      tipo503020: Tipo503020.DESEOS,
      confianza: 55,
      razon: 'Importe pequeño sugiere gasto opcional'
    };
  }

  // Transferencias o ingresos podrían ser ahorro
  if (descripcion.includes('transferencia') || descripcion.includes('ingreso')) {
    return {
      categoria: 'Ahorro',
      tipo503020: Tipo503020.AHORRO,
      confianza: 50,
      razon: 'Transferencia podría ser ahorro'
    };
  }

  return null;
}

export function aplicarCategorizacionInteligente(movimientos: MovimientoRaw[]): MovimientoRaw[] {
  return movimientos.map(movimiento => {
    // Solo categorizar si no tiene categoría asignada
    if (movimiento.categoria) {
      return movimiento;
    }

    const sugerencia = categorizarMovimientoInteligente(movimiento);
    
    if (sugerencia && sugerencia.confianza >= 70) {
      return {
        ...movimiento,
        categoria: sugerencia.categoria,
        subcategoria: sugerencia.subcategoria
      };
    }

    return movimiento;
  });
}

export function obtenerSugerenciasCategorizacion(movimiento: MovimientoRaw): SugerenciaCategorizacion[] {
  const sugerencias: SugerenciaCategorizacion[] = [];
  const sugerenciaPrincipal = categorizarMovimientoInteligente(movimiento);
  
  if (sugerenciaPrincipal) {
    sugerencias.push(sugerenciaPrincipal);
  }

  // Agregar sugerencias alternativas basadas en categorías existentes del plan 50/30/20
  Object.entries(CATEGORIA_TIPO_SUGERIDO).forEach(([categoria, tipo503020]) => {
    if (!sugerenciaPrincipal || sugerenciaPrincipal.categoria !== categoria) {
      sugerencias.push({
        categoria,
        tipo503020,
        confianza: 30,
        razon: 'Sugerencia basada en configuración 50/30/20'
      });
    }
  });

  return sugerencias.sort((a, b) => b.confianza - a.confianza).slice(0, 5);
}

// Función para validar si una categorización es coherente con el plan 50/30/20
export function validarCoherencia503020(
  categoria: string,
  tipo503020Asignado: Tipo503020
): { esCoherente: boolean; sugerencia?: Tipo503020; razon?: string } {
  const tipoSugerido = CATEGORIA_TIPO_SUGERIDO[categoria];
  
  if (!tipoSugerido) {
    return { esCoherente: true }; // Sin información, asumimos coherente
  }

  if (tipoSugerido === tipo503020Asignado) {
    return { esCoherente: true };
  }

  return {
    esCoherente: false,
    sugerencia: tipoSugerido,
    razon: `La categoría "${categoria}" típicamente pertenece a "${tipoSugerido}"`
  };
}