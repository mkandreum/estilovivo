# ⚠️ CONFIGURACIÓN REQUERIDA EN COOLIFY

**IMPORTANTE:** Este proyecto NO usa archivos .env en el repositorio.
**Todas las variables deben configurarse en Coolify UI.**

## 📋 Variables Requeridas en Coolify

Ve a tu aplicación → **Environment Variables** y agrega:

### Base de Datos (ya configuradas)
```
DB_USER=estilovivo
DB_PASSWORD=changeme
DB_NAME=estilovivo
```

### Server
```
NODE_ENV=production
```

### Autenticación (CRÍTICA)
```
JWT_SECRET=1713cd2057028b1dbbc5cd0b44b4106a0df1dcb66eb058763d09bf6de9ed733c
```

### SMTP (opcional - agregar vacías)
```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**NOTA:** Si NODE_ENV o las variables SMTP ya existen, no es necesario agregarlas de nuevo - el docker-compose.yaml ahora tiene valores por defecto.

## ✅ Variables Auto-provistas por Coolify

Estas variables las genera Coolify automáticamente, **NO las agregues manualmente**:
- `SERVICE_URL_APP` ← **Si existe con sintaxis `${...:-...}`, BÓRRALA**
- `SERVICE_FQDN_APP`
- `COOLIFY_URL`
- `COOLIFY_FQDN`

## 🔧 Solución de Problemas

### Error: "Invalid template: ${SERVICE_URL_APP:-..."

Si ves este error en los logs de deployment:
1. Ve a **Environment Variables** en Coolify
2. Busca y **ELIMINA** la variable `SERVICE_URL_APP` (si existe manualmente)
3. Coolify la generará automáticamente, o el docker-compose usará `*` como fallback

## 🚀 Después de Configurar

1. Guarda las variables en Coolify
2. Redeploya la aplicación
3. Espera 2-3 minutos
4. Accede a https://estilovivo.xyoncloud.win
