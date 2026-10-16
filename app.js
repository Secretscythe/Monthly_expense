/**
 * SpendFlow - Simple & Fast Monthly Expense Tracker
 * Super-fast inline entry, zero page reloads, zero white flash
 * 100% compatible with GitHub Pages and Streamlit Cloud
 */

// Category Palette with thematic icons and colors
const CATEGORIES = {
  'Food & Dining': { color: '#f59e0b', icon: '🍔', bg: 'rgba(245, 158, 11, 0.15)' },
  'Housing & Rent': { color: '#8b5cf6', icon: '🏠', bg: 'rgba(139, 92, 246, 0.15)' },
  'Utilities & Bills': { color: '#0ea5e9', icon: '⚡', bg: 'rgba(14, 165, 233, 0.15)' },
  'Transportation': { color: '#10b981', icon: '🚗', bg: 'rgba(16, 185, 129, 0.15)' },
  'Shopping & Retail': { color: '#ec4899', icon: '🛍️', bg: 'rgba(236, 72, 153, 0.15)' },
  'Entertainment': { color: '#a855f7', icon: '🎬', bg: 'rgba(168, 85, 247, 0.15)' },
  'Healthcare': { color: '#ef4444', icon: '💊', bg: 'rgba(239, 68, 68, 0.15)' },
  'Education': { color: '#3b82f6', icon: '📚', bg: 'rgba(59, 130, 246, 0.15)' },
  'Personal Care': { color: '#06b6d4', icon: '✨', bg: 'rgba(6, 182, 212, 0.15)' },
  'Miscellaneous': { color: '#94a3b8', icon: '📦', bg: 'rgba(148, 163, 184, 0.15)' }
};

// Application State
const state = {
  currentDate: new Date(),
  expenses: [],
  budgets: {},
  searchQuery: '',
  filterCategory: 'ALL'
};

// Sample realistic expenses for initial run
function getSampleExpenses(year, month) {
  const m = String(month + 1).padStart(2, '0');
  return [
    {
      id: 'demo-1',
      title: 'Monthly Apartment Rent',
      amount: 1450.00,
      category: 'Housing & Rent',
      date: `${year}-${m}-01`,
      paymentMethod: 'Bank Transfer',
      notes: 'Monthly fixed rent'
    },
    {
      id: 'demo-2',
      title: 'Trader Joe\'s Grocery Run',
      amount: 135.40,
      category: 'Food & Dining',
      date: `${year}-${m}-03`,
      paymentMethod: 'Credit Card',
      notes: 'Fresh groceries & pantry'
    },
    {
      id: 'demo-3',
      title: 'High-Speed Fiber Internet',
      amount: 75.00,
      category: 'Utilities & Bills',
      date: `${year}-${m}-05`,
      paymentMethod: 'Debit Card',
      notes: 'Home fiber optic wifi'
    },
    {
      id: 'demo-4',
      title: 'Metro Monthly Transit Card',
      amount: 85.00,
      category: 'Transportation',
      date: `${year}-${m}-07`,
      paymentMethod: 'Mobile / UPI',
      notes: 'Subway & bus monthly pass'
    },
    {
      id: 'demo-5',
      title: 'Dinner with Colleagues',
      amount: 68.50,
      category: 'Food & Dining',
      date: `${year}-${m}-10`,
      paymentMethod: 'Credit Card',
      notes: 'Downtown ramen house'
    },
    {
      id: 'demo-6',
      title: 'Gym & Fitness Membership',
      amount: 55.00,
      category: 'Healthcare',
      date: `${year}-${m}-12`,
      paymentMethod: 'Credit Card',
      notes: 'Monthly fitness club'
    },
    {
      id: 'demo-7',
      title: 'Streaming & Music Subscriptions',
      amount: 32.99,
      category: 'Entertainment',
      date: `${year}-${m}-14`,
      paymentMethod: 'Credit Card',
      notes: 'Netflix & Spotify'
    }
  ];
}

