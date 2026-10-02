# Cisma Fact Sandbox

Consola para probar la API de facturación electrónica de **Cisma Fact** contra
**SUNAT beta**. No necesita instalar nada: es una carpeta con HTML, CSS y
JavaScript.

---

## Cómo se usa

1. Descomprime la carpeta donde quieras.
2. Abre **`index.html`** con doble clic. Se abre en tu navegador.
3. Entra en la **Conexión** de lo que vayas a probar y pega tus credenciales.

   Son **dos APIs distintas**, con credenciales distintas, y se contratan por
   separado. Solo necesitas configurar la que hayas contratado: con la de
   consultas puedes usar RUC y DNI aunque no tengas la de emitir, y al revés.

   | Menú | Para qué | La llave empieza por |
   |---|---|---|
   | **Conexión · Emitir** | Facturas, boletas, notas, guías | `cf_` |
   | **Conexión · RUC y DNI** | Consultar RUC y DNI | `ck_` |

   La **URL base** se pone una vez en *Conexión · Emitir* y vale para las dos:
   `https://cismafact.alwaysdata.net/api`

4. Pulsa **Probar conexión**. En la de emitir verás la razón social y el RUC de
   la empresa; en la de RUC y DNI, tu plan y las consultas que te quedan
   —comprobarlo no gasta ninguna—.

Las credenciales se guardan solo en tu navegador. Nunca salen de tu equipo
salvo hacia la API, en cada petición.

---

## Qué trae

- **Panel** — ventas de hoy, semana y mes, los últimos doce meses, reparto por
  estado frente a SUNAT y los comprobantes más recientes.
- **Emitir** — factura, boleta, nota de crédito, nota de débito y guía de
  remisión. A la derecha ves siempre el **cuerpo exacto de la petición** que se
  va a enviar, listo para copiar a tu código.
- **Comprobantes** — listado por tipo, con descarga del PDF, el XML firmado y el
  CDR de SUNAT.
- **Resumen diario** — comunicación de boletas en lote.
- **Consultar RUC y DNI** — la otra API. Devuelve datos **reales** de SUNAT y
  RENIEC, los mismos que en producción; lo único distinto es que la llave de
  pruebas trae un tope de consultas al mes. Escribe un número real y ves la
  ficha, de dónde salió el dato y la respuesta completa.
- **Consola** — abajo del todo. Registra **cada llamada HTTP** que hace la
  herramienta: método, ruta, código, milisegundos. Pulsa una para ver la
  petición y la respuesta completas.

Esa consola es el motivo de que esto exista: no es solo para emitir, es para que
veas qué manda y qué devuelve la API antes de escribir tu integración.

---

## Sobre el entorno

Un token de sandbox emite contra **SUNAT beta**. Los comprobantes se firman y
SUNAT los responde de verdad, pero **no tienen valor legal**: no declaran nada
ni afectan a ningún RUC real. Emite todo lo que necesites.

Cuando pases a producción cambia solo las credenciales; las rutas y el formato
de los datos son los mismos.

---

## Cómo autenticar desde tu propio código

Dos cabeceras en cada petición. No hay login ni tokens que caduquen por sesión:

```bash
curl -X POST https://cismafact.alwaysdata.net/api/facturas \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: TU_API_KEY" \
  -H "X-Api-Secret: TU_API_SECRET" \
  -d @factura.json
```

Para comprobar que tus credenciales funcionan:

```bash
curl https://cismafact.alwaysdata.net/api/empresa \
  -H "X-Api-Key: TU_API_KEY" -H "X-Api-Secret: TU_API_SECRET"
```

---

## Rutas que usa esta herramienta

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/empresa` | comprobar credenciales |
| GET | `/sucursales` | sucursales de la empresa |
| GET | `/series?tipo=01` | series con el número que sigue |
| GET | `/clientes?buscar=` | clientes registrados |
| GET | `/buscar-documento?tipo=6&numero=` | buscar por DNI o RUC |
| POST | `/facturas` `/boletas` `/notas-credito` `/notas-debito` `/guias-remision` | emitir |
| GET | `/{recurso}` | listar |
| GET | `/{recurso}/{id}/download-pdf` `-xml` `-cdr` | descargar |
| POST | `/resumenes` | resumen diario de boletas |
| GET | `/panel/indicadores` `/panel/ventas-mensuales` `/panel/estado-sunat` `/panel/documentos-recientes` `/panel/por-moneda` | cifras |

Documentación completa en **cismafact.alwaysdata.net/docs**.

---

## Si algo no funciona

**No conecta y el error habla de la URL.** Comprueba que la URL base termine en
`/api`, sin barra final y sin `/v1`.

**Dice que las credenciales no son válidas.** Revisa que el token siga activo y
que no haya caducado.

**El navegador bloquea la conexión.** La API permite peticiones desde cualquier
origen, así que abrir el archivo con doble clic funciona. Si aun así falla, sirve
la carpeta por HTTP desde tu servidor local.

**Las series salen vacías.** La empresa no tiene series de ese tipo de
comprobante configuradas.

---

## Estructura

```
demo-cismafact-html/
├── index.html
├── css/estilos.css
└── js/
    ├── core.js            configuración, cliente HTTP y registro de llamadas
    ├── ui.js              iconos, formato, avisos y ventana modal
    ├── data.js            catálogo de ejemplo y catálogos SUNAT
    ├── views-basicas.js   conexión, panel, comprobantes y resumen
    ├── views-emitir.js    los cinco formularios de emisión
    └── app.js             navegación, consola y cargadores comunes
```

Sin dependencias, sin compilación, sin paquetes. Todo cuelga de un objeto global
`App`. Las tipografías se cargan de Google Fonts; sin conexión la herramienta
sigue funcionando con las del sistema.
