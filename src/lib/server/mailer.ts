import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import Handlebars, { type TemplateDelegate } from "handlebars";
import { serverConfig } from "./config";

let transporter: Transporter | null = null;
const templateCache = new Map<string, TemplateDelegate>();

function getTransport(): Transporter {
  if (transporter) return transporter;

  const secure = serverConfig.smtpSecure() === "true";

  transporter = nodemailer.createTransport({
    host: serverConfig.smtpHost() || "localhost",
    port: parseInt(serverConfig.smtpPort(), 10) || 587,
    secure,
    // Preserves the original NestJS behaviour: ignore TLS unless SMTP_SECURE
    // is explicitly "false".
    ignoreTLS: serverConfig.smtpSecure() !== "false",
    auth: {
      user: serverConfig.smtpAuthUser(),
      pass: serverConfig.smtpAuthPass(),
    },
  });

  return transporter;
}

async function renderTemplate(
  templateFile: string,
  context: Record<string, unknown>,
): Promise<string> {
  let tpl = templateCache.get(templateFile);
  if (!tpl) {
    const filePath = path.join(process.cwd(), "emails", templateFile);
    const raw = await readFile(filePath, "utf8");
    tpl = Handlebars.compile(raw);
    templateCache.set(templateFile, tpl);
  }
  return tpl(context);
}

async function sendOneMail(
  to: string,
  subject: string,
  templateFile: string,
  context: Record<string, unknown>,
): Promise<string> {
  try {
    const html = await renderTemplate(templateFile, context);
    await getTransport().sendMail({
      to,
      from:
        serverConfig.mailerDefaultFrom() ||
        '"No Reply" <noreplay@loschinosgame.com>',
      subject,
      html,
    });
    return "mail sent";
  } catch (err) {
    console.error("[mailer] error sending mail:", err);
    return `error in sending mail ${err}`;
  }
}

export async function sendEmailVerify(
  userName: string,
  email: string,
  uuid: string,
): Promise<string> {
  return sendOneMail(
    email,
    serverConfig.emailVerifySubject(),
    serverConfig.emailVerifyTemplate(),
    {
      userName,
      link: `${serverConfig.appHost()}${serverConfig.emailVerifyLink()}`,
      uuid,
    },
  );
}

export async function sendEmailForgot(
  userName: string,
  email: string,
  uuid: string,
): Promise<string> {
  return sendOneMail(
    email,
    serverConfig.emailForgotSubject(),
    serverConfig.emailForgotTemplate(),
    {
      userName,
      link: `${serverConfig.appHost()}${serverConfig.emailForgotLink()}`,
      uuid,
    },
  );
}
