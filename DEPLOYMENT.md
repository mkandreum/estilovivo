# 🚀 Despliegue en Coolify - EstiloVivo

## Pasos para Desplegar

### 1. En Coolify Dashboard

1. **Crear nuevo servicio**
   - Tipo: Docker Compose
   - Nombre: `estilovivo`

2. **Subir archivo compose**
   - Usar `docker-compose.yml` (el de la raíz del proyecto)
   - NO usar el `docker-compose.dev.yaml`

### 2. Configurar Variables de Ambiente

En Coolify, add these environment variables:

```
DB_USER=estilovivo
DB_PASSWORD=GENERATE_STRONG_PASSWORD_HERE
DB_NAME=estilovivo_prod
PORT=3000
NODE_ENV=production
```

### 3. Configurar Dominio

1. En Coolify, ir a "Domains"
2. Añadir tu dominio (ej: `estilovivo.tudominio.com`)
3. Coolify generará SSL/TLS automáticamente
4. **UNA SOLA URL**: Todos los requests van a `https://estilovivo.tudominio.com`
   - Web: `https://estilovivo.tudominio.com`
   - API: `https://estilovivo.tudominio.com/api/*`
   - Uploads: `https://estilovivo.tudominio.com/api/uploads/*`

### 4. Volúmenes Persistentes

Coolify crea automáticamente:
- `postgres_data` → Base de datos
- `uploads_data` → Imágenes subidas de productos

Si necesitas recuperar datos en caso de reset:
```bash
# Desde la máquina host
docker volume ls
docker volume inspect estilovivo_postgres_data
```

### 5. Revisar Logs

```bash
# Acceder a los logs del servicio
docker-compose logs -f app
docker-compose logs -f db
```

## Migraciones de Base de Datos

Las migraciones se ejecutan automáticamente al iniciar el container:

```dockerfile
CMD ["node", "dist/index.js"]
```

Si necesitas migrar manualmente:

```bash
docker-compose exec app npx prisma migrate deploy
```

## Health Checks

El servicio tiene health checks implementados:
- `/api/health` - Verifica que el backend esté respondiendo
- Si falla, Coolify reinicia el container automáticamente
- Espera 40 segundos antes de empezar a revisar (start_period)

## Backup y Recuperación

### Backup de base de datos

```bash
# Desde el host
docker-compose exec db pg_dump -U estilovivo estilovivo_prod > backup.sql
```

### Restaurar

```bash
# Limpiar y restaurar
docker-compose exec db dropdb -U estilovivo estilovivo_prod
docker-compose exec db createdb -U estilovivo estilovivo_prod
cat backup.sql | docker-compose exec -T db psql -U estilovivo estilovivo_prod
```

## Límites y Configuración Recomendada

- **Memoria:** Mínimo 512MB, recomendado 1GB+
- **CPU:** 0.5 cores es suficiente para empezar
- **Almacenamiento:** 
  - Base de datos: ~100MB por cada 10,000 productos
  - Imágenes: ~500MB inicialmente, escala según uso

## Troubleshooting

### Error: "Database connection failed"

```bash
1. Revisar que `db` está sano:
   docker-compose ps

2. Revisar logs:
   docker-compose logs db

3. Reiniciar base de datos:
   docker-compose restart db
```

### Error: "Can't connect to app"

```bash
1. Revisar health check:
   docker-compose exec app curl http://localhost:3000/api/health

2. Revisar puerto 3000 esté abierto en Coolify
```

### Refrescar después de actualizar código

```bash
# Pull cambios, rebuild imagen
git pull
docker-compose pull
docker-compose up -d --build
```

## Monitoreo en Producción

Recomendaciones:
1. Activar logs en Coolify (Settings → Logging)
2. Configurar alertas para cuando el servicio no responda
3. Health Endpoint: `GET https://tundominio.com/api/health`
4. Revisar periódicamente uso de volúmenes (`du -sh /var/lib/docker/volumes/*`)

## SSL/TLS

Coolify maneja esto automáticamente:
- Certificados Let's Encrypt
- Auto-renovación cada 90 días
- HTTPS forzado (redirige HTTP → HTTPS)

## Escala Horizontal (Futura)

Cuando necesites más poder:
1. Coolify puede replicar el servicio en múltiples hosts
2. Usar load balancer (Coolify lo maneja)
3. Base de datos compartida (ya está en volumen persistente)
