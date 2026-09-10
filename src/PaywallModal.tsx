import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { getAvailablePackages, purchaseSubscriptionPackage, restorePurchases } from './revenuecat';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, onSuccess }) => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoading(true);
    const available = await getAvailablePackages();
    setPackages(available);
    setLoading(false);
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    const success = await purchaseSubscriptionPackage(pkg);
    setPurchasing(false);

    if (success) {
      Alert.alert('Subscribed!', 'Welcome to MedBridge Consumer Premium.');
      onSuccess();
      onClose();
    } else {
      Alert.alert('Notice', 'Transaction was not completed or cancelled.');
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);
    if (success) {
      Alert.alert('Restored!', 'Your previous subscription has been restored.');
      onSuccess();
      onClose();
    } else {
      Alert.alert('Restore Failed', 'No active subscription found for this account.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.badge}>MEDBRIDGE PLUS</Text>
          <Text style={styles.title}>Unlock Premium Care</Text>
          <Text style={styles.subtitle}>
            Empower your family with continuous healthcare monitoring.
          </Text>

          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>✓ Multi-member Family Caregiver Sharing</Text>
            <Text style={styles.featureItem}>✓ Automated Scheduled Refill Alarms</Text>
            <Text style={styles.featureItem}>✓ Priority Match in 5km Local Pharmacy Radius</Text>
            <Text style={styles.featureItem}>✓ Unlimited Prescription S3 Cloud Storage</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#008080" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.packagesContainer}>
              {packages.length > 0 ? (
                packages.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={styles.packageCard}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasing}
                  >
                    <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                    <Text style={styles.packageDescription}>{pkg.product.description}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.fallbackBox}>
                  <Text style={styles.fallbackTitle}>Monthly Plan: ₹149 / month</Text>
                  <Text style={styles.fallbackTitle}>Annual Pass: ₹1,499 / year</Text>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => {
                      Alert.alert('Sandbox Ready', 'Configured for RevenueCat Sandbox test.');
                      onSuccess();
                      onClose();
                    }}
                  >
                    <Text style={styles.buyButtonText}>Activate Subscription</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 460,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#E0F2F1',
    color: '#00695C',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#718096',
    marginTop: 4,
    marginBottom: 16,
  },
  featuresList: {
    marginVertical: 10,
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#2D3748',
    marginVertical: 4,
    fontWeight: '500',
  },
  packagesContainer: {
    marginVertical: 10,
  },
  packageCard: {
    borderWidth: 2,
    borderColor: '#008080',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    backgroundColor: '#F0FDF4',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004D40',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00796B',
    marginTop: 2,
  },
  packageDescription: {
    fontSize: 12,
    color: '#4A5568',
    marginTop: 2,
  },
  fallbackBox: {
    alignItems: 'center',
    padding: 10,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  buyButton: {
    backgroundColor: '#008080',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreBtn: {
    alignSelf: 'center',
    marginTop: 10,
  },
  restoreText: {
    fontSize: 13,
    color: '#718096',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 14,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
  },
});
