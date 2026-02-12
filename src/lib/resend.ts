import { Resend } from 'resend';

let client: Resend;

function getClient(): Resend {
  if (client) return client;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

export async function sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
  await getClient().emails.send({
    from: `Progetto Gare <${fromEmail}>`,
    to: email,
    subject: 'Accedi a Progetto Gare',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #3b82f6; color: white; font-weight: bold; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">PG</div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 16px;">Accedi a Progetto Gare</h1>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
          Clicca il pulsante qui sotto per accedere alla piattaforma. Il link scade tra 15 minuti.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${magicLink}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px;">
            Accedi ora
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Se non hai richiesto questo link, puoi ignorare questa email.
        </p>
      </div>
    `,
  });
}

export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  companyName: string,
  inviteLink: string
): Promise<void> {
  await getClient().emails.send({
    from: `Progetto Gare <${fromEmail}>`,
    to: email,
    subject: `${inviterName} ti ha invitato su Progetto Gare`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #3b82f6; color: white; font-weight: bold; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">PG</div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 16px;">Sei stato invitato!</h1>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 8px;">
          <strong>${inviterName}</strong> ti ha invitato a unirti al team di <strong>${companyName}</strong> su Progetto Gare.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
          Progetto Gare e la piattaforma AI per la gestione delle gare d'appalto.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${inviteLink}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px;">
            Accetta invito
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Questo invito scade tra 7 giorni.
        </p>
      </div>
    `,
  });
}
