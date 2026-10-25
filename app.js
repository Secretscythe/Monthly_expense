/**
 * SpendFlow - Monthly Tracker with Daily Calendar
 * Add money (income) & deduct money (expenses), per-day calendar,
 * income tracking, net savings and savings rate.
 * 100% compatible with GitHub Pages and Streamlit Cloud
 */

// Default Expense Categories (used when deducting money)
const DEFAULT_EXPENSE_CATEGORIES = {
  'Food & Dining': { color: '#f59e0b', icon: '🍔' },
  'Housing & Rent': { color: '#8b5cf6', icon: '🏠' },
  'Utilities & Bills': { color: '#0ea5e9', icon: '⚡' },
  'Transportation': { color: '#10b981', icon: '🚗' },
  'Shopping & Retail': { color: '#ec4899', icon: '🛍️' },
  'Entertainment': { color: '#a855f7', icon: '🎬' },
  'Healthcare': { color: '#ef4444', icon: '💊' },
  'Education': { color: '#3b82f6', icon: '📚' },
  'Personal Care': { color: '#06b6d4', icon: '✨' },
  'Miscellaneous': { color: '#94a3b8', icon: '📦' },
  'Other': { color: '#64748b', icon: '🏷️' }
};

// Default Income Categories (used when adding money)
const DEFAULT_INCOME_CATEGORIES = {
  'Salary': { color: '#10b981', icon: '💼' },
  'Freelance': { color: '#22d3ee', icon: '💻' },
  'Business': { color: '#14b8a6', icon: '🏪' },
  'Investments': { color: '#84cc16', icon: '📈' },
  'Gift': { color: '#f472b6', icon: '🎁' },
  'Refund': { color: '#a3e635', icon: '↩️' },
  'Other': { color: '#64748b', icon: '🏷️' }
};

// DOM helper
const $ = id => document.getElementById(id);

// Application State
const state = {
  currentUser: null,         // { id, name, email }
  currentDate: new Date(),   // month being viewed
  selectedDay: null,         // 'YYYY-MM-DD' or null (= whole month)
  entries: [],
  baseBalance: 2500,
  filterCategory: 'ALL',
  filterType: 'ALL',         // 'ALL' | 'add' | 'deduct'
  trendMode: 'daily',        // 'daily' | 'weekly'
  logMode: 'deduct',
  expenseCategories: { ...DEFAULT_EXPENSE_CATEGORIES },
  incomeCategories: { ...DEFAULT_INCOME_CATEGORIES },
  catModalTab: 'expense',    // 'expense' | 'income'
  catEditing: null           // null | { type: 'expense'|'income', oldName: string }
};

// Backwards-compatible object proxies
const EXPENSE_CATEGORIES = new Proxy({}, {
  get: (_, prop) => state.expenseCategories[prop],
  ownKeys: () => Object.keys(state.expenseCategories),
  getOwnPropertyDescriptor: (_, prop) => Object.getOwnPropertyDescriptor(state.expenseCategories, prop)
});

const INCOME_CATEGORIES = new Proxy({}, {
  get: (_, prop) => state.incomeCategories[prop],
  ownKeys: () => Object.keys(state.incomeCategories),
  getOwnPropertyDescriptor: (_, prop) => Object.getOwnPropertyDescriptor(state.incomeCategories, prop)
});

function getCategoryConfig(category, type) {
  const map = type === 'add' ? state.incomeCategories : state.expenseCategories;
  if (map && map[category]) return map[category];
  const alt = type === 'add' ? state.expenseCategories : state.incomeCategories;
  if (alt && alt[category]) return alt[category];
  return { color: '#64748b', icon: type === 'add' ? '💰' : '🏷️' };
}

// ========================================================
// AUTHENTICATION & MULTI-USER STORAGE
// ========================================================

// Safe storage abstraction (handles environments like Streamlit components where localStorage is restricted)
const storage = (() => {
  const mem = {};
  return {
    getItem(k) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(k);
        }
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
    },
    setItem(k, v) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(k, String(v));
          return;
        }
      } catch (e) {}
      mem[k] = String(v);
    },
    removeItem(k) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(k);
        }
      } catch (e) {}
      delete mem[k];
    }
  };
})();

const sessionStore = (() => {
  const mem = {};
  return {
    getItem(k) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage.getItem(k);
        }
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
    },
    setItem(k, v) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(k, String(v));
          return;
        }
      } catch (e) {}
      mem[k] = String(v);
    },
    removeItem(k) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(k);
        }
      } catch (e) {}
      delete mem[k];
    }
  };
})();

const AUTH_USERS_KEY = 'spendflow_auth_users';
const AUTH_SESSION_KEY = 'spendflow_auth_session';

