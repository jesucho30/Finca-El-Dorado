/* ============================================================================
 *  Modulo REGISTROS - Finca El Dorado
 *  Inventario de los animales y cosas de la finca.
 *  - "+ Nuevo registro" SIEMPRE disponible (crear no se bloquea).
 *  - El interruptor de ediciones solo bloquea Editar y Borrar.
 *  - Tabla numerada (#).
 *  - Catalogo de productos: el nombre se elige de una lista (datalist) que se
 *    alimenta sola; al guardar un producto nuevo, queda en el catalogo y luego
 *    aparece como sugerencia al escribir la inicial.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TIPOS_DEFECTO = ['Animal', 'Cosa', 'Herramienta', 'Cultivo', 'Otro'];
  const EMOJI = { Animal: '🐄', Cosa: '📦', Herramienta: '🔧', Cultivo: '🌱', Otro: '📌' };
  // Tipos configurables (finca/config/tiposRegistro); por defecto los de arriba.
  function getTipos() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    return (cfg && Array.isArray(cfg.tiposRegistro) && cfg.tiposRegistro.length) ? cfg.tiposRegistro : TIPOS_DEFECTO;
  }

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const hoyISO = () => { const d = new Date(); const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  // Editar/borrar registros: interruptor PROPIO de Registros (no el global).
  const puede = () => !window.fincaPuedeEditarRegistros || window.fincaPuedeEditarRegistros();
  const puedeCrear = () => !window.fincaPuedeCrear || window.fincaPuedeCrear();
  const slug = (s) => {
    const b = (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return b || ('x' + (s || '').length);
  };

  let registros = {};
  let catalogo = {};   // { slug: {tipo, nombre} }
  let editId = null;
  let movFiltro = 'Entrada'; // sub-pestaña activa del inventario
  let fechaReg = '';         // filtro por fecha del inventario (vacío = sin filtro)

  function construir() {
    const cont = $('vista-registros');
    if (!cont) return;
    const opcionesTipo = getTipos().map(t => `<option value="${t}">${t}</option>`).join('');
    cont.innerHTML = `
      <div class="sub-tabs">
        <button type="button" data-rt="inventario" class="active">Inventario</button>
        <button type="button" data-rt="aportes">Aportes 🔒</button>
      </div>

      <!-- ===== PESTAÑA: INVENTARIO ===== -->
      <div id="reg-tab-inventario">
        <div class="modulo-head">
          <p class="modulo-sub">Inventario de la finca (animales, cosas, herramientas, cultivos...).</p>
          <button id="btn-nuevo-reg" class="btn-acento">+ Nuevo registro</button>
        </div>

        <div class="sub-tabs" id="inv-subtabs">
          <button type="button" data-mov="Entrada" class="active">🟢 Entradas</button>
          <button type="button" data-mov="Salida">🔴 Salidas</button>
        </div>

        <section class="bloque">
          <div class="bloque-head">
            <h3 id="inv-titulo">Entradas</h3>
            <div class="fecha-filtro">
              <input type="date" id="reg-fecha-filtro" class="fecha-sel" title="Filtrar por un día">
              <button id="reg-fecha-clear" class="fecha-sel-clear oculto" type="button" title="Quitar el filtro de fecha">✕</button>
            </div>
            <span style="flex:1"></span>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button id="reg-descargar" class="btn-plano" type="button">⬇ Descargar</button>
              <button id="reg-borrar-todo" class="btn-peligro" type="button">🗑️ Borrar todo</button>
            </div>
          </div>
          <div id="reg-fecha-resumen" class="fecha-resumen oculto"></div>
          <input type="search" id="reg-buscar" class="buscar" placeholder="🔎 Buscar por fecha, tipo, nombre, cantidad o detalle...">
          <div id="reg-total-filtrado" class="total-filtrado oculto"></div>
          <div class="tabla-wrap">
            <table class="tabla">
              <thead>
                <tr><th class="num">#</th><th>Tipo</th><th>Nombre</th><th class="num">Cantidad</th><th>Detalle</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody id="reg-lista"></tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ===== PESTAÑA: APORTES (la arma aportes.js) ===== -->
      <div id="reg-tab-aportes" class="oculto"></div>

      <div id="reg-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head">
            <h3 id="reg-modal-titulo">Nuevo registro</h3>
            <button id="reg-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <form id="form-reg">
            <div class="fila-dos">
              <label class="campo">
                <span>Movimiento</span>
                <select id="rg-movimiento"><option value="Entrada">Entrada (llega)</option><option value="Salida">Salida (sale)</option></select>
              </label>
              <label class="campo">
                <span>Tipo</span>
                <select id="rg-tipo">${opcionesTipo}</select>
              </label>
            </div>
            <div class="fila-dos">
              <label class="campo">
                <span>Cantidad</span>
                <input type="number" id="rg-cantidad" min="0" step="1" inputmode="numeric" placeholder="1">
              </label>
              <label class="campo">
                <span>Fecha</span>
                <input type="date" id="rg-fecha">
              </label>
            </div>
            <label class="campo">
              <span>Producto / Nombre <em>(elígelo o escribe uno nuevo)</em></span>
              <input type="text" id="rg-nombre" list="rg-catalogo" placeholder="Ej: Pala, Vaca Lucera...">
              <datalist id="rg-catalogo"></datalist>
            </label>
            <label class="campo">
              <span>Detalle (opcional)</span>
              <input type="text" id="rg-detalle" placeholder="Estado, color, observaciones...">
            </label>
            <p id="rg-msg" class="msg"></p>
            <div class="modal-acciones">
              <button type="button" id="rg-eliminar" class="btn-peligro oculto">Eliminar</button>
              <span style="flex:1"></span>
              <button type="button" id="rg-cancelar" class="btn-plano">Cancelar</button>
              <button type="submit" class="btn-acento">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    enlazar();
  }

  function enlazar() {
    $('btn-nuevo-reg').addEventListener('click', () => abrir(null));
    $('reg-cerrar').addEventListener('click', cerrar);
    $('rg-cancelar').addEventListener('click', cerrar);
    $('reg-modal').addEventListener('click', (e) => { if (e.target.id === 'reg-modal') cerrar(); });
    $('form-reg').addEventListener('submit', guardar);
    $('rg-eliminar').addEventListener('click', eliminar);
    $('reg-descargar').addEventListener('click', descargar);
    $('reg-borrar-todo').addEventListener('click', borrarTodo);
    $('reg-buscar').addEventListener('input', pintar);
    $('reg-fecha-filtro').addEventListener('change', () => { fechaReg = $('reg-fecha-filtro').value; pintar(); });
    $('reg-fecha-clear').addEventListener('click', () => { fechaReg = ''; $('reg-fecha-filtro').value = ''; pintar(); });
    // Al cambiar el tipo, mostrar los productos del catalogo de ese tipo.
    $('rg-tipo').addEventListener('change', refrescarCatalogoLista);
    // Pestañas principales Inventario / Aportes.
    document.querySelectorAll('#vista-registros > .sub-tabs button').forEach(b => {
      b.addEventListener('click', () => mostrarTab(b.dataset.rt));
    });
    // Sub-pestañas Entradas / Salidas (dentro de Inventario).
    document.querySelectorAll('#inv-subtabs button').forEach(b => {
      b.addEventListener('click', () => {
        movFiltro = b.dataset.mov;
        document.querySelectorAll('#inv-subtabs button').forEach(x => x.classList.toggle('active', x === b));
        $('inv-titulo').textContent = movFiltro === 'Salida' ? 'Salidas' : 'Entradas';
        pintar();
      });
    });
  }

  function mostrarTab(rt) {
    document.querySelectorAll('#vista-registros .sub-tabs button').forEach(b => b.classList.toggle('active', b.dataset.rt === rt));
    $('reg-tab-inventario').classList.toggle('oculto', rt !== 'inventario');
    $('reg-tab-aportes').classList.toggle('oculto', rt !== 'aportes');
    // Avisar a aportes.js que se abrió su pestaña (para bloquear con clave).
    if (rt === 'aportes') window.dispatchEvent(new CustomEvent('finca-abrir-aportes'));
  }

  // Borrar TODO el inventario (con DOS advertencias). Respeta permisos.
  async function borrarTodo() {
    if (!puede()) { alert('Borrar está desactivado (o tu usuario no puede borrar).'); return; }
    if (!confirm('⚠️ ADVERTENCIA 1 de 2:\n\nVas a borrar TODOS los registros del inventario (animales, cosas, herramientas...).\n\n¿Seguro que quieres continuar?')) return;
    if (!confirm('⚠️ ADVERTENCIA 2 de 2:\n\nEsto NO se puede deshacer y se borrará TODO el inventario.\n\n¿De verdad lo borras todo?')) return;
    try {
      await window.fincaDB.set('finca/registros', null);
      await window.fincaDB.set('finca/catalogo', null);
    } catch (err) { alert('No se pudo borrar: ' + (err.message || err)); }
  }

  // Reconstruye el dropdown de Tipo cuando cambia la Configuracion.
  function reconstruirTipos() {
    const sel = $('rg-tipo');
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = getTipos().map(t => `<option value="${t}">${t}</option>`).join('');
    if (getTipos().indexOf(actual) !== -1) sel.value = actual;
  }

  // Llena el datalist con los productos del catalogo del tipo elegido.
  function refrescarCatalogoLista() {
    const dl = $('rg-catalogo');
    if (!dl) return;
    const tipo = $('rg-tipo').value;
    const nombres = Object.keys(catalogo)
      .map(k => catalogo[k])
      .filter(c => c && c.nombre && (!tipo || c.tipo === tipo))
      .map(c => c.nombre)
      .sort();
    dl.innerHTML = nombres.map(n => `<option value="${n}"></option>`).join('');
  }

  function abrir(id) {
    if (id && !puede()) { alert('Las ediciones están desactivadas (o tu usuario no puede editar).'); return; }
    if (!id && !puedeCrear()) { alert('Tu usuario es de solo lectura.'); return; }
    editId = id;
    const r = id ? registros[id] : null;
    $('reg-modal-titulo').textContent = id ? 'Editar registro' : 'Nuevo registro';
    $('rg-eliminar').classList.toggle('oculto', !id);
    $('rg-msg').textContent = '';
    $('rg-movimiento').value = r && r.movimiento ? r.movimiento : movFiltro;
    $('rg-tipo').value     = r && r.tipo ? r.tipo : (getTipos()[0] || 'Animal');
    $('rg-cantidad').value = r ? r.cantidad : '1';
    $('rg-nombre').value   = r && r.nombre ? r.nombre : '';
    $('rg-detalle').value  = r && r.detalle ? r.detalle : '';
    $('rg-fecha').value    = r && r.fecha ? r.fecha : hoyISO();
    refrescarCatalogoLista();
    $('reg-modal').classList.remove('oculto');
  }

  function cerrar() { $('reg-modal').classList.add('oculto'); editId = null; }

  async function guardar(e) {
    e.preventDefault();
    const msg = $('rg-msg');
    if (editId && !puede()) { msg.textContent = 'Editar está desactivado (o tu usuario no puede editar).'; msg.className = 'msg err'; return; }
    if (!editId && !puedeCrear()) { msg.textContent = 'Tu usuario es de solo lectura.'; msg.className = 'msg err'; return; }
    const nombre = $('rg-nombre').value.trim();
    if (!nombre) { msg.textContent = 'Escribe o elige un producto.'; msg.className = 'msg err'; return; }
    const tipo = $('rg-tipo').value;
    const reg = {
      movimiento: $('rg-movimiento').value,
      tipo: tipo,
      cantidad: num($('rg-cantidad').value),
      nombre: nombre,
      detalle: $('rg-detalle').value.trim(),
      fecha: $('rg-fecha').value || hoyISO(),
      por: (window.fincaAuth.currentUser() || {}).email || ''
    };
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (editId) await window.fincaDB.editarRegistro(editId, reg);
      else        await window.fincaDB.agregarRegistro(reg);
      await guardarEnCatalogo(tipo, nombre);
      cerrar();
    } catch (err) { msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err'; }
    finally { if (btn) btn.disabled = false; }
  }

  // Mete el producto al catalogo (una sola vez) para futuras sugerencias.
  async function guardarEnCatalogo(tipo, nombre) {
    const key = slug(tipo + '-' + nombre);
    if (catalogo[key]) return; // ya existe
    try { await window.fincaDB.guardarCatalogoItem(key, { tipo: tipo, nombre: nombre }); } catch (e) {}
  }

  async function eliminar() {
    if (!editId) return;
    if (!puede()) return;
    if (!confirm('¿Eliminar este registro?')) return;
    try { await window.fincaDB.eliminarRegistro(editId); cerrar(); }
    catch (err) { alert('No se pudo eliminar: ' + (err.message || err)); }
  }

  async function borrar(id) {
    if (!puede()) { alert('Borrar está desactivado en Configuración.'); return; }
    const r = registros[id] || {};
    if (!confirm('¿Borrar "' + (r.nombre || '') + '"? No se puede deshacer.')) return;
    try { await window.fincaDB.eliminarRegistro(id); }
    catch (err) { alert('No se pudo borrar: ' + (err.message || err)); }
  }

  function pintar() {
    const tb = $('reg-lista');
    if (!tb) return;
    // Solo los registros de la sub-pestaña activa (Entrada o Salida).
    const esMov = (r) => (r.movimiento === 'Salida' ? 'Salida' : 'Entrada') === movFiltro;
    const q = ($('reg-buscar') ? $('reg-buscar').value : '').trim().toLowerCase();
    const coincide = (r) => {
      if (!q) return true;
      const hay = [fmtFecha(r.fecha), r.fecha, r.tipo, r.nombre, r.cantidad, r.detalle]
        .map(x => (x == null ? '' : String(x)).toLowerCase()).join(' ');
      return hay.indexOf(q) !== -1;
    };
    // Filtro por fecha (selector junto al título) + su resumen del día.
    const porFecha = (r) => !fechaReg || (r.fecha || '') === fechaReg;
    const fr = $('reg-fecha-resumen');
    const clr = $('reg-fecha-clear');
    if (fechaReg) {
      if (fr) {
        const idsF = Object.keys(registros).filter(id => esMov(registros[id]) && (registros[id].fecha || '') === fechaReg);
        const suma = idsF.reduce((a, id) => a + num(registros[id].cantidad), 0);
        const etiqueta = movFiltro === 'Salida' ? 'salidas' : 'entradas';
        fr.innerHTML = '<span class="fr-item fr-total"><b>' + fmtFecha(fechaReg) + ':</b> ' + suma + ' de cantidad &nbsp;(' + idsF.length + ' ' + etiqueta + ')</span>';
        fr.classList.remove('oculto');
      }
      if (clr) clr.classList.remove('oculto');
    } else {
      if (fr) fr.classList.add('oculto');
      if (clr) clr.classList.add('oculto');
    }

    const ids = Object.keys(registros).filter(id => esMov(registros[id]) && porFecha(registros[id]) && coincide(registros[id]));
    const tf = $('reg-total-filtrado');
    if (tf) {
      if (q) {
        const suma = ids.reduce((a, id) => a + num(registros[id].cantidad), 0);
        tf.innerHTML = 'Total filtrado: <strong>' + suma + '</strong> de cantidad &nbsp;(' + ids.length + ' registros)';
        tf.classList.remove('oculto');
      } else { tf.classList.add('oculto'); }
    }
    if (!ids.length) { tb.innerHTML = '<tr><td colspan="7" class="vacia-fila">' + (q ? 'Sin resultados para "' + q + '"' : (fechaReg ? 'Sin ' + (movFiltro === 'Salida' ? 'salidas' : 'entradas') + ' el ' + fmtFecha(fechaReg) : 'Sin ' + (movFiltro === 'Salida' ? 'salidas' : 'entradas') + ' aún')) + '</td></tr>'; return; }
    ids.sort((a, b) => {
      const ra = registros[a], rb = registros[b];
      if ((ra.tipo || '') !== (rb.tipo || '')) return (ra.tipo || '').localeCompare(rb.tipo || '');
      return (ra.nombre || '').localeCompare(rb.nombre || '');
    });
    tb.innerHTML = ids.map((id, i) => {
      const r = registros[id];
      const e = EMOJI[r.tipo] || '📌';
      return `<tr>
        <td class="num">${i + 1}</td>
        <td>${e} ${r.tipo || ''}</td>
        <td>${r.nombre || ''}</td>
        <td class="num">${r.cantidad != null ? r.cantidad : ''}</td>
        <td>${r.detalle || '—'}</td>
        <td>${fmtFecha(r.fecha)}</td>
        <td class="acciones">
          <button class="btn-editar" data-id="${id}">Editar</button>
          <button class="btn-borrar" data-id="${id}">Borrar</button>
        </td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => abrir(b.dataset.id)));
    tb.querySelectorAll('.btn-borrar').forEach(b => b.addEventListener('click', () => borrar(b.dataset.id)));
    aplicarPermisos();
  }

  function aplicarPermisos() {
    const ok = puede();
    const b = $('btn-nuevo-reg');
    if (b) b.disabled = !puedeCrear();
    document.querySelectorAll('#vista-registros .btn-editar, #vista-registros .btn-borrar').forEach(x => { x.disabled = !ok; });
  }

  function descargar() {
    const ids = Object.keys(registros);
    if (!ids.length) { alert('No hay registros para descargar.'); return; }
    const sep = ';';
    const esc = (v) => { v = (v == null ? '' : String(v)); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const cab = ['#', 'Movimiento', 'Tipo', 'Nombre', 'Cantidad', 'Detalle', 'Fecha'];
    const filas = ids.map((id, i) => { const r = registros[id]; return [i + 1, r.movimiento || 'Entrada', r.tipo || '', r.nombre || '', r.cantidad != null ? r.cantidad : '', r.detalle || '', r.fecha || ''].map(esc).join(sep); });
    const csv = String.fromCharCode(0xFEFF) + [cab.join(sep)].concat(filas).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'registros-el-dorado.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    pintar();
    window.addEventListener('finca-ediciones', aplicarPermisos);
    window.addEventListener('finca-config', () => { reconstruirTipos(); refrescarCatalogoLista(); });
    window.fincaOnLogin(() => {
      window.fincaDB.escucharRegistros((datos) => { registros = datos || {}; pintar(); });
      window.fincaDB.escucharCatalogo((datos) => { catalogo = datos || {}; refrescarCatalogoLista(); });
    });
  });
})();
