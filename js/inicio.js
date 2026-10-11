/* ============================================================================
 *  Modulo INICIO - Finca El Dorado
 *  - Tres tarjetas (Hoy / Semana / Mes) con la produccion por concepto:
 *    despachado y uso domestico, con la unidad de cada concepto.
 *  - Calendario con iconos en los dias que hubo venta; al pinchar un dia,
 *    muestra el resumen de ese dia al lado.
 *  Lee de finca/ventas (mismo origen que Despachado).
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const CONCEPTOS = {
    leche:    { t: 'Leche',    e: '🥛' },
    huevos:   { t: 'Huevos',   e: '🥚' },
    vacas:    { t: 'Vacas',    e: '🐄' },
    gallinas: { t: 'Gallinas', e: '🐔' },
    pollos:   { t: 'Pollos',   e: '🐤' },
    yuca:     { t: 'Yuca',     e: '🍠' },
    platano:  { t: 'Plátano',  e: '🍌' },
    pescado:  { t: 'Pescado',  e: '🐟' },
    otro:     { t: 'Otro',     e: '📦' }
  };
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DOW = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const redond = (n) => Math.round(n * 100) / 100;
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const isoLocal = (d) => { const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const fmtCorta = (iso) => { const p = iso.split('-'); return p[2] + '/' + p[1]; };
  const abrev = (u) => u === 'litros' ? 'L' : (u === 'kilos' ? 'kg' : (u === 'unidades' ? 'u' : (u || '')));
  const nombreDe = (r) => r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : ((CONCEPTOS[r.concepto] || {}).t || r.concepto);
  const emojiDe  = (r) => (CONCEPTOS[r.concepto] || {}).e || '📦';

  const HOY = new Date();
  const HOY_ISO = isoLocal(HOY);
  let shownYear = HOY.getFullYear();
  let shownMonth = HOY.getMonth(); // 0-11
  let selISO = HOY_ISO;

  let ventas = {};      // { id: registro }
  let ingresos = {};    // finca/ingresos { id: {valor, fecha, ...} }
  let egresos = {};     // finca/egresos  { id: {valor, fecha, ...} }
  let porDia = {};      // { iso: [registros] }

  // ==========================================================================
  //  HTML
  // ==========================================================================
  function construir() {
    const cont = $('vista-inicio');
    if (!cont) return;
    cont.innerHTML = `
      <div class="inicio-cards">
        <div class="card-periodo">
          <div class="card-top"><span class="card-titulo">Hoy</span><span class="card-fecha" id="fecha-hoy"></span></div>
          <div class="card-cuerpo" id="cuerpo-hoy"></div>
        </div>
        <div class="card-periodo">
          <div class="card-top"><span class="card-titulo">Semana</span><span class="card-fecha" id="fecha-semana"></span></div>
          <div class="card-cuerpo" id="cuerpo-semana"></div>
        </div>
        <div class="card-periodo card-mes">
          <div class="card-top"><span class="card-titulo">Mes <span class="card-pill">calendario</span></span><span class="card-fecha" id="fecha-mes"></span></div>
          <div class="card-cuerpo" id="cuerpo-mes"></div>
        </div>
      </div>

      <div class="inicio-cal-wrap">
        <div class="calendario">
          <div class="cal-head">
            <button class="btn-icono" id="cal-prev" title="Mes anterior">‹</button>
            <span class="cal-mes" id="cal-mes"></span>
            <button class="btn-icono" id="cal-next" title="Mes siguiente">›</button>
          </div>
          <div class="cal-totales" id="cal-totales"></div>
          <div class="cal-grid" id="cal-grid"></div>
        </div>
        <div class="cal-detalle" id="cal-detalle"></div>
      </div>
    `;
    $('cal-prev').addEventListener('click', () => cambiarMes(-1));
    $('cal-next').addEventListener('click', () => cambiarMes(1));
  }

  // ==========================================================================
  //  CALCULOS
  // ==========================================================================
  function indexar() {
    porDia = {};
    Object.keys(ventas).forEach(id => {
      const r = ventas[id];
      if (!r.fecha) return;
      (porDia[r.fecha] = porDia[r.fecha] || []).push(r);
    });
  }

  // Agrupa registros por concepto -> {nombre, emoji, unidad, despachado, domestico}
  function agrupar(regs) {
    const g = {};
    regs.forEach(r => {
      const nombre = nombreDe(r);
      const clave = nombre + '|' + (r.unidad || '');
      if (!g[clave]) g[clave] = { nombre, emoji: emojiDe(r), unidad: r.unidad || '', despachado: 0, domestico: 0 };
      g[clave].despachado += num(r.venta);
      g[clave].domestico  += num(r.domestico);
    });
    return Object.keys(g).sort().map(k => g[k]);
  }

  function rangoSemana(d) {
    const dow = (d.getDay() + 6) % 7; // Lunes = 0
    const ini = new Date(d); ini.setDate(d.getDate() - dow);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
    return [isoLocal(ini), isoLocal(fin)];
  }

  // ==========================================================================
  //  PINTAR TARJETAS
  // ==========================================================================
  function pintarTarjetas() {
    const todos = Object.values(ventas);
    const [ini, fin] = rangoSemana(HOY);

    // Hoy y Semana: fijas al momento actual (no se mueven con el calendario).
    $('fecha-hoy').textContent = fmtFecha(HOY_ISO);
    $('fecha-semana').textContent = fmtCorta(ini) + ' – ' + fmtCorta(fin);
    pintarCuerpo('cuerpo-hoy',    todos.filter(r => r.fecha === HOY_ISO));
    pintarCuerpo('cuerpo-semana', todos.filter(r => r.fecha >= ini && r.fecha <= fin));

    pintarMes(); // el Mes depende del calendario
  }

  // Tarjeta "Mes": sigue el mes que se ve en el calendario de abajo.
  function pintarMes() {
    const todos = Object.values(ventas);
    const ym = shownYear + '-' + pad(shownMonth + 1);
    $('fecha-mes').textContent = MESES[shownMonth] + ' ' + shownYear;
    pintarCuerpo('cuerpo-mes', todos.filter(r => (r.fecha || '').slice(0, 7) === ym));
  }

  function pintarCuerpo(id, regs) {
    const cont = $(id);
    if (!cont) return;
    const grupos = agrupar(regs);
    if (!grupos.length) { cont.innerHTML = '<p class="vacia">Sin producción</p>'; return; }
    cont.innerHTML = grupos.map(g => {
      const u = abrev(g.unidad);
      return `<div class="prod-linea">
        <span class="prod-nombre">${g.emoji} ${g.nombre}</span>
        <span class="prod-vals">Despachado <b>${redond(g.despachado)}</b> ${u} · Doméstico <b>${redond(g.domestico)}</b> ${u}</span>
      </div>`;
    }).join('');
  }

  // ==========================================================================
  //  CALENDARIO
  // ==========================================================================
  function cambiarMes(delta) {
    shownMonth += delta;
    if (shownMonth < 0) { shownMonth = 11; shownYear--; }
    if (shownMonth > 11) { shownMonth = 0; shownYear++; }
    pintarMes();        // la tarjeta "Mes" sigue al calendario
    pintarCalendario();
  }

  // Ingresos (leche vendida + ingresos registrados) y egresos del mes mostrado.
  function pintarTotalesMes() {
    const cont = $('cal-totales');
    if (!cont) return;
    const ym = shownYear + '-' + pad(shownMonth + 1);
    const enMes = (r) => ((r && r.fecha) || '').slice(0, 7) === ym;

    let ing = 0, egr = 0;
    Object.values(ventas).forEach(r => { if (r.concepto === 'leche' && enMes(r)) ing += num(r.venta) * num(r.precio); });
    Object.values(ingresos).forEach(r => { if (enMes(r)) ing += num(r.valor); });
    Object.values(egresos).forEach(r => { if (enMes(r)) egr += num(r.valor); });

    cont.innerHTML =
      `<span class="cal-tot ing" title="Leche vendida + ingresos registrados del mes">↑ Ingresos <b>${fmtPesos(ing)}</b></span>` +
      `<span class="cal-tot egr" title="Compras + pagos del mes">↓ Egresos <b>${fmtPesos(egr)}</b></span>`;
  }

  function pintarCalendario() {
    $('cal-mes').textContent = MESES[shownMonth] + ' ' + shownYear;
    pintarTotalesMes();
    const grid = $('cal-grid');
    let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

    const primero = new Date(shownYear, shownMonth, 1);
    const offset = (primero.getDay() + 6) % 7; // Lunes = 0
    const dias = new Date(shownYear, shownMonth + 1, 0).getDate();

    for (let i = 0; i < offset; i++) html += '<div class="cal-dia vacio"></div>';

    for (let d = 1; d <= dias; d++) {
      const iso = shownYear + '-' + pad(shownMonth + 1) + '-' + pad(d);
      const regs = porDia[iso] || [];
      const conVenta = regs.filter(r => num(r.venta) > 0);
      // Iconos: emojis unicos de los conceptos vendidos ese dia (max 3).
      const emojis = [...new Set(conVenta.map(emojiDe))].slice(0, 3).join('');
      const clases = ['cal-dia'];
      if (iso === selISO) clases.push('sel');
      if (iso === HOY_ISO) clases.push('hoy');
      html += `<div class="${clases.join(' ')}" data-iso="${iso}">
        <span class="num">${d}</span>
        <span class="marks">${emojis}</span>
      </div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.cal-dia[data-iso]').forEach(c => {
      c.addEventListener('click', () => { selISO = c.dataset.iso; pintarCalendario(); pintarDetalle(); });
    });
  }

  // ==========================================================================
  //  DETALLE DEL DIA
  //  Leche: desglose por jornada (mañana/tarde/noche...) y, dentro de cada
  //  una, por vaca, con lo despachado, el comprador y el precio. Los demas
  //  conceptos (otros) se listan como items simples.
  // ==========================================================================
  const JORNADA_ORDEN = ['mañana', 'manana', 'madrugada', 'mediodia', 'mediodía', 'tarde', 'noche'];
  function ordenJornada(j) {
    const i = JORNADA_ORDEN.indexOf((j || '').toLowerCase());
    return i === -1 ? 99 : i;
  }
  function jornadaEmoji(j) {
    const k = (j || '').toLowerCase();
    if (k.indexOf('mañ') !== -1 || k.indexOf('man') !== -1 || k.indexOf('madr') !== -1) return '🌅';
    if (k.indexOf('tard') !== -1) return '🌇';
    if (k.indexOf('noch') !== -1) return '🌙';
    return '🕘';
  }

  function pintarDetalle() {
    const cont = $('cal-detalle');
    if (!cont) return;
    const regs = porDia[selISO] || [];
    let html = `<h3 class="det-fecha">${fmtFecha(selISO)}</h3>`;
    if (!regs.length) {
      cont.innerHTML = html + '<p class="vacia">Sin registros ese día</p>';
      return;
    }

    const leche = regs.filter(r => r.concepto === 'leche');
    const otros = regs.filter(r => r.concepto !== 'leche');

    // --- Leche: agrupado por jornada -> filas por vaca ---
    if (leche.length) {
      const porJornada = {};
      leche.forEach(r => { const j = r.jornada || 'Sin jornada'; (porJornada[j] = porJornada[j] || []).push(r); });
      const jornadas = Object.keys(porJornada).sort((a, b) => (ordenJornada(a) - ordenJornada(b)) || a.localeCompare(b));

      html += jornadas.map(j => {
        const filas = porJornada[j].slice().sort((a, b) => (a.vaca || '').localeCompare(b.vaca || ''));
        const litros = filas.reduce((a, r) => a + num(r.venta), 0);
        const subtotal = filas.reduce((a, r) => a + num(r.venta) * num(r.precio), 0);
        const cuerpo = filas.map(r => {
          const precio = num(r.precio) > 0 ? fmtPesos(num(r.precio)) + '/L' : 'sin precio';
          const total = num(r.precio) > 0 ? ' · ' + fmtPesos(num(r.venta) * num(r.precio)) : '';
          const comp = r.comprador ? ' · ' + r.comprador : '';
          const dom = num(r.domestico) > 0 ? ` <span class="dv-dom">(dom. ${redond(num(r.domestico))} L)</span>` : '';
          return `<div class="dv-row">
            <span class="dv-vaca">🐄 ${r.vaca || 'Sin asignar'}${dom}</span>
            <span class="dv-vals"><b>${redond(num(r.venta))} L</b>${comp} · ${precio}${total}</span>
          </div>`;
        }).join('');
        return `<div class="det-jornada">
          <div class="det-jornada-tit">${jornadaEmoji(j)} ${j} <span class="dj-sub">${redond(litros)} L${subtotal > 0 ? ' · ' + fmtPesos(subtotal) : ''}</span></div>
          ${cuerpo}
        </div>`;
      }).join('');
    }

    // --- Otros conceptos (no leche): items simples ---
    if (otros.length) {
      html += otros.map(r => {
        const u = abrev(r.unidad);
        const nombre = nombreDe(r);
        const cobro = num(r.precio) > 0 ? ' · ' + fmtPesos(num(r.venta) * num(r.precio)) : '';
        const comp = r.comprador ? ' → ' + r.comprador : '';
        const dom = num(r.domestico) > 0 ? `<div class="det-sub">Doméstico: ${redond(num(r.domestico))} ${u}${r.descDomestico ? ' (' + r.descDomestico + ')' : ''}</div>` : '';
        return `<div class="det-item">
          <div class="det-top">${emojiDe(r)} ${nombre}${r.jornada ? ' · <b>' + r.jornada + '</b>' : ''}</div>
          <div class="det-sub">Despachado: <b>${redond(num(r.venta))} ${u}</b>${comp}${cobro}</div>
          ${dom}
        </div>`;
      }).join('');
    }

    cont.innerHTML = html;
  }

  const fmtPesos = (n) => {
    n = Math.round(num(n));
    const s = Math.abs(n).toString();
    let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };

  // ==========================================================================
  //  ARRANQUE
  // ==========================================================================
  function refrescar() {
    indexar();
    pintarTarjetas();
    pintarCalendario();
    pintarDetalle();
  }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    pintarTarjetas();
    pintarCalendario();
    pintarDetalle();
    window.fincaOnLogin(() => {
      window.fincaDB.escucharVentas((datos) => { ventas = datos || {}; refrescar(); });
      window.fincaDB.escucharIngresos((d) => { ingresos = d || {}; pintarTotalesMes(); });
      window.fincaDB.escucharEgresos((d) => { egresos = d || {}; pintarTotalesMes(); });
    });
  });
})();
