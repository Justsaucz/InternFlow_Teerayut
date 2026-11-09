import prisma from './prisma';
import { HttpError } from './workflow';
import { Role } from '@prisma/client';

export interface ManagedSession { token: string; cookie?: string }
export const managedAuthEnabled = () => Boolean(process.env.NEON_AUTH_URL);

export async function authRequest(path: string, body?: unknown, session?: ManagedSession) {
  const base = process.env.NEON_AUTH_URL?.replace(/\/$/, '');
  if (!base || new URL(base).protocol !== 'https:') throw new HttpError(503, 'Account service is not configured.');
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {'Content-Type':'application/json', Origin:process.env.FRONTEND_URL!,
      ...(session ? {Authorization:'Bearer '+session.token,...(session.cookie?{Cookie:session.cookie}:{})} : {})},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(15000), redirect:'error'
  }).catch(() => {throw new HttpError(503, 'Account service is temporarily unavailable. Please try again.');});
  const data = await response.json().catch(() => null) as any;
  if (!response.ok) throw new HttpError([400,401,403,409,422,429].includes(response.status)?response.status:503,
    typeof data?.message==='string'?data.message:'The account request could not be completed.');
  const cookie = response.headers.getSetCookie().find(value => /session_token=/.test(value))?.split(';')[0];
  return {data,cookie};
}

export async function registerManagedAccount(value: {email:string;password:string;name:string;role:Role}) {
  if(value.password.length<8)throw new HttpError(400,'Use a password of at least 8 characters.');
  if(value.email.endsWith('.test') || value.email.endsWith('.invalid'))throw new HttpError(400,'Use an email address where you can receive a verification code.');
  if(await prisma.user.findUnique({where:{email:value.email}}))throw new HttpError(409,'Email already in use.');
  const {data}=await authRequest('/sign-up/email',{email:value.email,password:value.password,name:value.name});
  if(!data?.user?.id || data.user.email.toLowerCase()!==value.email)throw new HttpError(502,'Account creation could not be confirmed.');
  return prisma.user.create({data:{id:data.user.id,email:value.email,name:value.name,role:value.role,
    password:'managed-neon-auth',emailVerificationRequired:true,
    ...(value.role===Role.STUDENT?{studentProfile:{create:{studentId:'',major:'',faculty:'',year:1,skills:[]}}}:
      {companyProfile:{create:{companyName:value.name,industry:''}}})}});
}

export async function signInManagedAccount(email:string,password:string) {
  const {data,cookie}=await authRequest('/sign-in/email',{email,password});
  if(!data?.token || !data.user?.emailVerified)throw new HttpError(403,'Verify your email before signing in.');
  const user=await prisma.user.findUnique({where:{id:data.user.id}});
  if(!user || user.email.toLowerCase()!==data.user.email.toLowerCase())throw new HttpError(403,'The account has no application profile. Please contact the administrator.');
  if(!user.emailVerifiedAt)await prisma.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date()}});
  return {user,session:{token:data.token,...(cookie?{cookie}:{})} as ManagedSession};
}

export async function validateManagedSession(session: ManagedSession | undefined, userId:string) {
  if(!session || typeof session.token!=='string' || session.token.length>4096 || (session.cookie && /[\r\n]/.test(session.cookie)))return false;
  try {
    const {data}=await authRequest('/get-session',undefined,session);
    return Boolean(data?.session && data.user?.id===userId && data.user?.emailVerified===true);
  } catch(error) {
    if(error instanceof HttpError && [401,403].includes(error.status))return false;
    throw error;
  }
}
