/* ===========================================================================
   Catalogo de ejemplo: productos y clientes para llenar un comprobante rapido.
   No sale de la API, vive aqui para que la primera prueba no exija cargar
   nada antes. Los codigos SUNAT son reales.
   ======================================================================== */

var App = window.App || (window.App = {});

App.UNIDADES = [
  { c: 'NIU', n: 'Unidad' },
  { c: 'ZZ',  n: 'Servicio' },
  { c: 'HUR', n: 'Hora' },
  { c: 'DAY', n: 'Día' },
  { c: 'KGM', n: 'Kilogramo' },
  { c: 'MTR', n: 'Metro' },
  { c: 'LTR', n: 'Litro' },
  { c: 'BX',  n: 'Caja' },
  { c: 'PK',  n: 'Paquete' },
  { c: 'MON', n: 'Mes' }
];

/* Tipos de afectacion del IGV (catalogo 07 de SUNAT), los de uso corriente. */
App.AFECTACIONES = [
  { c: '10', n: 'Gravado — operación onerosa' },
  { c: '20', n: 'Exonerado — operación onerosa' },
  { c: '30', n: 'Inafecto — operación onerosa' },
  { c: '40', n: 'Exportación' }
];

App.MONEDAS = [
  { c: 'PEN', n: 'Soles (PEN)' },
  { c: 'USD', n: 'Dólares (USD)' }
];

App.TIPOS_DOC_CLIENTE = [
  { c: '1', n: 'DNI', digitos: 8 },
  { c: '6', n: 'RUC', digitos: 11 },
  { c: '4', n: 'Carnet de extranjería', digitos: 0 },
  { c: '7', n: 'Pasaporte', digitos: 0 },
  { c: '0', n: 'Sin documento', digitos: 0 }
];

App.PRODUCTOS = [
  { codigo: 'P001', sunat: '43211503', descripcion: 'Laptop HP Pavilion 15 i7 16GB 512GB SSD', unidad: 'NIU', precio: 2950.00, igv: '10' },
  { codigo: 'P002', sunat: '43211708', descripcion: 'Mouse Logitech M170 inalámbrico',         unidad: 'NIU', precio: 59.00,   igv: '10' },
  { codigo: 'P003', sunat: '43211706', descripcion: 'Teclado mecánico Redragon K552 RGB',      unidad: 'NIU', precio: 189.00,  igv: '10' },
  { codigo: 'P004', sunat: '43211902', descripcion: 'Monitor LG 24" IPS Full HD',              unidad: 'NIU', precio: 749.00,  igv: '10' },
  { codigo: 'P005', sunat: '43202010', descripcion: 'Impresora Epson L3250 multifuncional',    unidad: 'NIU', precio: 899.00,  igv: '10' },
  { codigo: 'P006', sunat: '44103105', descripcion: 'Cartucho de tinta negro 664 BK',          unidad: 'NIU', precio: 45.00,   igv: '10' },
  { codigo: 'P007', sunat: '55101500', descripcion: 'Libro "Clean Code" — Robert C. Martin',   unidad: 'NIU', precio: 89.00,   igv: '20' },
  { codigo: 'S001', sunat: '81111501', descripcion: 'Consultoría en TI (hora)',                unidad: 'HUR', precio: 150.00,  igv: '10' },
  { codigo: 'S002', sunat: '81112005', descripcion: 'Soporte técnico mensual',                 unidad: 'MON', precio: 450.00,  igv: '10' },
  { codigo: 'S003', sunat: '81111811', descripcion: 'Desarrollo de página web (proyecto)',     unidad: 'ZZ',  precio: 3500.00, igv: '10' },
  { codigo: 'S004', sunat: '80101604', descripcion: 'Capacitación corporativa (8 horas)',      unidad: 'DAY', precio: 1200.00, igv: '10' }
];

/* Clientes de relleno. El RUC 20601030013 es de uso corriente en pruebas. */
App.CLIENTES_EJEMPLO = [
  { tipo: '6', numero: '20601030013', razon_social: 'ACME CORPORATION SAC',      direccion: 'Av. Larco 1234 — Miraflores' },
  { tipo: '6', numero: '20548112719', razon_social: 'DISTRIBUIDORA LIMA EIRL',   direccion: 'Jr. Comercio 456 — Lima' },
  { tipo: '1', numero: '46756431',    razon_social: 'JUAN CARLOS PÉREZ LÓPEZ',   direccion: 'Calle Las Flores 123' },
  { tipo: '1', numero: '10467890',    razon_social: 'MARÍA ROSA GÓMEZ VEGA',     direccion: 'Av. Universitaria 5678' }
];

