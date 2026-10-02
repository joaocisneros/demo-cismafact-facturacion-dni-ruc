/* ===========================================================================
   Pantallas de lectura: conexion, panel, comprobantes y resumen diario.
   ======================================================================== */

var App = window.App || (window.App = {});
App.vistas = App.vistas || {};

/* ========================================================== 1. CONEXION == */

App.vistas.conexion = {
  titulo: 'Conexión',
  sub: 'Credenciales de acceso a la API',

  render: function (host) {
    var c = App.config.leer();

    host.innerHTML = ''
      + '<div class="view-inner">'
      +   '<div class="note">Estas credenciales se guardan solo en este navegador. '
      +     'Pídelas en Cisma Fact → Tokens de prueba: emiten contra SUNAT beta, así que '
      +     'los comprobantes no tienen valor legal.</div>'
      +   '<div class="card">'
      +     '<div class="card-head"><h2>Credenciales</h2>'
      +       '<span class="hint">Cabeceras X-Api-Key y X-Api-Secret</span></div>'
      +     '<div class="card-body">'
      +       '<div class="grid" style="gap:14px">'
      +         campo('URL base de la API', 'base_url', c.base_url, 'https://cismafact.alwaysdata.net/api', 'Es la misma para emitir y para RUC y DNI.')
      +         campo('X-Api-Key', 'api_key', c.api_key, 'cf_…', '')
      +         campo('X-Api-Secret', 'api_secret', c.api_secret, '', 'Se envía en cada petición.')
      +       '</div>'
      +       '<div class="row end" style="margin-top:16px">'
      +         '<button class="btn ghost" id="cx-olvidar">Olvidar credenciales</button>'
      +         '<button class="btn ghost" id="cx-probar">' + App.icono('enchufe') + 'Probar conexión</button>'
      +         '<button class="btn primary" id="cx-guardar">Guardar</button>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div id="cx-salida"></div>'

      + '</div>';

    function campo(etiqueta, id, valor, marcador, ayuda) {
      return '<div class="field">'
        + '<label for="cx-' + id + '">' + etiqueta + '</label>'
        + '<input class="mono" id="cx-' + id + '" value="' + App.esc(valor) + '" '
        +   'placeholder="' + App.esc(marcador || '') + '" spellcheck="false" autocomplete="off">'
        + (ayuda ? '<span class="help">' + ayuda + '</span>' : '')
        + '</div>';
    }

    /* Lo escrito ahora mismo en los tres campos. */
    function escrito() {
      return {
        base_url: document.getElementById('cx-base_url').value.trim(),
        api_key: document.getElementById('cx-api_key').value.trim(),
        api_secret: document.getElementById('cx-api_secret').value.trim()
      };
    }

    document.getElementById('cx-guardar').addEventListener('click', function () {
      var e = escrito();
      if (!e.base_url || !e.api_key || !e.api_secret) {
        App.aviso('Faltan datos', 'Completa la URL, la Key y el Secret.', 'err');
        return;
      }
      var cambiada = App.config.llaveCambiada(e.api_key, 'emitir');
      if (cambiada) { App.aviso('Llave de la otra API', cambiada, 'err'); return; }
      App.config.guardar(e);
      App.aviso('Credenciales guardadas', 'Ya puedes probar la conexión.', 'ok');
    });

    document.getElementById('cx-probar').addEventListener('click', function () {
      var e = escrito();
      if (!e.base_url || !e.api_key || !e.api_secret) {
        App.aviso('Faltan datos', 'Completa la URL, la Key y el Secret.', 'err');
        return;
      }
      var cambiada = App.config.llaveCambiada(e.api_key, 'emitir');
      if (cambiada) { App.aviso('Llave de la otra API', cambiada, 'err'); return; }
      // Se prueban las que estan escritas, no las guardadas: asi se comprueba
      // que valen antes de dejarlas puestas, y unas malas nunca pisan a las
      // buenas que ya funcionaban.
      App.vistas.conexion.probar(e);
    });

    document.getElementById('cx-olvidar').addEventListener('click', function () {
      App.config.borrar();
      App.estadoConexion(null);
      App.aviso('Credenciales borradas', 'Este navegador ya no las recuerda.');
      App.ir('conexion');
    });

    // Ya no se prueba sola al entrar. Lo hacia, y el resultado se pintaba con
    // las mismas tarjetas que el Panel, asi que abrir Conexion parecia llevar
    // al Panel. Ahora se prueba cuando se pulsa el boton, ni antes ni sin
    // pedirlo, y quien quiera cambiar de API ve primero sus campos.
  },

  probar: async function (credenciales) {
    var salida = document.getElementById('cx-salida');
    if (!salida) return;
    salida.innerHTML = '<div class="card"><div class="card-body"><span class="hint">Probando…</span></div></div>';

    try {
      var r = await App.api.empresa(credenciales);
      var e = r.data.company;
      App.estadoConexion(e);

      salida.innerHTML = ''
        + '<div class="card">'
        +   '<div class="card-head"><h2>Resultado de la prueba</h2>'
        +     '<span class="pill ok">CONECTA</span></div>'
        +   '<div class="card-body">'
        +     '<div class="prueba-filas">'
        +       fila('Empresa', e.razon_social)
        +       fila('RUC', e.ruc)
        +       fila('Ambiente', (e.ambiente || 'demo').toUpperCase())
        +       fila('Token', r.data.api_key ? r.data.api_key.name : '—')
        +     '</div>'
        +     '<details class="prueba-crudo">'
        +       '<summary>Ver la respuesta completa '
        +         '<span class="hint"><span class="verb get">GET</span> /empresa</span></summary>'
        +       '<pre class="code">' + App.json(r) + '</pre>'
        +     '</details>'
        +   '</div>'
        + '</div>';

      // Si se probaron unas sueltas, todavia no estan puestas.
      var guardadas = App.config.leer();
      var sinGuardar = credenciales && (
        credenciales.api_key !== guardadas.api_key ||
        credenciales.base_url !== guardadas.base_url
      );

      if (sinGuardar) {
        // Un aviso que se va en tres segundos no basta: el resto de la consola
        // se queda con las credenciales viejas y las pantallas ensenan los
        // datos de otro servidor sin que se entienda por que.
        salida.insertAdjacentHTML('afterbegin', ''
          + '<div class="note aviso" style="margin-bottom:12px">'
          +   '<b>Esto todavia no esta guardado.</b> '
          +   'La prueba se hizo con lo que acabas de escribir, pero el resto de '
          +   'la consola sigue usando las credenciales anteriores. '
          +   '<button class="btn sm primary" id="cx-guardar-ya" style="margin-left:8px">'
          +     'Guardar estas credenciales</button>'
          + '</div>');

        var boton = document.getElementById('cx-guardar-ya');
        if (boton) {
          boton.addEventListener('click', function () {
            App.config.guardar(credenciales);
            App.aviso('Guardadas', 'Ya es esta la conexion que usa la consola.', 'ok');
            App.ir('conexion');
          });
        }
      }

      App.aviso('Conecta', sinGuardar
        ? 'Pulsa Guardar para usarlas en toda la consola.'
        : e.razon_social, 'ok');
    } catch (err) {
      App.estadoConexion(false);
      salida.innerHTML = ''
        + '<div class="card">'
        +   '<div class="card-head"><h2>No se pudo conectar</h2>'
        +     '<span class="pill err">' + (err.estado || 'SIN RESPUESTA') + '</span></div>'
        +   '<div class="card-body"><p style="margin:0 0 10px">' + App.esc(err.message) + '</p>'
        +     '<div class="note">Comprueba que la URL base termine en <b>/api</b>, que el token esté '
        +       'activo y que no haya caducado.</div></div>'
        + '</div>';
    }

    /* Una fila por dato, no una tarjeta: las tarjetas son del Panel y aqui
       confundian. */
    function fila(k, v) {
      return '<div class="prueba-fila"><span>' + App.esc(k) + '</span>'
        + '<b>' + App.esc(v || '—') + '</b></div>';
    }
  }
};

