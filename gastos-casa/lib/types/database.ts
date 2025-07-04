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
export type CreateSubcategoriaInput = Prisma.SubcategoriaCreateInput
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

export enum Tipo503020 {
  NECESIDADES = 'necesidades',
  DESEOS = 'deseos',
  AHORRO = 'ahorro'
}

export enum TipoMeta {
  EMERGENCIA = 'emergencia',
  DEUDA = 'deuda',
  META_PERSONAL = 'meta_personal'
}

// New types for 50/30/20 module
export type ConfiguracionUsuario = Prisma.ConfiguracionUsuarioGetPayload<{}>
export type MetaAhorro = Prisma.MetaAhorroGetPayload<{}>

export type ConfiguracionUsuarioWithMetas = Prisma.ConfiguracionUsuarioGetPayload<{
  include: { metas: true }
}>

export type CreateConfiguracionUsuarioInput = Prisma.ConfiguracionUsuarioCreateInput
export type CreateMetaAhorroInput = Prisma.MetaAhorroCreateInput