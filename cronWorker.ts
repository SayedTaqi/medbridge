import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startAutoExpiryJobs() {
  // Har 5 minute me background me execute hoga
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    try {
      // 1. Expired Reservations find karein
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
        include: { request: true },
      });

      for (const res of expiredReservations) {
        await prisma.$transaction(async (tx) => {
          // Status EXPIRED mark karein
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: 'EXPIRED' },
          });

          // Pharmacy inventory me stock wapas restore karein
          await tx.inventory.updateMany({
            where: {
              pharmacyId: res.pharmacyId,
              name: res.request.medicineName,
            },
            data: {
              quantity: { increment: res.quantity },
            },
          });
        });
      }

      // 2. 24h se puraane OPEN requests ko EXPIRED mark karein
      await prisma.medicineRequest.updateMany({
        where: {
          status: 'OPEN',
          expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
      });

      console.log(`[Cron] Expiry check completed at ${now.toISOString()}`);
    } catch (error) {
      console.error('[Cron Error] Auto-expiry job failed:', error);
    }
  });
}
