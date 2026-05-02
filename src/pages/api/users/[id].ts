import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const data = req.body;
      
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      // Convert numeric fields
      const numericFields = ['wageRate', 'allowance', 'insuranceDed', 'baseSalary', 'incentiveRate'];
      numericFields.forEach(field => {
        if (data[field] !== undefined) data[field] = Number(data[field]);
      });

      const updated = await prisma.user.update({
        where: { id: String(id) },
        data
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating user' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.user.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting user' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
