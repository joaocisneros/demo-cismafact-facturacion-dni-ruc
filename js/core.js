/* ===========================================================================
   Nucleo: configuracion guardada, cliente HTTP y registro de llamadas.
   Sin dependencias ni bundler: todo cuelga de un unico objeto global App.
   ======================================================================== */

var App = window.App || (window.App = {});

/* ---------------------------------------------------------- Configuracion */

(function () {
  var CLAVE = 'cismafact_sandbox';

  /* Dos juegos de credenciales, no uno.

     Emitir y consultar RUC/DNI son dos APIs distintas y se contratan por
     separado: una llave de facturacion no consulta padrones y una de consultas
     no emite. Con un solo par habia que borrar unas para probar las otras, y
     al volver ya no estaban. */
  var PREDETERMINADO = {
    base_url: 'https://cismafact.alwaysdata.net/api',
    api_key: '',
    api_secret: '',
    // Las de RUC y DNI. Empiezan por ck_, las de emitir por cf_.
    consultas_key: '',
    consultas_secret: ''
  };

  App.config = {
    // La pantalla de acceso la necesita para saber si la direccion es la de
    // siempre; se expone aqui para no repetirla escrita en dos sitios.
    PREDETERMINADA: PREDETERMINADO.base_url,

    leer: function () {
      try {
        var guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
        return Object.assign({}, PREDETERMINADO, guardado);
      } catch (e) {
        // Navegador con el almacenamiento bloqueado: se sigue funcionando,
        // solo que hay que volver a escribir las credenciales cada vez.
        return Object.assign({}, PREDETERMINADO);
      }
    },

    guardar: function (valores) {
      var actual = App.config.leer();
      var nuevo = Object.assign(actual, valores);
      if (nuevo.base_url) nuevo.base_url = nuevo.base_url.replace(/\/+$/, '');
      try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch (e) {}

      // Otras credenciales son otra empresa: lo recordado ya no vale.
      if (App.cache) App.cache.limpiar();

      return nuevo;
    },

    borrar: function () {
      try { localStorage.removeItem(CLAVE); } catch (e) {}
      if (App.cache) App.cache.limpiar();
    },

    completa: function () {
      var c = App.config.leer();
      return !!(c.base_url && c.api_key && c.api_secret);
    },

    /* Si la llave pegada es del otro producto.

       Las de emitir empiezan por cf_ y las de consultar por ck_. Pegar una
       donde va la otra da un 401 «credenciales invalidas», que manda a revisar
       la URL y el estado del token —todo correcto— sin decir lo unico que
       pasaba: que esa llave es de la otra API. Se mira el prefijo y se dice.

       Devuelve el aviso, o null si no hay nada que objetar. Una llave con
       cualquier otro prefijo no se toca: puede ser de una version anterior. */
    llaveCambiada: function (clave, para) {
      clave = String(clave || '');

      if (para === 'emitir' && clave.indexOf('ck_') === 0) {
        return 'Esa llave empieza por ck_, así que es de consultar RUC y DNI. '
          + 'Aquí va la de emitir, que empieza por cf_. La otra se pega en Conexión · RUC y DNI.';
      }

      if (para === 'consultas' && clave.indexOf('cf_') === 0) {
        return 'Esa llave empieza por cf_, así que es de emitir. Aquí va la de consultar '
          + 'RUC y DNI, que empieza por ck_. La otra se pega en Conexión · Emitir.';
      }

      return null;
    },

    completaConsultas: function () {
      var c = App.config.leer();
      return !!(c.base_url && c.consultas_key && c.consultas_secret);
    }
  };
})();

/* --------------------------------------------- Lo emitido desde aqui --

   Un cuaderno propio: cada comprobante que sale de esta consola se apunta con
   su numero, su importe y su fecha. Sirve para que el panel enseñe lo que ha
   hecho quien esta sentado delante, y no la suma de todos los que comparten la
   empresa de pruebas.

   Se guarda por credencial: al cambiar de token se ve otro cuaderno, que es lo
   que corresponde. */

