import './style.css';
import { supabase } from './supabaseClient.js';
import { renderLoginScreen, renderAuthLoading, watchAuth } from './auth.js';
import { startApp } from './app.js';

const app = document.getElementById('app');
let resolved = false;
let started = false;

renderAuthLoading(app);

watchAuth((session) => {
  resolved = true;
  if (session && session.user) {
    started = true;
    startApp(app, session.user, () => supabase.auth.signOut());
  } else {
    started = false;
    renderLoginScreen(app);
  }
});

// Safety net in case getSession() hangs (e.g. offline) — don't leave the user staring at "Loading…".
setTimeout(() => {
  if (!resolved && !started) renderLoginScreen(app);
}, 4000);
