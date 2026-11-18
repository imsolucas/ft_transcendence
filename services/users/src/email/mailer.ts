import nodemailer from "nodemailer";
import { config } from "../config.ts";

type Locale = "en" | "es" | "fr";
type Log = { info: (o: object, m: string) => void; error: (o: object, m: string) => void };

const transport = config.smtp
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      ...(config.smtp.user ? { auth: { user: config.smtp.user, pass: config.smtp.pass } } : {}),
    })
  : null;

/** The site language the person was using (the ft_lang cookie), else English. */
export function localeFrom(request?: Request | { headers?: Record<string, unknown> }): Locale {
  let cookie = "";
  if (request instanceof Request) cookie = request.headers.get("cookie") ?? "";
  else if (request?.headers) cookie = String((request.headers as Record<string, unknown>).cookie ?? "");
  const m = cookie.match(/(?:^|;\s*)ft_lang=(en|es|fr)/);
  return (m?.[1] as Locale) ?? "en";
}

const T = {
  verify: {
    en: { subject: "Confirm your email", lead: "Welcome to ft_transcendence! Confirm your email address to finish setting up your account.", button: "Confirm email", note: "The link works for one hour. If you didn't sign up, ignore this email." },
    es: { subject: "Confirma tu correo", lead: "¡Bienvenido a ft_transcendence! Confirma tu dirección de correo para terminar de crear tu cuenta.", button: "Confirmar correo", note: "El enlace es válido durante una hora. Si no te registraste, ignora este correo." },
    fr: { subject: "Confirmez votre e-mail", lead: "Bienvenue sur ft_transcendence ! Confirmez votre adresse e-mail pour finir de créer votre compte.", button: "Confirmer l'e-mail", note: "Le lien est valable une heure. Si vous ne vous êtes pas inscrit, ignorez cet e-mail." },
  },
  reset: {
    en: { subject: "Reset your password", lead: "Someone asked to reset the password of your ft_transcendence account.", button: "Choose a new password", note: "The link works for one hour. If it wasn't you, ignore this email: your password stays the same." },
    es: { subject: "Restablece tu contraseña", lead: "Alguien pidió restablecer la contraseña de tu cuenta de ft_transcendence.", button: "Elegir una contraseña nueva", note: "El enlace es válido durante una hora. Si no fuiste tú, ignora este correo: tu contraseña no cambia." },
    fr: { subject: "Réinitialisez votre mot de passe", lead: "Quelqu'un a demandé à réinitialiser le mot de passe de votre compte ft_transcendence.", button: "Choisir un nouveau mot de passe", note: "Le lien est valable une heure. Si ce n'était pas vous, ignorez cet e-mail : votre mot de passe ne change pas." },
  },
  exported: {
    en: { subject: "Your data was downloaded", lead: "A copy of all the data ft_transcendence stores about your account was downloaded on {when}.", note: "If this wasn't you, change your password and log out of other sessions in Settings > Security." },
    es: { subject: "Se descargaron tus datos", lead: "El {when} se descargó una copia de todos los datos que ft_transcendence guarda sobre tu cuenta.", note: "Si no fuiste tú, cambia tu contraseña y cierra las demás sesiones en Ajustes > Seguridad." },
    fr: { subject: "Vos données ont été téléchargées", lead: "Une copie de toutes les données que ft_transcendence conserve sur votre compte a été téléchargée le {when}.", note: "Si ce n'était pas vous, changez votre mot de passe et déconnectez les autres sessions dans Paramètres > Sécurité." },
  },
  deleted: {
    en: { subject: "Your account has been deleted", lead: "Your ft_transcendence account ({name}) was deleted on {when}. Your profile, friends, messages, keys and sign-in methods are gone; past matches show \"Deleted player\".", note: "This is the last email we send to this address." },
    es: { subject: "Tu cuenta ha sido eliminada", lead: "Tu cuenta de ft_transcendence ({name}) se eliminó el {when}. Tu perfil, amigos, mensajes, claves y métodos de inicio de sesión se han borrado; las partidas pasadas muestran \"Jugador eliminado\".", note: "Es el último correo que enviamos a esta dirección." },
    fr: { subject: "Votre compte a été supprimé", lead: "Votre compte ft_transcendence ({name}) a été supprimé le {when}. Votre profil, vos amis, messages, clés et méthodes de connexion ont été effacés ; les anciens matchs affichent « Joueur supprimé ».", note: "C'est le dernier e-mail que nous envoyons à cette adresse." },
  },
} as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/** Plain, readable HTML (email clients ignore most CSS); every value is escaped. */
function render(lead: string, note: string, button?: { label: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#0b0614;font-family:system-ui,sans-serif;color:#f3eeff">
<div style="max-width:520px;margin:0 auto;background:#1a1030;border:1px solid #3a2b5c;border-radius:8px;padding:24px">
<p style="font-family:monospace;letter-spacing:1px;color:#ff2e97;margin:0 0 16px">ft_transcendence</p>
<p style="line-height:1.5;margin:0 0 20px">${esc(lead)}</p>
${button ? `<p style="margin:0 0 20px"><a href="${esc(button.url)}" style="display:inline-block;background:#ff2e97;color:#0b0614;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:6px">${esc(button.label)}</a></p><p style="font-size:12px;color:#a79bc4;word-break:break-all;margin:0 0 20px">${esc(button.url)}</p>` : ""}
<p style="font-size:13px;color:#a79bc4;line-height:1.5;margin:0">${esc(note)}</p>
</div></body></html>`;
  const text = [lead, button ? `${button.label}: ${button.url}` : "", note].filter(Boolean).join("\n\n");
  return { html, text };
}

async function send(to: string, subject: string, body: { html: string; text: string }, log: Log, kind: string) {
  // erased accounts have a .invalid address: never send there
  if (to.toLowerCase().endsWith(".invalid")) return;
  if (!transport) {
    log.info({ kind }, "email skipped: SMTP_HOST is not set");
    return;
  }
  try {
    await transport.sendMail({ from: config.smtp!.from, to, subject, html: body.html, text: body.text });
    log.info({ kind }, "email sent");
  } catch (err) {
    // never log the address or the link (it carries a token)
    log.error({ err: (err as Error).message, kind }, "email failed");
  }
}

const when = (locale: Locale) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date()) + " UTC";

export const mail = {
  enabled: transport !== null,
  verify: (to: string, url: string, locale: Locale, log: Log) => {
    const t = T.verify[locale];
    return send(to, t.subject, render(t.lead, t.note, { label: t.button, url }), log, "verify");
  },
  reset: (to: string, url: string, locale: Locale, log: Log) => {
    const t = T.reset[locale];
    return send(to, t.subject, render(t.lead, t.note, { label: t.button, url }), log, "reset");
  },
  exported: (to: string, locale: Locale, log: Log) => {
    const t = T.exported[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale) }), t.note), log, "exported");
  },
  deleted: (to: string, name: string, locale: Locale, log: Log) => {
    const t = T.deleted[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale), name }), t.note), log, "deleted");
  },
};
