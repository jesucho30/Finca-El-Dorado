/* ============================================================================
 *  Modulo DESPACHADO (interno: ventas) - Finca El Dorado
 *  - Boton "+ Nuevo despacho" abre un formulario (modal).
 *  - Campos: concepto, cantidad total, para vender, uso domestico (auto),
 *    precio por unidad, total a cobrar (auto), fecha, jornada, comprador.
 *  - Resumen por producto + Cuentas por comprador (litros y dinero).
 *  - Historial completo con boton de editar por fila.
 *  - Respeta el interruptor global de ediciones (Configuracion).
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // Conceptos: valor, titulo, unidad y emoji. "leche" en litros (requisito).
  const CONCEPTOS = [
    { v: 'leche',    t: 'Leche',    u: 'litros',   e: '🥛' },
    { v: 'huevos',   t: 'Huevos',   u: 'unidades', e: '🥚' },
    { v: 'vacas',    t: 'Vacas',    u: 'unidades', e: '🐄' },
    { v: 'gallinas', t: 'Gallinas', u: 'unidades', e: '🐔' },
    { v: 'pollos',   t: 'Pollos',   u: 'unidades', e: '🐤' },
    { v: 'yuca',     t: 'Yuca',     u: 'kilos',    e: '🍠' },
    { v: 'platano',  t: 'Plátano',  u: 'unidades', e: '🍌' },
    { v: 'pescado',  t: 'Pescado',  u: 'kilos',    e: '🐟' },
    { v: 'otro',     t: 'Otro',     u: 'unidades', e: '📦' }
  ];
  // Conceptos que van en la tarjeta "Otros" (todos menos leche).
  const CONCEPTOS_OTROS = CONCEPTOS.filter(c => c.v !== 'leche');
  // Productos personalizados que el usuario agrega en Configuración
  // (finca/config/productosExtra { slug: {nombre, unidad} }). Se suman a la lista.
  function getProductosExtra() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    const p = cfg && cfg.productosExtra;
    if (p && typeof p === 'object') {
      return Object.keys(p).map(k => ({ v: k, t: (p[k].nombre || k), u: (p[k].unidad || 'unidades'), e: '📦' })).filter(x => x.t);
    }
    return [];
  }
  function getConceptos() { return CONCEPTOS.concat(getProductosExtra()); }
  const emojiConcepto = (v) => { const c = getConceptos().find(x => x.v === v); return c ? c.e : '📦'; };
  const abrev = (u) => u === 'litros' ? 'L' : (u === 'kilos' ? 'kg' : (u === 'unidades' ? 'u' : (u || '')));
  // Jornadas configurables (finca/config/jornadas); por defecto Mañana/Tarde.
  function getJornadas() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    return (cfg && Array.isArray(cfg.jornadas) && cfg.jornadas.length) ? cfg.jornadas : ['Mañana', 'Tarde'];
  }

  // Estado de las tarjetas: cada una tiene su periodo (hoy/semana/mes/fecha)
  // y, si es 'fecha', el día exacto elegido en su selector.
  let periodoLeche = 'hoy', fechaLeche = '';
  let periodoOtros = 'hoy', fechaOtros = '';
  // Filtro de fecha del historial (vacío = sin filtro).
  let fechaHist = '';

  // Compradores por defecto (si Configuracion aun no tiene nada definido).
  // Cada uno: nombre, precio por unidad y jornada en la que suele comprar.
  const COMPRADORES_DEFECTO = [
    { nombre: 'Janer', precio: 1600, jornada: 'Mañana' },
    { nombre: 'Nena',  precio: 1800, jornada: 'Tarde'  }
  ];

  // Lee los compradores desde Configuracion (finca/config/compradores),
  // o usa los de por defecto. Devuelve un array [{nombre, precio, jornada}].
  function getCompradores() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    const c = cfg && cfg.compradores;
    if (c && typeof c === 'object') {
      const arr = Object.keys(c).map(k => ({
        nombre: c[k].nombre || k,
        precio: num(c[k].precio),
        jornada: c[k].jornada || ''
      })).filter(x => x.nombre);
      if (arr.length) return arr;
    }
    return COMPRADORES_DEFECTO;
  }
  // Lee las vacas desde Configuracion (finca/config/vacas) -> [{nombre, img}].
  // Compatibilidad: si solo existe la vaca unica antigua, la devuelve como lista.
  function getVacas() {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    const v = cfg && cfg.vacas;
    if (v && typeof v === 'object' && Object.keys(v).length) {
      return Object.keys(v).map(k => ({ nombre: v[k].nombre || k, img: v[k].img || '' })).filter(x => x.nombre);
    }
    if (cfg && cfg.vacaNombre) return [{ nombre: cfg.vacaNombre, img: cfg.vacaImg || '' }];
    return [];
  }
  const vacaPorNombre = (n) => getVacas().find(v => v.nombre === n);

  // Imagen configurada para un producto de "Otros" (finca/config/productos).
  function getProductoImg(conceptoV) {
    const cfg = window.fincaConfig ? window.fincaConfig() : {};
    const p = cfg && cfg.productos;
    return (p && p[conceptoV]) ? p[conceptoV] : '';
  }

  const compradorPorNombre = (n) => getCompradores().find(c => c.nombre === n);
  const compradorPorJornada = (j) => getCompradores().find(c => c.jornada === j);

  const unidadDe = (v) => { const c = getConceptos().find(x => x.v === v); return c ? c.u : 'unidades'; };
  const tituloDe = (v) => { const c = getConceptos().find(x => x.v === v); return c ? c.t : v; };
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const redond = (n) => Math.round(n * 100) / 100;
  const hoyISO = () => {
    const d = new Date(); const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  };
  const fmtFecha = (iso) => { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0].slice(2); };
  // Formato de pesos colombianos: 153000 -> "$ 153.000"
  const fmtPesos = (n) => {
    n = Math.round(num(n));
    const s = Math.abs(n).toString();
    let r = '';
    for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) r += '.'; r += s[i]; }
    return '$ ' + (n < 0 ? '-' : '') + r;
  };
  const totalCobrarDe = (r) => redond(num(r.venta) * num(r.precio));

  // Fecha de hoy y rango de la semana (lunes a domingo) para las tarjetas.
  const isoLocal = (d) => { const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 10); };
  const HOY = new Date();
  const HOY_ISO = isoLocal(HOY);
  function rangoSemana(d) {
    const dow = (d.getDay() + 6) % 7; // Lunes = 0
    const ini = new Date(d); ini.setDate(d.getDate() - dow);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
    return [isoLocal(ini), isoLocal(fin)];
  }

  let ventas = {};      // { id: registro }
  let editId = null;    // id en edicion (null = nueva)

  // ==========================================================================
  //  ESTRUCTURA HTML DEL MODULO
  // ==========================================================================
  function construir() {
    const cont = $('vista-ventas');
    if (!cont) return;

    const opcionesConcepto = getConceptos().map(c => `<option value="${c.v}">${c.t}</option>`).join('');
    const opcionesComprador = getCompradores().map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const opcionesVaca = getVacas().map(v => `<option value="${v.nombre}">${v.nombre}</option>`).join('');
    const opcionesJornada = getJornadas().map(j => `<option value="${j}">${j}</option>`).join('');

    cont.innerHTML = `
      <div class="modulo-head">
        <p class="modulo-sub">Lo que sale de la finca: cuánto se ordeña, cuánto se entrega y cuánto se cobra.</p>
        <button id="btn-nueva-venta" class="btn-acento">+ Nuevo despacho</button>
      </div>

      <div class="desp-cards" id="desp-cards"></div>

      <section class="bloque">
        <div class="bloque-head">
          <h3>Historial</h3>
          <div class="fecha-filtro">
            <input type="date" id="vt-fecha-hist" class="fecha-sel" title="Filtrar el historial por un día">
            <button id="vt-fecha-clear" class="fecha-sel-clear oculto" type="button" title="Quitar el filtro de fecha">✕</button>
            <button id="vt-corregir-dia" class="btn-plano oculto" type="button" title="Corregir todas las entregas de este día">✏️ Corregir día</button>
          </div>
          <span style="flex:1"></span>
          <button id="btn-descargar" class="btn-plano" type="button">⬇ Descargar</button>
        </div>
        <div id="vt-fecha-resumen" class="fecha-resumen oculto"></div>
        <input type="search" id="vt-buscar" class="buscar" placeholder="🔎 Buscar por fecha, jornada, concepto, comprador o valor...">
        <div id="vt-total-filtrado" class="total-filtrado oculto"></div>
        <div class="tabla-wrap">
          <table class="tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Jornada</th><th>Concepto</th>
                <th class="num">Venta</th><th class="num">Doméstico</th>
                <th>Uso</th><th>Comprador</th><th class="num">Total $</th><th></th>
              </tr>
            </thead>
            <tbody id="ventas-historial"></tbody>
          </table>
        </div>
      </section>

      <!-- ===== MODAL FORMULARIO ===== -->
      <div id="venta-modal" class="modal oculto">
        <div class="modal-card">
          <div class="modal-head">
            <h3 id="venta-modal-titulo">Nuevo despacho</h3>
            <button id="venta-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <form id="form-venta">
            <div class="fila-dos">
              <label class="campo">
                <span>Producto</span>
                <select id="vt-concepto">${opcionesConcepto}</select>
              </label>
              <label class="campo" id="vt-vaca-wrap">
                <span>Concepto <em>(vaca)</em></span>
                <select id="vt-vaca"><option value="">— Sin vaca —</option>${opcionesVaca}</select>
              </label>
            </div>
            <label class="campo oculto" id="vt-otro-wrap">
              <span>¿Cuál? (especificar)</span>
              <input type="text" id="vt-otro" placeholder="Nombre del producto">
            </label>

            <div class="fila-dos">
              <label class="campo">
                <span>Fecha</span>
                <input type="date" id="vt-fecha">
              </label>
              <label class="campo">
                <span>Jornada</span>
                <select id="vt-jornada">${opcionesJornada}</select>
              </label>
            </div>

            <div class="fila-dos">
              <label class="campo">
                <span>Comprador</span>
                <select id="vt-comprador"><option value="">— Selecciona —</option>${opcionesComprador}</select>
              </label>
              <label class="campo">
                <span>Precio por <em id="vt-u-precio">litro</em> ($)</span>
                <input type="number" id="vt-precio" min="0" step="1" inputmode="numeric" placeholder="0">
              </label>
            </div>

            <div id="vt-multi" class="oculto">
              <div class="campo"><span>Producción por vaca <em>(produjo · vende · doméstico automático)</em></span></div>
              <div class="vt-multi-tabla">
                <div class="vt-multi-head"><span>Vaca</span><span>Produjo</span><span>Vende</span><span>Dom.</span></div>
                <div id="vt-multi-filas"></div>
                <div class="vt-multi-fila vt-multi-totales">
                  <span class="vt-mf-nombre">Totales</span>
                  <span class="vt-mt"><b id="vt-mt-prod">0</b> L</span>
                  <span class="vt-mt"><b id="vt-mt-vende">0</b> L</span>
                  <span class="vt-mt"><b id="vt-mt-dom">0</b> L</span>
                </div>
              </div>
            </div>

            <label class="campo" id="vt-cant-wrap">
              <span>Cantidad total (<em id="vt-u-cant">litros</em>)</span>
              <input type="number" id="vt-cant" min="0" step="0.01" inputmode="decimal" placeholder="0">
            </label>

            <div class="fila-dos" id="vt-venta-wrap">
              <label class="campo">
                <span>Para vender (<em id="vt-u-venta">litros</em>)</span>
                <input type="number" id="vt-venta" min="0" step="0.01" inputmode="decimal" placeholder="0">
              </label>
              <label class="campo">
                <span>Uso doméstico (<em id="vt-u-dom">litros</em>)</span>
                <input type="number" id="vt-domestico" readonly tabindex="-1" placeholder="0">
              </label>
            </div>

            <label class="campo">
              <span>Elegir o describir uso doméstico</span>
              <input type="text" id="vt-desc-dom" list="vt-usos" placeholder="Terneros, Consumo, Seño Jesusita...">
              <datalist id="vt-usos">
                <option value="Terneros"></option>
                <option value="Consumo"></option>
                <option value="Seño Jesusita"></option>
                <option value="Fernando"></option>
                <option value="Santiago"></option>
                <option value="Otro"></option>
              </datalist>
            </label>

            <p id="vt-msg" class="msg"></p>

            <div class="modal-acciones">
              <button type="button" id="vt-eliminar" class="btn-peligro oculto">Eliminar</button>
              <span style="flex:1"></span>
              <button type="button" id="vt-cancelar" class="btn-plano">Cancelar</button>
              <button type="submit" class="btn-acento">Guardar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ===== MODAL CORREGIR DÍA (todas las entregas de una fecha) ===== -->
      <div id="dia-modal" class="modal oculto">
        <div class="modal-card modal-card-ancho">
          <div class="modal-head">
            <h3 id="dia-titulo">Corregir el día</h3>
            <button id="dia-cerrar" class="btn-icono" title="Cerrar">✕</button>
          </div>
          <div id="dia-cuerpo"></div>
          <p id="dia-msg" class="msg"></p>
          <div class="modal-acciones">
            <span style="flex:1"></span>
            <button type="button" id="dia-cancelar" class="btn-plano">Cancelar</button>
            <button type="button" id="dia-guardar" class="btn-acento">Guardar cambios</button>
          </div>
        </div>
      </div>
    `;

    enlazarEventos();
  }

  // ==========================================================================
  //  EVENTOS
  // ==========================================================================
  function enlazarEventos() {
    $('btn-nueva-venta').addEventListener('click', () => abrirModal(null));
    $('venta-cerrar').addEventListener('click', cerrarModal);
    $('vt-cancelar').addEventListener('click', cerrarModal);
    $('venta-modal').addEventListener('click', (e) => { if (e.target.id === 'venta-modal') cerrarModal(); });

    // Al cambiar el producto: actualizar unidades y activar/desactivar la vaca.
    $('vt-concepto').addEventListener('change', actualizarUnidades);
    // Uso doméstico = cantidad − para vender (se calcula solo).
    $('vt-cant').addEventListener('input', recalcDomestico);
    $('vt-venta').addEventListener('input', recalcDomestico);
    // Autocompletar comprador + precio segun la jornada (desde Configuracion).
    $('vt-jornada').addEventListener('change', autollenarPorJornada);
    // Al elegir comprador, traer su precio definido en Configuracion.
    $('vt-comprador').addEventListener('change', autollenarPorComprador);

    $('form-venta').addEventListener('submit', guardar);
    $('vt-eliminar').addEventListener('click', eliminar);
    $('btn-descargar').addEventListener('click', descargarHistorial);
    $('vt-buscar').addEventListener('input', pintarHistorial);
    $('vt-fecha-hist').addEventListener('change', () => { fechaHist = $('vt-fecha-hist').value; pintarHistorial(); });
    $('vt-fecha-clear').addEventListener('click', () => { fechaHist = ''; $('vt-fecha-hist').value = ''; pintarHistorial(); });
    $('vt-corregir-dia').addEventListener('click', () => { if (fechaHist) abrirDia(fechaHist); });
    $('dia-cerrar').addEventListener('click', cerrarDia);
    $('dia-cancelar').addEventListener('click', cerrarDia);
    $('dia-modal').addEventListener('click', (e) => { if (e.target.id === 'dia-modal') cerrarDia(); });
    $('dia-guardar').addEventListener('click', guardarDia);
  }

  // Resumen del día elegido: dos cuadros (Mañana y Tarde) con la suma de la
  // venta (despachado, con un punto verde) y, al lado, el uso doméstico (leche).
  // Conserva el dinero por jornada y un total del día.
  function resumenFecha(fecha) {
    const recs = Object.keys(ventas).map(k => ventas[k]).filter(r => (r.fecha || '') === fecha);
    let manDesp = 0, manDom = 0, manDin = 0, tarDesp = 0, tarDom = 0, tarDin = 0;
    let tDesp = 0, tDom = 0, tDin = 0;
    recs.forEach(r => {
      const esLeche = r.concepto === 'leche';
      const desp = esLeche ? num(r.venta) : 0;
      const dom  = esLeche ? num(r.domestico) : 0;
      const din  = totalCobrarDe(r);
      tDesp += desp; tDom += dom; tDin += din;
      const j = (r.jornada || '').toLowerCase();
      if (j.indexOf('mañ') !== -1 || j.indexOf('man') !== -1) { manDesp += desp; manDom += dom; manDin += din; }
      else if (j.indexOf('tard') !== -1) { tarDesp += desp; tarDom += dom; tarDin += din; }
    });
    const card = (emoji, titulo, desp, dom, din) => `
      <div class="hist-jcard">
        <div class="hist-jtit">${emoji} ${titulo}</div>
        <div class="hist-jstats">
          <span class="hist-stat"><span class="hist-dot"></span>Despachado <b>${redond(desp)} L</b></span>
          <span class="hist-stat hist-dom">Doméstico <b>${redond(dom)} L</b></span>
        </div>
        <div class="hist-jdin">${fmtPesos(din)}</div>
      </div>`;
    return `<div class="hist-resumen">
      <div class="hist-jornadas">${card('🌅', 'Mañana', manDesp, manDom, manDin)}${card('🌇', 'Tarde', tarDesp, tarDom, tarDin)}</div>
      <div class="hist-jtotal">Total ${fmtFecha(fecha)}: <b>${redond(tDesp)} L</b> despachado · <b>${redond(tDom)} L</b> doméstico · <b>${fmtPesos(tDin)}</b></div>
    </div>`;
  }

  // Uso doméstico = lo que sobra de la cantidad después de lo que se vende.
  function recalcDomestico() {
    const dom = redond(Math.max(0, num($('vt-cant').value) - num($('vt-venta').value)));
    $('vt-domestico').value = dom;
  }

  // ---- Modo "varias vacas" (solo Leche y registro NUEVO) -------------------
  // Permite meter la producción de todas las vacas a la vez; cada vaca: produjo,
  // vende y doméstico (auto = produjo − vende). Al guardar crea un registro por
  // vaca (con producción > 0), igual que el historial detallado de siempre.
  function modoMulti() { return !editId && $('vt-concepto').value === 'leche'; }

  function aplicarModo() {
    const multi = modoMulti();
    const setOc = (id, oc) => { const el = $(id); if (el) el.classList.toggle('oculto', oc); };
    setOc('vt-multi', !multi);
    setOc('vt-vaca-wrap', multi);
    setOc('vt-cant-wrap', multi);
    setOc('vt-venta-wrap', multi);
    if (multi) construirFilasMulti();
  }

  function construirFilasMulti() {
    const cont = $('vt-multi-filas');
    if (!cont) return;
    const vacas = getVacas();
    if (!vacas.length) { cont.innerHTML = '<p class="desp-sinvacas">Agrega vacas en Configuración.</p>'; recalcMulti(); return; }
    cont.innerHTML = vacas.map(v => `
      <div class="vt-multi-fila" data-vaca="${v.nombre}">
        <span class="vt-mf-nombre">🐄 ${v.nombre}</span>
        <input type="number" class="vt-mf-prod" min="0" step="0.01" inputmode="decimal" placeholder="0">
        <input type="number" class="vt-mf-vende" min="0" step="0.01" inputmode="decimal" placeholder="0">
        <span class="vt-mf-dom">0</span>
      </div>`).join('');
    cont.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcMulti));
    recalcMulti();
  }

  function recalcMulti() {
    let tp = 0, tv = 0, td = 0;
    const cont = $('vt-multi-filas');
    if (cont) cont.querySelectorAll('.vt-multi-fila').forEach(f => {
      const prod = num(f.querySelector('.vt-mf-prod').value);
      const vende = num(f.querySelector('.vt-mf-vende').value);
      const dom = redond(Math.max(0, prod - vende));
      f.querySelector('.vt-mf-dom').textContent = dom;
      tp += prod; tv += vende; td += dom;
    });
    if ($('vt-mt-prod'))  $('vt-mt-prod').textContent  = redond(tp);
    if ($('vt-mt-vende')) $('vt-mt-vende').textContent = redond(tv);
    if ($('vt-mt-dom'))   $('vt-mt-dom').textContent   = redond(td);
  }

  async function guardarMulti(e, msg) {
    const cont = $('vt-multi-filas');
    const filas = cont ? [...cont.querySelectorAll('.vt-multi-fila')] : [];
    const datos = [];
    for (const f of filas) {
      const prod = redond(num(f.querySelector('.vt-mf-prod').value));
      const vende = redond(num(f.querySelector('.vt-mf-vende').value));
      if (prod <= 0) continue;
      if (vende > prod) return error(msg, 'En ' + f.dataset.vaca + ', lo de vender no puede ser más que lo que produjo.');
      datos.push({ vaca: f.dataset.vaca, prod: prod, vende: vende, dom: redond(Math.max(0, prod - vende)) });
    }
    if (!datos.length) { cerrarModal(); return; } // ninguna vaca produjo: nada que guardar
    // El comprador es opcional: si nadie compró ese día, se deja sin comprador.
    const base = {
      concepto: 'leche', conceptoOtro: '', unidad: 'litros',
      descDomestico: $('vt-desc-dom').value.trim(),
      precio: redond(num($('vt-precio').value)),
      fecha: $('vt-fecha').value || hoyISO(),
      jornada: $('vt-jornada').value,
      comprador: $('vt-comprador').value,
      por: (window.fincaAuth.currentUser() || {}).email || ''
    };
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      for (const d of datos) {
        await window.fincaDB.agregarVenta(Object.assign({}, base, { total: d.prod, venta: d.vende, domestico: d.dom, vaca: d.vaca }));
      }
      cerrarModal();
    } catch (err) {
      error(msg, 'No se pudo guardar: ' + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Descarga el historial completo como archivo CSV (abre en Excel).
  function descargarHistorial() {
    const ids = Object.keys(ventas);
    if (!ids.length) { alert('No hay registros para descargar.'); return; }
    ids.sort((a, b) => {
      const ra = ventas[a], rb = ventas[b];
      if (ra.fecha !== rb.fecha) return (ra.fecha || '').localeCompare(rb.fecha || '');
      return (ra.jornada || '').localeCompare(rb.jornada || '');
    });
    const sep = ';';
    const esc = (v) => { v = (v == null ? '' : String(v)); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const cab = ['Fecha', 'Jornada', 'Producto', 'Vaca', 'Total', 'Para vender', 'Domestico', 'Uso domestico', 'Comprador', 'Precio', 'Total a cobrar'];
    const filas = ids.map(id => {
      const r = ventas[id];
      const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
      return [
        r.fecha || '', r.jornada || '', nombre, r.vaca || '',
        redond(num(r.total)), redond(num(r.venta)), redond(num(r.domestico)),
        r.descDomestico || '', r.comprador || '',
        num(r.precio) || '', redond(totalCobrarDe(r))
      ].map(esc).join(sep);
    });
    const csv = String.fromCharCode(0xFEFF) + [cab.join(sep)].concat(filas).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'despachado-el-dorado.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // Rellena comprador y precio a partir de la jornada elegida.
  function autollenarPorJornada() {
    const c = compradorPorJornada($('vt-jornada').value);
    if (c) {
      $('vt-comprador').value = c.nombre;
      if (num(c.precio) > 0) $('vt-precio').value = c.precio;
    }
  }

  // Rellena el precio a partir del comprador elegido.
  function autollenarPorComprador() {
    const c = compradorPorNombre($('vt-comprador').value);
    if (c && num(c.precio) > 0) $('vt-precio').value = c.precio;
  }

  // Reconstruye el dropdown de compradores cuando cambia la Configuracion.
  function reconstruirCompradores() {
    const sel = $('vt-comprador');
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = '<option value="">— Selecciona —</option>' +
      getCompradores().map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    sel.value = actual;
  }

  // Reconstruye el dropdown de vacas cuando cambia la Configuracion.
  function reconstruirVacas() {
    const sel = $('vt-vaca');
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = '<option value="">— Sin vaca —</option>' +
      getVacas().map(v => `<option value="${v.nombre}">${v.nombre}</option>`).join('');
    sel.value = actual;
  }

  // Reconstruye el dropdown de jornadas cuando cambia la Configuracion.
  function reconstruirJornadas() {
    const sel = $('vt-jornada');
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = getJornadas().map(j => `<option value="${j}">${j}</option>`).join('');
    if (getJornadas().indexOf(actual) !== -1) sel.value = actual;
  }

  // Reconstruye el dropdown de Producto (incluye los productos personalizados).
  function reconstruirConceptos() {
    const sel = $('vt-concepto');
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = getConceptos().map(c => `<option value="${c.v}">${c.t}</option>`).join('');
    if (getConceptos().some(c => c.v === actual)) sel.value = actual;
    actualizarUnidades();
  }

  function actualizarUnidades() {
    const v = $('vt-concepto').value;
    const u = unidadDe(v);
    $('vt-u-cant').textContent = u;
    $('vt-u-venta').textContent = u;
    $('vt-u-dom').textContent = u;
    // Precio "por litro" / "por unidad" / "por kilo" (singular aproximado).
    $('vt-u-precio').textContent = u === 'litros' ? 'litro' : (u === 'kilos' ? 'kilo' : 'unidad');
    $('vt-otro-wrap').classList.toggle('oculto', v !== 'otro');
    // El campo "Concepto" (vaca) solo se activa si el producto es Leche.
    const sel = $('vt-vaca');
    if (v === 'leche') {
      sel.disabled = false;
    } else {
      sel.value = '';
      sel.disabled = true;
    }
    aplicarModo();
  }

  // ==========================================================================
  //  MODAL: abrir / cerrar
  // ==========================================================================
  function abrirModal(id) {
    if (id && window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      alert('Las ediciones están desactivadas (o tu usuario no puede editar).');
      return;
    }
    if (!id && window.fincaPuedeCrear && !window.fincaPuedeCrear()) {
      alert('Tu usuario es de solo lectura.');
      return;
    }
    editId = id;
    const esEdicion = !!id;
    $('venta-modal-titulo').textContent = esEdicion ? 'Editar despacho' : 'Nuevo despacho';
    $('vt-eliminar').classList.toggle('oculto', !esEdicion);
    $('vt-msg').textContent = '';

    const r = esEdicion ? ventas[id] : null;
    $('vt-concepto').value   = r ? r.concepto : 'leche';
    $('vt-otro').value       = r && r.conceptoOtro ? r.conceptoOtro : '';
    $('vt-cant').value       = r && r.total ? r.total : '';
    $('vt-venta').value      = r && r.venta ? r.venta : '';
    $('vt-domestico').value  = r && r.domestico ? r.domestico : '';
    $('vt-precio').value     = r && r.precio ? r.precio : '';
    $('vt-desc-dom').value   = r && r.descDomestico ? r.descDomestico : '';
    $('vt-fecha').value      = r && r.fecha ? r.fecha : hoyISO();
    $('vt-jornada').value    = r && r.jornada ? r.jornada : 'Mañana';
    $('vt-comprador').value  = r && r.comprador ? r.comprador : '';
    $('vt-vaca').value       = r && r.vaca ? r.vaca : '';

    actualizarUnidades(); // tambien activa/desactiva el campo de vaca
    if (!r) recalcDomestico(); // en nuevo, doméstico arranca calculado
    $('venta-modal').classList.remove('oculto');
  }

  function cerrarModal() {
    $('venta-modal').classList.add('oculto');
    editId = null;
  }

  // ==========================================================================
  //  GUARDAR / ELIMINAR
  // ==========================================================================
  async function guardar(e) {
    e.preventDefault();
    const msg = $('vt-msg');
    if (editId && window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      return error(msg, 'Editar está desactivado (o tu usuario no puede editar).');
    }
    if (!editId && window.fincaPuedeCrear && !window.fincaPuedeCrear()) {
      return error(msg, 'Tu usuario es de solo lectura.');
    }
    if (modoMulti()) return guardarMulti(e, msg);
    const concepto = $('vt-concepto').value;
    const total = redond(num($('vt-cant').value));
    const venta = redond(num($('vt-venta').value));
    const domestico = redond(Math.max(0, total - venta));

    if (total < 0)     { return error(msg, 'La cantidad no puede ser negativa.'); }
    if (venta > total) { return error(msg, 'Lo de vender no puede ser más que la cantidad total.'); }
    if (concepto === 'otro' && !$('vt-otro').value.trim()) { return error(msg, 'Escribe cuál es el producto.'); }

    const reg = {
      concepto: concepto,
      conceptoOtro: concepto === 'otro' ? $('vt-otro').value.trim() : '',
      unidad: unidadDe(concepto),
      total: redond(total),
      venta: redond(venta),
      domestico: domestico,
      descDomestico: $('vt-desc-dom').value.trim(),
      precio: redond(num($('vt-precio').value)),
      fecha: $('vt-fecha').value || hoyISO(),
      jornada: $('vt-jornada').value,
      comprador: $('vt-comprador').value,
      vaca: concepto === 'leche' ? $('vt-vaca').value : '',
      por: (window.fincaAuth.currentUser() || {}).email || ''
    };

    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (editId) await window.fincaDB.editarVenta(editId, reg);
      else        await window.fincaDB.agregarVenta(reg);
      cerrarModal();
    } catch (err) {
      error(msg, 'No se pudo guardar: ' + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function eliminar() {
    if (!editId) return;
    if (window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      return error($('vt-msg'), 'Las ediciones están desactivadas en Configuración.');
    }
    if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
    try {
      await window.fincaDB.eliminarVenta(editId);
      cerrarModal();
    } catch (err) {
      error($('vt-msg'), 'No se pudo eliminar: ' + (err.message || err));
    }
  }

  function error(box, txt) { box.textContent = txt; box.className = 'msg err'; }

  // ==========================================================================
  //  PINTAR: resumen + cuentas + historial
  // ==========================================================================
  function pintar() {
    pintarCards();
    pintarHistorial();
    aplicarPermisos();
  }

  // -- Tarjetas Hoy / Semana / Mes (solo leche), desglosadas POR VACA --------
  // Suma la leche del periodo agrupada por vaca + un grupo "Sin asignar".
  // Acumula por jornada (dinámico, segun Configuracion) + uso domestico.
  function sumarPeriodo(filtro) {
    const nueva = () => ({ jor: {}, dom: 0 });
    const porVaca = {};
    const sin = nueva(); sin.hay = false;
    Object.keys(ventas).forEach(id => {
      const r = ventas[id];
      if (r.concepto !== 'leche') return;
      if (!filtro(r.fecha || '')) return;
      const dest = r.vaca ? (porVaca[r.vaca] = porVaca[r.vaca] || nueva()) : sin;
      const j = r.jornada || '';
      dest.jor[j] = (dest.jor[j] || 0) + num(r.venta);
      dest.dom += num(r.domestico);
      if (!r.vaca) sin.hay = true;
    });
    return { porVaca, sin };
  }

  // Construye las líneas etiqueta/valor de una vaca: una por jornada + doméstico.
  function lineasLeche(s) {
    s = s || { jor: {}, dom: 0 };
    const lineas = getJornadas().map(j => [j, redond(s.jor[j] || 0) + ' L']);
    lineas.push(['Doméstico', redond(s.dom) + ' L']);
    return lineas;
  }

  // Una columna compacta: imagen arriba, nombre, y líneas etiqueta/valor.
  function colItem(nombre, imgHtml, lineas) {
    const nums = lineas.map(l => `<div><span>${l[0]}</span><b>${l[1]}</b></div>`).join('');
    return `<div class="desp-vaca-col">
      <div class="desp-vaca-img">${imgHtml}</div>
      <span class="desp-vaca-nombre">${nombre}</span>
      <div class="desp-col-nums">${nums}</div>
    </div>`;
  }

  // Devuelve el filtro de fechas según el periodo y, si aplica, el día exacto.
  function filtroDe(periodo, fecha) {
    const [ini, fin] = rangoSemana(HOY);
    const ym = HOY_ISO.slice(0, 7);
    if (periodo === 'fecha' && fecha) return (d) => d === fecha;
    if (periodo === 'hoy')    return (d) => d === HOY_ISO;
    if (periodo === 'semana') return (d) => d >= ini && d <= fin;
    return (d) => d.slice(0, 7) === ym;
  }

  // Suma los productos NO-leche del periodo, agrupados por concepto.
  function sumarOtros(filtro) {
    const g = {};
    Object.keys(ventas).forEach(id => {
      const r = ventas[id];
      if (r.concepto === 'leche') return;
      if (!filtro(r.fecha || '')) return;
      const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
      const key = r.concepto === 'otro' ? 'otro:' + nombre : r.concepto;
      if (!g[key]) g[key] = { concepto: r.concepto, nombre, unidad: r.unidad || '', despachado: 0, dom: 0 };
      g[key].despachado += num(r.venta);
      g[key].dom += num(r.domestico);
    });
    return g;
  }

  // Controles de una tarjeta: selector de fecha (a la izquierda) + toggle
  // Hoy/Semana/Mes (a la derecha). Si hay día elegido, ningún toggle queda activo.
  function controlesCard(periodo, fecha) {
    const act = (p) => (periodo === p ? 'active' : '');
    return `<div class="desp-controls">
      <input type="date" class="fecha-sel" value="${fecha || ''}" title="Ver un día exacto">
      <div class="desp-toggle">
        <button data-p="hoy" class="${act('hoy')}">Hoy</button>
        <button data-p="semana" class="${act('semana')}">Semana</button>
        <button data-p="mes" class="${act('mes')}">Mes</button>
      </div>
    </div>`;
  }

  function pintarCards() {
    const cont = $('desp-cards');
    if (!cont) return;
    const filtroL = filtroDe(periodoLeche, fechaLeche);
    const filtroO = filtroDe(periodoOtros, fechaOtros);

    // ---- Tarjeta LECHE (selector de fecha + toggle, por vaca) ----
    const sLeche = sumarPeriodo(filtroL);
    let colsLeche = '';
    getVacas().forEach(v => {
      const img = v.img ? `<img src="${v.img}" alt="vaca">` : '<span class="desp-emoji">🐄</span>';
      colsLeche += colItem(v.nombre, img, lineasLeche(sLeche.porVaca[v.nombre]));
    });
    if (sLeche.sin.hay) {
      colsLeche += colItem('Sin asignar', '<span class="desp-emoji">📋</span>', lineasLeche(sLeche.sin));
    }
    if (!colsLeche) colsLeche = '<p class="desp-sinvacas">Agrega vacas en Configuración para ver la producción por vaca.</p>';

    // ---- Tarjeta OTROS (productos no-leche, con imagen de config) ----
    const otros = sumarOtros(filtroO);
    let colsOtros = '';
    Object.keys(otros).sort().forEach(k => {
      const o = otros[k];
      const cfgImg = getProductoImg(o.concepto);
      const img = cfgImg ? `<img src="${cfgImg}" alt="${o.nombre}">` : '<span class="desp-emoji">' + emojiConcepto(o.concepto) + '</span>';
      const u = abrev(o.unidad);
      colsOtros += colItem(o.nombre, img, [
        ['Despachado', redond(o.despachado) + ' ' + u], ['Doméstico', redond(o.dom) + ' ' + u]
      ]);
    });
    if (!colsOtros) colsOtros = '<p class="desp-sinvacas">Sin registros de otros productos en este periodo.</p>';

    cont.innerHTML = `
      <div class="desp-card" data-card="leche">
        <div class="desp-card-head">
          <span class="desp-periodo">🥛 Leche</span>
          ${controlesCard(periodoLeche, fechaLeche)}
        </div>
        <div class="desp-vacas-row">${colsLeche}</div>
      </div>
      <div class="desp-card" data-card="otros">
        <div class="desp-card-head">
          <span class="desp-periodo">Otros</span>
          ${controlesCard(periodoOtros, fechaOtros)}
        </div>
        <div class="desp-vacas-row">${colsOtros}</div>
      </div>`;

    // Conectar controles de cada tarjeta (toggle + selector de fecha).
    cont.querySelectorAll('.desp-card').forEach(card => {
      const which = card.dataset.card;
      card.querySelectorAll('.desp-toggle button').forEach(b => {
        b.addEventListener('click', () => {
          if (which === 'leche') { periodoLeche = b.dataset.p; fechaLeche = ''; }
          else { periodoOtros = b.dataset.p; fechaOtros = ''; }
          pintarCards();
        });
      });
      const di = card.querySelector('.fecha-sel');
      if (di) di.addEventListener('change', () => {
        const val = di.value;
        if (which === 'leche') { fechaLeche = val; periodoLeche = val ? 'fecha' : 'hoy'; }
        else { fechaOtros = val; periodoOtros = val ? 'fecha' : 'hoy'; }
        pintarCards();
      });
    });
  }

  // Editar/Borrar: interruptor + rol. Crear: solo se bloquea si el usuario es "solo ver".
  function aplicarPermisos() {
    const ok = !window.fincaPuedeEditar || window.fincaPuedeEditar();
    const okCrear = !window.fincaPuedeCrear || window.fincaPuedeCrear();
    const btn = $('btn-nueva-venta');
    if (btn) btn.disabled = !okCrear;
    document.querySelectorAll('#vista-ventas .btn-editar, #vista-ventas .btn-borrar').forEach(b => { b.disabled = !ok; });
  }

  function pintarHistorial() {
    const tb = $('ventas-historial');
    if (!tb) return;
    const q = ($('vt-buscar') ? $('vt-buscar').value : '').trim().toLowerCase();
    let ids = Object.keys(ventas);

    // Filtro por fecha (selector junto al título) + su resumen del día.
    const fr = $('vt-fecha-resumen');
    const clr = $('vt-fecha-clear');
    const corr = $('vt-corregir-dia');
    if (fechaHist) {
      ids = ids.filter(id => (ventas[id].fecha || '') === fechaHist);
      if (fr) { fr.innerHTML = resumenFecha(fechaHist); fr.classList.remove('oculto'); }
      if (clr) clr.classList.remove('oculto');
      if (corr) corr.classList.remove('oculto');
    } else {
      if (fr) fr.classList.add('oculto');
      if (clr) clr.classList.add('oculto');
      if (corr) corr.classList.add('oculto');
    }

    if (q) ids = ids.filter(id => {
      const r = ventas[id];
      const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
      const hay = [fmtFecha(r.fecha), r.fecha, r.jornada, nombre, r.comprador, r.vaca, r.descDomestico,
        r.venta, r.domestico, r.total, r.precio, totalCobrarDe(r), fmtPesos(totalCobrarDe(r))]
        .map(x => (x == null ? '' : String(x)).toLowerCase()).join(' ');
      return hay.indexOf(q) !== -1;
    });
    // Total filtrado (debajo del buscador) cuando hay búsqueda.
    const tf = $('vt-total-filtrado');
    if (tf) {
      if (q) {
        let litros = 0, dinero = 0;
        ids.forEach(id => { litros += num(ventas[id].venta); dinero += totalCobrarDe(ventas[id]); });
        tf.innerHTML = 'Total filtrado: <strong>' + redond(litros) + ' L</strong> vendidos · <strong>' + fmtPesos(dinero) + '</strong> &nbsp;(' + ids.length + ' registros)';
        tf.classList.remove('oculto');
      } else { tf.classList.add('oculto'); }
    }
    if (!ids.length) { tb.innerHTML = '<tr><td colspan="9" class="vacia-fila">' + (q ? 'Sin resultados para "' + q + '"' : (fechaHist ? 'Sin registros el ' + fmtFecha(fechaHist) : 'Sin registros aún')) + '</td></tr>'; return; }
    ids.sort((a, b) => {
      const ra = ventas[a], rb = ventas[b];
      if (ra.fecha !== rb.fecha) return (rb.fecha || '').localeCompare(ra.fecha || '');
      return (ra.jornada || '').localeCompare(rb.jornada || '');
    });
    tb.innerHTML = ids.map(id => {
      const r = ventas[id];
      const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
      const vacaTxt = (r.concepto === 'leche' && r.vaca) ? ' · 🐄 ' + r.vaca : '';
      const u = r.unidad ? ' ' + abrev(r.unidad) : '';
      const dom = num(r.domestico) > 0 ? (r.descDomestico || '—') : '—';
      return `<tr>
        <td>${fmtFecha(r.fecha)}</td>
        <td>${r.jornada || ''}</td>
        <td>${nombre}${vacaTxt}</td>
        <td class="num">${redond(num(r.venta))}${u}</td>
        <td class="num">${redond(num(r.domestico))}${u}</td>
        <td>${dom}</td>
        <td>${r.comprador || '—'}</td>
        <td class="num">${num(r.precio) ? fmtPesos(totalCobrarDe(r)) : '—'}</td>
        <td class="acciones">
          <button class="btn-editar" data-id="${id}">Editar</button>
          <button class="btn-borrar" data-id="${id}">Borrar</button>
        </td>
      </tr>`;
    }).join('');

    tb.querySelectorAll('.btn-editar').forEach(b => {
      b.addEventListener('click', () => abrirModal(b.dataset.id));
    });
    tb.querySelectorAll('.btn-borrar').forEach(b => {
      b.addEventListener('click', () => borrarRegistro(b.dataset.id));
    });
    // Resaltar/quitar el resaltado de una fila al hacer clic (no en los botones).
    tb.querySelectorAll('tr').forEach(tr => {
      if (!tr.querySelector('.btn-editar')) return; // solo filas con datos
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        tr.classList.toggle('fila-sel');
      });
    });
  }

  // Borra un registro directamente desde el historial (respeta el interruptor).
  async function borrarRegistro(id) {
    if (window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      alert('Las ediciones están desactivadas. Actívalas en Configuración para borrar.');
      return;
    }
    const r = ventas[id] || {};
    const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
    if (!confirm('¿Borrar el registro de ' + nombre + ' del ' + fmtFecha(r.fecha) + ' (' + (r.jornada || '') + ')? No se puede deshacer.')) return;
    try {
      await window.fincaDB.eliminarVenta(id);
    } catch (err) {
      alert('No se pudo borrar: ' + (err.message || err));
    }
  }

  // ==========================================================================
  //  CORREGIR DÍA: editar todas las entregas de una fecha a la vez
  // ==========================================================================
  function abrirDia(fecha) {
    if (window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      alert('Las ediciones están desactivadas (o tu usuario no puede editar).');
      return;
    }
    const ids = Object.keys(ventas).filter(id => (ventas[id].fecha || '') === fecha)
      .sort((a, b) => (ventas[a].jornada || '').localeCompare(ventas[b].jornada || ''));
    $('dia-titulo').textContent = 'Corregir el día ' + fmtFecha(fecha);
    $('dia-msg').textContent = '';
    const cuerpo = $('dia-cuerpo');
    if (!ids.length) {
      cuerpo.innerHTML = '<p class="vacia">Sin registros ese día.</p>';
    } else {
      const optJ = getJornadas().map(j => `<option value="${j}">${j}</option>`).join('');
      const optC = '<option value="">— Sin comprador —</option>' + getCompradores().map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
      const optV = '<option value="">— Sin vaca —</option>' + getVacas().map(v => `<option value="${v.nombre}">${v.nombre}</option>`).join('');
      cuerpo.innerHTML = ids.map(id => {
        const r = ventas[id];
        const nombre = r.concepto === 'otro' ? (r.conceptoOtro || 'Otro') : tituloDe(r.concepto);
        const u = abrev(r.unidad);
        const vacaSel = r.concepto === 'leche' ? `<select class="dia-vaca">${optV}</select>` : '';
        return `<div class="dia-item" data-id="${id}">
          <div class="dia-item-top"><span>${emojiConcepto(r.concepto)} ${nombre}</span>
            <select class="dia-jornada">${optJ}</select>${vacaSel}</div>
          <div class="dia-item-campos">
            <label>Produjo (${u})<input type="number" class="dia-prod" min="0" step="0.01" inputmode="decimal"></label>
            <label>Vende (${u})<input type="number" class="dia-vende" min="0" step="0.01" inputmode="decimal"></label>
            <label>Doméstico<span class="dia-dom">0</span></label>
            <label>Comprador<select class="dia-comp">${optC}</select></label>
            <label>Precio ($)<input type="number" class="dia-precio" min="0" step="1" inputmode="numeric"></label>
          </div>
        </div>`;
      }).join('');
      ids.forEach(id => {
        const r = ventas[id];
        const it = cuerpo.querySelector('.dia-item[data-id="' + id + '"]');
        it.querySelector('.dia-jornada').value = r.jornada || '';
        if (it.querySelector('.dia-vaca')) it.querySelector('.dia-vaca').value = r.vaca || '';
        it.querySelector('.dia-prod').value = r.total != null ? r.total : '';
        it.querySelector('.dia-vende').value = r.venta != null ? r.venta : '';
        it.querySelector('.dia-precio').value = r.precio != null ? r.precio : '';
        it.querySelector('.dia-comp').value = r.comprador || '';
        it.querySelector('.dia-dom').textContent = redond(Math.max(0, num(r.total) - num(r.venta)));
      });
      cuerpo.querySelectorAll('.dia-prod, .dia-vende').forEach(inp => inp.addEventListener('input', () => {
        const it = inp.closest('.dia-item');
        it.querySelector('.dia-dom').textContent = redond(Math.max(0, num(it.querySelector('.dia-prod').value) - num(it.querySelector('.dia-vende').value)));
      }));
    }
    $('dia-modal').classList.remove('oculto');
  }

  function cerrarDia() { $('dia-modal').classList.add('oculto'); }

  async function guardarDia() {
    const msg = $('dia-msg');
    if (window.fincaPuedeEditar && !window.fincaPuedeEditar()) {
      return error(msg, 'Las ediciones están desactivadas (o tu usuario no puede editar).');
    }
    const items = [...$('dia-cuerpo').querySelectorAll('.dia-item')];
    for (const it of items) {
      const prod = redond(num(it.querySelector('.dia-prod').value));
      const vende = redond(num(it.querySelector('.dia-vende').value));
      if (vende > prod) return error(msg, 'En una fila, lo de vender no puede ser más que lo que produjo.');
    }
    const btn = $('dia-guardar'); btn.disabled = true;
    try {
      for (const it of items) {
        const id = it.dataset.id;
        const r = ventas[id];
        if (!r) continue;
        const prod = redond(num(it.querySelector('.dia-prod').value));
        const vende = redond(num(it.querySelector('.dia-vende').value));
        const rec = Object.assign({}, r, {
          jornada: it.querySelector('.dia-jornada').value,
          total: prod, venta: vende, domestico: redond(Math.max(0, prod - vende)),
          comprador: it.querySelector('.dia-comp').value,
          precio: redond(num(it.querySelector('.dia-precio').value))
        });
        if (it.querySelector('.dia-vaca')) rec.vaca = it.querySelector('.dia-vaca').value;
        await window.fincaDB.editarVenta(id, rec);
      }
      cerrarDia();
    } catch (err) {
      error(msg, 'No se pudo guardar: ' + (err.message || err));
    } finally {
      btn.disabled = false;
    }
  }

  // ==========================================================================
  //  ARRANQUE
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    construir();
    pintarCards();
    pintarHistorial();
    window.addEventListener('finca-ediciones', aplicarPermisos);
    // Cuando cambie la Configuracion (compradores, precios), actualizar.
    window.addEventListener('finca-config', () => { reconstruirCompradores(); reconstruirVacas(); reconstruirJornadas(); reconstruirConceptos(); pintarCards(); });
    window.fincaOnLogin(() => {
      window.fincaDB.escucharVentas((datos) => {
        ventas = datos || {};
        pintar();
      });
    });
  });
})();
