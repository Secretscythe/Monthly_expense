import streamlit as st
import streamlit.components.v1 as components
import os
import re

# Configure page settings
st.set_page_config(
    page_title="SpendFlow | Daily & Weekly Money Tracker",
    page_icon="💸",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS to maximize viewport area and remove Streamlit default margins
st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
    }
    iframe {
        width: 100% !important;
        min-height: 100vh !important;
        border: none !important;
    }
</style>
""", unsafe_allow_html=True)

# Path to local assets
base_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

with open(os.path.join(base_dir, "style.css"), "r", encoding="utf-8") as f:
    css = f.read()

with open(os.path.join(base_dir, "app.js"), "r", encoding="utf-8") as f:
    js = f.read()

# Inline CSS and JS safely using lambda to avoid escape corruption
html = re.sub(r'<link\s+rel="stylesheet"\s+href="style\.css"\s*/?>', lambda _: f"<style>\n{css}\n</style>", html)
html = re.sub(r'<script\s+src="app\.js"\s*></script>', lambda _: f"<script>\n{js}\n</script>", html)

# Render HTML in Streamlit
components.html(html, height=1800, scrolling=True)
