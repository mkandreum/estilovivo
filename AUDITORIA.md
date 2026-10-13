# Auditoría de seguridad y funcionalidad — Estilo Vivo

**Fecha:** 13/10/2026
**Alcance:** backend (`server/`), frontend web (todas las pantallas y menús) y separación de la app Android.
**Verificación:** typecheck de front y back, `vite build`, 27 tests de backend (10 nuevos de seguridad), 12 de frontend y recorrido manual en local de todos los menús y flujos de la API.

---

## 0. Separación web / Android

| Repositorio | Contenido |
|---|---|
| `romecabezasjamd/estilovivo` (este) | Web (React + Vite) y backend (Express + Prisma). Ya no contiene `android/` ni `capacitor.config.ts`. |
| `mkandreum/estilovivoapp` | App Android: contenedor Capacitor que carga `https://estilovivo.xyoncloud.win` en remoto, con los plugins nativos y una pantalla sin conexión. |

La web sigue incluyendo los paquetes JS `@capacitor/*` porque son el puente con los plugins nativos cuando se ejecuta dentro de la APK.
Cualquier despliegue de la web llega a la app sin publicar una versión nueva en Play Store.

---

## 1. Seguridad — hallazgos corregidos

### Críticos

| # | Hallazgo | Impacto | Corrección |
|---|---|---|---|
| S1 | `GET /api/planner/:userId` y `GET /api/trips/:userId` devolvían datos de **cualquier** usuaria | Lectura del calendario y viajes ajenos | Sólo `me` o el propio id (403 si no) |
| S2 | `POST /api/planner` aceptaba `userId` del cliente | Escribir en el planner de otra persona y alterar contadores de uso de sus prendas | El planner siempre es del usuario autenticado; el look debe ser propio |
| S3 | Sockets: `join_room` sin autenticación ni comprobación; `typing` con `userId` falsificable | Cualquiera podía unirse a salas de conversación ajenas y suplantar | Autenticación obligatoria en el handshake (token o cookie); salas `conv_*` sólo para participantes; el `userId` sale del token |
| S4 | Subidas: la extensión salía del nombre del cliente (`foto.html` con MIME `image/png`) y, si sharp fallaba, se servía el fichero original | XSS almacenado vía `/api/uploads` | Extensión derivada del MIME; todas las imágenes (prendas, looks, avatar, chat, retos, historias) se re-codifican con sharp; si falla se rechazan; `/api/uploads` con `nosniff` + CSP `sandbox` |
| S5 | `/api/debug-db` ejecutaba DDL y `/api/server-logs` exponía logs | Superficie de ataque innecesaria | Eliminados |
| S6 | Items de viaje: se comprobaba el viaje pero no que el item perteneciera a él | Modificar/borrar checklists ajenos | `itemId` debe pertenecer al `tripId` |
| S7 | Looks: `productIds` aceptaba prendas de otras usuarias | Vincular y exponer prendas ajenas | Sólo se vinculan prendas propias (también en viajes) |
| S8 | Chat: los enlaces se pintaban con `href={mensaje completo}` | Enlaces `javascript:`/phishing en mensajes | Sólo se enlazan tokens `http(s)://` |

### Altos / medios

