import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_ENTITLEMENT = 'consumer_premium';
let configured = false;

function getApiKey(): string | undefined {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: undefined,
  });
}

export async function configureRevenueCat(appUserId?: string) {
  if (configured) {
    if (appUserId) {
      try { await Purchases.logIn({ appUserID: appUserId }); } catch {}
    }
    return;
  }
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes('replace-with')) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

export async function identifyRevenueCatUser(appUserId: string) {
  await configureRevenueCat();
  if (!configured) return null;
  const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
  return customerInfo;
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.getCustomerInfo();
}

export function isPremium(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[REVENUECAT_ENTITLEMENT]);
}

export async function presentPremiumPaywallAlways(): Promise<boolean> {
  if (!configured) return false;
  const result = await RevenueCatUI.presentPaywall();
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentSubscriptionCenter() {
  if (!configured) return;
  await RevenueCatUI.presentCustomerCenter();
}