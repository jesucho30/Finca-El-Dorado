/* ============================================================================
 *  Finca El Dorado - logica principal
 *  Login, sidebar/navegacion, cambio de tema y modulos vacios.
 *  Cada modulo esta listo para que se construya su contenido despues.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // Definicion de modulos (orden y titulo del sidebar). El contenido
  // empieza vacio: aqui se ira construyendo cada uno.
  const MODULOS = {
    inicio:        'Inicio',
    ventas:        'Despachado',
    cotizador:     'Cuentas / Factura',
    compras:       'Compras',
    pagos:         'Pagos',
    registros:     'Registros',
    resultados:    'Resultados',
    configuracion: 'Configuración',
    perfil:        'Perfil'
  };

  // Modulos que ya tienen su propio contenido (no se pintan como vacios).
  // Resultados y Egresos ahora viven DENTRO de Configuracion (como pestañas).
  const CONSTRUIDOS = ['inicio', 'ventas', 'cotizador', 'compras', 'pagos', 'registros', 'resultados', 'configuracion', 'perfil'];

  // Interruptor global de ediciones (se lee de finca/config/edicionesActivas).
  // Por defecto activado (true) si nunca se ha configurado.
  let edicionesActivas = true;

  // Permisos por usuario (finca/config/usuarios) + correo del usuario actual.
  let emailActual = '';
  const slugEmail = (e) => (e || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  // Rol del usuario actual: 'editor' | 'ver'. Si no está en la lista -> 'editor'.
  function rolActual() {
    const u = configActual && configActual.usuarios;
    const reg = u && u[slugEmail(emailActual)];
    return (reg && reg.rol === 'ver') ? 'ver' : 'editor';
  }
  // Puede CREAR si no es "solo ver". Puede EDITAR/BORRAR si además el
  // interruptor global está activo.
  window.fincaPuedeCrear  = () => rolActual() !== 'ver';
  window.fincaPuedeEditar = () => edicionesActivas && rolActual() !== 'ver';
  // Registros (Inventario + Aportes) tiene su PROPIO interruptor
  // (finca/config/edicionRegistros, default activado), independiente del
  // global. Igual respeta el rol "solo ver".
  window.fincaPuedeEditarRegistros = () => {
    const flag = !(configActual && configActual.edicionRegistros === false);
    return flag && rolActual() !== 'ver';
  };

  // Configuracion completa compartida (compradores, precios, etc.).
  let configActual = {};
  window.fincaConfig = () => configActual;

  function whenReady(fn) {
    if (window.fincaAuth) fn();
    else window.addEventListener('firebase-ready', fn, { once: true });
  }

  // -- Avisos de login: los modulos registran callbacks para empezar a leer
  //    datos solo cuando hay un usuario autenticado (las reglas lo exigen).
  const cbsLogin = [];
  window.fincaOnLogin = (cb) => {
    cbsLogin.push(cb);
    const u = window.fincaAuth && window.fincaAuth.currentUser();
    if (u) { try { cb(u); } catch (e) { console.error(e); } }
  };

  const cbsLogout = [];
  window.fincaOnLogout = (cb) => { cbsLogout.push(cb); };

  // ==========================================================================
  //  TEMA (oscuro / claro)
  // ==========================================================================
  function initTema() {
    const btn = $('btn-tema');
    const pintarIcono = () => {
      const oscuro = document.documentElement.getAttribute('data-theme') !== 'light';
      // Mostramos el icono del tema al que se cambiaria.
      btn.textContent = oscuro ? '☀️' : '🌙';
      btn.title = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    };
    btn.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const nuevo = actual === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', nuevo);
      try { localStorage.setItem('finca-tema', nuevo); } catch (e) {}
      pintarIcono();
    });
    pintarIcono();
  }

  // ==========================================================================
  //  AUTENTICACION
  // ==========================================================================
  function initAuth() {
    const errBox = $('login-error');

    $('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.textContent = '';
      $('btn-login').disabled = true;
      try {
        await window.fincaAuth.login($('login-email').value.trim(), $('login-pass').value);
      } catch (err) {
        errBox.textContent = traducirError(err);
      } finally {
        $('btn-login').disabled = false;
      }
    });

    $('btn-logout').addEventListener('click', () => window.fincaAuth.logout());

    window.fincaAuth.onAuthChange((user) => {
      if (user) {
        emailActual = user.email || '';
        $('pantalla-login').classList.add('oculto');
        $('app').classList.remove('oculto');
        $('topbar-user').textContent = user.email || '';
        suscribirConfigGlobal();
        window.dispatchEvent(new CustomEvent('finca-ediciones', { detail: window.fincaPuedeEditar() }));
        cbsLogin.forEach(cb => { try { cb(user); } catch (e) { console.error(e); } });
      } else {
        $('app').classList.add('oculto');
        $('pantalla-login').classList.remove('oculto');
        $('login-pass').value = '';
        cbsLogout.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
      }
    });
  }

  function traducirError(err) {
    const code = (err && err.code) ? err.code : '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
      return 'Correo o contraseña incorrectos.';
    if (code.includes('invalid-email'))   return 'Correo no válido.';
    if (code.includes('network'))         return 'Sin conexión a internet.';
    if (code.includes('too-many'))        return 'Demasiados intentos. Espera un momento.';
    return 'No se pudo entrar. ' + (err && err.message ? err.message : '');
  }

  // ==========================================================================
  //  CONFIG GLOBAL (interruptor de ediciones, compartido por todos)
  // ==========================================================================
  let configSuscrito = false;
  function suscribirConfigGlobal() {
    if (configSuscrito) return;
    configSuscrito = true;
    window.fincaDB.escucharConfig((cfg) => {
      configActual = cfg || {};
      // Por defecto activado: solo se desactiva si esta explicitamente en false.
      edicionesActivas = !(cfg && cfg.edicionesActivas === false);
      window.dispatchEvent(new CustomEvent('finca-ediciones', { detail: edicionesActivas }));
      window.dispatchEvent(new CustomEvent('finca-config', { detail: configActual }));
    });
  }

  // ==========================================================================
  //  NAVEGACION (sidebar)
  // ==========================================================================
  function initNav() {
    const app = $('app');

    document.querySelectorAll('.menu-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vista = btn.dataset.vista;
        document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('activo', b === btn));
        document.querySelectorAll('.vista').forEach(v => v.classList.toggle('oculto', v.id !== 'vista-' + vista));
        $('topbar-title').textContent = MODULOS[vista] || '';
        app.classList.remove('nav-open'); // cerrar menu en celular
      });
    });

    // Menu hamburguesa (celular)
    $('btn-menu').addEventListener('click', () => app.classList.toggle('nav-open'));
    $('backdrop').addEventListener('click', () => app.classList.remove('nav-open'));

    // Recoger / expandir el sidebar (escritorio). Recuerda la preferencia.
    const btnCol = $('btn-colapsar');
    const aplicarColapso = () => {
      let colapsado = false;
      try { colapsado = localStorage.getItem('finca-sidebar') === 'colapsado'; } catch (e) {}
      app.classList.toggle('sidebar-collapsed', colapsado);
      if (btnCol) btnCol.textContent = colapsado ? '›' : '‹ Colapsar';
    };
    if (btnCol) btnCol.addEventListener('click', () => {
      const nuevo = !app.classList.contains('sidebar-collapsed');
      try { localStorage.setItem('finca-sidebar', nuevo ? 'colapsado' : 'abierto'); } catch (e) {}
      aplicarColapso();
    });
    aplicarColapso();
  }

  // ==========================================================================
  //  MODULOS VACIOS
  //  Cada vista arranca vacia, con el logo y una nota. El contenido real
  //  de cada modulo se construira aqui mas adelante.
  // ==========================================================================
  function pintarModulosVacios() {
    Object.keys(MODULOS).forEach((clave) => {
      if (CONSTRUIDOS.indexOf(clave) !== -1) return; // ya tiene contenido propio
      const cont = $('vista-' + clave);
      if (!cont) return;
      cont.innerHTML =
        '<div class="vista-vacia">' +
          '<div class="logo"></div>' +
          '<h2>' + MODULOS[clave] + '</h2>' +
          '<p>Módulo vacío, listo para construir. Aquí irá el contenido de ' +
          MODULOS[clave] + '.</p>' +
        '</div>';
    });
  }

  // ==========================================================================
  //  ARRANQUE
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTema();
    pintarModulosVacios();
    whenReady(() => {
      initAuth();
      initNav();
    });
  });
})();
