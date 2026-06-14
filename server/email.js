/**
 * Email via Gmail SMTP when SMTP_PASS is set.
 */
const nodemailer = require('nodemailer');

const DEFAULT_FROM = 'iBALIK <pupibaliklostandfound@gmail.com>';

let transporter = null;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_PASS);
}

function getPublicBaseUrl() {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  const netlify = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim().replace(/\/$/, '');
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) return configured;
  if (netlify) return netlify;
  return configured || 'http://localhost:3000';
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'pupibaliklostandfound@gmail.com',
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function verifySmtpConnection() {
  if (!isEmailConfigured()) return { ok: false, reason: 'SMTP_PASS not set' };
  try {
    const tx = getTransporter();
    await tx.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function buildTrackUrl(code) {
  return `${getPublicBaseUrl()}/#/track/${encodeURIComponent(code)}`;
}

function textToHtml(text) {
  return text
    .split('\n')
    .map((line) => (line ? `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br>'))
    .join('\n');
}

function emailWasSent(result) {
  return Boolean(result?.sent);
}

function summarizeEmailResults(results) {
  const list = Array.isArray(results) ? results : [results];
  const sent = list.filter((r) => r?.sent).length;
  const failed = list.filter((r) => r && !r.sent && !r.logged).length;
  return {
    email_sent: sent > 0,
    email_count: sent,
    email_failed: failed,
    email_error: list.find((r) => r?.error || r?.reason)?.error
      || list.find((r) => r?.reason)?.reason
      || null,
  };
}

async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    console.warn('[email skip] no recipient for', subject);
    return { ok: false, reason: 'no recipient' };
  }

  const tx = getTransporter();
  if (!tx) {
    console.log('[email stub]', JSON.stringify({ to: recipient, subject, at: new Date().toISOString() }));
    return { ok: false, logged: true, reason: 'smtp not configured' };
  }

  try {
    const info = await tx.sendMail({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: recipient,
      subject,
      text,
      html: html || textToHtml(text),
    });
    console.log('[email sent]', { to: recipient, subject, messageId: info.messageId });
    return { ok: true, sent: true, messageId: info.messageId, to: recipient };
  } catch (e) {
    console.error('[email failed]', { to: recipient, subject, error: e.message });
    return { ok: false, error: e.message, to: recipient };
  }
}

async function sendReportConfirmation(item) {
  const trackUrl = buildTrackUrl(item.code);
  const typeLabel = item.type === 'lost' ? 'Lost Item' : 'Found Item';
  const statusNote = item.type === 'found'
    ? 'Your report is pending administrator review before it appears publicly.'
    : 'Your report is now active and included in AI matching.';
  return sendEmail({
    to: item.reporter_email,
    subject: `${typeLabel} Report Submitted — ${item.code}`,
    text: [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      `Your ${typeLabel.toLowerCase()} report was received.`,
      `Report ID: ${item.code}`,
      `Item: ${item.name}`,
      `Status: ${item.status === 'approved' ? 'Active' : 'Pending Review'}`,
      '',
      statusNote,
      '',
      `Track your report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

async function sendMatchNotification(item, match, foundItem) {
  const trackUrl = buildTrackUrl(item.code);
  return sendEmail({
    to: item.reporter_email,
    subject: 'Possible Match Found — iBALIK',
    text: [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      'A possible match has been identified for your lost item.',
      '',
      `Your item: ${item.name}`,
      `Possible match: ${foundItem?.name || 'Found item'}`,
      `Confidence: ${match.match_score}%`,
      '',
      `View report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

async function sendFoundItemReunitedNotification(item) {
  if (!item.reporter_email) return { ok: false, reason: 'no recipient' };
  if (item.type !== 'found') return { ok: false, reason: 'not a found report' };
  const trackUrl = buildTrackUrl(item.code);
  return sendEmail({
    to: item.reporter_email,
    subject: `Item Reunited With Owner — ${item.code}`,
    text: [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      'Good news — the item you found has been reunited with its owner.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      'Thank you for turning it in and helping a fellow student get their belongings back.',
      '',
      `Track report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

async function sendLostItemRecoveredNotification(item) {
  if (!item.reporter_email) return { ok: false, reason: 'no recipient' };
  if (item.type !== 'lost') return { ok: false, reason: 'not a lost report' };
  const trackUrl = buildTrackUrl(item.code);
  return sendEmail({
    to: item.reporter_email,
    subject: `Lost Item Recovered — ${item.code}`,
    text: [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      'Great news — your lost item has been marked as recovered and claimed.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      'If you have not picked it up yet, visit the Lost & Found Office during office hours with valid ID.',
      '',
      `Track report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

async function sendItemClaimedNotification(item) {
  if (!item.reporter_email) return { ok: false, reason: 'no recipient' };
  if (item.type === 'found') return sendFoundItemReunitedNotification(item);
  return sendLostItemRecoveredNotification(item);
}

async function sendClaimReceivedNotification(claim, item) {
  return sendEmail({
    to: claim.claimant_email,
    subject: `Claim Submitted — ${item.code}`,
    text: [
      `Hello ${claim.claimant_name || 'there'},`,
      '',
      'Your claim has been received and is pending verification by campus staff.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      'You will be contacted when your claim is reviewed. Bring valid ID when collecting the item.',
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

async function sendClaimApprovedNotification(claim, item) {
  const isFound = item.type === 'found';
  return sendEmail({
    to: claim.claimant_email,
    subject: `Claim Approved — ${item.code}`,
    text: [
      `Hello ${claim.claimant_name || 'there'},`,
      '',
      isFound
        ? 'Great news — your ownership claim has been approved.'
        : 'Great news — your recovery claim has been approved.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      isFound
        ? 'Visit the Lost & Found Office during office hours with valid ID to collect your item.'
        : 'Your lost item report is now marked as recovered. Contact campus staff if you need pickup assistance.',
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ].join('\n'),
  });
}

/** Claim approved: notify claimer + original reporter when different people. */
async function notifyClaimOutcome(claim, item) {
  const claimTo = String(claim.claimant_email || '').trim().toLowerCase();
  const reporterTo = String(item.reporter_email || '').trim().toLowerCase();
  const results = [];

  results.push(await sendClaimApprovedNotification(claim, item));

  if (reporterTo && reporterTo !== claimTo) {
    if (item.type === 'found') {
      results.push(await sendFoundItemReunitedNotification(item));
    } else {
      results.push(await sendLostItemRecoveredNotification(item));
    }
  }

  return results;
}

module.exports = {
  buildTrackUrl,
  getPublicBaseUrl,
  isEmailConfigured,
  verifySmtpConnection,
  emailWasSent,
  summarizeEmailResults,
  sendEmail,
  sendReportConfirmation,
  sendMatchNotification,
  sendFoundItemReunitedNotification,
  sendLostItemRecoveredNotification,
  sendItemClaimedNotification,
  sendClaimReceivedNotification,
  sendClaimApprovedNotification,
  notifyClaimOutcome,
};
