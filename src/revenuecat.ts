import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_demo_sandbox_key'
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_demo_sandbox_key';

export const ENTITLEMENT_ID = 'consumer_premium';

let isConfigured = false;

export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) return;

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
    console.log('[RevenueCat] SDK Initialized successfully');
  } catch (error) {
    console.warn('[RevenueCat] Native initialization deferred (running in sandbox/unlinked environment):', error);
  }
}

export async function identifyRevenueCatUser(userId: string): Promise<CustomerInfo | null> {
  try {
    if (!isConfigured) await configureRevenueCat();
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.warn('[RevenueCat] Login fallback:', error);
    return null;
  }
}

export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  try {
    if (!isConfigured) await configureRevenueCat();
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.warn('[RevenueCat] Error fetching offerings:', error);
    return [];
  }
}

export async function purchaseSubscriptionPackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('[RevenueCat] Purchase failed:', error);
    }
    return false;
  }
}

export async function isPremiumUser(): Promise<boolean> {
  try {
    if (!isConfigured) await configureRevenueCat();
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error) {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    return false;
  }
}