// Storage Helpers
function loadState() {
  const storedExpenses = localStorage.getItem('spendflow_v2_expenses');
  const storedBudgets = localStorage.getItem('spendflow_v2_budgets');

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const currentKey = getMonthKey(state.currentDate);

  if (storedExpenses) {
    try {
      state.expenses = JSON.parse(storedExpenses);
    } catch (e) {
      state.expenses = [];
    }
  } else {
    state.expenses = getSampleExpenses(year, month);
    saveExpenses();
  }

  if (storedBudgets) {
    try {
      state.budgets = JSON.parse(storedBudgets);
    } catch (e) {
      state.budgets = {};
    }
  }

  if (!state.budgets[currentKey]) {
    state.budgets[currentKey] = 2500;
    saveBudgets();
  }
}

function saveExpenses() {
  localStorage.setItem('spendflow_v2_expenses', JSON.stringify(state.expenses));
}

function saveBudgets() {
  localStorage.setItem('spendflow_v2_budgets', JSON.stringify(state.budgets));
}

function getMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Elements Cache
const elements = {
  // Navigation
  prevMonthBtn: document.getElementById('prev-month-btn'),
  currentMonthLabel: document.getElementById('current-month-label'),
  nextMonthBtn: document.getElementById('next-month-btn'),
  todayBtn: document.getElementById('today-btn'),
  exportCsvBtn: document.getElementById('export-csv-btn'),

  // KPIs
  kpiTotalSpent: document.getElementById('kpi-total-spent'),
  spentCountBadge: document.getElementById('spent-count-badge'),
  kpiDailyAverage: document.getElementById('kpi-daily-average'),
  budgetSavedTag: document.getElementById('budget-saved-tag'),
  inlineBudgetInput: document.getElementById('inline-budget-input'),
  saveInlineBudgetBtn: document.getElementById('save-inline-budget-btn'),
  budgetProgressFill: document.getElementById('budget-progress-fill'),
  kpiBudgetPercent: document.getElementById('kpi-budget-percent'),
  kpiRemainingBalance: document.getElementById('kpi-remaining-balance'),
  balanceStatusBadge: document.getElementById('balance-status-badge'),
  kpiSafeDailyAllowance: document.getElementById('kpi-safe-daily-allowance'),

  // Fast Quick Log Section
  addExpenseSection: document.getElementById('add-expense-section'),
  formSectionIcon: document.getElementById('form-section-icon'),
  formSectionTitle: document.getElementById('form-section-title'),
  formSectionSubtitle: document.getElementById('form-section-subtitle'),
  formMonthHint: document.getElementById('form-month-hint'),
  editingExpenseId: document.getElementById('editing-expense-id'),
  expenseTitleInput: document.getElementById('expense-title-input'),
  expenseAmountInput: document.getElementById('expense-amount-input'),
  expenseCategoryInput: document.getElementById('expense-category-input'),
  expenseDayInput: document.getElementById('expense-day-input'),
  dayPillToday: document.getElementById('day-pill-today'),
  dayPillYesterday: document.getElementById('day-pill-yesterday'),
  addExpenseSubmitBtn: document.getElementById('add-expense-submit-btn'),
  submitBtnText: document.getElementById('submit-btn-text'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  formErrorBanner: document.getElementById('form-error-banner'),
  formErrorText: document.getElementById('form-error-text'),

  // Analytics
  categoryCountBadge: document.getElementById('category-count-badge'),
  donutSvg: document.getElementById('donut-svg'),
  donutSegments: document.getElementById('donut-segments'),
  chartCenterAmount: document.getElementById('chart-center-amount'),
  categoryProgressList: document.getElementById('category-progress-list'),
  topExpensesCount: document.getElementById('top-expenses-count'),
  topExpensesList: document.getElementById('top-expenses-list'),

  // Records List
  recordsSubtitle: document.getElementById('records-subtitle'),
  expenseSearchInput: document.getElementById('expense-search-input'),
  categoryFilterSelect: document.getElementById('category-filter-select'),
  expensesContainer: document.getElementById('expenses-container'),
  emptyStateCard: document.getElementById('empty-state-card'),

  // Toast
  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toast-msg')
};

// Filter expenses for current active month
function getActiveMonthExpenses() {
  const currentKey = getMonthKey(state.currentDate);
  return state.expenses.filter(item => item.date && item.date.startsWith(currentKey));
}

// Populate Category Filter dropdown options
function populateCategoryFilterDropdown() {
  if (!elements.categoryFilterSelect) return;
  const currentVal = elements.categoryFilterSelect.value;
  elements.categoryFilterSelect.innerHTML = '<option value="ALL">All Categories</option>';
  
  Object.keys(CATEGORIES).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${CATEGORIES[cat].icon} ${cat}`;
    elements.categoryFilterSelect.appendChild(opt);
  });

  elements.categoryFilterSelect.value = currentVal || 'ALL';
}

// Render Dashboard & Recalculate everything
function renderDashboard() {
  const monthName = state.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentKey = getMonthKey(state.currentDate);
  const activeExpenses = getActiveMonthExpenses();

  // Update Month Labels
  elements.currentMonthLabel.textContent = monthName;
  elements.recordsSubtitle.textContent = `Showing expenses for ${monthName}`;
  elements.formMonthHint.textContent = monthName;

  // Calculate totals
  const totalSpent = activeExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const monthlyBudget = state.budgets[currentKey] || 2500;
  const remaining = monthlyBudget - totalSpent;
  const percentUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

  // Update inline budget input value if not actively focused
  if (document.activeElement !== elements.inlineBudgetInput) {
    elements.inlineBudgetInput.value = monthlyBudget;
  }

  // Calculate day-related metrics
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentCalendarMonth = (today.getFullYear() === year && today.getMonth() === month);
  const activeDay = isCurrentCalendarMonth ? today.getDate() : daysInMonth;
  const daysRemaining = Math.max(1, daysInMonth - activeDay);

  const dailyAvg = activeDay > 0 ? totalSpent / activeDay : 0;
  const safeDailySpend = remaining > 0 ? remaining / daysRemaining : 0;

  // 1. KPI: Total Spent
  elements.kpiTotalSpent.textContent = formatCurrency(totalSpent);
  elements.spentCountBadge.textContent = `${activeExpenses.length} ${activeExpenses.length === 1 ? 'item' : 'items'}`;
  elements.kpiDailyAverage.textContent = `Daily pace: ${formatCurrency(dailyAvg)} / day`;

  // 2. KPI: Monthly Budget & Progress Bar
  elements.kpiBudgetPercent.textContent = `${Math.min(999, Math.round(percentUsed))}% used`;

  const fillWidth = Math.min(100, Math.max(0, percentUsed));
  elements.budgetProgressFill.style.width = `${fillWidth}%`;
  elements.budgetProgressFill.className = 'budget-progress-fill';
  if (percentUsed >= 100) {
    elements.budgetProgressFill.classList.add('fill-danger');
  } else if (percentUsed >= 85) {
    elements.budgetProgressFill.classList.add('fill-warning');
  } else {
    elements.budgetProgressFill.classList.add('fill-safe');
  }

  // 3. KPI: Remaining Safe Balance
  elements.kpiRemainingBalance.textContent = formatCurrency(remaining);
  if (remaining < 0) {
    elements.kpiRemainingBalance.className = 'kpi-value text-danger';
    elements.balanceStatusBadge.className = 'kpi-badge badge-danger';
    elements.balanceStatusBadge.textContent = 'Over Budget';
    elements.kpiSafeDailyAllowance.textContent = `Exceeded by ${formatCurrency(Math.abs(remaining))}`;
  } else if (percentUsed >= 85) {
    elements.kpiRemainingBalance.className = 'kpi-value text-warning';
    elements.balanceStatusBadge.className = 'kpi-badge badge-warning';
    elements.balanceStatusBadge.textContent = 'Tight Pace';
    elements.kpiSafeDailyAllowance.textContent = `Safe daily spend: ${formatCurrency(safeDailySpend)} / day`;
  } else {
    elements.kpiRemainingBalance.className = 'kpi-value text-safe';
    elements.balanceStatusBadge.className = 'kpi-badge badge-safe';
    elements.balanceStatusBadge.textContent = 'On Track';
    elements.kpiSafeDailyAllowance.textContent = `Safe daily spend: ${formatCurrency(safeDailySpend)} / day`;
  }

  // Render Sub-components
  renderCategoryAnalytics(activeExpenses, totalSpent);
  renderTopExpenses(activeExpenses);
  renderExpensesList(activeExpenses);
}

// Render Category Breakdown and SVG Donut
function renderCategoryAnalytics(activeExpenses, totalSpent) {
  const categoryMap = {};
  activeExpenses.forEach(exp => {
    const cat = exp.category || 'Miscellaneous';
    categoryMap[cat] = (categoryMap[cat] || 0) + (parseFloat(exp.amount) || 0);
  });

  const categories = Object.keys(categoryMap).map(cat => ({
    name: cat,
    amount: categoryMap[cat],
    percent: totalSpent > 0 ? (categoryMap[cat] / totalSpent) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  elements.categoryCountBadge.textContent = `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`;
  elements.chartCenterAmount.textContent = formatCurrency(totalSpent);

  // Render SVG Donut
  elements.donutSegments.innerHTML = '';
  if (totalSpent > 0 && categories.length > 0) {
    const radius = 75;
    const circumference = 2 * Math.PI * radius; // ~471.24
    let accumulatedOffset = 0;

    categories.forEach(item => {
      const config = CATEGORIES[item.name] || CATEGORIES['Miscellaneous'];
      const segmentLength = (item.percent / 100) * circumference;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'donut-segment');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('stroke', config.color);
      circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', (-accumulatedOffset).toString());

      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tooltip.textContent = `${item.name}: ${formatCurrency(item.amount)} (${Math.round(item.percent)}%)`;
      circle.appendChild(tooltip);

      elements.donutSegments.appendChild(circle);
      accumulatedOffset += segmentLength;
    });
  }

  // Render Progress Bars List
  elements.categoryProgressList.innerHTML = '';
  if (categories.length === 0) {
    elements.categoryProgressList.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 1.5rem 0; font-size: 0.85rem;">
        No category expenses logged for this month.
      </div>
    `;
  } else {
    categories.forEach(item => {
      const config = CATEGORIES[item.name] || CATEGORIES['Miscellaneous'];
      const row = document.createElement('div');
      row.className = 'cat-item-row';
      row.innerHTML = `
        <div class="cat-item-info">
          <span class="cat-name-tag">
            <span class="cat-dot" style="background-color: ${config.color};"></span>
            <span>${config.icon} ${escapeHTML(item.name)}</span>
          </span>
          <span class="cat-amount-info">
            <span class="cat-val">${formatCurrency(item.amount)}</span>
            <span class="cat-pct">${Math.round(item.percent)}%</span>
          </span>
        </div>
        <div class="cat-track">
          <div class="cat-fill" style="width: ${Math.min(100, item.percent)}%; background-color: ${config.color};"></div>
        </div>
      `;
      elements.categoryProgressList.appendChild(row);
    });
  }
}

