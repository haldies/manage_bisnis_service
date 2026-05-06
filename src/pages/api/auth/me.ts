import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = verifyToken(token) as { userId: string } | null;
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        username: true, 
        name: true, 
        role: {
          include: { permissions: true }
        }, 
        createdAt: true 
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[AUTH ME] User: ${user.username}, Role: ${user.role?.name}, Perms Count: ${user.role?.permissions?.length || 0}`);

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}
