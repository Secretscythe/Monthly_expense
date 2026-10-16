# SpendFlow - Monthly Expense Tracker 💸

A fast, clean, and modern monthly expense tracker built to work seamlessly on both **GitHub Pages** (vanilla HTML5/CSS3/JS) and **Streamlit Cloud** (Python wrapper).

![Status](https://img.shields.io/badge/Status-Complete-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Compatible-GitHub%20Pages%20%7C%20Streamlit-brightgreen?style=for-the-badge)

---

## ✨ Features

- **Dashboard & Real-time KPIs**: Instant tracking of Total Spent, Monthly Target Budget, and Remaining Safe Balance.
- **Budget Pacing & Safe Daily Spend**: Automatically computes safe daily spending allowance based on days remaining in the month.
- **Visual Category Analytics**: Dynamic SVG Donut chart and category spending progress bars with percentages.
- **Quick Log Entry**: Fast inline form to log expenses in seconds with description, amount, category, date, and payment method.
- **Month-by-Month Navigation**: Effortlessly step forward/backward through months, jump to today's month, and customize budget per month.
- **Search & Filter**: Real-time search across titles, notes, and payment methods plus category filter.
- **Top 5 Largest Outflows**: Instant glance at the highest single expenses of the month with ranked badges.
- **Edit & Delete**: Full modal editing and delete controls for every recorded transaction.
- **Offline & Persistent**: Automatically preserves all records and budgets in browser `localStorage`.
- **CSV Data Export**: One-click download of the active month's expense records.
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
