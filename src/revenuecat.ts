export const REVENUECAT_ENTITLEMENT = 'consumer_premium';

export async function configureRevenueCat(appUserId?: string): Promise<void> {
  // Safe stub for preview builds
  return;
}

export async function identifyRevenueCatUser(appUserId: string): Promise<void> {
  return;
}

export async function getRevenueCatCustomerInfo(): Promise<any> {
  return null;
}

export function isPremium(customerInfo: any): boolean {
  return false;
}

export async function presentPremiumPaywallAlways(): Promise<boolean> {
  return false;
}

export async function presentSubscriptionCenter(): Promise<void> {
  return;
}
