# 🚀 Variables de Entorno para Coolify

**IMPORTANTE:** Copia estas variables en Coolify → Tu Aplicación → Environment Variables

## ✅ Variables Obligatorias

Agrega estas en la sección "Production Environment Variables":

```bash
# ==== CRÍTICAS (sin estas el servidor no arranca) ====

# JWT Secret para autenticación (GENERADO)
JWT_SECRET=1713cd2057028b1dbbc5cd0b44b4106a0df1dcb66eb058763d09bf6de9ed733c

# Database URL (auto-construida por docker-compose, pero mejor explícita)
DATABASE_URL=postgresql://estilovivo:changeme@db:5432/estilovivo?schema=public

# CORS Origin para que el frontend funcione
CORS_ORIGIN=https://estilovivo.xyoncloud.win

# ==== CONFIGURACIÓN DEL SERVIDOR ====

PORT=3000
NODE_ENV=production
UPLOADS_DIR=/app/uploads

# ==== VARIABLES QUE YA TIENES (mantener) ====

DB_USER=estilovivo
DB_PASSWORD=changeme
DB_NAME=estilovivo
SERVICE_URL_APP=https://estilovivo.xyoncloud.win
SERVICE_FQDN_APP=estilovivo.xyoncloud.win
```

## 📋 Pasos en Coolify

1. **Ve a tu aplicación** en Coolify
2. **Click en "Environment Variables"**
3. **Agrega las variables** que faltan (las marcadas como CRÍTICAS arriba)
4. **Click en "Save"**
5. **Redeploy** (debería ser automático)
6. **Espera 2-3 minutos**
7. **Revisa logs** del servicio `app` (no `db`)
8. **Accede a** https://estilovivo.xyoncloud.win

## ✅ Logs Esperados (Éxito)

Después del redeploy, en logs del contenedor `app` deberías ver:

```
✓ Database connected
✓ Server running on port 3000
  API: http://localhost:3000/api
  Env: production
```

## 🔴 Si Sigue Sin Funcionar

Muéstrame los logs del contenedor **`app`** (no `db`).

---

**Nota:** El archivo `.env.production` también está creado con estas variables para referencia local.
