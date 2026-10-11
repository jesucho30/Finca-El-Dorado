import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, push, update, remove, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ============================================================================
//  CONFIGURACION DE FIREBASE  -->  REEMPLAZA ESTE BLOQUE
// ----------------------------------------------------------------------------
//  Pega aqui la configuracion que te da la consola de Firebase cuando creas
//  el proyecto con la cuenta gomcoarchivos@gmail.com. Mientras tengan estos
//  valores de ejemplo, el login NO va a funcionar (es normal).
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyA2g0VurKfCLr9gG4mrvOtgP5nrnz_06qg",
  authDomain: "finca--el-dorado----maracayo.firebaseapp.com",
  databaseURL: "https://finca--el-dorado----maracayo-default-rtdb.firebaseio.com",
  projectId: "finca--el-dorado----maracayo",
  storageBucket: "finca--el-dorado----maracayo.firebasestorage.app",
  messagingSenderId: "746886862575",
  appId: "1:746886862575:web:f2dbebbd6d249f21fead1a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
// La sesion sobrevive a recargas y cierres del navegador.
setPersistence(auth, browserLocalPersistence).catch(e => console.warn('[AUTH] Persistencia:', e));

// ----------------------------------------------------------------------------
//  API de datos expuesta al scope global. Todas las rutas cuelgan de "finca/".
// ----------------------------------------------------------------------------
window.fincaDB = {
  db,

  // ---- PRODUCCION (leche y huevos por dia) -------------------------------
  // Ruta: finca/produccion/<AAAA-MM-DD>  ->  { leche:{manana,tarde}, huevos }
  guardarProduccionDia: (fecha, datos) => set(ref(db, 'finca/produccion/' + fecha), datos),
  leerProduccionDia:     (fecha)        => get(ref(db, 'finca/produccion/' + fecha)).then(s => s.val()),
  escucharProduccion:    (callback)     => onValue(ref(db, 'finca/produccion'), s => callback(s.val())),

  // ---- VENTAS ------------------------------------------------------------
  agregarVenta:   (venta)       => push(ref(db, 'finca/ventas'), venta),
  editarVenta:    (id, venta)   => set(ref(db, 'finca/ventas/' + id), venta),
  eliminarVenta:  (id)          => remove(ref(db, 'finca/ventas/' + id)),
  escucharVentas: (callback)    => onValue(ref(db, 'finca/ventas'), s => callback(s.val())),

  // ---- GASTOS / INSUMOS --------------------------------------------------
  agregarGasto:   (gasto)       => push(ref(db, 'finca/gastos'), gasto),
  eliminarGasto:  (id)          => remove(ref(db, 'finca/gastos/' + id)),
  escucharGastos: (callback)    => onValue(ref(db, 'finca/gastos'), s => callback(s.val())),

  // ---- INVENTARIO DE ANIMALES -------------------------------------------
  guardarAnimal:    (id, animal) => set(ref(db, 'finca/animales/' + id), animal),
  agregarAnimal:    (animal)     => push(ref(db, 'finca/animales'), animal),
  eliminarAnimal:   (id)         => remove(ref(db, 'finca/animales/' + id)),
  escucharAnimales: (callback)   => onValue(ref(db, 'finca/animales'), s => callback(s.val())),

  // ---- REGISTROS (inventario de animales y cosas de la finca) -----------
  agregarRegistro:   (reg)      => push(ref(db, 'finca/registros'), reg),
  editarRegistro:    (id, reg)  => set(ref(db, 'finca/registros/' + id), reg),
  eliminarRegistro:  (id)       => remove(ref(db, 'finca/registros/' + id)),
  escucharRegistros: (callback) => onValue(ref(db, 'finca/registros'), s => callback(s.val())),

  // ---- APORTES (pestaña protegida dentro de Registros) ------------------
  agregarAporte:   (a)       => push(ref(db, 'finca/aportes'), a),
  editarAporte:    (id, a)   => set(ref(db, 'finca/aportes/' + id), a),
  eliminarAporte:  (id)      => remove(ref(db, 'finca/aportes/' + id)),
  escucharAportes: (callback)=> onValue(ref(db, 'finca/aportes'), s => callback(s.val())),

  // ---- CATALOGO de productos (se mete una vez, luego se elige) -----------
  guardarCatalogoItem: (slug, item) => set(ref(db, 'finca/catalogo/' + slug), item),
  eliminarCatalogoItem:(slug)       => remove(ref(db, 'finca/catalogo/' + slug)),
  escucharCatalogo:    (callback)   => onValue(ref(db, 'finca/catalogo'), s => callback(s.val())),

  // ---- EGRESOS (compras + pagos, se decantan aqui) ----------------------
  agregarEgreso:   (e)       => push(ref(db, 'finca/egresos'), e),
  editarEgreso:    (id, e)   => set(ref(db, 'finca/egresos/' + id), e),
  eliminarEgreso:  (id)      => remove(ref(db, 'finca/egresos/' + id)),
  escucharEgresos: (callback)=> onValue(ref(db, 'finca/egresos'), s => callback(s.val())),
  // Catalogo de conceptos de egresos (cosas para compras, personas para pagos)
  guardarCatEgreso:  (slug, item) => set(ref(db, 'finca/catalogoEgresos/' + slug), item),
  escucharCatEgresos:(callback)   => onValue(ref(db, 'finca/catalogoEgresos'), s => callback(s.val())),

  // ---- PERFILES (uno por usuario: foto, nombre, cargo, contacto) --------
  guardarPerfil:   (slug, p) => set(ref(db, 'finca/perfiles/' + slug), p),
  escucharPerfiles:(callback) => onValue(ref(db, 'finca/perfiles'), s => callback(s.val())),

  // ---- INGRESOS (donaciones y otras formas, fuera de la leche) ----------
  agregarIngreso:   (e)       => push(ref(db, 'finca/ingresos'), e),
  editarIngreso:    (id, e)   => set(ref(db, 'finca/ingresos/' + id), e),
  eliminarIngreso:  (id)      => remove(ref(db, 'finca/ingresos/' + id)),
  escucharIngresos: (callback)=> onValue(ref(db, 'finca/ingresos'), s => callback(s.val())),
  guardarCatIngreso:  (slug, item) => set(ref(db, 'finca/catalogoIngresos/' + slug), item),
  escucharCatIngresos:(callback)   => onValue(ref(db, 'finca/catalogoIngresos'), s => callback(s.val())),

  // ---- FLUJO PROYECTADO (movimientos futuros estimados) -----------------
  agregarProyeccion:  (p)      => push(ref(db, 'finca/flujoProyectado'), p),
  editarProyeccion:   (id, p)  => set(ref(db, 'finca/flujoProyectado/' + id), p),
  eliminarProyeccion: (id)     => remove(ref(db, 'finca/flujoProyectado/' + id)),
  escucharProyeccion: (callback)=> onValue(ref(db, 'finca/flujoProyectado'), s => callback(s.val())),

  // ---- CONFIG GLOBAL (clave + interruptor de ediciones) -----------------
  // Ruta: finca/config  ->  { edicionesActivas: bool, claveConfig: string }
  escucharConfig: (callback) => onValue(ref(db, 'finca/config'), s => callback(s.val())),
  setEdiciones:   (activo)   => set(ref(db, 'finca/config/edicionesActivas'), !!activo),
  setClaveConfig: (clave)    => set(ref(db, 'finca/config/claveConfig'), clave),

  // ---- Helpers genericos -------------------------------------------------
  set: (path, value) => set(ref(db, path), value),
  get: (path)        => get(ref(db, path)).then(s => s.val())
};

// API de autenticacion
window.fincaAuth = {
  login:        (email, password) => signInWithEmailAndPassword(auth, email, password),
  logout:       ()                => signOut(auth),
  onAuthChange: (callback)        => onAuthStateChanged(auth, callback),
  currentUser:  ()                => auth.currentUser
};

window.dispatchEvent(new Event('firebase-ready'));
