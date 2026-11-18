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
    en: { subject: "Confirm your email", lead: "Welcome to VOLLEY.EXE! Confirm your email address to finish setting up your account.", button: "Confirm email", note: "The link works for one hour. If you didn't sign up, ignore this email." },
    es: { subject: "Confirma tu correo", lead: "¡Bienvenido a VOLLEY.EXE! Confirma tu dirección de correo para terminar de crear tu cuenta.", button: "Confirmar correo", note: "El enlace es válido durante una hora. Si no te registraste, ignora este correo." },
    fr: { subject: "Confirmez votre e-mail", lead: "Bienvenue sur VOLLEY.EXE ! Confirmez votre adresse e-mail pour finir de créer votre compte.", button: "Confirmer l'e-mail", note: "Le lien est valable une heure. Si vous ne vous êtes pas inscrit, ignorez cet e-mail." },
  },
  reset: {
    en: { subject: "Reset your password", lead: "Someone asked to reset the password of your VOLLEY.EXE account.", button: "Choose a new password", note: "The link works for one hour. If it wasn't you, ignore this email: your password stays the same." },
    es: { subject: "Restablece tu contraseña", lead: "Alguien pidió restablecer la contraseña de tu cuenta de VOLLEY.EXE.", button: "Elegir una contraseña nueva", note: "El enlace es válido durante una hora. Si no fuiste tú, ignora este correo: tu contraseña no cambia." },
    fr: { subject: "Réinitialisez votre mot de passe", lead: "Quelqu'un a demandé à réinitialiser le mot de passe de votre compte VOLLEY.EXE.", button: "Choisir un nouveau mot de passe", note: "Le lien est valable une heure. Si ce n'était pas vous, ignorez cet e-mail : votre mot de passe ne change pas." },
  },
  exported: {
    en: { subject: "Your data was downloaded", lead: "A copy of all the data VOLLEY.EXE stores about your account was downloaded on {when}.", note: "If this wasn't you, change your password and log out of other sessions in Settings > Security." },
    es: { subject: "Se descargaron tus datos", lead: "El {when} se descargó una copia de todos los datos que VOLLEY.EXE guarda sobre tu cuenta.", note: "Si no fuiste tú, cambia tu contraseña y cierra las demás sesiones en Ajustes > Seguridad." },
    fr: { subject: "Vos données ont été téléchargées", lead: "Une copie de toutes les données que VOLLEY.EXE conserve sur votre compte a été téléchargée le {when}.", note: "Si ce n'était pas vous, changez votre mot de passe et déconnectez les autres sessions dans Paramètres > Sécurité." },
  },
  existing: {
    en: { subject: "Someone tried to sign up with your email", lead: "Someone tried to create a new VOLLEY.EXE account with this email address on {when}. You already have an account, so nothing was created.", button: "Sign in", note: "If that was you, just sign in (or reset your password). If it wasn't, you can ignore this email: your account is unchanged." },
    es: { subject: "Alguien intentó registrarse con tu correo", lead: "El {when}, alguien intentó crear una cuenta nueva de VOLLEY.EXE con esta dirección. Ya tienes una cuenta, así que no se creó nada.", button: "Iniciar sesión", note: "Si fuiste tú, inicia sesión (o restablece tu contraseña). Si no, puedes ignorar este correo: tu cuenta no ha cambiado." },
    fr: { subject: "Quelqu'un a essayé de s'inscrire avec votre e-mail", lead: "Le {when}, quelqu'un a essayé de créer un nouveau compte VOLLEY.EXE avec cette adresse. Vous avez déjà un compte, donc rien n'a été créé.", button: "Se connecter", note: "Si c'était vous, connectez-vous (ou réinitialisez votre mot de passe). Sinon, ignorez cet e-mail : votre compte n'a pas changé." },
  },
  newSignIn: {
    en: { subject: "New sign-in to your account", lead: "Your VOLLEY.EXE account ({name}) was just signed in to from a new device: {device}, on {when}.", button: "Review your sessions", note: "If this was you, there's nothing to do. If it wasn't, open the link, sign out every other session and change your password right away." },
    es: { subject: "Nuevo inicio de sesión en tu cuenta", lead: "Se acaba de iniciar sesión en tu cuenta de VOLLEY.EXE ({name}) desde un dispositivo nuevo: {device}, el {when}.", button: "Revisar tus sesiones", note: "Si fuiste tú, no tienes que hacer nada. Si no, abre el enlace, cierra todas las demás sesiones y cambia tu contraseña enseguida." },
    fr: { subject: "Nouvelle connexion à votre compte", lead: "Votre compte VOLLEY.EXE ({name}) vient d'être connecté depuis un nouvel appareil : {device}, le {when}.", button: "Vérifier vos sessions", note: "Si c'était vous, il n'y a rien à faire. Sinon, ouvrez le lien, déconnectez toutes les autres sessions et changez votre mot de passe immédiatement." },
  },
  deleted: {
    en: { subject: "Your account has been deleted", lead: "Your VOLLEY.EXE account ({name}) was deleted on {when}. Your profile, friends, messages and sign-in methods are gone; past matches show \"Deleted player\".", note: "This is the last email we send to this address." },
    es: { subject: "Tu cuenta ha sido eliminada", lead: "Tu cuenta de VOLLEY.EXE ({name}) se eliminó el {when}. Tu perfil, amigos, mensajes y métodos de inicio de sesión se han borrado; las partidas pasadas muestran \"Jugador eliminado\".", note: "Es el último correo que enviamos a esta dirección." },
    fr: { subject: "Votre compte a été supprimé", lead: "Votre compte VOLLEY.EXE ({name}) a été supprimé le {when}. Votre profil, vos amis, messages et méthodes de connexion ont été effacés ; les anciens matchs affichent « Joueur supprimé ».", note: "C'est le dernier e-mail que nous envoyons à cette adresse." },
  },
} as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/** Plain, readable HTML (email clients ignore most CSS); every value is escaped. */
function render(lead: string, note: string, button?: { label: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#0b0614;font-family:system-ui,sans-serif;color:#f3eeff">
<div style="max-width:520px;margin:0 auto;background:#1a1030;border:1px solid #3a2b5c;border-radius:8px;padding:24px">
<p style="font-family:monospace;letter-spacing:1px;color:#ff2e97;margin:0 0 16px">VOLLEY.EXE</p>
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

/**
 * Per-recipient throttle for emails a stranger can trigger (sign-up with your address,
 * verification and reset links): at most one per address per window, so the app can't be used
 * to flood an inbox from many IPs. In memory, like the rate limiters.
 */
const WINDOW_MS = { existing: 30 * 60_000, verify: 2 * 60_000, reset: 5 * 60_000 } as const;
const lastSent = new Map<string, number>();
function throttled(kind: keyof typeof WINDOW_MS, to: string): boolean {
  const key = `${kind}:${to.toLowerCase()}`;
  const now = Date.now();
  const last = lastSent.get(key);
  if (last !== undefined && now - last < WINDOW_MS[kind]) return true;
  lastSent.set(key, now);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, at] of lastSent) if (now - at > 30 * 60_000) lastSent.delete(key);
}, 10 * 60_000).unref();

