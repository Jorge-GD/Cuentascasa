-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "importe" REAL NOT NULL,
    "saldo" REAL,
    "categoriaING" TEXT,
    "subcategoriaING" TEXT,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "esManual" BOOLEAN NOT NULL DEFAULT false,
    "fechaImportacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuentaId" TEXT NOT NULL,
    CONSTRAINT "Movimiento_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icono" TEXT,
    "presupuesto" REAL
);

-- CreateTable
CREATE TABLE "Subcategoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReglaCategorizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "patron" TEXT NOT NULL,
    "tipoCoincidencia" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "prioridad" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "cuentaId" TEXT,
    CONSTRAINT "ReglaCategorizacion_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EtiquetaToMovimiento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EtiquetaToMovimiento_A_fkey" FOREIGN KEY ("A") REFERENCES "Etiqueta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EtiquetaToMovimiento_B_fkey" FOREIGN KEY ("B") REFERENCES "Movimiento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Movimiento_fecha_cuentaId_idx" ON "Movimiento"("fecha", "cuentaId");

-- CreateIndex
CREATE INDEX "Movimiento_categoria_idx" ON "Movimiento"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nombre_key" ON "Etiqueta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "_EtiquetaToMovimiento_AB_unique" ON "_EtiquetaToMovimiento"("A", "B");

-- CreateIndex
CREATE INDEX "_EtiquetaToMovimiento_B_index" ON "_EtiquetaToMovimiento"("B");
