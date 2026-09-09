import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const expo = new Expo();
const prisma = new PrismaClient();

export async function notifyNearbyPharmacies(medicineName: string, pharmacyIds: string[]) {
  const pushTokens = await prisma.pushToken.findMany({
    where: {
      userId: { in: pharmacyIds },
    },
  });

  const messages: ExpoPushMessage[] = [];

  for (const record of pushTokens) {
    if (!Expo.isExpoPushToken(record.token)) {
      console.warn(`Invalid Expo Push Token: ${record.token}`);
      continue;
    }

    messages.push({
      to: record.token,
      sound: 'default',
      title: 'New Refill Request Nearby!',
      body: `A patient is looking for ${medicineName}. Tap to respond.`,
      data: { medicineName },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('[Notification Error] Failed to send push batch:', error);
    }
  }
}
