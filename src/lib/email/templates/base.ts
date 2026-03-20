const BASE_URL =
  process.env.NEXTAUTH_URL || "https://intranet.miotecimpulsate.cl";

export function renderEmailBase(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8B3A9E,#5A1F68);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <a href="${BASE_URL}" style="color:#ffffff;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                Mi OTEC
              </a>
              <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:6px 0 0;letter-spacing:1px;text-transform:uppercase;">
                Plataforma Educativa
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e8e5ef;border-right:1px solid #e8e5ef;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border:1px solid #e8e5ef;border-top:none;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Mi OTEC Intranet &middot; Plataforma educativa
              </p>
              <p style="color:#9ca3af;font-size:11px;margin:6px 0 0;">
                Este correo fue enviado automáticamente. No respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { BASE_URL };
