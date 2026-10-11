/* ============================================================================
 *  APORTES - pestaña protegida dentro de Registros.
 *  Pide una clave (cambiable en Configuración) para entrar. Adentro se
 *  registran los aportes (quién aporta, cuánto, cuándo, detalle).
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  // Editar/borrar: interruptor PROPIO de Registros (Inventario + Aportes).
  const puede = () => !window.fincaPuedeEditarRegistros || window.fincaPuedeEditarRegistros();
  const puedeCrear = () => !window.fincaPuedeCrear || window.fincaPuedeCrear();
  const hoyISO = () => { const d = new Date(); const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const fmtPesos = (n) => {
    n = Math.round(num(n)); const s = Math.abs(n).toString(); let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };
  const PERSONAS = ['Jesusita', 'Santiago', 'Felipe', 'Fernando', 'Saida', 'Saray', 'Fabiola'];
  const CLAVE_DEFECTO = 'aportes';
  const claveActual = () => { const c = window.fincaConfig ? window.fincaConfig() : {}; return (c && c.claveAportes) ? c.claveAportes : CLAVE_DEFECTO; };

  let aportes = {};
  let editId = null;
  let desbloqueado = false;

  function construir() {
    const cont = $('reg-tab-aportes');
    if (!cont) return;
    cont.innerHTML = `
      <div id="ap-candado" class="bloque">
        <div class="candado-card">
          <div class="logo candado-logo"></div>
          <h3>Aportes (protegido)</h3>
          <p class="modulo-sub" style="text-align:center">Escribe la clave de aportes para entrar.</p>
          <form id="ap-form-clave">
            <input type="password" id="ap-clave-input" placeholder="Clave de aportes" autocomplete="off">
            <button type="submit" class="btn-acento">Entrar</button>
          </form>
          <p id="ap-clave-msg" class="msg"></p>
        </div>
      </div>

      <div id="ap-panel" class="oculto">
        <div class="modulo-head">
          <p class="modulo-sub">Aportes a la finca: quién aporta, cuánto, cuándo.</p>
          <button id="ap-nuevo" class="btn-acento" type="button">+ Nuevo aporte</button>
        </div>
        <div id="ap-cards" class="ap-cards"></div>
        <section class="bloque">
          <div class="bloque-head">
            <h3>Todos los aportes</h3>
            <button id="ap-descargar" class="btn-plano" type="button">⬇ Descargar</button>
          </div>
          <input type="search" id="ap-buscar" class="buscar" placeholder="🔎 Buscar por fecha, aportante, concepto o valor...">
          <div id="ap-total-filtrado" class="total-filtrado oculto"></div>
          <div class="tabla-wrap"><table class="tabla">
            <thead><tr><th class="num">#</th><th>Fecha</th><th>Aportante</th><th>Concepto</th><th class="num">Valor</th><th>Detalle</th><th></th></tr></thead>
            <tbody id="ap-lista"></tbody>
          </table></div>
        </section>
        <button id="ap-bloquear" class="btn-plano" type="button">🔒 Bloquear de nuevo</button>
      </div>

      <div id="ap-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head"><h3 id="ap-modal-titulo">Nuevo aporte</h3><button id="ap-cerrar" class="btn-icono" title="Cerrar">✕</button></div>
          <form id="ap-form">
            <label class="campo">
              <span>Aportante</span>
              <select id="ap-aportante">${PERSONAS.map(p => `<option value="${p}">${p}</option>`).join('')}<option value="Otros">Otros</option></select>
            </label>
            <label class="campo oculto" id="ap-otro-wrap">
              <span>¿Quién? (especificar)</span>
              <input type="text" id="ap-aportante-otro" placeholder="Nombre del aportante">
            </label>
            <label class="campo"><span>Concepto</span><input type="text" id="ap-concepto" placeholder="Ej: Proyecto Galpón, Pago Febrero..."></label>
            <div class="fila-dos">
              <label class="campo"><span>Valor ($)</span><input type="number" id="ap-valor" min="0" step="1" inputmode="numeric" placeholder="0"></label>
              <label class="campo"><span>Fecha</span><input type="date" id="ap-fecha"></label>
            </div>
            <label class="campo"><span>Detalle (opcional)</span><input type="text" id="ap-detalle" placeholder="Observaciones..."></label>
            <p id="ap-msg" class="msg"></p>
            <div class="modal-acciones">
              <button type="button" id="ap-eliminar" class="btn-peligro oculto">Eliminar</button>
              <span style="flex:1"></span>
              <button type="button" id="ap-cancelar" class="btn-plano">Cancelar</button>
              <button type="submit" class="btn-acento">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    // El modal al body para que funcione bien dentro de la pestaña.
    document.body.appendChild($('ap-modal'));
    enlazar();
  }

  function enlazar() {
    $('ap-form-clave').addEventListener('submit', intentarEntrar);
    $('ap-bloquear').addEventListener('click', () => { desbloqueado = false; mostrarPanel(); });
    $('ap-nuevo').addEventListener('click', () => abrir(null));
    $('ap-cerrar').addEventListener('click', cerrar);
    $('ap-cancelar').addEventListener('click', cerrar);
    $('ap-modal').addEventListener('click', (e) => { if (e.target.id === 'ap-modal') cerrar(); });
    $('ap-form').addEventListener('submit', guardar);
    $('ap-eliminar').addEventListener('click', eliminarModal);
    $('ap-descargar').addEventListener('click', descargar);
    $('ap-buscar').addEventListener('input', pintar);
    $('ap-aportante').addEventListener('change', () => {
      $('ap-otro-wrap').classList.toggle('oculto', $('ap-aportante').value !== 'Otros');
    });
  }

  function intentarEntrar(e) {
    e.preventDefault();
    const msg = $('ap-clave-msg');
    if ($('ap-clave-input').value === claveActual()) {
      desbloqueado = true; $('ap-clave-input').value = ''; msg.textContent = '';
      mostrarPanel();
    } else { msg.textContent = 'Clave incorrecta.'; msg.className = 'msg err'; }
  }

  function mostrarPanel() {
    if (!$('ap-candado')) return;
    $('ap-candado').classList.toggle('oculto', desbloqueado);
    $('ap-panel').classList.toggle('oculto', !desbloqueado);
    if (desbloqueado) pintar();
  }

  function abrir(id) {
    if (id && !puede()) { alert('Las ediciones están desactivadas (o tu usuario no puede editar).'); return; }
    if (!id && !puedeCrear()) { alert('Tu usuario es de solo lectura.'); return; }
    editId = id;
    const r = id ? aportes[id] : null;
    $('ap-modal-titulo').textContent = id ? 'Editar aporte' : 'Nuevo aporte';
    $('ap-eliminar').classList.toggle('oculto', !id);
    $('ap-msg').textContent = '';
    const nombre = r && r.aportante ? r.aportante : 'Jesusita';
    const esLista = PERSONAS.indexOf(nombre) !== -1;
    $('ap-aportante').value = esLista ? nombre : 'Otros';
    $('ap-aportante-otro').value = esLista ? '' : nombre;
    $('ap-otro-wrap').classList.toggle('oculto', esLista);
    $('ap-concepto').value  = r && r.concepto ? r.concepto : '';
    $('ap-valor').value     = r && r.valor ? r.valor : '';
    $('ap-detalle').value   = r && r.detalle ? r.detalle : '';
    $('ap-fecha').value     = r && r.fecha ? r.fecha : hoyISO();
    $('ap-modal').classList.remove('oculto');
  }

  function cerrar() { $('ap-modal').classList.add('oculto'); editId = null; }

  async function guardar(e) {
    e.preventDefault();
    const msg = $('ap-msg');
    if (editId && !puede()) { msg.textContent = 'Editar está desactivado (o tu usuario no puede editar).'; msg.className = 'msg err'; return; }
    if (!editId && !puedeCrear()) { msg.textContent = 'Tu usuario es de solo lectura.'; msg.className = 'msg err'; return; }
    let aportante = $('ap-aportante').value;
    if (aportante === 'Otros') aportante = $('ap-aportante-otro').value.trim();
    const valor = num($('ap-valor').value);
    if (!aportante) { msg.textContent = 'Indica quién aporta.'; msg.className = 'msg err'; return; }
    if (valor <= 0) { msg.textContent = 'Pon un valor mayor que cero.'; msg.className = 'msg err'; return; }
    const reg = { aportante: aportante, concepto: $('ap-concepto').value.trim(), valor: Math.round(valor), detalle: $('ap-detalle').value.trim(), fecha: $('ap-fecha').value || hoyISO(), por: (window.fincaAuth.currentUser() || {}).email || '' };
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (editId) await window.fincaDB.editarAporte(editId, reg);
      else        await window.fincaDB.agregarAporte(reg);
      cerrar();
    } catch (err) { msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err'; }
    finally { if (btn) btn.disabled = false; }
  }

  async function eliminarModal() {
    if (!editId || !puede()) return;
    if (!confirm('¿Eliminar este aporte?')) return;
    try { await window.fincaDB.eliminarAporte(editId); cerrar(); }
    catch (err) { alert('No se pudo eliminar: ' + (err.message || err)); }
  }

  async function borrar(id) {
    if (!puede()) { alert('Borrar está desactivado (o tu usuario no puede borrar).'); return; }
    const r = aportes[id] || {};
    if (!confirm('¿Borrar el aporte de "' + (r.aportante || '') + '"?')) return;
    try { await window.fincaDB.eliminarAporte(id); }
    catch (err) { alert('No se pudo borrar: ' + (err.message || err)); }
  }

  function pintar() {
    if (!desbloqueado) return;
    pintarCards();
    const tb = $('ap-lista');
    if (!tb) return;
    const todosIds = Object.keys(aportes).sort((a, b) => (aportes[b].fecha || '').localeCompare(aportes[a].fecha || ''));
    const granTotal = todosIds.reduce((a, id) => a + num(aportes[id].valor), 0);
    const q = ($('ap-buscar') ? $('ap-buscar').value : '').trim().toLowerCase();
    let ids = todosIds;
    if (q) ids = ids.filter(id => {
      const r = aportes[id];
      const hay = [fmtFecha(r.fecha), r.fecha, r.aportante, r.concepto, r.detalle, r.valor, fmtPesos(r.valor)]
        .map(x => (x == null ? '' : String(x)).toLowerCase()).join(' ');
      return hay.indexOf(q) !== -1;
    });
    const total = granTotal; // el total de abajo siempre es el general
    // Total filtrado, debajo del buscador.
    const tf = $('ap-total-filtrado');
    if (tf) {
      if (q) {
        const suma = ids.reduce((a, id) => a + num(aportes[id].valor), 0);
        tf.innerHTML = 'Total filtrado: <strong>' + fmtPesos(suma) + '</strong> &nbsp;(' + ids.length + ' aportes)';
        tf.classList.remove('oculto');
      } else { tf.classList.add('oculto'); }
    }
    if (!ids.length) { tb.innerHTML = '<tr><td colspan="7" class="vacia-fila">' + (q ? 'Sin resultados para "' + q + '"' : 'Sin aportes aún') + '</td></tr>'; }
    else {
      tb.innerHTML = ids.map((id, i) => {
        const r = aportes[id];
        return `<tr>
          <td class="num">${i + 1}</td><td>${fmtFecha(r.fecha)}</td><td>${r.aportante || ''}</td><td>${r.concepto || '—'}</td>
          <td class="num">${fmtPesos(r.valor)}</td><td>${r.detalle || '—'}</td>
          <td class="acciones"><button class="btn-editar" data-id="${id}">Editar</button><button class="btn-borrar" data-id="${id}">Borrar</button></td>
        </tr>`;
      }).join('') + `<tr><td colspan="4" style="text-align:right"><strong>Total aportes</strong></td><td class="num"><strong>${fmtPesos(total)}</strong></td><td colspan="2"></td></tr>`;
      tb.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', () => abrir(b.dataset.id)));
      tb.querySelectorAll('.btn-borrar').forEach(b => b.addEventListener('click', () => borrar(b.dataset.id)));
    }
    aplicarPermisos();
  }

  // Una tarjeta por persona (+ Otros), con su total aportado y nº de aportes.
  function pintarCards() {
    const cont = $('ap-cards');
    if (!cont) return;
    const sum = {}; const cnt = {};
    PERSONAS.concat(['Otros']).forEach(p => { sum[p] = 0; cnt[p] = 0; });
    Object.keys(aportes).forEach(id => {
      const r = aportes[id];
      const k = PERSONAS.indexOf(r.aportante) !== -1 ? r.aportante : 'Otros';
      sum[k] += num(r.valor); cnt[k]++;
    });
    cont.innerHTML = PERSONAS.concat(['Otros']).map(p => `
      <div class="ap-card">
        <span class="ap-card-nombre">${p === 'Otros' ? '👥 Otros' : p}</span>
        <strong class="ap-card-total">${fmtPesos(sum[p])}</strong>
        <span class="modulo-sub">${cnt[p]} aporte${cnt[p] === 1 ? '' : 's'}</span>
      </div>`).join('');
  }

  function aplicarPermisos() {
    const ok = puede(), okC = puedeCrear();
    const n = $('ap-nuevo'); if (n) n.disabled = !okC;
    document.querySelectorAll('#reg-tab-aportes .btn-editar, #reg-tab-aportes .btn-borrar').forEach(x => { x.disabled = !ok; });
  }

  function descargar() {
    const ids = Object.keys(aportes).sort((a, b) => (aportes[b].fecha || '').localeCompare(aportes[a].fecha || ''));
    if (!ids.length) { alert('No hay aportes para descargar.'); return; }
    const sep = ';';
    const esc = (v) => { v = (v == null ? '' : String(v)); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const cab = ['#', 'Fecha', 'Aportante', 'Concepto', 'Valor', 'Detalle'];
    const filas = ids.map((id, i) => { const r = aportes[id]; return [i + 1, r.fecha || '', r.aportante || '', r.concepto || '', r.valor != null ? r.valor : '', r.detalle || ''].map(esc).join(sep); });
    const csv = String.fromCharCode(0xFEFF) + [cab.join(sep)].concat(filas).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'aportes-el-dorado.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    window.addEventListener('finca-ediciones', aplicarPermisos);
    // Cada vez que se abre la pestaña Aportes, mostrar candado o panel.
    window.addEventListener('finca-abrir-aportes', mostrarPanel);
    window.fincaOnLogin(() => {
      window.fincaDB.escucharAportes((d) => { aportes = d || {}; if (desbloqueado) pintar(); });
    });
    // Al cerrar sesión, re-bloquear aportes.
    if (window.fincaOnLogout) window.fincaOnLogout(() => { desbloqueado = false; mostrarPanel(); });
  });
})();
