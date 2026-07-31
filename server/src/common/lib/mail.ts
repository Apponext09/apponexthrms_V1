import nodemailer from 'nodemailer';
import { logger } from './logger';

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = options.from || process.env.SMTP_FROM || `"Apponext HRMS" <noreply@apponexthrms.com>`;

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
    logger.warn('[MailService] SMTP credentials missing in .env. Skipping real mail transport, email details logged to console.');
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
