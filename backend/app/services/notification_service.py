"""Notification service for email and Slack alerts."""

from __future__ import annotations

import structlog
import aiohttp

from app.config import get_settings

logger = structlog.get_logger(__name__)


class NotificationService:
    """Sends notifications via email (SMTP) and Slack (webhook)."""

    def __init__(self) -> None:
        self._settings = get_settings()

    async def send_email(self, to: str, subject: str, body: str) -> None:
        """Send an email notification (placeholder — plug in aiosmtplib for production)."""
        logger.info(
            "email_notification_sent",
            to=to,
            subject=subject,
        )

    async def send_slack(self, channel: str, message: str) -> None:
        """Post a message to a Slack channel via incoming webhook."""
        webhook_url = self._settings.slack_webhook_url
        if not webhook_url:
            logger.warning("slack_webhook_not_configured")
            return

        payload = {"channel": channel, "text": message}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        logger.error("slack_notification_failed", status=resp.status)
                    else:
                        logger.info("slack_notification_sent", channel=channel)
        except Exception:
            logger.exception("slack_notification_error")

    async def notify_capacity_warning(
        self,
        app_name: str,
        app_code: str,
        overall_status: str,
        details: str,
    ) -> None:
        """Notify the platform team about a capacity concern."""
        message = (
            f":warning: *Capacity {overall_status}* for onboarding "
            f"*{app_name}* (`{app_code}`)\n{details}"
        )
        await self.send_slack("#obs-platform-alerts", message)

    async def notify_submission(self, app_name: str, app_code: str, submitter: str) -> None:
        """Notify stakeholders about a new onboarding submission."""
        message = (
            f":rocket: New observability onboarding submitted: "
            f"*{app_name}* (`{app_code}`) by {submitter}"
        )
        await self.send_slack("#obs-onboarding", message)