const DEFAULT_USERS = [
  {
    id: 'user_admin',
    name: 'Administrator',
    email: 'admin@spendflow.app',
    password: 'admin123',
    role: 'admin',
    createdAt: 1700000000000
  },
  {
    id: 'user_demo',
    name: 'Demo User',
    email: 'demo@spendflow.app',
    password: 'password123',
    role: 'member',
    createdAt: 1700000000000
  }
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function clearAuthInputs() {
  const ids = [
    'signin-email', 'signin-password',
    'signup-name', 'signup-email', 'signup-password', 'signup-confirm-password',
    'reset-email', 'reset-code-input', 'reset-new-password', 'reset-confirm-password'
  ];
  ids.forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  if ($('signup-email-status-pill')) $('signup-email-status-pill').classList.add('hidden');
  if ($('reset-step-1')) $('reset-step-1').classList.remove('hidden');
  if ($('reset-step-2')) $('reset-step-2').classList.add('hidden');
  if ($('reset-code-status')) {
    $('reset-code-status').textContent = '';
    $('reset-code-status').className = 'code-status-msg';
  }
  hideSecurityToast();
}

function getUserStorageKey(suffix) {
  const userId = (state.currentUser && state.currentUser.id) ? state.currentUser.id : 'user_demo';
  return `spendflow_${userId}_${suffix}`;
}

// Migrate legacy single-tenant storage to demo user if present
function migrateLegacyStorage() {
  try {
    const legacyEntries = storage.getItem('spendflow_clean_expenses');
    const demoEntriesKey = 'spendflow_user_demo_clean_expenses';
    if (legacyEntries && !storage.getItem(demoEntriesKey)) {
      storage.setItem(demoEntriesKey, legacyEntries);
      const legacyBase = storage.getItem('spendflow_base_balance');
      if (legacyBase) storage.setItem('spendflow_user_demo_base_balance', legacyBase);
      const legacyExpCats = storage.getItem('spendflow_expense_categories');
      if (legacyExpCats) storage.setItem('spendflow_user_demo_expense_categories', legacyExpCats);
      const legacyIncCats = storage.getItem('spendflow_income_categories');
      if (legacyIncCats) storage.setItem('spendflow_user_demo_income_categories', legacyIncCats);
    }
  } catch (e) {
    console.warn('Storage migration exception', e);
  }
}

function getRegisteredUsers() {
  try {
    const stored = JSON.parse(storage.getItem(AUTH_USERS_KEY));
    if (Array.isArray(stored) && stored.length > 0) {
      if (!stored.some(u => u.id === 'user_admin' || u.email === 'admin@spendflow.app')) {
        stored.unshift(DEFAULT_USERS[0]);
        storage.setItem(AUTH_USERS_KEY, JSON.stringify(stored));
      }
      return stored;
    }
  } catch (e) {}
  storage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return [...DEFAULT_USERS];
}

function saveRegisteredUsers(users) {
  storage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getActiveSession() {
  try {
    const raw = storage.getItem(AUTH_SESSION_KEY) || sessionStore.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.userId) return null;
    const users = getRegisteredUsers();
    return users.find(u => u.id === session.userId) || null;
  } catch (e) {
    return null;
  }
}

function setActiveSession(user, remember = true) {
  const data = JSON.stringify({ userId: user.id, email: user.email, loggedAt: Date.now() });
  if (remember) {
    storage.setItem(AUTH_SESSION_KEY, data);
    sessionStore.removeItem(AUTH_SESSION_KEY);
  } else {
    sessionStore.setItem(AUTH_SESSION_KEY, data);
    storage.removeItem(AUTH_SESSION_KEY);
  }
}

function clearActiveSession() {
  storage.removeItem(AUTH_SESSION_KEY);
  sessionStore.removeItem(AUTH_SESSION_KEY);
}

function getUserInitials(name) {
  if (!name) return 'SF';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function updateUserProfileUI(user) {
  if (!user) return;
  const initials = getUserInitials(user.name);
  if ($('user-avatar')) $('user-avatar').textContent = initials;
  if ($('user-display-name')) $('user-display-name').textContent = user.name;
  if ($('dropdown-user-avatar')) $('dropdown-user-avatar').textContent = initials;
  if ($('dropdown-user-name')) $('dropdown-user-name').textContent = user.name;
  if ($('dropdown-user-email')) $('dropdown-user-email').textContent = user.email;

  const isAdmin = user.role === 'admin';
  if ($('user-admin-badge')) $('user-admin-badge').classList.toggle('hidden', !isAdmin);
  if ($('open-admin-panel-btn')) $('open-admin-panel-btn').classList.toggle('hidden', !isAdmin);
  if ($('dropdown-user-role')) {
    $('dropdown-user-role').textContent = isAdmin ? 'Admin' : 'Member';
    $('dropdown-user-role').className = 'user-role-badge ' + (isAdmin ? 'admin' : '');
  }
}

function applyUserLogin(user, showGreeting = true) {
  state.currentUser = user;
  updateUserProfileUI(user);

  // Hide auth modal & unblur app layout, unlock body scroll
  if ($('auth-modal')) $('auth-modal').classList.add('hidden');
  document.body.classList.remove('auth-locked');
  const layout = document.querySelector('.app-layout');
  if (layout) layout.classList.remove('auth-blurred');

  // Load user data & refresh views
  loadState();
  state.selectedDay = null;
  setLogMode('deduct');
  populateCategoryFilter();
  if ($('expense-date-input')) $('expense-date-input').value = defaultLogDate();
  renderAll();

  if (showGreeting) {
    showToast(`Welcome back, ${user.name}! 👋`);
  }
}

function showAuthModal(mode = 'signin') {
  const layout = document.querySelector('.app-layout');
  if (layout) layout.classList.add('auth-blurred');
  if ($('auth-modal')) $('auth-modal').classList.remove('hidden');
  document.body.classList.add('auth-locked');
  switchAuthTab(mode);
}

function switchAuthTab(mode) {
  const isSignIn = mode === 'signin';
  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  if ($('auth-tab-signin')) $('auth-tab-signin').classList.toggle('active', isSignIn);
  if ($('auth-tab-signup')) $('auth-tab-signup').classList.toggle('active', isSignUp);
  if ($('auth-tab-reset')) $('auth-tab-reset').classList.toggle('active', isReset);

  if ($('signin-form')) $('signin-form').classList.toggle('hidden', !isSignIn);
  if ($('signup-form')) $('signup-form').classList.toggle('hidden', !isSignUp);
  if ($('reset-form')) $('reset-form').classList.toggle('hidden', !isReset);

  hideAuthErrors();
  clearAuthInputs();

  if (isSignIn) {
    setTimeout(() => { if ($('signin-email')) $('signin-email').focus(); }, 60);
  } else if (isSignUp) {
    setTimeout(() => { if ($('signup-name')) $('signup-name').focus(); }, 60);
  } else if (isReset) {
    setTimeout(() => { if ($('reset-email')) $('reset-email').focus(); }, 60);
  }
}

function hideAuthErrors() {
  if ($('signin-error-alert')) $('signin-error-alert').classList.add('hidden');
  if ($('signup-error-alert')) $('signup-error-alert').classList.add('hidden');
  if ($('reset-error-alert')) $('reset-error-alert').classList.add('hidden');
  if ($('reset-success-alert')) $('reset-success-alert').classList.add('hidden');
}

function showSignInError(msg) {
  const alert = $('signin-error-alert');
  const text = $('signin-error-msg');
  if (alert && text) {
    text.textContent = msg;
    alert.classList.remove('hidden');
  }
}

function showSignUpError(msg) {
  const alert = $('signup-error-alert');
  const text = $('signup-error-msg');
  if (alert && text) {
    text.textContent = msg;
    alert.classList.remove('hidden');
  }
}

function showResetError(msg) {
  const alert = $('reset-error-alert');
  const text = $('reset-error-msg');
  if (alert && text) {
    text.textContent = msg;
    alert.classList.remove('hidden');
  }
}

function handleSignIn(emailOrUsername, password, remember) {
  hideAuthErrors();
  const ident = (emailOrUsername || '').trim();
  const pwd = (password || '').trim();

  if (!ident) {
    showSignInError('Please enter your email or username.');
    if ($('signin-email')) $('signin-email').focus();
    return;
  }
  if (!pwd) {
    showSignInError('Please enter your password.');
    if ($('signin-password')) $('signin-password').focus();
    return;
  }

  const users = getRegisteredUsers();
  const lowerIdent = ident.toLowerCase();
  const user = users.find(u =>
    (u.email && u.email.toLowerCase() === lowerIdent) ||
    (u.name && u.name.toLowerCase() === lowerIdent) ||
    (u.id === 'user_demo' && lowerIdent === 'demo') ||
    (u.id === 'user_admin' && lowerIdent === 'admin')
  );

  if (!user) {
    showSignInError('No account found with this email or username.');
    if ($('signin-email')) $('signin-email').focus();
    return;
  }

  if (user.password !== pwd) {
    showSignInError('Incorrect password. Please try again.');
    if ($('signin-password')) $('signin-password').focus();
    return;
  }

  clearAuthInputs();
  setActiveSession(user, remember);
  applyUserLogin(user, true);
}

// ========================================================
// EMAIL AUTHENTICATION & SECURITY CODE SERVICE
// ========================================================

function handleSignUpEmailCheck() {
  const email = ($('signup-email') ? $('signup-email').value : '').trim();
  const statusPill = $('signup-email-status-pill');
  if (!email) {
    if (statusPill) statusPill.classList.add('hidden');
    return;
  }
  if (!isValidEmail(email)) {
    if (statusPill) {
      statusPill.classList.remove('hidden');
      statusPill.className = 'status-pill occupied';
      statusPill.textContent = 'Invalid format';
    }
    return;
  }
  const users = getRegisteredUsers();
  const lower = email.toLowerCase();
  const occupied = users.some(u =>
    (u.email && u.email.toLowerCase() === lower) ||
    (u.name && u.name.toLowerCase() === lower) ||
    (u.id === 'user_demo' && lower === 'demo@spendflow.app') ||
    (u.id === 'user_admin' && lower === 'admin@spendflow.app')
  );
  if (statusPill) {
    statusPill.classList.remove('hidden');
    if (occupied) {
      statusPill.className = 'status-pill occupied';
      statusPill.textContent = 'Already in use';
    } else {
      statusPill.className = 'status-pill available';
      statusPill.textContent = 'Available';
    }
  }
}

function handleSignUp(name, emailOrUsername, password, confirmPassword, preloadSample) {
  hideAuthErrors();
  const n = (name || '').trim();
  const ident = (emailOrUsername || '').trim();
  const pwd = (password || '').trim();
  const cpwd = (confirmPassword || '').trim();

  if (!n) {
    showSignUpError('Please enter your full name or nickname.');
    if ($('signup-name')) $('signup-name').focus();
    return;
  }
  if (!ident) {
    showSignUpError('Please enter a valid email address.');
    if ($('signup-email')) $('signup-email').focus();
    return;
  }
  if (!isValidEmail(ident)) {
    showSignUpError('Please enter a valid email address format (e.g. name@gmail.com).');
    if ($('signup-email')) $('signup-email').focus();
    return;
  }

  const users = getRegisteredUsers();
  const lowerIdent = ident.toLowerCase();
  const exists = users.some(u =>
    (u.email && u.email.toLowerCase() === lowerIdent) ||
    (u.name && u.name.toLowerCase() === lowerIdent) ||
    (u.id === 'user_demo' && lowerIdent === 'demo@spendflow.app') ||
    (u.id === 'user_admin' && lowerIdent === 'admin@spendflow.app')
  );

  if (exists) {
    showSignUpError('An account with this email address already exists. Please sign in or reset password.');
    if ($('signup-email')) $('signup-email').focus();
    return;
  }

  if (!pwd || pwd.length < 4) {
    showSignUpError('Password must be at least 4 characters long.');
    if ($('signup-password')) $('signup-password').focus();
    return;
  }
  if (pwd !== cpwd) {
    showSignUpError('Passwords do not match. Please verify.');
    if ($('signup-confirm-password')) $('signup-confirm-password').focus();
    return;
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: n,
    email: lowerIdent,
    password: pwd,
    role: 'member',
    createdAt: Date.now()
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  if (preloadSample) {
    const curY = state.currentDate.getFullYear();
    const curM = state.currentDate.getMonth();
    const makeDate = (monthOffset, day) => toDateKey(new Date(curY, curM + monthOffset, day));
    const sampleEntries = [
      { type: 'add', amount: 3200.00, category: 'Salary', note: 'Direct deposit paycheck', date: makeDate(0, 1) },
      { type: 'deduct', amount: 1350.00, category: 'Housing & Rent', note: 'Monthly rent lease', date: makeDate(0, 1) },
      { type: 'deduct', amount: 120.50, category: 'Food & Dining', note: 'Grocery haul', date: makeDate(0, 3) },
      { type: 'deduct', amount: 65.00, category: 'Utilities & Bills', note: 'Internet fiber bill', date: makeDate(0, 5) },
      { type: 'deduct', amount: 45.00, category: 'Transportation', note: 'Gas fill-up', date: makeDate(0, 8) },
      { type: 'add', amount: 450.00, category: 'Freelance', note: 'Freelance consulting', date: makeDate(0, 12) },
      { type: 'deduct', amount: 84.20, category: 'Entertainment', note: 'Dinner & cinema', date: makeDate(0, 15) },
      { type: 'add', amount: 3200.00, category: 'Salary', note: 'Direct deposit paycheck', date: makeDate(0, 15) },
      { type: 'deduct', amount: 55.00, category: 'Personal Care', note: 'Self-care & hair styling', date: makeDate(0, 19) },
      { type: 'deduct', amount: 72.80, category: 'Food & Dining', note: 'Weekly supermarket', date: makeDate(0, 22) }
    ].map((e, idx) => ({
      id: `sample-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      ...e,
      createdAt: Date.now() - (idx * 3600000)
    }));

    storage.setItem(`spendflow_${newUser.id}_clean_expenses`, JSON.stringify(sampleEntries));
    storage.setItem(`spendflow_${newUser.id}_base_balance`, '3200');
  } else {
    storage.setItem(`spendflow_${newUser.id}_clean_expenses`, JSON.stringify([]));
    storage.setItem(`spendflow_${newUser.id}_base_balance`, '2500');
  }

  clearAuthInputs();
  setActiveSession(newUser, true);
  applyUserLogin(newUser, false);
  showToast(`Account created! Welcome, ${newUser.name} 🎉`);
}

// ========================================================
// EMAIL DISPATCH & CODE VERIFICATION SERVICE (FOR RESET)
// ========================================================

const emailAuthService = {
  verification: null,
  cooldownTimer: null,
  cooldownRemaining: 0,

  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  sendResetCode(email) {
    const trimmed = (email || '').trim().toLowerCase();
    const code = this.generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.verification = {
      email: trimmed,
      code,
      type: 'reset',
      expiresAt,
      verified: false
    };

    showSecurityToast(trimmed, code, 'reset');
    this.startCooldown();
    return code;
  },

  startCooldown() {
    this.cooldownRemaining = 60;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);

    const updateCountdown = () => {
      const countdownEl = $('reset-resend-countdown');
      if (this.cooldownRemaining > 0) {
        if (countdownEl) countdownEl.textContent = `Resend in ${this.cooldownRemaining}s`;
        this.cooldownRemaining--;
      } else {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
        if (countdownEl) countdownEl.textContent = '';
      }
    };

    updateCountdown();
    this.cooldownTimer = setInterval(updateCountdown, 1000);
  },

  verifyResetCode(email, enteredCode) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCode = (enteredCode || '').trim();

    if (!this.verification || this.verification.type !== 'reset' || this.verification.email !== trimmedEmail) {
      return { success: false, message: 'Please request a verification code for this email first.' };
    }

    if (Date.now() > this.verification.expiresAt) {
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    if (this.verification.code !== trimmedCode) {
      return { success: false, message: 'Invalid verification code. Please check your email or alert and try again.' };
    }

    this.verification.verified = true;
    return { success: true, message: '✅ Security code verified! Enter your new password below.' };
  },

  isResetVerified(email) {
    const trimmed = (email || '').trim().toLowerCase();
    return (
      this.verification &&
      this.verification.type === 'reset' &&
      this.verification.email === trimmed &&
      this.verification.verified &&
      Date.now() <= this.verification.expiresAt
    );
  }
};

function showSecurityToast(email, code, type) {
  const toast = $('email-security-toast');
  if (!toast) return;

  if ($('toast-recipient-email')) $('toast-recipient-email').textContent = email;
  if ($('toast-display-code')) $('toast-display-code').textContent = code;
  if ($('toast-expiry-countdown')) $('toast-expiry-countdown').textContent = 'Valid for 10:00';

  toast.classList.remove('hidden');

  const autofillBtn = $('toast-autofill-btn');
  if (autofillBtn) {
    autofillBtn.onclick = () => {
      if ($('reset-code-input')) {
        $('reset-code-input').value = code;
        $('reset-code-input').focus();
        handleVerifyResetCode();
      }
      showToast('Security code auto-filled! ⚡');
    };
  }
}

function hideSecurityToast() {
  const toast = $('email-security-toast');
  if (toast) toast.classList.add('hidden');
}

function handleResetSendCode() {
  hideAuthErrors();
  const email = ($('reset-email') ? $('reset-email').value : '').trim();
  if (!email) {
    showResetError('Please enter your registered email address.');
    if ($('reset-email')) $('reset-email').focus();
    return;
  }
  if (!isValidEmail(email)) {
    showResetError('Please enter a valid email address format (e.g. name@gmail.com).');
    if ($('reset-email')) $('reset-email').focus();
    return;
  }

  const users = getRegisteredUsers();
  const lowerEmail = email.toLowerCase();
  const user = users.find(u =>
    (u.email && u.email.toLowerCase() === lowerEmail) ||
    (u.name && u.name.toLowerCase() === lowerEmail) ||
    (u.id === 'user_demo' && lowerEmail === 'demo@spendflow.app') ||
    (u.id === 'user_admin' && lowerEmail === 'admin@spendflow.app')
  );

  if (!user) {
    showResetError('No account found with this email address. Please check your spelling or create an account.');
    if ($('reset-email')) $('reset-email').focus();
    return;
  }

  // Reveal Step 2 and send security code to that specific email
  if ($('reset-step-1')) $('reset-step-1').classList.add('hidden');
  if ($('reset-step-2')) $('reset-step-2').classList.remove('hidden');
  if ($('reset-sent-email-display')) $('reset-sent-email-display').textContent = email;

  emailAuthService.sendResetCode(email);
  if ($('reset-code-input')) $('reset-code-input').focus();
}

function handleVerifyResetCode() {
  const email = ($('reset-email') ? $('reset-email').value : '').trim();
  const code = ($('reset-code-input') ? $('reset-code-input').value : '').trim();
  const statusMsg = $('reset-code-status');

  if (!code) {
    if (statusMsg) {
      statusMsg.className = 'code-status-msg error';
      statusMsg.textContent = 'Please enter the 6-digit security code.';
    }
    return false;
  }

  const res = emailAuthService.verifyResetCode(email, code);
  if (statusMsg) {
    statusMsg.className = `code-status-msg ${res.success ? 'success' : 'error'}`;
    statusMsg.textContent = res.message;
  }
  return res.success;
}

function handleResetPassword(emailOrUsername, newPassword, confirmPassword) {
  hideAuthErrors();
  const ident = (emailOrUsername || '').trim();
  const pwd = (newPassword || '').trim();
  const cpwd = (confirmPassword || '').trim();

  if (!ident) {
    showResetError('Please enter your registered email address.');
    if ($('reset-email')) $('reset-email').focus();
    return;
  }

  // Security check: Must verify code sent to this email address
  if (!emailAuthService.isResetVerified(ident)) {
    const codeEntered = ($('reset-code-input') ? $('reset-code-input').value : '').trim();
    if (!codeEntered) {
      showResetError('Security code required: Enter the 6-digit code sent to your email.');
      if ($('reset-code-input')) $('reset-code-input').focus();
      return;
    }
    const verified = handleVerifyResetCode();
    if (!verified) {
      showResetError('Invalid security verification code. Please check your email and try again.');
      if ($('reset-code-input')) $('reset-code-input').focus();
      return;
    }
  }

  if (!pwd || pwd.length < 4) {
    showResetError('New password must be at least 4 characters long.');
    if ($('reset-new-password')) $('reset-new-password').focus();
    return;
  }
  if (pwd !== cpwd) {
    showResetError('Passwords do not match. Please verify.');
    if ($('reset-confirm-password')) $('reset-confirm-password').focus();
    return;
  }

  const users = getRegisteredUsers();
  const lowerIdent = ident.toLowerCase();
  const user = users.find(u =>
    (u.email && u.email.toLowerCase() === lowerIdent) ||
    (u.name && u.name.toLowerCase() === lowerIdent) ||
    (u.id === 'user_demo' && lowerIdent === 'demo@spendflow.app') ||
    (u.id === 'user_admin' && lowerIdent === 'admin@spendflow.app')
  );

  if (!user) {
    showResetError('No account found with this email.');
    if ($('reset-email')) $('reset-email').focus();
    return;
  }

  user.password = pwd;
  saveRegisteredUsers(users);

  if ($('reset-success-alert')) $('reset-success-alert').classList.remove('hidden');
  hideSecurityToast();

  setTimeout(() => {
    clearAuthInputs();
    showToast(`Password updated! Logging you in as ${user.name}... 🔑`);
    setActiveSession(user, true);
    applyUserLogin(user, true);
  }, 750);
}

function handleSignOut() {
  clearActiveSession();
  state.currentUser = null;
  state.entries = [];
  state.baseBalance = 0;
  clearAuthInputs();
  closeUserDropdown();
  renderAll(); // Clears all background DOM elements & tables so previous user data is completely erased
  showAuthModal('signin');
  showToast('Signed out successfully. 👋');
}

function handleDeleteMyAccount() {
  if (!state.currentUser) return;
  const curUser = state.currentUser;
  if (curUser.id === 'user_admin') {
    showToast('The primary Admin account cannot be deleted.');
    return;
  }
  const confirmed = window.confirm(
    `Are you sure you want to permanently delete account "${curUser.name}" (${curUser.email})?\n\nThis will permanently erase your login and all recorded transactions from this browser.`
  );
  if (!confirmed) return;

  const users = getRegisteredUsers().filter(u => u.id !== curUser.id);
  saveRegisteredUsers(users);

  // Purge scoped data
  storage.removeItem(`spendflow_${curUser.id}_clean_expenses`);
  storage.removeItem(`spendflow_${curUser.id}_base_balance`);
  storage.removeItem(`spendflow_${curUser.id}_expense_categories`);
  storage.removeItem(`spendflow_${curUser.id}_income_categories`);

  clearActiveSession();
  state.currentUser = null;
  state.entries = [];
  state.baseBalance = 0;
  clearAuthInputs();
  closeUserDropdown();
  renderAll();
  showAuthModal('signin');
  showToast('Account permanently deleted. 🧹');
}

function toggleUserDropdown() {
  const menu = $('user-dropdown-menu');
  const btn = $('user-profile-btn');
  if (!menu || !btn) return;
  const isHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !isHidden);
  btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
}

function closeUserDropdown() {
  const menu = $('user-dropdown-menu');
  const btn = $('user-profile-btn');
  if (menu) menu.classList.add('hidden');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function setupPasswordToggle(btnId, inputId) {
  const btn = $(btnId);
  const input = $(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    const showIcon = btn.querySelector('.eye-show');
    const hideIcon = btn.querySelector('.eye-hide');
    if (showIcon) showIcon.classList.toggle('hidden', isPw);
    if (hideIcon) hideIcon.classList.toggle('hidden', !isPw);
  });
}

function loadState() {
  const entriesKey = getUserStorageKey('clean_expenses');
  const baseKey = getUserStorageKey('base_balance');
  const expCatsKey = getUserStorageKey('expense_categories');
  const incCatsKey = getUserStorageKey('income_categories');

  try {
    const stored = JSON.parse(storage.getItem(entriesKey) || '[]');
    state.entries = Array.isArray(stored) ? stored.map(e => ({
      ...e,
      type: e.type === 'add' ? 'add' : 'deduct',
      amount: parseFloat(e.amount) || 0,
      note: e.note || ''
    })) : [];
  } catch (e) {
    state.entries = [];
  }

  const base = parseFloat(storage.getItem(baseKey));
  state.baseBalance = isNaN(base) ? 2500 : base;

  // Load custom expense categories
  try {
    const exp = JSON.parse(storage.getItem(expCatsKey));
    if (exp && typeof exp === 'object' && Object.keys(exp).length > 0) {
      state.expenseCategories = exp;
    } else {
      state.expenseCategories = { ...DEFAULT_EXPENSE_CATEGORIES };
    }
  } catch (e) {
    state.expenseCategories = { ...DEFAULT_EXPENSE_CATEGORIES };
  }

  // Load custom income categories
  try {
    const inc = JSON.parse(storage.getItem(incCatsKey));
    if (inc && typeof inc === 'object' && Object.keys(inc).length > 0) {
      state.incomeCategories = inc;
    } else {
      state.incomeCategories = { ...DEFAULT_INCOME_CATEGORIES };
    }
  } catch (e) {
    state.incomeCategories = { ...DEFAULT_INCOME_CATEGORIES };
  }
}

function saveEntries() {
  storage.setItem(getUserStorageKey('clean_expenses'), JSON.stringify(state.entries));
}

function saveBase() {
  storage.setItem(getUserStorageKey('base_balance'), String(state.baseBalance));
}

function saveCategories() {
  storage.setItem(getUserStorageKey('expense_categories'), JSON.stringify(state.expenseCategories));
  storage.setItem(getUserStorageKey('income_categories'), JSON.stringify(state.incomeCategories));
}

// ---------- Helpers ----------
function pad(n) { return String(n).padStart(2, '0'); }

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatSigned(amount) {
  return (amount >= 0 ? '+' : '-') + formatCurrency(Math.abs(amount));
}

function formatLongDate(key) {
  return parseDateKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function sumAmounts(list) {
  return list.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
}

// Entries for the visible month
function getMonthEntries() {
  const key = getMonthKey(state.currentDate);
  return state.entries.filter(e => e.date && e.date.startsWith(key));
}

// Entries for current view (selected day, or whole month)
function getViewEntries() {
  if (state.selectedDay) return state.entries.filter(e => e.date === state.selectedDay);
  return getMonthEntries();
}

// ========================================================
// RENDERING
// ========================================================

function renderAll() {
  renderHeader();
  renderCalendar();
  renderKPIs();
  renderWeekdayChart();
  renderCategoryChart();
  renderTrend();
  renderMOMAndYTD();
  renderRecords();
}

function renderHeader() {
  const monthName = state.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('current-month-label').textContent = monthName;
  const viewLabel = state.selectedDay ? formatLongDate(state.selectedDay) : monthName;
  $('records-subtitle').textContent = `Showing records for ${viewLabel}`;
  $('category-chart-subtitle').textContent = `Expense distribution for ${viewLabel}`;
  $('calendar-selected-label').textContent = state.selectedDay
    ? `Selected: ${formatLongDate(state.selectedDay)} • Click again to show the whole month`
    : 'Showing all days • Click any day to inspect or log for that day';
}

// ---------- Monthly calendar with individual days ----------
function renderCalendar() {
  const grid = $('calendar-grid');
  grid.innerHTML = '';
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  // Totals per day
  const perDay = {};
  getMonthEntries().forEach(e => {
    if (!perDay[e.date]) perDay[e.date] = { add: 0, deduct: 0 };
    perDay[e.date][e.type] += parseFloat(e.amount) || 0;
  });

  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month + 1)}-${pad(d)}`;
    const totals = perDay[key];
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-cell';
    cell.id = `cal-day-${key}`;
    if (key === todayKey) cell.classList.add('today');
    if (key === state.selectedDay) cell.classList.add('selected');

    let badges = '';
    if (totals && totals.add > 0) badges += `<span class="cell-badge add">+${formatCurrency(totals.add)}</span>`;
    if (totals && totals.deduct > 0) badges += `<span class="cell-badge deduct">-${formatCurrency(totals.deduct)}</span>`;

    cell.innerHTML = `
      <div class="cell-header-row"><span class="cell-day-num">${d}</span></div>
      <div class="cell-badges">${badges}</div>
    `;
    cell.title = totals
      ? `${formatLongDate(key)}\nIncome: ${formatCurrency(totals.add)}\nExpenses: ${formatCurrency(totals.deduct)}`
      : formatLongDate(key);
    cell.addEventListener('click', () => selectDay(key));
    grid.appendChild(cell);
  }
}

// ---------- KPIs: income, expenses, net savings, savings rate, balance ----------
function renderKPIs() {
  const view = getViewEntries();
  const incomes = view.filter(e => e.type === 'add');
  const expenses = view.filter(e => e.type === 'deduct');
  const totalIncome = sumAmounts(incomes);
  const totalExpenses = sumAmounts(expenses);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const periodLabel = state.selectedDay ? 'this day' : 'this month';

  // Income
  $('kpi-total-income').textContent = `+${formatCurrency(totalIncome)}`;
  $('income-count-badge').textContent = `${incomes.length} ${incomes.length === 1 ? 'addition' : 'additions'}`;
  const biggestIncome = incomes.reduce((max, e) => (e.amount > (max ? max.amount : 0) ? e : max), null);
  $('kpi-income-subtext').textContent = biggestIncome
    ? `Top source: ${biggestIncome.category} (${formatCurrency(biggestIncome.amount)})`
    : `No income logged ${periodLabel}`;

  // Expenses
  $('kpi-total-expenses').textContent = `-${formatCurrency(totalExpenses)}`;
  $('expense-count-badge').textContent = `${expenses.length} ${expenses.length === 1 ? 'deduction' : 'deductions'}`;
  if (state.selectedDay) {
    $('kpi-expenses-subtext').textContent = `Spent on ${parseDateKey(state.selectedDay).toLocaleDateString('en-US', { weekday: 'long' })}`;
  } else {
    const y = state.currentDate.getFullYear(), m = state.currentDate.getMonth();
    const now = new Date();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const isCurrent = now.getFullYear() === y && now.getMonth() === m;
    const daysElapsed = isCurrent ? now.getDate() : daysInMonth;
    $('kpi-expenses-subtext').textContent = `Daily spend: ${formatCurrency(totalExpenses / daysElapsed)} / day`;
  }

  // Net savings & savings rate
  const savingsEl = $('kpi-net-savings');
  savingsEl.textContent = formatSigned(netSavings);
  savingsEl.className = 'kpi-value ' + (netSavings >= 0 ? 'text-safe' : 'text-danger');
  const rateBadge = $('savings-rate-badge');
  if (totalIncome <= 0) {
    rateBadge.className = 'kpi-badge badge-neutral';
    rateBadge.textContent = '— Rate';
    $('kpi-savings-subtext').textContent = 'Add income to see your savings rate';
  } else {
    rateBadge.className = 'kpi-badge ' + (savingsRate >= 20 ? 'badge-safe' : savingsRate >= 0 ? 'badge-warning' : 'badge-danger');
    rateBadge.textContent = `${savingsRate.toFixed(1)}% Rate`;
    $('kpi-savings-subtext').textContent = netSavings >= 0
      ? `Saving ${savingsRate.toFixed(1)}% of income ${periodLabel}`
      : `Overspent income by ${formatCurrency(Math.abs(netSavings))}`;
  }

  // Current balance = starting balance + all income - all expenses (all time)
  const allIncome = sumAmounts(state.entries.filter(e => e.type === 'add'));
  const allExpenses = sumAmounts(state.entries.filter(e => e.type === 'deduct'));
  const balance = state.baseBalance + allIncome - allExpenses;
  const balEl = $('kpi-total-balance');
  balEl.textContent = formatCurrency(balance);
  balEl.className = 'kpi-value ' + (balance < 0 ? 'text-danger' : '');
  const statusBadge = $('balance-status-badge');
  statusBadge.className = 'kpi-badge ' + (balance < 0 ? 'badge-danger' : 'badge-safe');
  statusBadge.textContent = balance < 0 ? 'Overdrawn' : 'Healthy';
  $('kpi-balance-subtext').textContent = `Starting: ${formatCurrency(state.baseBalance)} • All-time net: ${formatSigned(allIncome - allExpenses)}`;
}

// ---------- Day-of-week chart (Sun–Sat) for the month ----------
function renderWeekdayChart() {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totals = names.map(() => ({ add: 0, deduct: 0 }));
  getMonthEntries().forEach(e => {
    totals[parseDateKey(e.date).getDay()][e.type] += parseFloat(e.amount) || 0;
  });
  const max = Math.max(1, ...totals.map(t => Math.max(t.add, t.deduct)));
  const selectedWeekday = state.selectedDay ? parseDateKey(state.selectedDay).getDay() : -1;

  const chart = $('week-bars-chart');
  chart.innerHTML = '';
  totals.forEach((t, i) => {
    const col = document.createElement('div');
    col.className = 'week-chart-col' + (i === selectedWeekday ? ' active' : '');
    col.title = `${names[i]} — Income: ${formatCurrency(t.add)} • Expenses: ${formatCurrency(t.deduct)}`;
    col.innerHTML = `
      <div class="week-bars-pair">
        <div class="chart-bar bar-add" style="height:${(t.add / max) * 100}%"></div>
        <div class="chart-bar bar-deduct" style="height:${(t.deduct / max) * 100}%"></div>
      </div>
      <span class="chart-col-label">${names[i]}</span>
      <span class="chart-col-date">${formatSigned(t.add - t.deduct).replace('.00', '')}</span>
    `;
    chart.appendChild(col);
  });
  $('week-active-day-badge').textContent = selectedWeekday >= 0 ? names[selectedWeekday] : 'All Days';
}

// ---------- Category donut (expenses) ----------
function renderCategoryChart() {
  const expenses = getViewEntries().filter(e => e.type === 'deduct');
  const total = sumAmounts(expenses);
  const map = {};
  expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + (parseFloat(e.amount) || 0); });
  const cats = Object.keys(map).map(name => ({ name, amount: map[name], percent: total > 0 ? (map[name] / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  $('category-count-badge').textContent = `${cats.length} ${cats.length === 1 ? 'category' : 'categories'}`;
  $('chart-center-label').textContent = 'Spent';
  $('chart-center-amount').textContent = formatCurrency(total);

  const segs = $('donut-segments');
  segs.innerHTML = '';
  const circumference = 2 * Math.PI * 75;
  let offset = 0;
  cats.forEach(c => {
    const cfg = getCategoryConfig(c.name, 'deduct');
    const len = (c.percent / 100) * circumference;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'donut-segment');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', '75');
    circle.setAttribute('stroke', cfg.color);
    circle.setAttribute('stroke-dasharray', `${len} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${c.name}: ${formatCurrency(c.amount)} (${Math.round(c.percent)}%)`;
    circle.appendChild(title);
    segs.appendChild(circle);
    offset += len;
  });

  const list = $('category-progress-list');
  if (cats.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:1.5rem 0;font-size:0.85rem;">No expenses logged for this view yet.</div>';
    return;
  }
  list.innerHTML = cats.map(c => {
    const cfg = getCategoryConfig(c.name, 'deduct');
    return `
      <div class="cat-item-row">
        <div class="cat-item-info">
          <span class="cat-name-tag"><span class="cat-dot" style="background-color:${cfg.color};"></span><span>${cfg.icon} ${escapeHTML(c.name)}</span></span>
          <span class="cat-amount-info"><span class="cat-val">${formatCurrency(c.amount)}</span><span class="cat-pct">${Math.round(c.percent)}%</span></span>
        </div>
        <div class="cat-track"><div class="cat-fill" style="width:${Math.min(100, c.percent)}%;background-color:${cfg.color};"></div></div>
      </div>`;
  }).join('');
}

// ---------- Spending trend (daily or weekly) ----------
function getTrendBuckets() {
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = new Date(y, m, 1).getDay();
  const monthShort = state.currentDate.toLocaleDateString('en-US', { month: 'short' });

  // Expenses per day of month
  const perDay = new Array(daysInMonth).fill(0);
  getMonthEntries().forEach(e => {
    if (e.type === 'deduct') perDay[parseDateKey(e.date).getDate() - 1] += parseFloat(e.amount) || 0;
  });

  // How far into the month we are (future days don't count toward averages)
  const now = new Date();
  const monthStart = new Date(y, m, 1);
  let elapsedDays = daysInMonth;
  if (getMonthKey(now) === getMonthKey(state.currentDate)) elapsedDays = now.getDate();
  else if (monthStart > now) elapsedDays = 0;

  if (state.trendMode === 'daily') {
    return {
      elapsed: elapsedDays,
      buckets: perDay.map((value, i) => {
        const key = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
        const d = i + 1;
        const showLabel = d === 1 || d % 5 === 0 || d === daysInMonth;
        return { value, key, label: showLabel ? String(d) : '', title: formatLongDate(key) };
      })
    };
  }

  // Weekly: calendar weeks (Sun–Sat) inside this month
  const buckets = [];
  perDay.forEach((value, i) => {
    const w = Math.floor((i + firstWeekday) / 7);
    if (!buckets[w]) buckets[w] = { value: 0, start: i + 1, end: i + 1 };
    buckets[w].value += value;
    buckets[w].end = i + 1;
  });
  const elapsedWeeks = elapsedDays === 0 ? 0 : Math.floor((elapsedDays - 1 + firstWeekday) / 7) + 1;
  return {
    elapsed: elapsedWeeks,
    buckets: buckets.map((b, i) => {
      const range = b.start === b.end ? `${monthShort} ${b.start}` : `${monthShort} ${b.start}–${b.end}`;
      return { value: b.value, label: `Wk ${i + 1}`, title: `Week ${i + 1} (${range})` };
    })
  };
}

function renderTrend() {
  const isDaily = state.trendMode === 'daily';
  const { buckets, elapsed } = getTrendBuckets();
  const unit = isDaily ? 'day' : 'week';
  const monthName = state.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('trend-subtitle').textContent = `${isDaily ? 'Daily' : 'Weekly'} spending in ${monthName}`;

  // Stats
  const counted = buckets.slice(0, Math.max(elapsed, 0));
  const total = counted.reduce((a, b) => a + b.value, 0);
  const avg = counted.length ? total / counted.length : 0;
  const maxBucket = buckets.reduce((best, b) => (b.value > (best ? best.value : 0) ? b : best), null);
  $('trend-avg').textContent = `${formatCurrency(avg)} / ${unit}`;
  $('trend-max').textContent = maxBucket ? `${formatCurrency(maxBucket.value)} • ${maxBucket.title.replace(/, \d{4}$/, '')}` : '$0.00';

  // Trend: last 7 days vs previous 7 days, or this week vs last week
  const changeEl = $('trend-change');
  let current = 0, previous = 0, label = '';
  if (isDaily) {
    const end = elapsed;
    current = buckets.slice(Math.max(0, end - 7), end).reduce((a, b) => a + b.value, 0);
    previous = buckets.slice(Math.max(0, end - 14), Math.max(0, end - 7)).reduce((a, b) => a + b.value, 0);
    label = 'last 7 days vs prior 7';
  } else {
    current = elapsed >= 1 ? buckets[elapsed - 1].value : 0;
    previous = elapsed >= 2 ? buckets[elapsed - 2].value : 0;
    label = 'vs previous week';
  }
  if (previous > 0) {
    const pct = ((current - previous) / previous) * 100;
    const up = pct > 0;
    changeEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}% ${label}`;
    changeEl.style.color = up ? 'var(--accent-danger)' : 'var(--accent-safe)';
  } else {
    changeEl.textContent = current > 0 ? `New spending ${label}` : 'Not enough data yet';
    changeEl.style.color = 'var(--text-muted)';
  }
  changeEl.style.fontSize = '0.9rem';

  // Chart geometry (viewBox 800 x 220)
  const W = 800, H = 220, top = 10, bottom = 4;
  const n = buckets.length;
  const slot = W / n;
  const barW = Math.max(4, slot * (isDaily ? 0.6 : 0.5));
  const max = Math.max(1, ...buckets.map(b => b.value), avg);
  const yOf = v => H - bottom - (v / max) * (H - top - bottom);

  let svg = `<defs><linearGradient id="trendBarGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fb7185" stop-opacity="0.9"/><stop offset="100%" stop-color="#f43f5e" stop-opacity="0.35"/></linearGradient></defs>`;
  [0.25, 0.5, 0.75].forEach(f => {
    const gy = top + (H - top - bottom) * f;
    svg += `<line class="trend-grid-line" x1="0" x2="${W}" y1="${gy}" y2="${gy}"/>`;
  });

  const points = [];
  buckets.forEach((b, i) => {
    const cx = slot * i + slot / 2;
    const y = yOf(b.value);
    const selected = isDaily && b.key === state.selectedDay;
    if (b.value > 0) {
      svg += `<rect class="trend-bar" x="${cx - barW / 2}" y="${y}" width="${barW}" height="${H - bottom - y}" rx="3" ${selected ? 'style="fill:#818cf8"' : ''}/>`;
    }
    if (i < Math.max(elapsed, 0)) points.push(`${cx},${y}`);
    svg += `<rect class="trend-hit" data-i="${i}" x="${slot * i}" y="0" width="${slot}" height="${H}"/>`;
  });
  if (points.length > 1) svg += `<polyline class="trend-line" points="${points.join(' ')}"/>`;
  if (avg > 0) svg += `<line class="trend-avg-line" x1="0" x2="${W}" y1="${yOf(avg)}" y2="${yOf(avg)}"><title>Average ${formatCurrency(avg)} / ${unit}</title></line>`;

  const svgEl = $('trend-svg');
  svgEl.innerHTML = svg;
  $('trend-labels').innerHTML = buckets.map(b => `<span>${b.label}</span>`).join('');

  // Tooltip + click-to-select day
  const tip = $('trend-tooltip');
  svgEl.querySelectorAll('.trend-hit').forEach(hit => {
    const b = buckets[Number(hit.dataset.i)];
    const leftPct = ((Number(hit.dataset.i) + 0.5) / n) * 100;
    hit.addEventListener('mouseenter', () => {
      tip.innerHTML = `<strong>${b.title}</strong><br>Spent ${formatCurrency(b.value)}`;
      tip.style.left = `${Math.min(90, Math.max(10, leftPct))}%`;
      tip.classList.remove('hidden');
    });
    hit.addEventListener('mouseleave', () => tip.classList.add('hidden'));
    if (isDaily) hit.addEventListener('click', () => selectDay(b.key));
  });
}

function setTrendMode(mode) {
  state.trendMode = mode;
  $('trend-daily-btn').classList.toggle('active', mode === 'daily');
  $('trend-weekly-btn').classList.toggle('active', mode === 'weekly');
  renderTrend();
}

// ========================================================
// MONTH-OVER-MONTH HISTORY & YEAR-TO-DATE TOTALS
// ========================================================

function renderMOMAndYTD() {
  const currentYear = state.currentDate.getFullYear();
  $('ytd-year-badge').textContent = `${currentYear} YTD`;
  $('mom-subtitle').textContent = `Performance across ${currentYear}`;

  // Filter entries for the current viewing year
  const ytdEntries = state.entries.filter(e => {
    if (!e.date) return false;
    const [y] = e.date.split('-').map(Number);
    return y === currentYear;
  });

  // Calculate monthly aggregates for all 12 months
  const monthlyData = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let ytdIncomeTotal = 0;
  let ytdExpenseTotal = 0;
  let activeMonthCount = 0;

  for (let m = 0; m < 12; m++) {
    const monthKey = `${currentYear}-${pad(m + 1)}`;
    const monthEntries = ytdEntries.filter(e => e.date.startsWith(monthKey));
    const income = sumAmounts(monthEntries.filter(e => e.type === 'add'));
    const expenses = sumAmounts(monthEntries.filter(e => e.type === 'deduct'));
    const net = income - expenses;
    const rate = income > 0 ? (net / income) * 100 : (net < 0 ? -100 : 0);

    const hasData = monthEntries.length > 0;
    if (hasData) {
      activeMonthCount++;
      ytdIncomeTotal += income;
      ytdExpenseTotal += expenses;
    }

    monthlyData.push({
      monthIndex: m,
      monthKey,
      name: monthNames[m],
      income,
      expenses,
      net,
      rate,
      hasData
    });
  }

  // YTD Stats Cards
  const ytdNetSavings = ytdIncomeTotal - ytdExpenseTotal;
  const ytdSavingsRate = ytdIncomeTotal > 0 ? (ytdNetSavings / ytdIncomeTotal) * 100 : 0;
  const monthlyAvgExpense = activeMonthCount > 0 ? ytdExpenseTotal / activeMonthCount : 0;

  $('ytd-income').textContent = `+${formatCurrency(ytdIncomeTotal)}`;
  $('ytd-income-sub').textContent = `Across ${activeMonthCount} active ${activeMonthCount === 1 ? 'month' : 'months'}`;

  $('ytd-expenses').textContent = `-${formatCurrency(ytdExpenseTotal)}`;
  $('ytd-expenses-sub').textContent = `Monthly avg: ${formatCurrency(monthlyAvgExpense)}`;

  const ytdNetEl = $('ytd-net-savings');
  ytdNetEl.textContent = formatSigned(ytdNetSavings);
  ytdNetEl.className = 'ytd-stat-value ' + (ytdNetSavings >= 0 ? 'text-safe' : 'text-danger');
  $('ytd-savings-rate').textContent = ytdIncomeTotal > 0 
    ? `${ytdSavingsRate.toFixed(1)}% YTD savings rate` 
    : 'No income logged in YTD';

  // Current Month vs Previous Month Comparison
  const currentMonthIdx = state.currentDate.getMonth();
  const currentMonthData = monthlyData[currentMonthIdx];
  const prevMonthData = currentMonthIdx > 0 ? monthlyData[currentMonthIdx - 1] : null;

  const momDiffEl = $('mom-expense-diff');
  const momSubEl = $('mom-comparison-sub');

  if (prevMonthData && (prevMonthData.expenses > 0 || currentMonthData.expenses > 0)) {
    const diff = currentMonthData.expenses - prevMonthData.expenses;
    const diffPct = prevMonthData.expenses > 0 ? (diff / prevMonthData.expenses) * 100 : 100;
    const diffSigned = formatSigned(diff);

    if (diff > 0) {
      momDiffEl.textContent = `▲ +${Math.abs(diffPct).toFixed(1)}%`;
      momDiffEl.className = 'ytd-stat-value text-danger';
      momSubEl.textContent = `Spent ${diffSigned} more than ${prevMonthData.name}`;
    } else if (diff < 0) {
      momDiffEl.textContent = `▼ -${Math.abs(diffPct).toFixed(1)}%`;
      momDiffEl.className = 'ytd-stat-value text-safe';
      momSubEl.textContent = `Spent ${formatCurrency(Math.abs(diff))} less than ${prevMonthData.name}`;
    } else {
      momDiffEl.textContent = `0.0%`;
      momDiffEl.className = 'ytd-stat-value';
      momSubEl.textContent = `Identical spending to ${prevMonthData.name}`;
    }
  } else {
    momDiffEl.textContent = '—';
    momDiffEl.className = 'ytd-stat-value';
    momSubEl.textContent = currentMonthIdx === 0 ? 'First month of year' : 'No prior month data';
  }

  // Render Month-over-Month History Table
  const tbody = $('mom-history-tbody');
  tbody.innerHTML = '';

  monthlyData.forEach((m, idx) => {
    // Only show months that have data OR are up to the current calendar month
    const now = new Date();
    const isCurrentYear = now.getFullYear() === currentYear;
    const isPastOrCurrent = !isCurrentYear || idx <= now.getMonth();

    if (!m.hasData && !isPastOrCurrent) return;

    const tr = document.createElement('tr');
    const isCurrentActive = idx === state.currentDate.getMonth();
    if (isCurrentActive) tr.className = 'current-month-row';

    // Calculate MoM spending change compared to the month before it
    let momChangeHtml = '<span class="mom-badge-even">—</span>';
    if (idx > 0) {
      const prevM = monthlyData[idx - 1];
      if (prevM.expenses > 0 || m.expenses > 0) {
        const delta = m.expenses - prevM.expenses;
        if (delta > 0) {
          momChangeHtml = `<span class="mom-badge-up">▲ +${formatCurrency(delta)}</span>`;
        } else if (delta < 0) {
          momChangeHtml = `<span class="mom-badge-down">▼ -${formatCurrency(Math.abs(delta))}</span>`;
        } else {
          momChangeHtml = `<span class="mom-badge-even">0.00</span>`;
        }
      }
    }

    const netClass = m.net >= 0 ? 'text-safe' : 'text-danger';
    const rateText = m.income > 0 ? `${m.rate.toFixed(1)}%` : '—';

    tr.innerHTML = `
      <td><strong>${m.name}</strong>${isCurrentActive ? ' <span style="font-size:0.7rem;color:var(--accent-primary);">(Active)</span>' : ''}</td>
      <td style="color:var(--accent-safe);">+${formatCurrency(m.income)}</td>
      <td style="color:var(--accent-danger);">-${formatCurrency(m.expenses)}</td>
      <td class="${netClass}">${formatSigned(m.net)}</td>
      <td>${rateText}</td>
      <td>${momChangeHtml}</td>
      <td>
        <button type="button" class="pill-btn secondary-pill jump-month-btn" data-month="${idx}">
          View
        </button>
      </td>
    `;

    tr.querySelector('.jump-month-btn').addEventListener('click', () => {
      state.currentDate = new Date(currentYear, idx, 1);
      state.selectedDay = null;
      if ($('editing-expense-id').value) cancelEdit();
      $('expense-date-input').value = defaultLogDate();
      renderAll();
      $('calendar-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    tbody.appendChild(tr);
  });
}

// ---------- Records list grouped by individual day ----------
function renderRecords() {
  let list = [...getViewEntries()];
  if (state.filterType !== 'ALL') list = list.filter(e => e.type === state.filterType);
  if (state.filterCategory !== 'ALL') list = list.filter(e => e.category === state.filterCategory);
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  const container = $('expenses-container');
  container.innerHTML = '';
  if (list.length === 0) {
    $('empty-state-card').classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }
  $('empty-state-card').classList.add('hidden');
  container.classList.remove('hidden');

  const groups = {};
  list.forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dateKey => {
    const items = groups[dateKey];
    const net = sumAmounts(items.filter(e => e.type === 'add')) - sumAmounts(items.filter(e => e.type === 'deduct'));
    const header = document.createElement('div');
    header.className = 'day-group-header';
    header.innerHTML = `
      <span class="day-group-title">📅 ${formatLongDate(dateKey)}</span>
      <span class="day-group-total" style="color:${net >= 0 ? 'var(--accent-safe)' : 'var(--accent-danger)'}">Net ${formatSigned(net)}</span>`;
    container.appendChild(header);
    items.forEach(item => container.appendChild(buildRecordCard(item)));
  });
}

function buildRecordCard(item) {
  const isAdd = item.type === 'add';
  const cfg = getCategoryConfig(item.category, item.type);
  const card = document.createElement('div');
  card.className = 'expense-card';
  card.innerHTML = `
    <div class="expense-left">
      <div class="expense-icon-badge" style="background:${cfg.color}26;color:${cfg.color};">${cfg.icon}</div>
      <div>
        <div class="expense-title">${escapeHTML(item.category)}${item.note ? ` <span style="color:var(--text-dim);font-weight:500;">— ${escapeHTML(item.note)}</span>` : ''}</div>
        <div class="expense-meta"><span>${isAdd ? 'Income • Added to balance' : 'Expense • Deducted from balance'}</span></div>
      </div>
    </div>
    <div class="expense-right">
      <span class="expense-amount ${isAdd ? 'add' : 'deduct'}">${isAdd ? '+' : '-'}${formatCurrency(item.amount)}</span>
      <div class="action-btns">
        <button type="button" class="action-icon-btn edit-btn" title="Edit" aria-label="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg><span>Edit</span>
        </button>
        <button type="button" class="action-icon-btn delete-btn" title="Delete" aria-label="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span class="delete-btn-text"></span>
        </button>
      </div>
    </div>`;

  card.querySelector('.edit-btn').addEventListener('click', () => startEdit(item.id));

  // Two-step delete
  const delBtn = card.querySelector('.delete-btn');
  const delText = card.querySelector('.delete-btn-text');
  let timer = null;
  delBtn.addEventListener('click', () => {
    if (delBtn.classList.contains('confirm-delete')) {
      clearTimeout(timer);
      deleteEntry(item.id);
    } else {
      delBtn.classList.add('confirm-delete');
      delText.textContent = 'Delete?';
      timer = setTimeout(() => { delBtn.classList.remove('confirm-delete'); delText.textContent = ''; }, 3500);
    }
  });
  return card;
}

// ========================================================
// CATEGORY MANAGEMENT (ADD, RENAME, CUSTOMIZE, DELETE)
// ========================================================

const EXPENSE_EMOJI_SUGGESTIONS = [
  '🍔', '🏠', '⚡', '🚗', '🛍️', '🎬', '💊', '📚', '✨', '📦',
  '✈️', '🐾', '☕', '🎮', '🏋️', '🧾', '👶', '🍷', '🛠️', '💡',
  '🍕', '🩺', '🛒', '⛽'
];

const INCOME_EMOJI_SUGGESTIONS = [
  '💼', '💻', '🏪', '📈', '🎁', '↩️', '💰', '🏦',
  '🪙', '💵', '🏆', '🏷️', '🎉', '🤝', '💎', '💳'
];

const QUICK_COLOR_PALETTE = [
  '#f59e0b', '#8b5cf6', '#0ea5e9', '#10b981', '#ec4899', '#a855f7',
  '#ef4444', '#06b6d4', '#6366f1', '#14b8a6', '#84cc16', '#64748b'
];

function openCategoryModal(tab) {
  if (tab) {
    state.catModalTab = tab;
  } else {
    state.catModalTab = state.logMode === 'add' ? 'income' : 'expense';
  }
  resetCategoryForm();
  renderCategoryModal();
  $('category-modal').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeCategoryModal() {
  $('category-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  resetCategoryForm();
}

function switchCategoryTab(tab) {
  state.catModalTab = tab;
  resetCategoryForm();
  renderCategoryModal();
}

function renderCategoryModal() {
  const isExp = state.catModalTab === 'expense';
  $('cat-tab-expense').classList.toggle('active', isExp);
  $('cat-tab-income').classList.toggle('active', !isExp);

  $('cat-tab-expense-count').textContent = Object.keys(state.expenseCategories).length;
  $('cat-tab-income-count').textContent = Object.keys(state.incomeCategories).length;

  // Emoji suggestions for this tab
  const emojis = isExp ? EXPENSE_EMOJI_SUGGESTIONS : INCOME_EMOJI_SUGGESTIONS;
  $('quick-emojis-list').innerHTML = emojis
    .map(e => `<button type="button" class="quick-emoji-chip" data-emoji="${e}" title="Use ${e}">${e}</button>`)
    .join('');

  // Quick colors
  $('quick-colors-list').innerHTML = QUICK_COLOR_PALETTE
    .map(c => `<button type="button" class="quick-color-chip" data-color="${c}" style="background-color:${c};" title="${c}"></button>`)
    .join('');

  // List of existing categories
  const map = isExp ? state.expenseCategories : state.incomeCategories;
  const entryType = isExp ? 'deduct' : 'add';
  const names = Object.keys(map);
  $('cat-list-count').textContent = `${names.length} ${names.length === 1 ? 'category' : 'categories'}`;

  const container = $('category-items-container');
  if (names.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:1.5rem 0;font-size:0.85rem;">No categories found. Add one above!</div>';
    return;
  }

  container.innerHTML = names.map(name => {
    const cfg = map[name];
    const isEditing = state.catEditing && state.catEditing.oldName === name && state.catEditing.type === state.catModalTab;
    const uses = state.entries.filter(e => e.type === entryType && e.category === name).length;
    const isProtected = name === 'Other';

    return `
      <div class="category-item-row ${isEditing ? 'is-editing' : ''}" data-cat-name="${escapeHTML(name)}">
        <div class="cat-item-left">
          <div class="cat-item-icon-box" style="background:${cfg.color}25;border:1px solid ${cfg.color}55;color:${cfg.color};">
            ${cfg.icon || '🏷️'}
          </div>
          <div class="cat-item-name-group">
            <span class="cat-item-name">${escapeHTML(name)}</span>
            <span class="cat-item-uses">${uses} ${uses === 1 ? 'transaction' : 'transactions'}${isProtected ? ' • Default safety bucket' : ''}</span>
          </div>
        </div>
        <div class="cat-item-actions">
          <button type="button" class="cat-action-btn edit-btn" data-cat-name="${escapeHTML(name)}" title="Rename or edit category">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Edit</span>
          </button>
          ${isProtected ? '' : `
          <button type="button" class="cat-action-btn delete-btn" data-cat-name="${escapeHTML(name)}" title="Delete category">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Delete</span>
          </button>`}
        </div>
      </div>
    `;
  }).join('');
}

function startEditCategory(catName) {
  const map = state.catModalTab === 'expense' ? state.expenseCategories : state.incomeCategories;
  const cat = map[catName];
  if (!cat) return;

  state.catEditing = {
    type: state.catModalTab,
    oldName: catName
  };

  $('cat-form-title').textContent = `Edit Category: ${catName}`;
  $('save-cat-btn-text').textContent = '✓ Save Changes';
  $('cancel-cat-edit-btn').classList.remove('hidden');

  $('cat-name-input').value = catName;
  $('cat-icon-input').value = cat.icon || '🏷️';
  $('cat-color-input').value = cat.color || '#6366f1';
  $('cat-color-preview').style.backgroundColor = cat.color || '#6366f1';
  hideCatFormError();

  $('cat-name-input').focus();
  renderCategoryModal();
}

function resetCategoryForm() {
  state.catEditing = null;
  $('cat-form-title').textContent = 'Add New Category';
  $('save-cat-btn-text').textContent = '+ Add Category';
  $('cancel-cat-edit-btn').classList.add('hidden');

  $('cat-name-input').value = '';
  $('cat-icon-input').value = state.catModalTab === 'income' ? '💼' : '🍔';
  $('cat-color-input').value = '#6366f1';
  $('cat-color-preview').style.backgroundColor = '#6366f1';
  hideCatFormError();
}

function showCatFormError(msg) {
  $('cat-form-error-text').textContent = msg;
  $('cat-form-error').classList.remove('hidden');
}

function hideCatFormError() {
  $('cat-form-error').classList.add('hidden');
}

function saveCategory() {
  hideCatFormError();
  setElementInvalid($('cat-name-input'), false);
  setElementInvalid($('cat-icon-input'), false);

  const name = $('cat-name-input').value.trim();
  const icon = $('cat-icon-input').value.trim();
  const color = $('cat-color-input').value || '#6366f1';

  if (!name) {
    showCatFormError('Please enter a category name.');
    setElementInvalid($('cat-name-input'), true);
    $('cat-name-input').focus();
    return;
  }

  if (name.length < 2) {
    showCatFormError('Category name must be at least 2 characters long.');
    setElementInvalid($('cat-name-input'), true);
    $('cat-name-input').focus();
    return;
  }

  if (name.length > 32) {
    showCatFormError('Category name cannot exceed 32 characters.');
    setElementInvalid($('cat-name-input'), true);
    $('cat-name-input').focus();
    return;
  }

  if (!icon) {
    showCatFormError('Please provide an icon or emoji for this category.');
    setElementInvalid($('cat-icon-input'), true);
    $('cat-icon-input').focus();
    return;
  }

  // Validate hex color format
  if (!/^#[0-9a-fA-F]{6}$/i.test(color)) {
    showCatFormError('Please select a valid hex color code.');
    return;
  }

  const map = state.catModalTab === 'expense' ? state.expenseCategories : state.incomeCategories;
  const isEditing = !!state.catEditing;
  const oldName = isEditing ? state.catEditing.oldName : null;

  // Case-insensitive collision detection
  const lowerName = name.toLowerCase();
  const collision = Object.keys(map).find(
    k => k.toLowerCase() === lowerName && (!oldName || k.toLowerCase() !== oldName.toLowerCase())
  );

  if (collision) {
    showCatFormError(`Category "${collision}" already exists.`);
    setElementInvalid($('cat-name-input'), true);
    $('cat-name-input').focus();
    return;
  }

  if (isEditing) {
    if (name !== oldName) {
      // Re-key category map
      delete map[oldName];
      map[name] = { color, icon };

      // Update historical transactions seamlessly
      const entryType = state.catModalTab === 'expense' ? 'deduct' : 'add';
      let renamedCount = 0;
      state.entries = state.entries.map(e => {
        if (e.type === entryType && e.category === oldName) {
          renamedCount++;
          return { ...e, category: name };
        }
        return e;
      });
      if (renamedCount > 0) saveEntries();

      if (state.filterCategory === oldName) state.filterCategory = name;
      showToast(`Renamed to "${name}" (${renamedCount} transactions updated)`);
    } else {
      map[name] = { color, icon };
      showToast(`Updated category "${name}"`);
    }
  } else {
    map[name] = { color, icon };
    showToast(`Added new category "${name}"`);
  }

  saveCategories();
  resetCategoryForm();
  renderCategoryModal();
  populateCategorySelect(name);
  populateCategoryFilter();
  renderAll();
}

function deleteCategory(catName) {
  if (catName === 'Other') {
    alert('"Other" is a default safety category and cannot be deleted.');
    return;
  }

  const entryType = state.catModalTab === 'expense' ? 'deduct' : 'add';
  const usedCount = state.entries.filter(e => e.type === entryType && e.category === catName).length;

  let confirmed = false;
  if (usedCount > 0) {
    confirmed = window.confirm(
      `"${catName}" is currently used in ${usedCount} transaction(s).\n\nDeleting it will automatically reassign those transactions to "Other".\n\nDo you want to proceed?`
    );
  } else {
    confirmed = window.confirm(`Are you sure you want to delete category "${catName}"?`);
  }

  if (!confirmed) return;

  if (usedCount > 0) {
    state.entries = state.entries.map(e => {
      if (e.type === entryType && e.category === catName) {
        return { ...e, category: 'Other' };
      }
      return e;
    });
    saveEntries();
  }

  const map = state.catModalTab === 'expense' ? state.expenseCategories : state.incomeCategories;
  delete map[catName];
  saveCategories();

  if (state.filterCategory === catName) state.filterCategory = 'ALL';
  if (state.catEditing && state.catEditing.oldName === catName) resetCategoryForm();

  showToast(`Deleted category "${catName}"`);
  renderCategoryModal();
  populateCategorySelect();
  populateCategoryFilter();
  renderAll();
}

function resetCategoriesToDefault() {
  const confirmed = window.confirm(
    'Reset all categories back to defaults? Any custom categories you created will be removed.'
  );
  if (!confirmed) return;

  state.expenseCategories = JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
  state.incomeCategories = JSON.parse(JSON.stringify(DEFAULT_INCOME_CATEGORIES));
  saveCategories();

  resetCategoryForm();
  renderCategoryModal();
  populateCategorySelect();
  populateCategoryFilter();
  renderAll();
  showToast('Categories reset to defaults');
}

// ========================================================
// LOGGER: ADD MONEY / DEDUCT MONEY
// ========================================================

function populateCategorySelect(selected) {
  const map = state.logMode === 'add' ? state.incomeCategories : state.expenseCategories;
  const select = $('expense-category-input');
  select.innerHTML = Object.keys(map).map(c => `<option value="${escapeHTML(c)}">${map[c].icon} ${escapeHTML(c)}</option>`).join('');
  if (selected && map[selected]) {
    select.value = selected;
  } else if (selected) {
    if (map['Other']) {
      select.value = 'Other';
      $('custom-category-input').value = selected;
    } else {
      select.value = Object.keys(map)[0] || '';
    }
  }
  toggleCustomCategory(false);
}

function populateCategoryFilter() {
  const select = $('category-filter-select');
  const current = state.filterCategory;
  const all = new Set([
    ...Object.keys(state.expenseCategories),
    ...Object.keys(state.incomeCategories)
  ]);
  state.entries.forEach(e => all.add(e.category));
  select.innerHTML = '<option value="ALL">All Categories</option>' +
    [...all].map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  select.value = all.has(current) ? current : 'ALL';
}

function toggleCustomCategory(focus = true) {
  const isOther = $('expense-category-input').value === 'Other';
  $('custom-category-block').classList.toggle('hidden', !isOther);
  if (isOther && focus) $('custom-category-input').focus();
}

function setLogMode(mode, keepCategory) {
  state.logMode = mode;
  const isAdd = mode === 'add';
  $('mode-add-btn').classList.toggle('active', isAdd);
  $('mode-deduct-btn').classList.toggle('active', !isAdd);
  $('amount-prefix-sign').textContent = isAdd ? '+$' : '-$';
  $('amount-input-label').textContent = isAdd ? 'Amount to Add ($)' : 'Amount to Deduct ($)';
  $('add-expense-submit-btn').classList.toggle('add-mode-btn', isAdd);
  if (!$('editing-expense-id').value) {
    $('submit-btn-text').textContent = isAdd ? '+ Add Money' : '− Deduct Money';
  }
  populateCategorySelect(keepCategory);
}

function defaultLogDate() {
  if (state.selectedDay) return state.selectedDay;
  const now = new Date();
  if (getMonthKey(now) === getMonthKey(state.currentDate)) return toDateKey(now);
  return `${getMonthKey(state.currentDate)}-01`;
}

// ========================================================
// INPUT VALIDATION ENGINE
// ========================================================

function setElementInvalid(el, isInvalid) {
  if (!el) return;
  el.classList.toggle('input-invalid', isInvalid);
  const parent = el.closest('.input-with-prefix');
  if (parent) {
    parent.classList.toggle('input-invalid', isInvalid);
  }
}

function clearAllFormErrors() {
  hideFormError();
  [
    'expense-amount-input',
    'expense-date-input',
    'expense-category-input',
    'custom-category-input',
    'expense-note-input',
    'inline-budget-input',
    'cat-name-input',
    'cat-icon-input'
  ].forEach(id => {
    const el = $(id);
    if (el) setElementInvalid(el, false);
  });
}

function updateCharCounter(inputEl, counterEl, maxLen) {
  if (!inputEl || !counterEl) return;
  const len = inputEl.value.length;
  counterEl.textContent = `${len}/${maxLen}`;
  counterEl.classList.toggle('warning', len >= maxLen * 0.8 && len < maxLen);
  counterEl.classList.toggle('limit', len >= maxLen);
}

function validateAmountInput(valStr, mode) {
  const trimmed = String(valStr || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter an amount.' };
  }
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a valid numeric value.' };
  }
  if (num === 0) {
    return { valid: false, error: 'Amount must be greater than $0.00.' };
  }
  if (num < 0 && mode === 'add') {
    return { valid: false, error: 'Income amount cannot be negative.' };
  }
  const absNum = Math.abs(num);
  if (absNum > 100000000) {
    return { valid: false, error: 'Amount cannot exceed $100,000,000.00.' };
  }
  // Round cleanly to 2 decimal places
  const rounded = Math.round(absNum * 100) / 100;
  return { valid: true, amount: rounded, raw: num };
}

function validateDateInput(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Please select a valid date (YYYY-MM-DD).' };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 1970 || y > 2099) {
    return { valid: false, error: 'Date year must be between 1970 and 2099.' };
  }
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return { valid: false, error: 'That calendar day does not exist.' };
  }
  return { valid: true, date: dateStr };
}

function validateCategorySelection(categoryVal, customVal) {
  if (!categoryVal) {
    return { valid: false, error: 'Please select a category.' };
  }
  if (categoryVal === 'Other') {
    const trimmed = (customVal || '').trim();
    if (!trimmed) {
      return { valid: false, error: 'Please enter a name for the "Other" category.' };
    }
    if (trimmed.length < 2) {
      return { valid: false, error: 'Custom category must be at least 2 characters.' };
    }
    if (trimmed.length > 32) {
      return { valid: false, error: 'Custom category cannot exceed 32 characters.' };
    }
    return { valid: true, category: trimmed };
  }
  return { valid: true, category: categoryVal };
}

function validateNoteInput(noteStr) {
  const trimmed = (noteStr || '').trim();
  if (trimmed.length > 100) {
    return { valid: false, error: 'Note cannot exceed 100 characters.' };
  }
  return { valid: true, note: trimmed };
}

function showFormError(msg, focusEl) {
  $('form-error-text').textContent = msg;
  $('form-error-banner').classList.remove('hidden');
  if (focusEl) {
    setElementInvalid(focusEl, true);
    focusEl.focus();
  }
}

function hideFormError() {
  $('form-error-banner').classList.add('hidden');
}

function handleSubmit() {
  clearAllFormErrors();

  // 1. Validate Date
  const dateRes = validateDateInput($('expense-date-input').value);
  if (!dateRes.valid) {
    showFormError(dateRes.error, $('expense-date-input'));
    return;
  }

  // 2. Validate Amount
  const amountRes = validateAmountInput($('expense-amount-input').value, state.logMode);
  if (!amountRes.valid) {
    showFormError(amountRes.error, $('expense-amount-input'));
    return;
  }

  // 3. Validate Category & Custom "Other"
  const catRes = validateCategorySelection(
    $('expense-category-input').value,
    $('custom-category-input').value
  );
  if (!catRes.valid) {
    const targetEl = $('expense-category-input').value === 'Other'
      ? $('custom-category-input')
      : $('expense-category-input');
    showFormError(catRes.error, targetEl);
    return;
  }

  // 4. Validate Note
  const noteRes = validateNoteInput($('expense-note-input').value);
  if (!noteRes.valid) {
    showFormError(noteRes.error, $('expense-note-input'));
    return;
  }

  const date = dateRes.date;
  const amount = amountRes.amount;
  const type = amountRes.raw < 0 ? 'deduct' : state.logMode;
  const category = catRes.category;
  const note = noteRes.note;
  const editingId = $('editing-expense-id').value;

  if (editingId) {
    const idx = state.entries.findIndex(e => e.id === editingId);
    if (idx !== -1) state.entries[idx] = { ...state.entries[idx], type, amount, category, note, date };
    saveEntries();
    cancelEdit();
    showToast(`Updated ${category} (${type === 'add' ? '+' : '-'}${formatCurrency(amount)})`);
  } else {
    state.entries.unshift({
      id: 'entry-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type, amount, category, note, date, createdAt: Date.now()
    });
    saveEntries();
    $('expense-amount-input').value = '';
    $('expense-note-input').value = '';
    $('custom-category-input').value = '';
    updateCharCounter($('expense-note-input'), $('note-char-counter'), 100);
    updateCharCounter($('custom-category-input'), $('custom-cat-counter'), 32);

    showToast(type === 'add'
      ? `Added ${formatCurrency(amount)} on ${parseDateKey(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `Deducted ${formatCurrency(amount)} (${category})`);
    $('expense-amount-input').focus();
  }

  // Jump calendar to the month of the logged entry
  const d = parseDateKey(date);
  if (getMonthKey(d) !== getMonthKey(state.currentDate)) {
    state.currentDate = new Date(d.getFullYear(), d.getMonth(), 1);
    state.selectedDay = null;
  }
  populateCategoryFilter();
  renderAll();
}

function startEdit(id) {
  const item = state.entries.find(e => e.id === id);
  if (!item) return;
  $('editing-expense-id').value = item.id;
  setLogMode(item.type, item.category);
  $('expense-amount-input').value = item.amount;
  $('expense-date-input').value = item.date;
  $('expense-note-input').value = item.note || '';
  $('add-expense-section').classList.add('edit-mode');
  $('form-section-icon').textContent = '✏️';
  $('form-section-title').textContent = `Edit Record (${formatCurrency(item.amount)})`;
  $('form-section-subtitle').textContent = 'Change anything and press Enter or Save Changes.';
  $('submit-btn-text').textContent = 'Save Changes';
  $('cancel-edit-btn').classList.remove('hidden');
  hideFormError();
  $('add-expense-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('expense-amount-input').focus();
}

function cancelEdit() {
  $('editing-expense-id').value = '';
  $('expense-amount-input').value = '';
  $('expense-note-input').value = '';
  $('custom-category-input').value = '';
  $('expense-date-input').value = defaultLogDate();
  $('add-expense-section').classList.remove('edit-mode');
  $('form-section-icon').textContent = '⚡';
  $('form-section-title').textContent = 'Quick Amount Logger';
  $('form-section-subtitle').innerHTML = 'Add money (+ income) or deduct money (− expense) for any day • Press <kbd class="kbd-hint">Enter ↵</kbd> to save';
  $('cancel-edit-btn').classList.add('hidden');
  setLogMode('deduct');
  hideFormError();
}

function deleteEntry(id) {
  const item = state.entries.find(e => e.id === id);
  if (!item) return;
  state.entries = state.entries.filter(e => e.id !== id);
  saveEntries();
  if ($('editing-expense-id').value === id) cancelEdit();
  renderAll();
  showToast(`Deleted ${item.category} (${formatCurrency(item.amount)})`);
}

// ========================================================
// NAVIGATION, BALANCE EDITING, EXPORT, TOAST
// ========================================================

function selectDay(key) {
  state.selectedDay = state.selectedDay === key ? null : key;
  if (!$('editing-expense-id').value) $('expense-date-input').value = defaultLogDate();
  renderAll();
}

function changeMonth(delta) {
  state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + delta, 1);
  state.selectedDay = null;
  if ($('editing-expense-id').value) cancelEdit();
  $('expense-date-input').value = defaultLogDate();
  exitBalanceEdit();
  renderAll();
}

function jumpToToday() {
  const now = new Date();
  state.currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  state.selectedDay = toDateKey(now);
  if ($('editing-expense-id').value) cancelEdit();
  $('expense-date-input').value = defaultLogDate();
  exitBalanceEdit();
  renderAll();
}

function enterBalanceEdit() {
  $('inline-budget-input').value = state.baseBalance;
  $('balance-view-mode').classList.add('hidden');
  $('balance-edit-mode').classList.remove('hidden');
  $('inline-budget-input').focus();
}

function confirmBalance() {
  const rawStr = $('inline-budget-input').value.trim();
  if (!rawStr) {
    showToast('Please enter a starting balance.');
    setElementInvalid($('inline-budget-input'), true);
    $('inline-budget-input').focus();
    return;
  }
  const val = parseFloat(rawStr);
  if (isNaN(val)) {
    showToast('Starting balance must be a valid number.');
    setElementInvalid($('inline-budget-input'), true);
    $('inline-budget-input').focus();
    return;
  }
  if (val < 0) {
    showToast('Starting balance cannot be negative.');
    setElementInvalid($('inline-budget-input'), true);
    $('inline-budget-input').focus();
    return;
  }
  if (val > 1000000000) {
    showToast('Starting balance cannot exceed $1,000,000,000.00.');
    setElementInvalid($('inline-budget-input'), true);
    $('inline-budget-input').focus();
    return;
  }

  setElementInvalid($('inline-budget-input'), false);
  state.baseBalance = Math.round(val * 100) / 100;
  saveBase();
  exitBalanceEdit();
  renderAll();
  showToast(`Starting balance set to ${formatCurrency(state.baseBalance)}`);
}

function exitBalanceEdit() {
  $('balance-edit-mode').classList.add('hidden');
  $('balance-view-mode').classList.remove('hidden');
}

function setTypeFilter(type) {
  state.filterType = type;
  $('filter-type-all-btn').classList.toggle('active', type === 'ALL');
  $('filter-type-deduct-btn').classList.toggle('active', type === 'deduct');
  $('filter-type-add-btn').classList.toggle('active', type === 'add');
  renderRecords();
}

function exportCSV() {
  const list = getMonthEntries().slice().sort((a, b) => a.date.localeCompare(b.date));
  if (list.length === 0) {
    showToast('No records to export for this month.');
    return;
  }
  const income = sumAmounts(list.filter(e => e.type === 'add'));
  const expenses = sumAmounts(list.filter(e => e.type === 'deduct'));
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['Date', 'Day', 'Type', 'Category', 'Note', 'Amount ($)'].join(',')];
  list.forEach(e => rows.push([
    q(e.date),
    q(parseDateKey(e.date).toLocaleDateString('en-US', { weekday: 'long' })),
    q(e.type === 'add' ? 'Income' : 'Expense'),
    q(e.category), q(e.note || ''),
    (e.type === 'add' ? '' : '-') + e.amount.toFixed(2)
  ].join(',')));
  rows.push('');
  rows.push(`"Total Income",,,,,${income.toFixed(2)}`);
  rows.push(`"Total Expenses",,,,,-${expenses.toFixed(2)}`);
  rows.push(`"Net Savings",,,,,${(income - expenses).toFixed(2)}`);
  rows.push(`"Savings Rate",,,,,${income > 0 ? (((income - expenses) / income) * 100).toFixed(1) + '%' : 'N/A'}`);

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `SpendFlow_${getMonthKey(state.currentDate)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${list.length} records to CSV!`);
}

let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  $('toast-msg').textContent = msg;
  $('toast').classList.remove('hidden');
  toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 2800);
}

// ========================================================
// SAMPLE DATA & DATA CLEARING
// ========================================================

function loadSampleData() {
  const curY = state.currentDate.getFullYear();
  const curM = state.currentDate.getMonth();

  const makeDate = (monthOffset, day) => {
    const d = new Date(curY, curM + monthOffset, day);
    return toDateKey(d);
  };

  const sampleEntries = [
    // Current Month (0 offset)
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(0, 1) },
    { type: 'deduct', amount: 1450.00, category: 'Housing & Rent', note: 'Monthly apartment lease', date: makeDate(0, 1) },
    { type: 'deduct', amount: 138.60, category: 'Food & Dining', note: 'Trader Joe groceries', date: makeDate(0, 2) },
    { type: 'deduct', amount: 165.40, category: 'Utilities & Bills', note: 'Electric & high-speed fiber', date: makeDate(0, 4) },
    { type: 'deduct', amount: 52.40, category: 'Transportation', note: 'Shell gas refill', date: makeDate(0, 5) },
    { type: 'deduct', amount: 28.50, category: 'Food & Dining', note: 'Work lunch & iced matcha', date: makeDate(0, 7) },
    { type: 'deduct', amount: 45.00, category: 'Personal Care', note: 'Haircut & styling', date: makeDate(0, 8) },
    { type: 'deduct', amount: 89.20, category: 'Entertainment', note: 'Concert & movie night', date: makeDate(0, 10) },
    { type: 'add', amount: 850.00, category: 'Freelance', note: 'Client brand design milestone', date: makeDate(0, 12) },
    { type: 'deduct', amount: 145.80, category: 'Food & Dining', note: 'Weekly organic grocery run', date: makeDate(0, 14) },
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(0, 15) },
    { type: 'deduct', amount: 76.50, category: 'Food & Dining', note: 'Dinner with friends', date: makeDate(0, 17) },
    { type: 'deduct', amount: 38.00, category: 'Transportation', note: 'Metro card refill', date: makeDate(0, 19) },
    { type: 'deduct', amount: 64.99, category: 'Shopping & Retail', note: 'Warm autumn hoodie', date: makeDate(0, 21) },
    { type: 'add', amount: 125.00, category: 'Investments', note: 'Quarterly dividend payout', date: makeDate(0, 22) },
    { type: 'deduct', amount: 32.50, category: 'Healthcare', note: 'Vitamins & wellness pharmacy', date: makeDate(0, 24) },
    { type: 'deduct', amount: 48.00, category: 'Education', note: 'Web engineering books', date: makeDate(0, 26) },

    // Previous Month (-1 offset)
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(-1, 1) },
    { type: 'deduct', amount: 1450.00, category: 'Housing & Rent', note: 'Monthly rent', date: makeDate(-1, 1) },
    { type: 'deduct', amount: 180.20, category: 'Utilities & Bills', note: 'Summer electric bill', date: makeDate(-1, 4) },
    { type: 'deduct', amount: 485.60, category: 'Food & Dining', note: 'Monthly groceries & dining', date: makeDate(-1, 12) },
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(-1, 15) },
    { type: 'deduct', amount: 120.00, category: 'Transportation', note: 'Gas & transit', date: makeDate(-1, 16) },
    { type: 'add', amount: 500.00, category: 'Freelance', note: 'Design consulting', date: makeDate(-1, 18) },
    { type: 'deduct', amount: 165.00, category: 'Entertainment', note: 'Weekend roadtrip', date: makeDate(-1, 22) },
    { type: 'deduct', amount: 95.00, category: 'Shopping & Retail', note: 'Household supplies', date: makeDate(-1, 27) },

    // 2 Months Prior (-2 offset)
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(-2, 1) },
    { type: 'deduct', amount: 1450.00, category: 'Housing & Rent', note: 'Monthly rent', date: makeDate(-2, 1) },
    { type: 'deduct', amount: 195.00, category: 'Utilities & Bills', note: 'Electricity & water', date: makeDate(-2, 5) },
    { type: 'deduct', amount: 520.40, category: 'Food & Dining', note: 'Summer dining & groceries', date: makeDate(-2, 14) },
    { type: 'add', amount: 3450.00, category: 'Salary', note: 'Bi-weekly direct deposit', date: makeDate(-2, 15) },
    { type: 'deduct', amount: 140.00, category: 'Transportation', note: 'Commute & travel', date: makeDate(-2, 20) },
    { type: 'deduct', amount: 210.00, category: 'Shopping & Retail', note: 'Summer apparel', date: makeDate(-2, 25) }
  ].map((e, idx) => ({
    id: `sample-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    ...e,
    createdAt: Date.now() - (idx * 3600000)
  }));

  state.entries = sampleEntries;
  state.baseBalance = 3500;
  saveEntries();
  saveBase();
  state.selectedDay = null;
  if ($('editing-expense-id').value) cancelEdit();
  $('expense-date-input').value = defaultLogDate();
  populateCategoryFilter();
  renderAll();
  showToast('Loaded realistic sample data! 📊');
}

function clearAllData() {
  if (state.entries.length === 0) {
    showToast('Tracker is already empty.');
    return;
  }

  const confirmed = window.confirm(
    'Are you sure you want to clear all logged income and expenses?\n\nThis will reset your tracker to zero transactions. Custom categories and base balance will be preserved.'
  );
  if (!confirmed) return;

  state.entries = [];
  saveEntries();
  state.selectedDay = null;
  if ($('editing-expense-id').value) cancelEdit();
  $('expense-amount-input').value = '';
  $('expense-note-input').value = '';
  $('custom-category-input').value = '';
  $('expense-date-input').value = defaultLogDate();
  updateCharCounter($('expense-note-input'), $('note-char-counter'), 100);
  updateCharCounter($('custom-category-input'), $('custom-cat-counter'), 32);
  clearAllFormErrors();
  populateCategoryFilter();
  renderAll();
  showToast('All transaction records cleared! 🧹');
}

// ========================================================
// INIT
// ========================================================

function initEventListeners() {
  $('prev-month-btn').addEventListener('click', () => changeMonth(-1));
  $('next-month-btn').addEventListener('click', () => changeMonth(1));
  $('today-btn').addEventListener('click', jumpToToday);
  $('calendar-all-month-btn').addEventListener('click', () => {
    state.selectedDay = null;
    if (!$('editing-expense-id').value) $('expense-date-input').value = defaultLogDate();
    renderAll();
  });
  $('export-csv-btn').addEventListener('click', exportCSV);
  $('load-sample-btn').addEventListener('click', loadSampleData);
  if ($('empty-load-sample-btn')) $('empty-load-sample-btn').addEventListener('click', loadSampleData);
  $('clear-all-btn').addEventListener('click', clearAllData);

  $('start-edit-balance-btn').addEventListener('click', enterBalanceEdit);
  $('confirm-save-balance-btn').addEventListener('click', confirmBalance);
  $('cancel-edit-balance-btn').addEventListener('click', exitBalanceEdit);
  $('inline-budget-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); confirmBalance(); }
    else if (e.key === 'Escape') exitBalanceEdit();
  });

  $('mode-deduct-btn').addEventListener('click', () => setLogMode('deduct'));
  $('mode-add-btn').addEventListener('click', () => setLogMode('add'));
  $('expense-category-input').addEventListener('change', () => toggleCustomCategory(true));
  $('add-expense-submit-btn').addEventListener('click', handleSubmit);
  $('cancel-edit-btn').addEventListener('click', cancelEdit);

  ['expense-amount-input', 'custom-category-input', 'expense-note-input'].forEach(id => {
    $(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    });
  });
  // Real-time live validation & character counter listeners
  $('expense-amount-input').addEventListener('input', () => {
    setElementInvalid($('expense-amount-input'), false);
    hideFormError();
    if (parseFloat($('expense-amount-input').value) < 0 && state.logMode !== 'deduct') setLogMode('deduct');
  });

  $('expense-date-input').addEventListener('input', () => {
    setElementInvalid($('expense-date-input'), false);
    hideFormError();
  });

  $('expense-note-input').addEventListener('input', () => {
    setElementInvalid($('expense-note-input'), false);
    hideFormError();
    updateCharCounter($('expense-note-input'), $('note-char-counter'), 100);
  });

  $('custom-category-input').addEventListener('input', () => {
    setElementInvalid($('custom-category-input'), false);
    hideFormError();
    updateCharCounter($('custom-category-input'), $('custom-cat-counter'), 32);
  });

  $('inline-budget-input').addEventListener('input', () => {
    setElementInvalid($('inline-budget-input'), false);
  });

  $('trend-daily-btn').addEventListener('click', () => setTrendMode('daily'));
  $('trend-weekly-btn').addEventListener('click', () => setTrendMode('weekly'));

  $('filter-type-all-btn').addEventListener('click', () => setTypeFilter('ALL'));
  $('filter-type-deduct-btn').addEventListener('click', () => setTypeFilter('deduct'));
  $('filter-type-add-btn').addEventListener('click', () => setTypeFilter('add'));
  $('category-filter-select').addEventListener('change', e => {
    state.filterCategory = e.target.value;
    renderRecords();
  });

  // Category Management Modal Listeners
  $('open-cat-manager-btn').addEventListener('click', () => openCategoryModal());
  $('quick-manage-cat-btn').addEventListener('click', () => openCategoryModal());
  $('close-category-modal-btn').addEventListener('click', closeCategoryModal);
  $('done-category-modal-btn').addEventListener('click', closeCategoryModal);
  $('cat-tab-expense').addEventListener('click', () => switchCategoryTab('expense'));
  $('cat-tab-income').addEventListener('click', () => switchCategoryTab('income'));
  $('save-category-btn').addEventListener('click', saveCategory);
  $('cancel-cat-edit-btn').addEventListener('click', resetCategoryForm);
  $('reset-categories-btn').addEventListener('click', resetCategoriesToDefault);

  $('cat-color-input').addEventListener('input', e => {
    $('cat-color-preview').style.backgroundColor = e.target.value;
  });
  $('cat-name-input').addEventListener('input', () => {
    setElementInvalid($('cat-name-input'), false);
    hideCatFormError();
    updateCharCounter($('cat-name-input'), $('cat-name-counter'), 32);
  });
  $('cat-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveCategory(); }
  });

  $('quick-emojis-list').addEventListener('click', e => {
    const chip = e.target.closest('.quick-emoji-chip');
    if (chip && chip.dataset.emoji) {
      $('cat-icon-input').value = chip.dataset.emoji;
      setElementInvalid($('cat-icon-input'), false);
      hideCatFormError();
      $('cat-name-input').focus();
    }
  });

  $('quick-colors-list').addEventListener('click', e => {
    const chip = e.target.closest('.quick-color-chip');
    if (chip && chip.dataset.color) {
      $('cat-color-input').value = chip.dataset.color;
      $('cat-color-preview').style.backgroundColor = chip.dataset.color;
    }
  });

  $('category-items-container').addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn && editBtn.dataset.catName) {
      startEditCategory(editBtn.dataset.catName);
      return;
    }
    const delBtn = e.target.closest('.delete-btn');
    if (delBtn && delBtn.dataset.catName) {
      deleteCategory(delBtn.dataset.catName);
    }
  });

  $('category-modal').addEventListener('click', e => {
    if (e.target === $('category-modal')) closeCategoryModal();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if ($('admin-modal') && !$('admin-modal').classList.contains('hidden')) {
        closeAdminModal();
        return;
      }
      if ($('csv-import-modal') && !$('csv-import-modal').classList.contains('hidden')) {
        closeCSVModal();
        return;
      }
      if ($('auth-modal') && !$('auth-modal').classList.contains('hidden') && !state.currentUser) {
        // Esc does not dismiss auth when not signed in
        return;
      }
      if ($('user-dropdown-menu') && !$('user-dropdown-menu').classList.contains('hidden')) {
        closeUserDropdown();
      } else if (!$('category-modal').classList.contains('hidden')) {
        closeCategoryModal();
      } else if ($('editing-expense-id').value) {
        cancelEdit();
      }
    }
  });
}

// ========================================================
// CSV IMPORT ENGINE
// ========================================================

let pendingCSVEntries = [];
let pendingCSVFileName = '';

function initCSVImport() {
  if (!$('import-csv-btn') || !$('import-csv-file')) return;

  $('import-csv-btn').addEventListener('click', () => {
    $('import-csv-file').value = '';
    $('import-csv-file').click();
  });

  $('import-csv-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    pendingCSVFileName = file.name;
    const reader = new FileReader();
    reader.onload = evt => {
      parseAndPreviewCSV(evt.target.result, file.name);
    };
    reader.readAsText(file);
  });

  if ($('close-csv-modal-btn')) {
    $('close-csv-modal-btn').addEventListener('click', closeCSVModal);
  }
  if ($('cancel-csv-import-btn')) {
    $('cancel-csv-import-btn').addEventListener('click', closeCSVModal);
  }
  if ($('confirm-csv-import-btn')) {
    $('confirm-csv-import-btn').addEventListener('click', applyCSVImport);
  }
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' || c === "'") {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result.map(s => s.replace(/^["']|["']$/g, '').trim());
}

function parseAndPreviewCSV(text, filename) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    showToast('The selected CSV file appears to be empty.');
    return;
  }

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const dateIdx = header.findIndex(h => h.includes('date'));
  const typeIdx = header.findIndex(h => h.includes('type'));
  const catIdx = header.findIndex(h => h.includes('cat'));
  const amtIdx = header.findIndex(h => h.includes('amount') || h.includes('val') || h.includes('cost') || h.includes('price'));
  const noteIdx = header.findIndex(h => h.includes('note') || h.includes('desc') || h.includes('memo') || h.includes('title'));

  const validEntries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = dateIdx !== -1 ? cols[dateIdx] : cols[0];
    const rawType = typeIdx !== -1 ? cols[typeIdx] : '';
    const rawCat = catIdx !== -1 ? cols[catIdx] : 'Other';
    const rawAmt = amtIdx !== -1 ? cols[amtIdx] : cols[cols.length - 1];
    const rawNote = noteIdx !== -1 ? cols[noteIdx] : '';

    const cleanAmt = parseFloat(String(rawAmt).replace(/[^0-9.-]/g, ''));
    if (isNaN(cleanAmt) || cleanAmt <= 0) continue;

    // Normalizing type
    let finalType = 'deduct';
    const lowerType = String(rawType).toLowerCase();
    if (lowerType.includes('add') || lowerType.includes('income') || lowerType.includes('credit') || lowerType.includes('deposit') || String(rawAmt).startsWith('+')) {
      finalType = 'add';
    }

    // Normalizing date to YYYY-MM-DD
    let dateStr = defaultLogDate();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        dateStr = toDateKey(parsed);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateStr = rawDate;
      }
    }

    validEntries.push({
      id: `imp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      type: finalType,
      category: rawCat || (finalType === 'add' ? 'Salary' : 'Miscellaneous'),
      amount: cleanAmt,
      note: rawNote || '',
      createdAt: Date.now() - (i * 1000)
    });
  }

  if (validEntries.length === 0) {
    showToast('Could not find valid financial rows in this CSV.');
    return;
  }

  pendingCSVEntries = validEntries;
  pendingCSVFileName = filename;

  if ($('csv-file-name')) $('csv-file-name').textContent = filename;
  if ($('csv-valid-count')) $('csv-valid-count').textContent = validEntries.length + ' rows';

  const totalInflow = validEntries.filter(e => e.type === 'add').reduce((acc, e) => acc + e.amount, 0);
  const totalDeduct = validEntries.filter(e => e.type === 'deduct').reduce((acc, e) => acc + e.amount, 0);

  if ($('csv-total-inflow')) $('csv-total-inflow').textContent = '+' + formatCurrency(totalInflow);
  if ($('csv-total-deductions')) $('csv-total-deductions').textContent = '-' + formatCurrency(totalDeduct);

  const previewRows = validEntries.slice(0, 5);
  const tbody = $('csv-preview-tbody');
  if (tbody) {
    tbody.innerHTML = previewRows.map(e => `
      <tr>
        <td>${escapeHTML(e.date)}</td>
        <td><span class="badge ${e.type === 'add' ? 'badge-inflow' : 'badge-deduct'}">${e.type === 'add' ? '+Add' : '-Deduct'}</span></td>
        <td>${escapeHTML(e.category)}</td>
        <td style="font-weight: 700; color: ${e.type === 'add' ? 'var(--accent-safe)' : 'var(--accent-danger)'}">${e.type === 'add' ? '+' : '-'}${formatCurrency(e.amount)}</td>
        <td class="text-ellipsis">${escapeHTML(e.note || '—')}</td>
      </tr>
    `).join('');
  }

  if ($('csv-import-modal')) {
    $('csv-import-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
}

function closeCSVModal() {
  if ($('csv-import-modal')) $('csv-import-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  pendingCSVEntries = [];
}

function applyCSVImport() {
  if (pendingCSVEntries.length === 0) return;
  const modeEl = document.querySelector('input[name="csv-import-mode"]:checked');
  const mode = modeEl ? modeEl.value : 'append';

  if (mode === 'replace') {
    state.entries = [...pendingCSVEntries];
  } else {
    state.entries = [...state.entries, ...pendingCSVEntries];
  }

  saveEntries();
  state.selectedDay = null;
  populateCategoryFilter();
  renderAll();
  const count = pendingCSVEntries.length;
  closeCSVModal();
  showToast(`Successfully imported ${count} records! 📥`);
}

// ========================================================
// ADMIN CONTROL PANEL
// ========================================================

function openAdminPanel() {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    showToast('Admin privilege required.');
    return;
  }
  closeUserDropdown();
  renderAdminUsersTable();
  if ($('admin-modal')) {
    $('admin-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
}

function closeAdminModal() {
  if ($('admin-modal')) $('admin-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function renderAdminUsersTable() {
  const users = getRegisteredUsers();
  const members = users.filter(u => u.role !== 'admin');
  const admins = users.filter(u => u.role === 'admin');

  let totalTx = 0;
  users.forEach(u => {
    try {
      const stored = JSON.parse(storage.getItem(`spendflow_${u.id}_clean_expenses`) || '[]');
      totalTx += stored.length;
    } catch (e) {}
  });

  if ($('admin-stat-total-users')) $('admin-stat-total-users').textContent = users.length;
  if ($('admin-stat-members')) $('admin-stat-members').textContent = members.length;
  if ($('admin-stat-admins')) $('admin-stat-admins').textContent = admins.length;
  if ($('admin-stat-transactions')) $('admin-stat-transactions').textContent = totalTx;
  if ($('admin-user-count-chip')) $('admin-user-count-chip').textContent = `${users.length} accounts`;

  const tbody = $('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    let txCount = 0;
    try {
      const tx = JSON.parse(storage.getItem(`spendflow_${u.id}_clean_expenses`) || '[]');
      txCount = tx.length;
    } catch (e) {}
    const isCur = state.currentUser && state.currentUser.id === u.id;
    const isPrimaryAdmin = u.id === 'user_admin';
    const initials = getUserInitials(u.name);
    const joined = new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="user-avatar" style="width: 26px; height: 26px; font-size: 0.68rem;">${initials}</div>
            <div>
              <strong>${escapeHTML(u.name)}</strong>
              ${isCur ? ' <span style="font-size: 0.68rem; color: #a5b4fc;">(You)</span>' : ''}
            </div>
          </div>
        </td>
        <td><code>${escapeHTML(u.email)}</code></td>
        <td>
          <span class="user-role-badge ${u.role === 'admin' ? 'admin' : ''}">${u.role === 'admin' ? '👑 Admin' : 'Member'}</span>
        </td>
        <td>${joined}</td>
        <td><strong>${txCount}</strong></td>
        <td>
          <div class="admin-actions-cell">
            <button type="button" class="admin-action-btn admin-reset-pw-btn" data-user-id="${u.id}" data-user-name="${escapeHTML(u.name)}" title="Set new password">
              🔑 Reset Pw
            </button>
            ${!isCur ? `
              <button type="button" class="admin-action-btn admin-switch-btn" data-user-id="${u.id}" title="Inspect as this user">
                👁️ Switch
              </button>
            ` : ''}
            ${!isPrimaryAdmin && !isCur ? `
              <button type="button" class="admin-action-btn danger admin-del-user-btn" data-user-id="${u.id}" data-user-name="${escapeHTML(u.name)}" title="Permanently delete user">
                🗑️ Delete
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAdminCreateUser(e) {
  e.preventDefault();
  const name = ($('admin-new-name').value || '').trim();
  const email = ($('admin-new-email').value || '').trim().toLowerCase();
  const pwd = ($('admin-new-password').value || '').trim();
  const role = $('admin-new-role').value || 'member';
  const errBox = $('admin-add-user-error');
  const errText = $('admin-add-user-error-text');

  if (!name || !email || !pwd) {
    if (errText) errText.textContent = 'Please fill out all fields.';
    if (errBox) errBox.classList.remove('hidden');
    return;
  }
  if (!isValidEmail(email)) {
    if (errText) errText.textContent = 'Please enter a valid email address.';
    if (errBox) errBox.classList.remove('hidden');
    return;
  }
  if (pwd.length < 4) {
    if (errText) errText.textContent = 'Password must be at least 4 characters.';
    if (errBox) errBox.classList.remove('hidden');
    return;
  }

  const users = getRegisteredUsers();
  if (users.some(u => u.email.toLowerCase() === email)) {
    if (errText) errText.textContent = 'A user with this email already exists.';
    if (errBox) errBox.classList.remove('hidden');
    return;
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    password: pwd,
    role,
    createdAt: Date.now()
  };

  users.push(newUser);
  saveRegisteredUsers(users);
  storage.setItem(`spendflow_${newUser.id}_clean_expenses`, JSON.stringify([]));
  storage.setItem(`spendflow_${newUser.id}_base_balance`, '2500');

  $('admin-new-name').value = '';
  $('admin-new-email').value = '';
  $('admin-new-password').value = '';
  if (errBox) errBox.classList.add('hidden');

  renderAdminUsersTable();
  showToast(`Created account for ${name}! 👤`);
}

function handleAdminResetUserPassword(userId, userName) {
  const newPw = window.prompt(`Enter new password for ${userName} (min. 4 characters):`);
  if (!newPw) return;
  if (newPw.trim().length < 4) {
    showToast('Password must be at least 4 characters.');
    return;
  }
  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    showToast('User not found.');
    return;
  }
  user.password = newPw.trim();
  saveRegisteredUsers(users);
  showToast(`Password updated for ${userName}! 🔑`);
}

function handleAdminDeleteUser(userId, userName) {
  const confirmed = window.confirm(`Permanently delete user "${userName}"?\n\nThis will remove their account and all their recorded transactions from the system.`);
  if (!confirmed) return;

  const users = getRegisteredUsers().filter(u => u.id !== userId);
  saveRegisteredUsers(users);

  storage.removeItem(`spendflow_${userId}_clean_expenses`);
  storage.removeItem(`spendflow_${userId}_base_balance`);
  storage.removeItem(`spendflow_${userId}_expense_categories`);
  storage.removeItem(`spendflow_${userId}_income_categories`);

  renderAdminUsersTable();
  showToast(`User ${userName} deleted. 🗑️`);
}

function handleAdminSwitchUser(userId) {
  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  closeAdminModal();
  setActiveSession(user, true);
  applyUserLogin(user, true);
  showToast(`Switched view to ${user.name}! 👁️`);
}

function initAuthEvents() {
  if ($('auth-tab-signin')) $('auth-tab-signin').addEventListener('click', () => switchAuthTab('signin'));
  if ($('auth-tab-signup')) $('auth-tab-signup').addEventListener('click', () => switchAuthTab('signup'));
  if ($('auth-tab-reset')) $('auth-tab-reset').addEventListener('click', () => switchAuthTab('reset'));
  if ($('switch-to-signup-btn')) $('switch-to-signup-btn').addEventListener('click', () => switchAuthTab('signup'));
  if ($('switch-to-signin-btn')) $('switch-to-signin-btn').addEventListener('click', () => switchAuthTab('signin'));
  if ($('switch-to-signin-from-reset')) $('switch-to-signin-from-reset').addEventListener('click', () => switchAuthTab('signin'));
  if ($('forgot-pw-link')) $('forgot-pw-link').addEventListener('click', () => switchAuthTab('reset'));

  if ($('quick-demo-login-btn')) {
    $('quick-demo-login-btn').addEventListener('click', () => {
      if ($('signin-email')) $('signin-email').value = 'demo@spendflow.app';
      if ($('signin-password')) $('signin-password').value = 'password123';
      handleSignIn('demo@spendflow.app', 'password123', true);
    });
  }

  if ($('quick-admin-login-btn')) {
    $('quick-admin-login-btn').addEventListener('click', () => {
      if ($('signin-email')) $('signin-email').value = 'admin@spendflow.app';
      if ($('signin-password')) $('signin-password').value = 'admin123';
      handleSignIn('admin@spendflow.app', 'admin123', true);
    });
  }

  if ($('signin-form')) {
    $('signin-form').addEventListener('submit', e => {
      e.preventDefault();
      const email = $('signin-email') ? $('signin-email').value : '';
      const password = $('signin-password') ? $('signin-password').value : '';
      const remember = $('signin-remember') ? $('signin-remember').checked : true;
      handleSignIn(email, password, remember);
    });
  }

  if ($('signup-form')) {
    $('signup-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('signup-name') ? $('signup-name').value : '';
      const email = $('signup-email') ? $('signup-email').value : '';
      const password = $('signup-password') ? $('signup-password').value : '';
      const confirm = $('signup-confirm-password') ? $('signup-confirm-password').value : '';
      const sample = $('signup-sample-data') ? $('signup-sample-data').checked : true;
      handleSignUp(name, email, password, confirm, sample);
    });
  }

  if ($('signup-email')) {
    $('signup-email').addEventListener('input', handleSignUpEmailCheck);
    $('signup-email').addEventListener('blur', handleSignUpEmailCheck);
  }

  if ($('close-security-toast-btn')) {
    $('close-security-toast-btn').addEventListener('click', hideSecurityToast);
  }

  if ($('reset-send-code-btn')) {
    $('reset-send-code-btn').addEventListener('click', handleResetSendCode);
  }

  if ($('reset-email')) {
    $('reset-email').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleResetSendCode();
      }
    });
  }

  if ($('reset-verify-btn')) {
    $('reset-verify-btn').addEventListener('click', handleVerifyResetCode);
  }

  if ($('reset-code-input')) {
    $('reset-code-input').addEventListener('input', e => {
      if (e.target.value.trim().length === 6) {
        handleVerifyResetCode();
      }
    });
  }

  if ($('reset-back-to-step1-btn')) {
    $('reset-back-to-step1-btn').addEventListener('click', () => {
      if ($('reset-step-1')) $('reset-step-1').classList.remove('hidden');
      if ($('reset-step-2')) $('reset-step-2').classList.add('hidden');
      if ($('reset-email')) $('reset-email').focus();
    });
  }

  if ($('reset-form')) {
    $('reset-form').addEventListener('submit', e => {
      e.preventDefault();
      const email = $('reset-email') ? $('reset-email').value : '';
      const newPw = $('reset-new-password') ? $('reset-new-password').value : '';
      const confirmPw = $('reset-confirm-password') ? $('reset-confirm-password').value : '';
      handleResetPassword(email, newPw, confirmPw);
    });
  }

  setupPasswordToggle('signin-toggle-pw', 'signin-password');
  setupPasswordToggle('signup-toggle-pw', 'signup-password');
  setupPasswordToggle('signup-toggle-confirm-pw', 'signup-confirm-password');
  setupPasswordToggle('reset-toggle-pw', 'reset-new-password');
  setupPasswordToggle('reset-toggle-confirm-pw', 'reset-confirm-password');

  if ($('user-profile-btn')) {
    $('user-profile-btn').addEventListener('click', e => {
      e.stopPropagation();
      toggleUserDropdown();
    });
  }

  if ($('open-admin-panel-btn')) {
    $('open-admin-panel-btn').addEventListener('click', () => {
      openAdminPanel();
    });
  }

  if ($('close-admin-modal-btn')) {
    $('close-admin-modal-btn').addEventListener('click', closeAdminModal);
  }
  if ($('done-admin-modal-btn')) {
    $('done-admin-modal-btn').addEventListener('click', closeAdminModal);
  }

  if ($('admin-add-user-form')) {
    $('admin-add-user-form').addEventListener('submit', handleAdminCreateUser);
  }

  if ($('admin-users-tbody')) {
    $('admin-users-tbody').addEventListener('click', e => {
      const resetBtn = e.target.closest('.admin-reset-pw-btn');
      if (resetBtn && resetBtn.dataset.userId) {
        handleAdminResetUserPassword(resetBtn.dataset.userId, resetBtn.dataset.userName);
        return;
      }
      const delBtn = e.target.closest('.admin-del-user-btn');
      if (delBtn && delBtn.dataset.userId) {
        handleAdminDeleteUser(delBtn.dataset.userId, delBtn.dataset.userName);
        return;
      }
      const switchBtn = e.target.closest('.admin-switch-btn');
      if (switchBtn && switchBtn.dataset.userId) {
        handleAdminSwitchUser(switchBtn.dataset.userId);
      }
    });
  }

  if ($('delete-my-account-btn')) {
    $('delete-my-account-btn').addEventListener('click', () => {
      handleDeleteMyAccount();
    });
  }

  if ($('switch-account-btn')) {
    $('switch-account-btn').addEventListener('click', () => {
      closeUserDropdown();
      showAuthModal('signin');
    });
  }

  if ($('logout-btn')) {
    $('logout-btn').addEventListener('click', () => {
      handleSignOut();
    });
  }

  document.addEventListener('click', e => {
    const wrap = $('user-profile-wrapper');
    if (wrap && !wrap.contains(e.target)) {
      closeUserDropdown();
    }
  });

  initCSVImport();
}

function initApp() {
  migrateLegacyStorage();
  initEventListeners();
  initAuthEvents();

  const user = getActiveSession();
  if (user) {
    applyUserLogin(user, false);
  } else {
    showAuthModal('signin');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
