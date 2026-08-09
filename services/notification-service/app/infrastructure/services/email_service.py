import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """Service responsible for sending workspace invitation and status update emails."""

    def __init__(self):
        self.smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.from_email = os.environ.get("FROM_EMAIL", self.smtp_user or "noreply@antigravity.internal")

    def send_invitation_email(self, to_email: str, workspace_name: str, role: str, invite_link: str | None = None) -> bool:
        """Send a workspace invitation email to the recipient."""
        subject = f"You've been invited to join workspace: {workspace_name}"
        body = f"""Hello,

You have been invited to join the workspace "{workspace_name}" as a {role}.

To accept or decline this invitation, log in to your account and visit the Invitations page in the workspace dashboard.

Invitations Page: {invite_link or 'http://localhost/invitations'}

Best regards,
The Workspace Team
"""
        return self._send_email(to_email, subject, body)

    def _send_email(self, to_email: str, subject: str, body: str) -> bool:
        if not self.smtp_user or not self.smtp_password:
            logger.info(f"[Email Notification Mock] Sent to: {to_email} | Subject: {subject}")
            return True

        try:
            msg = MIMEMultipart()
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email notification successfully sent to {to_email}")
            return True
        except Exception as err:
            logger.error(f"Failed to send email to {to_email}: {err}")
            return False
