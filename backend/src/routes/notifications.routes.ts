import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleRouteError } from '../lib/workflow';
const router = Router();
router.use(authenticate);
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const where = { userId: req.user!.userId };
    const [items, unreadCount] = await Promise.all([prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }), prisma.notification.count({ where: { ...where, readAt: null } })]);
    res.json({ items, unreadCount });
  } catch (error) { handleRouteError(res, error, 'Failed to load notifications.'); }
});
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try { await prisma.notification.updateMany({ where: { userId: req.user!.userId, readAt: null }, data: { readAt: new Date() } }); res.json({ message: 'Notifications marked as read.' }); }
  catch (error) { handleRouteError(res, error, 'Failed to update notifications.'); }
});
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try { await prisma.notification.updateMany({ where: { id: req.params.id as string, userId: req.user!.userId, readAt: null }, data: { readAt: new Date() } }); res.json({ message: 'Notification marked as read.' }); }
  catch (error) { handleRouteError(res, error, 'Failed to update notification.'); }
});
export default router;