const when = (locale: Locale) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date()) + " UTC";

export const mail = {
  enabled: transport !== null,
  verify: (to: string, url: string, locale: Locale, log: Log) => {
    if (throttled("verify", to)) {
      log.info({ kind: "verify" }, "email throttled (sent to this address recently)");
      return Promise.resolve();
    }
    const t = T.verify[locale];
    return send(to, t.subject, render(t.lead, t.note, { label: t.button, url }), log, "verify");
  },
  reset: (to: string, url: string, locale: Locale, log: Log) => {
    if (throttled("reset", to)) {
      log.info({ kind: "reset" }, "email throttled (sent to this address recently)");
      return Promise.resolve();
    }
    const t = T.reset[locale];
    return send(to, t.subject, render(t.lead, t.note, { label: t.button, url }), log, "reset");
  },
  exported: (to: string, locale: Locale, log: Log) => {
    const t = T.exported[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale) }), t.note), log, "exported");
  },
  existing: (to: string, url: string, locale: Locale, log: Log) => {
    if (throttled("existing", to)) {
      log.info({ kind: "existing" }, "email throttled (sent to this address recently)");
      return Promise.resolve();
    }
    const t = T.existing[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale) }), t.note, { label: t.button, url }), log, "existing");
  },
  newSignIn: (to: string, name: string, device: string, url: string, locale: Locale, log: Log) => {
    const t = T.newSignIn[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale), name, device }), t.note, { label: t.button, url }), log, "new-sign-in");
  },
  deleted: (to: string, name: string, locale: Locale, log: Log) => {
    const t = T.deleted[locale];
    return send(to, t.subject, render(fill(t.lead, { when: when(locale), name }), t.note), log, "deleted");
  },
};
