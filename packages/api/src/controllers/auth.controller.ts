import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';

const jwtOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as any };

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, jwtOptions);

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, jwtOptions);

    res.json({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Token not provided' });
      return;
    }

    const oldToken = header.slice(7);
    const payload = jwt.verify(oldToken, env.JWT_SECRET) as { userId: string };
    const token = jwt.sign({ userId: payload.userId }, env.JWT_SECRET, jwtOptions);

    res.json({ success: true, data: { token } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
