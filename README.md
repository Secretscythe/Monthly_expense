# SpendFlow - Monthly Expense Tracker 💸

A fast, clean, and modern monthly expense tracker built to work seamlessly on both **GitHub Pages** (vanilla HTML5/CSS3/JS) and **Streamlit Cloud** (Python wrapper).

![Status](https://img.shields.io/badge/Status-Complete-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Compatible-GitHub%20Pages%20%7C%20Streamlit-brightgreen?style=for-the-badge)

---

## ✨ Features

- **Interactive Monthly Calendar**: Full calendar grid with individual day accounting, per-day income/expense badges, and single-click day isolation.
- **Add & Deduct Tracking**: Dual-mode logging for income inflow (`+ Add`) and expense deductions (`− Deduct`) with 2-step verification for starting balance.
- **Net Savings & Savings Rate**: Automatic computation of net savings (`Income − Expenses`) and savings percentage.
- **Add, Rename, & Delete Categories**: Complete Category Manager to add custom categories, rename existing categories (with automatic transaction re-linking), customize emoji icons & color swatches, or delete categories with safe transaction reassignment.
- **Spending Trend Analytics**: Interactive daily and weekly spending chart with average, peak expense, period-over-period trendline, and hover breakdown.
- **Month-over-Month & YTD Totals**: 12-month historical performance table with spending change deltas (`▲ / ▼`), interactive month jumping, and Year-to-Date totals.
- **Visual Category Analytics**: Dynamic SVG Donut chart and category spending progress bars with percentages.
- **Quick Log Entry**: Fast inline form to log expenses and income in seconds with category, note, date, and amount.
- **Search & Filter**: Real-time filtering by transaction type (All, Deductions, Additions) and categories.
- **Robust Input Validation & Real-Time UX**: Instant visual validation with glowing red borders, shake animations, live character counters (Note 100 char limit, Category 32 char limit), numeric range checks, and safe date verification.
- **One-Click Sample Data & Clear**: Quickly load realistic demo financial data (bi-weekly salaries, rent, groceries, utilities, investments) across multiple months to explore charts and trends, or reset all logged entries to zero with safe two-step confirmation.
- **Offline & Persistent**: Automatically preserves all entries, budgets, and custom categories in browser `localStorage`.
- **CSV Data Export**: One-click download of the active month's financial records.
- **Dual Deployment Ready**:
  - Run directly as a static web app on **GitHub Pages**.
  - Run as an interactive app on **Streamlit / Streamlit Cloud**.

---

## 🚀 Running Locally

### Option 1: As a Web App (GitHub Pages style)

Simply open `index.html` in your browser, or run a lightweight local server:

```bash
# Using Python built-in server
python3 -m http.server 3000
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Using Streamlit

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Streamlit application:
```bash
streamlit run streamlit_app.py
```

---

## 🌐 Deploying

### GitHub Pages
1. Push this repository to GitHub.
2. In your repository settings, go to **Pages**.
3. Under **Build and deployment**, select `Deploy from a branch` and choose `main` / `/ (root)`.
4. Your tracker will be live at `https://<username>.github.io/<repo-name>/`.

### Streamlit Cloud
1. Connect your GitHub repository at [share.streamlit.io](https://share.streamlit.io).
2. Set the Main file path to `streamlit_app.py`.
3. Click **Deploy**!
