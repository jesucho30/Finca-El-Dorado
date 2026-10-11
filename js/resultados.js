/* ============================================================================
 *  RESULTADOS - Finca El Dorado (módulo del sidebar, protegido con clave)
 *  El tablero del director: resultado financiero, producción de leche,
 *  y aportes + retorno de la inversión en vacas. Clave por defecto: 123456.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const redond = (n) => Math.round(n * 100) / 100;
  const fmtPesos = (n) => {
    n = Math.round(num(n)); const s = Math.abs(n).toString(); let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };
  const CLAVE_DEFECTO = '123456';
  const claveActual = () => { const c = window.fincaConfig ? window.fincaConfig() : {}; return (c && c.claveResultados) ? c.claveResultados : CLAVE_DEFECTO; };

  let ventas = {}, ingresos = {}, egresos = {}, aportes = {};
  let desbloqueado = false;

  // Filtro de fechas del panel (por defecto, el mes en curso = el que termina).
  let fIni = '', fFin = '';
  const MESES_NOM = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  function fijarDefecto() {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const ult = new Date(y, m + 1, 0).getDate();
    fIni = y + '-' + pad2(m + 1) + '-01';
    fFin = y + '-' + pad2(m + 1) + '-' + pad2(ult);
    if ($('res-ini')) $('res-ini').value = fIni;
    if ($('res-fin')) $('res-fin').value = fFin;
  }

  function esMesCompleto(i, f) {
    if (!i || !f || i.slice(0, 7) !== f.slice(0, 7) || i.slice(8) !== '01') return false;
    const y = +i.slice(0, 4), m = +i.slice(5, 7);
    return +f.slice(8) === new Date(y, m, 0).getDate();
  }

  function actualizarTitulo() {
    const t = $('res-titulo');
    if (!t) return;
    if (esMesCompleto(fIni, fFin)) {
      t.textContent = 'Resultados del mes de ' + (MESES_NOM[+fIni.slice(5, 7) - 1] || '') + ' ' + fIni.slice(0, 4);
    } else if (fIni || fFin) {
      t.textContent = 'Resultados del ' + (fIni ? fmtFecha(fIni) : '…') + ' al ' + (fFin ? fmtFecha(fFin) : '…');
    } else {
      t.textContent = 'Resultados (todas las fechas)';
    }
  }

  function construir() {
    const cont = $('vista-resultados');
    if (!cont) return;
    cont.innerHTML = `
      <div id="res-candado" class="bloque">
        <div class="candado-card">
          <div class="logo candado-logo"></div>
          <h3>Resultados (protegido)</h3>
          <p class="modulo-sub" style="text-align:center">Escribe la clave para ver los resultados de la finca.</p>
          <form id="res-form-clave">
            <input type="password" id="res-clave-input" placeholder="Clave" autocomplete="off">
            <button type="submit" class="btn-acento">Entrar</button>
          </form>
          <p id="res-clave-msg" class="msg"></p>
        </div>
      </div>
      <div id="res-panel" class="oculto">
        <div class="res-filtro">
          <h3 id="res-titulo">Resultados del mes</h3>
          <div class="fecha-filtro">
            <label class="res-flbl">Desde <input type="date" id="res-ini" class="fecha-sel"></label>
            <label class="res-flbl">Hasta <input type="date" id="res-fin" class="fecha-sel"></label>
          </div>
        </div>
        <div id="res-contenido"></div>
        <button id="res-bloquear" class="btn-plano" type="button" style="margin-top:8px">🔒 Bloquear de nuevo</button>
      </div>
    `;
    $('res-form-clave').addEventListener('submit', intentarEntrar);
    $('res-bloquear').addEventListener('click', () => { desbloqueado = false; mostrarPanel(); });
    $('res-ini').addEventListener('change', () => { fIni = $('res-ini').value; actualizarTitulo(); render(); });
    $('res-fin').addEventListener('change', () => { fFin = $('res-fin').value; actualizarTitulo(); render(); });
    fijarDefecto();
    actualizarTitulo();
  }

  function intentarEntrar(e) {
    e.preventDefault();
    const msg = $('res-clave-msg');
    if ($('res-clave-input').value === claveActual()) {
      desbloqueado = true; $('res-clave-input').value = ''; msg.textContent = '';
      mostrarPanel();
    } else { msg.textContent = 'Clave incorrecta.'; msg.className = 'msg err'; }
  }

  function mostrarPanel() {
    if (!$('res-candado')) return;
    $('res-candado').classList.toggle('oculto', desbloqueado);
    $('res-panel').classList.toggle('oculto', !desbloqueado);
    if (desbloqueado) { actualizarTitulo(); render(); }
  }

  function card(titulo, valor, color, sub) {
    return `<div class="flujo-card"><span class="modulo-sub">${titulo}</span>
      <strong style="${color ? 'color:' + color : ''}">${valor}</strong>
      ${sub ? '<span class="modulo-sub">' + sub + '</span>' : ''}</div>`;
  }

  function render() {
    const cont = $('res-contenido');
    if (!cont || !desbloqueado) return;

    // Filtro por fechas (calendario): todo se calcula dentro del rango elegido.
    const enRangoR = (r) => { const f = (r && r.fecha) || ''; if (fIni && f < fIni) return false; if (fFin && f > fFin) return false; return true; };
    const filtR = (obj) => { const o = {}; Object.keys(obj).forEach(k => { if (enRangoR(obj[k])) o[k] = obj[k]; }); return o; };
    const ventasR = filtR(ventas), ingresosR = filtR(ingresos), egresosR = filtR(egresos), aportesR = filtR(aportes);

    const leche = Object.keys(ventasR).map(k => ventasR[k]).filter(r => r.concepto === 'leche');
    const ingresoLeche = leche.reduce((a, r) => a + num(r.venta) * num(r.precio), 0);
    const ingresoOtros = Object.keys(ingresosR).reduce((a, k) => a + num(ingresosR[k].valor), 0);
    const totalIngresos = ingresoLeche + ingresoOtros;
    const totalEgresos = Object.keys(egresosR).reduce((a, k) => a + num(egresosR[k].valor), 0);
    const ganancia = totalIngresos - totalEgresos;
    const margen = totalIngresos > 0 ? (ganancia / totalIngresos * 100) : 0;

    let litrosTotal = 0, vendidos = 0, domestico = 0;
    const porVaca = {}, dias = {}, meses = {};
    leche.forEach(r => {
      const t = num(r.total) || (num(r.venta) + num(r.domestico));
      litrosTotal += t; vendidos += num(r.venta); domestico += num(r.domestico);
      const v = r.vaca || 'Sin asignar'; porVaca[v] = (porVaca[v] || 0) + t;
      if (r.fecha) { dias[r.fecha] = 1; meses[r.fecha.slice(0, 7)] = 1; }
    });
    const nDias = Object.keys(dias).length || 1;
    const promDia = litrosTotal / nDias;
    const pctVend = litrosTotal > 0 ? (vendidos / litrosTotal * 100) : 0;
    const vacasOrden = Object.keys(porVaca).sort((a, b) => porVaca[b] - porVaca[a]);

    const totalAportes = Object.keys(aportesR).reduce((a, k) => a + num(aportesR[k].valor), 0);
    const porAportante = {};
    Object.keys(aportesR).forEach(k => { const r = aportesR[k]; porAportante[r.aportante || 'Otros'] = (porAportante[r.aportante || 'Otros'] || 0) + num(r.valor); });
    const aportantesOrden = Object.keys(porAportante).sort((a, b) => porAportante[b] - porAportante[a]);
    const inversionVacas = Object.keys(aportesR).reduce((a, k) => {
      const r = aportesR[k]; return a + ((r.concepto || '').toLowerCase().indexOf('vaca') !== -1 ? num(r.valor) : 0);
    }, 0);
    const nMeses = Object.keys(meses).length || 1;
    const ingresoMensualLeche = ingresoLeche / nMeses;
    const recuperadoPct = inversionVacas > 0 ? (ingresoLeche / inversionVacas * 100) : 0;
    const mesesRecuperar = ingresoMensualLeche > 0 ? (inversionVacas / ingresoMensualLeche) : 0;

    const verde = 'var(--acento-2)', rojo = 'var(--rojo)';

    cont.innerHTML = `
      <section class="bloque">
        <h3>💰 Resultado financiero</h3>
        <p class="modulo-sub">Lo que entra (leche + otros ingresos) menos lo que sale (compras + pagos). No incluye los aportes de socios.</p>
        <div class="flujo-cards">
          ${card('Ingresos', fmtPesos(totalIngresos), verde, 'Leche ' + fmtPesos(ingresoLeche) + ' + otros ' + fmtPesos(ingresoOtros))}
          ${card('Egresos', fmtPesos(totalEgresos), rojo)}
          ${card(ganancia >= 0 ? 'Ganancia' : 'Pérdida', fmtPesos(ganancia), ganancia >= 0 ? verde : rojo, 'Margen ' + redond(margen) + '%')}
        </div>
      </section>

      <section class="bloque">
        <h3>🥛 Producción de leche</h3>
        <div class="flujo-cards">
          ${card('Litros producidos', redond(litrosTotal) + ' L', '', nDias + ' días registrados')}
          ${card('Promedio diario', redond(promDia) + ' L', verde)}
          ${card('Vendido', redond(vendidos) + ' L', verde, redond(pctVend) + '% se vende')}
          ${card('Uso doméstico', redond(domestico) + ' L', '', redond(100 - pctVend) + '% queda en casa')}
        </div>
        <div class="tabla-wrap" style="margin-top:14px"><table class="tabla">
          <thead><tr><th>Vaca</th><th class="num">Litros producidos</th></tr></thead>
          <tbody>${vacasOrden.length ? vacasOrden.map(v => `<tr><td>🐄 ${v}</td><td class="num">${redond(porVaca[v])} L</td></tr>`).join('') : '<tr><td colspan="2" class="vacia-fila">Sin datos por vaca</td></tr>'}</tbody>
        </table></div>
      </section>

      <section class="bloque">
        <h3>🤝 Aportes y retorno de la inversión</h3>
        <div class="flujo-cards">
          ${card('Total aportado (capital)', fmtPesos(totalAportes), verde)}
          ${card('Invertido en vacas', fmtPesos(inversionVacas), '')}
          ${card('Recuperado con leche', redond(recuperadoPct) + '%', recuperadoPct >= 100 ? verde : rojo, 'Ingreso leche ' + fmtPesos(ingresoLeche))}
          ${card('Recuperación estimada', (mesesRecuperar > 0 ? redond(mesesRecuperar) + ' meses' : '—'), '', '≈ ' + fmtPesos(ingresoMensualLeche) + '/mes de leche')}
        </div>
        <div class="tabla-wrap" style="margin-top:14px"><table class="tabla">
          <thead><tr><th>Socio</th><th class="num">Aportado</th><th class="num">% del total</th></tr></thead>
          <tbody>${aportantesOrden.length ? aportantesOrden.map(a => `<tr><td>${a}</td><td class="num">${fmtPesos(porAportante[a])}</td><td class="num">${totalAportes > 0 ? redond(porAportante[a] / totalAportes * 100) : 0}%</td></tr>`).join('') : '<tr><td colspan="3" class="vacia-fila">Sin aportes</td></tr>'}</tbody>
        </table></div>
        <p class="modulo-sub" style="margin-top:8px">* La recuperación es un estimado: invertido en vacas ÷ ingreso mensual promedio de leche.</p>
      </section>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    window.fincaOnLogin(() => {
      window.fincaDB.escucharVentas((d) => { ventas = d || {}; render(); });
      window.fincaDB.escucharIngresos((d) => { ingresos = d || {}; render(); });
      window.fincaDB.escucharEgresos((d) => { egresos = d || {}; render(); });
      window.fincaDB.escucharAportes((d) => { aportes = d || {}; render(); });
    });
    if (window.fincaOnLogout) window.fincaOnLogout(() => { desbloqueado = false; mostrarPanel(); });
  });
})();
