import { NextRequest, NextResponse } from 'next/server'
import { getCuentas, createCuenta } from '@/lib/db/queries'
import { TipoCuenta } from '@/lib/types/database'

export async function GET() {
  try {
    const cuentas = await getCuentas()
    
    return NextResponse.json({
      success: true,
      data: cuentas
    })
  } catch (error) {
    console.error('Error fetching cuentas:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener las cuentas'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.nombre || !body.tipo || !body.color) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Faltan campos requeridos: nombre, tipo, color'
        },
        { status: 400 }
      )
    }

    // Validar tipo de cuenta
    if (!Object.values(TipoCuenta).includes(body.tipo)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tipo de cuenta inválido. Debe ser "personal" o "compartida"'
        },
        { status: 400 }
      )
    }

    // Validar nombre único
    const cuentasExistentes = await getCuentas()
    const nombreExiste = cuentasExistentes.some(
      cuenta => cuenta.nombre.toLowerCase() === body.nombre.toLowerCase()
    )
    
    if (nombreExiste) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe una cuenta con ese nombre'
        },
        { status: 400 }
      )
    }

    const nuevaCuenta = await createCuenta({
      nombre: body.nombre.trim(),
      tipo: body.tipo,
      color: body.color
    })

    return NextResponse.json({
      success: true,
      data: nuevaCuenta
    })

  } catch (error) {
    console.error('Error creating cuenta:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear la cuenta'
      },
      { status: 500 }
    )
  }
}