# 👨‍💻 Guía de Desarrollo Local

## Setup Inicial

### Opción 1: Docker (Recomendado)

**Requisitos:** Docker y Docker Compose instalados

```bash
# Clonar y entrar al proyecto
git clone <repo>
cd estilovivo

# Copiar archivo de ambiente
cp .env.example .env

# Levantar todo
docker-compose -f docker-compose.dev.yaml up
```

**Acceso:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Base de datos: localhost:5432

**Primeras migraciones auto-ejecutadas:**
El backend corre estos comandos al iniciar:
```bash
npx prisma migrate dev
npm run dev
```

### Opción 2: Local (sin Docker)

**Requisitos:** Node.js 20+, PostgreSQL corriendo

```bash
# Setup base de datos
createdb estilovivo_dev
createuser estilovivo --password  # contraseña: dev_password

# Backend
cd server
npm install
# Crear .env
export DATABASE_URL="postgresql://estilovivo:dev_password@localhost:5432/estilovivo_dev?schema=public"
npx prisma migrate dev
npm run dev

# Frontend (otra terminal)
cd (volver a raíz)
npm install
npm run dev
```

## Estructura de Carpetas

```
server/
  ├── src/
  │   └── index.ts           # Servidor Express
  ├── prisma/
  │   ├── schema.prisma      # Modelos de BD
  │   └── migrations/        # Cambios de BD
  ├── package.json
  └── tsconfig.json

# Raíz (Frontend React)
├── components/             # Componentes React
├── pages/                  # Páginas/vistas
├── App.tsx                # App principal
├── index.tsx              # Entry point
├── types.ts               # TypeScript types
├── package.json           # Frontend deps
└── vite.config.ts         # Config Vite
```

## Desarrollo del Backend

### API Endpoints Disponibles

```typescript
// Health
GET /api/health

// Productos
GET    /api/products
GET    /api/products/:id
POST   /api/products        (multipart: name, category, images)
DELETE /api/products/:id

// Looks (combinaciones de ropa)
GET    /api/looks
POST   /api/looks           (multipart: title, images, productIds)

// Usuarios
GET    /api/users/:id
POST   /api/users           (json: name, email, avatar, bio)
```

### Prisma Studio (Ver/Editar BD)

```bash
cd server
npx prisma studio

# Abre http://localhost:5555 en el navegador
```

### Crear Nueva Migración

```bash
cd server

# Editar schema.prisma
# Luego:
npx prisma migrate dev --name nombre_de_cambio
```

### Ver SQL de Migraciones

```bash
cd server/prisma/migrations
# Ver carpetas con nombre_de_cambio_timestamp
cat nombre_de_cambio_timestamp/migration.sql
```

## Desarrollo del Frontend

### Proxy de API en Desarrollo

El `vite.config.ts` tiene un proxy:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

Puedes hacer requests así:
```typescript
// Se redirige a http://localhost:3000/api/products
fetch('/api/products').then(r => r.json())
```

### Variables de Ambiente Frontend

En `.env.local`:
```
VITE_API_URL=http://localhost:3000/api
```

Acceso en código:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Hot Reload

- **Backend:** Cambios en `server/src/*.ts` se auto-compilan
- **Frontend:** Cambios en `*.tsx` y `*.ts` se hot-reload automáticamente

## Debugging

### Logs de Backend

```bash
# Ver en tiempo real
docker-compose -f docker-compose.dev.yaml logs -f app

# O si ejecutas localmente
npm run dev  # ya ves los logs
```

### Network Inspector

En DevTools del navegador:
1. Tab "Network"
2. Hacer request a API
3. Ver request/response en miniaturas

### VS Code Debugging

Crear `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "program": "${workspaceFolder}/server/src/index.ts"
    }
  ]
}
```

F5 para iniciar debugging.

## Build para Producción

### Frontend

```bash
npm run build
# Output: dist/

# Vista previa
npm run preview
```

### Backend

```bash
cd server
npm run build
# Output: server/dist/

# Correr
node server/dist/index.js
```

### Docker (todo junto)

```bash
# Con Dockerfile.production
docker build -f Dockerfile.production -t estilovivo:latest .

# Correr
docker run -p 3000:3000 estilovivo:latest
```

## Errores Comunes

### "Cannot find module '@prisma/client'"

```bash
cd server && npm install
```

### "Port 3000 already in use"

```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### "Database connection refused"

```bash
# Si usas Docker
docker-compose -f docker-compose.dev.yaml ps

# Si usan localmente, asegurar PostgreSQL esté corriendo
pg_isready -h localhost
```

### "Frontend API calls not working"

1. Verificar que backend está corriendo: `curl http://localhost:3000/api/health`
2. Verificar CORS está habilitado (debería estarlo en vite.config.ts)
3. Ver Network tab en DevTools para headers CORS

## Testing de Endpoints

### Con cURL

```bash
# GET
curl http://localhost:3000/api/products

# POST con JSON
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# POST multipart (imágenes)
curl -X POST http://localhost:3000/api/products \
  -F "name=Pantalón" \
  -F "category=bottoms" \
  -F "userId=user_id" \
  -F "images=@/ruta/imagen.jpg"
```

### Con Postman/Insomnia

1. Crear colección
2. Configurar requests a `http://localhost:3000/api/*`
3. Para uploads, usar tipo "form-data"

## Limpieza de Docker

```bash
# Detener todo
docker-compose -f docker-compose.dev.yaml down

# Eliminar volúmenes (CUIDADO: borra BD)
docker-compose -f docker-compose.dev.yaml down -v

# Rebuild imágenes
docker-compose -f docker-compose.dev.yaml up --build
```

## Recursos Útiles

- **Prisma Docs:** https://www.prisma.io/docs/
- **Express.js:** https://expressjs.com/
- **Vite Docs:** https://vitejs.dev/
- **React Docs:** https://react.dev/
