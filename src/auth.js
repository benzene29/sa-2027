import { supabase } from './supabaseClient.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const VERIFY_REDIRECT = window.location.origin + window.location.pathname + '?auth=set-password';

// screen: 'signin' | 'signup' | 'sent'
export function renderAuthScreen(container, view = {}) {
  const screen = view.screen || 'signin';
  const status = view.status || 'idle';
  const message = view.message || '';

  if (screen === 'sent') {
    container.innerHTML =
      '<div class="login-shell"><div class="login-card">' +
        '<span class="eyebrow">South America 2027</span>' +
        '<h1>Check your email</h1>' +
        '<p class="sub">' + esc(message) + '</p>' +
        '<p class="login-message">Click the link, then you\'ll set a password and be straight in.</p>' +
        '<button type="button" class="link-btn" id="backToSignin">Back to sign in</button>' +
      '</div></div>';
    container.querySelector('#backToSignin').addEventListener('click', () => renderAuthScreen(container, { screen: 'signin' }));
    return;
  }

  const isSignup = screen === 'signup';
  container.innerHTML =
    '<div class="login-shell"><div class="login-card">' +
      '<span class="eyebrow">South America 2027</span>' +
      '<h1>' + (isSignup ? 'Create your account' : 'Sign in') + '</h1>' +
      '<p class="sub">' + (isSignup
        ? 'Enter your name and email — we\'ll send a link to verify it, then you\'ll set a password.'
        : 'Enter your email and password.') + '</p>' +
      '<form id="authForm" class="login-form">' +
        (isSignup ? '<input type="text" id="authName" placeholder="Your name" required maxlength="24" autocomplete="name">' : '') +
        '<input type="email" id="authEmail" placeholder="you@example.com" required autocomplete="email">' +
        (isSignup ? '' : '<input type="password" id="authPassword" placeholder="Password" required autocomplete="current-password">') +
        '<button type="submit"' + (status === 'sending' ? ' disabled' : '') + '>' +
          (status === 'sending' ? 'Please wait…' : (isSignup ? 'Send verification link' : 'Sign in')) +
        '</button>' +
      '</form>' +
      (!isSignup ? '<button type="button" class="link-btn" id="forgotPassword">Forgot password?</button>' : '') +
      (message ? '<p class="login-message' + (status === 'error' ? ' error' : '') + '">' + esc(message) + '</p>' : '') +
      '<p class="login-switch">' + (isSignup ? 'Already have an account?' : 'Don\'t have an account?') +
        ' <button type="button" class="link-btn" id="switchMode">' + (isSignup ? 'Sign in' : 'Create one') + '</button></p>' +
    '</div></div>';

  container.querySelector('#switchMode').addEventListener('click', () => {
    renderAuthScreen(container, { screen: isSignup ? 'signin' : 'signup' });
  });

  const forgotBtn = container.querySelector('#forgotPassword');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = container.querySelector('#authEmail').value.trim();
      if (!email) {
        renderAuthScreen(container, { screen: 'signin', status: 'error', message: 'Enter your email above first.' });
        return;
      }
      renderAuthScreen(container, { screen: 'signin', status: 'sending' });
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: VERIFY_REDIRECT });
      if (error) {
        renderAuthScreen(container, { screen: 'signin', status: 'error', message: error.message });
      } else {
        renderAuthScreen(container, { screen: 'sent', message: 'Check ' + email + ' for a password reset link.' });
      }
    });
  }

  const form = container.querySelector('#authForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#authEmail').value.trim();
    if (!email) return;

    if (isSignup) {
      const name = container.querySelector('#authName').value.trim();
      renderAuthScreen(container, { screen: 'signup', status: 'sending' });
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: VERIFY_REDIRECT, data: { full_name: name } },
      });
      if (error) {
        renderAuthScreen(container, { screen: 'signup', status: 'error', message: error.message });
      } else {
        renderAuthScreen(container, { screen: 'sent', message: 'Check ' + email + ' for a verification link.' });
      }
    } else {
      const password = container.querySelector('#authPassword').value;
      renderAuthScreen(container, { screen: 'signin', status: 'sending' });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        renderAuthScreen(container, { screen: 'signin', status: 'error', message: error.message });
      }
      // on success, the onAuthStateChange listener in main.js takes over
    }
  });
}

export function renderSetPasswordScreen(container, user, onDone) {
  container.innerHTML =
    '<div class="login-shell"><div class="login-card">' +
      '<span class="eyebrow">South America 2027</span>' +
      '<h1>Set a password</h1>' +
      '<p class="sub">You\'re verified as <b>' + esc(user.email) + '</b>. Choose a password so you can sign in directly next time.</p>' +
      '<form id="setPasswordForm" class="login-form">' +
        '<input type="password" id="newPassword" placeholder="New password" minlength="8" required autocomplete="new-password">' +
        '<input type="password" id="confirmPassword" placeholder="Confirm password" minlength="8" required autocomplete="new-password">' +
        '<button type="submit">Set password &amp; continue</button>' +
      '</form>' +
      '<p class="login-message" id="setPasswordMessage"></p>' +
    '</div></div>';

  const form = container.querySelector('#setPasswordForm');
  const msg = container.querySelector('#setPasswordMessage');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.classList.remove('error');
    const p1 = container.querySelector('#newPassword').value;
    const p2 = container.querySelector('#confirmPassword').value;
    if (p1 !== p2) { msg.textContent = 'Passwords do not match.'; msg.classList.add('error'); return; }
    if (p1.length < 8) { msg.textContent = 'Use at least 8 characters.'; msg.classList.add('error'); return; }
    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      msg.textContent = error.message;
      msg.classList.add('error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set password & continue';
      return;
    }
    onDone();
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
