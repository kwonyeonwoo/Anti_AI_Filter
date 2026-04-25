import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const MAX_MONTHLY_HOURS = 80;
const DAYS_KOREAN = ['일', '월', '화', '수', '목', '금', '토'];

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [state, setState] = useState({
    name: '',
    defaults: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    exceptions: {},
    startDefaults: { 0: "09:00", 1: "09:00", 2: "09:00", 3: "09:00", 4: "09:00", 5: "09:00", 6: "09:00" },
    startExceptions: {},
    lunchDefaults: { 0: "1.0", 1: "1.0", 2: "1.0", 3: "1.0", 4: "1.0", 5: "1.0", 6: "1.0" },
    lunchExceptions: {},
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const [modalHours, setModalHours] = useState('8');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "schedules", user.uid), (docSnap) => {
      if (docSnap.exists()) setState(prev => ({ ...prev, ...docSnap.data() }));
    });
    return () => unsub();
  }, [user]);

  const calendarData = useMemo(() => {
    if (!isReady) return { days: [], totalAccHours: 0 };
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    let totalAccHours = 0;
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      let hours = Number(state.exceptions[dateKey] !== undefined ? state.exceptions[dateKey] : state.defaults[dayOfWeek]) || 0;
      if (totalAccHours + hours > MAX_MONTHLY_HOURS) {
        hours = Math.max(0, MAX_MONTHLY_HOURS - totalAccHours);
      }
      totalAccHours += hours;
      days.push({ day: d, dateKey, hours, dayOfWeek });
    }
    return { days, totalAccHours };
  }, [currentDate, state, isReady]);

  if (!isReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={{ color: '#64748b', marginTop: 10 }}>런타임 준비 중...</Text>
      </View>
    );
  }

  // (이후 로직 동일...)
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authBox}>
          <Text style={styles.title}>TIME KEEPER (Mobile)</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={styles.btnPrimary} onPress={async () => {
            try {
              if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
              else await createUserWithEmailAndPassword(auth, email, password);
            } catch (err) { alert(err.message); }
          }}>
            <Text style={styles.btnText}>{authMode === 'login' ? '로그인' : '회원가입'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.linkText}>{authMode === 'login' ? '계정이 없으신가요? 회원가입' : '로그인으로 돌아가기'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>TIME KEEPER</Text>
          <TouchableOpacity onPress={() => signOut(auth)}><Text style={styles.logoutText}>로그아웃</Text></TouchableOpacity>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>이번 달 누적: {calendarData.totalAccHours.toFixed(1)} / 80h</Text>
          <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${Math.min(100, (calendarData.totalAccHours/80)*100)}%` }]} /></View>
        </View>
        <View style={styles.calNav}>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}><Text style={styles.navBtn}>←</Text></TouchableOpacity>
          <Text style={styles.navTitle}>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</Text>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}><Text style={styles.navBtn}>→</Text></TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {DAYS_KOREAN.map((d, i) => <Text key={i} style={styles.dayHeader}>{d}</Text>)}
          {calendarData.days.map((d, i) => (
            <TouchableOpacity key={i} style={[styles.dayCell, !d && styles.dayCellEmpty]} onPress={() => d && setSelectedDay(d)} disabled={!d}>
              {d && (
                <>
                  <Text style={[styles.dayText, d.dayOfWeek === 0 && styles.textRed, d.dayOfWeek === 6 && styles.textBlue]}>{d.day}</Text>
                  {d.hours > 0 && <Text style={styles.hoursText}>{d.hours.toFixed(1)}</Text>}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  scrollContent: { padding: 20 },
  authBox: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#60a5fa', marginBottom: 20 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  btnPrimary: { backgroundColor: '#2563eb', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  linkText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#ef4444', fontWeight: 'bold' },
  progressContainer: { backgroundColor: '#1e293b', padding: 15, borderRadius: 15, marginBottom: 20 },
  progressText: { color: '#fff', marginBottom: 10, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: '#0f172a', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3b82f6' },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  navBtn: { color: '#94a3b8', fontSize: 24, paddingHorizontal: 20 },
  navTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#1e293b', padding: 10, borderRadius: 15 },
  dayHeader: { width: '14.28%', textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 10 },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#334155' },
  dayCellEmpty: { borderWidth: 0 },
  dayText: { color: '#94a3b8', fontSize: 12, position: 'absolute', top: 4, left: 4 },
  textRed: { color: '#f87171' },
  textBlue: { color: '#60a5fa' },
  hoursText: { color: '#60a5fa', fontSize: 14, fontWeight: 'bold', marginTop: 10 }
});
