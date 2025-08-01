import { NextRequest, NextResponse } from 'next/server'
import { getCuentaById, updateCuenta, deleteCuenta, getCuentas } from '@/lib/db/queries'
import { TipoCuenta } from '@/lib/types/database'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const cuenta = await getCuentaById(id)
    
    if (!cuenta) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cuenta no encontrada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cuenta
    })
  } catch (error) {
    console.error('Error fetching cuenta:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener la cuenta'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    
    // Verificar que la cuenta existe
    const cuentaExistente = await getCuentaById(id)
    if (!cuentaExistente) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cuenta no encontrada'
        },
        { status: 404 }
      )
    }

    // Validar campos si se proporcionan
    if (body.tipo && !Object.values(TipoCuenta).includes(body.tipo)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tipo de cuenta inválido'
        },
        { status: 400 }
      )
    }

    // Validar nombre único si se está cambiando
    if (body.nombre && body.nombre !== cuentaExistente.nombre) {
      const cuentas = await getCuentas()
      const nombreExiste = cuentas.some(
        cuenta => cuenta.id !== id && 
        cuenta.nombre.toLowerCase() === body.nombre.toLowerCase()
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
    }

    const cuentaActualizada = await updateCuenta(id, {
      ...(body.nombre && { nombre: body.nombre.trim() }),
      ...(body.tipo && { tipo: body.tipo }),
      ...(body.color && { color: body.color })
    })

    return NextResponse.json({
      success: true,
      data: cuentaActualizada
    })

  } catch (error) {
    console.error('Error updating cuenta:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar la cuenta'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Verificar que la cuenta existe
    const cuenta = await getCuentaById(id)
    if (!cuenta) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cuenta no encontrada'
        },
        { status: 404 }
      )
    }

    // Verificar si tiene movimientos y ofrecer borrado en cascada
    const movimientos = await prisma.movimiento.count({
      where: { cuentaId: id }
    })

    if (movimientos > 0) {
      // Obtener parámetro query para confirmar borrado en cascada
      const { searchParams } = new URL(request.url)
      const forzarBorrado = searchParams.get('force') === 'true'
      
      if (!forzarBorrado) {
        return NextResponse.json(
          { 
            success: false,
            error: `La cuenta tiene ${movimientos} movimientos. ¿Deseas eliminarla junto con todos sus datos?`,
            requiresConfirmation: true,
            movimientos
          },
          { status: 409 } // Conflict
        )
      }
      
      // Borrar movimientos primero (borrado en cascada manual)
      await prisma.movimiento.deleteMany({
        where: { cuentaId: id }
      })
      
      // Borrar reglas de categorización asociadas
      await prisma.reglaCategorizacion.deleteMany({
        where: { cuentaId: id }
      })
    }

    await deleteCuenta(id)

    return NextResponse.json({
      success: true,
      message: 'Cuenta eliminada correctamente'
    })

  } catch (error) {
    console.error('Error deleting cuenta:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar la cuenta'
      },
      { status: 500 }
    )
  }
}