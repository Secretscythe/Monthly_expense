/**
 * SpendFlow - Smart Monthly Expense Tracker
 */

// Category Definitions with distinct themes and emojis
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
  filterCategory: 'ALL',
  searchQuery: ''
};

// Seed sample data for an engaging first-time experience
function getInitialSampleData(year, month) {
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
      title: 'Whole Foods Market',
      amount: 142.60,
      category: 'Food & Dining',
      date: `${year}-${m}-04`,
      paymentMethod: 'Credit Card',
      notes: 'Weekly groceries & produce'
    },
    {
      id: 'demo-3',
      title: 'High-Speed Fiber Internet',
      amount: 75.00,
      category: 'Utilities & Bills',
      date: `${year}-${m}-05`,
      paymentMethod: 'Debit Card',
      notes: 'Gigabit fiber connection'
    },
    {
      id: 'demo-4',
      title: 'Metro Transit Pass',
      amount: 85.00,
      category: 'Transportation',
      date: `${year}-${m}-07`,
      paymentMethod: 'Apple / Google Pay',
      notes: 'Monthly subway & bus pass'
    },
    {
      id: 'demo-5',
      title: 'Dinner with Colleagues',
      amount: 68.50,
      category: 'Food & Dining',
      date: `${year}-${m}-09`,
      paymentMethod: 'Credit Card',
      notes: 'Italian bistro downtown'
    },
    {
      id: 'demo-6',
      title: 'Gym & Fitness Membership',
      amount: 55.00,
      category: 'Healthcare',
      date: `${year}-${m}-11`,
      paymentMethod: 'Credit Card',
      notes: 'Monthly gym fee'
    },
    {
      id: 'demo-7',
      title: 'Streaming & Media Subscriptions',
      amount: 32.99,
      category: 'Entertainment',
      date: `${year}-${m}-12`,
      paymentMethod: 'Credit Card',
      notes: 'Netflix & Spotify family'
    }
  ];
}

// Storage helpers
function loadState() {
  const storedExpenses = localStorage.getItem('spendflow_expenses');
  const storedBudgets = localStorage.getItem('spendflow_budgets');

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
    // Populate realistic default data
    state.expenses = getInitialSampleData(year, month);
    saveExpenses();
  }

  if (storedBudgets) {
    try {
      state.budgets = JSON.parse(storedBudgets);
    } catch (e) {
      state.budgets = {};
    }
  }

  // Ensure current month has a default budget if not set
  if (!state.budgets[currentKey]) {
    state.budgets[currentKey] = 2800;
    saveBudgets();
  }
}

function saveExpenses() {
  localStorage.setItem('spendflow_expenses', JSON.stringify(state.expenses));
}