/* ============================================================= 2. PANEL == */

App.vistas.panel = {
  titulo: 'Panel',
  sub: 'Lo que has emitido desde esta consola',

  render: function (host) {
    var mios = App.mios.lista();

    if (! mios.length) {
      host.innerHTML = '<div class="view-inner"><div class="card"><div class="empty vacio">'
        + '<b>Aún no has emitido nada</b>'
        + '<span>Aquí aparecerá lo que emitas desde esta consola. '
        + 'Empieza por <a href="#emitir/factura">Emitir → Factura</a> y pulsa '
        + '<b>Cargar ejemplo</b> para llenar el formulario de una vez.</span>'
        + '</div></div></div>';
      return;
    }

    pintar(host, mios);
  }
};

/* Suma de un tramo de fechas. */
function sumar(mios, desde) {
  var total = 0, cantidad = 0;

  mios.forEach(function (m) {
    if (new Date(m.fecha + 'T00:00:00') >= desde) {
      total += Number(m.total) || 0;
      cantidad++;
    }
  });

  return { total: total, cantidad: cantidad };
}

function pintar(host, mios) {
  var ahora = new Date();
  var hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  var semana = new Date(hoy);
  semana.setDate(hoy.getDate() - hoy.getDay());
  var mes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  var dHoy = sumar(mios, hoy);
  var dSemana = sumar(mios, semana);
  var dMes = sumar(mios, mes);

  /* Por estado ante SUNAT, contando lo que hay en el cuaderno. */
  var estados = {};
  mios.forEach(function (m) {
    estados[m.estado] = (estados[m.estado] || 0) + 1;
  });

  host.innerHTML = ''
    + '<div class="view-inner">'

    +   '<div class="note">Estas cifras son <b>solo de esta consola</b>: lo que '
    +     'has emitido con la credencial que tienes puesta. La empresa de pruebas '
    +     'la comparten varios programadores, así que el total de la empresa no '
    +     'diría nada de tu trabajo.</div>'

    +   '<div class="grid c4">'
    +     metrica('Hoy', App.money(dHoy.total), dHoy.cantidad + ' comprobante(s)')
    +     metrica('Esta semana', App.money(dSemana.total), dSemana.cantidad + ' comprobante(s)')
    +     metrica('Este mes', App.money(dMes.total), dMes.cantidad + ' comprobante(s)')
    +     metrica('En total', App.money(sumar(mios, new Date(0)).total), mios.length + ' comprobante(s)')
    +   '</div>'

    +   '<div class="card">'
    +     '<div class="card-head"><h2>Estado frente a SUNAT</h2>'
    +       '<span class="hint">de lo emitido aquí</span></div>'
    +     '<div class="card-body"><div class="grid" style="gap:8px">'
    +       Object.keys(estados).map(function (e) {
              return '<div class="row between">'
                + App.estadoPill(e)
                + '<b style="font-family:var(--mono);font-variant-numeric:tabular-nums">' + estados[e] + '</b></div>';
            }).join('')
    +     '</div></div>'
    +   '</div>'

    +   '<div class="card">'
    +     '<div class="card-head"><h2>Lo que has emitido</h2>'
    +       '<button class="btn sm ghost" id="pn-olvidar">Vaciar la lista</button></div>'
    +     '<div class="table-wrap">' + tabla(mios) + '</div>'
    +   '</div>'

    + '</div>';

  var olvidar = document.getElementById('pn-olvidar');
  if (olvidar) {
    olvidar.addEventListener('click', function () {
      App.modal(
        'Vaciar la lista',
        '<p style="margin:0">Se borra el registro que lleva esta consola de lo que has emitido.</p>'
        + '<div class="note">Los comprobantes <b>no se borran</b>: siguen en la API y en SUNAT, '
        + 'y los tienes en Consultar. Aquí solo se deja de anotar.</div>',
        '<button class="btn ghost" onclick="App.cerrarModal()">Cancelar</button>'
        + '<button class="btn primary" id="pn-olvidar-si">Vaciar</button>'
      ).onclick = function (e) {
        if (! e.target.closest('#pn-olvidar-si')) return;
        App.mios.olvidar();
        App.cerrarModal();
        App.ir('panel');
      };
    });
  }

  function metrica(k, v, d) {
    return '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div>'
      + (d ? '<div class="d">' + d + '</div>' : '') + '</div>';
  }

  function tabla(filas) {
    return '<table><thead><tr>'
      + '<th>Tipo</th><th>Número</th><th>Cliente</th><th>Fecha</th>'
      + '<th style="text-align:right">Total</th><th>Estado</th></tr></thead><tbody>'
      + filas.map(function (d) {
          return '<tr>'
            + '<td><span class="pill mute">' + App.esc(d.tipo_nombre) + '</span></td>'
            + '<td class="mono">' + App.esc(d.numero) + '</td>'
            + '<td>' + App.esc(d.cliente || '—') + '</td>'
            + '<td class="mono">' + App.fecha(d.fecha) + '</td>'
            + '<td class="num">' + App.money(d.total, d.moneda) + '</td>'
            + '<td>' + App.estadoPill(d.estado) + '</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
  }
}

/* ====================================================== 3. COMPROBANTES == */

App.vistas.comprobantes = {
  titulo: 'Comprobantes',
  sub: 'Consultar y descargar',

  tituloDe: function (recurso) {
    var x = this.recursos.filter(function (r) { return r.r === (recurso || this.actual); }, this)[0];
    return x ? x.n : 'Comprobantes';
  },

  recursos: [
    { r: 'facturas',       n: 'Facturas' },
    { r: 'boletas',        n: 'Boletas' },
    { r: 'notas-credito',  n: 'Notas de crédito' },
    { r: 'notas-debito',   n: 'Notas de débito' },
    { r: 'guias-remision', n: 'Guías de remisión' }
  ],

  actual: 'facturas',

  /* De serie se enseña solo lo propio: quien abre esto con su credencial
     recien creada espera ver su trabajo, no el de los demas. */
  soloMios: true,

  render: function (host, recurso) {
    var self = this;

    // Que listado abrir lo dice el menu ('#comprobantes/boletas').
    if (recurso && this.recursos.some(function (x) { return x.r === recurso; })) {
      this.actual = recurso;
    }

    host.innerHTML = ''
      + '<div class="view-inner">'
      +   '<div class="tabs" id="cp-tabs">'
      +     this.recursos.map(function (x) {
              return '<button data-r="' + x.r + '"' + (x.r === self.actual ? ' class="on"' : '') + '>'
                + x.n + '</button>';
            }).join('')
      +   '</div>'
      +   '<div class="card"><div class="card-head">'
      +     '<h2 id="cp-titulo">Facturas</h2>'
      +     '<div class="row" style="gap:9px">'
      +       '<label class="solo-mios" title="Los comprobantes de la empresa los emiten varios programadores">'
      +         '<input type="checkbox" id="cp-mios"' + (self.soloMios ? ' checked' : '') + '>'
      +         '<span>Solo lo mío</span>'
      +       '</label>'
      +       '<span class="hint" id="cp-ruta"></span>'
      +       '<select id="cp-papel" class="mono" style="width:auto;padding:5px 26px 5px 8px;font-size:12px" '
      +         'title="Formato del PDF al descargar">'
      +         App.FORMATOS_PDF.map(function (f) {
                  return '<option value="' + f.c + '">' + App.esc(f.n) + '</option>';
                }).join('')
      +       '</select>'
      +     '</div></div>'
      +     '<div id="cp-tabla"><div class="empty">Cargando…</div></div>'
      +   '</div>'
      + '</div>';

    document.getElementById('cp-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-r]');
      if (!b || b.dataset.r === self.actual) return;

      // Igual que en Emitir: se navega, y el menu lateral sigue el paso.
      App.ir('comprobantes/' + b.dataset.r);
    });

    /* Las descargas se atienden desde el contenedor, y una sola vez.

       Estaba dentro de cargar(), que corre en cada cambio de pestana: los
       oyentes se apilaban sobre el mismo contenedor y cada uno recordaba el
       recurso de su carga. Un clic en PDF estando en Boletas disparaba tambien
       el de Facturas, que pedia el id de la boleta a /facturas y devolvia otro
       comprobante o un error. Aqui el recurso se lee en el momento del clic. */
    document.getElementById('cp-tabla').addEventListener('click', async function (e) {
      var b = e.target.closest('button[data-bajar]');
      if (!b) return;

      var recurso = self.actual;
      var formato = b.dataset.bajar;
      b.disabled = true;

      try {
        var papel = document.getElementById('cp-papel').value;
        var blob = await App.api.descargar(recurso, b.dataset.id, formato, papel);
        var ext = formato === 'cdr' ? 'zip' : formato;
        var prefijo = formato === 'cdr' ? 'R-' : '';
        var sufijo = (formato === 'pdf' && papel !== 'A4') ? '_' + papel : '';
        var archivo = prefijo + b.dataset.num + sufijo + '.' + ext;
        App.guardarBlob(blob, archivo);
        App.aviso('Descargado', archivo, 'ok');
      } catch (err) {
        App.avisoError(err);
      } finally {
        b.disabled = false;
      }
    });

    var interruptor = document.getElementById('cp-mios');
    if (interruptor) {
      interruptor.addEventListener('change', function () {
        self.soloMios = this.checked;
        self.cargar();
      });
    }

    this.cargar();
  },

  cargar: async function () {
    var caja = document.getElementById('cp-tabla');
    var recurso = this.actual;
    var nombre = this.recursos.filter(function (x) { return x.r === recurso; })[0].n;

    document.getElementById('cp-titulo').textContent = nombre;
    document.getElementById('cp-ruta').innerHTML = '<span class="verb get">GET</span> /' + recurso;
    caja.innerHTML = '<div class="empty">Cargando…</div>';

    try {
      var r = await App.api.listar(recurso, { per_page: 25 });

      // Puede haber cambiado la pestana, o la pantalla entera, mientras
      // llegaba la respuesta.
      if (!App.sigueEn('comprobantes') || this.actual !== recurso) return;

      var filas = (r.data && r.data.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);

      var deLaEmpresa = filas.length;
      if (this.soloMios) {
        var mios = App.mios.numeros();
        filas = filas.filter(function (d) { return mios.indexOf(d.numero_completo) !== -1; });
      }

      if (!filas.length) {
        // El listado vino vacio, que no es lo mismo que haber fallado: la
        // peticion respondio bien y aparece en la consola de abajo.
        var irA = {
          'facturas': 'factura', 'boletas': 'boleta',
          'notas-credito': 'nc', 'notas-debito': 'nd', 'guias-remision': 'guia'
        }[recurso];

        caja.innerHTML = '<div class="empty vacio">'
          + '<b>No has emitido ' + nombre.toLowerCase() + ' desde aquí</b>'
          + '<span>La API respondió correctamente (mírala en la consola de abajo). '
          + (deLaEmpresa && this.soloMios
              ? 'La empresa tiene ' + deLaEmpresa + ', pero son de otros programadores; '
                + 'quita <b>Solo lo mío</b> para verlas. '
              : '')
          + (irA ? 'Puedes emitir una en <a href="#emitir/' + irA + '">Emitir → '
                   + App.esc(nombre) + '</a>.' : '')
          + '</span></div>';
        return;
      }

      var esGuia = recurso === 'guias-remision';

      caja.innerHTML = '<div class="table-wrap"><table><thead><tr>'
        + '<th>Número</th><th>Fecha</th>'
        + (esGuia ? '' : '<th style="text-align:right">Total</th>')
        + '<th>Estado</th><th style="text-align:right">Archivos</th>'
        + '</tr></thead><tbody>'
        + filas.map(function (d) {
            return '<tr>'
              + '<td class="mono">' + App.esc(d.numero_completo) + '</td>'
              + '<td class="mono">' + App.fecha(d.fecha_emision) + '</td>'
              + (esGuia ? '' : '<td class="num">' + App.money(d.mto_imp_venta, d.moneda) + '</td>')
              + '<td>' + App.estadoPill(d.estado_sunat, d.anulado_en) + '</td>'
              + '<td style="text-align:right"><div class="row end" style="gap:5px">'
              +   ['pdf', 'xml', 'cdr'].map(function (f) {
                    return '<button class="btn sm ghost" data-bajar="' + f + '" data-id="' + d.id + '" '
                      + 'data-num="' + App.esc(d.numero_completo) + '">' + f.toUpperCase() + '</button>';
                  }).join('')
              + '</div></td>'
              + '</tr>';
          }).join('')
        + '</tbody></table></div>';
    } catch (e) {
      if (!App.sigueEn('comprobantes')) return;
      App.avisoError(e);
      caja.innerHTML = '<div class="empty">' + App.esc(e.message) + '</div>';
    }
  }
};

