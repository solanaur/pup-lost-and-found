/**
 * Email via Gmail SMTP when SMTP_PASS is set; otherwise logs to console.
 */

const nodemailer = require('nodemailer');

const DEFAULT_FROM = 'iBALIK <pupibaliklostandfound@gmail.com>';

let transporter = null;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_PASS);
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

function buildTrackUrl(code) {
  const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}/#/track/${encodeURIComponent(code)}`;
}

function textToHtml(text) {
  return text
    .split('\n')
    .map((line) => (line ? `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br>'))
    .join('\n');
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) return { ok: false, reason: 'no recipient' };

  const tx = getTransporter();
  if (!tx) {
    console.log('[email stub]', JSON.stringify({ to, subject, at: new Date().toISOString() }));
    return { ok: true, logged: true };
  }

  const info = await tx.sendMail({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    text,
    html: html || textToHtml(text),
  });

  console.log('[email sent]', { to, subject, messageId: info.messageId });
  return { ok: true, sent: true, messageId: info.messageId };
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

async function sendItemClaimedNotification(item) {
  if (!item.reporter_email) return { ok: false, reason: 'no recipient' };
  const trackUrl = buildTrackUrl(item.code);
  const isFound = item.type === 'found';
  const subject = isFound
    ? `Found Item Returned — ${item.code}`
    : `Lost Item Claimed — ${item.code}`;
  const body = isFound
    ? [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      'The found item you reported has been marked as claimed and returned to its owner.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      'Thank you for helping reunite a campus community member with their belongings.',
      '',
      `Track report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ]
    : [
      `Hello ${item.reporter_name || 'there'},`,
      '',
      'Great news — your lost item report has been marked as claimed.',
      '',
      `Item: ${item.name}`,
      `Report ID: ${item.code}`,
      '',
      'If you have not picked up the item yet, visit the Lost & Found Office during office hours with valid ID.',
      '',
      `Track report: ${trackUrl}`,
      '',
      '— iBALIK · PUP Parañaque Lost and Found',
    ];
  return sendEmail({
    to: item.reporter_email,
    subject,
    text: body.join('\n'),
  });
}

async function sendClaimReceivedNotification(claim, item) {
  const to = claim.claimant_email || '';
  if (!to) return { ok: false, reason: 'no recipient' };
  return sendEmail({
    to,
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
  const to = claim.claimant_email || '';
  if (!to) return { ok: false, reason: 'no recipient' };
  const isFound = item.type === 'found';
  return sendEmail({
    to,
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

/** Claim approved: notify claimer + original reporter (found returned / lost recovered). */
async function notifyClaimOutcome(claim, item) {
  const results = [];
  try {
    results.push(await sendClaimApprovedNotification(claim, item));
  } catch (e) {
    console.warn('[email] claim approved notify claimant:', e.message);
    results.push({ ok: false, error: e.message });
  }
  if (item.reporter_email) {
    try {
      results.push(await sendItemClaimedNotification(item));
    } catch (e) {
      console.warn('[email] claim approved notify reporter:', e.message);
      results.push({ ok: false, error: e.message });
    }
  }
  return results;
}

module.exports = {
  buildTrackUrl,
  isEmailConfigured,
  sendEmail,
  sendReportConfirmation,
  sendMatchNotification,
  sendItemClaimedNotification,
  sendClaimReceivedNotification,
  sendClaimApprovedNotification,
  notifyClaimOutcome,
};
