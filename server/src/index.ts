import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import multer from 'multer';
import { mkdirSync, existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const prisma = new PrismaClient();

const PORT = parseInt(process.env.PORT || '3000', 10);
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'beyour-secret-key-12345';

// Mailer Config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

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

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de uploads
app.use('/api/uploads', express.static(UPLOADS_DIR));

// ============= AUTH MIDDLEWARE =============
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ============= RUTAS API =============

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', env: NODE_ENV });
});

// ============= AUTHENTICATION =============

// REGISTER
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during registration' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// FORGOT PASSWORD
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry }
    });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: '"Beyour" <no-reply@beyour.app>',
      to: user.email,
      subject: 'Recuperar contraseña - Beyour',
      html: `<p>Hola ${user.name}, haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${resetUrl}">${resetUrl}</a>`
    });

    res.json({ message: 'Recovery email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during forgot password process' });
  }
});

// ============= PRODUCTOS =============

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

app.post('/api/products', authenticateToken, upload.array('images', 5), async (req: any, res: Response) => {
  try {
    const { name, category, userId } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const product = await prisma.product.create({
      data: {
        name,
        category,
        userId: userId || req.user.userId,
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

// ============= LOOKS =============

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

app.post('/api/looks', authenticateToken, upload.array('images', 10), async (req: any, res: Response) => {
  try {
    const { title, userId, productIds, isPublic } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const look = await prisma.look.create({
      data: {
        title,
        userId: userId || req.user.userId,
        isPublic: isPublic === 'true' || isPublic === true,
        products: {
          connect: productIds ? JSON.parse(productIds).map((id: string) => ({ id })) : [],
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
      include: { images: true, products: { include: { images: true } } },
    });

    res.status(201).json(look);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating look' });
  }
});

// ============= PLANNER =============

app.get('/api/planner/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId === 'me' ? (req as any).user.userId : req.params.userId;
    const entries = await prisma.plannerEntry.findMany({
      where: { userId },
      include: { look: { include: { images: true } } }
    });
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching planner' });
  }
});

app.post('/api/planner', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, lookId, eventNote, userId } = req.body;
    const targetUserId = userId === 'me' ? req.user.userId : userId;

    const entry = await prisma.plannerEntry.upsert({
      where: { userId_date: { userId: targetUserId, date } },
      update: { lookId, eventNote },
      create: { date, lookId, eventNote, userId: targetUserId },
      include: { look: { include: { images: true } } }
    });
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating planner' });
  }
});

// ============= TRIPS =============

app.get('/api/trips/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId === 'me' ? (req as any).user.userId : req.params.userId;
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: { items: true }
    });
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching trips' });
  }
});

app.post('/api/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    const { destination, dateStart, dateEnd, items, userId } = req.body;
    const targetUserId = userId === 'me' ? req.user.userId : userId;

    const trip = await prisma.trip.create({
      data: {
        destination,
        dateStart,
        dateEnd,
        userId: targetUserId,
        items: {
          create: items ? items.map((i: any) => ({
            label: i.label,
            checked: i.checked || false,
            isEssential: i.isEssential || false
          })) : []
        }
      },
      include: { items: true }
    });
    res.status(201).json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating trip' });
  }
});

// ============= FRONTEND SPA =============

const frontendPath = NODE_ENV === 'production'
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../../dist');

if (NODE_ENV === 'production') {
  app.use(express.static(frontendPath));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

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
