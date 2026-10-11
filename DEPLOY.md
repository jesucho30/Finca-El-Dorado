# Despliegue — Finca El Dorado (Maracayo)

App web de administración de la finca (Firebase Hosting + Realtime Database).

| Dato | Valor |
|------|-------|
| **Proyecto Firebase** | `finca--el-dorado----maracayo` |
| **Cuenta (Google)** | `gimcoarchivos@gmail.com` |
| **Sitio en vivo** | https://finca--el-dorado----maracayo.web.app |
| **Base de datos** | Realtime Database (reglas en `database.rules.json`) |
| **Repositorio** | https://github.com/jesucho30/Finca-El-Dorado.git |

> ⚠️ Esta app vive **únicamente** en la cuenta **gimcoarchivos@gmail.com**. Usa siempre `--project` y `--account` explícitos para no desplegar por error en otro proyecto.

---

## 1. Requisitos (una sola vez)

1. Tener **Node.js** instalado.
2. Instalar las Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
3. Iniciar sesión con la cuenta correcta:
   ```bash
   firebase login
   ```
   (Si tienes varias cuentas de Google en la CLI: `firebase login:add gimcoarchivos@gmail.com`.)

---

## 2. Publicar la app (lo normal)

Desde la carpeta del proyecto (`Finca El dorado/`):

```bash
firebase deploy --only hosting --project finca--el-dorado----maracayo --account gimcoarchivos@gmail.com
```

Al terminar muestra la URL: **https://finca--el-dorado----maracayo.web.app**

### Si cambiaste las reglas de la base de datos (`database.rules.json`)

```bash
firebase deploy --only database --project finca--el-dorado----maracayo --account gimcoarchivos@gmail.com
```

### Publicar todo a la vez (app + reglas)

```bash
firebase deploy --only hosting,database --project finca--el-dorado----maracayo --account gimcoarchivos@gmail.com
```

---

## 3. Guardar los cambios en GitHub

Después de desplegar (o antes), sube el código al repositorio:

```bash
git add -A
git commit -m "describe el cambio"
git push
```

---

## 4. Caché (importante para que los cambios se vean)

- `firebase.json` ya envía `Cache-Control: no-cache` para `/`, `/index.html` y todos los `*.js` / `*.css`, así que el sitio en vivo **se actualiza solo** al recargar.
- Además, en `index.html` los archivos llevan un número de versión, por ejemplo:
  `js/ventas.js?v=16`, `css/styles.css?v=13`.
  **Cuando cambies un archivo `.js` o `.css`, súbele el número** (`?v=16` → `?v=17`) para forzar que todos los navegadores (y celulares) carguen la versión nueva sin tener que limpiar caché.
- Tras publicar, si alguien no ve el cambio, que recargue con **Ctrl + F5** (o que deslice la pantalla hacia abajo para refrescar en el celular) una vez.

---

## 5. Estructura de la carpeta

```
Finca El dorado/
├─ index.html              ← página principal (carga los módulos js con ?v=)
├─ css/styles.css          ← estilos (temas claro/oscuro)
├─ img/logo.svg            ← logo El Dorado
├─ js/                     ← un módulo por sección (IIFE)
│  ├─ app.js               ← login, sidebar, permisos
│  ├─ firebase-config.js   ← config de Firebase + helpers de datos
│  ├─ inicio.js  ventas.js (Despachado)  cotizador.js (Cuentas/Factura)
│  ├─ compras/pagos → egresos.js   ingresos.js   registros.js  aportes.js
│  ├─ resultados.js   configuracion.js   perfil.js
├─ firebase.json           ← hosting + reglas + headers de caché
├─ database.rules.json     ← reglas RTDB (auth != null)
└─ .firebaserc             ← proyecto por defecto
```

> Los archivos `.md`, la caché `.firebase/` y las carpetas `_carga*/` **no** se publican (están en el `ignore` de `firebase.json` y/o en `.gitignore`).
