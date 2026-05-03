import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    try {
      const { name, roleId, branchId, password, email, wageType, wageRate, allowance, insuranceDed, shiftId, baseSalary, phone, address, incentiveRate, incentiveType } = req.body;
      
      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

      const newUser = await prisma.user.create({
        data: {
          name, 
          roleId, // Gunakan roleId untuk relasi
          branchId, 
          password: hashedPassword,
          email, 
          wageType, 
          wageRate: Number(wageRate) || 0,
          allowance: Number(allowance) || 0,
          insuranceDed: Number(insuranceDed) || 0,
          shiftId,
          baseSalary: Number(baseSalary) || 0,
          phone,
          address,
          incentiveRate: Number(incentiveRate) || 0,
          incentiveType: incentiveType || "None"
        },
        include: {
          role: { include: { permissions: true } }
        }
      });
      return res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating user' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