(function () {
  var CLAVE = 'cismafact_sandbox_mios';
  var TOPE = 300;

  function todo() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { return {}; }
  }

  function guardarTodo(datos) {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) {}
  }

  /* La credencial en uso identifica el cuaderno. */
  function cuaderno() {
    var c = App.config.leer();
    return c.api_key || 'sin-credencial';
  }

  App.mios = {
    lista: function () {
      var d = todo();
      return d[cuaderno()] || [];
    },

    anotar: function (comprobante) {
      var d = todo();
      var clave = cuaderno();
      var lista = d[clave] || [];

      // Si se reintenta el mismo numero no se duplica.
      lista = lista.filter(function (x) { return x.numero !== comprobante.numero; });
      lista.unshift(comprobante);
      if (lista.length > TOPE) lista.length = TOPE;

      d[clave] = lista;
      guardarTodo(d);
    },

    /* Los numeros emitidos, para reconocerlos dentro de un listado. */
    numeros: function () {
      return App.mios.lista().map(function (x) { return x.numero; });
    },

    olvidar: function () {
      var d = todo();
      delete d[cuaderno()];
      guardarTodo(d);
    }
  };
})();

/* ------------------------------------------------- Registro de llamadas */

(function () {
  var llamadas = [];
  var oyentes = [];
  var TOPE = 60;

  App.log = {
    anotar: function (registro) {
      registro.id = 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
      registro.hora = new Date();
      llamadas.unshift(registro);
      if (llamadas.length > TOPE) llamadas.length = TOPE;
      oyentes.forEach(function (f) { f(llamadas); });
      return registro;
    },
    todas: function () { return llamadas; },
    buscar: function (id) {
      for (var i = 0; i < llamadas.length; i++) if (llamadas[i].id === id) return llamadas[i];
      return null;
    },
    limpiar: function () {
      llamadas = [];
      oyentes.forEach(function (f) { f(llamadas); });
    },
    alCambiar: function (f) { oyentes.push(f); }
  };
})();

/* ------------------------------------------------------------ Cliente HTTP */

