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

    def _get_base_template(self, content: str) -> str:
        """Base email template with Topoi branding - responsive for desktop and mobile"""
        return f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Topoi</title>
    <!--[if mso]>
    <style type="text/css">
        table {{border-collapse: collapse; border-spacing: 0; margin: 0;}}
        div, td {{padding: 0;}}
        div {{margin: 0 !important;}}
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 24px 24px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <!-- Logo/Icon -->
                                        <div style="width: 48px; height: 48px; background-color: #3B82F6; border-radius: 10px; display: inline-block; line-height: 48px; font-size: 24px;">
                                            📍
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 12px;">
                                        <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Topoi</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px; background-color: #f9fafb; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                                This email was sent by Topoi
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                If you didn't request this email, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                </table>
                <!-- Bottom text -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                © 2025 Topoi. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    def _get_verification_content(self, link: str) -> str:
        """Verification email content"""
        return f'''
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
        <td align="center">
            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 600;">Verify your email</h2>
        </td>
    </tr>
    <tr>
        <td>
            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">
                Thanks for signing up! Please verify your email address to complete your registration and start mapping your favorite places.
            </p>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 8px 0 24px 0;">
            <!-- Button -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="background-color: #3B82F6; border-radius: 8px;">
                        <a href="{link}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center;">
                            Verify Email Address
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td>
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; text-align: center;">
                Or copy and paste this link into your browser:
            </p>
            <p style="margin: 0; padding: 12px 16px; background-color: #f3f4f6; border-radius: 8px; word-break: break-all;">
                <a href="{link}" style="color: #3B82F6; font-size: 12px; text-decoration: none;">{link}</a>
            </p>
        </td>
    </tr>
    <tr>
        <td style="padding-top: 24px;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This link will expire in 24 hours.
            </p>
        </td>
    </tr>
</table>
'''

    def _get_reset_password_content(self, link: str) -> str:
        """Password reset email content"""
        return f'''
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
        <td align="center">
            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 600;">Reset your password</h2>
        </td>
    </tr>
    <tr>
        <td>
            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">
                We received a request to reset your password. Click the button below to create a new password for your Topoi account.
            </p>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 8px 0 24px 0;">
            <!-- Button -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="background-color: #3B82F6; border-radius: 8px;">
                        <a href="{link}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center;">
                            Reset Password
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td>
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; text-align: center;">
                Or copy and paste this link into your browser:
            </p>
            <p style="margin: 0; padding: 12px 16px; background-color: #f3f4f6; border-radius: 8px; word-break: break-all;">
                <a href="{link}" style="color: #3B82F6; font-size: 12px; text-decoration: none;">{link}</a>
            </p>
        </td>
    </tr>
    <tr>
        <td style="padding-top: 24px;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.
            </p>
        </td>
    </tr>
</table>
'''

    async def send_verification_email(self, email: EmailStr, token: str, background_tasks: BackgroundTasks):
        """Send verification email"""
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        link = f"{frontend_url}/verify-email?token={token}"

        # Build email with branded template
        content = self._get_verification_content(link)
        html_body = self._get_base_template(content)

        message = MessageSchema(
            subject="Verify your Topoi account",
            recipients=[email],
            body=html_body,
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

        # Build email with branded template
        content = self._get_reset_password_content(link)
        html_body = self._get_base_template(content)

        message = MessageSchema(
            subject="Reset your Topoi password",
            recipients=[email],
            body=html_body,
            subtype=MessageType.html
        )

        try:
            background_tasks.add_task(self.fastmail.send_message, message)
        except Exception as e:
            print(f"Failed to send email: {e}")
