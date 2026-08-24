import './style.css';
import { supabase } from './supabaseClient.js';
import { renderAuthScreen, renderSetPasswordScreen, renderAuthLoading, watchAuth } from './auth.js';
import { startApp } from './app.js';

const app = document.getElementById('app');
let resolved = false;
let started = false;

// A signup-verification or password-reset link lands back here with this query
// param, which tells us to make the person choose a password before entering.
const params = new URLSearchParams(window.location.search);
let needsPasswordSet = params.get('auth') === 'set-password';

renderAuthLoading(app);

function enterApp(user) {
  started = true;
  startApp(app, user, () => supabase.auth.signOut());
}

watchAuth((session) => {
  resolved = true;
  if (session && session.user) {
    if (needsPasswordSet) {
      started = false;
      renderSetPasswordScreen(app, session.user, () => {
        needsPasswordSet = false;
        window.history.replaceState({}, '', window.location.pathname);
        enterApp(session.user);
      });
    } else if (!started) {
      enterApp(session.user);
    }
  } else {
    started = false;
    renderAuthScreen(app);
  }
});

// Safety net in case getSession() hangs (e.g. offline) — don't leave the user staring at "Loading…".
setTimeout(() => {
  if (!resolved && !started) renderAuthScreen(app);
}, 4000);
