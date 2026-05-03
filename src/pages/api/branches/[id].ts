import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // Protect the API: Only authenticated users can access
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded: any = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  
  // Only Admin should be able to create/update branches
  if (decoded.role !== 'Admin' && decoded.role !== 'Owner') {
    return res.status(403).json({ error: 'Forbidden. Only Admin can manage branches.' });
  }

  if (req.method === 'PUT') {
    try {
      const { latitude, longitude, radiusMeters } = req.body;
      console.log(`Updating branch ${id}:`, { latitude, longitude, radiusMeters });
      
      const updated = await prisma.branch.update({
        where: { id: String(id) },
        data: {
          latitude: latitude !== undefined ? latitude : undefined,
          longitude: longitude !== undefined ? longitude : undefined,
          radiusMeters: radiusMeters !== undefined ? radiusMeters : undefined,
        },
      });
      console.log(`Successfully updated branch ${id}`);
      return res.status(200).json(updated);
    } catch (error) {
      console.error('Update branch error:', error);
      return res.status(500).json({ error: 'Failed to update branch', details: (error as any).message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