/* ==================================================== 4. RESUMEN DIARIO == */

App.vistas.resumen = {
  titulo: 'Resumen diario',
  sub: 'Comunicar boletas a SUNAT',

  render: function (host) {
    var hoy = new Date().toISOString().slice(0, 10);

    host.innerHTML = ''
      + '<div class="view-inner">'
      +   '<div class="note">Las boletas no se envían una a una: se comunican en un resumen diario. '
      +     'Solo entran las boletas de esa fecha que todavía no se hayan resumido.</div>'
      +   '<div class="split">'
      +     '<div class="card">'
      +       '<div class="card-head"><h2>Generar resumen</h2>'
      +         '<span class="hint"><span class="verb post">POST</span> /resumenes</span></div>'
      +       '<div class="card-body">'
      +         '<div class="grid c2">'
      +           '<div class="field"><label for="rs-fecha">Fecha de las boletas</label>'
      +             '<input type="date" id="rs-fecha" value="' + hoy + '"></div>'
      +           '<div class="field"><label for="rs-suc">Sucursal</label>'
      +             '<select id="rs-suc"><option>Cargando…</option></select></div>'
      +         '</div>'
      +         '<div class="row end" style="margin-top:14px">'
      +           '<button class="btn primary" id="rs-enviar">' + App.icono('enviar') + 'Generar y enviar</button>'
      +         '</div>'
      +       '</div>'
      +     '</div>'
      +     '<div class="card">'
      +       '<div class="card-head"><h2>Resúmenes enviados</h2>'
      +         '<span class="hint"><span class="verb get">GET</span> /resumenes</span></div>'
      +       '<div id="rs-lista"><div class="empty">Cargando…</div></div>'
      +     '</div>'
      +   '</div>'
      + '</div>';

    App.cargarSucursales('rs-suc');
    this.listar();

    document.getElementById('rs-enviar').addEventListener('click', async function () {
      var boton = this;
      boton.disabled = true;
      try {
        var r = await App.api.emitir('resumenes', {
          branch_id: Number(document.getElementById('rs-suc').value),
          fecha_resumen: document.getElementById('rs-fecha').value
        });
        App.aviso('Resumen generado', (r.data && r.data.numero_completo) || '', 'ok');
        App.vistas.resumen.listar();
      } catch (e) {
        App.avisoError(e);
      } finally {
        boton.disabled = false;
      }
    });
  },

  listar: async function () {
    var caja = document.getElementById('rs-lista');
    if (!caja) return;
    try {
      var r = await App.api.listar('resumenes', { per_page: 15 });
      var filas = (r.data && r.data.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      if (!filas.length) {
        caja.innerHTML = '<div class="empty vacio">'
          + '<b>Sin resúmenes todavía</b>'
          + '<span>La API respondió correctamente. El resumen diario sirve para '
          + 'anular boletas ya emitidas, así que primero hace falta alguna.</span>'
          + '</div>';
        return;
      }

      caja.innerHTML = '<div class="table-wrap"><table><thead><tr>'
        + '<th>Resumen</th><th>Fecha</th><th>Estado</th><th style="text-align:right">Ticket</th>'
        + '</tr></thead><tbody>'
        + filas.map(function (d) {
            return '<tr>'
              + '<td class="mono">' + App.esc(d.numero_completo || d.identificador || '—') + '</td>'
              + '<td class="mono">' + App.fecha(d.fecha_resumen || d.fecha_emision) + '</td>'
              + '<td>' + App.estadoPill(d.estado_sunat) + '</td>'
              + '<td class="num">' + App.esc(d.ticket || '—') + '</td>'
              + '</tr>';
          }).join('')
        + '</tbody></table></div>';
    } catch (e) {
      caja.innerHTML = '<div class="empty">' + App.esc(e.message) + '</div>';
    }
  }
};
