// three·words — store build (real auth + moderation)
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Share, Alert, Linking,
  StyleSheet, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase, isConfigured } from './lib/supabase';

// Show notifications as banners while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ---------- config ----------
// Invite links resolve to a landing page (docs/invite/) that shows the code and
// how to install the app. Recipients still enter the 6-char code in-app.
const INVITE_BASE = 'https://threewordsapp.com/invite/?c=';
const inviteLink = (code) => `${INVITE_BASE}${code}`;
// Hosted from docs/index.html via GitHub Pages (enable: repo Settings -> Pages -> main /docs)
const PRIVACY_URL = 'https://threewordsapp.com/privacy/';
const TERMS_URL = 'https://threewordsapp.com/terms/';
const SUPPORT_EMAIL = 'admin@threewordsapp.com';                   // published contact for reports

// ---------- helpers ----------
const extractCode = (text) => {
  const t = (text || '').toUpperCase();
  const linkMatch = t.match(/[?&]C=([A-Z2-9]{6})/) || t.match(/\/I\/([A-Z2-9]{6})/);
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
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null); // { id, name, invite_code }

  // auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'

  // profile / flow
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
  const cloudShotRef = useRef(null);

  // load the caller's profile row (null if not created yet)
  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles').select('id, name, invite_code').eq('id', uid).maybeSingle();
    return data || null;
  }, []);

  // route based on session + whether a profile exists
  const routeForSession = useCallback(async (sess) => {
    if (!sess?.user) { setMe(null); setScreen('auth'); return; }
    const profile = await loadProfile(sess.user.id);
    setMe(profile);
    setScreen(profile ? 'dashboard' : 'needsProfile');
  }, [loadProfile]);

  // boot + subscribe to auth changes
  useEffect(() => {
    if (!isConfigured()) { setScreen('setup'); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      routeForSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      routeForSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, [routeForSession]);

  const loadSubs = useCallback(async (uid) => {
    const { data, error: err } = await supabase
      .from('submissions')
      .select('id, words, display_name, author_id, created_at')
      .eq('recipient_id', uid)
      .order('created_at', { ascending: false });
    if (!err && data) setSubs(data);
  }, []);

  // dashboard: load + subscribe to live inserts addressed to me
  useEffect(() => {
    if (screen !== 'dashboard' || !me?.id) return;
    loadSubs(me.id);
    const channel = supabase
      .channel(`subs-${me.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `recipient_id=eq.${me.id}` },
        (payload) => setSubs((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]))
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); setLive(false); };
  }, [screen, me, loadSubs]);

  const counts = useMemo(() => {
    const c = {};
    subs.forEach((s) => (s.words || []).forEach((w) => (c[w] = (c[w] || 0) + 1)));
    return c;
  }, [subs]);

  // register for push once signed in with a profile ("someone described you")
  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      try {
        if (!Device.isDevice) return; // simulators can't receive push
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted') return; // fine — the app works without push
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (token) await supabase.from('profiles').update({ push_token: token }).eq('id', me.id);
      } catch {} // push is a nice-to-have; never let it break the app
    })();
  }, [me?.id]);

  // ---------- auth actions ----------
  const submitAuth = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail || !password) return setError('Enter your email and a password.');
    if (mode === 'signUp' && password.length < 8) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    setError('');
    const { data, error: err } = mode === 'signUp'
      ? await supabase.auth.signUp({ email: mail, password })
      : await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (err) return setError(err.message || 'Something went wrong. Try again.');
    if (mode === 'signUp' && !data.session) {
      // Email confirmation is on: no session until they confirm.
      setError('');
      setMode('signIn');
      Alert.alert('Check your email', 'Confirm your address, then sign in.');
    }
    // onAuthStateChange handles routing when a session arrives.
  };

  const createProfile = async () => {
    const name = nameInput.trim();
    if (!name) return setError('Enter your name to get started.');
    setBusy(true);
    const { data, error: err } = await supabase.rpc('create_my_profile', { p_name: name });
    setBusy(false);
    if (err) return setError("Couldn't set up your profile. Try again.");
    const profile = Array.isArray(data) ? data[0] : data;
    setMe(profile);
    setError('');
    setScreen('dashboard');
  };

  const findInvite = async () => {
    const code = extractCode(codeInput);
    if (code.length !== 6) return setError('Paste an invite link or a 6-character code.');
    setBusy(true);
    const { data, error: err } = await supabase.rpc('find_profile_by_code', { p_code: code });
    setBusy(false);
    const found = Array.isArray(data) ? data[0] : data;
    if (err || !found) return setError('No one found with that invite. Check it and try again.');
    if (found.id === me?.id) return setError("That's your own invite — share it with others instead.");
    setJoinProfile(found);
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
    const { error: err } = await supabase.from('submissions').upsert(
      {
        recipient_id: joinProfile.id,
        author_id: me.id,
        words: cleaned,
        display_name: anonymous ? null : fromName.trim() || null,
      },
      { onConflict: 'author_id,recipient_id' },
    );
    setBusy(false);
    if (err) return setError("Couldn't send your words. Try again.");
    setError('');
    setScreen('thanks');
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Describe me in three words 👀\n${inviteLink(me.invite_code)}\n(or enter my code ${me.invite_code} in the three·words app)`,
      });
    } catch {}
  };

  const shareCloud = async () => {
    try {
      const uri = await cloudShotRef.current?.capture();
      if (!uri) return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share my word cloud' });
      } else {
        await Share.share({ url: uri, message: inviteLink(me.invite_code) });
      }
    } catch {}
  };

  // ---------- moderation ----------
  const moderateRow = (s) => {
    const actions = [
      {
        text: 'Report',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('reports').insert({ submission_id: s.id, reporter_id: me.id, reason: 'reported from app' });
          await supabase.from('submissions').delete().eq('id', s.id);
          setSubs((prev) => prev.filter((x) => x.id !== s.id));
          Alert.alert('Reported', `Thanks — we review reports within 24 hours. Reach us at ${SUPPORT_EMAIL}.`);
        },
      },
    ];
    // Web (no-install) entries have no account to block; report/remove still work.
    if (s.author_id) {
      actions.push({
        text: 'Block sender',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: s.author_id });
          await supabase.from('submissions').delete().eq('recipient_id', me.id).eq('author_id', s.author_id);
          setSubs((prev) => prev.filter((x) => x.author_id !== s.author_id));
          Alert.alert('Blocked', 'They can no longer add words about you.');
        },
      });
    }
    actions.push(
      { text: 'Remove', onPress: async () => {
          await supabase.from('submissions').delete().eq('id', s.id);
          setSubs((prev) => prev.filter((x) => x.id !== s.id));
        } },
      { text: 'Cancel', style: 'cancel' },
    );
    Alert.alert('This entry', 'What would you like to do?', actions);
  };

  // ---------- account ----------
  const signOut = async () => {
    await supabase.auth.signOut();
    setSubs([]); setMe(null); setEmail(''); setPassword('');
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your profile and every word sent to or from you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error: err } = await supabase.rpc('delete_my_account');
            setBusy(false);
            if (err) return Alert.alert('Could not delete', 'Please try again in a moment.');
            await signOut();
          },
        },
      ],
    );
  };

  const resetToHome = () => {
    setWords(['', '', '']);
    setFromName('');
    setAnonymous(true);
    setCodeInput('');
    setJoinProfile(null);
    setError('');
    setScreen(me ? 'dashboard' : 'auth');
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

          {/* ---- AUTH ---- */}
          {screen === 'auth' && (
            <View>
              <Text style={styles.hero}>
                How do your friends <Text style={{ fontStyle: 'italic', color: '#F5C95D' }}>really</Text> see you?
              </Text>
              <Text style={[styles.muted, { textAlign: 'center', marginBottom: 24 }]}>
                {mode === 'signUp'
                  ? 'Create an account to start your word cloud.'
                  : 'Sign in to see your words and describe others.'}
              </Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#6B6580"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#6B6580"
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Btn
                  label={busy ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Sign in'}
                  disabled={busy}
                  onPress={submitAuth}
                />
                {mode === 'signUp' && (
                  <Text style={{ color: '#8B8698', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 }}>
                    By creating an account you agree to our{' '}
                    <Text style={{ color: '#F5C95D' }} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> and{' '}
                    <Text style={{ color: '#F5C95D' }} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.{' '}
                    three·words has zero tolerance for objectionable content or abusive users.
                  </Text>
                )}
                <Btn
                  ghost
                  label={mode === 'signUp' ? 'I already have an account' : 'Create an account'}
                  onPress={() => { setError(''); setMode(mode === 'signUp' ? 'signIn' : 'signUp'); }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text style={styles.legalLink}>Terms</Text>
                </TouchableOpacity>
                <Text style={[styles.legalLink, { marginHorizontal: 10 }]}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text style={styles.legalLink}>Privacy policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ---- NEEDS PROFILE ---- */}
          {screen === 'needsProfile' && (
            <View style={styles.card}>
              <Text style={styles.h2}>What's your name?</Text>
              <Text style={styles.muted}>Friends will see it when they describe you.</Text>
              <TextInput
                style={styles.input}
                placeholder="Your first name"
                placeholderTextColor="#6B6580"
                value={nameInput}
                maxLength={40}
                onChangeText={setNameInput}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Btn label={busy ? 'Creating…' : 'Create my word cloud'} disabled={busy} onPress={createProfile} />
              <Btn ghost label="Sign out" onPress={signOut} />
            </View>
          )}

          {/* ---- JOIN ---- */}
          {screen === 'join' && (
            <View style={styles.card}>
              <Text style={styles.h2}>Paste an invite</Text>
              <Text style={styles.muted}>An invite link or a 6-character code.</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="a shared link or code like ABC123"
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
                <Btn label="Back to my cloud" onPress={resetToHome} />
              </View>
            </View>
          )}

          {/* ---- DASHBOARD ---- */}
          {screen === 'dashboard' && me && (
            <View>
              <ViewShot ref={cloudShotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
                <View style={{ backgroundColor: '#16141F', paddingVertical: 10, paddingHorizontal: 4 }}>
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

                  {subs.length > 0 && (
                    <Text style={{ color: '#6B6580', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                      three·words  ·  describe me: {INVITE_BASE.replace('https://', '')}{me.invite_code}
                    </Text>
                  )}
                </View>
              </ViewShot>

              {subs.length > 0 && <Btn label="Share my cloud" onPress={shareCloud} style={{ marginTop: 10 }} />}

              <View style={styles.card}>
                <Text style={styles.label}>YOUR INVITE</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 28, letterSpacing: 3, color: '#F5C95D', marginBottom: 12 }}>
                  {me.invite_code}
                </Text>
                <Btn ghost label="Share invite" onPress={shareInvite} />
                <Text style={[styles.muted, { fontSize: 13, marginTop: 4 }]}>
                  Anyone with your code can add words — share it with people you trust.
                </Text>
              </View>

              {subs.length > 0 && (
                <View style={[styles.card, { marginTop: 12 }]}>
                  <Text style={styles.label}>RECENT</Text>
                  {subs.slice(0, 8).map((s, i) => (
                    <View key={s.id || i} style={[styles.recentRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2A2639' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: s.display_name ? '#F2EEE8' : '#8B8698', fontStyle: s.display_name ? 'normal' : 'italic', fontSize: 14 }}>
                          {s.display_name || 'anonymous'}
                        </Text>
                        <Text style={{ color: '#A9A3B8', fontSize: 14 }}>{(s.words || []).join(' · ')}</Text>
                      </View>
                      <TouchableOpacity onPress={() => moderateRow(s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={{ color: '#6B6580', fontSize: 18, paddingHorizontal: 6 }}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Btn ghost label="Describe someone" onPress={() => { setError(''); setScreen('join'); }} style={{ marginTop: 16 }} />
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => loadSubs(me.id)}><Text style={styles.footerLink}>Refresh</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('account')}><Text style={styles.footerLink}>Account</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* ---- ACCOUNT ---- */}
          {screen === 'account' && (
            <View style={styles.card}>
              <Text style={styles.h2}>Account</Text>
              <Text style={styles.muted}>{session?.user?.email}</Text>

              <Btn ghost label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
              <Btn ghost label="Contact support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
              <Btn ghost label="Sign out" onPress={signOut} />

              <View style={{ height: 1, backgroundColor: '#2A2639', marginVertical: 16 }} />
              <Text style={[styles.label, { color: '#E88C9C' }]}>DANGER ZONE</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={deleteAccount} disabled={busy}>
                <Text style={styles.deleteBtnText}>{busy ? 'Deleting…' : 'Delete my account'}</Text>
              </TouchableOpacity>
              <Text style={[styles.muted, { fontSize: 12, marginTop: 8 }]}>
                Permanently deletes your profile and all words to or from you.
              </Text>

              <Btn label="Back" onPress={() => setScreen('dashboard')} style={{ marginTop: 16 }} />
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
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 14 },
  footerLink: { color: '#6B6580', fontSize: 13, textAlign: 'center' },
  legalLink: { color: '#6B6580', fontSize: 13, textAlign: 'center', marginTop: 18, textDecorationLine: 'underline' },
  deleteBtn: { borderWidth: 1, borderColor: '#E88C9C', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  deleteBtnText: { color: '#E88C9C', fontWeight: '600', fontSize: 15 },
});
