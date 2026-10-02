/* ===========================================================================
   Pantalla de acceso.

   Esto es el acceso a la herramienta y nada mas. No se confunde con Conexion:
   ahi se guardan las credenciales de la API (X-Api-Key y X-Api-Secret), que es
   un asunto distinto. Aqui solo se comprueba quien entra; una vez dentro, si
   todavia no hay credenciales de API, la propia aplicacion lleva a Conexion.
   ======================================================================== */

var App = window.App || (window.App = {});

/* ------------------------------------------------------------- La sesion */

(function () {
  var CLAVE = 'cismafact_sandbox_sesion';

  App.sesion = {
    usuario: function () {
      try { return localStorage.getItem(CLAVE) || ''; } catch (e) { return ''; }
    },

    activa: function () { return !!App.sesion.usuario(); },

    abrir: function (usuario) {
      try { localStorage.setItem(CLAVE, usuario); } catch (e) {}
    },

    cerrar: function () {
      try { localStorage.removeItem(CLAVE); } catch (e) {}
    }
  };
})();

/* ---------------------------------------------------------- El formulario */

(function () {

  /* Quien puede entrar.

     Son cuentas de la herramienta, no de la API. Anade las que necesites; la
     primera con 'mostrar' encendido es la que se ensena en la pantalla como
     credenciales de prueba. */
  var CUENTAS = [
    { usuario: 'demo', clave: 'demo', mostrar: true }
  ];

  var caja, form, campoUsuario, campoClave, boton, botonTexto, error;
  var entrando = false;

  /* ------------------------------------------------------------ Mostrar */

  function mostrar() {
    campoUsuario.value = App.sesion.usuario();
    campoClave.value = '';
    ocultarError();
    caja.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      (campoUsuario.value ? campoClave : campoUsuario).focus();
    }, 30);
  }

  function ocultar() {
    caja.hidden = true;
    document.body.style.overflow = '';
  }

  /* -------------------------------------------------------------- Error */

  function mostrarError(mensaje) {
    error.textContent = mensaje;
    error.hidden = false;
  }

  function ocultarError() {
    error.hidden = true;
    error.textContent = '';
  }

  /* ------------------------------------------------------------- Entrar */

  function entrar(evento) {
    evento.preventDefault();
    if (entrando) return;

    var usuario = campoUsuario.value.trim();
    var clave = campoClave.value;

    if (!usuario || !clave) {
      mostrarError('Escribe el usuario y la contraseña.');
      (usuario ? campoClave : campoUsuario).focus();
      return;
    }

    var valida = CUENTAS.some(function (c) {
      return c.usuario === usuario && c.clave === clave;
    });

    if (!valida) {
      mostrarError('Usuario o contraseña incorrectos.');
      campoClave.value = '';
      campoClave.focus();
      return;
    }

    entrando = true;
    boton.disabled = true;
    botonTexto.textContent = 'Entrando…';

    App.sesion.abrir(usuario);
    ocultarError();
    ocultar();

    // Adonde llega depende de si Conexion ya tiene credenciales de la API: con
    // ellas, al panel; sin ellas, a configurarlas. Son cosas distintas y cada
    // una se resuelve en su sitio.
    App.ir(App.paginaDeEntrada());

    App.aviso('Hola, ' + usuario, listo
      ? 'Sesión iniciada.'
      : 'Ahora configura las credenciales de la API en Conexión.');

    entrando = false;
    boton.disabled = false;
    botonTexto.textContent = 'Entrar';
  }

  /* -------------------------------------------------------- Cerrar sesion */

  function salir() {
    // Solo se cierra la sesion. Las credenciales de la API se quedan donde
    // estan: se borran desde Conexion, que es su sitio.
    App.sesion.cerrar();
    mostrar();
    App.aviso('Sesión cerrada', 'Vuelve a entrar cuando quieras.');
  }

  /* ------------------------------------------------------------ Arranque */

  App.login = { mostrar: mostrar, ocultar: ocultar, salir: salir };

  document.addEventListener('DOMContentLoaded', function () {
    caja = document.getElementById('login');
    form = document.getElementById('lg-form');
    campoUsuario = document.getElementById('lg-usuario');
    campoClave = document.getElementById('lg-clave');
    boton = document.getElementById('lg-entrar');
    botonTexto = document.getElementById('lg-entrar-texto');
    error = document.getElementById('lg-error');

    document.getElementById('lg-copy').textContent =
      '© ' + new Date().getFullYear() + ' Cisma Fact';

    form.addEventListener('submit', entrar);

    var botonSalir = document.getElementById('cn-salir');
    if (botonSalir) botonSalir.addEventListener('click', salir);

    // Las credenciales de prueba que se ensenan en la pantalla.
    var deMuestra = CUENTAS.filter(function (c) { return c.mostrar; })[0];
    if (deMuestra) {
      document.getElementById('lg-demo-usuario').textContent = deMuestra.usuario;
      document.getElementById('lg-demo-clave').textContent = deMuestra.clave;
      document.getElementById('lg-demo').hidden = false;

      document.getElementById('lg-demo-usar').addEventListener('click', function () {
        campoUsuario.value = deMuestra.usuario;
        campoClave.value = deMuestra.clave;
        ocultarError();
        boton.focus();
      });
    }

    if (!App.sesion.activa()) mostrar();
  });

})();
