/* ============================================================================
 *  Modulo CONFIGURACION - Finca El Dorado
 *  - Candado: pide una clave para entrar.
 *  - Adentro: interruptor para activar/desactivar las ediciones de toda la app
 *    (se guarda en la nube, aplica a todos los usuarios al instante).
 *  - Permite cambiar la clave.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CLAVE_DEFECTO = 'dorado';

  let cfg = {};            // contenido de finca/config
  let desbloqueado = false; // candado abierto en esta sesion

  const claveActual = () => (cfg && cfg.claveConfig) ? cfg.claveConfig : CLAVE_DEFECTO;

  // ==========================================================================
  //  ESTRUCTURA HTML
  // ==========================================================================
  function construir() {
    const cont = $('vista-configuracion');
    if (!cont) return;
    cont.innerHTML = `
      <!-- CANDADO -->
      <div id="cfg-candado" class="bloque">
        <div class="candado-card">
          <div class="logo candado-logo"></div>
          <h3>Zona protegida</h3>
          <p class="modulo-sub" style="text-align:center">Escribe la clave para entrar a la configuración.</p>
          <form id="cfg-form-clave">
            <input type="password" id="cfg-clave-input" placeholder="Clave" autocomplete="off">
            <button type="submit" class="btn-acento">Entrar</button>
          </form>
          <p id="cfg-clave-msg" class="msg"></p>
        </div>
      </div>

      <!-- PANEL (oculto hasta desbloquear) -->
      <div id="cfg-panel" class="oculto">
        <div class="cfg-tabs">
          <button type="button" data-tab="ediciones" class="active">Ediciones de la app</button>
          <button type="button" data-tab="ingresos">Ingresos</button>
          <button type="button" data-tab="egresos">Egresos</button>
        </div>

        <!-- ===== PESTAÑA: EDICIONES DE LA APP ===== -->
        <div id="cfg-tab-ediciones">
        <section class="bloque">
          <h3>Interruptor de ediciones</h3>
          <div class="panel-fila">
            <div>
              <strong>Estado:</strong> <span id="cfg-estado-edic" class="badge">—</span>
              <p class="modulo-sub">Si está desactivado, nadie puede <b>editar ni borrar</b> lo ya registrado (crear sí se puede).</p>
            </div>
            <button id="cfg-toggle-edic" class="btn-acento">—</button>
          </div>
        </section>

        <section class="bloque">
          <h3>Permisos por usuario</h3>
          <p class="modulo-sub">Quién puede editar y quién solo ver, según el correo con el que inicie sesión. "Solo ver" no puede crear, editar ni borrar. Un correo que no esté en la lista puede editar.</p>
          <div id="cfg-usuarios"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-usuario" class="btn-plano" type="button">+ Agregar usuario</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-usuarios" class="btn-acento" type="button">Guardar permisos</button>
          </div>
          <p id="cfg-usr-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Compradores y precios</h3>
          <p class="modulo-sub">Define quién compra, a qué precio por unidad y en qué jornada suele comprar. El formulario de Despachado se autocompleta con esto.</p>
          <div id="cfg-compradores"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-comprador" class="btn-plano">+ Agregar comprador</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-compradores" class="btn-acento">Guardar compradores</button>
          </div>
          <p id="cfg-comp-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Jornadas</h3>
          <p class="modulo-sub">Los momentos del día en que se registra (Mañana, Tarde...). Puedes agregar más.</p>
          <div id="cfg-jornadas"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-jornada" class="btn-plano" type="button">+ Agregar jornada</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-jornadas" class="btn-acento" type="button">Guardar jornadas</button>
          </div>
          <p id="cfg-jor-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Tipos de registro</h3>
          <p class="modulo-sub">Las categorías del módulo Registros (Animal, Cosa, Herramienta...). Puedes agregar más.</p>
          <div id="cfg-tipos"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-tipo" class="btn-plano" type="button">+ Agregar tipo</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-tipos" class="btn-acento" type="button">Guardar tipos</button>
          </div>
          <p id="cfg-tipo-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Vacas</h3>
          <p class="modulo-sub">Tus vacas (nombre + foto). En Despachado eliges de cuál es la leche y verás la producción por vaca.</p>
          <div id="cfg-vacas"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-vaca" class="btn-plano" type="button">+ Agregar vaca</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-vacas" class="btn-acento" type="button">Guardar vacas</button>
          </div>
          <p id="cfg-vaca-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Imágenes de productos (tarjeta "Otros")</h3>
          <p class="modulo-sub">Una foto para cada producto que aparece en la tarjeta "Otros" de Despachado.</p>
          <div id="cfg-productos"></div>
          <div class="prod-agregar">
            <input type="text" id="cfg-prod-nuevo" placeholder="Nuevo producto (ej. Queso)">
            <select id="cfg-prod-unidad">
              <option value="unidades">unidades</option>
              <option value="kilos">kilos</option>
              <option value="litros">litros</option>
            </select>
            <button id="cfg-prod-add" class="btn-plano" type="button">+ Agregar producto</button>
          </div>
          <div class="panel-fila" style="margin-top:10px">
            <span style="flex:1"></span>
            <button id="cfg-guardar-productos" class="btn-acento" type="button">Guardar productos</button>
          </div>
          <p id="cfg-prod-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Precios de pérdida (por producto)</h3>
          <p class="modulo-sub">Valor con el que se calcula la pérdida (uso doméstico / regalo) de cada producto. Agrega los que necesites: leche, huevos, gallina...</p>
          <div id="cfg-perdidas"></div>
          <div class="panel-fila" style="margin-top:10px;gap:10px">
            <button id="cfg-add-perdida" class="btn-plano" type="button">+ Agregar precio</button>
            <span style="flex:1"></span>
            <button id="cfg-guardar-perdida" class="btn-acento" type="button">Guardar precios</button>
          </div>
          <p id="cfg-perdida-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Cambiar clave de configuración</h3>
          <div class="panel-fila">
            <label class="campo" style="flex:1;margin:0">
              <span>Nueva clave</span>
              <input type="text" id="cfg-nueva-clave" placeholder="Escribe la nueva clave">
            </label>
            <button id="cfg-guardar-clave" class="btn-plano" style="align-self:flex-end">Guardar clave</button>
          </div>
          <p id="cfg-clave2-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Clave de Aportes</h3>
          <p class="modulo-sub">Clave para entrar a la pestaña <b>Aportes</b> dentro de Registros. Por defecto: <code>aportes</code>.</p>
          <div class="panel-fila">
            <label class="campo" style="flex:1;margin:0">
              <span>Nueva clave de aportes</span>
              <input type="text" id="cfg-nueva-clave-aportes" placeholder="Escribe la nueva clave">
            </label>
            <button id="cfg-guardar-clave-aportes" class="btn-plano" style="align-self:flex-end">Guardar</button>
          </div>
          <p id="cfg-claveap-msg" class="msg"></p>
        </section>

        <section class="bloque">
          <h3>Edición de Registros</h3>
          <div class="panel-fila">
            <div>
              <strong>Estado:</strong> <span id="cfg-estado-aportes" class="badge">—</span>
              <p class="modulo-sub">Permite editar y borrar <b>todo lo de Registros</b> (Inventario: entradas/salidas, y Aportes). Es <b>independiente</b> del interruptor global de ediciones.</p>
            </div>
            <button id="cfg-toggle-aportes" class="btn-acento">—</button>
          </div>
        </section>

        <section class="bloque">
          <h3>Limpiar historial de facturas</h3>
          <div class="panel-fila">
            <div>
              <strong>Estado:</strong> <span id="cfg-estado-limpfact" class="badge">—</span>
              <p class="modulo-sub">Permite usar el botón <b>“Limpiar historial”</b> en Cuentas / Factura para borrar TODAS las facturas guardadas. Por seguridad viene <b>desactivado</b>.</p>
            </div>
            <button id="cfg-toggle-limpfact" class="btn-acento">—</button>
          </div>
        </section>

        <section class="bloque zona-peligro">
          <h3>⚠️ Zona peligrosa</h3>
          <p class="modulo-sub">Borra TODOS los datos de Despachado, Ingresos, Egresos y Flujo proyectado para empezar de cero. Los <b>Registros (inventario) NO se tocan</b>. Esto no se puede deshacer.</p>
          <button id="cfg-borrar-todo" class="btn-peligro" type="button">🗑️ Borrar todos los datos</button>
          <p id="cfg-borrar-msg" class="msg"></p>
        </section>
        </div><!-- /cfg-tab-ediciones -->

        <!-- ===== PESTAÑA: INGRESOS ===== -->
        <div id="cfg-tab-ingresos" class="oculto">
          <div id="cfg-ingresos">
            <section class="bloque"><h3>Ingresos</h3><p class="modulo-sub">Se llena con lo que se vende en Despachado (la leche).</p></section>
          </div>
        </div>

        <!-- ===== PESTAÑA: EGRESOS ===== -->
        <div id="cfg-tab-egresos" class="oculto">
          <div id="cfg-egresos">
            <section class="bloque"><h3>Egresos</h3><p class="modulo-sub">Se llena con lo que se registra en Compras y Pagos.</p></section>
          </div>
        </div>

        <button id="cfg-bloquear" class="btn-plano">🔒 Bloquear de nuevo</button>
      </div>
    `;
    enlazar();
  }

  function enlazar() {
    $('cfg-form-clave').addEventListener('submit', intentarEntrar);
    $('cfg-toggle-edic').addEventListener('click', alternarEdiciones);
    $('cfg-toggle-aportes').addEventListener('click', alternarEdicionAportes);
    $('cfg-toggle-limpfact').addEventListener('click', alternarLimpiarFacturas);
    $('cfg-guardar-clave').addEventListener('click', guardarClave);
    $('cfg-bloquear').addEventListener('click', bloquear);
    $('cfg-add-comprador').addEventListener('click', () => agregarFilaComprador('', '', ''));
    $('cfg-guardar-compradores').addEventListener('click', guardarCompradores);
    $('cfg-guardar-perdida').addEventListener('click', guardarPerdida);
    $('cfg-add-vaca').addEventListener('click', () => agregarFilaVaca('', ''));
    $('cfg-guardar-vacas').addEventListener('click', guardarVacas);
    $('cfg-guardar-productos').addEventListener('click', guardarProductos);
    $('cfg-prod-add').addEventListener('click', agregarProducto);
    $('cfg-add-jornada').addEventListener('click', () => agregarFilaJornada(''));
    $('cfg-guardar-jornadas').addEventListener('click', guardarJornadas);
    $('cfg-add-tipo').addEventListener('click', () => agregarFilaTipo(''));
    $('cfg-guardar-tipos').addEventListener('click', guardarTipos);
    $('cfg-add-usuario').addEventListener('click', () => agregarFilaUsuario('', 'editor'));
    $('cfg-guardar-usuarios').addEventListener('click', guardarUsuarios);
    $('cfg-borrar-todo').addEventListener('click', borrarTodosLosDatos);
    $('cfg-guardar-clave-aportes').addEventListener('click', guardarClaveAportes);
    $('cfg-add-perdida').addEventListener('click', () => agregarFilaPerdida('', ''));
    // Pestañas: Ediciones de la app / Resultados / Egresos
    document.querySelectorAll('.cfg-tabs button').forEach(b => {
      b.addEventListener('click', () => mostrarTab(b.dataset.tab));
    });
  }

  function mostrarTab(tab) {
    document.querySelectorAll('.cfg-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    ['ediciones', 'ingresos', 'egresos'].forEach(t => {
      const el = $('cfg-tab-' + t);
      if (el) el.classList.toggle('oculto', t !== tab);
    });
  }

  // -- Jornadas -------------------------------------------------------------
  const JORNADAS_DEFECTO = ['Mañana', 'Tarde'];

  function renderJornadas() {
    const cont = $('cfg-jornadas');
    if (!cont) return;
    cont.innerHTML = '';
    let lista = (cfg && Array.isArray(cfg.jornadas) && cfg.jornadas.length) ? cfg.jornadas : JORNADAS_DEFECTO;
    lista.forEach(j => agregarFilaJornada(j));
  }

  function agregarFilaJornada(nombre) {
    const cont = $('cfg-jornadas');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'jornada-fila';
    row.innerHTML =
      `<input class="jornada-nombre" type="text" placeholder="Nombre de la jornada" value="${nombre || ''}">` +
      `<button type="button" class="jornada-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.jornada-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarJornadas() {
    const msg = $('cfg-jor-msg');
    const arr = [...document.querySelectorAll('#cfg-jornadas .jornada-nombre')]
      .map(i => i.value.trim()).filter(Boolean);
    if (!arr.length) { msg.textContent = 'Debe haber al menos una jornada.'; msg.className = 'msg err'; return; }
    try {
      await window.fincaDB.set('finca/config/jornadas', arr);
      msg.textContent = '✓ Jornadas guardadas.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  async function guardarClaveAportes() {
    const msg = $('cfg-claveap-msg');
    const nueva = $('cfg-nueva-clave-aportes').value.trim();
    if (nueva.length < 3) { msg.textContent = 'La clave debe tener al menos 3 caracteres.'; msg.className = 'msg err'; return; }
    try {
      await window.fincaDB.set('finca/config/claveAportes', nueva);
      $('cfg-nueva-clave-aportes').value = '';
      msg.textContent = '✓ Clave de aportes actualizada.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Borrar TODOS los datos (menos Registros) -----------------------------
  async function borrarTodosLosDatos() {
    if (window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      alert('No tienes permiso para borrar (ediciones desactivadas o usuario solo lectura).');
      return;
    }
    if (!confirm('⚠️ Vas a BORRAR todos los datos de:\n\n• Despachado (leche)\n• Ingresos\n• Egresos (compras y pagos)\n• Flujo proyectado\n\nLos REGISTROS (inventario) NO se tocan.\n\nEsto NO se puede deshacer. ¿Continuar?')) return;
    const msg = $('cfg-borrar-msg');
    try {
      await Promise.all([
        window.fincaDB.set('finca/ventas', null),
        window.fincaDB.set('finca/ingresos', null),
        window.fincaDB.set('finca/egresos', null),
        window.fincaDB.set('finca/flujoProyectado', null),
        window.fincaDB.set('finca/catalogoEgresos', null),
        window.fincaDB.set('finca/catalogoIngresos', null)
      ]);
      msg.textContent = '✓ Datos borrados. Los Registros quedaron intactos.'; msg.className = 'msg ok';
    } catch (err) {
      msg.textContent = 'No se pudo borrar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Permisos por usuario (email -> rol editor/ver) -----------------------
  function renderUsuarios() {
    const cont = $('cfg-usuarios');
    if (!cont) return;
    cont.innerHTML = '';
    const u = cfg && cfg.usuarios;
    if (u && typeof u === 'object') {
      Object.keys(u).forEach(k => agregarFilaUsuario(u[k].email || k, u[k].rol || 'editor'));
    }
  }

  function agregarFilaUsuario(email, rol) {
    const cont = $('cfg-usuarios');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'usuario-fila';
    row.innerHTML =
      `<input class="usr-email" type="email" placeholder="correo@ejemplo.com" value="${email || ''}">` +
      `<select class="usr-rol">` +
        `<option value="editor"${rol === 'editor' ? ' selected' : ''}>Editor</option>` +
        `<option value="ver"${rol === 'ver' ? ' selected' : ''}>Solo ver</option>` +
      `</select>` +
      `<button type="button" class="usr-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.usr-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarUsuarios() {
    const msg = $('cfg-usr-msg');
    const rows = [...document.querySelectorAll('#cfg-usuarios .usuario-fila')];
    const obj = {};
    for (const r of rows) {
      const email = r.querySelector('.usr-email').value.trim().toLowerCase();
      if (!email) continue;
      obj[slug(email)] = { email: email, rol: r.querySelector('.usr-rol').value };
    }
    try {
      await window.fincaDB.set('finca/config/usuarios', Object.keys(obj).length ? obj : null);
      msg.textContent = '✓ Permisos guardados.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Tipos de registro ----------------------------------------------------
  const TIPOS_DEFECTO = ['Animal', 'Cosa', 'Herramienta', 'Cultivo', 'Otro'];

  function renderTipos() {
    const cont = $('cfg-tipos');
    if (!cont) return;
    cont.innerHTML = '';
    const lista = (cfg && Array.isArray(cfg.tiposRegistro) && cfg.tiposRegistro.length) ? cfg.tiposRegistro : TIPOS_DEFECTO;
    lista.forEach(t => agregarFilaTipo(t));
  }

  function agregarFilaTipo(nombre) {
    const cont = $('cfg-tipos');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'jornada-fila';
    row.innerHTML =
      `<input class="jornada-nombre" type="text" placeholder="Nombre del tipo" value="${nombre || ''}">` +
      `<button type="button" class="jornada-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.jornada-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarTipos() {
    const msg = $('cfg-tipo-msg');
    const arr = [...document.querySelectorAll('#cfg-tipos .jornada-nombre')]
      .map(i => i.value.trim()).filter(Boolean);
    if (!arr.length) { msg.textContent = 'Debe haber al menos un tipo.'; msg.className = 'msg err'; return; }
    try {
      await window.fincaDB.set('finca/config/tiposRegistro', arr);
      msg.textContent = '✓ Tipos guardados.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Imágenes de productos para la tarjeta "Otros" ------------------------
  const PRODUCTOS = [
    { v: 'huevos', t: 'Huevos', e: '🥚' }, { v: 'vacas', t: 'Vacas', e: '🐄' },
    { v: 'gallinas', t: 'Gallinas', e: '🐔' }, { v: 'pollos', t: 'Pollos', e: '🐤' },
    { v: 'yuca', t: 'Yuca', e: '🍠' }, { v: 'platano', t: 'Plátano', e: '🍌' },
    { v: 'pescado', t: 'Pescado', e: '🐟' }
  ];

  function renderProductos() {
    const cont = $('cfg-productos');
    if (!cont) return;
    const guardadas = (cfg && cfg.productos) ? cfg.productos : {};
    cont.innerHTML = '';
    PRODUCTOS.forEach(p => {
      const img = guardadas[p.v] || '';
      const row = document.createElement('div');
      row.className = 'prod-fila';
      row.dataset.concepto = p.v;
      row._img = img;
      row.innerHTML =
        `<div class="prod-thumb">${img ? `<img src="${img}" alt="${p.t}">` : `<span>${p.e}</span>`}</div>` +
        `<span class="prod-nombre">${p.t}</span>` +
        `<input class="prod-file" type="file" accept="image/*">`;
      row.querySelector('.prod-file').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        comprimirImagen(f, (data) => {
          row._img = data;
          row.querySelector('.prod-thumb').innerHTML = `<img src="${data}" alt="${p.t}">`;
        });
      });
      cont.appendChild(row);
    });
    // Productos personalizados (agregados por el usuario), con botón de quitar.
    productosExtraCfg().forEach(p => {
      const img = guardadas[p.v] || '';
      const row = document.createElement('div');
      row.className = 'prod-fila';
      row.dataset.concepto = p.v;
      row._img = img;
      row.innerHTML =
        `<div class="prod-thumb">${img ? `<img src="${img}" alt="${p.t}">` : '<span>📦</span>'}</div>` +
        `<span class="prod-nombre">${p.t} <em style="color:var(--suave);font-weight:400">(${p.u})</em></span>` +
        `<input class="prod-file" type="file" accept="image/*">` +
        `<button class="btn-icono prod-quitar" type="button" title="Quitar producto">✕</button>`;
      row.querySelector('.prod-file').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        comprimirImagen(f, (data) => { row._img = data; row.querySelector('.prod-thumb').innerHTML = `<img src="${data}" alt="${p.t}">`; });
      });
      row.querySelector('.prod-quitar').addEventListener('click', () => quitarProducto(p.v));
      cont.appendChild(row);
    });
  }

  function productosExtraCfg() {
    const p = (cfg && cfg.productosExtra) ? cfg.productosExtra : {};
    return Object.keys(p).map(k => ({ v: k, t: p[k].nombre || k, u: p[k].unidad || 'unidades' }));
  }

  const PROD_FIJOS = ['leche', 'huevos', 'vacas', 'gallinas', 'pollos', 'yuca', 'platano', 'pescado', 'otro'];
  async function agregarProducto() {
    const inp = $('cfg-prod-nuevo'), msg = $('cfg-prod-msg');
    const nombre = inp.value.trim();
    if (!nombre) { msg.textContent = 'Escribe el nombre del nuevo producto.'; msg.className = 'msg err'; return; }
    const key = slug(nombre);
    if (PROD_FIJOS.indexOf(key) !== -1 || (cfg.productosExtra && cfg.productosExtra[key])) {
      msg.textContent = 'Ese producto ya existe.'; msg.className = 'msg err'; return;
    }
    const unidad = $('cfg-prod-unidad').value;
    try {
      await window.fincaDB.set('finca/config/productosExtra/' + key, { nombre: nombre, unidad: unidad });
      cfg.productosExtra = cfg.productosExtra || {};
      cfg.productosExtra[key] = { nombre: nombre, unidad: unidad };
      inp.value = '';
      renderProductos();
      msg.textContent = '✓ Producto agregado. Ya aparece en Despachado.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 3000);
    } catch (err) { msg.textContent = 'No se pudo agregar: ' + (err.message || err); msg.className = 'msg err'; }
  }

  async function quitarProducto(key) {
    if (!confirm('¿Quitar este producto? Se quita de la lista y de Despachado (los registros ya hechos NO se borran).')) return;
    try {
      await window.fincaDB.set('finca/config/productosExtra/' + key, null);
      await window.fincaDB.set('finca/config/productos/' + key, null);
      if (cfg.productosExtra) delete cfg.productosExtra[key];
      if (cfg.productos) delete cfg.productos[key];
      renderProductos();
    } catch (err) { alert('No se pudo quitar: ' + (err.message || err)); }
  }

  async function guardarProductos() {
    const msg = $('cfg-prod-msg');
    const rows = [...document.querySelectorAll('#cfg-productos .prod-fila')];
    const obj = {};
    rows.forEach(r => { if (r._img) obj[r.dataset.concepto] = r._img; });
    try {
      await window.fincaDB.set('finca/config/productos', Object.keys(obj).length ? obj : null);
      msg.textContent = '✓ Productos guardados.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Editor de vacas (nombre + foto) --------------------------------------
  // Reduce una imagen a máx 220px y devuelve su data URL (JPEG liviano).
  function comprimirImagen(file, cb) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const im = new Image();
      im.onload = () => {
        const max = 220;
        let w = im.width, h = im.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.8));
      };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderVacas() {
    const cont = $('cfg-vacas');
    if (!cont) return;
    cont.innerHTML = '';
    const v = cfg && cfg.vacas;
    let lista = [];
    if (v && typeof v === 'object' && Object.keys(v).length) {
      lista = Object.keys(v).map(k => ({ nombre: v[k].nombre || k, img: v[k].img || '' }));
    } else if (cfg && cfg.vacaNombre) {
      lista = [{ nombre: cfg.vacaNombre, img: cfg.vacaImg || '' }]; // migra la vaca antigua
    }
    lista.forEach(x => agregarFilaVaca(x.nombre, x.img));
  }

  function agregarFilaVaca(nombre, img) {
    const cont = $('cfg-vacas');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'vaca-fila';
    row._img = img || '';
    row.innerHTML =
      `<div class="vaca-preview">${img ? `<img src="${img}" alt="vaca">` : '<span>🐄</span>'}</div>` +
      `<div class="vaca-campos">` +
        `<input class="vaca-nombre" type="text" placeholder="Nombre" value="${nombre || ''}">` +
        `<input class="vaca-file" type="file" accept="image/*">` +
      `</div>` +
      `<button type="button" class="vaca-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.vaca-file').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      comprimirImagen(f, (data) => {
        row._img = data;
        row.querySelector('.vaca-preview').innerHTML = `<img src="${data}" alt="vaca">`;
      });
    });
    row.querySelector('.vaca-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarVacas() {
    const msg = $('cfg-vaca-msg');
    const rows = [...document.querySelectorAll('#cfg-vacas .vaca-fila')];
    const obj = {};
    for (const r of rows) {
      const nombre = r.querySelector('.vaca-nombre').value.trim();
      if (!nombre) continue;
      obj[slug(nombre)] = { nombre: nombre, img: r._img || '' };
    }
    try {
      await window.fincaDB.set('finca/config/vacas', Object.keys(obj).length ? obj : null);
      msg.textContent = '✓ Vacas guardadas.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  const JORNADAS = ['Mañana', 'Tarde'];
  const COMPRADORES_DEFECTO = [
    { nombre: 'Janer', precio: 1600, jornada: 'Mañana' },
    { nombre: 'Nena',  precio: 1800, jornada: 'Tarde'  }
  ];
  const numero = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
  const slug = (s) => {
    const base = s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return base || ('c' + Math.abs(hash(s)));
  };

  // -- Editor de compradores ------------------------------------------------
  function renderCompradores() {
    const cont = $('cfg-compradores');
    if (!cont) return;
    cont.innerHTML = '';
    const c = cfg && cfg.compradores;
    let lista;
    if (c && typeof c === 'object' && Object.keys(c).length) {
      lista = Object.keys(c).map(k => ({ nombre: c[k].nombre || k, precio: numero(c[k].precio), jornada: c[k].jornada || '' }));
    } else {
      lista = COMPRADORES_DEFECTO.slice();
    }
    lista.forEach(x => agregarFilaComprador(x.nombre, x.precio, x.jornada));
  }

  function agregarFilaComprador(nombre, precio, jornada) {
    const cont = $('cfg-compradores');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'comp-row';
    const ops = ['<option value="">Ninguna</option>'].concat(
      JORNADAS.map(j => `<option value="${j}" ${j === jornada ? 'selected' : ''}>${j}</option>`)
    ).join('');
    row.innerHTML =
      `<input class="comp-nombre" placeholder="Nombre" value="${nombre || ''}">` +
      `<input class="comp-precio" type="number" min="0" step="1" placeholder="Precio" value="${precio || ''}">` +
      `<select class="comp-jornada">${ops}</select>` +
      `<button type="button" class="comp-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.comp-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarCompradores() {
    const msg = $('cfg-comp-msg');
    const rows = [...document.querySelectorAll('#cfg-compradores .comp-row')];
    const obj = {};
    for (const r of rows) {
      const nombre = r.querySelector('.comp-nombre').value.trim();
      if (!nombre) continue;
      obj[slug(nombre)] = {
        nombre: nombre,
        precio: numero(r.querySelector('.comp-precio').value),
        jornada: r.querySelector('.comp-jornada').value
      };
    }
    if (!Object.keys(obj).length) { msg.textContent = 'Agrega al menos un comprador.'; msg.className = 'msg err'; return; }
    try {
      await window.fincaDB.set('finca/config/compradores', obj);
      msg.textContent = '✓ Compradores guardados.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // -- Precios de pérdida por producto (lista) ------------------------------
  function renderPerdidas() {
    const cont = $('cfg-perdidas');
    if (!cont) return;
    cont.innerHTML = '';
    const p = cfg && cfg.preciosPerdida;
    let lista = [];
    if (p && typeof p === 'object' && Object.keys(p).length) {
      lista = Object.keys(p).map(k => ({ referente: p[k].referente || k, precio: numero(p[k].precio) }));
    } else if (cfg && numero(cfg.precioPerdida) > 0) {
      lista = [{ referente: 'Leche', precio: numero(cfg.precioPerdida) }]; // migra el valor antiguo
    } else {
      lista = [{ referente: 'Leche', precio: 1600 }];
    }
    lista.forEach(x => agregarFilaPerdida(x.referente, x.precio));
  }

  function agregarFilaPerdida(referente, precio) {
    const cont = $('cfg-perdidas');
    if (!cont) return;
    const row = document.createElement('div');
    row.className = 'perdida-fila';
    row.innerHTML =
      `<input class="perd-ref" type="text" placeholder="Producto (ej: Leche)" value="${referente || ''}">` +
      `<input class="perd-precio" type="number" min="0" step="1" placeholder="Precio" value="${precio || ''}">` +
      `<button type="button" class="perd-del btn-peligro" title="Quitar">✕</button>`;
    row.querySelector('.perd-del').addEventListener('click', () => row.remove());
    cont.appendChild(row);
  }

  async function guardarPerdida() {
    const msg = $('cfg-perdida-msg');
    const rows = [...document.querySelectorAll('#cfg-perdidas .perdida-fila')];
    const obj = {};
    for (const r of rows) {
      const ref = r.querySelector('.perd-ref').value.trim();
      if (!ref) continue;
      obj[slug(ref)] = { referente: ref, precio: numero(r.querySelector('.perd-precio').value) };
    }
    try {
      await window.fincaDB.set('finca/config/preciosPerdida', Object.keys(obj).length ? obj : null);
      msg.textContent = '✓ Precios guardados.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // ==========================================================================
  //  CANDADO
  // ==========================================================================
  function intentarEntrar(e) {
    e.preventDefault();
    const msg = $('cfg-clave-msg');
    if ($('cfg-clave-input').value === claveActual()) {
      desbloqueado = true;
      $('cfg-clave-input').value = '';
      msg.textContent = '';
      mostrarPanel();
    } else {
      msg.textContent = 'Clave incorrecta.'; msg.className = 'msg err';
    }
  }

  function bloquear() {
    desbloqueado = false;
    mostrarPanel();
  }

  function mostrarPanel() {
    $('cfg-candado').classList.toggle('oculto', desbloqueado);
    $('cfg-panel').classList.toggle('oculto', !desbloqueado);
    if (desbloqueado) {
      pintarEstado();
      pintarEstadoAportes();
      pintarEstadoLimpiar();
      renderCompradores();
      renderPerdidas();
      renderVacas();
      renderProductos();
      renderJornadas();
      renderTipos();
      renderUsuarios();
      mostrarTab('ediciones');
    }
  }

  // ==========================================================================
  //  INTERRUPTOR DE EDICIONES
  // ==========================================================================
  function pintarEstado() {
    const activo = !(cfg && cfg.edicionesActivas === false); // default true
    const badge = $('cfg-estado-edic');
    const btn = $('cfg-toggle-edic');
    if (!badge || !btn) return;
    badge.textContent = activo ? 'Activadas' : 'Desactivadas';
    badge.className = 'badge ' + (activo ? 'badge-ok' : 'badge-off');
    btn.textContent = activo ? 'Desactivar ediciones' : 'Activar ediciones';
    btn.className = activo ? 'btn-peligro' : 'btn-acento';
  }

  async function alternarEdiciones() {
    const activoAhora = !(cfg && cfg.edicionesActivas === false);
    const btn = $('cfg-toggle-edic');
    btn.disabled = true;
    try {
      await window.fincaDB.setEdiciones(!activoAhora);
      // El cambio llega por la suscripcion (escucharConfig) y repinta solo.
    } catch (err) {
      alert('No se pudo cambiar: ' + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  }

  // -- Interruptor PROPIO de edición de Registros (Inventario + Aportes) -----
  function pintarEstadoAportes() {
    const activo = !(cfg && cfg.edicionRegistros === false); // default true
    const badge = $('cfg-estado-aportes');
    const btn = $('cfg-toggle-aportes');
    if (!badge || !btn) return;
    badge.textContent = activo ? 'Activada' : 'Desactivada';
    badge.className = 'badge ' + (activo ? 'badge-ok' : 'badge-off');
    btn.textContent = activo ? 'Desactivar edición de registros' : 'Activar edición de registros';
    btn.className = activo ? 'btn-peligro' : 'btn-acento';
  }

  async function alternarEdicionAportes() {
    const activoAhora = !(cfg && cfg.edicionRegistros === false);
    const btn = $('cfg-toggle-aportes');
    btn.disabled = true;
    try {
      await window.fincaDB.set('finca/config/edicionRegistros', !activoAhora);
    } catch (err) {
      alert('No se pudo cambiar: ' + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  }

  // -- Interruptor para permitir LIMPIAR el historial de facturas -----------
  function pintarEstadoLimpiar() {
    const activo = !!(cfg && cfg.limpiarFacturas === true); // default false
    const badge = $('cfg-estado-limpfact');
    const btn = $('cfg-toggle-limpfact');
    if (!badge || !btn) return;
    badge.textContent = activo ? 'Activada' : 'Desactivada';
    badge.className = 'badge ' + (activo ? 'badge-ok' : 'badge-off');
    btn.textContent = activo ? 'Desactivar limpiar historial' : 'Activar limpiar historial';
    btn.className = activo ? 'btn-peligro' : 'btn-acento';
  }

  async function alternarLimpiarFacturas() {
    const activoAhora = !!(cfg && cfg.limpiarFacturas === true);
    const btn = $('cfg-toggle-limpfact');
    btn.disabled = true;
    try {
      await window.fincaDB.set('finca/config/limpiarFacturas', !activoAhora);
    } catch (err) {
      alert('No se pudo cambiar: ' + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  }

  // ==========================================================================
  //  CAMBIAR CLAVE
  // ==========================================================================
  async function guardarClave() {
    const msg = $('cfg-clave2-msg');
    const nueva = $('cfg-nueva-clave').value.trim();
    if (nueva.length < 3) { msg.textContent = 'La clave debe tener al menos 3 caracteres.'; msg.className = 'msg err'; return; }
    try {
      await window.fincaDB.setClaveConfig(nueva);
      $('cfg-nueva-clave').value = '';
      msg.textContent = '✓ Clave actualizada.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  // ==========================================================================
  //  ARRANQUE
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    construir();
    window.fincaOnLogin(() => {
      window.fincaDB.escucharConfig((datos) => {
        cfg = datos || {};
        if (desbloqueado) { pintarEstado(); pintarEstadoAportes(); pintarEstadoLimpiar(); }
      });
    });
    // Al cerrar sesion, volver a bloquear la configuracion.
    window.fincaOnLogout(() => { desbloqueado = false; mostrarPanel(); });
  });
})();