// Render Top 5 Largest Expenses
function renderTopExpenses(activeExpenses) {
  const sorted = [...activeExpenses].sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
  const top5 = sorted.slice(0, 5);

  elements.topExpensesCount.textContent = `${top5.length} ${top5.length === 1 ? 'item' : 'items'}`;
  elements.topExpensesList.innerHTML = '';

  if (top5.length === 0) {
    elements.topExpensesList.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 1.5rem 0; font-size: 0.85rem;">
        No expenses to display.
      </div>
    `;
    return;
  }

  top5.forEach((item, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const config = CATEGORIES[item.category] || CATEGORIES['Miscellaneous'];

    const div = document.createElement('div');
    div.className = 'top-expense-item';
    div.innerHTML = `
      <div class="top-item-left">
        <span class="top-rank-badge ${rankClass}">#${rank}</span>
        <div>
          <div class="top-item-title">${escapeHTML(item.title)}</div>
          <div class="top-item-meta">${config.icon} ${escapeHTML(item.category)} • ${formatDateDisplay(item.date)}</div>
        </div>
      </div>
      <div class="top-item-amount">-${formatCurrency(item.amount)}</div>
    `;
    elements.topExpensesList.appendChild(div);
  });
}

// Render Expenses List with Filters & Search
function renderExpensesList(activeExpenses) {
  let filtered = [...activeExpenses];

  // Category filter
  if (state.filterCategory && state.filterCategory !== 'ALL') {
    filtered = filtered.filter(item => item.category === state.filterCategory);
  }

  // Search filter
  if (state.searchQuery && state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => {
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchMethod = (item.paymentMethod || '').toLowerCase().includes(q);
      const matchCategory = (item.category || '').toLowerCase().includes(q);
      return matchTitle || matchNotes || matchMethod || matchCategory;
    });
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  elements.expensesContainer.innerHTML = '';

  if (filtered.length === 0) {
    elements.emptyStateCard.classList.remove('hidden');
    elements.expensesContainer.classList.add('hidden');
    return;
  }

  elements.emptyStateCard.classList.add('hidden');
  elements.expensesContainer.classList.remove('hidden');

  filtered.forEach(item => {
    const config = CATEGORIES[item.category] || CATEGORIES['Miscellaneous'];
    const card = document.createElement('div');
    card.className = 'expense-card';
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="expense-left">
        <div class="expense-icon-badge" style="background: ${config.bg}; color: ${config.color};">
          ${config.icon}
        </div>
        <div>
          <div class="expense-title">${escapeHTML(item.title)}</div>
          <div class="expense-meta">
            <span>${formatDateDisplay(item.date)}</span>
            <span class="expense-cat-tag">${escapeHTML(item.category)}</span>
            ${item.paymentMethod ? `<span>• ${escapeHTML(item.paymentMethod)}</span>` : ''}
            ${item.notes ? `<span>• "${escapeHTML(item.notes)}"</span>` : ''}
          </div>
        </div>
      </div>
      <div class="expense-right">
        <span class="expense-amount">-${formatCurrency(item.amount)}</span>
        <div class="action-btns">
          <button type="button" class="action-icon-btn edit-btn" title="Edit on screen" data-id="${item.id}" aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            <span>Edit</span>
          </button>
          <button type="button" class="action-icon-btn delete-btn" title="Delete expense" data-id="${item.id}" aria-label="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span class="delete-btn-text"></span>
          </button>
        </div>
      </div>
    `;

    // Hook Edit Button to populate on-screen form
    card.querySelector('.edit-btn').addEventListener('click', () => startEditExpense(item.id));

    // Hook Two-Step Delete Button (No window.confirm, 100% iframe safe)
    const deleteBtn = card.querySelector('.delete-btn');
    const deleteBtnText = card.querySelector('.delete-btn-text');
    let deleteConfirmTimeout = null;

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (deleteBtn.classList.contains('confirm-delete')) {
        clearTimeout(deleteConfirmTimeout);
        deleteExpense(item.id);
      } else {
        deleteBtn.classList.add('confirm-delete');
        deleteBtnText.textContent = 'Delete?';

        deleteConfirmTimeout = setTimeout(() => {
          deleteBtn.classList.remove('confirm-delete');
          deleteBtnText.textContent = '';
        }, 3500);
      }
    });

    elements.expensesContainer.appendChild(card);
  });
}

