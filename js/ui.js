/* ===========================================================================
   Piezas de interfaz compartidas: iconos, formato, avisos y ventana modal.
   ======================================================================== */

var App = window.App || (window.App = {});

(function () {

  /* --------------------------------------------------------------- Iconos */

  var TRAZOS = {
    enchufe:  'M9 3v6m6-6v6M5 9h14v3a7 7 0 0 1-7 7 7 7 0 0 1-7-7V9zm7 13v-3',
    panel:    'M3 3h7v9H3V3zm11 0h7v5h-7V3zM3 16h7v5H3v-5zm11-4h7v9h-7v-9z',
    emitir:   'M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M8 3h8v4H8V3zm4 8h6m-6 4h6M7 11h.01M7 15h.01',
    lista:    'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    resumen:  'M4 4h16v4H4V4zm0 7h16v9H4v-9zm4 3h8',
    consola:  'M4 5h16v14H4V5zm3 4l3 3-3 3m5 0h5',
    mas:      'M12 5v14M5 12h14',
    quitar:   'M18 6L6 18M6 6l12 12',
    enviar:   'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    buscar:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.35-4.35',
    bajar:    'M12 3v13m0 0l4-4m-4 4l-4-4M4 21h16',
    copiar:   'M9 9h10v10H9V9zM5 15V5h10',
    refresco: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16m18-8V4M3 16v4',
    ojo:      'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',

    // Uno por tipo de comprobante, para que el menu se lea de un vistazo.
    factura:  'M7 3h7l5 5v13H7V3zm7 0v5h5M9 13h8M9 17h8',
    boleta:   'M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 6h6M9 12h6',
    abajo:    'M3 7l6 6 4-4 8 8m0 0v-6m0 6h-6',
    arriba:   'M3 17l6-6 4 4 8-8m0 0v6m0-6h-6',
    camion:   'M3 7h11v8H3V7zm11 3h4l3 3v2h-7v-5zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    ficha:    'M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1zm-1 8h8m-8 4h8'
  };

  App.icono = function (nombre, clase) {
    var d = TRAZOS[nombre] || TRAZOS.panel;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
      + 'stroke-linecap="round" stroke-linejoin="round"' + (clase ? ' class="' + clase + '"' : '')
      + ' aria-hidden="true"><path d="' + d + '"/></svg>';
  };

  /* -------------------------------------------------------------- Formato */

  App.esc = function (v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  App.money = function (n, moneda) {
    var s = (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (moneda === 'USD' ? '$ ' : 'S/ ') + s;
  };

  App.fecha = function (v) {
    if (!v) return '—';
    var d = new Date(String(v).replace(' ', 'T'));
    if (isNaN(d)) return String(v);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  };

  App.hora = function (d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  };

  /** Colorea un JSON sin librerias, para que se lea de un vistazo. */
  App.json = function (valor) {
    var texto = typeof valor === 'string' ? valor : JSON.stringify(valor, null, 2);
    if (texto === undefined) return '<span class="k">(sin cuerpo)</span>';
    return App.esc(texto).replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
      function (m) {
        var c = 'n';
        if (/^"/.test(m)) c = /:$/.test(m) ? 'k' : 's';
        else if (/true|false|null/.test(m)) c = 'b';
        return '<span class="' + c + '">' + m + '</span>';
      }
    );
  };

  App.estadoPill = function (estado, anulado) {
    if (anulado) return '<span class="pill err">ANULADO</span>';
    var e = String(estado || '').toUpperCase();
    var clase = e === 'ACEPTADO' ? 'ok'
      : e === 'RECHAZADO' ? 'err'
      : e === 'PENDIENTE' ? 'warn'
      : e === 'OBSERVADO' ? 'warn' : 'mute';
    return '<span class="pill ' + clase + '">' + App.esc(e || 'SIN ESTADO') + '</span>';
  };

  /* --------------------------------------------------------------- Avisos */

  App.aviso = function (titulo, detalle, tipo) {
    var caja = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || '');
    el.innerHTML = '<div class="tt">' + App.esc(titulo) + '</div>'
      + (detalle ? '<div class="td">' + App.esc(detalle) + '</div>' : '');
    caja.appendChild(el);
    setTimeout(function () { el.remove(); }, tipo === 'err' ? 7000 : 4200);
  };

  /** Traduce un fallo de la API a algo que el programador pueda accionar. */
  App.avisoError = function (e) {
    var detalle = '';
    if (e && e.errores) {
      var campos = Object.keys(e.errores);
      detalle = campos.slice(0, 3).map(function (c) {
        return c + ': ' + [].concat(e.errores[c])[0];
      }).join(' · ');
      if (campos.length > 3) detalle += ' (+' + (campos.length - 3) + ')';
    }
    App.aviso(
      (e && e.message) || 'Falló la llamada',
      detalle || (e && e.estado ? 'HTTP ' + e.estado : ''),
      'err'
    );
  };

  /* ---------------------------------------------------------------- Modal */

  App.modal = function (titulo, cuerpoHTML, pieHTML) {
    var scrim = document.getElementById('scrim');
    scrim.innerHTML = ''
      + '<div class="modal" role="dialog" aria-modal="true" aria-label="' + App.esc(titulo) + '">'
      +   '<div class="modal-head">'
      +     '<h3>' + App.esc(titulo) + '</h3>'
      +     '<button class="x" id="modal-x" aria-label="Cerrar">' + App.icono('quitar') + '</button>'
      +   '</div>'
      +   '<div class="modal-body">' + cuerpoHTML + '</div>'
      +   (pieHTML ? '<div class="modal-foot">' + pieHTML + '</div>' : '')
      + '</div>';
    // El scrim es siempre el mismo elemento del documento, asi que un modal
    // podia heredar el oyente del anterior y ejecutar los dos a la vez. Se
    // entrega limpio: quien lo abra pone el suyo con onclick.
    scrim.onclick = null;

    scrim.classList.add('on');
    document.getElementById('modal-x').addEventListener('click', App.cerrarModal);
    return scrim;
  };

  App.cerrarModal = function () {
    var scrim = document.getElementById('scrim');
    scrim.classList.remove('on');
    scrim.innerHTML = '';
  };

  /* ------------------------------------------------------------ Descargas */

  App.guardarBlob = function (blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  App.copiar = function (texto) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(
        function () { App.aviso('Copiado', null, 'ok'); },
        function () { App.aviso('No se pudo copiar', 'Selecciónalo y usa Ctrl+C.', 'err'); }
      );
      return;
    }
    App.aviso('No se pudo copiar', 'Selecciónalo y usa Ctrl+C.', 'err');
  };

  /* ------------------------------------------------------------- Atajos */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') App.cerrarModal();
  });

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'scrim') App.cerrarModal();
  });

})();
