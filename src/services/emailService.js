/**
 * Email Service Module
 * Handles sending transactional emails (account verification, password reset, PRO subscription confirmation)
 * via Nodemailer with Ethereal Email test preview generation and database email audit logging.
 */
const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

let cachedTransporter = null;

/**
 * Creates and returns a Nodemailer transporter instance.
 * Automatically creates an Ethereal Email test account if custom SMTP credentials are not provided.
 */
const getTransporter = async () => {
    if (cachedTransporter) return cachedTransporter;

    const service = (process.env.SMTP_SERVICE || "").trim();
    const host = (process.env.SMTP_HOST || "").trim();
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

    // 1. Direct Service (e.g. Gmail, Outlook, SendGrid, etc.)
    if (service && user && pass) {
        cachedTransporter = nodemailer.createTransport({
            service,
            auth: { user, pass }
        });
        return cachedTransporter;
    }

    // 2. Custom Host & Port SMTP Configuration
    if (host && user && pass) {
        const port = parseInt(process.env.SMTP_PORT || "587", 10);
        cachedTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: {
                rejectUnauthorized: false
            }
        });
        return cachedTransporter;
    }

    // Auto-generate Ethereal Email test account for development/testing
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log("================ ETHEREAL EMAIL CREATED ================");
        console.log(`Ethereal Account User: ${testAccount.user}`);
        console.log(`Ethereal Web Inbox:    https://ethereal.email`);
        console.log("========================================================");

        cachedTransporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        return cachedTransporter;
    } catch (err) {
        console.error("Failed to create Ethereal Email test account:", err);
        cachedTransporter = {
            sendMail: async (mailOptions) => {
                console.log("================ EMAIL SIMULATION ================");
                console.log(`To: ${mailOptions.to}`);
                console.log(`Subject: ${mailOptions.subject}`);
                console.log("==================================================");
                return { messageId: "simulated-id-" + Date.now() };
            }
        };
        return cachedTransporter;
    }
};

const getFromAddress = () => {
    if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
    if (process.env.SMTP_USER) return `"SnipForge" <${process.env.SMTP_USER}>`;
    return '"SnipForge Team" <noreply@snipforge.dev>';
};

/**
 * Helper to record email log in MongoDB database.
 */
const logEmailSent = async ({ to, subject, emailType, status, messageId, previewUrl, error }) => {
    try {
        await EmailLog.create({
            to,
            subject,
            emailType,
            status,
            messageId,
            previewUrl,
            error
        });
    } catch (err) {
        console.error("Failed to create EmailLog record in DB:", err);
    }
};

/**
 * Sends Account Verification Email containing 6-digit verification code and 1-click activation link.
 * Triggered on user registration and resend requests.
 */
const sendVerificationEmail = async ({ email, name, verificationUrl, code }) => {
    const subject = `${code} is your SnipForge verification code 🚀`;
    const mailOptions = {
        from: getFromAddress(),
        to: email,
        subject,
        text: `Hi ${name},\n\nWelcome to SnipForge! Your 6-digit verification code is: ${code}\n\nAlternatively, you can verify your account by clicking the link below:\n${verificationUrl}\n\nThis code and link will expire in 15 minutes.\n\nBest regards,\nSnipForge Team`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #38bdf8; font-size: 24px; margin: 0 0 8px 0;">Welcome to SnipForge, ${name}! 🎉</h2>
                    <p style="font-size: 15px; color: #94a3b8; margin: 0;">Confirm your email address to activate your account and start sharing snippets.</p>
                </div>

                <div style="background-color: #1e293b; border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0; border: 1px solid #334155;">
                    <p style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 0 0 12px 0;">Your 6-Digit Verification Code</p>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; background-color: #090d16; padding: 16px 24px; border-radius: 8px; display: inline-block; border: 1px dashed #0284c7;">
                        ${code}
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 12px 0 0 0;">Enter this code on the verification screen. Valid for 15 minutes.</p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                    <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 14px;">Or simply click the button below to verify instantly:</p>
                    <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        Verify Account Instantly
                    </a>
                </div>

                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; line-height: 1.6;">
                    <p style="margin: 0 0 8px 0;">If the button above does not work, copy and paste this URL into your browser:</p>
                    <p style="word-break: break-all; margin: 0;"><a href="${verificationUrl}" style="color: #38bdf8;">${verificationUrl}</a></p>
                    <p style="margin: 16px 0 0 0; text-align: center; color: #475569;">If you didn't create an account on SnipForge, please ignore this email.</p>
                </div>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;

        if (previewUrl) {
            console.log("📬 [Ethereal Email Sent] Verification Mail preview link:");
            console.log(`🔗 ${previewUrl}`);
        }

        await logEmailSent({
            to: email,
            subject,
            emailType: "VERIFICATION",
            status: "SENT",
            messageId: info.messageId,
            previewUrl
        });

        return info;
    } catch (err) {
        await logEmailSent({
            to: email,
            subject,
            emailType: "VERIFICATION",
            status: "FAILED",
            error: err.message
        });
        throw err;
    }
};

