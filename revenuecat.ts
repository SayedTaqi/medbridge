import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_ENTITLEMENT = 'consumer_premium';

let configured = false;
let configuredUserId: string | null = null;

function getApiKey(): string {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  if (!key || key.includes('replace-with')) {
    throw new Error(
      `RevenueCat ${Platform.OS} public SDK key is missing. Set EXPO_PUBLIC_REVENUECAT_${
        Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
      }_API_KEY.`
    );
  }

  return key;
}

export async function configureRevenueCat(userId?: string): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const apiKey = getApiKey();

  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    configured = true;
  }

  if (userId && configuredUserId !== userId) {
    await identifyRevenueCatUser(userId);
  }
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!userId) throw new Error('A valid MedBridge user ID is required.');
  if (!configured) await configureRevenueCat();
  if (configuredUserId === userId) return;

  await Purchases.logIn(userId);
  configuredUserId = userId;
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  if (!configured) await configureRevenueCat();
  return Purchases.getCustomerInfo();
}

export function isPremium(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT] !== undefined;
}

export async function presentPremiumPaywallAlways(): Promise<boolean> {
  if (!configured) await configureRevenueCat();
  const result = await RevenueCatUI.presentPaywall();
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentPremiumPaywallIfNeeded(): Promise<boolean> {
  if (!configured) await configureRevenueCat();
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT,
  });
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function restoreRevenueCatPurchases(): Promise<boolean> {
  if (!configured) await configureRevenueCat();
  const info = await Purchases.restorePurchases();
  return isPremium(info);
}

export async function presentSubscriptionCenter(): Promise<void> {
  if (!configured) await configureRevenueCat();
  await RevenueCatUI.presentCustomerCenter();
}

export async function getRevenueCatOfferings() {
  if (!configured) await configureRevenueCat();
  return Purchases.getOfferings();
}

export async function logoutRevenueCat(): Promise<void> {
  if (!configured) return;
  await Purchases.logOut();
  configuredUserId = null;
}
