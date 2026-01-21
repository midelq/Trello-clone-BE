import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private logInfo(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message);
    }
  }

  public initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('  Email credentials not configured. Email service will not work.');
      }
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });

      this.logInfo(' Email service initialized successfully');
    } catch (error) {
      console.error(' Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logInfo(' Transporter not ready, attempting to initialize...');
      this.initializeTransporter();
    }

    if (!this.transporter) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(' Email transporter could not be initialized. Check keys in .env');
      }
      return false;
    }

    try {
      const mailOptions = {
        from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logInfo(` Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(' Failed to send email:', error);
      return false;
    }
  }

  private loadTemplate(name: string, variables: Record<string, string>): string {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${name}.html`);
      let html = fs.readFileSync(templatePath, 'utf-8');

      for (const [key, value] of Object.entries(variables)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      return html;
    } catch (error) {
      console.error(`Failed to load email template: ${name}`, error);
      return '';
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const html = this.loadTemplate('welcome', { userName, userEmail });

    return this.sendEmail({
      to: userEmail,
      subject: '🎉 Welcome to Trello Clone! Registration successful',
      html
    });
  }
}

export const emailService = new EmailService();
