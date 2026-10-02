/* ===========================================================================
   Emision de comprobantes. Un solo motor de formulario con lo propio de cada
   tipo: factura, boleta, nota de credito, nota de debito y guia de remision.
   ======================================================================== */

var App = window.App || (window.App = {});
App.vistas = App.vistas || {};

(function () {

  /* Formato del PDF elegido en la barra de abajo. Se recuerda entre
     comprobantes: quien imprime en ticket de 80 mm lo hace siempre. */
  var papelActual = 'A4';

  var TIPOS = {
    factura: { recurso: 'facturas',       codigo: '01', nombre: 'Factura',           docCliente: '6', conItems: true },
    boleta:  { recurso: 'boletas',        codigo: '03', nombre: 'Boleta de venta',   docCliente: '1', conItems: true },
    nc:      { recurso: 'notas-credito',  codigo: '07', nombre: 'Nota de crédito',   docCliente: null, conItems: true, afecta: true },
    nd:      { recurso: 'notas-debito',   codigo: '08', nombre: 'Nota de débito',    docCliente: null, conItems: true, afecta: true },
    guia:    { recurso: 'guias-remision', codigo: '09', nombre: 'Guía de remisión',  docCliente: null, conItems: false, traslado: true }
  };

  var lineas = [];   // lineas del comprobante en edicion
  var tipoActual = 'factura';

  /* ------------------------------------------------------------- Calculo */

  function calcular() {
    var gravado = 0, exonerado = 0, inafecto = 0, exportacion = 0, igv = 0;

    lineas.forEach(function (l) {
      var valor = (Number(l.cantidad) || 0) * (Number(l.precio) || 0);
      if (l.igv === '10') { gravado += valor; igv += valor * 0.18; }
      else if (l.igv === '20') { exonerado += valor; }
      else if (l.igv === '30') { inafecto += valor; }
      else if (l.igv === '40') { exportacion += valor; }
    });

    var r = function (n) { return Math.round(n * 100) / 100; };
    return {
      gravado: r(gravado), exonerado: r(exonerado), inafecto: r(inafecto),
      exportacion: r(exportacion), igv: r(igv),
      total: r(gravado + exonerado + inafecto + exportacion + igv)
    };
  }

  /* -------------------------------------------------------------- Piezas */

  function opciones(lista, campoC, campoN, seleccionado) {
    return lista.map(function (x) {
      var c = x[campoC], n = x[campoN];
      return '<option value="' + App.esc(c) + '"' + (String(c) === String(seleccionado) ? ' selected' : '') + '>'
        + App.esc(n) + '</option>';
    }).join('');
  }

  function filaLinea(l, i) {
    return '<tr data-i="' + i + '">'
      + '<td><input data-c="codigo" value="' + App.esc(l.codigo) + '" style="width:70px"></td>'
      + '<td><input data-c="descripcion" value="' + App.esc(l.descripcion) + '"></td>'
      + '<td><select data-c="unidad" style="width:82px">' + opciones(App.UNIDADES, 'c', 'c', l.unidad) + '</select></td>'
      + '<td><input data-c="cantidad" type="number" step="0.001" min="0.001" value="' + App.esc(l.cantidad) + '" style="width:74px"></td>'
      + '<td><input data-c="precio" type="number" step="0.01" min="0" value="' + App.esc(l.precio) + '" style="width:92px"></td>'
      + '<td><select data-c="igv" style="width:112px">' + opciones(App.AFECTACIONES, 'c', 'n', l.igv) + '</select></td>'
      + '<td class="num" data-total>' + App.money((Number(l.cantidad) || 0) * (Number(l.precio) || 0)) + '</td>'
      + '<td><button class="del" data-quitar aria-label="Quitar línea">' + App.icono('quitar') + '</button></td>'
      + '</tr>';
  }

  function pintarLineas() {
    var cuerpo = document.getElementById('em-lineas');
    if (!cuerpo) return;

    cuerpo.innerHTML = lineas.length
      ? lineas.map(filaLinea).join('')
      : '<tr><td colspan="8" class="empty" style="padding:26px">'
        + 'Sin líneas todavía. Pulsa <b>Agregar producto</b> para elegir del '
        + 'catálogo; luego puedes cambiar cantidad, precio o descripción en la '
        + 'propia fila, y quitarla con la ✕.</td></tr>';

    var t = calcular();
    var totales = document.getElementById('em-totales');
    if (totales) {
      totales.innerHTML = ''
        + linea('Gravado', t.gravado)
        + (t.exonerado ? linea('Exonerado', t.exonerado) : '')
        + (t.inafecto ? linea('Inafecto', t.inafecto) : '')
        + (t.exportacion ? linea('Exportación', t.exportacion) : '')
        + linea('IGV (18%)', t.igv)
        + '<div class="l big"><span>Total</span><b>' + App.money(t.total) + '</b></div>';
    }

    function linea(k, v) {
      return '<div class="l"><span>' + k + '</span><b>' + App.money(v) + '</b></div>';
    }
  }

  /* ---------------------------------------------------------- Formulario */

  function formulario(clave) {
    var t = TIPOS[clave];
    var hoy = new Date().toISOString().slice(0, 10);

    var bloqueCliente = t.traslado
      ? ''
      : '<div class="card">'
        +   '<div class="card-head"><h2>' + (t.afecta ? 'Cliente' : 'Cliente') + '</h2>'
        +     '<button class="btn sm ghost" id="em-ejemplo">Usar uno de ejemplo</button></div>'
        +   '<div class="card-body"><div class="grid c2">'
        +     '<div class="field"><label for="em-cli-tipo">Tipo de documento</label>'
        +       '<select id="em-cli-tipo">'
        +         opciones(App.TIPOS_DOC_CLIENTE, 'c', 'n', t.docCliente || '6')
        +       '</select></div>'
        +     '<div class="field"><label for="em-cli-num">Número</label>'
        +       '<div class="row" style="gap:6px;flex-wrap:nowrap">'
        +         '<input class="mono" id="em-cli-num" placeholder="20601030013">'
        +         '<button class="btn sm" id="em-cli-buscar" title="Buscar entre los clientes ya registrados">'
        +           App.icono('buscar') + '</button>'
        +       '</div></div>'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-cli-nom">Razón social o nombre</label>'
        +       '<input id="em-cli-nom"></div>'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-cli-dir">Dirección</label>'
        +       '<input id="em-cli-dir"></div>'
        +   '</div></div>'
        + '</div>';

    var bloqueAfectado = t.afecta
      ? '<div class="card">'
        +   '<div class="card-head"><h2>Documento que modifica</h2>'
        +     '<span class="hint">Debe existir y ser de esta empresa</span></div>'
        +   '<div class="card-body"><div class="grid c2">'
        +     '<div class="field"><label for="em-af-tipo">Tipo</label>'
        +       '<select id="em-af-tipo">'
        +         '<option value="01">Factura</option><option value="03">Boleta</option>'
        +       '</select></div>'
        +     '<div class="field"><label for="em-af-num">Número completo</label>'
        +       '<input class="mono" id="em-af-num" placeholder="F001-000001"></div>'
        +     '<div class="field"><label for="em-af-mot">Motivo</label>'
        +       '<select id="em-af-mot">'
        +         opciones(clave === 'nc' ? App.MOTIVOS_NC : App.MOTIVOS_ND, 'c', 'n')
        +       '</select></div>'
        +     '<div class="field"><label for="em-af-des">Descripción del motivo</label>'
        +       '<input id="em-af-des" placeholder="Devolución total de la mercadería"></div>'
        +   '</div></div>'
        + '</div>'
      : '';

    var bloqueTraslado = t.traslado
      ? '<div class="note aviso">'
        + '<b>La guía de remisión solo existe en producción.</b> '
        + 'No viaja por el mismo servicio que el resto: SUNAT la recibe por su '
        + 'API de GRE (REST con OAuth2), y esa API <b>no tiene ambiente de '
        + 'pruebas</b> — el host de beta ni siquiera resuelve. '
        + 'Desde una empresa en SUNAT beta el envío falla con un error del '
        + 'servidor; no es un fallo de esta consola.'
        + '<br><br>'
        + 'Para emitir guías de verdad hacen falta tres cosas en la empresa: '
        + 'certificado digital <b>real</b> de entidad acreditada, credenciales '
        + 'GRE propias del RUC (client_id y client_secret del Menú SOL) y el '
        + 'modo producción activado. El formulario de aquí abajo sirve igual '
        + 'para ver qué se envía y revisarlo en la consola de llamadas.'
        + '</div>'
        + '<div class="card">'
        +   '<div class="card-head"><h2>Destinatario y traslado</h2>'
        +     '<span class="hint">El destinatario debe estar registrado</span></div>'
        +   '<div class="card-body"><div class="grid c2">'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-gr-dest">Destinatario</label>'
        +       '<select id="em-gr-dest"><option value="">Cargando clientes…</option></select></div>'
        +     '<div class="field"><label for="em-gr-mot">Motivo del traslado</label>'
        +       '<select id="em-gr-mot">' + opciones(App.MOTIVOS_TRASLADO, 'c', 'n') + '</select></div>'
        +     '<div class="field"><label for="em-gr-mod">Modalidad</label>'
        +       '<select id="em-gr-mod"><option value="01">Transporte público</option>'
        +         '<option value="02" selected>Transporte privado</option></select></div>'
        +     '<div class="field"><label for="em-gr-fecha">Fecha del traslado</label>'
        +       '<input type="date" id="em-gr-fecha" value="' + hoy + '"></div>'
        +     '<div class="field"><label for="em-gr-peso">Peso total (KGM)</label>'
        +       '<input type="number" step="0.001" min="0.001" id="em-gr-peso" value="10"></div>'
        +     '<div class="field"><label for="em-gr-bultos">Número de bultos</label>'
        +       '<input type="number" min="1" id="em-gr-bultos" value="1"></div>'
        +     '<div class="field"><label for="em-gr-pubi">Ubigeo de partida</label>'
        +       '<input class="mono" id="em-gr-pubi" value="150101" maxlength="6"></div>'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-gr-pdir">Dirección de partida</label>'
        +       '<input id="em-gr-pdir" placeholder="Av. Demo 123, Lima"></div>'
        +     '<div class="field"><label for="em-gr-lubi">Ubigeo de llegada</label>'
        +       '<input class="mono" id="em-gr-lubi" value="150101" maxlength="6"></div>'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-gr-ldir">Dirección de llegada</label>'
        +       '<input id="em-gr-ldir" placeholder="Jr. Destino 456, Lima"></div>'
        +   '</div></div>'
        + '</div>'
        + '<div class="card" id="em-gr-privado">'
        +   '<div class="card-head"><h2>Conductor y vehículo</h2>'
        +     '<span class="hint">Obligatorio en transporte privado</span></div>'
        +   '<div class="card-body"><div class="grid c2">'
        +     '<div class="field"><label for="em-gr-cdoc">Documento del conductor</label>'
        +       '<select id="em-gr-cdoc"><option value="1">DNI</option>'
        +         '<option value="4">Carnet de extranjería</option>'
        +         '<option value="7">Pasaporte</option></select></div>'
        +     '<div class="field"><label for="em-gr-cnum">Número</label>'
        +       '<input class="mono" id="em-gr-cnum" value="46756431"></div>'
        +     '<div class="field"><label for="em-gr-cnom">Nombres</label>'
        +       '<input id="em-gr-cnom" value="JUAN CARLOS"></div>'
        +     '<div class="field"><label for="em-gr-cape">Apellidos</label>'
        +       '<input id="em-gr-cape" value="PÉREZ LÓPEZ"></div>'
        +     '<div class="field"><label for="em-gr-clic">Licencia de conducir</label>'
        +       '<input class="mono" id="em-gr-clic" value="Q46756431"></div>'
        +     '<div class="field"><label for="em-gr-placa">Placa del vehículo</label>'
        +       '<input class="mono" id="em-gr-placa" value="ABC-123"></div>'
        +   '</div></div>'
        + '</div>'
        + '<div class="card" id="em-gr-publico" style="display:none">'
        +   '<div class="card-head"><h2>Transportista</h2>'
        +     '<span class="hint">Obligatorio en transporte público</span></div>'
        +   '<div class="card-body"><div class="grid c2">'
        +     '<div class="field"><label for="em-gr-tdoc">Documento</label>'
        +       '<select id="em-gr-tdoc"><option value="6">RUC</option></select></div>'
        +     '<div class="field"><label for="em-gr-tnum">Número</label>'
        +       '<input class="mono" id="em-gr-tnum" value="20548112719"></div>'
        +     '<div class="field" style="grid-column:1/-1"><label for="em-gr-tnom">Razón social</label>'
        +       '<input id="em-gr-tnom" value="TRANSPORTES DEMO SAC"></div>'
        +   '</div></div>'
        + '</div>'
      : '';

    var bloqueItems = t.conItems
      ? '<div class="card">'
        +   '<div class="card-head"><h2>Líneas del comprobante</h2>'
        +     '<div class="row" style="gap:6px">'
        +       '<button class="btn sm" id="em-catalogo">' + App.icono('mas') + 'Agregar producto</button>'
        +     '</div></div>'
        +   '<div class="table-wrap"><table class="items"><thead><tr>'
        +     '<th>Código</th><th>Descripción</th><th>Unidad</th><th>Cant.</th>'
        +     '<th>V. unitario</th><th>Afectación IGV</th><th style="text-align:right">Valor</th><th></th>'
        +   '</tr></thead><tbody id="em-lineas"></tbody></table></div>'
        +   '<div class="card-body"><div class="totals" id="em-totales"></div></div>'
        + '</div>'
      : '';

    return ''
      + '<div class="view-inner">'
      +   '<div class="tabs" id="em-tabs">'
      +     Object.keys(TIPOS).map(function (k) {
              return '<button data-t="' + k + '"' + (k === clave ? ' class="on"' : '') + '>'
                + TIPOS[k].nombre + '</button>';
            }).join('')
      +   '</div>'

      +   '<div class="apilado">'
      +     '<div class="grid" style="gap:14px">'

      +       '<div class="card">'
      +         '<div class="card-head"><h2>Datos del comprobante</h2>'
      +           '<div class="row" style="gap:9px;align-items:center">'
      +             '<span class="hint"><span class="verb post">POST</span> /' + t.recurso + '</span>'
      +             (App.EJEMPLOS[clave]
                      ? '<button class="btn sm ghost" id="em-cargar-ejemplo" title="'
                        + App.esc(App.EJEMPLOS[clave].titulo) + '">Cargar ejemplo</button>'
                      : '')
      +           '</div></div>'
      +         '<div class="card-body"><div class="grid c2">'
      +           '<div class="field"><label for="em-serie">Serie</label>'
      +             '<select id="em-serie" class="mono"><option>Cargando…</option></select></div>'
      +           '<div class="field"><label for="em-fecha">Fecha de emisión</label>'
      +             '<input type="date" id="em-fecha" value="' + hoy + '"></div>'
      +           (t.traslado ? '' :
                    '<div class="field"><label for="em-moneda">Moneda</label>'
                    + '<select id="em-moneda">' + opciones(App.MONEDAS, 'c', 'n') + '</select></div>'
                    + '<div class="field"><label for="em-pago">Forma de pago</label>'
                    + '<select id="em-pago"><option value="Contado">Contado</option>'
                    + '<option value="Credito">Crédito</option></select></div>')
      +         '</div></div>'
      +       '</div>'

      +       bloqueAfectado
      +       bloqueCliente
      +       bloqueTraslado
      +       bloqueItems

      +       '<div class="barra-emitir">'
      +         '<div class="formato">'
      +           '<span class="k">Formato PDF</span>'
      +           App.FORMATOS_PDF.map(function (f) {
                    return '<button type="button" class="fmt' + (f.c === papelActual ? ' on' : '') + '" '
                      + 'data-fmt="' + f.c + '">' + App.esc(f.n.split('—')[0].trim()) + '</button>';
                  }).join('')
      +         '</div>'
      +         '<button class="btn primary" id="em-enviar">' + App.icono('enviar') + 'Emitir y enviar a SUNAT</button>'
      +       '</div>'

      +     '</div>'

      +     '<div class="grid" style="gap:14px">'
      +       '<div class="card" id="em-caja-resp" style="display:none">'
      +         '<div class="card-head"><h2>Respuesta</h2><span id="em-resp-estado"></span></div>'
      +         '<div class="card-body"><pre class="code" id="em-respuesta"></pre></div>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  /* Rellena el formulario con el ejemplo del comprobante que toque.

     Solo toca lo que existe en esa pantalla: una guia no tiene cliente ni
     lineas, y una factura no tiene traslado. */
  function cargarEjemplo(t, ej) {
    if (!ej) return;

    var poner = function (id, valor) {
      var c = document.getElementById(id);
      if (c && valor !== undefined && valor !== null) c.value = valor;
    };

    if (!t.traslado && ej.cliente) {
      poner('em-cli-tipo', ej.cliente.tipo);
      poner('em-cli-num', ej.cliente.numero);
      poner('em-cli-nom', ej.cliente.razon_social);
      poner('em-cli-dir', ej.cliente.direccion);
      poner('em-moneda', ej.moneda);
      poner('em-pago', ej.pago);
    }

    if (t.afecta && ej.afectado) {
      poner('em-af-tipo', ej.afectado.tipo);
      poner('em-af-num', ej.afectado.numero);
      poner('em-af-mot', ej.afectado.motivo);
    }

    if (t.traslado && ej.traslado) {
      var g = ej.traslado;
      poner('em-gr-mot', g.motivo);
      poner('em-gr-mod', g.modalidad);
      poner('em-gr-peso', g.peso);
      poner('em-gr-bultos', g.bultos);
      poner('em-gr-pubi', g.partida_ubigeo);
      poner('em-gr-pdir', g.partida_direccion);
      poner('em-gr-lubi', g.llegada_ubigeo);
      poner('em-gr-ldir', g.llegada_direccion);

      // La modalidad decide que bloque se ve, asi que hay que avisar del
      // cambio para que el formulario ensene el que toca.
      var mod = document.getElementById('em-gr-mod');
      if (mod) mod.dispatchEvent(new Event('change', { bubbles: true }));

      if (g.conductor) {
        poner('em-gr-cdoc', g.conductor.tipo_doc);
        poner('em-gr-cnum', g.conductor.num_doc);
        poner('em-gr-cnom', g.conductor.nombres);
        poner('em-gr-cape', g.conductor.apellidos);
        poner('em-gr-clic', g.conductor.licencia);
      }
      poner('em-gr-placa', g.placa);
    }

    if (t.conItems && ej.lineas) {
      lineas = ej.lineas.map(function (codigo) {
        var p = App.PRODUCTOS.filter(function (x) { return x.codigo === codigo; })[0];
        if (!p) return null;
        return { codigo: p.codigo, descripcion: p.descripcion, unidad: p.unidad,
                 cantidad: 1, precio: p.precio, igv: p.igv };
      }).filter(Boolean);
      pintarLineas();
    }

    App.aviso('Ejemplo cargado', ej.titulo, 'ok');
  }

  /* ------------------------------------------------------------- Payload */

  function armar() {
    var t = TIPOS[tipoActual];
    var serie = document.getElementById('em-serie');
    var opcion = serie.selectedOptions[0];

    var datos = {
      serie: serie.value,
      branch_id: opcion ? Number(opcion.dataset.branch) : null,
      fecha_emision: document.getElementById('em-fecha').value
    };

    if (!t.traslado) {
      datos.moneda = document.getElementById('em-moneda').value;
      datos.tipo_operacion = '0101';
      datos.forma_pago_tipo = document.getElementById('em-pago').value;
      datos.client = {
        tipo_documento: document.getElementById('em-cli-tipo').value,
        numero_documento: document.getElementById('em-cli-num').value.trim(),
        razon_social: document.getElementById('em-cli-nom').value.trim(),
        direccion: document.getElementById('em-cli-dir').value.trim()
      };
    }

    if (t.afecta) {
      datos.tipo_doc_afectado = document.getElementById('em-af-tipo').value;
      datos.num_doc_afectado = document.getElementById('em-af-num').value.trim();
      datos.cod_motivo = document.getElementById('em-af-mot').value;
      datos.des_motivo = document.getElementById('em-af-des').value.trim()
        || document.getElementById('em-af-mot').selectedOptions[0].textContent;
    }

    if (t.traslado) {
      datos.destinatario_id = Number(document.getElementById('em-gr-dest').value) || null;
      datos.cod_traslado = document.getElementById('em-gr-mot').value;
      datos.des_traslado = document.getElementById('em-gr-mot').selectedOptions[0].textContent;
      datos.mod_traslado = document.getElementById('em-gr-mod').value;
      datos.fecha_traslado = document.getElementById('em-gr-fecha').value;
      datos.peso_total = Number(document.getElementById('em-gr-peso').value);
      datos.und_peso_total = 'KGM';
      datos.num_bultos = Number(document.getElementById('em-gr-bultos').value);
      datos.partida_ubigeo = document.getElementById('em-gr-pubi').value.trim();
      datos.partida_direccion = document.getElementById('em-gr-pdir').value.trim();
      datos.llegada_ubigeo = document.getElementById('em-gr-lubi').value.trim();
      datos.llegada_direccion = document.getElementById('em-gr-ldir').value.trim();

      // SUNAT pide conductor y placa cuando el traslado lo hace la propia
      // empresa, y los datos del transportista cuando lo hace un tercero.
      if (datos.mod_traslado === '02') {
        datos.conductor_tipo = 'Principal';
        datos.conductor_tipo_doc = document.getElementById('em-gr-cdoc').value;
        datos.conductor_num_doc = document.getElementById('em-gr-cnum').value.trim();
        datos.conductor_nombres = document.getElementById('em-gr-cnom').value.trim();
        datos.conductor_apellidos = document.getElementById('em-gr-cape').value.trim();
        datos.conductor_licencia = document.getElementById('em-gr-clic').value.trim();
        datos.vehiculo_placa = document.getElementById('em-gr-placa').value.trim();
      } else {
        datos.transportista_tipo_doc = document.getElementById('em-gr-tdoc').value;
        datos.transportista_num_doc = document.getElementById('em-gr-tnum').value.trim();
        datos.transportista_razon_social = document.getElementById('em-gr-tnom').value.trim();
      }
    }

    if (t.conItems) {
      datos.detalles = lineas.map(function (l) {
        return {
          codigo: l.codigo,
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: Number(l.cantidad),
          mto_valor_unitario: Number(l.precio),
          tip_afe_igv: l.igv,
          porcentaje_igv: l.igv === '10' ? 18 : 0
        };
      });
    }

    return datos;
  }

  /* --------------------------------------------------------------- Vista */

  App.vistas.emitir = {
    titulo: 'Emitir',
    sub: 'Crear y enviar comprobantes a SUNAT',

    tituloDe: function (tipo) {
      var t = TIPOS[tipo] || TIPOS[tipoActual];
      return t ? 'Nueva ' + t.nombre : 'Emitir';
    },

    subDe: function () { return 'Crear y enviar a SUNAT'; },

    render: function (host, tipo) {
      // Se empieza en blanco. Antes venia puesta una laptop de ejemplo, y
      // habia que acordarse de borrarla: un comprobante sale con lo que uno
      // pone, no con lo que traia de fabrica.
      lineas = [];

      // El menu dice que comprobante abrir ('#emitir/boleta'). Si no lo dice,
      // se queda el ultimo que se estuviera usando.
      dibujar(host, TIPOS[tipo] ? tipo : tipoActual);
    }
  };

  function dibujar(host, clave) {
    tipoActual = clave;
    var t = TIPOS[clave];
    host.innerHTML = formulario(clave);

    App.cargarSeries('em-serie', t.codigo);
    if (t.traslado) {
      App.cargarClientes('em-gr-dest');

      var alternar = function () {
        var privado = document.getElementById('em-gr-mod').value === '02';
        document.getElementById('em-gr-privado').style.display = privado ? '' : 'none';
        document.getElementById('em-gr-publico').style.display = privado ? 'none' : '';
      };
      document.getElementById('em-gr-mod').addEventListener('change', alternar);
      alternar();
    }
    if (t.conItems) pintarLineas();

    /* Cambio de tipo de comprobante */
    document.getElementById('em-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (!b || b.dataset.t === tipoActual) return;

      // Se navega en vez de redibujar a mano: asi el menu lateral se entera y
      // marca la entrada de este comprobante.
      App.ir('emitir/' + b.dataset.t);
    });

    /* Cualquier cambio actualiza el JSON de la derecha */
    host.addEventListener('input', function (e) {
      var fila = e.target.closest('tr[data-i]');
      if (fila) {
        var l = lineas[Number(fila.dataset.i)];
        var campo = e.target.dataset.c;
        if (l && campo) {
          l[campo] = e.target.value;
          fila.querySelector('[data-total]').textContent =
            App.money((Number(l.cantidad) || 0) * (Number(l.precio) || 0));
          var tot = calcular();
          document.getElementById('em-totales').innerHTML =
            document.getElementById('em-totales').innerHTML; // se recalcula abajo
          pintarTotales(tot);
        }
      }
    });

    function pintarTotales(t) {
      var caja = document.getElementById('em-totales');
      if (!caja) return;
      var l = function (k, v) { return '<div class="l"><span>' + k + '</span><b>' + App.money(v) + '</b></div>'; };
      caja.innerHTML = l('Gravado', t.gravado)
        + (t.exonerado ? l('Exonerado', t.exonerado) : '')
        + (t.inafecto ? l('Inafecto', t.inafecto) : '')
        + (t.exportacion ? l('Exportación', t.exportacion) : '')
        + l('IGV (18%)', t.igv)
        + '<div class="l big"><span>Total</span><b>' + App.money(t.total) + '</b></div>';
    }

    /* Lineas */
    if (t.conItems) {
      document.getElementById('em-lineas').addEventListener('click', function (e) {
        var b = e.target.closest('[data-quitar]');
        if (!b) return;
        lineas.splice(Number(b.closest('tr').dataset.i), 1);
        pintarLineas();
      });

      document.getElementById('em-catalogo').addEventListener('click', abrirCatalogo);
    }

    /* Cargar ejemplo */
    var botonEjemplo = document.getElementById('em-cargar-ejemplo');
    if (botonEjemplo) {
      botonEjemplo.addEventListener('click', function () {
        cargarEjemplo(TIPOS[tipoActual], App.EJEMPLOS[tipoActual]);
      });
    }

    /* Formato del PDF */
    var barraFormato = host.querySelector('.formato');
    if (barraFormato) {
      barraFormato.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-fmt]');
        if (!b) return;
        papelActual = b.dataset.fmt;
        [].forEach.call(this.querySelectorAll('button[data-fmt]'), function (o) {
          o.classList.toggle('on', o === b);
        });
      });
    }

    /* Cliente */
    if (!t.traslado) {
      document.getElementById('em-ejemplo').addEventListener('click', function () {
        var quiere = document.getElementById('em-cli-tipo').value;
        var c = App.CLIENTES_EJEMPLO.filter(function (x) { return x.tipo === quiere; })[0]
             || App.CLIENTES_EJEMPLO[0];
        document.getElementById('em-cli-tipo').value = c.tipo;
        document.getElementById('em-cli-num').value = c.numero;
        document.getElementById('em-cli-nom').value = c.razon_social;
        document.getElementById('em-cli-dir').value = c.direccion;
      });

      document.getElementById('em-cli-buscar').addEventListener('click', async function () {
        var tipo = document.getElementById('em-cli-tipo').value;
        var num = document.getElementById('em-cli-num').value.trim();
        if (!num) { App.aviso('Escribe el número de documento'); return; }
        this.disabled = true;
        try {
          var r = await App.api.buscarDocumento(tipo, num);
          document.getElementById('em-cli-nom').value = r.data.razon_social || '';
          document.getElementById('em-cli-dir').value = r.data.direccion || '';
          App.aviso('Cliente encontrado', r.data.razon_social, 'ok');
        } catch (e) {
          App.aviso('No está registrado', 'Escribe sus datos: quedará guardado al emitir.');
        } finally {
          this.disabled = false;
        }
      });
    }

    document.getElementById('em-enviar').addEventListener('click', enviar);
  }

  /* --------------------------------------------------------------- Envio */

  async function enviar() {
    var boton = document.getElementById('em-enviar');
    var t = TIPOS[tipoActual];

    // Ahora el formulario empieza sin lineas, asi que hay que decirlo aqui:
    // mandarlo vacio solo consigue que SUNAT lo rechace con un error opaco.
    if (t.conItems && !lineas.length) {
      App.aviso('Falta el detalle', 'Agrega al menos una línea antes de emitir.', 'err');
      return;
    }

    var sinDatos = lineas.filter(function (l) {
      return !String(l.descripcion || '').trim() || !(Number(l.precio) > 0);
    });
    if (t.conItems && sinDatos.length) {
      App.aviso('Líneas incompletas',
        'Cada línea necesita descripción y un precio mayor que cero.', 'err');
      return;
    }
    var caja = document.getElementById('em-caja-resp');
    var pre = document.getElementById('em-respuesta');
    var marca = document.getElementById('em-resp-estado');

    boton.disabled = true;
    caja.style.display = '';
    marca.innerHTML = '<span class="pill mute">enviando…</span>';
    pre.textContent = '';

    try {
      var r = await App.api.emitir(t.recurso, armar());
      var d = r.data || {};
      marca.innerHTML = '<span class="pill ok">201 · ' + App.esc(d.estado_sunat || 'CREADO') + '</span>';
      pre.innerHTML = App.json(r);

      // Se apunta en el cuaderno de esta consola: el panel se arma con esto,
      // no con las cifras de la empresa entera.
      App.mios.anotar({
        id: d.id,
        recurso: t.recurso,
        tipo: t.codigo,
        tipo_nombre: t.nombre,
        numero: d.numero_completo || '',
        cliente: (armar().client && armar().client.razon_social) || '',
        fecha: d.fecha_emision || new Date().toISOString().slice(0, 10),
        total: Number(d.mto_imp_venta || 0),
        moneda: d.moneda || 'PEN',
        estado: d.estado_sunat || 'PENDIENTE',
        hora: Date.now()
      });

      if (d.id) mostrarArchivos(t.recurso, d);
      App.aviso(
        t.nombre + ' ' + (d.numero_completo || '') + ' emitida',
        d.estado_sunat === 'ACEPTADO' ? 'SUNAT la aceptó' : ('Estado: ' + (d.estado_sunat || '—')),
        'ok'
      );
    } catch (e) {
      marca.innerHTML = '<span class="pill err">' + (e.estado || 'ERROR') + '</span>';
      pre.innerHTML = App.json(
        (e.registro && e.registro.respuesta) || { message: e.message, errors: e.errores }
      );
      App.avisoError(e);
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------------------------------------- Archivos del recien emitido */

  /**
   * Ensena el PDF nada mas emitir. Los comprobantes creados por API no guardan
   * el PDF al nacer: la ruta de descarga lo genera cuando se pide, asi que aqui
   * basta con pedirlo.
   */
  /* El comprobante emitido se abre en un modal: el PDF a la vista en el
     formato elegido, y los tres archivos a un clic sin salir de ahi.

     El PDF no se guarda al emitir: la ruta de descarga lo genera cuando se
     pide, asi que aqui basta con pedirlo. */
  async function mostrarArchivos(recurso, doc) {
    var numero = doc.numero_completo || 'Comprobante emitido';

    var cuerpo = ''
      + '<div class="formato" id="doc-formato">'
      +   '<span class="k">Formato PDF</span>'
      +   App.FORMATOS_PDF.map(function (f) {
            return '<button type="button" class="fmt' + (f.c === papelActual ? ' on' : '') + '" '
              + 'data-fmt="' + f.c + '">' + App.esc(f.n.split('—')[0].trim()) + '</button>';
          }).join('')
      + '</div>'
      + '<div id="doc-visor" class="doc-visor"></div>';

    var pie = ['pdf', 'xml', 'cdr'].map(function (f) {
        return '<button class="btn sm" data-baja="' + f + '">'
          + App.icono('bajar') + f.toUpperCase() + '</button>';
      }).join('')
      + '<button class="btn ghost" onclick="App.cerrarModal()">Cerrar</button>';

    var scrim = App.modal(numero, cuerpo, pie);

    // Este modal ensena un documento entero, no un aviso: pide mas sitio que
    // el resto y sus botones de descarga van a la izquierda, donde se leen
    // primero.
    scrim.querySelector('.modal').classList.add('modal-doc');

    /* La ventana toma el ancho del papel que se este mirando. */
    function ajustarVentana(papel) {
      var caja = scrim.querySelector('.modal');
      if (!caja) return;
      ['A4', 'A5', '80mm', '58mm'].forEach(function (f) {
        caja.classList.toggle('doc-' + f, f === papel);
      });
    }

    ajustarVentana(papelActual);

    /* Lo ya traido, por archivo y formato.

       Cada peticion de PDF hace que el servidor lo genere entero, y eso es lo
       que se nota al esperar. Mirar el comprobante y despues darle a Descargar
       pedia el mismo PDF dos veces; volver a un formato ya visto, otra. Aqui
       se guarda lo que ya llego, asi que la segunda vez es instantanea. */
    var traidos = {};

    async function traer(cual, papel) {
      var clave = cual + (cual === 'pdf' ? '|' + papel : '');
      if (traidos[clave]) return traidos[clave];
      traidos[clave] = await App.api.descargar(recurso, doc.id, cual, papel);
      return traidos[clave];
    }

    scrim.onclick = async function (e) {
      // Cambiar el formato: se repinta la vista previa con el nuevo.
      var f = e.target.closest('button[data-fmt]');
      if (f) {
        papelActual = f.dataset.fmt;
        [].forEach.call(scrim.querySelectorAll('button[data-fmt]'), function (o) {
          o.classList.toggle('on', o === f);
        });
        ajustarVentana(papelActual);
        verPdf(papelActual);
        return;
      }

      var b = e.target.closest('button[data-baja]');
      if (!b) return;

      var cual = b.dataset.baja;
      b.disabled = true;
      try {
        var blob = await traer(cual, papelActual);
        var ext = cual === 'cdr' ? 'zip' : cual;
        var sufijo = (cual === 'pdf' && papelActual !== 'A4') ? '_' + papelActual : '';
        var archivo = (cual === 'cdr' ? 'R-' : '') + numero + sufijo + '.' + ext;
        App.guardarBlob(blob, archivo);
        App.aviso('Descargado', archivo, 'ok');
      } catch (err) {
        App.avisoError(err);
      } finally {
        b.disabled = false;
      }
    };

    /* Al pasar el raton por un formato se va pidiendo, sin esperar al clic.

       Generar el PDF lo hace el servidor cada vez, y es lo que se nota. Para
       cuando el dedo llega al boton, muchas veces ya esta traido. Si no da
       tiempo, no pasa nada: el clic lo pedira igual y traer() no repite. */
    [].forEach.call(scrim.querySelectorAll('button[data-fmt]'), function (b) {
      b.addEventListener('mouseenter', function () {
        traer('pdf', b.dataset.fmt).catch(function () {});
      });
    });

    verPdf(papelActual);

    async function verPdf(papel) {
      var visor = document.getElementById('doc-visor');
      if (!visor) return;
      visor.innerHTML = '<div class="empty" style="padding:26px">Generando el PDF…</div>';
      try {
        var pdf = await traer('pdf', papel);
        var url = URL.createObjectURL(pdf);

        // El modal puede haberse cerrado mientras se generaba.
        visor = document.getElementById('doc-visor');
        if (!visor) { URL.revokeObjectURL(url); return; }

        // El lector del navegador recuerda el zoom de un documento al
        // siguiente: acercar en un A4 y pasar a un ticket lo sacaba enorme,
        // como deformado. Con #view=Fit cada formato se abre encajado y con
        // su tamano, y desde la barra se puede acercar si hace falta.
        visor.innerHTML = '<iframe src="' + url + '#view=Fit" title="PDF de ' + App.esc(numero) + '" ' 
          + 'class="visor-pdf"></iframe>';
      } catch (err) {
        // Que falle la vista previa no invalida la emision: el comprobante ya
        // esta en SUNAT. Se dice, y los botones de descarga siguen ahi.
        visor = document.getElementById('doc-visor');
        if (!visor) return;
        visor.innerHTML = '<div class="note">El comprobante se emitió correctamente, '
          + 'pero no se pudo mostrar el PDF aquí: ' + App.esc(err.message)
          + '. Descárgalo con el botón PDF de abajo.</div>';
      }
    }
  }

  /* ------------------------------------------------------------ Catalogo */

  function abrirCatalogo() {
    var cuerpo = '<div class="table-wrap"><table><thead><tr>'
      + '<th>Código</th><th>Descripción</th><th>Unidad</th>'
      + '<th style="text-align:right">Precio</th><th></th></tr></thead><tbody>'
      + App.PRODUCTOS.map(function (p, i) {
          return '<tr>'
            + '<td class="mono">' + App.esc(p.codigo) + '</td>'
            + '<td>' + App.esc(p.descripcion) + '</td>'
            + '<td class="mono">' + App.esc(p.unidad) + '</td>'
            + '<td class="num">' + App.money(p.precio) + '</td>'
            + '<td style="text-align:right"><button class="btn sm" data-p="' + i + '">Añadir</button></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table></div>';

    var scrim = App.modal('Catálogo de ejemplo', cuerpo,
      '<button class="btn ghost" onclick="App.cerrarModal()">Cerrar</button>');

    scrim.onclick = function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b) return;
      var p = App.PRODUCTOS[Number(b.dataset.p)];
      lineas.push({
        codigo: p.codigo, descripcion: p.descripcion, unidad: p.unidad,
        cantidad: 1, precio: p.precio, igv: p.igv
      });
      pintarLineas();

      // Se cierra al elegir: asi se ve enseguida como quedo la linea. Para
      // poner otro producto se vuelve a pulsar Agregar producto.
      App.cerrarModal();
      App.aviso('Añadido', p.descripcion, 'ok');
    };
  }

})();
