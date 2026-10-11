/* ============================================================================
 *  Modulos COMPRAS y PAGOS - Finca El Dorado
 *  Mismos campos, distinto texto. Ambos se decantan en EGRESOS.
 *   - Compras: cosas que se compran (medicinas, insumos...). Concepto = cosa.
 *   - Pagos: pagos a los trabajadores. Concepto = nombre de persona.
 *  El resumen total se ve en Configuración → pestaña Egresos.
 *  Crear SIEMPRE se permite; el interruptor solo bloquea Editar/Borrar.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const redond = (n) => Math.round(n * 100) / 100;
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

  // Configuracion de cada modulo (texto distinto, mismos campos).
  const MODS = {
    compra: {
      pre: 'cmp', vista: 'vista-compras',
      intro: '🛒 <b>Compras:</b> aquí registras lo que <b>compras</b> para la finca — medicinas para los animales, concentrado, insumos y demás cosas.',
      boton: '+ Nueva compra', tituloModal: 'compra', tituloTabla: 'Compras',
      colConcepto: 'Concepto', conceptoLabel: 'Concepto <em>(¿qué compraste?)</em>', conceptoPh: 'Ej: Medicina vacas, Concentrado, Estacones...'
    },
    pago: {
      pre: 'pg', vista: 'vista-pagos',
      intro: '💳 <b>Pagos:</b> aquí registras los <b>pagos a los trabajadores</b> — sueldos, abonos, jornales. Solo pagos de personal.',
      boton: '+ Nuevo pago', tituloModal: 'pago', tituloTabla: 'Pagos',
      colConcepto: 'Persona', conceptoLabel: 'Nombre <em>(¿a quién le pagas?)</em>', conceptoPh: 'Ej: Javier, Pedro...'
    }
  };

  let egresos = {};    // finca/egresos { id: {clase, concepto, valor, fecha, detalle} }
  let catalogo = {};   // finca/catalogoEgresos { slug: {clase, nombre} }
  const editId = { compra: null, pago: null };
  const fechaSel = { compra: '', pago: '' }; // filtro por fecha de cada tabla

  // ==========================================================================
  //  CONSTRUIR UN MODULO (compra o pago)
  // ==========================================================================
  function construir(clase) {
    const m = MODS[clase];
    const cont = $(m.vista);
    if (!cont) return;
    const p = m.pre;
    cont.innerHTML = `
      <div class="intro-box">${m.intro}</div>
      <div class="modulo-head">
        <span style="flex:1"></span>
        <button id="${p}-nuevo" class="btn-acento">${m.boton}</button>
      </div>

      <section class="bloque">
        <div class="bloque-head">
          <h3>${m.tituloTabla}</h3>
          <div class="fecha-filtro">
            <input type="date" id="${p}-fecha-filtro" class="fecha-sel" title="Filtrar por un día">
            <button id="${p}-fecha-clear" class="fecha-sel-clear oculto" type="button" title="Quitar el filtro de fecha">✕</button>
          </div>
          <span style="flex:1"></span>
          <button id="${p}-descargar" class="btn-plano" type="button">⬇ Descargar</button>
        </div>
        <div id="${p}-fecha-resumen" class="fecha-resumen oculto"></div>
        <input type="search" id="${p}-buscar" class="buscar" placeholder="🔎 Buscar por fecha, concepto, valor o detalle...">
        <div id="${p}-total-filtrado" class="total-filtrado oculto"></div>
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th class="num">#</th><th>Fecha</th><th>${m.colConcepto}</th><th class="num">Valor</th><th>Detalle</th><th></th></tr></thead>
            <tbody id="${p}-lista"></tbody>
          </table>
        </div>
      </section>

      <div id="${p}-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head">
            <h3 id="${p}-modal-titulo">Nuevo ${m.tituloModal}</h3>
            <button id="${p}-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <form id="${p}-form">
            <label class="campo">
              <span>${m.conceptoLabel}</span>
              <input type="text" id="${p}-concepto" list="${p}-cat" placeholder="${m.conceptoPh}">
              <datalist id="${p}-cat"></datalist>
            </label>
            <div class="fila-dos">
              <label class="campo">
                <span>Valor ($)</span>
                <input type="number" id="${p}-valor" min="0" step="1" inputmode="numeric" placeholder="0">
              </label>
              <label class="campo">
                <span>Fecha</span>
                <input type="date" id="${p}-fecha">
              </label>
            </div>
            <label class="campo">
              <span>Detalle (opcional)</span>
              <input type="text" id="${p}-detalle" placeholder="Observaciones...">
            </label>
            <p id="${p}-msg" class="msg"></p>
            <div class="modal-acciones">
              <button type="button" id="${p}-eliminar" class="btn-peligro oculto">Eliminar</button>
              <span style="flex:1"></span>
              <button type="button" id="${p}-cancelar" class="btn-plano">Cancelar</button>
              <button type="submit" class="btn-acento">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    enlazar(clase);
    // Sacar el modal al body para que se pueda abrir incluso desde la
    // pestaña Egresos de Configuración (donde el módulo está oculto).
    const modal = $(m.pre + '-modal');
    if (modal) document.body.appendChild(modal);
  }

  function enlazar(clase) {
    const p = MODS[clase].pre;
    $(p + '-nuevo').addEventListener('click', () => abrir(clase, null));
    $(p + '-cerrar').addEventListener('click', () => cerrar(clase));
    $(p + '-cancelar').addEventListener('click', () => cerrar(clase));
    $(p + '-modal').addEventListener('click', (e) => { if (e.target.id === p + '-modal') cerrar(clase); });
    $(p + '-form').addEventListener('submit', (e) => guardar(clase, e));
    $(p + '-eliminar').addEventListener('click', () => eliminarDesdeModal(clase));
    $(p + '-descargar').addEventListener('click', () => descargar(clase));
    $(p + '-buscar').addEventListener('input', () => pintarTabla(clase));
    $(p + '-fecha-filtro').addEventListener('change', () => { fechaSel[clase] = $(p + '-fecha-filtro').value; pintarTabla(clase); });
    $(p + '-fecha-clear').addEventListener('click', () => { fechaSel[clase] = ''; $(p + '-fecha-filtro').value = ''; pintarTabla(clase); });
  }

  function refrescarCatalogo(clase) {
    const p = MODS[clase].pre;
    const dl = $(p + '-cat');
    if (!dl) return;
    const nombres = Object.keys(catalogo).map(k => catalogo[k])
      .filter(c => c && c.nombre && c.clase === clase).map(c => c.nombre).sort();
    dl.innerHTML = nombres.map(n => `<option value="${n}"></option>`).join('');
  }

  // ==========================================================================
  //  MODAL
  // ==========================================================================
  function abrir(clase, id) {
    if (id && !puede()) { alert('Las ediciones están desactivadas (o tu usuario no puede editar).'); return; }
    if (!id && !puedeCrear()) { alert('Tu usuario es de solo lectura.'); return; }
    const m = MODS[clase], p = m.pre;
    editId[clase] = id;
    const r = id ? egresos[id] : null;
    $(p + '-modal-titulo').textContent = (id ? 'Editar ' : 'Nuevo ') + m.tituloModal;
    $(p + '-eliminar').classList.toggle('oculto', !id);
    $(p + '-msg').textContent = '';
    $(p + '-concepto').value = r && r.concepto ? r.concepto : '';
    $(p + '-valor').value    = r && r.valor ? r.valor : '';
    $(p + '-detalle').value  = r && r.detalle ? r.detalle : '';
    $(p + '-fecha').value    = r && r.fecha ? r.fecha : hoyISO();
    refrescarCatalogo(clase);
    $(p + '-modal').classList.remove('oculto');
  }

  function cerrar(clase) { const p = MODS[clase].pre; $(p + '-modal').classList.add('oculto'); editId[clase] = null; }

  async function guardar(clase, e) {
    e.preventDefault();
    const p = MODS[clase].pre, msg = $(p + '-msg');
    if (editId[clase] && !puede()) { msg.textContent = 'Editar está desactivado (o tu usuario no puede editar).'; msg.className = 'msg err'; return; }
    if (!editId[clase] && !puedeCrear()) { msg.textContent = 'Tu usuario es de solo lectura.'; msg.className = 'msg err'; return; }
    const concepto = $(p + '-concepto').value.trim();
    const valor = num($(p + '-valor').value);
    if (!concepto) { msg.textContent = (clase === 'pago' ? 'Escribe a quién le pagas.' : 'Escribe qué compraste.'); msg.className = 'msg err'; return; }
    if (valor <= 0) { msg.textContent = 'Pon un valor mayor que cero.'; msg.className = 'msg err'; return; }
    const reg = {
      clase: clase, concepto: concepto, valor: redond(valor),
      detalle: $(p + '-detalle').value.trim(), fecha: $(p + '-fecha').value || hoyISO(),
      por: (window.fincaAuth.currentUser() || {}).email || ''
    };
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (editId[clase]) await window.fincaDB.editarEgreso(editId[clase], reg);
      else               await window.fincaDB.agregarEgreso(reg);
      const key = slug(clase + '-' + concepto);
      if (!catalogo[key]) { try { await window.fincaDB.guardarCatEgreso(key, { clase: clase, nombre: concepto }); } catch (x) {} }
      cerrar(clase);
    } catch (err) { msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err'; }
    finally { if (btn) btn.disabled = false; }
  }

  async function eliminarDesdeModal(clase) {
    const id = editId[clase];
    if (!id || !puede()) return;
    if (!confirm('¿Eliminar este registro?')) return;
    try { await window.fincaDB.eliminarEgreso(id); cerrar(clase); }
    catch (err) { alert('No se pudo eliminar: ' + (err.message || err)); }
  }

  async function borrar(clase, id) {
    if (!puede()) { alert('Borrar está desactivado en Configuración.'); return; }
    const r = egresos[id] || {};
    if (!confirm('¿Borrar "' + (r.concepto || '') + '"? No se puede deshacer.')) return;
    try { await window.fincaDB.eliminarEgreso(id); }
    catch (err) { alert('No se pudo borrar: ' + (err.message || err)); }
  }

  // ==========================================================================
  //  PINTAR
  // ==========================================================================
  function idsDe(clase) {
    return Object.keys(egresos).filter(id => egresos[id].clase === clase)
      .sort((a, b) => (egresos[b].fecha || '').localeCompare(egresos[a].fecha || ''));
  }

  function pintarTabla(clase) {
    const p = MODS[clase].pre, tb = $(p + '-lista');
    if (!tb) return;
    let ids = idsDe(clase);
    const q = ($(p + '-buscar') ? $(p + '-buscar').value : '').trim().toLowerCase();

    // Filtro por fecha (selector junto al título) + su resumen del día.
    const f = fechaSel[clase];
    const fr = $(p + '-fecha-resumen');
    const clr = $(p + '-fecha-clear');
    if (f) {
      ids = ids.filter(id => (egresos[id].fecha || '') === f);
      if (fr) {
        const idsF = idsDe(clase).filter(id => (egresos[id].fecha || '') === f);
        const suma = idsF.reduce((a, id) => a + num(egresos[id].valor), 0);
        const etiqueta = clase === 'pago' ? 'pagos' : 'compras';
        fr.innerHTML = '<span class="fr-item fr-total"><b>' + fmtFecha(f) + ':</b> ' + fmtPesos(suma) + ' &nbsp;(' + idsF.length + ' ' + etiqueta + ')</span>';
        fr.classList.remove('oculto');
      }
      if (clr) clr.classList.remove('oculto');
    } else {
      if (fr) fr.classList.add('oculto');
      if (clr) clr.classList.add('oculto');
    }

    if (q) ids = ids.filter(id => {
      const r = egresos[id];
      const hay = [fmtFecha(r.fecha), r.fecha, r.concepto, r.detalle, r.valor, fmtPesos(r.valor)]
        .map(x => (x == null ? '' : String(x)).toLowerCase()).join(' ');
      return hay.indexOf(q) !== -1;
    });
    const tf = $(p + '-total-filtrado');
    if (tf) {
      if (q) {
        const suma = ids.reduce((a, id) => a + num(egresos[id].valor), 0);
        tf.innerHTML = 'Total filtrado: <strong>' + fmtPesos(suma) + '</strong> &nbsp;(' + ids.length + ' registros)';
        tf.classList.remove('oculto');
      } else { tf.classList.add('oculto'); }
    }
    if (!ids.length) { tb.innerHTML = '<tr><td colspan="6" class="vacia-fila">' + (q ? 'Sin resultados para "' + q + '"' : (f ? 'Sin registros el ' + fmtFecha(f) : 'Sin registros aún')) + '</td></tr>'; return; }
    tb.innerHTML = ids.map((id, i) => {
      const r = egresos[id];
      return `<tr>
        <td class="num">${i + 1}</td>
        <td>${fmtFecha(r.fecha)}</td>
        <td>${r.concepto || ''}</td>
        <td class="num">${fmtPesos(r.valor)}</td>
        <td>${r.detalle || '—'}</td>
        <td class="acciones">
          <button class="btn-editar" data-id="${id}">Editar</button>
          <button class="btn-borrar" data-id="${id}">Borrar</button>
        </td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => abrir(clase, b.dataset.id)));
    tb.querySelectorAll('.btn-borrar').forEach(b => b.addEventListener('click', () => borrar(clase, b.dataset.id)));
    aplicarPermisos();
  }

  function aplicarPermisos() {
    const ok = puede();
    const okCrear = puedeCrear();
    ['cmp-nuevo', 'pg-nuevo'].forEach(id => { const b = $(id); if (b) b.disabled = !okCrear; });
    document.querySelectorAll('#vista-compras .btn-editar, #vista-compras .btn-borrar, #vista-pagos .btn-editar, #vista-pagos .btn-borrar, #cfg-egresos .btn-editar, #cfg-egresos .btn-borrar')
      .forEach(x => { x.disabled = !ok; });
  }

  // Resumen total en Configuración → pestaña Egresos.
  function pintarResumen() {
    const cont = $('cfg-egresos');
    if (!cont) return;
    let tC = 0, tP = 0;
    Object.keys(egresos).forEach(id => { const r = egresos[id]; if (r.clase === 'pago') tP += num(r.valor); else tC += num(r.valor); });
    const ids = Object.keys(egresos).sort((a, b) => (egresos[b].fecha || '').localeCompare(egresos[a].fecha || ''));
    const filas = ids.map(id => {
      const r = egresos[id];
      const et = r.clase === 'pago' ? '💳 Pago' : '🛒 Compra';
      return `<tr>
        <td>${fmtFecha(r.fecha)}</td><td>${et}</td><td>${r.concepto || ''}</td><td class="num">${fmtPesos(r.valor)}</td>
        <td class="acciones">
          <button class="btn-editar" data-id="${id}" data-clase="${r.clase}">Editar</button>
          <button class="btn-borrar" data-id="${id}" data-clase="${r.clase}">Borrar</button>
        </td></tr>`;
    }).join('') || '<tr><td colspan="5" class="vacia-fila">Sin egresos aún</td></tr>';
    cont.innerHTML = `
      <section class="bloque">
        <h3>Egresos (compras + pagos)</h3>
        <p class="modulo-sub">Se llena solo con lo que el empleado registra en Compras y Pagos. Aquí también puedes editar o borrar.</p>
        <div class="panel-fila" style="gap:18px;flex-wrap:wrap">
          <div><span class="modulo-sub">🛒 Compras</span><br><strong>${fmtPesos(tC)}</strong></div>
          <div><span class="modulo-sub">💳 Pagos</span><br><strong>${fmtPesos(tP)}</strong></div>
          <div><span class="modulo-sub">Total egresos</span><br><strong style="color:var(--rojo)">${fmtPesos(tC + tP)}</strong></div>
        </div>
      </section>
      <section class="bloque">
        <div class="tabla-wrap"><table class="tabla">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th class="num">Valor</th><th></th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
      </section>`;
    cont.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => abrir(b.dataset.clase, b.dataset.id)));
    cont.querySelectorAll('.btn-borrar').forEach(b => b.addEventListener('click', () => borrar(b.dataset.clase, b.dataset.id)));
    aplicarPermisos();
  }

  function descargar(clase) {
    const ids = idsDe(clase);
    if (!ids.length) { alert('No hay registros para descargar.'); return; }
    const sep = ';';
    const esc = (v) => { v = (v == null ? '' : String(v)); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const colC = MODS[clase].colConcepto;
    const cab = ['#', 'Fecha', colC, 'Valor', 'Detalle'];
    const filas = ids.map((id, i) => { const r = egresos[id]; return [i + 1, r.fecha || '', r.concepto || '', r.valor != null ? r.valor : '', r.detalle || ''].map(esc).join(sep); });
    const csv = String.fromCharCode(0xFEFF) + [cab.join(sep)].concat(filas).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (clase === 'pago' ? 'pagos' : 'compras') + '-el-dorado.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function pintarTodo() { pintarTabla('compra'); pintarTabla('pago'); pintarResumen(); }

  document.addEventListener('DOMContentLoaded', () => {
    construir('compra');
    construir('pago');
    pintarTodo();
    window.addEventListener('finca-ediciones', aplicarPermisos);
    window.fincaOnLogin(() => {
      window.fincaDB.escucharEgresos((datos) => { egresos = datos || {}; pintarTodo(); });
      window.fincaDB.escucharCatEgresos((datos) => { catalogo = datos || {}; refrescarCatalogo('compra'); refrescarCatalogo('pago'); });
    });
  });
})();
