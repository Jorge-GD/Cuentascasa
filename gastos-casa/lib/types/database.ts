import { Prisma } from '@prisma/client'

// Basic types for our models
export type Cuenta = Prisma.CuentaGetPayload<{}>
export type Movimiento = Prisma.MovimientoGetPayload<{}>
export type Categoria = Prisma.CategoriaGetPayload<{}>
export type Subcategoria = Prisma.SubcategoriaGetPayload<{}>
export type ReglaCategorizacion = Prisma.ReglaCategorizacionGetPayload<{}>
export type Etiqueta = Prisma.EtiquetaGetPayload<{}>

// Extended types with relations
export type CuentaWithMovimientos = Prisma.CuentaGetPayload<{
  include: { movimientos: true }
}>

export type MovimientoWithEtiquetas = Prisma.MovimientoGetPayload<{
  include: { etiquetas: true }
}>

export type CategoriaWithSubcategorias = Prisma.CategoriaGetPayload<{
  include: { subcategorias: true }
}>

// Input types for creating records
export type CreateCuentaInput = Prisma.CuentaCreateInput
export type CreateMovimientoInput = Prisma.MovimientoCreateInput
export type CreateCategoriaInput = Prisma.CategoriaCreateInput
export type CreateReglaInput = Prisma.ReglaCategorizacionCreateInput

// Enums
export enum TipoCuenta {
  PERSONAL = 'personal',
  COMPARTIDA = 'compartida'
}

export enum TipoCoincidencia {
  CONTIENE = 'contiene',
  EMPIEZA = 'empieza',
  TERMINA = 'termina',
  REGEX = 'regex'
}