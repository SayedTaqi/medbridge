import { Platform } from 'react-native';

export const ENTITLEMENT_ID = 'consumer_premium';

let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default || require('react-native-purchases');
} catch (e) {
  console.warn('[RevenueCat] Native module not linked, running in safe mode');
}

export async function configureRevenueCat(): Promise<void> {
  if (!Purchases || !Purchases.configure) {
    console.log('[RevenueCat] Safe bypass active');
    return;
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_demo_sandbox_key'
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_demo_sandbox_key';

  try {
    Purchases.configure({ apiKey });
  } catch (err) {
    console.warn('[RevenueCat] Init skipped:', err);
  }
}

export async function getAvailablePackages(): Promise<any[]> {
  try {
    if (Purchases && Purchases.getOfferings) {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages || [];
    }
  } catch (e) {}
  return [];
}

export async function purchaseSubscriptionPackage(pkg: any): Promise<boolean> {
  try {
    if (Purchases && Purchases.purchasePackage) {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    }
  } catch (e) {}
  return false;
}

export async function isPremiumUser(): Promise<boolean> {
  try {
    if (Purchases && Purchases.getCustomerInfo) {
      const info = await Purchases.getCustomerInfo();
      return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    }
  } catch (e) {}
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  try {
    if (Purchases && Purchases.restorePurchases) {
      const info = await Purchases.restorePurchases();
      return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    }
  } catch (e) {}
  return false;
}
