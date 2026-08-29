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
const publicUser=(u:any)=>({id:u.id,name:u.name,phone:u.phone,role:u.role,active:u.active,pharmacy:u.pharmacy??null});
function distanceKm(aLat:number,aLng:number,bLat:number,bLng:number){const R=6371,r=Math.PI/180,dLat=(bLat-aLat)*r,dLng=(bLng-aLng)*r;const x=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function daysRemaining(remaining:number,doses:number){if(!Number.isFinite(remaining)||!Number.isFinite(doses)||doses<=0)return 0;return remaining<=0?0:Math.ceil(remaining/doses);}
function sign(userId:string,role:Role,sessionId:string){return jwt.sign({sub:userId,role,sid:sessionId},JWT_SECRET,{expiresIn:'7d'});} 
async function createSession(userId:string,role:Role){const raw=crypto.randomBytes(32).toString('hex');const s=await db.session.create({data:{userId,tokenHash:hash(raw),expiresAt:new Date(Date.now()+7*24*60*60*1000)}});return {sessionId:s.id,token:raw};}
async function auth(req:Req,res:express.Response,next:express.NextFunction){try{const raw=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';if(!raw)return res.status(401).json({error:'Unauthorized'});const payload=jwt.verify(raw,JWT_SECRET) as any;const sid=payload.sid as string;const sess=await db.session.findUnique({where:{id:sid}});if(!sess||sess.revokedAt||sess.expiresAt<new Date())return res.status(401).json({error:'Unauthorized'});req.auth={userId:payload.sub,role:payload.role,sessionId:sess.id};next();}catch(e){return res.status(401).json({error:'Unauthorized'});}}
function roles(...allowed:Role[]){return (req:Req,res:express.Response,next:express.NextFunction)=>req.auth&&allowed.includes(req.auth.role)?next():res.status(403).json({error:'Forbidden'});} 
async function audit(actorUserId:string|undefined,action:string,entity:string,entityId?:string,metadata?:unknown){try{await db.auditLog.create({data:{actorUserId,action,entity,entityId,metadata}});}catch(e){console.error('audit failed',e);}} 
async function notify(userId:string,title:string,body:string,data:Record<string,unknown>={}){const n=await db.notification.create({data:{userId,title,body,data}});const tokens=await db.pushToken.findMany({where:{userId}});for(const t of tokens){/* push logic omitted for brevity */}return n;}
async function restoreStock(tx:Prisma.TransactionClient,r:any){if(r.stockRestoredAt)return;const req=await tx.medicineRequest.findUnique({where:{id:r.requestId},include:{medicine:true}});if(!req)return;await tx.inventory.updateMany({where:{pharmacyId:r.pharmacyId,medicineName:req.medicine.name},data:{quantity:{increment:r.quantity}}});await tx.reservation.update({where:{id:r.id},data:{stockRestoredAt:new Date()}});}
async function expire(){const now=new Date();const expiredReq=await db.medicineRequest.findMany({where:{status:RequestStatus.OPEN,expiresAt:{lt:now}},select:{id:true,userId:true,medicineId:true}});for(const er of expiredReq){await db.medicineRequest.update({where:{id:er.id},data:{status:RequestStatus.EXPIRED}});} const expired=await db.reservation.findMany({where:{status:ReservationStatus.ACTIVE,expiresAt:{lt:now}}});for(const r of expired){await db.$transaction(async tx=>{await restoreStock(tx,r);await tx.reservation.update({where:{id:r.id},data:{status:ReservationStatus.EXPIRED}});});}}

app.get('/health',(_req,res)=>res.json({ok:true,service:'medbridge-api',time:new Date().toISOString()}));
app.get('/ready',async(_req,res)=>{try{await db.$queryRaw`SELECT 1`;res.json({ready:true});}catch{res.status(503).json({ready:false});}});

app.post('/auth/register',authLimiter,async(req,res,next)=>{try{const p=z.object({name:z.string().trim().min(2).max(80),phone:z.string().regex(/^[6-9]\d{9}$/),password:z.string().min(8).max(72),role:z.enum(['PATIENT','PHARMACY'])}).parse(req.body);const existing=await db.user.findUnique({where:{phone:p.phone}});if(existing)return res.status(409).json({error:'Phone already registered'});const hashP=await bcrypt.hash(p.password,10);const u=await db.user.create({data:{name:p.name,phone:p.phone,passwordHash:hashP,role:p.role}});const s=await createSession(u.id,u.role);res.json({user:publicUser(u),token:s.token});}catch(e){next(e);}});
app.post('/auth/login',authLimiter,async(req,res,next)=>{try{const p=z.object({phone:z.string().regex(/^[6-9]\d{9}$/),password:z.string().min(1)}).parse(req.body);const u=await db.user.findUnique({where:{phone:p.phone}});if(!u)return res.status(401).json({error:'Invalid credentials'});const ok=await bcrypt.compare(p.password,u.passwordHash);if(!ok)return res.status(401).json({error:'Invalid credentials'});const s=await createSession(u.id,u.role);res.json({user:publicUser(u),token:s.token});}catch(e){next(e);}});
app.post('/auth/logout',auth,async(req:Req,res)=>{await db.session.update({where:{id:req.auth!.sessionId},data:{revokedAt:new Date()}});res.status(204).send();});

app.use((_req,res)=>res.status(404).json({error:'Route not found'}));

app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(err);if(err instanceof z.ZodError)return res.status(400).json({error:'Invalid input',details:err.errors});res.status(500).json({error:'Internal server error'});});

let server: ReturnType<typeof app.listen> | undefined;
const shutdown=async()=>{await db.$disconnect();if(server)server.close(()=>process.exit(0));else process.exit(0);};
if(process.env.NODE_ENV !== 'test'){server=app.listen(PORT,()=>console.log(`MEDBRIDGE API listening on :${PORT}`));process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);} 
export { app, db, distanceKm, daysRemaining };