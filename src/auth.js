import { supabase } from './supabaseClient.js';

export function renderLoginScreen(container, { status = 'idle', message = '' } = {}) {
  container.innerHTML =
    '<div class="login-shell"><div class="login-card">' +
      '<span class="eyebrow">South America 2027</span>' +
      '<h1>Sign in to plan the trip</h1>' +
      '<p class="sub">Enter your email and we\'ll send you a one-time sign-in link. No password needed.</p>' +
      '<form id="loginForm" class="login-form">' +
        '<input type="email" id="loginEmail" placeholder="you@example.com" required autocomplete="email"' +
          (status === 'sent' ? ' disabled' : '') + '>' +
        '<button type="submit"' + (status === 'sending' ? ' disabled' : '') + '>' +
          (status === 'sending' ? 'Sending…' : status === 'sent' ? 'Link sent' : 'Send magic link') +
        '</button>' +
      '</form>' +
      (message ? '<p class="login-message' + (status === 'error' ? ' error' : '') + '">' + message + '</p>' : '') +
    '</div></div>';

  const form = container.querySelector('#loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = container.querySelector('#loginEmail');
    const email = emailInput.value.trim();
    if (!email) return;
    renderLoginScreen(container, { status: 'sending' });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      renderLoginScreen(container, { status: 'error', message: error.message });
    } else {
      renderLoginScreen(container, { status: 'sent', message: 'Check ' + email + ' for a sign-in link.' });
    }
  });
}

export function renderAuthLoading(container) {
  container.innerHTML = '<div class="login-loading">Loading…</div>';
}

// Calls onChange(session) once immediately with the current session, then again
// whenever auth state changes (sign in, sign out, token refresh).
export function watchAuth(onChange) {
  supabase.auth.getSession().then(({ data }) => onChange(data.session));
  supabase.auth.onAuthStateChange((_event, session) => onChange(session));
}
