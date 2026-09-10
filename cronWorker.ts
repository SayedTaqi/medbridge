import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startAutoExpiryJobs() {
  // Runs every 5 minutes in background
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    try {
      // 1. Find expired active reservations
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
      });

      for (const res of expiredReservations) {
        await prisma.$transaction(async (tx: any) => {
          // Mark reservation EXPIRED
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: 'EXPIRED' },
          });

          // Restore pharmacy inventory using inventoryId or matching medicine/pharmacy
          if ((res as any).inventoryId) {
            await tx.inventory.update({
              where: { id: (res as any).inventoryId },
              data: { quantity: { increment: res.quantity } },
            });
          }
        });
      }

      // 2. Mark requests older than 24h as EXPIRED
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
