import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { configureRevenueCat, identifyRevenueCatUser, getRevenueCatCustomerInfo, isPremium, presentPremiumPaywallAlways, presentSubscriptionCenter } from './src/revenuecat';

Notifications.setNotificationHandler({ handle: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

type Role = 'PATIENT' | 'PHARMACY' | 'ADMIN';
type User = { id: string; name: string; phone: string; role: Role; active: boolean; pharmacy?: any; token?: string };

async function api(path: string, opts: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

function Header({ title, sub, onLogout }: { title: string; sub?: string; onLogout: () => void }) {
  return <View style={s.header}><View><Text style={s.title}>{title}</Text>{sub ? <Text style={s.muted}>{sub}</Text> : null}</View><Button title="Logout" onPress={onLogout} /></View>;
}
function Input(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} style={[s.input, props.style]} />; }
function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return <View style={s.tabs}>{items.map(x => <TouchableOpacity key={x} style={[s.tab, value === x && s.active]} onPress={() => onChange(x)}><Text style={value === x ? s.white : s.black}>{x}</Text></TouchableOpacity>)}</View>;
}

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [register, setRegister] = useState(false); const [role, setRole] = useState<Role>('PATIENT');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [phName, setPhName] = useState(''); const [address, setAddress] = useState(''); const [lat, setLat] = useState('34.0837'); const [lng, setLng] = useState('74.7973');
  const submit = async () => {
    try {
      const body: any = register ? { name, phone, password, role } : { phone, password };
      if (register && role === 'PHARMACY') body.pharmacy = { name: phName, address, lat: Number(lat), lng: Number(lng) };
      const data = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
      await AsyncStorage.setItem('token', data.token); try { await configureRevenueCat(data.user.id); } catch {} onLogin({ ...data.user, token: data.token });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };
  return <SafeAreaView style={s.center}><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.logo}>MEDBRIDGE</Text><Text style={s.tag}>Medication continuity</Text>
    {register ? <Input placeholder="Full name" value={name} onChangeText={setName} /> : null}
    <Input placeholder="10-digit Indian mobile" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
    <Input placeholder="Password (8+ chars)" secureTextEntry value={password} onChangeText={setPassword} />
    {register ? <><View style={s.row}><Button title="Patient" onPress={() => setRole('PATIENT')} /><Button title="Pharmacy" onPress={() => setRole('PHARMACY')} /></View>
      {role === 'PHARMACY' ? <View style={s.card}><Text style={s.med}>Pharmacy details</Text><Input placeholder="Pharmacy name" value={phName} onChangeText={setPhName} /><Input placeholder="Address" value={address} onChangeText={setAddress} /><Input placeholder="Latitude" keyboardType="numeric" value={lat} onChangeText={setLat} /><Input placeholder="Longitude" keyboardType="numeric" value={lng} onChangeText={setLng} /></View> : null}</> : null}
    <Button title={register ? 'Create account' : 'Login'} onPress={submit} /><TouchableOpacity onPress={() => setRegister(v => !v)}><Text style={s.link}>{register ? 'Already registered? Login' : 'Create account'}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

function Patient({ onLogout }: { onLogout: () => void }) {
  const [premium, setPremium] = useState(false);
  const [tab, setTab] = useState('Medicines'); const [meds, setMeds] = useState<any[]>([]); const [requests, setRequests] = useState<any[]>([]); const [reservations, setReservations] = useState<any[]>([]); const [notifications, setNotifications] = useState<any[]>([]);
  const [name, setName] = useState(''); const [dose, setDose] = useState(''); const [quantity, setQuantity] = useState('30'); const [remaining, setRemaining] = useState('30'); const [dosesPerDay, setDosesPerDay] = useState('1'); const [editingId, setEditingId] = useState<string | null>(null);
  const load = async () => { try { const [m, r, v, n] = await Promise.all([api('/medicines'), api('/requests'), api('/reservations'), api('/notifications')]); setMeds(m); setRequests(r); setReservations(v); setNotifications(n); } catch (e: any) { Alert.alert('Load failed', e.message); } };
  useEffect(() => {
    load();
    api('/me').then(async (me) => {
      try {
        await identifyRevenueCatUser(me.id);
        const info = await getRevenueCatCustomerInfo();
        setPremium(isPremium(info));
      } catch {}
    }).catch(() => {});
  }, []);
  const edit = (m: any) => { setEditingId(m.id); setName(m.name); setDose(m.dose); setQuantity(String(m.quantity)); setRemaining(String(m.remaining)); setDosesPerDay(String(m.dosesPerDay)); };
  const saveMedicine = async () => { try { const payload = { name, dose, quantity: Number(quantity), remaining: Number(remaining), dosesPerDay: Number(dosesPerDay) }; await api(editingId ? `/medicines/${editingId}` : '/medicines', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); setEditingId(null); setName(''); setDose(''); setQuantity('30'); setRemaining('30'); setDosesPerDay('1'); await load(); } catch (e: any) { Alert.alert('Medicine error', e.message); } };
  const remove = (m: any) => Alert.alert('Delete medicine?', m.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/medicines/${m.id}`, { method: 'DELETE' }); await load(); } catch (e: any) { Alert.alert('Delete failed', e.message); } } }]);
  const request = async (m: any) => { try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== 'granted') throw new Error('Location permission is required'); const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await api('/requests', { method: 'POST', body: JSON.stringify({ medicineId: m.id, quantity: Math.max(1, Math.floor(m.quantity)), lat: loc.coords.latitude, lng: loc.coords.longitude }) }); await load(); setTab('Requests'); } catch (e: any) { Alert.alert('Request failed', e.message); } };
  const reserve = async (requestId: string, pharmacyId: string) => { try { await api('/reservations', { method: 'POST', body: JSON.stringify({ requestId, pharmacyId }) }); await load(); setTab('Reservations'); } catch (e: any) { Alert.alert('Reservation failed', e.message); } };
  const cancel = async (id: string) => { try { await api(`/reservations/${id}/cancel`, { method: 'POST' }); await load(); } catch (e: any) { Alert.alert('Cancel failed', e.message); } };
  const markRead = async (id: string) => { try { await api(`/notifications/${id}/read`, { method: 'POST' }); await load(); } catch {} };
  return <SafeAreaView style={s.container}><Header title="My medicines" sub="Patient" onLogout={onLogout}/>
    <View style={s.card}>
      <Text style={s.med}>{premium ? 'Premium active' : 'MedBridge Premium'}</Text>
      <Text>{premium ? 'Your premium features are active.' : 'Simple refills, family sharing and advanced refill tools.'}</Text>
      <View style={s.row}>
        {!premium ? <Button title="View Premium" onPress={async () => {
          try {
            const purchased = await presentPremiumPaywallAlways();
            const info = await getRevenueCatCustomerInfo();
            const active = isPremium(info);
            setPremium(active);
            if (purchased || active) Alert.alert('Premium active', 'Your MedBridge Premium features are now available.');
          } catch (e: any) {
            Alert.alert('Premium', e.message || 'Unable to open Premium right now.');
          }
        }} /> : <Button title="Manage subscription" onPress={async () => {
          try { await presentSubscriptionCenter(); }
          catch (e: any) { Alert.alert('Subscription', e.message || 'Unable to open subscription settings.'); }
        }} />}
      </View>
    </View><Tabs items={['Medicines','Requests','Reservations','Alerts']} value={tab} onChange={setTab}/>
    {tab === 'Medicines' ? <ScrollView><FlatList data={meds} keyExtractor={m => m.id} scrollEnabled={false} ListEmptyComponent={<Text style={s.empty}>No medicines yet.</Text>} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.name} {item.dose}</Text><Text>{item.remaining} units • {item.daysRemaining} days remaining</Text><View style={s.row}><Button title="Find pharmacy" disabled={item.remaining < 1} onPress={() => request(item)} /><Button title="Edit" onPress={() => edit(item)} /><Button title="Delete" onPress={() => remove(item)} /></View></View>} />
      <View style={s.card}><Text style={s.med}>{editingId ? 'Edit medicine' : 'Add medicine'}</Text><Input placeholder="Medicine name" value={name} onChangeText={setName}/><Input placeholder="Dose" value={dose} onChangeText={setDose}/><Input placeholder="Total quantity" keyboardType="numeric" value={quantity} onChangeText={setQuantity}/><Input placeholder="Remaining quantity" keyboardType="numeric" value={remaining} onChangeText={setRemaining}/><Input placeholder="Doses per day" keyboardType="numeric" value={dosesPerDay} onChangeText={setDosesPerDay}/><Button title={editingId ? "Save changes" : "Add medicine"} onPress={saveMedicine}/></View></ScrollView> : null}
    {tab === 'Requests' ? <FlatList data={requests} keyExtractor={r => r.id} ListEmptyComponent={<Text style={s.empty}>No requests.</Text>} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.medicine.name} {item.medicine.dose}</Text><Text>Status: {item.status} • Requested: {item.quantity}</Text>{item.responses.map((x: any) => <View key={x.id} style={s.inner}><Text>{x.pharmacy.name} • {x.status}{x.price != null ? ` • ₹${x.price}/unit` : ''}</Text>{x.note ? <Text>{x.note}</Text> : null}{x.status === 'AVAILABLE' && item.status === 'OPEN' ? <Button title="Reserve" onPress={() => reserve(item.id, x.pharmacyId)} /> : null}</View>)}</View>} /> : null}
    {tab === 'Reservations' ? <FlatList data={reservations} keyExtractor={r => r.id} ListEmptyComponent={<Text style={s.empty}>No reservations.</Text>} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.request.medicine.name}</Text><Text>{item.pharmacy.name} • {item.quantity} units • ₹{item.totalPrice}</Text><Text>Status: {item.status}</Text>{item.status === 'ACTIVE' ? <Button title="Cancel reservation" onPress={() => cancel(item.id)} /> : <Text style={s.muted}>Pickup is completed by the pharmacy.</Text>}</View>} /> : null}
    {tab === 'Alerts' ? <FlatList data={notifications} keyExtractor={n => n.id} ListEmptyComponent={<Text style={s.empty}>No notifications.</Text>} renderItem={({ item }) => <TouchableOpacity style={s.card} onPress={() => markRead(item.id)}><Text style={s.med}>{item.title}</Text><Text>{item.body}</Text><Text style={s.muted}>{item.readAt ? 'Read' : 'Unread'}</Text></TouchableOpacity>} /> : null}
  </SafeAreaView>;
}

function Pharmacy({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState('Requests'); const [profile, setProfile] = useState<any>(null); const [requests, setRequests] = useState<any[]>([]); const [reservations, setReservations] = useState<any[]>([]); const [inventory, setInventory] = useState<any[]>([]);
  const [invName, setInvName] = useState(''); const [invQty, setInvQty] = useState('0'); const [invPrice, setInvPrice] = useState('0');
  const load = async () => { try { const [p, r, v, i] = await Promise.all([api('/pharmacy/profile'), api('/pharmacy/requests'), api('/pharmacy/reservations'), api('/pharmacy/inventory')]); setProfile(p); setRequests(r); setReservations(v); setInventory(i); } catch (e: any) { Alert.alert('Load failed', e.message); } };
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, []);
  const respond = async (id: string, status: string) => { try { await api(`/pharmacy/requests/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) }); await load(); } catch (e: any) { Alert.alert('Response failed', e.message); } };
  const saveInventory = async () => { try { await api('/pharmacy/inventory', { method: 'POST', body: JSON.stringify({ medicineName: invName, quantity: Number(invQty), unitPrice: Number(invPrice) }) }); setInvName(''); setInvQty('0'); setInvPrice('0'); await load(); } catch (e: any) { Alert.alert('Inventory error', e.message); } };
  const pickup = async (id: string) => { try { await api(`/reservations/${id}/pickup`, { method: 'POST' }); await load(); } catch (e: any) { Alert.alert('Pickup failed', e.message); } };
  return <SafeAreaView style={s.container}><Header title="Pharmacy" sub={profile?.verified ? 'Verified pharmacy' : 'Awaiting admin verification'} onLogout={onLogout}/><View style={s.card}><Text style={s.med}>{profile?.name}</Text><Text>{profile?.address}</Text><Text>Verification: {profile?.verified ? 'VERIFIED' : 'PENDING'}</Text></View><Tabs items={['Requests','Reservations','Inventory']} value={tab} onChange={setTab}/>
    {tab === 'Requests' ? <FlatList data={requests} keyExtractor={r => r.id} ListEmptyComponent={<Text style={s.empty}>No nearby open requests.</Text>} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.medicine.name}</Text><Text>{item.quantity} units • {item.user.name}</Text><View style={s.row}><Button title="Available" disabled={!profile?.verified} onPress={() => respond(item.id, 'AVAILABLE')} /><Button title="Not available" disabled={!profile?.verified} onPress={() => respond(item.id, 'NOT_AVAILABLE')} /><Button title="Can order" disabled={!profile?.verified} onPress={() => respond(item.id, 'CAN_ORDER')} /></View></View>} /> : null}
    {tab === 'Reservations' ? <FlatList data={reservations} keyExtractor={r => r.id} ListEmptyComponent={<Text style={s.empty}>No reservations.</Text>} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.request.medicine.name} • {item.quantity} units</Text><Text>{item.user.name} • ₹{item.totalPrice} • {item.status}</Text>{item.status === 'ACTIVE' ? <Button title="Complete pickup" onPress={() => pickup(item.id)} /> : null}</View>} /> : null}
    {tab === 'Inventory' ? <ScrollView><FlatList data={inventory} keyExtractor={i => i.id} scrollEnabled={false} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.medicineName}</Text><Text>{item.quantity} units • ₹{item.unitPrice}/unit</Text></View>} /><View style={s.card}><Text style={s.med}>Update inventory</Text><Input placeholder="Medicine name" value={invName} onChangeText={setInvName}/><Input placeholder="Quantity" keyboardType="numeric" value={invQty} onChangeText={setInvQty}/><Input placeholder="Unit price" keyboardType="numeric" value={invPrice} onChangeText={setInvPrice}/><Button title="Save inventory" onPress={saveInventory}/></View></ScrollView> : null}
  </SafeAreaView>;
}

