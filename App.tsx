import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  configureRevenueCat,
  identifyRevenueCatUser,
  getRevenueCatCustomerInfo,
  isPremium,
  presentPremiumPaywallAlways,
  presentSubscriptionCenter
} from './src/revenuecat';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Uncaught React error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#D32F2F', marginBottom: 12 }}>
            MedBridge Alert
          </Text>
          <Text style={{ fontSize: 14, color: '#333333', marginBottom: 20 }}>
            {this.state.error?.message || 'A render error occurred.'}
          </Text>
          <Button title="Reload App" onPress={() => this.setState({ hasError: false, error: null })} />
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Ignore handler errors on devices without Google Play Services
}

const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';

type Role = 'PATIENT' | 'PHARMACY' | 'ADMIN';
type User = { id: string; name: string; phone: string; role: Role; active: boolean; pharmacy?: any; token?: string };

async function api(path: string, opts: RequestInit = {}) {
  try {
    const token = await AsyncStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    };
    const response = await fetch(`${API}${path}`, { ...opts, headers });
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }
    if (!response.ok) throw new Error(data?.error || 'Request failed');
    return data;
  } catch (err: any) {
    console.warn(`API call ${path} failed:`, err?.message || err);
    throw err;
  }
}

function Header({ title, sub, onLogout }: { title: string; sub?: string; onLogout: () => void }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {sub ? <Text style={s.muted}>{sub}</Text> : null}
      </View>
      <Button title="Logout" onPress={onLogout} color="#D32F2F" />
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#8C9E95" {...props} style={[s.input, props.style]} />;
}

function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.tabs}>
      {items.map((x) => (
        <TouchableOpacity key={x} style={[s.tab, value === x && s.active]} onPress={() => onChange(x)}>
          <Text style={value === x ? s.white : s.black}>{x}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [register, setRegister] = useState(false);
  const [role, setRole] = useState<Role>('PATIENT');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phName, setPhName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('34.0837');
  const [lng, setLng] = useState('74.7973');

  const submit = async () => {
    try {
      const body: any = register ? { name, phone, password, role } : { phone, password };
      if (register && role === 'PHARMACY') {
        body.pharmacy = { name: phName, address, lat: Number(lat), lng: Number(lng) };
      }
      const data = await api(register ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (data?.token) {
        await AsyncStorage.setItem('token', data.token);
        onLogin(data.user);
      }
    } catch (e: any) {
      Alert.alert('Connection notice', e.message || 'Could not connect to server. Check your network or API endpoint.');
    }
  };

  return (
    <SafeAreaView style={[s.container, { justifyContent: 'center' }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[s.title, { textAlign: 'center', fontSize: 28, marginBottom: 8 }]}>MedBridge</Text>
        <Text style={[s.muted, { textAlign: 'center', marginBottom: 24 }]}>Healthcare & Pharmacy Bridge</Text>

        {register && (
          <>
            <Tabs items={['PATIENT', 'PHARMACY', 'ADMIN']} value={role} onChange={(v) => setRole(v as Role)} />
            <Input placeholder="Full Name" value={name} onChangeText={setName} />
          </>
        )}

        <Input placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {register && role === 'PHARMACY' && (
          <>
            <Input placeholder="Pharmacy Name" value={phName} onChangeText={setPhName} />
            <Input placeholder="Address" value={address} onChangeText={setAddress} />
          </>
        )}

        <View style={{ marginVertical: 12 }}>
          <Button title={register ? 'Sign Up' : 'Sign In'} onPress={submit} color="#2F6B4F" />
        </View>

        <TouchableOpacity onPress={() => setRegister(!register)} style={{ padding: 10, alignItems: 'center' }}>
          <Text style={{ color: '#2F6B4F', fontWeight: '600' }}>
            {register ? 'Already have an account? Sign In' : 'Need an account? Create one'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PatientScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState('Medicines');
  const [meds, setMeds] = useState<any[]>([]);

  return (
    <SafeAreaView style={s.container}>
      <Header title="MedBridge" sub={`Patient: ${user.name}`} onLogout={onLogout} />
      <Tabs items={['Medicines', 'Requests', 'Reservations', 'Alerts']} value={tab} onChange={setTab} />
      <View style={{ padding: 16 }}>
        <Text style={s.title}>{tab}</Text>
        <Text style={s.muted}>No records active currently.</Text>
      </View>
    </SafeAreaView>
  );
}

function PharmacyScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState('Requests');
  return (
    <SafeAreaView style={s.container}>
      <Header title="MedBridge" sub={`Pharmacy: ${user.name}`} onLogout={onLogout} />
      <Tabs items={['Requests', 'Reservations', 'Inventory']} value={tab} onChange={setTab} />
      <View style={{ padding: 16 }}>
        <Text style={s.title}>{tab}</Text>
        <Text style={s.muted}>Awaiting pharmacy actions.</Text>
      </View>
    </SafeAreaView>
  );
}

function AdminScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState('Overview');
  return (
    <SafeAreaView style={s.container}>
      <Header title="MedBridge Admin" sub={`Admin: ${user.name}`} onLogout={onLogout} />
      <Tabs items={['Overview', 'Pharmacies', 'Users', 'Audit']} value={tab} onChange={setTab} />
      <View style={{ padding: 16 }}>
        <Text style={s.title}>{tab}</Text>
        <Text style={s.muted}>System overview operational.</Text>
      </View>
    </SafeAreaView>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token && mounted) {
          try {
            const u = await api('/me');
            if (mounted) setUser({ ...u, token });
          } catch {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.warn("Storage check failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2F6B4F" />
        <Text style={{ marginTop: 12, color: '#17372A', fontWeight: '600' }}>Loading MedBridge...</Text>
      </View>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === 'PATIENT') {
    return <PatientScreen user={user} onLogout={logout} />;
  }
  if (user.role === 'PHARMACY') {
    return <PharmacyScreen user={user} onLogout={logout} />;
  }
  return <AdminScreen user={user} onLogout={logout} />;
}

export default function App() {
  return (
    <RootErrorBoundary>
      <AppContent />
    </RootErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F8F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#CFE0D5' },
  title: { fontSize: 20, fontWeight: '800', color: '#17372A' },
  muted: { fontSize: 13, color: '#5F766A' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE0D5', borderRadius: 8, padding: 12, marginVertical: 6, color: '#17372A' },
  tabs: { flexDirection: 'row', backgroundColor: '#E4F0E8', padding: 4, borderRadius: 12, marginVertical: 12 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  active: { backgroundColor: '#2F6B4F' },
  white: { color: '#FFFFFF', fontWeight: '700' },
  black: { color: '#24483A' },
});
