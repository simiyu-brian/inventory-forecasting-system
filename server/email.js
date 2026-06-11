const nodemailer = require('nodemailer');

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Auto-create throwaway Ethereal account for development
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('\n📧  Dev email ready (Ethereal)');
    console.log('    Preview emails at: https://ethereal.email');
    console.log(`    Login: ${testAccount.user} / ${testAccount.pass}\n`);
  }

  return _transporter;
}

const FROM = process.env.SMTP_FROM || '"InvenSight" <noreply@InvenSight.co.ke>';
const CLIENT = () => process.env.CLIENT_URL || 'http://localhost:3000';

async function sendInvite({ to, name, role, token }) {
  const t = await getTransporter();
  const link = `${CLIENT()}/accept-invite?token=${token}`;

  const info = await t.sendMail({
    from: FROM,
    to,
    subject: "You've been invited to InvenSight",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Hi <strong>${name}</strong>,</p>
          <p>You've been invited to join <strong>InvenSight</strong> as <strong>${role}</strong>.
             Click the button below to set your password and activate your account.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${link}"
               style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                      text-decoration:none;border-radius:6px;font-weight:600;font-size:0.95rem">
              Accept Invitation
            </a>
          </div>
          <p style="font-size:0.8rem;color:#64748b">
            This link expires in 72 hours. If you weren't expecting this, you can safely ignore it.
          </p>
        </div>
      </div>`,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧  Invite preview:', nodemailer.getTestMessageUrl(info));
  }
}

async function sendPasswordReset({ to, name, token }) {
  const t = await getTransporter();
  const link = `${CLIENT()}/reset-password?token=${token}`;

  const info = await t.sendMail({
    from: FROM,
    to,
    subject: 'Reset your InvenSight password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${link}"
               style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                      text-decoration:none;border-radius:6px;font-weight:600;font-size:0.95rem">
              Reset Password
            </a>
          </div>
          <p style="font-size:0.8rem;color:#64748b">
            This link expires in 1 hour. If you didn't request this, you can safely ignore it.
          </p>
        </div>
      </div>`,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧  Reset email preview:', nodemailer.getTestMessageUrl(info));
  }
}

async function sendRequestReceived({ to, name, businessName }) {
  const t = await getTransporter();
  await t.sendMail({
    from: FROM,
    to,
    subject: 'We received your InvenSight request',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We've received your request for <strong>${businessName}</strong> and will review it within 24 hours.</p>
          <p>If approved, you'll receive a setup token by email with instructions to get started.</p>
          <p style="font-size:0.8rem;color:#64748b;margin-top:24px">
            Didn't submit this request? You can safely ignore this email.
          </p>
        </div>
      </div>`,
  });
}

async function sendApprovalNotification({ to, businessName, name, email, phone, message, approvalUrl }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: FROM,
    to,
    subject: `New InvenSight request - ${businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight - New Access Request</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse;font-size:0.875rem;margin-bottom:24px">
            <tr><td style="padding:6px 0;color:#64748b;width:120px">Business</td><td style="padding:6px 0;font-weight:600">${businessName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Contact</td><td style="padding:6px 0">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${phone}</td></tr>
            ${message ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Message</td><td style="padding:6px 0">${message}</td></tr>` : ''}
          </table>
          <div style="text-align:center">
            <a href="${approvalUrl}"
               style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                      text-decoration:none;border-radius:6px;font-weight:600;font-size:0.95rem">
              Review &amp; Approve Request
            </a>
          </div>
          <p style="font-size:0.8rem;color:#64748b;margin-top:24px;text-align:center">
            This link takes you to a confirmation page before anything is issued.
          </p>
        </div>
      </div>`,
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧  Approval notification preview:', nodemailer.getTestMessageUrl(info));
  }
}

async function sendSetupToken({ to, name, businessName, token }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: FROM,
    to,
    subject: 'Your InvenSight setup token',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your request for <strong>${businessName}</strong> has been approved.</p>
          <p>Once your system is ready, visit your dashboard URL and use the setup wizard. You'll be asked for this token:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:20px 0;word-break:break-all;font-family:monospace;font-size:0.8rem;color:#1e293b">
            ${token}
          </div>
          <p style="font-size:0.8rem;color:#64748b">
            Keep this token private. It expires in <strong>7 days</strong> and can only be used once.
            If it expires, contact us for a new one.
          </p>
        </div>
      </div>`,
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧  Setup token preview:', nodemailer.getTestMessageUrl(info));
  }
}

async function sendTokenIssuedConfirmation({ to, name, email, businessName }) {
  const t = await getTransporter();
  await t.sendMail({
    from: FROM,
    to,
    subject: `Setup token issued - ${businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:#1e293b;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:1.2rem">InvenSight</h2>
        </div>
        <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>A setup token was issued to <strong>${name}</strong> (<a href="mailto:${email}">${email}</a>) for <strong>${businessName}</strong>.</p>
          <p>The token has been sent to their email. You do not receive a copy - this is intentional.</p>
          <p style="font-size:0.8rem;color:#64748b">Token expires in 7 days. No further action needed from you.</p>
        </div>
      </div>`,
  });
}

module.exports = {
  sendInvite, sendPasswordReset,
  sendRequestReceived, sendApprovalNotification,
  sendSetupToken, sendTokenIssuedConfirmation,
};
