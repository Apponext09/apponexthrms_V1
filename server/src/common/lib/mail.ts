import nodemailer from 'nodemailer';
import { logger } from './logger';

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  organizationId?: number;
}): Promise<boolean> {
  let host = process.env.SMTP_HOST;
  let port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let from = options.from || process.env.SMTP_FROM || `"Apponext HRMS" <noreply@apponexthrms.com>`;

  // Dynamic Per-Tenant Organization Settings Lookup
  if (options.organizationId) {
    try {
      const { getKnex } = await import('../../db/knex');
      const db = getKnex();
      const org = await db('organizations').where('id', options.organizationId).first();
      if (org) {
        if (org.smtp_host && org.smtp_user && org.smtp_pass) {
          host = org.smtp_host;
          port = org.smtp_port ? parseInt(String(org.smtp_port), 10) : 587;
          user = org.smtp_user;
          pass = org.smtp_pass;
        }
        if (org.sender_email || org.name) {
          const senderName = org.sender_name || org.name || 'HR Team';
          const senderMail = org.sender_email || org.email || 'noreply@apponexthrms.com';
          from = options.from || `"${senderName}" <${senderMail}>`;
        }
      }
    } catch (e) {
      logger.warn('[MailService] Failed to load tenant custom mail settings, using default transport:', e);
    }
  }

  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  logger.info(`[MailService] Attempting to send email to [${recipients}], Subject: "${options.subject}"`);

  // Log the HTML content for development/debug visibility
  console.log(`\n=================== SENT MAIL SIMULATION ===================`);
  console.log(`To:       ${recipients}`);
  console.log(`From:     ${from}`);
  console.log(`Reply-To: ${options.replyTo || from}`);
  console.log(`Subject:  ${options.subject}`);
  console.log(`Body (HTML):\n${options.html}`);
  console.log(`============================================================\n`);

  if (!host || !user || !pass) {
    logger.warn('[MailService] SMTP credentials missing in settings/.env. Email details logged to console simulation.');
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      replyTo: options.replyTo || from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip tags for plain text fallback
    });

    logger.info(`[MailService] Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('[MailService] Failed to send email via SMTP:', error instanceof Error ? error.message : String(error));
    // Do not fail the flow if email sending fails, as we want to keep the application resilient
    return false;
  }
}
