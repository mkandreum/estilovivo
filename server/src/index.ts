import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import multer from 'multer';
import { mkdirSync, existsSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Crear directorio de uploads si no existe
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar almacenamiento de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de uploads
app.use('/api/uploads', express.static(UPLOADS_DIR));

// ============= RUTAS API =============

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', env: NODE_ENV });
});

// ============= PRODUCTOS =============

// GET todos los productos
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// GET producto por ID
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        images: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// POST crear producto
app.post('/api/products', upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    const { name, description, price, brand, category, size, color, userId } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: price ? parseFloat(price) : null,
        brand,
        category,
        size,
        color,
        userId,
        images: {
          create: files
            ? files.map((file) => ({
                filename: file.filename,
                url: `/api/uploads/${file.filename}`,
              }))
            : [],
        },
      },
      include: { images: true },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating product' });
  }
});

// DELETE producto
app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// ============= USUARIOS =============

// GET perfil usuario
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        products: { include: { images: true } },
        looks: { include: { images: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// POST crear usuario
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, name, avatar, bio } = req.body;
    const user = await prisma.user.create({
      data: { email, name, avatar, bio },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// ============= LOOKS =============

// GET todos los looks
app.get('/api/looks', async (req: Request, res: Response) => {
  try {
    const looks = await prisma.look.findMany({
      include: {
        images: true,
        user: { select: { id: true, name: true, avatar: true } },
        products: { include: { images: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(looks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching looks' });
  }
});

// POST crear look
app.post('/api/looks', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { title, description, userId, productIds } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const look = await prisma.look.create({
      data: {
        title,
        description,
        userId,
        products: {
          connect: productIds ? productIds.map((id: string) => ({ id })) : [],
        },
        images: {
          create: files
            ? files.map((file) => ({
                filename: file.filename,
                url: `/api/uploads/${file.filename}`,
              }))
            : [],
        },
      },
      include: { images: true, products: true },
    });

    res.status(201).json(look);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating look' });
  }
});

// ============= FRONTEND SPA =============

// Servir el frontend compilado en ruta raíz
const frontendPath = NODE_ENV === 'production' 
  ? path.join(__dirname, '../public') 
  : path.join(__dirname, '../../dist');

if (NODE_ENV === 'production') {
  app.use(express.static(frontendPath));

  // Redirigir todas las rutas que no sean /api a index.html (SPA)
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// ============= MANEJO DE ERRORES =============

// 404 handler
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else if (NODE_ENV === 'production') {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ============= INICIO DEL SERVIDOR =============

async function main() {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`  API: http://localhost:${PORT}/api`);
      console.log(`  Web: http://localhost:${PORT}`);
      console.log(`  Env: ${NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
