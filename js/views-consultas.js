/* ===========================================================================
   RUC y DNI: su conexion y sus dos pantallas de consulta.

   Aparte de las de emitir porque son otra API: otras credenciales, otra cuota
   y se contratan por separado. Mezclarlas en la misma pantalla obligaba a
   borrar unas para probar las otras.
   ======================================================================== */

var App = window.App || (window.App = {});
App.vistas = App.vistas || {};

/* ================================================ 1. CONEXION RUC Y DNI == */

App.vistas['conexion-consultas'] = {
  titulo: 'Conexión · RUC y DNI',
  sub: 'Credenciales de las consultas',

  render: function (host) {
    var c = App.config.leer();

    host.innerHTML = ''
      + '<div class="view-inner">'
      +   '<div class="note">Estas son las de <strong>consultar RUC y DNI</strong>, distintas de '
      +     'las de emitir: empiezan por <code>ck_</code> y tienen su propia cuota. Bloquear unas '
      +     'no afecta a las otras.</div>'
      +   '<div class="card">'
      +     '<div class="card-head"><h2>Credenciales de consultas</h2>'
      +       '<span class="hint">Cabeceras X-Api-Key y X-Api-Secret</span></div>'
      +     '<div class="card-body">'
      +       '<div class="grid" style="gap:14px">'
      +         campo('URL base de la API', 'base_url', c.base_url,
                     'https://cismafact.alwaysdata.net/api',
                     'Vale tal cual la copies: con /api o con /api/consultas. Es la misma para '
                     + 'las dos APIs, así que cambiarla aquí la cambia también para emitir.')
      +         campo('X-Api-Key', 'consultas_key', c.consultas_key, 'ck_…', '')
      +         campo('X-Api-Secret', 'consultas_secret', c.consultas_secret, '', 'Se envía en cada petición.')
      +       '</div>'
      +       '<div class="row end" style="margin-top:16px">'
      +         '<button class="btn ghost" id="ck-olvidar">Olvidar</button>'
      +         '<button class="btn ghost" id="ck-probar">' + App.icono('enchufe') + 'Probar conexión</button>'
      +         '<button class="btn primary" id="ck-guardar">Guardar</button>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div id="ck-salida"></div>'
      + '</div>';

    function campo(etiqueta, id, valor, marcador, ayuda) {
      return '<div class="field">'
        + '<label for="ck-' + id + '">' + etiqueta + '</label>'
        + '<input class="mono" id="ck-' + id + '" value="' + App.esc(valor || '') + '" '
        +   'placeholder="' + App.esc(marcador || '') + '" spellcheck="false" autocomplete="off">'
        + (ayuda ? '<span class="help">' + ayuda + '</span>' : '')
        + '</div>';
    }

    /* La URL base se guarda aqui tambien.

       Vive en un solo sitio —es el mismo servidor para las dos APIs— pero
       tiene que poder escribirse desde las dos pantallas: quien solo contrata
       RUC y DNI no entra nunca en la conexion de emitir, y sin este campo se
       quedaba con la direccion de siempre sin manera de cambiarla. */
    function escrito() {
      return {
        base_url: document.getElementById('ck-base_url').value.trim(),
        consultas_key: document.getElementById('ck-consultas_key').value.trim(),
        consultas_secret: document.getElementById('ck-consultas_secret').value.trim()
      };
    }

    document.getElementById('ck-guardar').addEventListener('click', function () {
      var e = escrito();
      if (!e.base_url || !e.consultas_key || !e.consultas_secret) {
        App.aviso('Faltan datos', 'Completa la URL, la Key y el Secret de consultas.', 'err');
        return;
      }
      var cambiada = App.config.llaveCambiada(e.consultas_key, 'consultas');
      if (cambiada) { App.aviso('Llave de la otra API', cambiada, 'err'); return; }
      App.config.guardar(e);
      App.aviso('Credenciales guardadas', 'Ya puedes consultar RUC y DNI.', 'ok');
    });

    document.getElementById('ck-probar').addEventListener('click', function () {
      var e = escrito();
      if (!e.base_url || !e.consultas_key || !e.consultas_secret) {
        App.aviso('Faltan datos', 'Completa la URL, la Key y el Secret de consultas.', 'err');
        return;
      }
      var cambiada = App.config.llaveCambiada(e.consultas_key, 'consultas');
      if (cambiada) { App.aviso('Llave de la otra API', cambiada, 'err'); return; }
      // Las escritas y no las guardadas: unas malas no deben pisar a las que
      // ya funcionaban.
      App.vistas['conexion-consultas'].probar(e);
    });

    document.getElementById('ck-olvidar').addEventListener('click', function () {
      // Solo las llaves: la URL es la del servidor y la comparten las dos APIs.
      App.config.guardar({ consultas_key: '', consultas_secret: '' });
      App.estadoConsultas(null);
      App.aviso('Credenciales borradas', 'Este navegador ya no las recuerda.');
      App.ir('conexion-consultas');
    });
  },

  /* Se prueba pidiendo la cuota y no una consulta cualquiera: dice si la llave
     vale, y de paso lo que le queda, sin gastar ninguna. */
  probar: async function (credenciales) {
    var salida = document.getElementById('ck-salida');
    if (!salida) return;

    salida.innerHTML = '<div class="card"><div class="card-body">'
      + '<span class="hint">Probando…</span></div></div>';

    try {
      var r = await App.api.cuotaConsultas(credenciales);
      App.estadoConsultas(r);

      var servicios = (r.servicios || []).map(function (s) {
        return fila(s.nombre || String(s.servicio).toUpperCase(),
          s.usadas + ' de ' + s.limite_mensual + '  ·  quedan ' + s.restantes);
      }).join('');

      salida.innerHTML = ''
        + '<div class="card">'
        +   '<div class="card-head"><h2>Resultado de la prueba</h2>'
        +     '<span class="pill ok">CONECTA</span></div>'
        +   '<div class="card-body">'
        +     '<div class="prueba-filas">'
        +       fila('Llave', r.llave || '—')
        +       fila('Entorno', String(r.entorno || '—').toUpperCase())
        +       fila('Plan', r.plan || '—')
        +       fila('Caduca', r.expira_en || 'sin caducidad')
        +       servicios
        +     '</div>'
        +     '<details class="prueba-crudo">'
        +       '<summary>Ver la respuesta completa '
        +         '<span class="hint"><span class="verb get">GET</span> /consultas/cuota</span></summary>'
        +       '<pre class="code">' + App.json(r) + '</pre>'
        +     '</details>'
        +   '</div>'
        + '</div>';
    } catch (e) {
      App.estadoConsultas(false);
      salida.innerHTML = ''
        + '<div class="card">'
        +   '<div class="card-head"><h2>Resultado de la prueba</h2>'
        +     '<span class="pill err">NO CONECTA</span></div>'
        +   '<div class="card-body"><p class="hint">'
        +     App.esc(e.message || String(e)) + '</p></div>'
        + '</div>';
    }

    function fila(clave, valor) {
      return '<div class="prueba-fila"><span>' + App.esc(clave) + '</span>'
        + '<strong class="mono">' + App.esc(String(valor)) + '</strong></div>';
    }
  }
};

