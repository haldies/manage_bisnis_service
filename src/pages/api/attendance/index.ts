import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
 
  if (req.method === "GET") {
    try {
      const { employeeId, date, branchId } = req.query;
      const where: any = {};
      if (employeeId) where.employeeId = employeeId as string;
      if (date) where.date = date as string;
      if (branchId) where.branchId = branchId as string;

      const attendances = await prisma.attendance.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const data = attendances.map((a) => ({
        ...a,
        checkInTime: Number(a.checkInTime),
        checkOutTime: a.checkOutTime ? Number(a.checkOutTime) : null,
      }));

      return res.status(200).json({ data, total: data.length });
    } catch (error: any) {
      console.error("Fetch attendance error:", error);
      return res.status(500).json({ message: "Error fetching attendance", error: error.message });
    }
  }

  // ─── POST: Record clock-in ────────────────────────────────────
  if (req.method === "POST") {
    try {
      const {
        employeeId,
        employeeName,
        branchId,
        date,
        checkInTime,
        status,
        isInRadius,
        isMockGPS,
        latitude,
        longitude,
        photoUrl,
      } = req.body;
      if (isMockGPS === true) {
        return res.status(403).json({
          error: "FAKE_GPS_DETECTED",
          message: "Absensi ditolak: terdeteksi penggunaan GPS palsu (Mock Location). Nonaktifkan Developer Mode dan coba lagi.",
        });
      }

      // ══ SERVER-SIDE RADIUS VALIDATION ══════════════════════════════════
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (branch && branch.latitude && branch.longitude) {
        const R = 6371e3; // meters
        const lat1 = latitude * Math.PI/180;
        const lat2 = branch.latitude * Math.PI/180;
        const Δlat = (branch.latitude - latitude) * Math.PI/180;
        const Δlon = (branch.longitude - longitude) * Math.PI/180;

        const a = Math.sin(Δlat/2) * Math.sin(Δlat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(Δlon/2) * Math.sin(Δlon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        const allowedRadius = branch.radiusMeters || 100;
        if (distance > allowedRadius) {
          return res.status(403).json({
            error: "OUT_OF_RADIUS",
            message: `Absensi ditolak: Anda berada ${Math.round(distance)}m dari kantor (Radius izin: ${allowedRadius}m).`,
          });
        }
      }

      // 3. Prevent duplicate check-in on same day
      const existing = await prisma.attendance.findFirst({
        where: { employeeId, date },
      });

      if (existing && existing.checkInTime) {
        return res.status(409).json({
          error: "ALREADY_CHECKED_IN",
          message: "Anda sudah absen masuk hari ini.",
        });
      }

      const newRecord = await prisma.attendance.create({
        data: {
          employeeId,
          employeeName,
          branchId,
          date,
          checkInTime: BigInt(checkInTime),
          status,
          isInRadius: true,
          isMockGPS: false,
          latitude,
          longitude,
          photoUrl: photoUrl || null,
        },
      });

      return res.status(201).json({
        message: "Attendance recorded",
        data: {
          ...newRecord,
          checkInTime: Number(newRecord.checkInTime),
          checkOutTime: null,
        },
      });
    } catch (error: any) {
      console.error("Record attendance error:", error);
      return res.status(500).json({ message: "Error recording attendance", error: error.message });
    }
  }

  // ─── PATCH: Record clock-out ──────────────────────────────────
  if (req.method === "PATCH") {
    try {
      const {
        attendanceId,
        checkOutTime,
        checkOutPhotoUrl,
        checkOutLatitude,
        checkOutLongitude,
        isInRadius,
        isMockGPS,
      } = req.body;

      // Block fake GPS for checkout too
      if (isMockGPS === true) {
        return res.status(403).json({
          error: "FAKE_GPS_DETECTED",
          message: "Absen pulang ditolak: terdeteksi GPS palsu.",
        });
      }

      // Block outside radius for checkout
      if (isInRadius === false) {
        return res.status(403).json({
          error: "OUT_OF_RADIUS",
          message: "Absen pulang ditolak: Anda berada di luar radius lokasi kantor.",
        });
      }

      const record = await prisma.attendance.findUnique({ where: { id: attendanceId } });
      if (!record) {
        return res.status(404).json({ error: "Attendance record not found" });
      }

      const workDuration = record.checkInTime
        ? Math.round((Number(checkOutTime) - Number(record.checkInTime)) / 60000)
        : null;

      const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          checkOutTime: BigInt(checkOutTime),
          checkOutPhotoUrl: checkOutPhotoUrl || null,
          checkOutLatitude: checkOutLatitude || null,
          checkOutLongitude: checkOutLongitude || null,
          workDurationMinutes: workDuration,
        },
      });

      return res.status(200).json({
        message: "Check-out recorded",
        data: {
          ...updated,
          checkInTime: Number(updated.checkInTime),
          checkOutTime: Number(updated.checkOutTime),
        },
      });
    } catch (error: any) {
      console.error("Check-out error:", error);
      return res.status(500).json({ message: "Error recording check-out", error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
