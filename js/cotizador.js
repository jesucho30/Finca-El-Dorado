/* ============================================================================
 *  Modulo CUENTAS / COTIZADOR - Finca El Dorado
 *  Solo lectura sobre finca/ventas: elige un rango de fechas y uno o varios
 *  compradores y muestra (en grande) cuanto debe cada uno = suma de lo
 *  despachado a su nombre (venta x precio) en ese rango.
 *  Ademas:
 *   - Genera una FACTURA por comprador (numerada) tipo chapola, con los
 *     litros, el rango de fechas y el total, y botones para enviar por
 *     email y por WhatsApp.
 *   - Guarda cada factura en finca/cotizaciones y las lista en un HISTORIAL.
 *  No modifica datos de ventas ni afecta otros modulos.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const redond = (n) => Math.round(n * 100) / 100;
  const hoyISO = () => { const d = new Date(); const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const fmtPesos = (n) => {
    n = Math.round(num(n)); const s = Math.abs(n).toString(); let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };
  const totalCobrarDe = (r) => num(r.venta) * num(r.precio);
  const numeroFmt = (n) => n ? String(n).padStart(3, '0') : '—';
  const rangoTxt = (ini, fin) => (!ini && !fin) ? 'Todas las fechas' : ((ini ? fmtFecha(ini) : 'inicio') + ' al ' + (fin ? fmtFecha(fin) : 'hoy'));

  let ventas = {};            // { id: registro }
  const seleccion = {};       // { nombreComprador: true }
  let resultadoActual = null; // { inicio, fin, porComprador: {n: {litros, total}} }

  function getCompradores() {
    const set = {};
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    const c = cfg && cfg.compradores;
    if (c && typeof c === 'object') {
      Object.keys(c).forEach(k => { const n = c[k].nombre || k; if (n) set[n] = true; });
    }
    Object.keys(ventas).forEach(id => { const n = ventas[id].comprador; if (n) set[n] = true; });
    return Object.keys(set).sort();
  }

  function construir() {
    const cont = $('vista-cotizador');
    if (!cont) return;
    cont.innerHTML = `
      <div class="modulo-head">
        <p class="modulo-sub">Elige un rango de fechas y uno o varios compradores para ver cuánto deben (lo despachado a su nombre).</p>
        <button id="cot-historial" class="btn-plano" type="button">📋 Historial</button>
      </div>

      <section class="bloque">
        <div class="fila-dos">
          <label class="campo"><span>Fecha de inicio</span><input type="date" id="cot-inicio"></label>
          <label class="campo"><span>Fecha final</span><input type="date" id="cot-fin"></label>
        </div>
        <label class="campo"><span>Comprador o compradores</span></label>
        <div id="cot-compradores" class="cot-compradores"></div>
      </section>

      <section class="bloque" id="cot-resultado"></section>

      <!-- ===== MODAL FACTURA ===== -->
      <div id="cot-fact-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Factura</h3>
            <button id="cot-fact-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <div id="cot-fact-cuerpo"></div>
          <div class="fact-acciones">
            <button id="cot-fact-email" class="btn-acento" type="button">📧 Email</button>
            <button id="cot-fact-wa" class="btn-acento" type="button">📱 WhatsApp</button>
          </div>
        </div>
      </div>

      <!-- ===== MODAL HISTORIAL ===== -->
      <div id="cot-hist-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Historial de facturas</h3>
            <button id="cot-hist-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <div id="cot-hist-lista"></div>
          <div class="fact-acciones">
            <button id="cot-hist-limpiar" class="btn-peligro" type="button">🗑️ Limpiar historial</button>
          </div>
        </div>
      </div>
    `;
    enlazar();
  }

  function enlazar() {
    $('cot-inicio').addEventListener('change', pintarResultado);
    $('cot-fin').addEventListener('change', pintarResultado);
    $('cot-historial').addEventListener('click', abrirHistorial);
    $('cot-fact-cerrar').addEventListener('click', () => $('cot-fact-modal').classList.add('oculto'));
    $('cot-fact-modal').addEventListener('click', (e) => { if (e.target.id === 'cot-fact-modal') $('cot-fact-modal').classList.add('oculto'); });
    $('cot-hist-cerrar').addEventListener('click', () => $('cot-hist-modal').classList.add('oculto'));
    $('cot-hist-modal').addEventListener('click', (e) => { if (e.target.id === 'cot-hist-modal') $('cot-hist-modal').classList.add('oculto'); });
    $('cot-hist-limpiar').addEventListener('click', limpiarHistorial);
  }

  // Borra TODO el historial de facturas. Solo si está habilitado en
  // Configuración (finca/config/limpiarFacturas === true).
  async function limpiarHistorial() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    if (!(cfg && cfg.limpiarFacturas === true)) {
      alert('La opción de limpiar el historial está desactivada. Actívala en Configuración → "Limpiar historial de facturas".');
      return;
    }
    if (!confirm('¿Borrar TODO el historial de facturas? No se puede deshacer.')) return;
    try {
      await window.fincaDB.set('finca/cotizaciones', null);
      abrirHistorial(); // se repinta (mostrará que ya no hay facturas)
    } catch (e) {
      alert('No se pudo limpiar: ' + (e.message || e));
    }
  }

  // Borra UNA sola factura del historial (mismo permiso que limpiar todo).
  async function borrarFactura(id, d) {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    if (!(cfg && cfg.limpiarFacturas === true)) {
      alert('La opción de limpiar el historial está desactivada. Actívala en Configuración → "Limpiar historial de facturas".');
      return;
    }
    const etiqueta = d ? ('la factura N° ' + numeroFmt(d.numero) + ' de ' + d.comprador) : 'esta factura';
    if (!confirm('¿Eliminar ' + etiqueta + '? No se puede deshacer.')) return;
    try {
      await window.fincaDB.set('finca/cotizaciones/' + id, null);
      abrirHistorial(); // se repinta sin la factura borrada
    } catch (e) {
      alert('No se pudo eliminar: ' + (e.message || e));
    }
  }

  function pintarCompradores() {
    const cont = $('cot-compradores');
    if (!cont) return;
    const lista = getCompradores();
    Object.keys(seleccion).forEach(n => { if (lista.indexOf(n) === -1) delete seleccion[n]; });
    if (!lista.length) {
      cont.innerHTML = '<p class="modulo-sub">Aún no hay compradores. Agrégalos en Configuración o registra un despacho con comprador.</p>';
      return;
    }
    cont.innerHTML = lista.map(n =>
      `<label class="cot-chk"><input type="checkbox" value="${n}" ${seleccion[n] ? 'checked' : ''}> ${n}</label>`
    ).join('');
    cont.querySelectorAll('input[type=checkbox]').forEach(chk => {
      chk.addEventListener('change', () => { seleccion[chk.value] = chk.checked; pintarResultado(); });
    });
  }

  function pintarResultado() {
    const cont = $('cot-resultado');
    if (!cont) return;
    const ini = $('cot-inicio') ? $('cot-inicio').value : '';
    const fin = $('cot-fin') ? $('cot-fin').value : '';
    const elegidos = Object.keys(seleccion).filter(n => seleccion[n]);

    if (!elegidos.length) {
      resultadoActual = null;
      cont.innerHTML = '<p class="modulo-sub">Elige al menos un comprador para ver cuánto debe.</p>';
      return;
    }

    const enRango = (f) => { if (!f) return false; if (ini && f < ini) return false; if (fin && f > fin) return false; return true; };
    const porComprador = {};
    elegidos.forEach(n => { porComprador[n] = { litros: 0, total: 0 }; });
    let total = 0, totalLitros = 0;
    let manL = 0, manD = 0, tarL = 0, tarD = 0; // litros y dinero por jornada
    Object.keys(ventas).forEach(id => {
      const r = ventas[id];
      if (!r.comprador || !seleccion[r.comprador]) return;
      if (!enRango(r.fecha || '')) return;
      const lit = num(r.venta), din = totalCobrarDe(r);
      porComprador[r.comprador].litros += lit;
      porComprador[r.comprador].total += din;
      total += din;
      totalLitros += lit;
      const j = (r.jornada || '').toLowerCase();
      if (j.indexOf('mañ') !== -1 || j.indexOf('man') !== -1) { manL += lit; manD += din; }
      else if (j.indexOf('tard') !== -1) { tarL += lit; tarD += din; }
    });
    resultadoActual = { inicio: ini, fin: fin, porComprador: porComprador };

    const cards = elegidos.map(n =>
      `<div class="cot-card">
        <span class="cot-card-nombre">${n}</span>
        <strong>${fmtPesos(porComprador[n].total)}</strong>
        <span class="cot-card-litros">${redond(porComprador[n].litros)} L despachados</span>
        <button class="btn-plano cot-factura-btn" type="button" data-comprador="${n}">🧾 Factura</button>
      </div>`
    ).join('');

    cont.innerHTML = `
      <div class="cot-total-wrap">
        <span class="cot-total-label">Total a cobrar — ${rangoTxt(ini, fin)}</span>
        <div class="cot-total">${fmtPesos(total)}</div>
        <div class="cot-total-litros">${rangoTxt(ini, fin)} · <b>${redond(totalLitros)} L</b></div>
      </div>
      <div class="cot-jornadas">
        <div class="cot-jcard">
          <span class="cot-jtit">🌅 Mañana</span>
          <strong>${fmtPesos(manD)}</strong>
          <span class="cot-jsub">${redond(manL)} L</span>
        </div>
        <div class="cot-jcard">
          <span class="cot-jtit">🌇 Tarde</span>
          <strong>${fmtPesos(tarD)}</strong>
          <span class="cot-jsub">${redond(tarL)} L</span>
        </div>
      </div>
      <div class="cot-cards">${cards}</div>
    `;

    cont.querySelectorAll('.cot-factura-btn').forEach(b => {
      b.addEventListener('click', () => generarFactura(b.dataset.comprador));
    });
  }

  // -- FACTURA: numera, guarda en historial y abre el comprobante ------------
  async function generarFactura(comprador) {
    if (!resultadoActual || !resultadoActual.porComprador[comprador]) return;
    const pc = resultadoActual.porComprador[comprador];
    const datos = {
      comprador: comprador,
      inicio: resultadoActual.inicio || '',
      fin: resultadoActual.fin || '',
      litros: redond(pc.litros),
      total: Math.round(pc.total),
      fecha: hoyISO(),
      numero: 0
    };
    let id = null;
    try {
      const all = (await window.fincaDB.get('finca/cotizaciones')) || {};
      const maxNum = Object.keys(all).reduce((m, k) => Math.max(m, num(all[k].numero)), 0);
      datos.numero = maxNum + 1;
      datos.por = (window.fincaAuth.currentUser() || {}).email || '';
      id = 'c' + Date.now();
      await window.fincaDB.set('finca/cotizaciones/' + id, datos);
    } catch (e) {
      // Si no se pudo guardar (sin conexión/sesión), se muestra igual.
    }
    abrirFactura(datos, id);
  }

  // ¿Se solapan dos rangos de fechas? (inicio/fin vacíos = rango abierto).
  function rangosSolapan(i1, f1, i2, f2) {
    const a1 = i1 || '0000-00-00', a2 = f1 || '9999-12-31';
    const b1 = i2 || '0000-00-00', b2 = f2 || '9999-12-31';
    return a1 <= b2 && b1 <= a2;
  }

  function facturaTexto(d) {
    return [
      'FINCA EL DORADO',
      'Comprobante de despacho de leche',
      'Factura N° ' + numeroFmt(d.numero),
      '',
      'Comprador: ' + d.comprador,
      'Periodo: ' + rangoTxt(d.inicio, d.fin),
      'Litros despachados: ' + redond(d.litros) + ' L',
      'Fecha de emisión: ' + fmtFecha(d.fecha),
      'TOTAL A PAGAR: ' + fmtPesos(d.total),
      '',
      'Gracias por su compra.'
    ].join('\n');
  }

  function abrirFactura(d, id) {
    const cuerpo = $('cot-fact-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = `
      <div class="fact-doc">
        <div class="fact-head">
          <div class="logo fact-logo"></div>
          <div class="fact-tit-wrap">
            <div class="fact-titulo">FINCA EL DORADO</div>
            <div class="fact-sub">Comprobante de despacho de leche</div>
          </div>
          <div class="fact-num">N° ${numeroFmt(d.numero)}</div>
        </div>
        <div class="fact-linea"><span>Comprador</span><b>${d.comprador}</b></div>
        <div class="fact-linea"><span>Periodo</span><b>${rangoTxt(d.inicio, d.fin)}</b></div>
        <div class="fact-linea"><span>Litros despachados</span><b>${redond(d.litros)} L</b></div>
        <div class="fact-linea"><span>Fecha de emisión</span><b>${fmtFecha(d.fecha)}</b></div>
        <div class="fact-total"><span>Total a pagar</span><strong>${fmtPesos(d.total)}</strong></div>
      </div>
    `;
    const email = $('cot-fact-email');
    const wa = $('cot-fact-wa');
    email.onclick = () => {
      const url = 'mailto:?subject=' + encodeURIComponent('Factura ' + numeroFmt(d.numero) + ' - Finca El Dorado') +
        '&body=' + encodeURIComponent(facturaTexto(d));
      const a = document.createElement('a'); a.href = url; document.body.appendChild(a); a.click(); a.remove();
    };
    wa.onclick = async () => {
      // Aviso: si ya se cobró (envió por WhatsApp) a este comprador en fechas que se solapan.
      try {
        const all = (await window.fincaDB.get('finca/cotizaciones')) || {};
        let prev = null;
        Object.keys(all).forEach(k => {
          if (k === id) return;
          const o = all[k];
          if (!o || o.comprador !== d.comprador || !o.cobrado) return;
          if (rangosSolapan(d.inicio, d.fin, o.inicio, o.fin)) prev = o;
        });
        if (prev && !confirm('⚠️ Ya le cobraste a ' + d.comprador + ' fechas dentro de este periodo:\n\nFactura N° ' + numeroFmt(prev.numero) + ' (' + rangoTxt(prev.inicio, prev.fin) + ').\n\nVas a VOLVER A COBRAR fechas que ya se facturaron. ¿Continuar de todas formas?')) return;
      } catch (e) { /* sin conexión: se envía igual */ }
      window.open('https://wa.me/?text=' + encodeURIComponent(facturaTexto(d)), '_blank');
      if (id) { try { await window.fincaDB.set('finca/cotizaciones/' + id + '/cobrado', true); } catch (e) {} }
    };
    $('cot-fact-modal').classList.remove('oculto');
  }

  // -- HISTORIAL de facturas (finca/cotizaciones) ----------------------------
  async function abrirHistorial() {
    const cont = $('cot-hist-lista');
    if (!cont) return;
    cont.innerHTML = '<p class="modulo-sub">Cargando…</p>';
    $('cot-hist-modal').classList.remove('oculto');
    let all = {};
    try { all = (await window.fincaDB.get('finca/cotizaciones')) || {}; }
    catch (e) { cont.innerHTML = '<p class="modulo-sub">No se pudo cargar el historial.</p>'; return; }
    const ids = Object.keys(all).sort((a, b) => num(all[b].numero) - num(all[a].numero));
    if (!ids.length) { cont.innerHTML = '<p class="modulo-sub">Aún no hay facturas generadas.</p>'; return; }
    cont.innerHTML = ids.map(id => {
      const d = all[id];
      return `<div class="cot-hist-row">
        <span class="cot-hist-num">N° ${numeroFmt(d.numero)}</span>
        <span class="cot-hist-info"><b>${d.comprador}</b> · ${rangoTxt(d.inicio, d.fin)} · ${redond(d.litros)} L · ${fmtPesos(d.total)}</span>
        <button class="btn-plano cot-hist-ver" type="button" data-id="${id}">Ver</button>
        <button class="btn-icono cot-hist-del" type="button" data-id="${id}" title="Eliminar esta factura">✕</button>
      </div>`;
    }).join('');
    cont.querySelectorAll('.cot-hist-ver').forEach(b => {
      b.addEventListener('click', () => { $('cot-hist-modal').classList.add('oculto'); abrirFactura(all[b.dataset.id], b.dataset.id); });
    });
    cont.querySelectorAll('.cot-hist-del').forEach(b => {
      b.addEventListener('click', () => borrarFactura(b.dataset.id, all[b.dataset.id]));
    });
  }

  function refrescar() { pintarCompradores(); pintarResultado(); }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    refrescar();
    window.addEventListener('finca-config', refrescar);
    window.fincaOnLogin(() => {
      window.fincaDB.escucharVentas((datos) => { ventas = datos || {}; refrescar(); });
    });
  });
})();
