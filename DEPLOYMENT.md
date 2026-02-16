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

## ✅ Variables Auto-provistas por Coolify

Estas variables las genera Coolify automáticamente, **NO las agregues**:
- `SERVICE_URL_APP` (tu dominio https://estilovivo.xyoncloud.win)
- `SERVICE_FQDN_APP`
- `COOLIFY_URL`
- `COOLIFY_FQDN`

## 🚀 Después de Configurar

1. Guarda las variables en Coolify
2. Redeploya la aplicación
3. Espera 2-3 minutos
4. Accede a https://estilovivo.xyoncloud.win
