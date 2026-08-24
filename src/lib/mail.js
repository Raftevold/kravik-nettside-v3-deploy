/**
 * Valfri e-postvarsling for kontaktskjemaet og driftsvarsel.
 * Aktiverast ved å setje SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS og
 * CONTACT_EMAIL (mottakar). Utan desse blir meldingane berre lagra i
 * admin-innboksen (som uansett alltid skjer).
 *
 * VIKTIG om transport: Render GRATISPLAN blokkerer utgåande SMTP-portar
 * (25/465/587, sidan sept. 2025). Difor: når SMTP_HOST er smtp.resend.com
 * går sendinga via Resend sitt HTTPS-API (port 443) i staden – same
 * miljøvariablar, SMTP_PASS er API-nøkkelen. Andre SMTP-vertar krev
 * betalt plan hos Render.
 */
const nodemailer = require('nodemailer');

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const viaResendApi = process.env.SMTP_HOST === 'smtp.resend.com';

// Avsendaradresse. Hos transaksjonstenester (t.d. Resend) er SMTP_USER eit
// teknisk brukarnamn («resend»), ikkje ei e-postadresse – då MÅ MAIL_FROM
// setjast (t.d. nettside@verifisert-domene.no).
const FROM_ADDR = process.env.MAIL_FROM || process.env.SMTP_USER;

let transporter = null;
if (configured && !viaResendApi) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Brukarinput skal aldri rått inn i ein e-postheader (forsvar i djupna –
// nodemailer foldar rett nok headerar sjølv).
function reinsHeader(s) {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
}

/** Felles sending – vel transport ut frå oppsettet. */
async function send({ fromName, to, replyTo, subject, text }) {
  if (viaResendApi) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SMTP_PASS}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${FROM_ADDR}>`,
        to: [to],
        reply_to: replyTo || undefined,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const feil = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${feil.slice(0, 200)}`);
    }
    return;
  }
  await transporter.sendMail({
    from: `"${fromName}" <${FROM_ADDR}>`,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
  });
}

const TYPE_LABELS = { tilbod: 'Førespurnad om tilbod', laerling: 'Lærling-søknad', kontakt: 'Melding frå kontaktskjemaet' };

async function notifyNewMessage(msg, siteName) {
  if (!configured) return false;
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const label = TYPE_LABELS[msg.type] || TYPE_LABELS.kontakt;
  try {
    await send({
      fromName: `${siteName} – nettside`,
      to,
      replyTo: msg.email || undefined,
      subject: `${label} – ${reinsHeader(msg.name)}`,
      text: [
        `Namn: ${msg.name}`,
        `E-post: ${msg.email || '(ikkje oppgitt)'}`,
        `Telefon: ${msg.phone || '(ikkje oppgitt)'}`,
        ...(msg.jobtype ? [`Type jobb: ${msg.jobtype}`] : []),
        ...(msg.address ? [`Adresse/stad: ${msg.address}`] : []),
        '',
        msg.message,
        '',
        `Sendt: ${msg.sentAt}`,
      ].join('\n'),
    });
    return true;
  } catch (err) {
    console.error('[mail] Sending feila:', err.message);
    return false;
  }
}

/**
 * Driftsvarsel til eigaren (synk-feil, token-utløp, degradert modus).
 * Maks éin e-post per emne per døgn, så innboksen ikkje blir fløymd.
 */
const sisteDriftsvarsel = new Map();

async function notifyDrift(subject, text) {
  if (!configured) return false;
  const no = Date.now();
  const sist = sisteDriftsvarsel.get(subject) || 0;
  if (no - sist < 24 * 60 * 60 * 1000) return false;
  sisteDriftsvarsel.set(subject, no);
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  try {
    await send({
      fromName: 'Nettsida (drift)',
      to,
      subject: `[kravik-nettside] ${reinsHeader(subject)}`,
      text,
    });
    return true;
  } catch (err) {
    console.error('[mail] Driftsvarsel feila:', err.message);
    return false;
  }
}

module.exports = { configured, notifyNewMessage, notifyDrift };
