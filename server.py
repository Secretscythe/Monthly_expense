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

def send_real_email(to_email, code):
    load_env()
    gmail_user = os.environ.get('GMAIL_USER', '').strip()
    gmail_pass = os.environ.get('GMAIL_APP_PASSWORD', '').strip()

    if not gmail_user or not gmail_pass or 'your_email' in gmail_user:
        print("\n[SpendFlow SMTP] ⚠️ GMAIL_USER or GMAIL_APP_PASSWORD is not configured in .env.")
        print(f"[SpendFlow SMTP] Target Email: {to_email}")
        print(f"[SpendFlow SMTP] Security Code: {code}")
        print("[SpendFlow SMTP] To send real emails, set GMAIL_USER and GMAIL_APP_PASSWORD in .env\n")
        return False, "Gmail credentials not configured in .env. Please configure GMAIL_USER and GMAIL_APP_PASSWORD."

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"SpendFlow - Your Verification Code is {code}"
    msg['From'] = f"SpendFlow Security <{gmail_user}>"
    msg['To'] = to_email

    text_content = f"""Hello,

We received a request to reset your password on SpendFlow.

Your 6-digit security verification code is:

    {code}

This code is valid for 10 minutes.
If you did not request this code, you can safely ignore this email.

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
    <h1>Password Reset Request</h1>
    <p>We received a request to verify your identity and reset your account password. Enter this one-time security code to proceed:</p>
    
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


class SpendFlowHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/send-email':
            content_length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_length)
            try:
                data = json.loads(body_bytes.decode('utf-8'))
                to_email = data.get('to', '').strip()
                code = data.get('code', '').strip()

                if not to_email or not code:
                    self._send_json(400, {'success': False, 'message': 'Missing email or code.'})
                    return

                success, message = send_real_email(to_email, code)
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
