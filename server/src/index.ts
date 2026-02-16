import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import multer from 'multer';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
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

// ============= HEALTH =============
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', env: NODE_ENV });
});

// ============= AUTHENTICATION =============

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, gender, birthDate } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name,
        gender: gender || 'female',
        birthDate: birthDate ? new Date(birthDate) : null
      }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.status(201).json({ user: safe, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during registration' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { _count: { select: { followers: true, following: true } } }
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, _count, ...safe } = user;
    res.json({
      user: { ...safe, followersCount: _count.followers, followingCount: _count.following },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 3600000) }
    });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: '"Estilo Vivo" <no-reply@estilovivo.app>',
      to: user.email,
      subject: 'Recuperar contraseña - Estilo Vivo',
      html: `<p>Hola ${user.name}, haz clic aquí para restablecer tu contraseña:</p><a href="${resetUrl}">${resetUrl}</a>`
    });
    res.json({ message: 'Recovery email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during forgot password process' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { _count: { select: { followers: true, following: true, products: true, looks: true } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, _count, ...safe } = user;
    res.json({
      ...safe,
      followersCount: _count.followers,
      followingCount: _count.following,
      garmentCount: _count.products,
      lookCount: _count.looks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

app.put('/api/auth/profile', authenticateToken, upload.single('avatar'), async (req: any, res: Response) => {
  try {
    const { name, bio, mood, cycleTracking, musicSync, gender, birthDate } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (mood !== undefined) updateData.mood = mood;
    if (cycleTracking !== undefined) updateData.cycleTracking = cycleTracking === 'true' || cycleTracking === true;
    if (musicSync !== undefined) updateData.musicSync = musicSync === 'true' || musicSync === true;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (file) updateData.avatar = `/api/uploads/${file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      include: { _count: { select: { followers: true, following: true } } }
    });
    const { password: _, _count, ...safe } = user;
    res.json({ ...safe, followersCount: _count.followers, followingCount: _count.following });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// ============= PRODUCTOS =============

app.get('/api/products', authenticateToken, async (req: any, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.user.userId },
      include: { images: true, user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

app.get('/api/products/shop', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, category } = req.query;
    const where: any = { forSale: true, userId: { not: req.user.userId } };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (category && category !== 'all') where.category = category as string;

    const products = await prisma.product.findMany({
      where,
      include: { images: true, user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching shop products' });
  }
});

app.post('/api/products', authenticateToken, upload.array('images', 5), async (req: any, res: Response) => {
  try {
    const { name, category, color, season, brand, size, condition, description, price, forSale } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const product = await prisma.product.create({
      data: {
        name: name || category || 'Sin nombre',
        category: category || 'top',
        color: color || null,
        season: season || 'all',
        brand: brand || null,
        size: size || null,
        condition: condition || 'new',
        description: description || null,
        price: price ? parseFloat(price) : null,
        forSale: forSale === 'true' || forSale === true,
        userId: req.user.userId,
        images: {
          create: files ? files.map((f) => ({ filename: f.filename, url: `/api/uploads/${f.filename}` })) : [],
        },
      },
      include: { images: true, user: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating product' });
  }
});

app.put('/api/products/:id', authenticateToken, upload.array('images', 5), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, color, season, brand, size, condition, description, price, forSale, usageCount } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (color !== undefined) updateData.color = color;
    if (season !== undefined) updateData.season = season;
    if (brand !== undefined) updateData.brand = brand;
    if (size !== undefined) updateData.size = size;
    if (condition !== undefined) updateData.condition = condition;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (forSale !== undefined) updateData.forSale = forSale === 'true' || forSale === true;
    if (usageCount !== undefined) updateData.usageCount = parseInt(usageCount);

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        ...(files && files.length > 0 ? {
          images: { create: files.map((f) => ({ filename: f.filename, url: `/api/uploads/${f.filename}` })) }
        } : {}),
      },
      include: { images: true, user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating product' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

    for (const img of existing.images) {
      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (existsSync(filePath)) { try { unlinkSync(filePath); } catch (e) { /* ignore */ } }
    }
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

app.post('/api/products/:id/wear', authenticateToken, async (req: any, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { usageCount: { increment: 1 }, lastWorn: new Date() },
      include: { images: true }
    });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating wear count' });
  }
});

// ============= LOOKS =============

app.get('/api/looks', authenticateToken, async (req: any, res: Response) => {
  try {
    const looks = await prisma.look.findMany({
      where: { userId: req.user.userId },
      include: {
        images: true,
        user: { select: { id: true, name: true, avatar: true } },
        products: { include: { images: true } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    const likedIds = new Set((await prisma.like.findMany({
      where: { userId: req.user.userId, lookId: { in: looks.map(l => l.id) } },
      select: { lookId: true }
    })).map(l => l.lookId));

    res.json(looks.map(l => ({
      ...l, likesCount: l._count.likes, commentsCount: l._count.comments, isLiked: likedIds.has(l.id)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching looks' });
  }
});

app.get('/api/looks/feed', authenticateToken, async (req: any, res: Response) => {
  try {
    const looks = await prisma.look.findMany({
      where: { isPublic: true },
      include: {
        images: true,
        user: { select: { id: true, name: true, avatar: true } },
        products: { include: { images: true } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const lookIds = looks.map(l => l.id);
    const likedIds = new Set((await prisma.like.findMany({
      where: { userId: req.user.userId, lookId: { in: lookIds } },
      select: { lookId: true }
    })).map(l => l.lookId));

    const favIds = new Set((await prisma.favorite.findMany({
      where: { userId: req.user.userId, lookId: { in: lookIds } },
      select: { lookId: true }
    })).map(f => f.lookId));

    res.json(looks.map(l => ({
      ...l, likesCount: l._count.likes, commentsCount: l._count.comments,
      isLiked: likedIds.has(l.id), isFavorited: favIds.has(l.id)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching feed' });
  }
});

app.post('/api/looks', authenticateToken, upload.array('images', 10), async (req: any, res: Response) => {
  try {
    const { title, productIds, isPublic, mood } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const parsedIds = productIds ? (typeof productIds === 'string' ? JSON.parse(productIds) : productIds) : [];

    const look = await prisma.look.create({
      data: {
        title,
        userId: req.user.userId,
        isPublic: isPublic === 'true' || isPublic === true,
        mood: mood || null,
        products: { connect: parsedIds.map((id: string) => ({ id })) },
        images: { create: files ? files.map((f) => ({ filename: f.filename, url: `/api/uploads/${f.filename}` })) : [] },
      },
      include: {
        images: true, products: { include: { images: true } },
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } }
      },
    });
    res.status(201).json({ ...look, likesCount: 0, commentsCount: 0, isLiked: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating look' });
  }
});

app.put('/api/looks/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, isPublic, mood, productIds } = req.body;
    const existing = await prisma.look.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (isPublic !== undefined) updateData.isPublic = isPublic === 'true' || isPublic === true;
    if (mood !== undefined) updateData.mood = mood;
    if (productIds) updateData.products = { set: JSON.parse(productIds).map((pid: string) => ({ id: pid })) };

    const look = await prisma.look.update({
      where: { id }, data: updateData,
      include: { images: true, products: { include: { images: true } }, user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(look);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating look' });
  }
});

app.delete('/api/looks/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.look.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await prisma.look.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting look' });
  }
});

// ============= SOCIAL =============

app.post('/api/social/like', authenticateToken, async (req: any, res: Response) => {
  try {
    const { lookId } = req.body;
    const userId = req.user.userId;
    const existing = await prisma.like.findUnique({ where: { userId_lookId: { userId, lookId } } });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ liked: false, likesCount: await prisma.like.count({ where: { lookId } }) });
    } else {
      await prisma.like.create({ data: { userId, lookId } });
      res.json({ liked: true, likesCount: await prisma.like.count({ where: { lookId } }) });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

app.post('/api/social/comment', authenticateToken, async (req: any, res: Response) => {
  try {
    const { lookId, content } = req.body;
    const comment = await prisma.comment.create({
      data: { userId: req.user.userId, lookId, content },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

app.get('/api/social/comments/:lookId', authenticateToken, async (req: any, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { lookId: req.params.lookId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

app.delete('/api/social/comment/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const existing = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

app.post('/api/social/favorite', authenticateToken, async (req: any, res: Response) => {
  try {
    const { lookId, productId } = req.body;
    const userId = req.user.userId;
    if (lookId) {
      const existing = await prisma.favorite.findUnique({ where: { userId_lookId: { userId, lookId } } });
      if (existing) { await prisma.favorite.delete({ where: { id: existing.id } }); res.json({ favorited: false }); }
      else { await prisma.favorite.create({ data: { userId, lookId } }); res.json({ favorited: true }); }
    } else if (productId) {
      const existing = await prisma.favorite.findUnique({ where: { userId_productId: { userId, productId } } });
      if (existing) { await prisma.favorite.delete({ where: { id: existing.id } }); res.json({ favorited: false }); }
      else { await prisma.favorite.create({ data: { userId, productId } }); res.json({ favorited: true }); }
    } else {
      res.status(400).json({ error: 'lookId or productId required' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error toggling favorite' });
  }
});

app.get('/api/social/favorites', authenticateToken, async (req: any, res: Response) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.userId },
      include: {
        look: { include: { images: true, user: { select: { id: true, name: true, avatar: true } }, products: { include: { images: true } }, _count: { select: { likes: true, comments: true } } } },
        product: { include: { images: true, user: { select: { id: true, name: true, avatar: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(favorites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching favorites' });
  }
});

app.post('/api/social/follow', authenticateToken, async (req: any, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.userId;
    if (userId === targetUserId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: targetUserId } } });
    if (existing) { await prisma.follow.delete({ where: { id: existing.id } }); res.json({ following: false }); }
    else { await prisma.follow.create({ data: { followerId: userId, followingId: targetUserId } }); res.json({ following: true }); }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error toggling follow' });
  }
});

// ============= PLANNER =============

app.get('/api/planner/:userId', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.userId : req.params.userId;
    const entries = await prisma.plannerEntry.findMany({
      where: { userId },
      include: { look: { include: { images: true, products: { include: { images: true } } } } }
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
    const targetUserId = (userId === 'me' || !userId) ? req.user.userId : userId;

    const entry = await prisma.plannerEntry.upsert({
      where: { userId_date: { userId: targetUserId, date } },
      update: { lookId: lookId || null, eventNote },
      create: { date, lookId: lookId || null, eventNote, userId: targetUserId },
      include: { look: { include: { images: true, products: { include: { images: true } } } } }
    });

    // Increment usage count for garments in the assigned look
    if (lookId) {
      const look = await prisma.look.findUnique({ where: { id: lookId }, include: { products: true } });
      if (look) {
        await prisma.product.updateMany({
          where: { id: { in: look.products.map(p => p.id) } },
          data: { usageCount: { increment: 1 }, lastWorn: new Date() }
        });
      }
    }

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating planner' });
  }
});

app.delete('/api/planner/:date', authenticateToken, async (req: any, res: Response) => {
  try {
    await prisma.plannerEntry.delete({ where: { userId_date: { userId: req.user.userId, date: req.params.date } } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting planner entry' });
  }
});

// ============= TRIPS =============

app.get('/api/trips/:userId', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.userId : req.params.userId;
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: { items: true, garments: { include: { product: true } } },
      orderBy: { dateStart: 'asc' }
    });
    const mapped = trips.map(trip => ({
      ...trip,
      garments: trip.garments.map(g => g.product)
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching trips' });
  }
});

app.post('/api/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    const { destination, dateStart, dateEnd, items, garmentIds } = req.body;
    const garmentsData = Array.isArray(garmentIds)
      ? { garments: { create: garmentIds.map((id: string) => ({ productId: id })) } }
      : {};
    const trip = await prisma.trip.create({
      data: {
        destination, dateStart, dateEnd, userId: req.user.userId,
        items: { create: items ? items.map((i: any) => ({ label: i.label, checked: i.checked || false, isEssential: i.isEssential || false })) : [] },
        ...garmentsData
      },
      include: { items: true, garments: { include: { product: true } } }
    });
    res.status(201).json({
      ...trip,
      garments: trip.garments.map(g => g.product)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating trip' });
  }
});

app.put('/api/trips/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    const { destination, dateStart, dateEnd, garmentIds } = req.body;
    const updateData: any = {
      ...(destination && { destination }),
      ...(dateStart && { dateStart }),
      ...(dateEnd && { dateEnd })
    };
    if (Array.isArray(garmentIds)) {
      updateData.garments = {
        deleteMany: {},
        create: garmentIds.map((id: string) => ({ productId: id }))
      };
    }
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: updateData,
      include: { items: true, garments: { include: { product: true } } }
    });
    res.json({
      ...trip,
      garments: trip.garments.map(g => g.product)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating trip' });
  }
});

app.delete('/api/trips/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting trip' });
  }
});

app.put('/api/trips/:tripId/items/:itemId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { checked, label, isEssential } = req.body;
    const item = await prisma.tripItem.update({
      where: { id: req.params.itemId },
      data: { ...(checked !== undefined && { checked }), ...(label !== undefined && { label }), ...(isEssential !== undefined && { isEssential }) }
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating trip item' });
  }
});

app.post('/api/trips/:tripId/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const item = await prisma.tripItem.create({
      data: { label: req.body.label, isEssential: req.body.isEssential || false, tripId: req.params.tripId }
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding trip item' });
  }
});

app.delete('/api/trips/:tripId/items/:itemId', authenticateToken, async (req: any, res: Response) => {
  try {
    await prisma.tripItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting trip item' });
  }
});

// ============= STATS =============

app.get('/api/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const [garmentCount, lookCount, salesCount, tripsCount, totalUsage] = await Promise.all([
      prisma.product.count({ where: { userId } }),
      prisma.look.count({ where: { userId } }),
      prisma.product.count({ where: { userId, forSale: true } }),
      prisma.trip.count({ where: { userId } }),
      prisma.product.aggregate({ where: { userId }, _sum: { usageCount: true } }),
    ]);

    const mostWorn = await prisma.product.findFirst({
      where: { userId }, orderBy: { usageCount: 'desc' }, include: { images: true }
    });
    const leastWorn = await prisma.product.findMany({
      where: { userId, usageCount: { lt: 2 } }, include: { images: true }, take: 5
    });

    res.json({
      garmentCount, lookCount, salesCount, tripsCount,
      totalUsage: totalUsage._sum.usageCount || 0,
      mostWorn, leastWornCount: leastWorn.length, leastWorn
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching stats' });
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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

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
