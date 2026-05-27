import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const INVITE_VERIFY_BASE =
  process.env.APP_INVITE_REDIRECT_URL ?? "https://allonsapp.com/verify";

/** Default when MAIL_FROM is unset — must match a domain verified on this RESEND_API_KEY account. */
const DEFAULT_MAIL_FROM = "Allons <no-reply@thefndrs.com>";

function resolveMailFrom(): string {
  const raw = process.env.MAIL_FROM?.trim();
  if (!raw) return DEFAULT_MAIL_FROM;
  if (/^[^\s<]+@[^\s>]+$/.test(raw)) {
    return `Allons <${raw}>`;
  }
  return raw;
}

function formatResendError(status: number, body: string): string {
  if (status === 403 && body.includes("not verified")) {
    const domain =
      body.match(/The ([^\s]+) domain is not verified/)?.[1] ??
      "el dominio del remitente";
    return (
      `Resend rechazó el remitente: ${domain} no está verificado en la misma cuenta ` +
      `de tu RESEND_API_KEY. En resend.com/domains revisa qué dominios tiene esa cuenta ` +
      `(API key ≠ otra sesión de Resend). Usa MAIL_FROM con un dominio verificado ahí ` +
      `(p. ej. Allons <no-reply@thefndrs.com>) o verifica allonsapp.com en esa cuenta.`
    );
  }
  return `Resend ${status}${body ? `: ${body.slice(0, 200)}` : ""}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildComercioInviteHtml(
  metadata: Record<string, unknown>,
  inviteUrl: string,
): string {
  const brandName = escapeHtml(String(metadata.brand_name ?? "tu comercio"));
  const greeting = metadata.comercio_role === "admin" ? brandName : brandName;
  const bodyCopy =
    metadata.comercio_role === "admin"
      ? "Tu cuenta de comercio fue creada en Allons. Toca el botón desde tu celular para abrir la app y crear tu contraseña."
      : `${brandName} te invitó a colaborar en Allons. Toca el botón desde tu celular para abrir la app y crear tu contraseña.`;
  const safeUrl = escapeHtml(inviteUrl);

  return `<!DOCTYPE html>
<html lang="es-HN">
<body style="margin:0;padding:0;background:#131516;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fbfbfb">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#131516">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" style="max-width:560px" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding-bottom:24px">
          <div style="font-size:22px;font-weight:700;color:#f67010">Allons</div>
          <div style="margin-top:4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(251,251,251,.55)">Comercios</div>
        </td></tr>
        <tr><td style="background:#1c1b20;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px 28px">
          <p style="margin:0 0 16px;font-size:18px;font-weight:700">Hola ${greeting},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:rgba(251,251,251,.82)">${bodyCopy}</p>
          <p style="margin:28px 0;text-align:center">
            <a href="${safeUrl}" style="display:inline-block;background:#f67010;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px">Abrir app y crear contraseña</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:20px;color:rgba(251,251,251,.45)">Si el botón no funciona, abre este enlace en tu celular:</p>
          <p style="margin:8px 0 0;font-size:12px;line-height:18px;word-break:break-all">
            <a href="${safeUrl}" style="color:#f67010">${safeUrl}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export type SendComercioInviteResult = {
  userId: string | null;
  emailSent: boolean;
  error?: string;
};

/**
 * Creates/refreshes the Supabase invite and sends our HTML via Resend so we
 * never depend on the Supabase dashboard template (which may still say allons.app).
 */
export async function sendComercioInviteEmail(args: {
  email: string;
  metadata: Record<string, unknown>;
}): Promise<SendComercioInviteResult> {
  const admin = createSupabaseServiceRoleClient();
  const redirectTo = INVITE_VERIFY_BASE;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: args.email,
    options: {
      data: args.metadata,
      redirectTo,
    },
  });

  if (error) {
    return { userId: null, emailSent: false, error: error.message };
  }

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) {
    return {
      userId: data.user?.id ?? null,
      emailSent: false,
      error: "Supabase no devolvió hashed_token",
    };
  }

  const inviteUrl = `${redirectTo.replace(/\?.*$/, "")}?token_hash=${encodeURIComponent(tokenHash)}&type=invite`;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveMailFrom();
  if (!resendKey) {
    return {
      userId: data.user?.id ?? null,
      emailSent: false,
      error: "Configura RESEND_API_KEY en allons-admin",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.email],
      subject: "Bienvenido a Allons Comercios",
      html: buildComercioInviteHtml(args.metadata, inviteUrl),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      userId: data.user?.id ?? null,
      emailSent: false,
      error: formatResendError(res.status, body),
    };
  }

  return { userId: data.user?.id ?? null, emailSent: true };
}
