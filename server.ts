import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { PrismaClient, Prisma, Role, ResponseStatus, RequestStatus, ReservationStatus, FamilyRole } from '@prisma/client';
import { z } from 'zod';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const db = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? '';
// Relax the strict JWT_SECRET requirement for development while enforcing it in production.
if (process.env.NODE_ENV === 'production') {
  if (JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
} else {
  if (JWT_SECRET.length < 32) console.warn('Warning: JWT_SECRET is shorter than 32 characters — only use for local development');
}
const REQUEST_RADIUS_KM = Number(process.env.REQUEST_RADIUS_KM ?? 25);
const REQUEST_TTL_HOURS = Number(process.env.REQUEST_TTL_HOURS ?? 24);
const RESERVATION_TTL_HOURS = Number(process.env.RESERVATION_TTL_HOURS ?? 4);

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.use(helmet({contentSecurityPolicy:false}));
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:8081').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({origin:(origin,cb)=>!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)?cb(null,true):cb(new Error('CORS origin denied'))}));
app.use(express.json({limit:'1mb'}));
const generalLimiter=rateLimit({windowMs:60_000,limit:120,standardHeaders:true,legacyHeaders:false});
const authLimiter=rateLimit({windowMs:15*60_000,limit:30,standardHeaders:true,legacyHeaders:false});
app.use(generalLimiter);

const phone=z.string().regex(/^[6-9]\d{9}$/);
const id=z.string().min(1).max(100);
type Req=express.Request & {auth?:{userId:string;role:Role;sessionId:string}};
const hash=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
const publicUser=(u:any)=>({id:u.id,name:u.name,phone:u.phone,role:u.role,active:u.active,pharmacy:u.pharmacy??null})
function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const r = Math.PI / 180;

  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * r) *
      Math.cos(bLat * r) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

function daysRemaining(remaining: number, doses: number): number {
  if (
    !Number.isFinite(remaining) ||
    !Number.isFinite(doses) ||
    doses <= 0
  ) {
    return 0;
  }

  return remaining <= 0 ? 0 : Math.ceil(remaining / doses);
}

function sign(
  userId: string,
  role: Role,
  sessionId: string
): string {
  return jwt.sign(
    {
      sub: userId,
      role,
      sid: sessionId,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

async function createSession(
  userId: string,
  role: Role
): Promise<{ token: string; sessionId: string }> {
  const raw = crypto.randomBytes(32).toString('hex');

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hash(raw),
      expiresAt: new Date(
  Date.now() + 7 * 24 * 60 * 60 * 1000
),
    },
  });

  return {
    token: sign(userId, role, session.id),
    sessionId: session.id,
  };
}
async function auth(
  req: Req,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const authorization = req.headers.authorization;

    const raw =
      authorization?.startsWith('Bearer ')
        ? authorization.slice(7).trim()
        : '';

    if (!raw) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tokenHash = hash(raw);

    const session = await db.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            active: true,
          },
        },
      },
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    if (session.revokedAt) {
      res.status(401).json({ error: 'Session revoked' });
      return;
    }

    if (session.expiresAt <= new Date()) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    if (!session.user.active) {
      res.status(403).json({ error: 'Account inactive' });
      return;
    }

    req.auth = {
      userId: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    next(error);
  }
}
async function audit(
  actorUserId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: unknown
) {
  try {
    await db.auditLog.create({
      data: {
        actorUserId,
        action,
        entity,
        entityId,
        metadata:
          metadata == null
            ? undefined
            : JSON.parse(JSON.stringify(metadata)),
      },
    });
  } catch (e) {
    console.error('audit failed', e);
  }
}

async function notify(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  const n = await db.notification.create({
    data: {
      userId,
      title,
      body,
      data: JSON.parse(JSON.stringify(data)),
    },
  });

  const tokens = await db.pushToken.findMany({
    where: { userId },
  });

  for (const _token of tokens) {
    // Push notification provider can be added here.
  }

  return n;
}
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'medbridge-api',
    time: new Date().toISOString(),
  })
);

app.get('/ready', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return res.json({ ready: true });
  } catch {
    return res.status(503).json({ ready: false });
  }
});

app.use((_req, res) =>
  res.status(404).json({ error: 'Route not found' })
);

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.issues });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
);

let server: ReturnType<typeof app.listen> | undefined;

const shutdown = async () => {
  await db.$disconnect();

  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () =>
    console.log(`MEDBRIDGE API listening on :${PORT}`)
  );

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { app, db, distanceKm, daysRemaining };

