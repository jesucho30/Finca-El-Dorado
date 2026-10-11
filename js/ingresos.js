/* ============================================================================
 *  Modulo INGRESOS - Finca El Dorado (en Configuración → pestaña Ingresos)
 *  La leche (Despachado) suma automatica; ademas se registran a mano otras
 *  formas de ingreso: donaciones, ventas, etc. (mismos campos que Egresos).
 *  Crear se bloquea solo a usuarios "solo ver"; editar/borrar segun permiso.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const puede = () => !window.fincaPuedeEditar || window.fincaPuedeEditar();
  const puedeCrear = () => !window.fincaPuedeCrear || window.fincaPuedeCrear();
  const hoyISO = () => { const d = new Date(); const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const fmtPesos = (n) => {
    n = Math.round(num(n)); const s = Math.abs(n).toString(); let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };
  const slug = (s) => { const b = (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); return b || ('x' + (s || '').length); };

  const TIPOS = [
    { v: 'donacion', t: 'Donación', e: '🎁' },
    { v: 'venta',    t: 'Venta',    e: '🏷️' },
    { v: 'otro',     t: 'Otro',     e: '➕' }
  ];
  const tipoT = (v) => { const t = TIPOS.find(x => x.v === v); return t ? t.t : v; };
  const tipoE = (v) => { const t = TIPOS.find(x => x.v === v); return t ? t.e : '➕'; };

  let ventas = {};      // leche (ingreso automatico)
  let ingresos = {};    // ingresos manuales (donaciones, etc.)
  let catalogo = {};    // finca/catalogoIngresos { slug:{tipo,nombre} }
  let editId = null;

  function lecheTotal() { let t = 0; Object.keys(ventas).forEach(id => { const r = ventas[id]; t += num(r.venta) * num(r.precio); }); return t; }
  function lechePorComprador() {
    const c = {};
    Object.keys(ventas).forEach(id => { const r = ventas[id]; const m = num(r.venta) * num(r.precio); if (r.comprador && m > 0) c[r.comprador] = (c[r.comprador] || 0) + m; });
    return c;
  }
  function manualTotal() { let t = 0; Object.keys(ingresos).forEach(id => { t += num(ingresos[id].valor); }); return t; }

  // ==========================================================================
  //  MODAL (se crea una vez en el body)
  // ==========================================================================
  function construirModal() {
    if ($('in-modal')) return;
    const opcionesTipo = TIPOS.map(t => `<option value="${t.v}">${t.t}</option>`).join('');
    const div = document.createElement('div');
    div.id = 'in-modal'; div.className = 'modal oculto';
    div.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3 id="in-modal-titulo">Nuevo ingreso</h3>
          <button id="in-cerrar" class="btn-icono" title="Cerrar">✕</button>
        </div>
        <form id="in-form">
          <div class="fila-dos">
            <label class="campo"><span>Tipo de ingreso</span><select id="in-tipo">${opcionesTipo}</select></label>
            <label class="campo"><span>Valor ($)</span><input type="number" id="in-valor" min="0" step="1" inputmode="numeric" placeholder="0"></label>
          </div>
          <label class="campo">
            <span>Concepto <em>(donante, qué se vendió...)</em></span>
            <input type="text" id="in-concepto" list="in-cat" placeholder="Ej: Donación de Don José, Venta de novillo...">
            <datalist id="in-cat"></datalist>
          </label>
          <label class="campo"><span>Fecha</span><input type="date" id="in-fecha"></label>
          <label class="campo"><span>Detalle (opcional)</span><input type="text" id="in-detalle" placeholder="Observaciones..."></label>
          <p id="in-msg" class="msg"></p>
          <div class="modal-acciones">
            <button type="button" id="in-eliminar" class="btn-peligro oculto">Eliminar</button>
            <span style="flex:1"></span>
            <button type="button" id="in-cancelar" class="btn-plano">Cancelar</button>
            <button type="submit" class="btn-acento">Guardar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(div);
    $('in-cerrar').addEventListener('click', cerrar);
    $('in-cancelar').addEventListener('click', cerrar);
    $('in-modal').addEventListener('click', (e) => { if (e.target.id === 'in-modal') cerrar(); });
    $('in-form').addEventListener('submit', guardar);
    $('in-eliminar').addEventListener('click', eliminarModal);
    $('in-tipo').addEventListener('change', refrescarCatalogo);
  }

  function refrescarCatalogo() {
    const dl = $('in-cat');
    if (!dl) return;
    const tipo = $('in-tipo').value;
    const nombres = Object.keys(catalogo).map(k => catalogo[k]).filter(c => c && c.nombre && c.tipo === tipo).map(c => c.nombre).sort();
    dl.innerHTML = nombres.map(n => `<option value="${n}"></option>`).join('');
  }

  function abrir(id) {
    if (id && !puede()) { alert('Las ediciones están desactivadas (o tu usuario no puede editar).'); return; }
    if (!id && !puedeCrear()) { alert('Tu usuario es de solo lectura.'); return; }
    construirModal();
    editId = id;
    const r = id ? ingresos[id] : null;
    $('in-modal-titulo').textContent = id ? 'Editar ingreso' : 'Nuevo ingreso';
    $('in-eliminar').classList.toggle('oculto', !id);
    $('in-msg').textContent = '';
    $('in-tipo').value     = r && r.tipo ? r.tipo : 'donacion';
    $('in-valor').value    = r && r.valor ? r.valor : '';
    $('in-concepto').value = r && r.concepto ? r.concepto : '';
    $('in-detalle').value  = r && r.detalle ? r.detalle : '';
    $('in-fecha').value    = r && r.fecha ? r.fecha : hoyISO();
    refrescarCatalogo();
    $('in-modal').classList.remove('oculto');
  }

  function cerrar() { const m = $('in-modal'); if (m) m.classList.add('oculto'); editId = null; }

  async function guardar(e) {
    e.preventDefault();
    const msg = $('in-msg');
    if (editId && !puede()) { msg.textContent = 'Editar está desactivado (o tu usuario no puede editar).'; msg.className = 'msg err'; return; }
    if (!editId && !puedeCrear()) { msg.textContent = 'Tu usuario es de solo lectura.'; msg.className = 'msg err'; return; }
    const concepto = $('in-concepto').value.trim();
    const valor = num($('in-valor').value);
    if (!concepto) { msg.textContent = 'Escribe el concepto del ingreso.'; msg.className = 'msg err'; return; }
    if (valor <= 0) { msg.textContent = 'Pon un valor mayor que cero.'; msg.className = 'msg err'; return; }
    const tipo = $('in-tipo').value;
    const reg = { tipo: tipo, concepto: concepto, valor: Math.round(valor), detalle: $('in-detalle').value.trim(), fecha: $('in-fecha').value || hoyISO(), por: (window.fincaAuth.currentUser() || {}).email || '' };
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (editId) await window.fincaDB.editarIngreso(editId, reg);
      else        await window.fincaDB.agregarIngreso(reg);
      const key = slug(tipo + '-' + concepto);
      if (!catalogo[key]) { try { await window.fincaDB.guardarCatIngreso(key, { tipo: tipo, nombre: concepto }); } catch (x) {} }
      cerrar();
    } catch (err) { msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err'; }
    finally { if (btn) btn.disabled = false; }
  }

  async function eliminarModal() {
    if (!editId || !puede()) return;
    if (!confirm('¿Eliminar este ingreso?')) return;
    try { await window.fincaDB.eliminarIngreso(editId); cerrar(); }
    catch (err) { alert('No se pudo eliminar: ' + (err.message || err)); }
  }

  async function borrar(id) {
    if (!puede()) { alert('Borrar está desactivado (o tu usuario no puede borrar).'); return; }
    const r = ingresos[id] || {};
    if (!confirm('¿Borrar "' + (r.concepto || '') + '"?')) return;
    try { await window.fincaDB.eliminarIngreso(id); }
    catch (err) { alert('No se pudo borrar: ' + (err.message || err)); }
  }

  // ==========================================================================
  //  RENDER en #cfg-ingresos
  // ==========================================================================
  function render() {
    const cont = $('cfg-ingresos');
    if (!cont) return;
    const leche = lecheTotal();
    const manual = manualTotal();
    const cuentas = lechePorComprador();
    const filasLeche = Object.keys(cuentas).sort().map(c => `<tr><td>🥛 ${c} (leche)</td><td class="num">${fmtPesos(cuentas[c])}</td></tr>`).join('');

    const ids = Object.keys(ingresos).sort((a, b) => (ingresos[b].fecha || '').localeCompare(ingresos[a].fecha || ''));
    const filasMan = ids.map((id, i) => {
      const r = ingresos[id];
      return `<tr>
        <td class="num">${i + 1}</td><td>${fmtFecha(r.fecha)}</td><td>${tipoE(r.tipo)} ${tipoT(r.tipo)}</td>
        <td>${r.concepto || ''}</td><td class="num">${fmtPesos(r.valor)}</td><td>${r.detalle || '—'}</td>
        <td class="acciones"><button class="btn-editar" data-id="${id}">Editar</button><button class="btn-borrar" data-id="${id}">Borrar</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="vacia-fila">Sin ingresos registrados aún</td></tr>';

    cont.innerHTML = `
      <section class="bloque">
        <h3>Ingresos</h3>
        <p class="modulo-sub">La leche suma sola (desde Despachado). Aquí registras donaciones, ventas y otras formas de ingreso.</p>
        <div class="panel-fila" style="gap:18px;flex-wrap:wrap">
          <div><span class="modulo-sub">🥛 Leche</span><br><strong>${fmtPesos(leche)}</strong></div>
          <div><span class="modulo-sub">🎁 Otros ingresos</span><br><strong>${fmtPesos(manual)}</strong></div>
          <div><span class="modulo-sub">Total ingresos</span><br><strong style="color:var(--acento-2);font-size:1.2rem">${fmtPesos(leche + manual)}</strong></div>
        </div>
        ${filasLeche ? `<div class="tabla-wrap" style="margin-top:12px"><table class="tabla"><thead><tr><th>Concepto</th><th class="num">Recibido</th></tr></thead><tbody>${filasLeche}</tbody></table></div>` : ''}
      </section>

      <section class="bloque">
        <div class="bloque-head">
          <h3>Otros ingresos (donaciones, ventas...)</h3>
          <button id="in-nuevo" class="btn-acento" type="button">+ Nuevo ingreso</button>
        </div>
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th class="num">#</th><th>Fecha</th><th>Tipo</th><th>Concepto</th><th class="num">Valor</th><th>Detalle</th><th></th></tr></thead>
          <tbody>${filasMan}</tbody>
        </table></div>
      </section>`;

    $('in-nuevo').addEventListener('click', () => abrir(null));
    cont.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => abrir(b.dataset.id)));
    cont.querySelectorAll('.btn-borrar').forEach(b => b.addEventListener('click', () => borrar(b.dataset.id)));
    aplicarPermisos();
  }

  function aplicarPermisos() {
    const ok = puede(), okC = puedeCrear();
    const n = $('in-nuevo'); if (n) n.disabled = !okC;
    document.querySelectorAll('#cfg-ingresos .btn-editar, #cfg-ingresos .btn-borrar').forEach(x => { x.disabled = !ok; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    construirModal();
    render();
    window.addEventListener('finca-ediciones', aplicarPermisos);
    window.fincaOnLogin(() => {
      window.fincaDB.escucharVentas((d) => { ventas = d || {}; render(); });
      window.fincaDB.escucharIngresos((d) => { ingresos = d || {}; render(); });
      window.fincaDB.escucharCatIngresos((d) => { catalogo = d || {}; refrescarCatalogo(); });
    });
  });
})();
