import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET is public — needed before/during login to populate branch list
  if (req.method === 'GET') {
    try {
      const branches = await prisma.branch.findMany();
      return res.status(200).json(branches);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch branches' });
    }
  }

  // All mutating methods require a valid token
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded: any = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });

  // Only Owner can create/update/delete branches
  if (decoded.role !== 'Owner') {
    return res.status(403).json({ error: 'Forbidden. Only Owner can manage branches.' });
  }

  if (req.method === 'POST') {
    try {
      const { name, address, latitude, longitude, radiusMeters, phone } = req.body;
      const newBranch = await prisma.branch.create({
        data: {
          name,
          address: address || '',
          phone: phone || '',
          latitude: Number(latitude) || 0,
          longitude: Number(longitude) || 0,
          radiusMeters: Number(radiusMeters) || 100
        }
      });
      return res.status(201).json(newBranch);
    } catch (error) {
      console.error('Create branch error:', error);
      return res.status(500).json({ error: 'Failed to create branch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
