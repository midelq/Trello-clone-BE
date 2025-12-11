import nodemailer from 'nodemailer';

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

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Trello Clone!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f5f7;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #0079bf;
            margin-bottom: 10px;
          }
          h1 {
            color: #172b4d;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .content {
            color: #5e6c84;
            font-size: 16px;
            margin-bottom: 30px;
          }
          .highlight {
            background-color: #e3fcef;
            border-left: 4px solid #00c853;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .highlight-text {
            color: #00875a;
            font-weight: 600;
            margin: 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0079bf;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e1e4e8;
            text-align: center;
            color: #6b778c;
            font-size: 14px;
          }
          .features {
            margin: 30px 0;
          }
          .feature-item {
            margin: 15px 0;
            padding-left: 25px;
            position: relative;
          }
          .feature-item:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #00c853;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📋 Trello Clone</div>
          </div>
          
          <h1>Welcome, ${userName}! 🎉</h1>
          
          <div class="content">
            <p>Thanks for signing up for Trello Clone!</p>
            
            <div class="highlight">
              <p class="highlight-text">✅ Your registration was successful!</p>
            </div>
            
            <p>Now you can use all the features of our application:</p>
            
            <div class="features">
              <div class="feature-item">Create boards to organize projects</div>
              <div class="feature-item">Add lists and task cards</div>
              <div class="feature-item">Move cards between lists</div>
              <div class="feature-item">Manage your projects effectively</div>
            </div>
            
            <p>Your account:</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
            <p>© 2025 Trello Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '🎉 Welcome to Trello Clone! Registration successful',
      html
    });
  }
}

export const emailService = new EmailService();