/* ============================================ 2. CONSULTAR RUC Y DNI ==== */

/* Una sola fabrica para las dos pantallas: cambian el titulo, la longitud del
   numero y los campos de la ficha. Dos vistas casi iguales se separan a la
   primera correccion que se hace en una y no en la otra. */
function pantallaConsulta(tipo) {
  var esRuc = tipo === 'ruc';

  return {
    titulo: esRuc ? 'Consultar RUC' : 'Consultar DNI',
    sub: esRuc ? 'Ficha de una empresa en SUNAT' : 'Nombre y apellidos en RENIEC',
    // Esta no necesita la de emitir: con la de consultas basta.
    necesita: 'consultas',

    render: function (host) {
      host.innerHTML = ''
        + '<div class="view-inner">'
        +   (App.config.completaConsultas() ? ''
              : '<div class="note">Todavía no has puesto la llave de RUC y DNI. Ve a '
                + '<strong>Conexión · RUC y DNI</strong> y pégala.</div>')
        +   '<div class="card">'
        +     '<div class="card-head"><h2>' + (esRuc ? 'Número de RUC' : 'Número de DNI') + '</h2>'
        +       '<span class="hint"><span class="verb get">GET</span> '
        +         '/consultas/' + tipo + '/{numero}</span></div>'
        +     '<div class="card-body">'
        +       '<div class="row" style="gap:10px;align-items:flex-end">'
        +         '<div class="field" style="flex:1;margin:0">'
        +           '<input class="mono" id="cq-numero" inputmode="numeric" spellcheck="false" '
        +             'autocomplete="off" maxlength="' + (esRuc ? 11 : 8) + '" '
        +             'placeholder="' + (esRuc ? '20601030013' : '46756431') + '">'
        +         '</div>'
        +         '<button class="btn primary" id="cq-buscar">Consultar</button>'
        +       '</div>'
        +       '<span class="help">' + (esRuc ? '11 dígitos.' : '8 dígitos.')
        +         ' Va tal cual se escriba: un número mal formado devuelve 422, '
        +         'que es lo que verá tu código.</span>'
        +     '</div>'
        +   '</div>'
        +   '<div id="cq-salida"></div>'
        + '</div>';

      var caja = document.getElementById('cq-numero');
      caja.focus();
      caja.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') consultar();
      });
      document.getElementById('cq-buscar').addEventListener('click', consultar);

      async function consultar() {
        var numero = caja.value.trim();
        var salida = document.getElementById('cq-salida');

        if (!numero) {
          App.aviso('Falta el número',
            'Escribe el ' + tipo.toUpperCase() + ' que quieres consultar.', 'err');
          return;
        }

        salida.innerHTML = '<div class="card"><div class="card-body">'
          + '<span class="hint">Consultando…</span></div></div>';

        try {
          var r = esRuc ? await App.api.ruc(numero) : await App.api.dni(numero);
          salida.innerHTML = ficha(r);
        } catch (e) {
          // Un 422 no es un fallo de la herramienta: es la API diciendo por que
          // ese numero no vale, y es justo lo que se viene a ver aqui.
          salida.innerHTML = ''
            + '<div class="card">'
            +   '<div class="card-head"><h2>Respuesta</h2>'
            +     '<span class="pill err">' + App.esc(String(e.estado || 'ERROR')) + '</span></div>'
            +   '<div class="card-body">'
            +     '<p class="hint">' + App.esc(e.message || String(e)) + '</p>'
            +   '</div>'
            + '</div>';
        }
      }

      function ficha(r) {
        var d = r.data || {};

        var filas = esRuc
          ? [['Razón social', d.nombre], ['Estado', d.estado], ['Condición', d.condicion],
             ['Dirección', d.direccion], ['Distrito', d.distrito], ['Provincia', d.provincia],
             ['Departamento', d.departamento], ['Ubigeo', d.ubigeo]]
          : [['Nombre completo', d.nombre], ['Nombres', d.nombres],
             ['Apellido paterno', d.apellido_paterno], ['Apellido materno', d.apellido_materno]];

        return ''
          + '<div class="card">'
          +   '<div class="card-head"><h2>' + App.esc(d.nombre || 'Sin ficha') + '</h2>'
          +     '<span class="pill ok">200</span></div>'
          +   '<div class="card-body">'
          +     '<div class="prueba-filas">'
          +       filas.map(function (f) {
                    return '<div class="prueba-fila"><span>' + App.esc(f[0]) + '</span>'
                      + '<strong class="mono">' + App.esc(f[1] || '—') + '</strong></div>';
                  }).join('')
          +       '<div class="prueba-fila"><span>De dónde salió</span>'
          +         '<strong class="mono">' + App.esc(d.fuente || '—') + '</strong></div>'
          +     '</div>'
          +     '<details class="prueba-crudo">'
          +       '<summary>Ver la respuesta completa</summary>'
          +       '<pre class="code">' + App.json(r) + '</pre>'
          +     '</details>'
          +   '</div>'
          + '</div>';
      }
    }
  };
}

App.vistas['consulta-ruc'] = pantallaConsulta('ruc');
App.vistas['consulta-dni'] = pantallaConsulta('dni');