(function () {
  /**
   * Toda peticion pasa por aqui para que quede anotada en la consola: el
   * proposito de esta herramienta es justamente ver que se envia y que vuelve.
   */
  async function pedir(metodo, ruta, cuerpo, opciones) {
    opciones = opciones || {};

    // Se puede pedir con unas credenciales sueltas, sin tocar las guardadas:
    // es lo que hace "Probar conexion" antes de que decidas quedartelas.
    var cfg = opciones.credenciales || App.config.leer();

    /* Que llave va en la cabecera lo decide la ruta.

       Se mira aqui y no en cada llamada porque es una regla del servidor, no
       de quien pide: /consultas/* solo acepta las de RUC y DNI y el resto solo
       las de emitir. Repartirlo por las vistas habria sido acordarse en cada
       una, y olvidarse en una sola da un 401 dificil de explicar. */
    var deConsultas = ruta.indexOf('/consultas/') === 0 || ruta === '/consultas/cuota';

    var llave = deConsultas ? cfg.consultas_key : cfg.api_key;
    var secreto = deConsultas ? cfg.consultas_secret : cfg.api_secret;

    if (!llave || !secreto) {
      throw new App.ErrorApi(
        deConsultas
          ? 'Falta configurar la llave de RUC y DNI en Conexión · RUC y DNI.'
          : 'Falta configurar la API Key y el Secret en Conexión.',
        0
      );
    }

    /* La base es el servidor, no el recurso.

       La documentacion de RUC y DNI publica como direccion base una que ya
       termina en /consultas, mientras la de emitir termina en /api. Quien
       pegaba la primera se llevaba un 404 raro —la peticion salia hacia
       /api/consultas/consultas/ruc/…— y ahi no hay forma de adivinar que
       sobraba un trozo. Se recorta y valen las dos. */
    var base = cfg.base_url.replace(/\/+$/, '').replace(/\/consultas$/, '');
    var url = base + ruta;

    var cabeceras = {
      'Accept': 'application/json',
      'X-Api-Key': llave,
      'X-Api-Secret': secreto
    };

    var init = { method: metodo, headers: cabeceras };

    if (cuerpo !== undefined) {
      cabeceras['Content-Type'] = 'application/json';
      init.body = JSON.stringify(cuerpo);
    }

    var arranque = performance.now();
    var respuesta, texto;

    try {
      respuesta = await fetch(url, init);
    } catch (e) {
      // fetch solo falla asi cuando no se llego al servidor: sin red, dominio
      // mal escrito o el navegador bloqueando el origen.
      App.log.anotar({
        metodo: metodo, ruta: ruta, estado: 0, ms: Math.round(performance.now() - arranque),
        peticion: cuerpo, respuesta: { error: String(e) }, ok: false
      });
      throw new App.ErrorApi(
        'No se pudo contactar con ' + url + '. Revisa la URL base y tu conexión.', 0
      );
    }

    var ms = Math.round(performance.now() - arranque);
    var tipo = respuesta.headers.get('content-type') || '';

    // Descargas (PDF, XML, CDR) vuelven como binario, no como JSON.
    if (opciones.binario || (!tipo.includes('json') && respuesta.ok)) {
      var blob = await respuesta.blob();
      App.log.anotar({
        metodo: metodo, ruta: ruta, estado: respuesta.status, ms: ms,
        peticion: cuerpo, respuesta: { archivo: tipo, bytes: blob.size }, ok: respuesta.ok
      });
      if (!respuesta.ok) throw new App.ErrorApi('Error ' + respuesta.status, respuesta.status);
      return blob;
    }

    texto = await respuesta.text();
    var datos;
    try { datos = texto ? JSON.parse(texto) : {}; }
    catch (e) { datos = { crudo: texto.slice(0, 1200) }; }

    var registro = App.log.anotar({
      metodo: metodo, ruta: ruta, estado: respuesta.status, ms: ms,
      peticion: cuerpo, respuesta: datos, ok: respuesta.ok && datos.success !== false
    });

    if (!respuesta.ok || datos.success === false) {
      var err = new App.ErrorApi(
        datos.message || datos.mensaje || ('Error ' + respuesta.status),
        respuesta.status
      );
      err.errores = datos.errors || datos.errores || null;
      err.registro = registro;
      throw err;
    }

    return datos;
  }

  /* ------------------------------------------------------------- Cache --

     Guarda la promesa, no el resultado: si dos pantallas piden lo mismo a la
     vez, la peticion sale una sola vez. Un fallo no se guarda, para que el
     siguiente intento vuelva a salir a la red de verdad. */

  (function () {
    var guardado = {};

    App.cache = {
      pedir: function (clave, vidaMs, hacer) {
        var e = guardado[clave];
        if (e && (Date.now() - e.hora) < vidaMs) return e.promesa;

        var promesa = hacer();
        guardado[clave] = { hora: Date.now(), promesa: promesa };
        promesa.catch(function () { delete guardado[clave]; });
        return promesa;
      },

      // Tras emitir cambian los correlativos y las cifras del panel: se tira
      // todo, que es mas barato que acertar con que sigue siendo valido.
      limpiar: function () { guardado = {}; }
    };
  })();

  App.ErrorApi = function (mensaje, estado) {
    this.name = 'ErrorApi';
    this.message = mensaje;
    this.estado = estado;
    this.errores = null;
  };
  App.ErrorApi.prototype = Object.create(Error.prototype);

  function query(obj) {
    var partes = [];
    Object.keys(obj || {}).forEach(function (k) {
      if (obj[k] === undefined || obj[k] === null || obj[k] === '') return;
      partes.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
    });
    return partes.length ? '?' + partes.join('&') : '';
  }

  App.api = {
    query: query,
    pedir: pedir,

    // Con 'credenciales' se comprueban unas sin guardarlas; sin argumento,
    // usa las que esten puestas.
    empresa: function (credenciales) {
      return pedir('GET', '/empresa', undefined, { credenciales: credenciales });
    },

    /* Estas tres se piden en cada formulario y en cada cambio de pestana, y
       entre una vez y la siguiente no cambian. Se recuerdan un rato. */

    sucursales: function () {
      return App.cache.pedir('sucursales', 300000, function () {
        return pedir('GET', '/sucursales');
      });
    },

    series: function (tipo) {
      return App.cache.pedir('series:' + tipo, 300000, function () {
        return pedir('GET', '/series' + query({ tipo: tipo }));
      });
    },

    clientes: function (buscar) {
      return App.cache.pedir('clientes:' + (buscar || ''), 300000, function () {
        return pedir('GET', '/clientes' + query({ buscar: buscar, limite: 30 }));
      });
    },
    /* Las de RUC y DNI. Sin cache a proposito: aqui se viene a ver que
       responde la API de verdad, y una respuesta recordada enseñaria un tiempo
       de 0 ms y una «fuente» que no son los de esta llamada. */
    ruc: function (numero, credenciales) {
      return pedir('GET', '/consultas/ruc/' + encodeURIComponent(numero), undefined,
        { credenciales: credenciales });
    },

    dni: function (numero, credenciales) {
      return pedir('GET', '/consultas/dni/' + encodeURIComponent(numero), undefined,
        { credenciales: credenciales });
    },

    cuotaConsultas: function (credenciales) {
      return pedir('GET', '/consultas/cuota', undefined, { credenciales: credenciales });
    },

    buscarDocumento: function (tipo, numero) {
      return pedir('GET', '/buscar-documento' + query({ tipo: tipo, numero: numero }));
    },

    /* El panel son cuatro consultas de golpe. Volver a el desde otra pantalla
       las repetia enteras; medio minuto de memoria basta para que ir y venir
       sea instantaneo sin llegar a ensenar cifras rancias. Al emitir se tira
       la cache, asi que un comprobante nuevo se ve enseguida. */

    indicadores: function () {
      return App.cache.pedir('panel:indicadores', 30000, function () {
        return pedir('GET', '/panel/indicadores');
      });
    },

    recientes: function (limite) {
      return App.cache.pedir('panel:recientes:' + limite, 30000, function () {
        return pedir('GET', '/panel/documentos-recientes' + query({ limite: limite }));
      });
    },

    ventasMensuales: function () {
      return App.cache.pedir('panel:ventas', 30000, function () {
        return pedir('GET', '/panel/ventas-mensuales');
      });
    },

    estadoSunat: function () {
      return App.cache.pedir('panel:estado', 30000, function () {
        return pedir('GET', '/panel/estado-sunat');
      });
    },

    porMoneda: function () {
      return App.cache.pedir('panel:moneda', 30000, function () {
        return pedir('GET', '/panel/por-moneda');
      });
    },

    emitir: function (recurso, datos) {
      // El correlativo de la serie ya no es el que se enseno hace un momento,
      // y el panel tiene un comprobante mas.
      App.cache.limpiar();
      return pedir('POST', '/' + recurso, datos);
    },
    listar: function (recurso, params) { return pedir('GET', '/' + recurso + query(params)); },
    ver: function (recurso, id) { return pedir('GET', '/' + recurso + '/' + id); },

    /**
     * @param {string} formato  pdf | xml | cdr
     * @param {string} [papel]  solo para pdf: A4, A5, 80mm, 58mm
     */
    descargar: function (recurso, id, formato, papel) {
      var ruta = '/' + recurso + '/' + id + '/download-' + formato;
      if (formato === 'pdf') ruta += query({ format: papel || 'A4' });
      return pedir('GET', ruta, undefined, { binario: true });
    }
  };
})();
