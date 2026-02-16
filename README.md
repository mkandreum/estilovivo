# EstiloVivo - Fashion App

Aplicación monolítica (una URL única) con:
- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Express + TypeScript
- **BD:** PostgreSQL + Prisma ORM
- **Deploy:** Docker Compose (Coolify, VPS)

## 🏗️ Estructura del Proyecto

```
estilovivo/
├── server/                 # 🔧 Backend Express
│   ├── src/
│   │   └── index.ts       # Servidor Express principal
│   ├── prisma/
│   │   ├── schema.prisma  # Modelos de BD
│   │   └── migrations/    # Cambios automáticos
│   ├── package.json
│   └── tsconfig.json
│
├── components/             # 🎨 Componentes React
├── pages/                 # 📄 Páginas React
├── App.tsx                # Aplicación principal
├── index.tsx              # Entry point React
├── index.html             # Template HTML
├── types.ts               # TypeScript types
│
├── Dockerfile             # Single builder para todo
├── docker-compose.yml     # Orquestación única
├── .env.dev               # Variables desarrollo
├── .env.prod              # Variables producción
├── .env.example           # Template
│
└── [config files]         # tsconfig, vite, package.json, etc
```

## 🚀 Inicio Rápido

### Desarrollo Local (Docker)

```bash
# 1. Clonar y entrar
git clone <repo> && cd estilovivo

# 2. Usar variables de desarrollo
cp .env.dev .env

# 3. Levantar todo
docker-compose up

# 4. Acceder
# Frontend: http://localhost:3000
# API: http://localhost:3000/api
# Base de datos: localhost:5432
```

**Todo se construye automáticamente en desarrollo con hot reload.**

### Producción / Coolify

```bash
# 1. Configurar variables
cp .env.prod .env
# Editar .env con contraseñas reales

# 2. Build + Run
docker-compose up -d

# Todo compila una sola vez y sirve lo estático.
```

## 📦 Una URL Única - Cómo Funciona

El backend Express sirve TODO:

```
GET  /              → index.html (React SPA)
GET  /app/*         → archivos estáticos compilados
GET  /api/*         → endpoints API
POST /api/products  → crear productos con imágenes
```

**Resultado:** Accedes a `https://tudominio.com` y tanto web como API salen de ahí.

## 🗄️ Base de Datos

### Migraciones automáticas

Al iniciar el container, Prisma migra automáticamente:
```bash
# Ya no necesitas correr esto manualmente
npx prisma migrate deploy
```

### Ver/editar datos

```bash
cd server
npx prisma studio
# Abre http://localhost:5555
```

### Crear nueva migración

```bash
cd server
# Editar server/prisma/schema.prisma
npx prisma migrate dev --name nombre_cambio
```

## 📡 API Endpoints

```typescript
GET    /api/health                    // Status servidor
GET    /api/products                  // Listar todos
GET    /api/products/:id              // Obtener uno
POST   /api/products                  // Crear (multipart: images)
DELETE /api/products/:id              // Eliminar

GET    /api/looks                     // Listar looks
POST   /api/looks                     // Crear (multipart: images)

GET    /api/users/:id                 // Perfil completo
POST   /api/users                     // Crear usuario

GET    /api/uploads/:filename         // Descargar imagen
```

## 🐳 Docker

### Un Dockerfile, dos targets

```dockerfile
# Desarrollo (con hot reload)
docker-compose up --build  # DOCKER_TARGET=development

# Producción (compilado, optimizado)
DOCKER_TARGET=production docker-compose up  # build estático
```

### Volúmenes persistentes

- `postgres_data` → Base de datos (automático backup)
- `uploads_data` → Imágenes de productos

## 📝 Variables de Ambiente

### Desarrollo (`.env.dev`)
```
DB_USER=estilovivo
DB_PASSWORD=dev_password
DB_NAME=estilovivo_dev
NODE_ENV=development
DOCKER_TARGET=development
```

### Producción (`.env.prod`)
```
DB_USER=estilovivo
DB_PASSWORD=CONTRASEÑA_FUERTE
DB_NAME=estilovivo
NODE_ENV=production
DOCKER_TARGET=production
```

## 🌐 Deploy en Coolify

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones completas.

**Lo importante:**
1. Usar `docker-compose.yml` (único archivo)
2. Configurar variables en Coolify
3. Listo - Coolify maneja SSL, DNS, etc.

## 🔧 Tech Stack

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Runtime** | Node.js | 20 Alpine |
| **Frontend** | React | 19.2 |
| **Build Frontend** | Vite | 6.2 |
| **Backend** | Express | 4.21 |
| **BD** | PostgreSQL | 16 Alpine |
| **ORM** | Prisma | 5.23 |
| **Uploads** | Multer | 1.4 |
| **Tipado** | TypeScript | 5.8 |

## ❌ Archivos Antiguos (ya no necesarios)

Se pueden eliminar:
- `Dockerfile.backend` ❌
- `Dockerfile.frontend` ❌
- `Dockerfile.production` ❌
- `docker-compose.dev.yaml` ❌

Todo está consolidado en:
- `Dockerfile` ✅
- `docker-compose.yml` ✅


