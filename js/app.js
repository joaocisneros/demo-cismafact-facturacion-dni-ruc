/* ===========================================================================
   Arranque: navegacion por hash, consola de llamadas y cargadores comunes.
   ======================================================================== */

var App = window.App || (window.App = {});

(function () {

  /* El menu lateral.

     'seccion' abre un grupo; el resto son entradas. Una entrada con 'param'
     apunta a una pantalla concreta dentro de una vista: '#emitir/boleta' abre
     Emitir ya puesto en boletas. Asi cada comprobante tiene su sitio en el
     menu en vez de esconderse tras unas pestanas. */
  /* El menu, agrupado por API y no por lo que hace cada pantalla.

     'seccion' abre una API entera; 'grupo' separa dentro de ella; el resto son
     entradas, y 'param' apunta a una pantalla concreta dentro de una vista:
     '#emitir/boleta' abre Emitir ya puesto en boletas.

     Estaba puesto por tareas —Emitir, Consultar, RUC y DNI— con las dos
     conexiones sueltas al final, y eso mezclaba dos cosas que no se tocan: un
     grupo «Consultar» de listados de comprobantes justo encima de «Consultar
     RUC», y unas conexiones que parecian ser las dos de RUC y DNI por caer
     debajo de ese grupo. Cada API con lo suyo y su llave al pie se lee sin
     tener que saberselo. */
  var RUTAS = [
    { seccion: 'Facturación' },
    { id: 'panel', icono: 'panel', texto: 'Panel' },

    { grupo: 'Emitir' },
    { id: 'emitir', param: 'factura', icono: 'factura', texto: 'Factura' },
    { id: 'emitir', param: 'boleta',  icono: 'boleta',  texto: 'Boleta' },
    { id: 'emitir', param: 'nc',      icono: 'abajo',   texto: 'Nota de crédito' },
    { id: 'emitir', param: 'nd',      icono: 'arriba',  texto: 'Nota de débito' },
    { id: 'emitir', param: 'guia',    icono: 'camion',  texto: 'Guía de remisión' },
    { id: 'resumen', icono: 'resumen', texto: 'Resumen diario' },

    // «Comprobantes» y no «Consultar»: lo de aqui son listados de lo emitido, y
    // llamarlo consultar lo confundia con consultar RUC y DNI, que esta dos
    // grupos mas abajo y es otra API.
    { grupo: 'Comprobantes' },
    { id: 'comprobantes', param: 'facturas',       icono: 'ficha', texto: 'Facturas' },
    { id: 'comprobantes', param: 'boletas',        icono: 'ficha', texto: 'Boletas' },
    { id: 'comprobantes', param: 'notas-credito',  icono: 'ficha', texto: 'Notas de crédito' },
    { id: 'comprobantes', param: 'notas-debito',   icono: 'ficha', texto: 'Notas de débito' },
    { id: 'comprobantes', param: 'guias-remision', icono: 'ficha', texto: 'Guías de remisión' },

    // La llave al pie de lo que abre, no al final de todo.
    { id: 'conexion', icono: 'enchufe', texto: 'Conexión · Emitir', esConexion: true },

    { seccion: 'RUC y DNI' },
    { id: 'consulta-ruc', icono: 'buscar', texto: 'Consultar RUC' },
    { id: 'consulta-dni', icono: 'buscar', texto: 'Consultar DNI' },
    { id: 'conexion-consultas', icono: 'enchufe', texto: 'Conexión · RUC y DNI', esConexion: true }
  ];

  /* ---------------------------------------------------------- Navegacion */

  App.ir = function (destino) {
    if (location.hash !== '#' + destino) { location.hash = destino; return; }
    var d = partes(destino);
    mostrar(d.id, d.param);
  };

  /* '#emitir/boleta' son dos cosas: la vista y donde ponerla. */
  function partes(cadena) {
    var trozos = String(cadena || '').split('/');
    return { id: trozos[0], param: trozos[1] || '' };
  }

  function actual() {
    var d = partes((location.hash || '#panel').slice(1));
    if (!App.vistas[d.id]) return { id: 'panel', param: '' };
    return d;
  }

  /* Que vista esta en pantalla ahora mismo.

     Las vistas piden sus datos y pintan cuando llegan, que puede ser despues
     de haber cambiado de pantalla. Antes de escribir, cada una pregunta aqui
     si sigue siendo la de encima; si no, se calla. */
  App.sigueEn = function (id) {
    return App.vistaActual === id;
  };

  function mostrar(id, param) {
    var vista = App.vistas[id];
    if (!vista) return;

    App.vistaActual = id;

    var destino = id + (param ? '/' + param : '');
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.classList.toggle('on', a.dataset.r === destino);
    });

    // Una vista con pestanas puede querer un titulo por pestana: si sabe
    // decirlo, manda ella; si no, el suyo de siempre.
    document.getElementById('titulo').textContent =
      vista.tituloDe ? vista.tituloDe(param) : vista.titulo;
    document.getElementById('subtitulo').textContent =
      (vista.subDe ? vista.subDe(param) : vista.sub) || '';

    var host = document.getElementById('vista');
    host.innerHTML = '';
    host.scrollTop = 0;

    /* Cada pantalla pide SU credencial, no la de emitir siempre.

       Antes bastaba con que faltara la de emitir para tapar todo lo demas, asi
       que quien solo habia contratado RUC y DNI no podia ni abrir su propia
       pantalla de conexion: la consola le mandaba a configurar una API que no
       tiene. Las dos de conexion nunca se tapan, que son justo donde se va a
       arreglar la falta. */
    var necesita = vista.necesita || 'emitir';
    var esPantallaDeConexion = id === 'conexion' || id === 'conexion-consultas';
    var falta = necesita === 'consultas' ? !App.config.completaConsultas() : !App.config.completa();

    if (!esPantallaDeConexion && falta) {
      var donde = necesita === 'consultas'
        ? '<a href="#conexion-consultas">Conexión · RUC y DNI</a>'
        : '<a href="#conexion">Conexión · Emitir</a>';

      host.innerHTML = '<div class="view-inner"><div class="card"><div class="empty">'
        + 'Primero configura tus credenciales en ' + donde + '.'
        + '</div></div></div>';
      return;
    }

    vista.render(host, param);
  }

  window.addEventListener('hashchange', function () {
    var d = actual();
    mostrar(d.id, d.param);
  });

  /* ----------------------------------------------------------- El tema */

  var CLAVE_TEMA = 'cismafact_sandbox_tema';

  App.tema = {
    actual: function () {
      return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'oscuro';
    },

    poner: function (tema) {
      if (tema === 'claro') {
        document.documentElement.setAttribute('data-tema', 'claro');
      } else {
        document.documentElement.removeAttribute('data-tema');
      }
      try { localStorage.setItem(CLAVE_TEMA, tema); } catch (e) {}

      // El boton ofrece el otro tema, no dice en cual estas.
      var texto = document.getElementById('cn-tema-texto');
      if (texto) texto.textContent = tema === 'claro' ? 'Oscuro' : 'Claro';

      var icono = document.getElementById('cn-tema-icono');
      if (icono) {
        icono.innerHTML = tema === 'claro'
          ? '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'
          : '<path d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4L7 17m10-10l1.4-1.4"/>'
            + '<circle cx="12" cy="12" r="3.4"/>';
      }
    },

    alternar: function () {
      App.tema.poner(App.tema.actual() === 'claro' ? 'oscuro' : 'claro');
    }
  };

  /* Por donde se entra segun lo que haya configurado.

     Quien solo tiene la de consultas entraba en la conexion de emitir, que no
     va a rellenar nunca, y parecia que la consola no servia para lo suyo. */
  App.paginaDeEntrada = function () {
    if (App.config.completa()) return 'panel';
    if (App.config.completaConsultas()) return 'consulta-ruc';
    return 'conexion';
  };

  /* ------------------------------------------------ Estado de la conexion */

  /* El de RUC y DNI, que es otra llave y puede estar bien cuando la de emitir
     no lo esta, o al reves. Un solo punto para las dos daba por buena una
     conexion que no se habia probado. */
  App.estadoConsultas = function (cuota) {
    var punto = document.getElementById('cq-punto');
    var texto = document.getElementById('cq-texto');
    if (!punto || !texto) return;

    if (cuota === null) {
      punto.className = 'dot';
      texto.textContent = 'RUC y DNI: sin configurar';
    } else if (cuota === undefined) {
      punto.className = 'dot';
      texto.textContent = 'RUC y DNI: sin comprobar';
    } else if (cuota === false) {
      punto.className = 'dot err';
      texto.textContent = 'RUC y DNI: sin conexión';
    } else {
      punto.className = 'dot ok';
      texto.textContent = 'RUC y DNI: ' + (cuota.entorno === 'produccion' ? 'producción' : 'sandbox');
    }
  };

  App.estadoConexion = function (empresa) {
    var punto = document.getElementById('cn-punto');
    var texto = document.getElementById('cn-texto');
    var ruc = document.getElementById('cn-ruc');
    if (!punto || !texto || !ruc) return;

    if (empresa === null) {
      punto.className = 'dot';
      texto.textContent = 'Emitir: sin configurar';
      ruc.textContent = '';
    } else if (empresa === undefined) {
      // Hay credenciales guardadas, pero todavia nadie ha comprobado que
      // sirvan. Este caso faltaba, y como caia en el ultimo tramo intentaba
      // leer la empresa de undefined: reventaba el arranque entero y la
      // aplicacion se quedaba en blanco al recargar con credenciales puestas.
      punto.className = 'dot';
      texto.textContent = 'Emitir: sin comprobar';
      ruc.textContent = '';
    } else if (empresa === false) {
      punto.className = 'dot err';
      texto.textContent = 'Emitir: sin conexión';
      ruc.textContent = '';
    } else {
      punto.className = 'dot ok';
      texto.textContent = (empresa.ambiente === 'produccion') ? 'PRODUCCIÓN' : 'SUNAT beta';
      ruc.textContent = '· ' + empresa.ruc;
    }
  };

  /* ------------------------------------------------- Cargadores comunes */

  App.cargarSucursales = async function (idSelect, alTerminar) {
    var sel = document.getElementById(idSelect);
    if (!sel) return;
    try {
      var r = await App.api.sucursales();
      sel.innerHTML = r.data.map(function (s) {
        return '<option value="' + s.id + '">' + App.esc(s.nombre)
          + (s.es_domicilio_fiscal ? ' (domicilio fiscal)' : '') + '</option>';
      }).join('') || '<option value="">Sin sucursales</option>';
    } catch (e) {
      sel.innerHTML = '<option value="">No se pudieron cargar</option>';
    }
    if (alTerminar) alTerminar();
  };

  App.cargarSeries = async function (idSelect, tipo, alTerminar) {
    var sel = document.getElementById(idSelect);
    if (!sel) return;
    try {
      var r = await App.api.series(tipo);
      sel.innerHTML = r.data.length
        ? r.data.map(function (s) {
            return '<option value="' + App.esc(s.serie) + '" data-branch="' + s.branch_id + '">'
              + App.esc(s.serie) + ' — siguiente ' + String(s.siguiente_numero).padStart(6, '0')
              + (s.sucursal ? ' · ' + App.esc(s.sucursal) : '') + '</option>';
          }).join('')
        : '<option value="">La empresa no tiene series de este tipo</option>';
    } catch (e) {
      sel.innerHTML = '<option value="">No se pudieron cargar</option>';
    }
    if (alTerminar) alTerminar();
  };

  App.cargarClientes = async function (idSelect, alTerminar) {
    var sel = document.getElementById(idSelect);
    if (!sel) return;
    try {
      var r = await App.api.clientes('');
      sel.innerHTML = r.data.length
        ? r.data.map(function (c) {
            return '<option value="' + c.id + '">' + App.esc(c.razon_social)
              + ' · ' + App.esc(c.numero_documento) + '</option>';
          }).join('')
        : '<option value="">Aún no hay clientes registrados</option>';
    } catch (e) {
      sel.innerHTML = '<option value="">No se pudieron cargar</option>';
    }
    if (alTerminar) alTerminar();
  };

  /* --------------------------------------------------------- La consola */

  function pintarConsola(llamadas) {
    var lista = document.getElementById('consola-lista');
    var cuenta = document.getElementById('consola-cuenta');
    cuenta.textContent = llamadas.length ? llamadas.length + ' llamada(s)' : 'sin llamadas todavía';

    if (!llamadas.length) {
      lista.innerHTML = '<div class="empty" style="padding:18px">'
        + 'Aquí se anota cada petición HTTP que hace esta herramienta.</div>';
      return;
    }

    lista.innerHTML = llamadas.map(function (c) {
      return '<div class="call" data-id="' + c.id + '">'
        + '<span class="verb ' + c.metodo.toLowerCase() + '">' + c.metodo + '</span>'
        + '<span class="path">' + App.esc(c.ruta) + '</span>'
        + '<span class="st ' + (c.ok ? 'ok' : 'err') + '">' + (c.estado || '—') + '</span>'
        + '<span class="ms">' + c.ms + ' ms</span>'
        + '<span class="at">' + App.hora(c.hora) + '</span>'
        + '</div>';
    }).join('');
  }

  function abrirLlamada(id) {
    var c = App.log.buscar(id);
    if (!c) return;
    App.modal(
      c.metodo + ' ' + c.ruta,
      '<div class="row" style="gap:8px">'
      +   '<span class="pill ' + (c.ok ? 'ok' : 'err') + '">HTTP ' + (c.estado || 'sin respuesta') + '</span>'
      +   '<span class="pill mute">' + c.ms + ' ms</span>'
      +   '<span class="pill mute">' + App.hora(c.hora) + '</span>'
      + '</div>'
      + '<div><div class="card-head" style="padding:0 0 8px"><h2>Petición</h2></div>'
      +   '<pre class="code">' + (c.peticion === undefined ? '<span class="k">(sin cuerpo)</span>' : App.json(c.peticion)) + '</pre></div>'
      + '<div><div class="card-head" style="padding:0 0 8px"><h2>Respuesta</h2></div>'
      +   '<pre class="code">' + App.json(c.respuesta) + '</pre></div>',
      '<button class="btn ghost" onclick="App.cerrarModal()">Cerrar</button>'
    );
  }

  /* ---------------------------------------------------------- Arranque */

  document.addEventListener('DOMContentLoaded', function () {
    // Menu lateral
    var nav = document.getElementById('nav');
    nav.innerHTML = RUTAS.map(function (r) {
      if (r.seccion) return '<div class="nav-api">' + r.seccion + '</div>';
      if (r.grupo) return '<div class="nav-label">' + r.grupo + '</div>';

      var destino = r.id + (r.param ? '/' + r.param : '');
      var texto = r.texto || (App.vistas[r.id] ? App.vistas[r.id].titulo : r.id);

      return '<a href="#' + destino + '" data-r="' + destino + '"'
        + (r.esConexion ? ' class="nav-conexion"' : '') + '>'
        + App.icono(r.icono) + '<span>' + App.esc(texto) + '</span></a>';
    }).join('');

    // Consola
    var consola = document.getElementById('consola');
    document.getElementById('consola-head').addEventListener('click', function (e) {
      if (e.target.closest('#consola-limpiar')) return;
      consola.classList.toggle('closed');
    });
    document.getElementById('consola-limpiar').addEventListener('click', function (e) {
      e.stopPropagation();
      App.log.limpiar();
    });
    document.getElementById('consola-lista').addEventListener('click', function (e) {
      var f = e.target.closest('.call');
      if (f) abrirLlamada(f.dataset.id);
    });
    App.log.alCambiar(pintarConsola);
    pintarConsola([]);

    // Tema: el guardado ya se aplico en el head; aqui solo se pone el boton
    // al dia y se le engancha el clic.
    var botonTema = document.getElementById('cn-tema');
    if (botonTema) {
      App.tema.poner(App.tema.actual());
      botonTema.addEventListener('click', App.tema.alternar);
    }

    // Primera pantalla: sin credenciales, a configurarlas
    if (!location.hash) location.hash = App.paginaDeEntrada();

    // El indicador del lateral es un adorno; pintar la pantalla no lo es. Si
    // alguna vez vuelve a fallar, que no se lleve por delante el arranque.
    try {
      App.estadoConexion(App.config.completa() ? undefined : null);
      App.estadoConsultas(App.config.completaConsultas() ? undefined : null);
    } catch (e) {
      console.error('estadoConexion:', e);
    }

    var d = actual();
    mostrar(d.id, d.param);
  });

})();
