// three·words — Expo family-test build
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Share,
  StyleSheet, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isConfigured } from './lib/supabase';

// ---------- helpers ----------
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const LINK_BASE = 'threewords.app/i/';
const inviteLink = (code) => `https://${LINK_BASE}${code}`;

const extractCode = (text) => {
  const t = (text || '').toUpperCase();
  const linkMatch = t.match(/\/I\/([A-Z2-9]{6})/);
  if (linkMatch) return linkMatch[1];
  const codeMatch = t.match(/\b[A-HJ-NP-Z2-9]{6}\b/);
  return codeMatch ? codeMatch[0] : t.replace(/[^A-Z2-9]/g, '').slice(0, 6);
};

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const PALETTE = ['#F5C95D', '#E88C9C', '#8FB8C9', '#C9A6E8', '#A8D8B0'];
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif' });

// ---------- gentle profanity filter ----------
const BLOCKED = new Set([
  'fuck','fucking','fucker','shit','shitty','bitch','bitchy','asshole','arsehole',
  'bastard','cunt','dick','dickhead','prick','pussy','slut','slutty','whore','hoe',
  'douche','douchey','wanker','twat','retard','retarded','fag','faggot','dyke',
  'nigger','nigga','spic','chink','kike','tranny','crap','crappy','damn','piss',
  'cock','tits','boobs','penis','vagina','rapist','nazi','skank','hooker',
]);
const BLOCKED_SUBSTR = ['fuck', 'nigg', 'cunt', 'faggot'];
const normalizeWord = (raw) => {
  let w = (raw || '').toLowerCase();
  const subs = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '$': 's', '@': 'a', '7': 't', '!': 'i' };
  w = w.split('').map((ch) => subs[ch] || ch).join('');
  return w.replace(/[^a-z\-']/g, '');
};
const isProfane = (w) => {
  const collapsed = w.replace(/(.)\1+/g, '$1');
  if (BLOCKED.has(w) || BLOCKED.has(collapsed)) return true;
  return BLOCKED_SUBSTR.some((b) => w.includes(b) || collapsed.includes(b));
};

// ---------- word cloud ----------
function WordCloud({ counts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const max = entries[0][1];
  return (
    <View style={styles.cloud}>
      {entries.map(([word, count]) => {
        const t = max === 1 ? 0.5 : (count - 1) / (max - 1);
        const size = 17 + t * 28;
        const color = PALETTE[hash(word) % PALETTE.length];
        const tilt = ((hash(word) % 7) - 3) * 1.2;
        return (
          <View key={word} style={{ transform: [{ rotate: `${tilt}deg` }], flexDirection: 'row', alignItems: 'flex-start', margin: 6 }}>
            <Text style={{ fontFamily: SERIF, fontSize: size, color, fontWeight: t > 0.55 ? '600' : '400' }}>
              {word}
            </Text>
            {count > 1 && <Text style={{ fontSize: 11, color: '#8B8698', marginLeft: 2 }}>{count}</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ---------- app ----------
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joinProfile, setJoinProfile] = useState(null);
  const [words, setWords] = useState(['', '', '']);
  const [fromName, setFromName] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const channelRef = useRef(null);

  // boot: restore saved profile
  useEffect(() => {
    (async () => {
      if (!isConfigured()) return setScreen('setup');
      try {
        const saved = await AsyncStorage.getItem('tw:me');
        if (saved) {
          setMe(JSON.parse(saved));
          setScreen('dashboard');
        } else {
          setScreen('welcome');
        }
      } catch {
        setScreen('welcome');
      }
    })();
  }, []);

  const loadSubs = useCallback(async (code) => {
    const { data, error: err } = await supabase
      .from('submissions')
      .select('words, from_name, created_at')
      .eq('code', code)
      .order('created_at', { ascending: false });
    if (!err && data) setSubs(data);
  }, []);

  // dashboard: load + subscribe to live inserts
  useEffect(() => {
    if (screen !== 'dashboard' || !me?.code) return;
    loadSubs(me.code);
    const channel = supabase
      .channel(`subs-${me.code}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `code=eq.${me.code}` },
        (payload) => setSubs((prev) => [payload.new, ...prev]))
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); setLive(false); };
  }, [screen, me, loadSubs]);

  const counts = useMemo(() => {
    const c = {};
    subs.forEach((s) => (s.words || []).forEach((w) => (c[w] = (c[w] || 0) + 1)));
    return c;
  }, [subs]);

  // ---------- actions ----------
  const createProfile = async () => {
    const name = nameInput.trim();
    if (!name) return setError('Enter your name to get started.');
    setBusy(true);
    const code = makeCode();
    const { error: err } = await supabase.from('profiles').insert({ code, name });
    setBusy(false);
    if (err) return setError("Couldn't save your profile. Check your connection and try again.");
    const profile = { name, code };
    await AsyncStorage.setItem('tw:me', JSON.stringify(profile));
    setMe(profile);
    setError('');
    setScreen('dashboard');
  };

  const findInvite = async () => {
    const code = extractCode(codeInput);
    if (code.length !== 6) return setError('Paste an invite link or a 6-character code.');
    setBusy(true);
    const { data, error: err } = await supabase.from('profiles').select('code, name').eq('code', code).single();
    setBusy(false);
    if (err || !data) return setError('No one found with that invite. Check it and try again.');
    setJoinProfile(data);
    setError('');
    setScreen('submit');
  };

  const submitWords = async () => {
    const cleaned = words.map(normalizeWord);
    if (cleaned.some((w) => !w)) return setError('All three words are needed.');
    if (cleaned.some((w) => w.length > 20)) return setError('Keep each word under 20 letters.');
    if (words.some((w) => w.trim().includes(' '))) return setError('One word each — no spaces.');
    if (new Set(cleaned).size < 3) return setError('Three different words, please.');
    if (cleaned.some(isProfane)) return setError("Let's keep it kind — try different words.");
    setBusy(true);
    const { error: err } = await supabase.from('submissions').insert({
      code: joinProfile.code,
      words: cleaned,
      from_name: anonymous ? null : fromName.trim() || null,
    });
    setBusy(false);
    if (err) return setError("Couldn't send your words. Try again.");
    setError('');
    setScreen('thanks');
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Describe me in three words 👀\n${inviteLink(me.code)}\n\n(For our test: open the three·words app in Expo Go and paste the code ${me.code})`,
      });
    } catch {}
  };

  const resetToHome = () => {
    setWords(['', '', '']);
    setFromName('');
    setAnonymous(true);
    setCodeInput('');
    setJoinProfile(null);
    setError('');
    setScreen(me ? 'dashboard' : 'welcome');
  };

  // ---------- render ----------
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.wordmark}>
            three<Text style={{ color: '#F5C95D' }}>·</Text>words
          </Text>

          {screen === 'loading' && <ActivityIndicator color="#F5C95D" style={{ marginTop: 60 }} />}

          {/* ---- SETUP (Supabase keys missing) ---- */}
          {screen === 'setup' && (
            <View style={styles.card}>
              <Text style={styles.h2}>One setup step left</Text>
              <Text style={styles.muted}>
                Open lib/supabase.js and paste your Supabase project URL and anon key, then run
                supabase-schema.sql in the Supabase SQL Editor. Save the file and the app will reload.
              </Text>
            </View>
          )}

          {/* ---- WELCOME ---- */}
          {screen === 'welcome' && (
            <View>
              <Text style={styles.hero}>
                How do your friends <Text style={{ fontStyle: 'italic', color: '#F5C95D' }}>really</Text> see you?
              </Text>
              <Text style={[styles.muted, { textAlign: 'center', marginBottom: 30 }]}>
                Invite the people who know you. Each one sends three words that describe you — named or
                anonymous. Watch your word cloud take shape.
              </Text>
              <Btn label="Start my word cloud" onPress={() => { setError(''); setScreen('create'); }} />
              <Btn ghost label="I have an invite" onPress={() => { setError(''); setScreen('join'); }} />
            </View>
          )}

          {/* ---- CREATE ---- */}
          {screen === 'create' && (
            <View style={styles.card}>
              <Text style={styles.h2}>What's your name?</Text>
              <Text style={styles.muted}>Friends will see it when they describe you.</Text>
              <TextInput
                style={styles.input}
                placeholder="Your first name"
                placeholderTextColor="#6B6580"
                value={nameInput}
                maxLength={30}
                onChangeText={setNameInput}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Btn label={busy ? 'Creating…' : 'Create my invite link'} disabled={busy} onPress={createProfile} />
              <Btn ghost label="Back" onPress={resetToHome} />
            </View>
          )}

          {/* ---- JOIN ---- */}
          {screen === 'join' && (
            <View style={styles.card}>
              <Text style={styles.h2}>Paste an invite</Text>
              <Text style={styles.muted}>An invite link or a 6-character code.</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="threewords.app/i/ABC123 or ABC123"
                placeholderTextColor="#6B6580"
                autoCapitalize="characters"
                value={codeInput}
                onChangeText={setCodeInput}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Btn label={busy ? 'Looking…' : 'Find them'} disabled={busy} onPress={findInvite} />
              <Btn ghost label="Back" onPress={resetToHome} />
            </View>
          )}

          {/* ---- SUBMIT ---- */}
          {screen === 'submit' && joinProfile && (
            <View style={styles.card}>
              <Text style={styles.h2}>Describe {joinProfile.name}</Text>
              <Text style={styles.muted}>Three one-word adjectives. Be honest — that's the point.</Text>
              {words.map((w, i) => (
                <TextInput
                  key={i}
                  style={styles.input}
                  placeholder={['e.g. loyal', 'e.g. curious', 'e.g. stubborn'][i]}
                  placeholderTextColor="#6B6580"
                  autoCapitalize="none"
                  value={w}
                  maxLength={20}
                  onChangeText={(v) => { const next = [...words]; next[i] = v; setWords(next); }}
                />
              ))}
              <View style={styles.anonRow}>
                <Text style={{ color: '#F2EEE8', fontSize: 14 }}>Stay anonymous</Text>
                <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: '#F5C95D' }} />
              </View>
              {!anonymous && (
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#6B6580"
                  value={fromName}
                  maxLength={30}
                  onChangeText={setFromName}
                />
              )}
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Btn label={busy ? 'Sending…' : `Send to ${joinProfile.name}`} disabled={busy} onPress={submitWords} />
              <Btn ghost label="Cancel" onPress={resetToHome} />
            </View>
          )}

          {/* ---- THANKS ---- */}
          {screen === 'thanks' && (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
              <Text style={{ fontFamily: SERIF, fontSize: 40, color: '#F5C95D' }}>✳</Text>
              <Text style={[styles.h2, { marginTop: 8 }]}>Words sent</Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                Your three words just joined {joinProfile?.name}'s cloud.
              </Text>
              <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
                {!me && <Btn label="Now start your own" onPress={() => { setError(''); setScreen('create'); }} />}
                <Btn ghost={!me} label={me ? 'Back to my cloud' : 'Done'} onPress={resetToHome} />
              </View>
            </View>
          )}

          {/* ---- DASHBOARD ---- */}
          {screen === 'dashboard' && me && (
            <View>
              <Text style={styles.h1}>{me.name}'s cloud</Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                {subs.length === 0
                  ? 'No words yet — send your first invite.'
                  : `${subs.length} ${subs.length === 1 ? 'person has' : 'people have'} described you`}
                {live ? '  ·  live' : ''}
              </Text>

              {subs.length > 0 ? (
                <WordCloud counts={counts} />
              ) : (
                <Text style={styles.emptyCloud}>your words will appear here</Text>
              )}

              <View style={styles.card}>
                <Text style={styles.label}>YOUR INVITE</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 19, color: '#F5C95D', marginBottom: 12 }}>
                  {LINK_BASE}{me.code}
                </Text>
                <Btn label="Share invite link" onPress={shareInvite} />
                <Text style={[styles.muted, { fontSize: 13, marginTop: 4 }]}>
                  Share it only with people you trust — only they can add words.
                </Text>
              </View>

              {subs.length > 0 && (
                <View style={[styles.card, { marginTop: 12 }]}>
                  <Text style={styles.label}>RECENT</Text>
                  {subs.slice(0, 8).map((s, i) => (
                    <View key={i} style={[styles.recentRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2A2639' }]}>
                      <Text style={{ color: s.from_name ? '#F2EEE8' : '#8B8698', fontStyle: s.from_name ? 'normal' : 'italic', fontSize: 14 }}>
                        {s.from_name || 'anonymous'}
                      </Text>
                      <Text style={{ color: '#A9A3B8', fontSize: 14 }}>{(s.words || []).join(' · ')}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Btn ghost label="Refresh" onPress={() => loadSubs(me.code)} style={{ marginTop: 16 }} />
              <TouchableOpacity onPress={() => { setError(''); setScreen('join'); }}>
                <Text style={{ color: '#6B6580', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                  Describe someone else instead
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- small button component ----------
function Btn({ label, onPress, ghost, disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[ghost ? styles.btnGhost : styles.btnPrimary, disabled && { opacity: 0.6 }, style]}
    >
      <Text style={ghost ? styles.btnGhostText : styles.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#16141F' },
  scroll: { padding: 20, paddingTop: 64, paddingBottom: 48, maxWidth: 460, width: '100%', alignSelf: 'center' },
  wordmark: { fontFamily: SERIF, fontSize: 22, fontWeight: '600', color: '#F2EEE8', textAlign: 'center', marginBottom: 24 },
  hero: { fontFamily: SERIF, fontSize: 36, fontWeight: '300', color: '#F2EEE8', textAlign: 'center', lineHeight: 44, marginBottom: 10 },
  h1: { fontFamily: SERIF, fontSize: 30, fontWeight: '300', color: '#F2EEE8', textAlign: 'center', marginBottom: 2 },
  h2: { fontFamily: SERIF, fontSize: 24, color: '#F2EEE8', marginBottom: 6 },
  muted: { color: '#A9A3B8', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  label: { fontSize: 12, color: '#A9A3B8', letterSpacing: 1.5, marginBottom: 8 },
  card: { backgroundColor: '#211E2E', borderColor: '#322E44', borderWidth: 1, borderRadius: 18, padding: 20, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#3D3852', backgroundColor: '#1B1827', color: '#F2EEE8',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, marginBottom: 10,
  },
  btnPrimary: { backgroundColor: '#F5C95D', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#16141F', fontWeight: '700', fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: '#3D3852', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  btnGhostText: { color: '#F2EEE8', fontWeight: '500', fontSize: 16 },
  error: { color: '#E88C9C', fontSize: 13, marginBottom: 6 },
  anonRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1B1827', borderColor: '#322E44', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 10, marginTop: 6,
  },
  cloud: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 26, paddingHorizontal: 8,
  },
  emptyCloud: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, color: '#4E4963', textAlign: 'center', paddingVertical: 44 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
});