// Toast Feedback System
let toastTimer = null;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toastMsg.textContent = message;
  elements.toast.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

// Show Form Error
function showFormError(msg) {
  elements.formErrorText.textContent = msg;
  elements.formErrorBanner.classList.remove('hidden');
}

function hideFormError() {
  elements.formErrorBanner.classList.add('hidden');
}

// Save Inline Budget directly on the screen
function handleSaveInlineBudget() {
  const newBudget = parseFloat(elements.inlineBudgetInput.value);

  if (isNaN(newBudget) || newBudget <= 0) {
    showToast('Please enter a valid positive target budget amount.');
    elements.inlineBudgetInput.focus();
    return;
  }

  const currentKey = getMonthKey(state.currentDate);
  state.budgets[currentKey] = newBudget;
  saveBudgets();
  renderDashboard();
  showToast(`Monthly budget set to ${formatCurrency(newBudget)}!`);
}

// Helper to get formatted date string for active month and selected day
function getConstructedDate(dayNumber) {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let validDay = parseInt(dayNumber, 10);
  if (isNaN(validDay) || validDay < 1) validDay = 1;
  if (validDay > daysInMonth) validDay = daysInMonth;

  const mm = String(month + 1).padStart(2, '0');
  const dd = String(validDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Start Editing an Expense directly in the on-screen form
function startEditExpense(id) {
  const item = state.expenses.find(e => e.id === id);
  if (!item) return;

  elements.editingExpenseId.value = item.id;
  elements.expenseTitleInput.value = item.title;
  elements.expenseAmountInput.value = item.amount;
  elements.expenseCategoryInput.value = item.category;

  // Extract day from date (YYYY-MM-DD)
  if (item.date) {
    const parts = item.date.split('-');
    if (parts.length === 3) {
      elements.expenseDayInput.value = parseInt(parts[2], 10);
    }
  }

  elements.dayPillToday.classList.remove('active');
  elements.dayPillYesterday.classList.remove('active');

  // Update appearance for editing
  elements.addExpenseSection.classList.add('edit-mode');
  elements.formSectionIcon.textContent = '✏️';
  elements.formSectionTitle.textContent = `Edit Expense: "${item.title}"`;
  elements.formSectionSubtitle.textContent = 'Change values below and press Enter or Save to update.';
  elements.submitBtnText.textContent = 'Save Changes';
  elements.cancelEditBtn.classList.remove('hidden');

  hideFormError();

  elements.addExpenseSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  elements.expenseTitleInput.focus();
}

// Cancel Editing and reset form back to normal "Log New Expense"
function cancelEditExpense() {
  elements.editingExpenseId.value = '';
  elements.expenseTitleInput.value = '';
  elements.expenseAmountInput.value = '';
  setDefaultDay();

  elements.addExpenseSection.classList.remove('edit-mode');
  elements.formSectionIcon.textContent = '⚡';
  elements.formSectionTitle.textContent = 'Quick Log Expense';
  elements.formSectionSubtitle.innerHTML = `Log for <span id="form-month-hint" class="font-bold">${elements.currentMonthLabel.textContent}</span> • Press <kbd class="kbd-hint">Enter ↵</kbd> to save instantly`;
  elements.submitBtnText.textContent = 'Log Expense';
  elements.cancelEditBtn.classList.add('hidden');

  hideFormError();
}

// Add or Update Expense Handler (Uses same on-screen form, ZERO page reloads)
function handleAddOrUpdateExpense() {
  hideFormError();

  const editingId = elements.editingExpenseId.value;
  const title = elements.expenseTitleInput.value.trim();
  const amount = parseFloat(elements.expenseAmountInput.value);
  const category = elements.expenseCategoryInput.value;
  const dayVal = elements.expenseDayInput.value;
  const date = getConstructedDate(dayVal);

  if (!title) {
    showFormError('Please enter what you bought (description).');
    elements.expenseTitleInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showFormError('Please enter a valid positive dollar amount.');
    elements.expenseAmountInput.focus();
    return;
  }

  if (editingId) {
    // Update existing
    const idx = state.expenses.findIndex(e => e.id === editingId);
    if (idx !== -1) {
      state.expenses[idx] = {
        ...state.expenses[idx],
        title,
        amount,
        category,
        date
      };
      saveExpenses();
      cancelEditExpense();
      renderDashboard();
      showToast(`Updated: ${title} (${formatCurrency(amount)})`);
    }
  } else {
    // Add new
    const newExpense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title,
      amount,
      category,
      date,
      paymentMethod: 'Credit Card',
      notes: ''
    };

    state.expenses.unshift(newExpense);
    saveExpenses();

    // Reset inputs for next fast entry
    elements.expenseTitleInput.value = '';
    elements.expenseAmountInput.value = '';
    hideFormError();

    renderDashboard();
    showToast(`Logged: ${title} (${formatCurrency(amount)})`);

    // Keep focus on title for rapid-fire logging
    elements.expenseTitleInput.focus();
  }
}

// Delete Expense Handler (Invoked after inline confirmation)
function deleteExpense(id) {
  const item = state.expenses.find(e => e.id === id);
  if (!item) return;

  state.expenses = state.expenses.filter(e => e.id !== id);
  saveExpenses();

  if (elements.editingExpenseId.value === id) {
    cancelEditExpense();
  }

  renderDashboard();
  showToast(`Deleted "${item.title}"`);
}

// Month Navigation Handlers
function changeMonth(delta) {
  state.currentDate.setMonth(state.currentDate.getMonth() + delta);
  if (elements.editingExpenseId.value) {
    cancelEditExpense();
  }
  setDefaultDay();
  renderDashboard();
}

function jumpToCurrentMonth() {
  state.currentDate = new Date();
  if (elements.editingExpenseId.value) {
    cancelEditExpense();
  }
  setDefaultDay();
  renderDashboard();
}

// Set default day number matching active view month
function setDefaultDay() {
  const now = new Date();
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  if (now.getFullYear() === year && now.getMonth() === month) {
    elements.expenseDayInput.value = now.getDate();
    elements.dayPillToday.classList.add('active');
    elements.dayPillYesterday.classList.remove('active');
  } else {
    elements.expenseDayInput.value = '1';
    elements.dayPillToday.classList.remove('active');
    elements.dayPillYesterday.classList.remove('active');
  }
}

// Export Monthly Data to CSV
function exportMonthlyCSV() {
  const activeExpenses = getActiveMonthExpenses();
  if (activeExpenses.length === 0) {
    showToast('No expenses to export for this month.');
    return;
  }

  const headers = ['ID', 'Description', 'Amount ($)', 'Category', 'Date', 'Payment Method', 'Notes'];
  const rows = activeExpenses.map(exp => [
    `"${exp.id}"`,
    `"${(exp.title || '').replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
    `"${exp.category}"`,
    `"${exp.date}"`,
    `"${exp.paymentMethod || ''}"`,
    `"${(exp.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvString = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvString);
  const link = document.createElement('a');
  const monthKey = getMonthKey(state.currentDate);
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SpendFlow_Expenses_${monthKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${activeExpenses.length} records to CSV!`);
}

// Setup Event Listeners
function initEventListeners() {
  // Navigation
  elements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  elements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
  elements.todayBtn.addEventListener('click', jumpToCurrentMonth);

  // Inline Budget Saving (Click button or Press Enter in budget input)
  elements.saveInlineBudgetBtn.addEventListener('click', handleSaveInlineBudget);
  elements.inlineBudgetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInlineBudget();
    }
  });

  // Fast Day Pills (Today / Yesterday)
  elements.dayPillToday.addEventListener('click', () => {
    const today = new Date();
    elements.expenseDayInput.value = today.getDate();
    elements.dayPillToday.classList.add('active');
    elements.dayPillYesterday.classList.remove('active');
  });

  elements.dayPillYesterday.addEventListener('click', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    elements.expenseDayInput.value = yesterday.getDate();
    elements.dayPillYesterday.classList.add('active');
    elements.dayPillToday.classList.remove('active');
  });

  elements.expenseDayInput.addEventListener('input', () => {
    elements.dayPillToday.classList.remove('active');
    elements.dayPillYesterday.classList.remove('active');
  });

  // Fast Add / Edit Actions
  elements.addExpenseSubmitBtn.addEventListener('click', handleAddOrUpdateExpense);
  elements.cancelEditBtn.addEventListener('click', cancelEditExpense);

  // Fast Enter key to save across all input fields!
  const inputs = [elements.expenseTitleInput, elements.expenseAmountInput, elements.expenseDayInput];
  inputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateExpense();
      }
    });
    input.addEventListener('input', hideFormError);
  });

  // Search & Filter
  elements.expenseSearchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderExpensesList(getActiveMonthExpenses());
  });

  elements.categoryFilterSelect.addEventListener('change', e => {
    state.filterCategory = e.target.value;
    renderExpensesList(getActiveMonthExpenses());
  });

  // CSV Export
  elements.exportCsvBtn.addEventListener('click', exportMonthlyCSV);

  // Escape key cancels edit mode if active
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && elements.editingExpenseId.value) {
      cancelEditExpense();
    }
  });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  populateCategoryFilterDropdown();
  setDefaultDay();
  initEventListeners();
  renderDashboard();
});