/**
 * Sends Password Reset Email containing secure single-use reset link via Nodemailer / Ethereal.
 */
const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
    const subject = "Reset Your SnipForge Password 🔒";
    const mailOptions = {
        from: getFromAddress(),
        to: email,
        subject,
        text: `Hi ${name},\n\nYou requested a password reset for your SnipForge account. Click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #111827; color: #f9fafb; border-radius: 8px;">
                <h2 style="color: #ef4444; text-align: center; margin-bottom: 24px;">Password Reset Request</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #d1d5db;">
                    Hi ${name},<br/><br/>
                    We received a request to reset your password for your SnipForge account. Click the button below to reset it:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">
                    Or copy and paste this link into your browser:<br/>
                    <a href="${resetUrl}" style="color: #f87171; word-break: break-all;">${resetUrl}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;" />
                <p style="font-size: 12px; color: #6b7280; text-align: center;">
                    If you did not request a password reset, please ignore this email or contact support. This link expires in 15 minutes.
                </p>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;

        if (previewUrl) {
            console.log("📬 [Ethereal Email Sent] Password Reset Mail preview link:");
            console.log(`🔗 ${previewUrl}`);
        }

        await logEmailSent({
            to: email,
            subject,
            emailType: "PASSWORD_RESET",
            status: "SENT",
            messageId: info.messageId,
            previewUrl
        });

        return info;
    } catch (err) {
        await logEmailSent({
            to: email,
            subject,
            emailType: "PASSWORD_RESET",
            status: "FAILED",
            error: err.message
        });
        throw err;
    }
};

/**
 * Sends PRO Subscription Receipt & Confirmation Email after purchasing PRO plan.
 */
const sendSubscriptionConfirmationEmail = async ({ email, name, plan = "PRO", paymentId = "N/A", amount = "₹199" }) => {
    const subject = `Welcome to SnipForge ${plan}! ⭐ Subscription Confirmed`;
    const mailOptions = {
        from: getFromAddress(),
        to: email,
        subject,
        text: `Hi ${name},\n\nThank you for upgrading to SnipForge ${plan}! Your subscription has been activated.\nPayment ID: ${paymentId}\nAmount: ${amount}\n\nEnjoy unlimited code snippets, AI assistance, and priority support!\n\nBest regards,\nSnipForge Team`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #111827; color: #f9fafb; border-radius: 8px;">
                <h2 style="color: #f59e0b; text-align: center; margin-bottom: 24px;">⭐ Subscription Confirmed: SnipForge ${plan}</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #d1d5db;">
                    Hi ${name},<br/><br/>
                    Thank you for upgrading to <strong>SnipForge ${plan}</strong>! Your subscription is now active.
                </p>
                <div style="background-color: #1f2937; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #374151;">
                    <h4 style="margin-top: 0; color: #fbbf24;">Receipt Details</h4>
                    <p style="font-size: 14px; color: #9ca3af; margin: 4px 0;"><strong>Plan:</strong> ${plan} Plan</p>
                    <p style="font-size: 14px; color: #9ca3af; margin: 4px 0;"><strong>Amount Paid:</strong> ${amount}</p>
                    <p style="font-size: 14px; color: #9ca3af; margin: 4px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
                    <p style="font-size: 14px; color: #9ca3af; margin: 4px 0;"><strong>Status:</strong> Active</p>
                </div>
                <h3 style="color: #60a5fa;">Unlocked PRO Perks:</h3>
                <ul style="color: #d1d5db; line-height: 1.6; font-size: 14px;">
                    <li>✨ <strong>Unlimited Code Snippets</strong> - Create and store unlimited snippets.</li>
                    <li>🔒 <strong>Private & Team Sharing</strong> - Full access to private visibility settings.</li>
                    <li>🤖 <strong>AI Code Assistance</strong> - Access to smart code helpers and refactoring.</li>
                    <li>👑 <strong>PRO Badge</strong> - Exclusive PRO badge displayed on your public profile.</li>
                </ul>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/snippet-feed" style="background-color: #f59e0b; color: #111827; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">
                        Explore PRO Feed
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;" />
                <p style="font-size: 12px; color: #6b7280; text-align: center;">
                    Thank you for supporting SnipForge. For support or questions, reply to this email.
                </p>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;

        if (previewUrl) {
            console.log("📬 [Ethereal Email Sent] PRO Subscription Confirmation preview link:");
            console.log(`🔗 ${previewUrl}`);
        }

        await logEmailSent({
            to: email,
            subject,
            emailType: "SUBSCRIPTION_CONFIRMATION",
            status: "SENT",
            messageId: info.messageId,
            previewUrl
        });

        return info;
    } catch (err) {
        await logEmailSent({
            to: email,
            subject,
            emailType: "SUBSCRIPTION_CONFIRMATION",
            status: "FAILED",
            error: err.message
        });
        throw err;
    }
};

/**
 * Sends a professional Subscription Tax Invoice email to the user with full billing details.
 */
const sendSubscriptionInvoiceEmail = async ({
    email,
    name,
    plan = "PRO",
    paymentId = "N/A",
    orderId = "N/A",
    amount = "₹199",
    date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
}) => {
    const subject = `Tax Invoice ${invoiceNumber} for your SnipForge ${plan} Subscription 📄`;
    const mailOptions = {
        from: getFromAddress(),
        to: email,
        subject,
        text: `Hi ${name},\n\nPlease find your SnipForge ${plan} subscription invoice below.\n\nInvoice Number: ${invoiceNumber}\nDate: ${date}\nPlan: ${plan}\nAmount Paid: ${amount}\nPayment ID: ${paymentId}\nStatus: PAID\n\nThank you for choosing SnipForge!\n\nBest regards,\nSnipForge Team`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background-color: #0A0B0F; color: #F1F2F4; border-radius: 12px; border: 1px solid #1F2229;">
                {/* Header */}
                <div style="border-bottom: 1px solid #1F2229; padding-bottom: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top;">
                                <h1 style="color: #7C6FF0; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SnipForge</h1>
                                <p style="color: #646A78; font-size: 12px; margin: 4px 0 0 0;">Developer Code Snippet Platform</p>
                            </td>
                            <td style="text-align: right; vertical-align: top;">
                                <span style="background-color: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                                    PAID
                                </span>
                                <h2 style="color: #F1F2F4; font-size: 16px; margin: 8px 0 2px 0;">INVOICE</h2>
                                <p style="color: #9BA1AC; font-size: 12px; font-family: monospace; margin: 0;">#${invoiceNumber}</p>
                            </td>
                        </tr>
                    </table>
                </div>

                {/* Billing Information */}
                <div style="background-color: #131519; border: 1px solid #1F2229; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; vertical-align: top;">
                                <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #646A78; margin: 0 0 4px 0;">Billed To</p>
                                <p style="font-size: 14px; font-weight: 600; color: #F1F2F4; margin: 0 0 2px 0;">${name}</p>
                                <p style="font-size: 13px; color: #9BA1AC; margin: 0;">${email}</p>
                            </td>
                            <td style="width: 50%; vertical-align: top; text-align: right;">
                                <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #646A78; margin: 0 0 4px 0;">Invoice Details</p>
                                <p style="font-size: 12px; color: #9BA1AC; margin: 0 0 2px 0;"><strong>Date:</strong> ${date}</p>
                                <p style="font-size: 12px; color: #9BA1AC; margin: 0 0 2px 0;"><strong>Payment ID:</strong> <span style="font-family: monospace; color: #E0A94F;">${paymentId}</span></p>
                                <p style="font-size: 12px; color: #9BA1AC; margin: 0;"><strong>Gateway:</strong> Razorpay</p>
                            </td>
                        </tr>
                    </table>
                </div>

                {/* Line Items Table */}
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #1F2229; text-align: left;">
                            <th style="padding: 10px 12px; color: #646A78; font-size: 11px; text-transform: uppercase; font-weight: 600;">Description</th>
                            <th style="padding: 10px 12px; color: #646A78; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center;">Qty</th>
                            <th style="padding: 10px 12px; color: #646A78; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #1F2229;">
                            <td style="padding: 14px 12px;">
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #F1F2F4;">SnipForge ${plan} Plan Membership</p>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: #646A78;">Unlimited snippets, AI code assistant, private repositories, and PRO badge</p>
                            </td>
                            <td style="padding: 14px 12px; font-size: 13px; color: #9BA1AC; text-align: center;">1</td>
                            <td style="padding: 14px 12px; font-size: 14px; font-weight: 600; color: #F1F2F4; text-align: right;">${amount}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals Summary */}
                <div style="margin-left: auto; width: 260px; margin-bottom: 28px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-size: 13px; color: #9BA1AC;">Subtotal</td>
                            <td style="padding: 6px 0; font-size: 13px; color: #F1F2F4; text-align: right;">${amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 13px; color: #9BA1AC;">Taxes & Fees</td>
                            <td style="padding: 6px 0; font-size: 13px; color: #F1F2F4; text-align: right;">₹0.00</td>
                        </tr>
                        <tr style="border-top: 1px solid #1F2229;">
                            <td style="padding: 10px 0; font-size: 15px; font-weight: 700; color: #F1F2F4;">Total Paid</td>
                            <td style="padding: 10px 0; font-size: 18px; font-weight: 800; color: #7C6FF0; text-align: right;">${amount}</td>
                        </tr>
                    </table>
                </div>

                {/* Footer Notes */}
                <div style="border-top: 1px solid #1F2229; padding-top: 20px; font-size: 12px; color: #646A78; text-align: center; line-height: 1.6;">
                    <p style="margin: 0 0 4px 0;">This is a computer-generated tax invoice and requires no physical signature.</p>
                    <p style="margin: 0;">Have billing questions? Reach us anytime at <a href="mailto:support@snipforge.dev" style="color: #7C6FF0; text-decoration: none;">support@snipforge.dev</a></p>
                </div>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;

        if (previewUrl) {
            console.log("📬 [Invoice Email Sent] Preview link:");
            console.log(`🔗 ${previewUrl}`);
        }

        await logEmailSent({
            to: email,
            subject,
            emailType: "INVOICE",
            status: "SENT",
            messageId: info.messageId,
            previewUrl
        });

        return info;
    } catch (err) {
        await logEmailSent({
            to: email,
            subject,
            emailType: "INVOICE",
            status: "FAILED",
            error: err.message
        });
        throw err;
    }
};

/**
 * Verifies SMTP configuration and transport connection status.
 */
const verifyEmailConnection = async () => {
    try {
        const transporter = await getTransporter();
        if (transporter && typeof transporter.verify === "function") {
            await transporter.verify();
            console.log("✅ [SMTP Verification] Connection to SMTP server established successfully!");
            return { success: true, message: "SMTP server connection verified successfully." };
        } else {
            console.log("ℹ️ [SMTP Verification] Simulated transport active.");
            return { success: true, message: "Simulated email transport active." };
        }
    } catch (err) {
        console.error("❌ [SMTP Verification] Failed to connect to SMTP server:", err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Sends a test email to verify SMTP credentials and email delivery.
 */
const sendTestEmail = async (targetEmail) => {
    const to = targetEmail || process.env.SMTP_USER || "test@example.com";
    const subject = "SnipForge Email Service Test 🧪";
    const mailOptions = {
        from: getFromAddress(),
        to,
        subject,
        text: `Hi,\n\nThis is a test email from SnipForge to verify that your email configuration (SMTP) is working properly.\n\nTimestamp: ${new Date().toISOString()}\n\nBest regards,\nSnipForge Team`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
                <h2 style="color: #38bdf8; text-align: center;">SnipForge Email Test 🧪</h2>
                <p style="font-size: 15px; color: #cbd5e1;">Your email service configuration is working correctly!</p>
                <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #334155;">
                    <p style="margin: 4px 0; color: #94a3b8;"><strong>Recipient:</strong> ${to}</p>
                    <p style="margin: 4px 0; color: #94a3b8;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    <p style="margin: 4px 0; color: #94a3b8;"><strong>Service:</strong> ${process.env.SMTP_SERVICE || "Custom/Ethereal"}</p>
                </div>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;

        if (previewUrl) {
            console.log("📬 [Test Email Sent] Preview link:", previewUrl);
        } else {
            console.log(`📬 [Test Email Sent] Message ID: ${info.messageId}`);
        }

        await logEmailSent({
            to,
            subject,
            emailType: "TEST",
            status: "SENT",
            messageId: info.messageId,
            previewUrl
        });

        return { success: true, info, previewUrl };
    } catch (err) {
        await logEmailSent({
            to,
            subject,
            emailType: "TEST",
            status: "FAILED",
            error: err.message
        });
        throw err;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendSubscriptionConfirmationEmail,
    sendSubscriptionInvoiceEmail,
    verifyEmailConnection,
    sendTestEmail
};

