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
  let host = (process.env.SMTP_HOST || '').trim();
  let port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  let user = (process.env.SMTP_USER || '').trim();
  let pass = (process.env.SMTP_PASS || '').trim();
  let from = options.from || process.env.SMTP_FROM || `"Apponext HRMS" <${user || 'noreply@apponexthrms.com'}>`;

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
          const senderName = org.sender_name || org.name || 'Apponext HRMS';
          const senderMail = (host.includes('gmail') && user) ? user : (org.sender_email || org.email || user || 'noreply@apponexthrms.com');
          from = options.from || `"${senderName}" <${senderMail}>`;
        }
      }
    } catch (e) {
      logger.warn('[MailService] Failed to load tenant custom mail settings, using default transport:', e);
    }
  }

  if (host.includes('gmail') && user && !from.includes(user)) {
    const displayName = from.split('<')[0].replace(/"/g, '').trim() || 'Apponext HRMS';
    from = `"${displayName}" <${user}>`;
  }

  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  logger.info(`[MailService] Sending email → To: [${recipients}], Subject: "${options.subject}"`);

  if (!host || !user || !pass) {
    logger.warn('[MailService] SMTP credentials missing — email NOT sent. Configure SMTP_HOST/USER/PASS in .env');
    return false;
  }

  try {
    const cleanPass = pass.replace(/\s+/g, '');
    const transporterConfig: any = host.includes('gmail')
      ? {
          service: 'gmail',
          auth: {
            user,
            pass: cleanPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass: cleanPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        };

    const transporter = nodemailer.createTransport(transporterConfig);

    const info = await transporter.sendMail({
      from,
      replyTo: options.replyTo || from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    console.log(`[MailService] Email successfully sent to: ${recipients} | MessageId: ${info.messageId}`);
    logger.info(`[MailService] Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[MailService] Failed to send email via SMTP to [${recipients}]:`, error instanceof Error ? error.message : String(error));
    logger.error('[MailService] Failed to send email via SMTP:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
