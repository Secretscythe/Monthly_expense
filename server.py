#!/usr/bin/env python3
"""
SpendFlow Development Server & Gmail SMTP Dispatcher
Serves the web application and dispatches real verification emails via Gmail SMTP.
"""
import http.server
import socketserver
import json
import os
import smtplib
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def load_env():
    env_file = os.path.join(DIRECTORY, '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

load_env()

def send_via_resend(api_key, to_email, subject, html_content, text_content):
    url = 'https://api.resend.com/emails'
    payload = {
        'from': 'SpendFlow Security <onboarding@resend.dev>',
        'to': [to_email],
        'subject': subject,
        'html': html_content,
        'text': text_content
    }
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'SpendFlow-Server/1.0'
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode('utf-8')
            print(f"[SpendFlow Resend] ✅ Email delivered via Resend API! {resp_body}")
            return True, "Verification email sent to your inbox via Resend."
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[SpendFlow Resend] ❌ HTTP Error {e.code}: {err_msg}")
        return False, f"Resend error ({e.code}): {err_msg}"
    except Exception as e:
        print(f"[SpendFlow Resend] ❌ Network error: {e}")
        return False, f"Resend network error: {str(e)}"

def send_via_emailjs(service_id, template_id, public_key, private_key, to_email, code, subject, intro):
    url = 'https://api.emailjs.com/api/v1.0/email/send'
    payload = {
        'service_id': service_id,
        'template_id': template_id,
        'user_id': public_key,
        'template_params': {
            'to_email': to_email,
            'email': to_email,
            'to': to_email,
            'to_name': to_email,
            'user_email': to_email,
            'recipient': to_email,
            'send_to': to_email,
            'name': to_email.split('@')[0],
            'code': code,
            'verification_code': code,
            'subject': subject,
            'message': f"{intro}\n\nYour 6-digit verification code is: {code}\n\nThis code is valid for 10 minutes."
        }
    }
    if private_key:
        payload['accessToken'] = private_key

    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://dashboard.emailjs.com',
        'Referer': 'https://dashboard.emailjs.com/'
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode('utf-8')
            print(f"[SpendFlow EmailJS] ✅ Email delivered via EmailJS to {to_email}! {resp_body}")
            return True, f"Verification code sent to {to_email} via EmailJS."
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[SpendFlow EmailJS] ❌ HTTP Error {e.code}: {err_msg}")
        return False, f"EmailJS error ({e.code}): {err_msg}"
    except Exception as e:
        print(f"[SpendFlow EmailJS] ❌ Network error: {e}")
        return False, f"EmailJS network error: {str(e)}"


def send_real_email(to_email, code, email_type='reset'):
    load_env()
    emailjs_service = os.environ.get('EMAILJS_SERVICE_ID', '').strip()
    emailjs_template = os.environ.get('EMAILJS_TEMPLATE_ID', '').strip()
    emailjs_public = os.environ.get('EMAILJS_PUBLIC_KEY', '').strip()
    emailjs_private = os.environ.get('EMAILJS_PRIVATE_KEY', '').strip()

    resend_key = os.environ.get('RESEND_API_KEY', '').strip()
    gmail_user = os.environ.get('GMAIL_USER', '').strip()
    gmail_pass = os.environ.get('GMAIL_APP_PASSWORD', '').strip()

    is_signup = (email_type == 'signup')
    subject = f"SpendFlow - Welcome! Your Verification Code is {code}" if is_signup else f"SpendFlow - Password Reset Code is {code}"
    headline = "Welcome to SpendFlow" if is_signup else "Password Reset Request"
    intro = "Thank you for creating an account with SpendFlow! Here is your 6-digit verification code to keep your account safe:" if is_signup else "We received a request to verify your identity and reset your account password. Enter this security code to proceed:"

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"SpendFlow Security <{gmail_user}>"
    msg['To'] = to_email

    text_content = f"""Hello,

{intro}

    {code}

This code is valid for 10 minutes.
If you did not request this, you can safely ignore this email.

Best regards,
The SpendFlow Security Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      margin: 0;
      padding: 30px 15px;
      color: #f1f5f9;
    }}
    .email-container {{
      max-width: 500px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 36px 28px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }}
    .brand-row {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }}
    .brand-icon {{
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-radius: 10px;
      display: inline-block;
      text-align: center;
      line-height: 42px;
      color: white;
      font-weight: 800;
      font-size: 22px;
    }}
    .brand-title {{
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }}
    .code-box {{
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .code-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a5b4fc;
      margin-bottom: 8px;
      font-weight: 600;
    }}
    .code-digits {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #818cf8;
    }}
    .expiry {{
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 8px;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="brand-row">
      <div class="brand-icon">$</div>
      <div class="brand-title">SpendFlow</div>
    </div>
    <h1>{headline}</h1>
    <p>{intro}</p>
    
    <div class="code-box">
      <div class="code-label">One-Time Security Verification Code</div>
      <div class="code-digits">{code}</div>
      <div class="expiry">Valid for 10 minutes</div>
    </div>

    <p>If you did not initiate this request, no changes have been made to your account. You can safely ignore this email.</p>

    <div class="footer">
      SpendFlow &bull; Monthly Expense & Income Tracker<br>
      Automated Security Verification Service
    </div>
  </div>
</body>
</html>
"""

    # 1. First priority: Check if EmailJS is configured (delivers to ANY email without domain restrictions)
    if emailjs_service and emailjs_template and emailjs_public:
        print(f"[SpendFlow] Dispatching via EmailJS to {to_email}...")
        ok, msg = send_via_emailjs(emailjs_service, emailjs_template, emailjs_public, emailjs_private, to_email, code, subject, intro)
        if ok:
            return True, msg
        print(f"[SpendFlow] EmailJS returned: {msg}. Falling back to secondary provider...")

    # 2. Second priority: Check if Resend API Key is configured
    if resend_key and resend_key.startswith('re_'):
        print(f"[SpendFlow] Dispatching via Resend to {to_email}...")
        return send_via_resend(resend_key, to_email, subject, html_content, text_content)

    # 3. Third priority: Check if Gmail SMTP is configured
    if gmail_user and gmail_pass and 'your_email' not in gmail_user:
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)

        try:
            print(f"[SpendFlow SMTP] Connecting to smtp.gmail.com:587 for recipient {to_email}...")
            server = smtplib.SMTP('smtp.gmail.com', 587, timeout=15)
            server.starttls()
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, [to_email], msg.as_string())
            server.quit()
            print(f"[SpendFlow SMTP] ✅ Successfully sent verification email to {to_email}!")
            return True, "Verification email delivered to your inbox."
        except Exception as e:
            print(f"[SpendFlow SMTP] ❌ SMTP Error sending to {to_email}: {e}")
            return False, str(e)

    # 4. None configured
    print("\n[SpendFlow Email] ⚠️ No email service configured in .env.")
    print(f"[SpendFlow Email] Target Email: {to_email}")
    print("[SpendFlow Email] Configure EmailJS or Resend in .env to deliver real verification codes.\n")
    return False, "Email service not configured. Please add EmailJS or Resend credentials in .env."


class SpendFlowHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            load_env()
            emailjs_service = os.environ.get('EMAILJS_SERVICE_ID', '').strip()
            emailjs_template = os.environ.get('EMAILJS_TEMPLATE_ID', '').strip()
            emailjs_public = os.environ.get('EMAILJS_PUBLIC_KEY', '').strip()
            resend_key = os.environ.get('RESEND_API_KEY', '').strip()
            gmail_user = os.environ.get('GMAIL_USER', '').strip()
            gmail_pass = os.environ.get('GMAIL_APP_PASSWORD', '').strip()

            is_emailjs = bool(emailjs_service and emailjs_template and emailjs_public)
            is_resend = bool(resend_key and resend_key.startswith('re_'))
            is_gmail = bool(gmail_user and gmail_pass and 'your_email' not in gmail_user)

            provider = 'emailjs' if is_emailjs else ('resend' if is_resend else ('gmail' if is_gmail else None))
            self._send_json(200, {
                'status': 'online',
                'configured': is_emailjs or is_resend or is_gmail,
                'provider': provider,
                'email': 'EmailJS Service' if is_emailjs else (gmail_user if is_gmail else ('Resend Service' if is_resend else None))
            })
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/send-email':
            content_length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_length)
            try:
                data = json.loads(body_bytes.decode('utf-8'))
                to_email = data.get('to', '').strip()
                code = data.get('code', '').strip()
                email_type = data.get('type', 'reset').strip()

                if not to_email or not code:
                    self._send_json(400, {'success': False, 'message': 'Missing email or code.'})
                    return

                success, message = send_real_email(to_email, code, email_type)
                self._send_json(200, {
                    'success': success,
                    'message': message,
                    'sentTo': to_email
                })
            except Exception as e:
                self._send_json(500, {'success': False, 'message': str(e)})
            return

        super().do_POST()

    def _send_json(self, status_code, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SpendFlowHTTPRequestHandler) as httpd:
        print(f"[SpendFlow] Server running at http://localhost:{PORT}/")
        print(f"[SpendFlow] Ready to dispatch real verification emails via Gmail SMTP.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


if __name__ == '__main__':
    run_server()
