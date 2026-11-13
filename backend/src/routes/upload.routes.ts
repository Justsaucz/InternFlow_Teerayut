import { browserFileUrl } from '../lib/logbook-urls';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { activeStatuses } from '../lib/workflow';
import { databaseFiles, databaseStorage } from '../lib/fileStorage';

const router = Router();

// Configure AWS S3 Client
// In production, ensure these environment variables are set.
const s3Config = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Create Multer-S3 Storage
const s3Storage = multerS3({
  s3: s3Config,
  bucket: process.env.S3_BUCKET_NAME || 'internflow-bucket',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize filename to avoid S3 issues with special characters
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${['/evidence','/application','/logbook'].includes((req as Request).path) ? 'private-uploads' : 'uploads'}/${uniqueSuffix}-${safeOriginalName}`);
  }
});

// Mock Storage Fallback for local testing if AWS keys are not provided
import path from 'path';
import fs from 'fs';
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const privateUploadDir = process.env.PRIVATE_UPLOAD_DIR || path.join(__dirname, '../../private-uploads');
fs.mkdirSync(privateUploadDir, { recursive: true });
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ['/evidence','/application','/logbook'].includes(req.path) ? privateUploadDir : uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Determine which storage to use
const isAwsConfigured = process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME;
const upload = multer({ 
  storage: databaseFiles() ? databaseStorage : isAwsConfigured ? s3Storage : localStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed: Record<string, string[]> = {
      '.pdf': ['application/pdf'], '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
      '.zip': ['application/zip', 'application/x-zip-compressed'],
      '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.webp': ['image/webp']
    };
    if (!allowed[path.extname(file.originalname).toLowerCase()]?.includes(file.mimetype)) {
      callback(new Error('Unsupported file type. Upload PDF, DOC, DOCX, ZIP, PNG, JPEG, or WEBP.')); return;
    }
    callback(null, true);
  }
});

router.post(['/', '/evidence', '/application', '/logbook'], authenticate, (req:AuthRequest, res, next) => {
  if(req.path === '/application' && req.user!.role !== 'STUDENT'){res.status(403).json({error:'Only students can upload application files.'});return;}
  if(req.path === '/logbook' && req.user!.role !== 'STUDENT'){res.status(403).json({error:'Only students can upload logbook files.'});return;}
  upload.single('file')(req, res, error => {
    if (error) {
      res.status(400).json({ error: error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 'File size must be under 5MB.' : error.message }); return;
    }
    next();
  });
}, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    let fileUrl = '';
    
    // Type casting to handle both multer-s3 and local multer types
    if (isAwsConfigured && (req.file as any).location) {
      // S3 File
      fileUrl = (req.file as any).location;
    } else {
      // Local File
      fileUrl = `/${['/evidence','/application','/logbook'].includes(req.path) ? 'private-uploads' : 'uploads'}/${req.file.filename}`;
    }
    
    let documentId: string | undefined;
    if (req.path === '/logbook') {
      const owned = await prisma.application.findFirst({ where: { id: typeof req.body.applicationId === 'string' ? req.body.applicationId : '', student: { userId: req.user!.userId }, status: { in: activeStatuses } } });
      if (!owned) { res.status(403).json({error:'An active placement is required.'}); return; }
      const document = await prisma.document.create({data:{userId:req.user!.userId,applicationId:owned.id,title:req.file.originalname,fileUrl,type:'LOGBOOK_ATTACHMENT',mimeType:req.file.mimetype,byteSize:req.file.size}});
      documentId=document.id;
    }
    if (req.path === '/evidence') {
      if (typeof req.body.applicationId !== 'string' || !req.body.applicationId) { res.status(400).json({ error: 'An application ID is required.' }); return; }
      const owned = await prisma.application.findFirst({ where: { id: req.body.applicationId, student: { userId: req.user!.userId } } });
      if (req.user!.role !== 'STUDENT' || !owned) { res.status(403).json({ error: 'Upload evidence only for your own application.' }); return; }
      const document = await prisma.document.create({ data: { userId: req.user!.userId, applicationId: owned.id, title: req.file.originalname, fileUrl, type: 'PORTFOLIO_EVIDENCE', mimeType: req.file.mimetype, byteSize: req.file.size } });
      documentId = document.id;
    }
    if(req.path === '/application'){
      const document=await prisma.document.create({data:{userId:req.user!.userId,title:req.file.originalname,fileUrl,type:'PORTFOLIO_EVIDENCE',mimeType:req.file.mimetype,byteSize:req.file.size}});
      documentId=document.id;
    }
    const responseUrl = req.path === '/logbook' ? browserFileUrl(fileUrl) : fileUrl;
    res.status(200).json({ url: responseUrl, fileUrl: responseUrl, documentId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error during file upload' });
  }
});

export default router;
