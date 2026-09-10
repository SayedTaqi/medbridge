export async function configureRevenueCat() {
  console.log('[RevenueCat] Mock initialized for development');
  return Promise.resolve();
}

export async function identifyRevenueCatUser(userId: string) {
  return Promise.resolve();
}

export async function getRevenueCatCustomerInfo() {
  return Promise.resolve(null);
}

export async function isPremium() {
  return Promise.resolve(false);
}

export async function presentPremiumPaywallAlways() {
  alert('Premium feature: In-app purchase integration pending.');
  return Promise.resolve();
}

export async function presentSubscriptionCenter() {
  alert('Subscription center.');
  return Promise.resolve();
}
