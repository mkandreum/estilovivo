# Dockerfile - Builder único para Frontend + Backend
# Soporta dev y production automáticamente

# ============= STAGE 1: Dependencies =============
FROM node:20-alpine AS dependencies

# Ensure we install ALL dependencies (including devDependencies) for building
ENV NODE_ENV=development

WORKDIR /app

# Copiar package.json de ambos lados
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar frontend deps (including devDependencies needed for build)
# Using npm ci for reproducible installs, fallback to npm install
RUN npm ci --prefer-offline --no-audit || npm install --prefer-offline --no-audit

# Instalar backend deps (including devDependencies needed for build)
WORKDIR /app/server
RUN npm ci --prefer-offline --no-audit || npm install --prefer-offline --no-audit

WORKDIR /app

# ============= STAGE 2: Build Frontend =============
FROM dependencies AS frontend-build

WORKDIR /app

# Copiar todo lo necesario para el frontend
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY index.tsx ./
COPY App.tsx ./
COPY types.ts ./
COPY components ./components
COPY pages ./pages

# Build React
RUN npm run build

# ============= STAGE 3: Build Backend =============
FROM dependencies AS backend-build

WORKDIR /app/server

# Copiar código backend
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/prisma ./prisma

# Build TypeScript
RUN npm run build

# ============= STAGE 4: Production Runtime =============
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Instalar solo runtime deps
COPY server/package*.json ./
RUN npm ci --only=production

# Copiar backend compilado
COPY --from=backend-build /app/server/dist ./dist
COPY --from=backend-build /app/server/prisma ./prisma

# Generar Prisma Client
RUN npx prisma generate

# Copiar frontend compilado a carpeta pública del backend
COPY --from=frontend-build /app/dist ./public

# Crear directorio para uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]

# ============= STAGE 5: Development Runtime =============
FROM dependencies AS development

WORKDIR /app

ENV NODE_ENV=development

# Para desarrollo con hot reload
# Instalar herramienta para watch
RUN npm install -g concurrently

EXPOSE 3000
EXPOSE 5173

# En desarrollo, ejecutar backend y frontend
CMD ["sh", "-c", "cd server && npm run dev"]