function Admin({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState('Overview'); const [stats, setStats] = useState<any>({}); const [pharmacies, setPharmacies] = useState<any[]>([]); const [users, setUsers] = useState<any[]>([]); const [logs, setLogs] = useState<any[]>([]); const [note, setNote] = useState<Record<string,string>>({});
  const load = async () => { try { const [s, p, u, l] = await Promise.all([api('/admin/stats'), api('/admin/pharmacies'), api('/admin/users'), api('/admin/audit-logs')]); setStats(s); setPharmacies(p); setUsers(u); setLogs(l); } catch (e: any) { Alert.alert('Load failed', e.message); } };
  useEffect(() => { load(); }, []);
  const verify = async (id: string, value: boolean) => { try { await api(`/admin/pharmacies/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified: value, note: note[id] || undefined }) }); await load(); } catch (e: any) { Alert.alert('Verification failed', e.message); } };
  const toggle = async (id: string, value: boolean) => { try { await api(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active: value }) }); await load(); } catch (e: any) { Alert.alert('User update failed', e.message); } };
  return <SafeAreaView style={s.container}><Header title="Admin" sub="Operations" onLogout={onLogout}/><Tabs items={['Overview','Pharmacies','Users','Audit']} value={tab} onChange={setTab}/>
    {tab === 'Overview' ? <View style={s.card}><Text>Users: {stats.users}</Text><Text>Patients: {stats.patients}</Text><Text>Pharmacies: {stats.pharmacies}</Text><Text>Verified pharmacies: {stats.verifiedPharmacies}</Text><Text>Open requests: {stats.openRequests}</Text><Text>Active reservations: {stats.activeReservations}</Text></View> : null}
    {tab === 'Pharmacies' ? <FlatList data={pharmacies} keyExtractor={p => p.id} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.name}</Text><Text>{item.user.name} • {item.user.phone}</Text><Text>{item.verified ? 'Verified' : 'Pending'}</Text><Input placeholder="Verification note" value={note[item.id] || ''} onChangeText={v => setNote(n => ({ ...n, [item.id]: v }))}/><Button title={item.verified ? 'Unverify' : 'Verify'} onPress={() => verify(item.id, !item.verified)} /></View>} /> : null}
    {tab === 'Users' ? <FlatList data={users} keyExtractor={u => u.id} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.name} • {item.role}</Text><Text>{item.phone}</Text><Button title={item.active ? 'Disable' : 'Enable'} onPress={() => toggle(item.id, !item.active)} /></View>} /> : null}
    {tab === 'Audit' ? <FlatList data={logs} keyExtractor={l => l.id} renderItem={({ item }) => <View style={s.card}><Text style={s.med}>{item.action}</Text><Text>{item.entity} {item.entityId || ''}</Text><Text>{item.actor?.name || 'system'} • {new Date(item.createdAt).toLocaleString()}</Text></View>} /> : null}
  </SafeAreaView>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { AsyncStorage.getItem('token').then(async token => { if (!token) return; try { const u = await api('/me'); try { await configureRevenueCat(u.id); } catch {} setUser({ ...u, token }); } catch { await AsyncStorage.removeItem('token'); } }); }, []);
  useEffect(() => { if (!user) return; Notifications.requestPermissionsAsync().then(async p => { if (p.status !== 'granted') return; try { const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID; if (!projectId || projectId.includes('replace-with')) return; const token = await Notifications.getExpoPushTokenAsync({ projectId }); await api('/push-tokens', { method: 'POST', body: JSON.stringify({ token: token.data, platform: Platform.OS === 'ios' ? 'ios' : 'android' }) }); } catch {} }); }, [user]);
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } catch {} await AsyncStorage.removeItem('token'); setUser(null); };
  if (!user) return <Login onLogin={setUser} />; if (user.role === 'PATIENT') return <Patient onLogout={logout} />; if (user.role === 'PHARMACY') return <Pharmacy onLogout={logout} />; return <Admin onLogout={logout} />;
}

const s = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#F3F8F4' }, center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F3F8F4' }, logo: { fontSize: 34, fontWeight: '800', color: '#1F4D3A' }, tag: { fontSize: 16, color: '#5F766A', marginBottom: 24 }, title: { fontSize: 24, fontWeight: '800', color: '#17372A' }, muted: { color: '#5F766A' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE0D5', borderRadius: 12, padding: 12, marginVertical: 5, color: '#17372A' }, link: { textAlign: 'center', marginTop: 16, fontWeight: '700', color: '#2F6B4F' }, tabs: { flexDirection: 'row', backgroundColor: '#E4F0E8', padding: 4, borderRadius: 12, marginBottom: 8 }, tab: { flex: 1, padding: 10, alignItems: 'center' }, active: { backgroundColor: '#2F6B4F', borderRadius: 8 }, white: { color: '#FFFFFF', fontWeight: '700' }, black: { color: '#24483A' }, card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginVertical: 6, borderWidth: 1, borderColor: '#DCE9E0' }, med: { fontSize: 17, fontWeight: '800', marginBottom: 5, color: '#17372A' }, row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }, inner: { borderTopWidth: 1, borderTopColor: '#E2ECE5', paddingTop: 8, marginTop: 8 }, empty: { textAlign: 'center', padding: 20, color: '#5F766A' } });