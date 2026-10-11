/* ============================================================================
 *  Modulo PERFIL - Finca El Dorado
 *  Cada usuario edita su propio perfil (foto, nombre, cargo, teléfono).
 *  Abajo, el directorio del equipo con todos los cargos.
 * ==========================================================================*/
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CARGOS = ['Presidenta', 'Director', 'Administrador', 'Supervisor', 'Aportante'];
  const slugEmail = (e) => (e || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  let perfiles = {};
  let imgData = null; // data URL de la foto (null = sin cambio, '' = quitada)

  function miEmail() { return (window.fincaAuth && window.fincaAuth.currentUser()) ? (window.fincaAuth.currentUser().email || '') : ''; }
  function miPerfil() { return perfiles[slugEmail(miEmail())] || {}; }

  function construir() {
    const cont = $('vista-perfil');
    if (!cont) return;
    const opcionesCargo = CARGOS.map(c => `<option value="${c}">${c}</option>`).join('');
    cont.innerHTML = `
      <section class="bloque">
        <h3>Mi perfil</h3>
        <div class="perfil-edit">
          <div class="perfil-foto" id="pf-foto"><span>👤</span></div>
          <div class="perfil-campos">
            <label class="campo"><span>Nombre completo</span><input type="text" id="pf-nombre" placeholder="Tu nombre"></label>
            <div class="fila-dos">
              <label class="campo"><span>Cargo</span><select id="pf-cargo"><option value="">— Selecciona —</option>${opcionesCargo}</select></label>
              <label class="campo"><span>Teléfono</span><input type="text" id="pf-tel" inputmode="tel" placeholder="Ej: 300 123 4567"></label>
            </div>
            <label class="campo"><span>Correo (con el que entras)</span><input type="text" id="pf-correo" readonly></label>
            <div class="fila-dos" style="align-items:center">
              <input type="file" id="pf-file" accept="image/*">
              <button id="pf-guardar" class="btn-acento" type="button">Guardar perfil</button>
            </div>
            <p id="pf-msg" class="msg"></p>
          </div>
        </div>
      </section>

      <section class="bloque">
        <h3>Equipo</h3>
        <p class="modulo-sub">Las personas registradas y su cargo.</p>
        <div id="pf-equipo" class="perfil-equipo"></div>
      </section>
    `;
    $('pf-file').addEventListener('change', onFoto);
    $('pf-guardar').addEventListener('click', guardar);
  }

  function onFoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const im = new Image();
      im.onload = () => {
        const max = 240; let w = im.width, h = im.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        imgData = cv.toDataURL('image/jpeg', 0.8);
        pintarFoto(imgData);
      };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function pintarFoto(img) {
    const box = $('pf-foto');
    if (box) box.innerHTML = img ? `<img src="${img}" alt="foto">` : '<span>👤</span>';
  }

  function cargarMisCampos() {
    if (!$('pf-nombre')) return;
    const p = miPerfil();
    $('pf-nombre').value = p.nombre || '';
    $('pf-cargo').value = p.cargo || '';
    $('pf-tel').value = p.telefono || '';
    $('pf-correo').value = miEmail();
    imgData = null;
    pintarFoto(p.foto || '');
  }

  async function guardar() {
    const msg = $('pf-msg');
    const email = miEmail();
    if (!email) { msg.textContent = 'Inicia sesión primero.'; msg.className = 'msg err'; return; }
    const p = miPerfil();
    const reg = {
      email: email,
      nombre: $('pf-nombre').value.trim(),
      cargo: $('pf-cargo').value,
      telefono: $('pf-tel').value.trim(),
      foto: (imgData !== null) ? imgData : (p.foto || '')
    };
    try {
      await window.fincaDB.guardarPerfil(slugEmail(email), reg);
      imgData = null;
      msg.textContent = '✓ Perfil guardado.'; msg.className = 'msg ok';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
      msg.textContent = 'No se pudo guardar: ' + (err.message || err); msg.className = 'msg err';
    }
  }

  function idsOrdenados() {
    return Object.keys(perfiles).sort((a, b) => {
      const ca = CARGOS.indexOf(perfiles[a].cargo), cb = CARGOS.indexOf(perfiles[b].cargo);
      if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
      return (perfiles[a].nombre || '').localeCompare(perfiles[b].nombre || '');
    });
  }

  function cardHTML(p) {
    const foto = p.foto ? `<img src="${p.foto}" alt="${p.nombre || ''}">` : '<span>👤</span>';
    return `<div class="perfil-card">
      <div class="perfil-card-foto">${foto}</div>
      <div class="perfil-card-info">
        <span class="perfil-card-nombre">${p.nombre || '(sin nombre)'}</span>
        ${p.cargo ? `<span class="perfil-card-cargo">${p.cargo}</span>` : ''}
        ${p.telefono ? `<span class="modulo-sub">📞 ${p.telefono}</span>` : ''}
      </div>
    </div>`;
  }

  function pintarEquipo() {
    const cont = $('pf-equipo');
    if (!cont) return;
    const ids = idsOrdenados();
    cont.innerHTML = ids.length ? ids.map(id => cardHTML(perfiles[id])).join('')
      : '<p class="modulo-sub">Aún nadie ha llenado su perfil.</p>';
  }

  // Tarjetas del equipo en el sidebar, debajo de Perfil.
  function pintarSidebarEquipo() {
    const cont = $('sidebar-equipo');
    if (!cont) return;
    const ids = idsOrdenados();
    if (!ids.length) { cont.innerHTML = ''; return; }
    cont.innerHTML = '<div class="sidebar-equipo-titulo">Equipo</div>' +
      ids.map(id => cardHTML(perfiles[id])).join('');
  }

  function refrescar() { cargarMisCampos(); pintarEquipo(); pintarSidebarEquipo(); }

  document.addEventListener('DOMContentLoaded', () => {
    construir();
    window.fincaOnLogin(() => {
      cargarMisCampos();
      window.fincaDB.escucharPerfiles((d) => { perfiles = d || {}; refrescar(); });
    });
  });
})();
