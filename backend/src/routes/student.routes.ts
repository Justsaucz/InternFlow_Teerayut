import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';

const router = Router();

// GET Student Profile
router.get('/profile', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      }
    });

    // Auto-create default profile if missing
    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: {
          userId,
          studentId: '',
          major: '',
          faculty: '',
          university: '',
          year: 1,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        }
      });
    }

    res.json({
      ...profile,
      avatarUrl: profile.avatarUrl || profile.user.avatarUrl || null
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT Student Profile
router.put('/profile', authenticate, authorize([Role.STUDENT]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, studentId, major, faculty, university, year, gpa, bio, skills, avatarUrl } = req.body;
    const invalidText = [name, studentId, major, faculty, university, bio, avatarUrl].some(value => value != null && typeof value !== 'string');
    const invalidGpa = gpa !== undefined && gpa !== null && gpa !== '' && (!Number.isFinite(Number(gpa)) || Number(gpa) < 0 || Number(gpa) > 4);
    const invalidYear = year !== undefined && (!Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > 6);
    if (invalidText || invalidGpa || invalidYear || (skills !== undefined && (!Array.isArray(skills) || skills.some(skill => typeof skill !== 'string')))) {
      res.status(400).json({ error: 'Invalid profile fields, GPA (0–4), or academic year.' }); return;
    }

    if (name || avatarUrl !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
        }
      });
    }

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        studentId: studentId || '',
        major: major || '',
        faculty: faculty || '',
        university: university || '',
        year: year ? parseInt(year) : 1,
        gpa: gpa !== undefined && gpa !== null && gpa !== '' ? Number(gpa) : null,
        bio: bio || null,
        skills: Array.isArray(skills) ? skills : [],
        avatarUrl: avatarUrl || null
      },
      update: {
        studentId: studentId !== undefined ? studentId : undefined,
        major: major !== undefined ? major : undefined,
        faculty: faculty !== undefined ? faculty : undefined,
        university: university !== undefined ? university : undefined,
        year: year ? parseInt(year) : undefined,
        gpa: gpa !== undefined && gpa !== null && gpa !== '' ? Number(gpa) : (gpa === '' || gpa === null ? null : undefined),
        bio: bio !== undefined ? bio : undefined,
        skills: Array.isArray(skills) ? skills : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      }
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
