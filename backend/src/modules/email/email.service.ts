import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailOptions, Transporter } from 'nodemailer';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | string[] | EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: SendMailOptions['attachments'];
}

export interface EmailNotificationPayload {
  to: string | EmailAddress;
  title: string;
  message: string;
  actionUrl?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OtpEmailPayload {
  to: string | EmailAddress;
  otp: string;
  purpose?: string;
}

export interface WelcomeEmailPayload {
  to: string | EmailAddress;
  name?: string;
}

export interface OrderConfirmationEmailPayload {
  to: string | EmailAddress;
  orderNumber: string;
  customerName?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendMail(options: SendEmailOptions): Promise<boolean> {
    if (!options.html && !options.text) {
      throw new Error('Email requires either html or text content.');
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`Email skipped because mail configuration is incomplete. Subject: ${options.subject}`);
      return false;
    }

    try {
      await transporter.sendMail({
        from: this.getFromAddress(),
        to: this.formatRecipients(options.to),
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || this.configService.get<string>('MAIL_REPLY_TO'),
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email. Subject: ${options.subject}`, error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('Email verification skipped because mail configuration is incomplete.');
      return false;
    }

    try {
      await transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email verification failed', error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  async sendNotificationEmail(payload: EmailNotificationPayload): Promise<boolean> {
    const actionUrl = this.buildAbsoluteActionUrl(payload.actionUrl);
    const actionHtml = actionUrl
      ? `<p><a href="${this.escapeHtml(actionUrl)}" style="display: inline-block; padding: 10px 14px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Open details</a></p>`
      : '';

    return this.sendMail({
      to: payload.to,
      subject: payload.title,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">${this.escapeHtml(payload.title)}</h2>
          <p>${this.escapeHtml(payload.message)}</p>
          ${actionHtml}
        </div>
      `,
      text: [payload.title, payload.message, actionUrl ? `Open details: ${actionUrl}` : ''].filter(Boolean).join('\n\n'),
    });
  }

  async sendOtpEmail(payload: OtpEmailPayload): Promise<boolean> {
    const appName = this.getAppName();
    const purpose = payload.purpose || 'verification';

    return this.sendMail({
      to: payload.to,
      subject: `${appName} ${purpose} code`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">${appName} ${purpose} code</h2>
          <p>Your ${purpose} code is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${this.escapeHtml(payload.otp)}</p>
          <p>This code is valid for a limited time. If you did not request it, you can ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<boolean> {
    const appName = this.getAppName();
    const greeting = payload.name ? `Hi ${this.escapeHtml(payload.name)},` : 'Hi,';

    return this.sendMail({
      to: payload.to,
      subject: `Welcome to ${appName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Welcome to ${appName}</h2>
          <p>${greeting}</p>
          <p>Your account is ready. You can now continue using ${appName}.</p>
        </div>
      `,
    });
  }

  async sendOrderConfirmationEmail(payload: OrderConfirmationEmailPayload): Promise<boolean> {
    const appName = this.getAppName();
    const greeting = payload.customerName ? `Hi ${this.escapeHtml(payload.customerName)},` : 'Hi,';

    return this.sendMail({
      to: payload.to,
      subject: `Order ${payload.orderNumber} confirmed`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Order confirmed</h2>
          <p>${greeting}</p>
          <p>Your order <strong>${this.escapeHtml(payload.orderNumber)}</strong> has been confirmed.</p>
          <p>Thank you for choosing ${appName}.</p>
        </div>
      `,
    });
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('MAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get<string>('MAIL_PORT') || 587),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: { user, pass },
    });

    return this.transporter;
  }

  private buildAbsoluteActionUrl(actionUrl?: string | null): string | null {
    const normalized = String(actionUrl || '').trim();
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('PUBLIC_FRONTEND_URL');
    if (!frontendUrl) return normalized;

    return `${frontendUrl.replace(/\/+$/, '')}/${normalized.replace(/^\/+/, '')}`;
  }

  private getFromAddress(): string {
    return this.configService.get<string>('MAIL_FROM') || this.configService.get<string>('MAIL_USER') || 'no-reply@example.com';
  }

  private getAppName(): string {
    return this.configService.get<string>('MAIL_APP_NAME') || 'Blitz NYC';
  }

  private formatRecipients(recipients: SendEmailOptions['to']): string | string[] {
    if (Array.isArray(recipients)) {
      return recipients.map((recipient) => this.formatRecipient(recipient));
    }

    return this.formatRecipient(recipients);
  }

  private formatRecipient(recipient: string | EmailAddress): string {
    if (typeof recipient === 'string') {
      return recipient;
    }

    return recipient.name ? `"${recipient.name.replace(/"/g, '\\"')}" <${recipient.email}>` : recipient.email;
  }

  private stripHtml(html = ''): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}