function saveBudgets() {
  localStorage.setItem('spendflow_budgets', JSON.stringify(state.budgets));
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
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Elements Cache
const elements = {
  activeMonthLabel: document.getElementById('active-month-label'),
  prevMonthBtn: document.getElementById('prev-month-btn'),
  nextMonthBtn: document.getElementById('next-month-btn'),
  todayMonthBtn: document.getElementById('today-month-btn'),
  exportBtn: document.getElementById('export-btn'),
  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  emptyAddBtn: document.getElementById('empty-add-btn'),

  // KPIs
  kpiTotalSpent: document.getElementById('kpi-total-spent'),
  kpiDailyAvg: document.getElementById('kpi-daily-avg'),
  spentCountBadge: document.getElementById('spent-count-badge'),
  kpiBudgetAmount: document.getElementById('kpi-budget-amount'),
  budgetProgressBar: document.getElementById('budget-progress-bar'),
  kpiBudgetPercent: document.getElementById('kpi-budget-percent'),
  kpiBudgetCapLabel: document.getElementById('kpi-budget-cap-label'),
  kpiRemainingAmount: document.getElementById('kpi-remaining-amount'),
  budgetStatusPill: document.getElementById('budget-status-pill'),
  kpiSafeDailySpend: document.getElementById('kpi-safe-daily-spend'),
  editBudgetBtn: document.getElementById('edit-budget-btn'),

  // Visuals & Breakdown
  categoryCountLabel: document.getElementById('category-count-label'),
  chartCenterAmount: document.getElementById('chart-center-amount'),
  donutSegmentsGroup: document.getElementById('donut-segments'),
  categoryBreakdownList: document.getElementById('category-breakdown-list'),
  topCategoryName: document.getElementById('top-category-name'),
  highestExpenseLabel: document.getElementById('highest-expense-label'),
  totalTxnCount: document.getElementById('total-txn-count'),

  // Transaction list & filters
  transactionsContainer: document.getElementById('transactions-container'),
  emptyState: document.getElementById('empty-state'),
  expenseSearchInput: document.getElementById('expense-search-input'),
  categoryFilterSelect: document.getElementById('category-filter-select'),
  historySubtitle: document.getElementById('history-subtitle'),

  // Expense Modal
  expenseModal: document.getElementById('expense-modal'),
  modalTitle: document.getElementById('modal-title'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  expenseForm: document.getElementById('expense-form'),
  editExpenseId: document.getElementById('edit-expense-id'),
  formTitle: document.getElementById('form-title'),
  formAmount: document.getElementById('form-amount'),
  formDate: document.getElementById('form-date'),
  formCategory: document.getElementById('form-category'),
  formPayment: document.getElementById('form-payment'),
  formNotes: document.getElementById('form-notes'),

  // Budget Modal
  budgetModal: document.getElementById('budget-modal'),
  budgetTargetMonth: document.getElementById('budget-target-month'),
  budgetInput: document.getElementById('budget-input'),
  closeBudgetModalBtn: document.getElementById('close-budget-modal-btn'),
  cancelBudgetModalBtn: document.getElementById('cancel-budget-modal-btn'),
  budgetForm: document.getElementById('budget-form'),

  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// Filter expenses for current active month
function getActiveMonthExpenses() {
  const currentKey = getMonthKey(state.currentDate);
  return state.expenses.filter(item => {
    return item.date && item.date.startsWith(currentKey);
  });
}

// Render Header & Month info
function renderHeader() {
  const monthName = state.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  elements.activeMonthLabel.textContent = monthName;
  elements.historySubtitle.textContent = `Showing expenses for ${monthName}`;
  elements.budgetTargetMonth.textContent = monthName;
}

// Recalculate KPIs and Render Dashboard
function updateDashboard() {
  renderHeader();
  const currentKey = getMonthKey(state.currentDate);
  const monthExpenses = getActiveMonthExpenses();

  const totalSpent = monthExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const currentBudget = state.budgets[currentKey] || 2500;
  const remaining = currentBudget - totalSpent;
  const percentUsed = currentBudget > 0 ? (totalSpent / currentBudget) * 100 : 0;

  // Days calculations
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const isCurrentCalendarMonth = (now.getFullYear() === year && now.getMonth() === month);
  const activeDay = isCurrentCalendarMonth ? now.getDate() : daysInMonth;
  const daysRemaining = Math.max(1, daysInMonth - activeDay);

  const dailyAvg = activeDay > 0 ? totalSpent / activeDay : 0;
  const safeDailySpend = remaining > 0 ? remaining / daysRemaining : 0;

  // Update KPI 1: Spent
  elements.kpiTotalSpent.textContent = formatCurrency(totalSpent);
  elements.spentCountBadge.textContent = `${monthExpenses.length} ${monthExpenses.length === 1 ? 'item' : 'items'}`;
  elements.kpiDailyAvg.textContent = `Daily avg: ${formatCurrency(dailyAvg)} / day`;

  // Update KPI 2: Budget
  elements.kpiBudgetAmount.textContent = formatCurrency(currentBudget);
  elements.kpiBudgetPercent.textContent = `${Math.min(999, Math.round(percentUsed))}% used`;
  elements.kpiBudgetCapLabel.textContent = `Target: ${formatCurrency(currentBudget)}`;

  const fillWidth = Math.min(100, Math.max(0, percentUsed));
  elements.budgetProgressBar.style.width = `${fillWidth}%`;
  elements.budgetProgressBar.className = 'budget-progress-fill';
  if (percentUsed >= 100) {
    elements.budgetProgressBar.classList.add('status-exceeded');
  } else if (percentUsed >= 85) {
    elements.budgetProgressBar.classList.add('status-warning');
  }

  // Update KPI 3: Remaining
  elements.kpiRemainingAmount.textContent = formatCurrency(remaining);
  if (remaining < 0) {
    elements.kpiRemainingAmount.style.color = 'var(--accent-danger)';
    elements.budgetStatusPill.className = 'kpi-badge badge-danger';
    elements.budgetStatusPill.innerHTML = `<span>Over Budget</span>`;
    elements.kpiSafeDailySpend.textContent = `Exceeded by ${formatCurrency(Math.abs(remaining))}`;
  } else if (percentUsed >= 85) {
    elements.kpiRemainingAmount.style.color = 'var(--accent-warning)';
    elements.budgetStatusPill.className = 'kpi-badge badge-warning';
    elements.budgetStatusPill.innerHTML = `<span>Tight Pace</span>`;
    elements.kpiSafeDailySpend.textContent = `Safe spend: ${formatCurrency(safeDailySpend)} / day`;
  } else {
    elements.kpiRemainingAmount.style.color = '#34d399';
    elements.budgetStatusPill.className = 'kpi-badge badge-safe';
    elements.budgetStatusPill.innerHTML = `<span>On Track</span>`;
    elements.kpiSafeDailySpend.textContent = `Safe spend: ${formatCurrency(safeDailySpend)} / day`;
  }

  // Render Charts & Categories
  renderVisualAnalytics(monthExpenses, totalSpent);

  // Render Transaction List
  renderTransactions(monthExpenses);
}

// Render Category Breakdown & SVG Donut Chart
function renderVisualAnalytics(monthExpenses, totalSpent) {
  // Aggregate by category
  const categoryMap = {};
  let highestExpense = null;

  monthExpenses.forEach(exp => {
    const cat = exp.category || 'Miscellaneous';
    const amt = parseFloat(exp.amount) || 0;
    categoryMap[cat] = (categoryMap[cat] || 0) + amt;

    if (!highestExpense || amt > highestExpense.amount) {
      highestExpense = exp;
    }
  });

  const categories = Object.keys(categoryMap).map(cat => ({
    name: cat,
    amount: categoryMap[cat],
    percent: totalSpent > 0 ? (categoryMap[cat] / totalSpent) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  elements.categoryCountLabel.textContent = `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`;
  elements.chartCenterAmount.textContent = formatCurrency(totalSpent);

  // Quick stats
  elements.totalTxnCount.textContent = monthExpenses.length;
  elements.topCategoryName.textContent = categories.length > 0 ? categories[0].name : '—';
  elements.highestExpenseLabel.textContent = highestExpense ? `${highestExpense.title} (${formatCurrency(highestExpense.amount)})` : '—';

  // Render Category Bars
  elements.categoryBreakdownList.innerHTML = '';
  if (categories.length === 0) {
    elements.categoryBreakdownList.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 20px 0; font-size: 0.85rem;">
        No category data available
      </div>
    `;
  } else {
    categories.forEach(item => {
      const config = CATEGORIES[item.name] || CATEGORIES['Miscellaneous'];
      const row = document.createElement('div');
      row.className = 'category-bar-item';
      row.innerHTML = `
        <div class="cat-bar-header">
          <div class="cat-name-tag">
            <span class="cat-dot" style="background-color: ${config.color};"></span>
            <span>${config.icon} ${item.name}</span>
          </div>
          <div class="cat-amount-info">
            <span class="cat-total-money">${formatCurrency(item.amount)}</span>
            <span class="cat-percentage">${Math.round(item.percent)}%</span>
          </div>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-fill" style="width: ${item.percent}%; background-color: ${config.color};"></div>
        </div>
      `;
      elements.categoryBreakdownList.appendChild(row);
    });
  }

  // Draw SVG Donut Chart
  renderDonutChart(categories, totalSpent);
}

// Render dynamic SVG Donut Chart
function renderDonutChart(categories, totalSpent) {
  elements.donutSegmentsGroup.innerHTML = '';
  if (totalSpent <= 0 || categories.length === 0) return;

  const radius = 75;
  const circumference = 2 * Math.PI * radius; // approx 471.24
  let accumulatedOffset = 0;

  categories.forEach(cat => {
    const config = CATEGORIES[cat.name] || CATEGORIES['Miscellaneous'];
    const segmentLength = (cat.percent / 100) * circumference;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'donut-segment');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('stroke', config.color);
    circle.setAttribute('stroke-dasharray', `${segmentLength} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', (-accumulatedOffset).toString());

    // Title tooltip on hover
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${cat.name}: ${formatCurrency(cat.amount)} (${Math.round(cat.percent)}%)`;
    circle.appendChild(title);

    elements.donutSegmentsGroup.appendChild(circle);
    accumulatedOffset += segmentLength;
  });
}

// Render Transactions List with search & category filters
function renderTransactions(monthExpenses) {
  elements.transactionsContainer.innerHTML = '';

  let filtered = [...monthExpenses];

  // Category filter
  if (state.filterCategory !== 'ALL') {
    filtered = filtered.filter(exp => exp.category === state.filterCategory);
  }

  // Search filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(exp => {
      const matchTitle = (exp.title || '').toLowerCase().includes(q);
      const matchNotes = (exp.notes || '').toLowerCase().includes(q);
      const matchMethod = (exp.paymentMethod || '').toLowerCase().includes(q);
      return matchTitle || matchNotes || matchMethod;
    });
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    elements.emptyState.classList.remove('hidden');
    elements.transactionsContainer.classList.add('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.transactionsContainer.classList.remove('hidden');

  filtered.forEach(exp => {
    const catConfig = CATEGORIES[exp.category] || CATEGORIES['Miscellaneous'];
    const card = document.createElement('div');
    card.className = 'transaction-card';
    card.dataset.id = exp.id;

    card.innerHTML = `
      <div class="txn-left">
        <div class="txn-icon" style="background: ${catConfig.bg}; color: ${catConfig.color};">
          ${catConfig.icon}
        </div>
        <div class="txn-details">
          <div class="txn-title-row">
            <span class="txn-title">${escapeHTML(exp.title)}</span>
            <span class="txn-badge">${escapeHTML(exp.category)}</span>
          </div>
          <div class="txn-meta">
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="18" y2="10"></line></svg>
              ${formatDate(exp.date)}
            </span>
            ${exp.paymentMethod ? `<span>• ${escapeHTML(exp.paymentMethod)}</span>` : ''}
            ${exp.notes ? `<span class="txn-notes">• "${escapeHTML(exp.notes)}"</span>` : ''}
          </div>
        </div>
      </div>
      <div class="txn-right">
        <span class="txn-amount">-${formatCurrency(exp.amount)}</span>
        <div class="txn-actions">
          <button class="txn-action-btn edit-btn" title="Edit expense" data-id="${exp.id}" aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="txn-action-btn delete-btn" title="Delete expense" data-id="${exp.id}" aria-label="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    // Attach listeners
    card.querySelector('.edit-btn').addEventListener('click', () => openEditExpenseModal(exp.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(exp.id));

    elements.transactionsContainer.appendChild(card);
  });
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

// Show Toast feedback
let toastTimeout;
function showToast(message, isSuccess = true) {
  clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

// Modals Handling
function openAddExpenseModal() {
  elements.modalTitle.textContent = 'Add New Expense';
  elements.editExpenseId.value = '';
  elements.expenseForm.reset();

  // Set default date to today or within current view month
  const now = new Date();
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  let defaultDate;
  if (now.getFullYear() === year && now.getMonth() === month) {
    defaultDate = now.toISOString().split('T')[0];
  } else {
    defaultDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  }

  elements.formDate.value = defaultDate;
  elements.formCategory.value = 'Food & Dining';
  elements.formPayment.value = 'Credit Card';

  elements.expenseModal.classList.remove('hidden');
  elements.formTitle.focus();
}

function openEditExpenseModal(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;

  elements.modalTitle.textContent = 'Edit Expense';
  elements.editExpenseId.value = expense.id;
  elements.formTitle.value = expense.title;
  elements.formAmount.value = expense.amount;
  elements.formDate.value = expense.date;
  elements.formCategory.value = expense.category;
  elements.formPayment.value = expense.paymentMethod || 'Credit Card';
  elements.formNotes.value = expense.notes || '';

  elements.expenseModal.classList.remove('hidden');
  elements.formTitle.focus();
}

function closeExpenseModal() {
  elements.expenseModal.classList.add('hidden');
}

function openBudgetModal() {
  const currentKey = getMonthKey(state.currentDate);
  const currentBudget = state.budgets[currentKey] || 2500;
  elements.budgetInput.value = currentBudget;
  elements.budgetModal.classList.remove('hidden');
  elements.budgetInput.focus();
}

function closeBudgetModal() {
  elements.budgetModal.classList.add('hidden');
}

// Expense Actions
function handleExpenseSubmit(e) {
  e.preventDefault();

  const id = elements.editExpenseId.value;
  const title = elements.formTitle.value.trim();
  const amount = parseFloat(elements.formAmount.value);
  const date = elements.formDate.value;
  const category = elements.formCategory.value;
  const paymentMethod = elements.formPayment.value;
  const notes = elements.formNotes.value.trim();

  if (!title || isNaN(amount) || amount <= 0 || !date) {
    showToast('Please fill out all required fields correctly.');
    return;
  }

  if (id) {
    // Update existing
    const index = state.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      state.expenses[index] = {
        ...state.expenses[index],
        title,
        amount,
        date,
        category,
        paymentMethod,
        notes
      };
      showToast('Expense updated successfully!');
    }
  } else {
    // Add new
    const newExpense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title,
      amount,
      date,
      category,
      paymentMethod,
      notes
    };
    state.expenses.unshift(newExpense);
    showToast('Expense added successfully!');
  }

  saveExpenses();
  closeExpenseModal();
  updateDashboard();
}

function deleteExpense(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;

  if (confirm(`Are you sure you want to delete "${expense.title}"?`)) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveExpenses();
    updateDashboard();
    showToast('Expense deleted.');
  }
}

function handleBudgetSubmit(e) {
  e.preventDefault();
  const newBudget = parseFloat(elements.budgetInput.value);
  if (isNaN(newBudget) || newBudget <= 0) {
    showToast('Please enter a valid budget amount.');
    return;
  }

  const currentKey = getMonthKey(state.currentDate);
  state.budgets[currentKey] = newBudget;
  saveBudgets();
  closeBudgetModal();
  updateDashboard();
  showToast('Monthly budget updated!');
}

// Month Navigation
function changeMonth(delta) {
  state.currentDate.setMonth(state.currentDate.getMonth() + delta);
  updateDashboard();
}

function jumpToCurrentMonth() {
  state.currentDate = new Date();
  updateDashboard();
}

// Export to CSV
function exportMonthlyCSV() {
  const monthExpenses = getActiveMonthExpenses();
  if (monthExpenses.length === 0) {
    showToast('No expenses to export for this month.');
    return;
  }

  const headers = ['ID', 'Title', 'Amount ($)', 'Category', 'Date', 'Payment Method', 'Notes'];
  const rows = monthExpenses.map(exp => [
    `"${exp.id}"`,
    `"${(exp.title || '').replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
    `"${exp.category}"`,
    `"${exp.date}"`,
    `"${exp.paymentMethod || ''}"`,
    `"${(exp.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  const monthKey = getMonthKey(state.currentDate);
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SpendFlow_Expenses_${monthKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${monthExpenses.length} records to CSV!`);
}

// Event Listeners Initialization
function initEventListeners() {
  elements.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  elements.nextMonthBtn.addEventListener('click', () => changeMonth(1));
  elements.todayMonthBtn.addEventListener('click', jumpToCurrentMonth);

  elements.openAddModalBtn.addEventListener('click', openAddExpenseModal);
  elements.emptyAddBtn.addEventListener('click', openAddExpenseModal);
  elements.closeModalBtn.addEventListener('click', closeExpenseModal);
  elements.cancelModalBtn.addEventListener('click', closeExpenseModal);

  elements.editBudgetBtn.addEventListener('click', openBudgetModal);
  elements.closeBudgetModalBtn.addEventListener('click', closeBudgetModal);
  elements.cancelBudgetModalBtn.addEventListener('click', closeBudgetModal);

  elements.expenseForm.addEventListener('submit', handleExpenseSubmit);
  elements.budgetForm.addEventListener('submit', handleBudgetSubmit);

  elements.exportBtn.addEventListener('click', exportMonthlyCSV);

  // Filters
  elements.categoryFilterSelect.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    renderTransactions(getActiveMonthExpenses());
  });

  elements.expenseSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTransactions(getActiveMonthExpenses());
  });

  // Modal Backdrop Click to close
  elements.expenseModal.addEventListener('click', (e) => {
    if (e.target === elements.expenseModal) closeExpenseModal();
  });
  elements.budgetModal.addEventListener('click', (e) => {
    if (e.target === elements.budgetModal) closeBudgetModal();
  });

  // Escape key to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExpenseModal();
      closeBudgetModal();
    }
  });
}

// App Launch
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initEventListeners();
  updateDashboard();
});
