import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startAutoExpiryJobs() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    try {
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
      });

      for (const res of expiredReservations) {
        await prisma.$transaction(async (tx: any) => {
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: 'EXPIRED' },
          });

          if ((res as any).inventoryId) {
            await tx.inventory.update({
              where: { id: (res as any).inventoryId },
              data: { quantity: { increment: res.quantity } },
            });
          }
        });
      }

      await prisma.medicineRequest.updateMany({
        where: {
          status: 'OPEN',
          expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
      });

      console.log(`[Cron] Expiry sweep finished at: ${now.toISOString()}`);
    } catch (error) {
      console.error('[Cron Error] Execution failed:', error);
    }
  });
}