- **Inyección HTML en emails**: nombres, títulos de prendas y mensajes se interpolaban sin escapar → `escapeHtml` en todos los emails.
- **`imageUrl` arbitraria** en mensajes, historias y conversaciones (tracking externo, `javascript:`) → sólo rutas `/api/uploads/...` propias.
- **Visibilidad**: likes, comentarios y favoritos sobre looks privados o de perfiles privados no seguidos → `canViewLook`. Historias de perfiles privados visibles para todos → filtradas.
- **Perfil público** (`/api/users/:id`) devolvía email, fecha de nacimiento y seguimiento de ciclo → eliminados de la respuesta.
- **Tokens internos** (`verificationToken`, `resetToken`) en `/auth/me`, login y refresh → eliminados.
- **Cambio/restablecimiento de contraseña** no cerraba otras sesiones → se revocan todos los refresh tokens (la sesión actual recibe un par nuevo).
- **Enumeración de usuarios**: `resend-verification` devolvía 404 y el login respondía más rápido para emails inexistentes → respuesta genérica y bcrypt "dummy".
- **Fugas de información**: `/api/health` exponía la ruta de la BD, el número de usuarios y errores; varios endpoints devolvían `error.message` → eliminados. `/api/health/detailed` era accesible para cualquier usuaria → sólo admin.
- **Admin**: la comprobación era `userId === 'admin'` (inalcanzable con cuid) → `ADMIN_USER_IDS` por variable de entorno.
- **Cabeceras**: `nosniff`, `Referrer-Policy`, `X-Frame-Options`, HSTS en producción; `x-powered-by` desactivado.
- **Límites**: cuerpo JSON 200 kB (3 MB sólo para presets del probador), longitudes máximas en todos los validadores, máximo 50 presets, emoji de reacción acotado.
- **Gamificación abusable**: dar/quitar like en bucle otorgaba XP infinito; re-guardar el planner sumaba XP; `check-achievements` daba el XP del logro dos veces → corregido.
- **Feed RSS de tendencias**: `link`/`image` externos sin validar → sólo `http(s)`.
- **RGPD — borrar cuenta** dejaba en disco fotos, miniaturas, avatares, retos, historias y adjuntos → se eliminan todos los ficheros.

### App Android

