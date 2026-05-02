import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await prisma.storeProfile.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default' },
      });
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching settings' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const data = req.body;
      
      // Helper to parse number safely
      const parseNum = (val: any, fallback: number) => {
        const parsed = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };

      const parseWorkDays = (val: any) => {
        const parsed = typeof val === 'number' ? Math.floor(val) : parseInt(val);
        return isNaN(parsed) ? 26 : parsed;
      };

      const profileData = {
        name: data.name || "Kasirai POS",
        address: data.address || "",
        phone: data.phone || "",
        taxPercentage: parseNum(data.taxPercentage, 0),
        enableTax: Boolean(data.enableTax),
        serviceIncentivePercentage: parseNum(data.serviceIncentivePercentage, 10),
        startTime: data.startTime || "09:00",
        endTime: data.endTime || "18:00",
        attendanceRate: parseNum(data.attendanceRate, 0),
        latePenalty: parseNum(data.latePenalty, 0),
        absentPenalty: parseNum(data.absentPenalty, 0),
        totalWorkDays: parseWorkDays(data.totalWorkDays),
        baseSalary: parseNum(data.baseSalary, 0),
        overtimeRate: parseNum(data.overtimeRate, 0),
        serviceIncentive: parseNum(data.serviceIncentive, 10),
      };

      const settings = await prisma.storeProfile.upsert({
        where: { id: 'default' },
        update: profileData,
        create: {
          id: 'default',
          ...profileData
        },
      });
      
      return res.status(200).json(settings);
    } catch (error: any) {
      console.error('Save Settings Error:', error);
      // Log to a file for debugging in this environment
      const fs = require('fs');
      const logEntry = `[${new Date().toISOString()}] SAVE ERROR: ${error.message}\nSTACK: ${error.stack}\nBODY: ${JSON.stringify(req.body)}\n\n`;
      fs.appendFileSync('api-error.log', logEntry);
      
      return res.status(500).json({ 
        message: 'Error saving settings', 
        detail: error.message,
        error: error.toString()
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