/* Motivos de nota de credito y debito (catalogos 09 y 10). */
App.MOTIVOS_NC = [
  { c: '01', n: 'Anulación de la operación' },
  { c: '02', n: 'Anulación por error en el RUC' },
  { c: '03', n: 'Corrección por error en la descripción' },
  { c: '04', n: 'Descuento global' },
  { c: '05', n: 'Descuento por ítem' },
  { c: '06', n: 'Devolución total' },
  { c: '07', n: 'Devolución por ítem' },
  { c: '13', n: 'Ajustes de operaciones de exportación' }
];

App.MOTIVOS_ND = [
  { c: '01', n: 'Intereses por mora' },
  { c: '02', n: 'Aumento en el valor' },
  { c: '03', n: 'Penalidades / otros conceptos' }
];

/* Motivos de traslado de la guia de remision (catalogo 20). */
App.MOTIVOS_TRASLADO = [
  { c: '01', n: 'Venta' },
  { c: '02', n: 'Compra' },
  { c: '04', n: 'Traslado entre establecimientos de la misma empresa' },
  { c: '08', n: 'Importación' },
  { c: '09', n: 'Exportación' },
  { c: '13', n: 'Otros' }
];

/* Formatos de impresion que acepta la API. Los dos de ticket son los anchos
   reales de las impresoras termicas; el 50mm queda por compatibilidad. */
App.FORMATOS_PDF = [
  { c: 'A4',   n: 'A4 — hoja completa' },
  { c: 'A5',   n: 'A5 — media hoja' },
  { c: '80mm', n: 'Ticket 80 mm' },
  { c: '58mm', n: 'Ticket 58 mm' }
];

/* ===========================================================================
   Ejemplos completos, uno por comprobante.

   Rellenan el formulario entero para ver como queda el documento sin escribir
   nada. Los datos son coherentes con lo que pide SUNAT: una factura a RUC, una
   boleta a DNI, las notas contra un comprobante anterior y la guia con su
   traslado. Los productos salen del catalogo de arriba, por su codigo.
   ======================================================================== */

App.EJEMPLOS = {
  factura: {
    titulo: 'Factura a empresa',
    cliente: { tipo: '6', numero: '20601030013', razon_social: 'ACME CORPORATION SAC', direccion: 'Av. Larco 1234 — Miraflores' },
    moneda: 'PEN',
    pago: 'Contado',
    lineas: ['P001', 'P002', 'S002']
  },

  boleta: {
    titulo: 'Boleta a persona',
    cliente: { tipo: '1', numero: '46756431', razon_social: 'JUAN CARLOS PÉREZ LÓPEZ', direccion: 'Calle Las Flores 123' },
    moneda: 'PEN',
    pago: 'Contado',
    lineas: ['P003', 'P006']
  },

  nc: {
    titulo: 'Nota de crédito por devolución',
    cliente: { tipo: '6', numero: '20601030013', razon_social: 'ACME CORPORATION SAC', direccion: 'Av. Larco 1234 — Miraflores' },
    moneda: 'PEN',
    pago: 'Contado',
    // Se anota contra una factura anterior: hay que cambiar el numero por uno
    // que exista de verdad, o SUNAT rechaza la nota.
    afectado: { tipo: '01', numero: 'F001-00000001', motivo: '06' },
    lineas: ['P003']
  },

  nd: {
    titulo: 'Nota de débito por mora',
    cliente: { tipo: '6', numero: '20548112719', razon_social: 'DISTRIBUIDORA LIMA EIRL', direccion: 'Jr. Comercio 456 — Lima' },
    moneda: 'PEN',
    pago: 'Credito',
    afectado: { tipo: '01', numero: 'F001-00000001', motivo: '01' },
    lineas: ['S001']
  },

  guia: {
    titulo: 'Guía de remisión por venta',
    // El destinatario sale de los clientes que tenga la empresa en la API, asi
    // que aqui solo se dice el motivo y el traslado.
    traslado: {
      motivo: '01',
      modalidad: '02',            // 02 = transporte privado, el de la propia empresa
      peso: 12.5,
      bultos: 3,
      partida_ubigeo: '150101',
      partida_direccion: 'Av. Argentina 2020 — Almacén central, Lima',
      llegada_ubigeo: '150122',
      llegada_direccion: 'Av. Larco 1234 — Miraflores, Lima',
      conductor: {
        tipo_doc: '1',
        num_doc: '46756431',
        nombres: 'CARLOS ALBERTO',
        apellidos: 'RAMÍREZ SOTO',
        licencia: 'Q46756431'
      },
      placa: 'ABC-123'
    }
  }
};