- `network_security_config`: sólo HTTPS en release (antes permitía cleartext a `localhost`/`10.0.2.2` también en producción).
- Sin backups de datos de la app (`allowBackup=false` + `data_extraction_rules`).
- Quitados permisos no usados que Play Store rechaza o exige justificar: `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `READ_MEDIA_VIDEO`, `WRITE_EXTERNAL_STORAGE`.
- `allowNavigation` limitado al dominio propio; depuración remota del WebView desactivada.
- Firma y `versionCode`/`versionName` por variables de entorno (sin contraseñas vacías en el repo).

---

## 2. Funcionalidad — fallos corregidos por menú

### Inicio / Planificador
- **Zona horaria**: "hoy" y los días de la semana se calculaban en UTC; en España, entre las 00:00 y las 02:00 se marcaba el día anterior, y el selector de fechas de viajes guardaba **un día menos**. Nueva utilidad `toLocalDateStr`.
- Quitar el look y la nota de un día dejaba una entrada vacía → ahora se elimina.
- Errores al guardar el planner se ignoraban en silencio → rollback + aviso.
- Editar sólo la nota de un día volvía a sumar un uso a todas las prendas del look.
- El XP/nivel de Inicio no se actualizaba tras subir prendas o crear looks.

### Armario
- **Sólo se cargaban las 20 primeras prendas y looks** (el servidor pagina y el cliente ignoraba `nextCursor`) → carga completa por páginas.
- **La segunda venta fallaba siempre**: al cerrar el modal el estado pasaba a `'bueno'`, valor que el servidor rechaza.
- "Quitar de la venta" no borraba el precio (se enviaba `undefined`).
- Cada edición sobrescribía el contador de usos con el valor local (pisando lo sumado por el planner).
- Si el procesado de imagen fallaba se guardaba una URL a un fichero ya borrado (imagen rota).
- Precio sin validar (NaN, negativo) y estado mostrado en inglés (`good`).
- Los errores del servidor (p. ej. "máximo 5 prendas a la venta") se mostraban como un genérico.

### Comunidad (feed, tienda, historias, retos, chat)
- **Las publicaciones del feed se guardaban como privadas** (no se enviaba `isPublic`): nadie más las veía.
- Historias: si fallaba la subida se mostraban como publicadas; la caché local mezclaba historias borradas o de otras sesiones; se enviaban data-URLs que el servidor no puede servir.
- Chat: si fallaba la subida de la imagen se enviaba el data-URL; al fallar un mensaje se perdía el texto; enlaces en blanco sobre fondo gris (invisibles).
- XP falso en el cliente (fórmula `xp/100` distinta a la del servidor y persistida con un PUT del perfil completo) → se muestra el XP real del servidor; barra de nivel con la fórmula correcta.
- Botón de administración "Forzar cambio" del reto visible para todas las usuarias.
- "Compartir producto en el feed" creaba un look público con prendas de otra persona → ahora comparte el enlace.
- Reto: la imagen subida no se procesaba y se podía participar en retos caducados.

### Wishlist / Favoritos
- "Mover al armario" existía en tres versiones distintas (Comunidad, Wishlist, Perfil): copiaba la prenda **sin foto** y no actualizaba el armario hasta recargar → función única `copyProductToWardrobe`.

### Maleta (viajes)
- **El checklist nunca se guardaba**: `PUT /trips/:id` ignora los items; al recargar se perdían checks y elementos nuevos → sincronización por item (alta, marcado, borrado).
- Al crear un viaje la vista se cerraba sola (el id temporal desaparecía al guardar).
- Las prendas del viaje llegaban sin imagen.
- No se podían borrar elementos del checklist; borrar un viaje no pedía confirmación ni avisaba de errores.
- Fechas guardadas como texto ("13 oct") → ISO, compatibles con los viajes antiguos.

### Perfil y ajustes
- Cada ajuste hacía **dos** peticiones (la segunda con el usuario completo) y, si la segunda fallaba, deshacía el cambio ya guardado.
- Cambiar el género mostraba el cambio aunque no se hubiera guardado.
- Cambiar contraseña: mensajes de error genéricos; ahora "debe ser distinta" y errores de validación concretos.
- Seguir/dejar de seguir: en perfiles privados **no se podía dejar de seguir** (volvía a enviar solicitud) ni cancelar una solicitud; el contador de seguidores bajaba al cancelar.
- Email de contacto de Premium con errata (`appetilovivo@`).

### Sesión y navegación
- **El refresco automático del token no funcionaba** en casi ninguna llamada: al caducar el access token (7 días) aparecían errores. Ahora `fetchWithTimeout` renueva y reintenta de forma transparente; las peticiones en cola no esperan 10 s si el refresh falla.
- Logout/borrar cuenta/cambiar contraseña no enviaban el token (dependían de la cookie).
- Enlaces de verificación y de restablecer contraseña no funcionaban con la sesión iniciada.
- Deep links de Android (`appUrlOpen`) no se gestionaban.
- Push/analytics sólo se registraban al hacer login, no al reabrir la app.
- Notificaciones: reacciones a historias y lavadora no navegaban; solicitudes de seguimiento llevaban al perfil ajeno.
- El dev server de Vite no arrancaba (dependencias opcionales de TensorFlow).

---

## 3. Pendiente (requiere decisión o credenciales)

1. **Premium y política de Google Play** — la pantalla Premium pide escribir un email para activar la cuenta. Vender funciones digitales dentro de una app Android fuera de Google Play Billing **incumple la política de pagos** y puede provocar el rechazo. Opciones: integrar Play Billing (el plugin ya está incluido en la app) con verificación en servidor, o eliminar la mención al pago en la app Android. Además no existe un campo `isPremium`: el límite de 5 ventas se aplica a todas.
2. **Notificaciones push** — la app obtiene el token FCM pero nunca lo envía al servidor y el backend no tiene envío por FCM. Hace falta una cuenta de servicio de Firebase para implementarlo.
3. **`assetlinks.json`** — configurar `ANDROID_SHA256_FINGERPRINTS` con la huella de la clave de firma de Play para que los enlaces `https://` abran la app.
4. **Migraciones de Prisma** — el despliegue usa `prisma db push`; las migraciones del repo están desfasadas respecto al esquema. Recomendable regenerar una migración base y pasar a `migrate deploy`.
5. **Sesiones** — el access token dura 7 días. Con el refresco transparente ya funcionando se puede bajar a 15-60 min.
6. **Verificación de email** — las cuentas sin verificar pueden iniciar sesión (decisión de producto actual).

## 4. Variables de entorno nuevas

| Variable | Uso |
|---|---|
| `ADMIN_USER_IDS` | IDs con acceso a endpoints de administración |
| `ANDROID_SHA256_FINGERPRINTS` | Huellas para `/.well-known/assetlinks.json` |
| `ANDROID_PACKAGE_NAME` | Por defecto `com.estilovivo.app` |
