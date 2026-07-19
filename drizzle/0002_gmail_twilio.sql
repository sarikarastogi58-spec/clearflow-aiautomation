DELETE FROM `vault_secrets` WHERE `name` IN (
  'MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID', 'MSG91_MESSAGE_VARIABLE', 'MSG91_WEBHOOK_TOKEN',
  'RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_WEBHOOK_SECRET'
);
--> statement-breakpoint
DELETE FROM `provider_connections` WHERE `provider` IN ('msg91', 'resend');
