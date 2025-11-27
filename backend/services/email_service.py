import os
from typing import List
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from starlette.background import BackgroundTasks
from jinja2 import Environment, select_autoescape, PackageLoader
from dotenv import load_dotenv
load_dotenv()

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@topoi.app"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

class EmailService:
    def __init__(self):
        self.fastmail = FastMail(conf)
        # Simple HTML templates
        self.verification_template = """
        <html>
            <body>
                <h1>Verify your email</h1>
                <p>Click the link below to verify your email address:</p>
                <a href="{link}">Verify Email</a>
            </body>
        </html>
        """
        self.reset_password_template = """
        <html>
            <body>
                <h1>Reset your password</h1>
                <p>Click the link below to reset your password:</p>
                <a href="{link}">Reset Password</a>
            </body>
        </html>
        """

    async def send_verification_email(self, email: EmailStr, token: str, background_tasks: BackgroundTasks):
        """Send verification email"""
        # In a real app, use a proper frontend URL
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        link = f"{frontend_url}/verify-email?token={token}"
        
        message = MessageSchema(
            subject="Verify your Topoi account",
            recipients=[email],
            body=self.verification_template.format(link=link),
            subtype=MessageType.html
        )
        
        try:
            background_tasks.add_task(self.fastmail.send_message, message)
        except Exception as e:
            print(f"Failed to send email: {e}")
            # In production, you might want to raise this or handle it differently
            # For now, we allow it to fail silently so development works without SMTP

    async def send_password_reset_email(self, email: EmailStr, token: str, background_tasks: BackgroundTasks):
        """Send password reset email"""
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        link = f"{frontend_url}/reset-password?token={token}"
        
        message = MessageSchema(
            subject="Reset your Topoi password",
            recipients=[email],
            body=self.reset_password_template.format(link=link),
            subtype=MessageType.html
        )
        
        try:
            background_tasks.add_task(self.fastmail.send_message, message)
        except Exception as e:
            print(f"Failed to send email: {e}")
