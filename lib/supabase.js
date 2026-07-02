// lib/supabase.js
// 1. Create a free project at https://supabase.com
// 2. In your project: Settings → API → copy the Project URL and the anon public key
// 3. Paste them below, then run the SQL in supabase-schema.sql (SQL Editor → New query → Run)

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iyphfzubdebuenbiplzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGhmenViZGVidWVuYmlwbHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDI5NDMsImV4cCI6MjA5ODUxODk0M30.sPUWJJ3-oyjQRTVpGBWBAPnPBG47Ojndu8MC2Ej4FdQ';

// React Native needs AsyncStorage as the auth store so the session survives app
// restarts. detectSessionInUrl is off because there's no browser URL to parse.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isConfigured = () => !SUPABASE_URL.includes('PASTE_');
