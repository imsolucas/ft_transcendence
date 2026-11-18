import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../auth/auth.ts";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.ts";
import { config } from "../../config.ts";
import { requireUser } from "../../auth/guards.ts";
import { localeFrom, mail } from "../../email/mailer.ts";

/** Handles of deleted accounts. Real handles are [a-z0-9_.] only, so this can't collide. */
export const DELETED_PREFIX = "deleted-";
export const isDeletedHandle = (username: string) => username.startsWith(DELETED_PREFIX);

/** Deleting needs a sign-in from the last 10 minutes (password and passkey users alike). */
const FRESH_MS = 10 * 60 * 1000;
const EXPORT_LIMIT = 10_000;
const lastExportMail = new Map<number, number>();

const COOKIE_NAMES = ["__Secure-ft.session_token", "__Secure-ft.session_data", "__Secure-ft.dont_remember"];

export default async function privacyRoutes(app: FastifyInstance) {
  /** GDPR access / portability: everything we hold about the caller, as one JSON file. */
  app.get("/me/export", { preHandler: requireUser }, async (req, reply) => {
    const id = req.user!.id;
    const involves = { OR: [{ player1Id: id }, { player2Id: id }] };
    const [user, accounts, sessions, friendships, blocks, matches, tournaments, messages, achievements, passkeys, devices, ratings, parties] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, displayUsername: true, email: true, emailVerified: true, avatar: true, look: true, twoFactorEnabled: true, created_at: true, last_updated: true },
      }),
      prisma.account.findMany({ where: { userId: id }, select: { providerId: true, createdAt: true } }),
      prisma.session.findMany({ where: { userId: id }, select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true }, orderBy: { id: "desc" }, take: EXPORT_LIMIT }),
      prisma.friendship.findMany({
        where: { OR: [{ requesterId: id }, { addresseeId: id }] },
        select: { status: true, created_at: true, requester: { select: { username: true } }, addressee: { select: { username: true } } },
        orderBy: { id: "asc" },
        take: EXPORT_LIMIT,
      }),
      prisma.block.findMany({ where: { blockerId: id }, select: { createdAt: true, blocked: { select: { username: true } } }, orderBy: { id: "asc" }, take: EXPORT_LIMIT }),
      prisma.match.findMany({
        where: involves,
        select: { played_at: true, end_at: true, player1DisplayName: true, player2DisplayName: true, player1Score: true, player2Score: true, player1Id: true, winnerId: true, tournamentId: true },
        orderBy: { id: "asc" },
        take: EXPORT_LIMIT,
      }),
      prisma.tournamentPlayer.findMany({ where: { userId: id }, select: { tournament: { select: { name: true, start_at: true, end_at: true, winnerId: true } } }, orderBy: { id: "asc" }, take: EXPORT_LIMIT }),
      prisma.message.findMany({
        where: { OR: [{ senderId: id }, { recipientId: id }] },
        select: { kind: true, body: true, inviteCode: true, createdAt: true, readAt: true, sender: { select: { username: true } }, recipient: { select: { username: true } } },
        orderBy: { id: "asc" },
        take: EXPORT_LIMIT,
      }),
      prisma.userAchievement.findMany({ where: { userId: id }, select: { achievement: true, unlockedAt: true }, orderBy: { id: "asc" } }),
      prisma.passkey.findMany({ where: { userId: id }, select: { name: true, deviceType: true, createdAt: true }, orderBy: { id: "asc" } }),
      prisma.knownDevice.findMany({ where: { userId: id }, select: { label: true, firstSeen: true, lastSeen: true }, orderBy: { id: "asc" } }),
      prisma.rating.findMany({ where: { userId: id }, select: { season: { select: { number: true } }, rating: true, games: true, wins: true, peak: true }, orderBy: { seasonId: "asc" } }),
      prisma.partyMatchPlayer.findMany({
        where: { userId: id },
        select: { placement: true, livesLeft: true, partyMatch: { select: { played_at: true, end_at: true, players: { select: { displayName: true, placement: true }, orderBy: { placement: "asc" } } } } },
        orderBy: { id: "asc" },
        take: EXPORT_LIMIT,
      }),
    ]);
    if (!user) return reply.code(404).send({ error: "User not found" });

    const data = {
      exportedAt: new Date().toISOString(),
      about: "Everything VOLLEY.EXE stores about your account. Passwords and two-factor secrets are stored only as hashes/encrypted values and are not included.",
      profile: user,
      signInMethods: accounts.map((a) => ({ provider: a.providerId, linkedAt: a.createdAt })),
      sessions,
      friends: friendships.map((f) => ({
        with: f.requester.username === user.username ? f.addressee.username : f.requester.username,
        direction: f.requester.username === user.username ? "sent" : "received",
        status: f.status,
        since: f.created_at,
      })),
      blocked: blocks.map((b) => ({ username: b.blocked.username, since: b.createdAt })),
      matches: matches.map((m) => {
        const you = m.player1Id === id ? 1 : 2;
        return {
          playedAt: m.played_at,
          endedAt: m.end_at,
          opponent: you === 1 ? m.player2DisplayName : m.player1DisplayName,
          yourScore: you === 1 ? m.player1Score : m.player2Score,
          opponentScore: you === 1 ? m.player2Score : m.player1Score,
          result: m.winnerId === null ? "none" : m.winnerId === id ? "win" : "loss",
          tournament: m.tournamentId !== null,
        };
      }),
      parties: parties.map((p) => ({
        playedAt: p.partyMatch.played_at,
        endedAt: p.partyMatch.end_at,
        yourPlace: p.placement,
        yourLivesLeft: p.livesLeft,
        players: p.partyMatch.players.map((x) => ({ name: x.displayName, place: x.placement })),
      })),
      tournaments: tournaments.map((t) => ({ ...t.tournament, winnerId: undefined, won: t.tournament.winnerId === id })),
      messages: messages.map((m) => ({ from: m.sender.username, to: m.recipient.username, kind: m.kind, body: m.body, inviteCode: m.inviteCode, sentAt: m.createdAt, readAt: m.readAt })),
      achievements,
      passkeys,
      signInDevices: devices,
      rankedSeasons: ratings.map((r) => ({ season: r.season.number, rating: Math.round(r.rating), games: r.games, wins: r.wins, peak: Math.round(r.peak) })),
    };
    // GDPR: confirm the data operation by email (so an unexpected export is noticed)
    // at most one confirmation per user per hour (repeated downloads must not flood the inbox)
    if (Date.now() - (lastExportMail.get(id) ?? 0) > 60 * 60 * 1000) {
      lastExportMail.set(id, Date.now());
      void mail.exported(user.email, localeFrom(req), req.log);
    }
    reply.header("Content-Type", "application/json; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="volley-exe-${user.username}-${new Date().toISOString().slice(0, 10)}.json"`);
    reply.header("Cache-Control", "no-store");
    return reply.send(JSON.stringify(data, null, 2));
  });

  /**
   * GDPR erasure. Personal data is deleted; match rows stay (the opponent's history and
   * stats depend on them) but point at an anonymous "Deleted player".
   */
  app.post(
    "/me/delete",
    {
      preHandler: requireUser,
      schema: {
        body: { type: "object", additionalProperties: false, required: ["confirm"], properties: { confirm: { type: "string", maxLength: 40 } } },
      },
    },
    async (req, reply) => {
      const id = req.user!.id;
      const { confirm } = req.body as { confirm: string };
      if (confirm.trim().toLowerCase() !== req.user!.username) {
        return reply.code(400).send({ error: "Type your username to confirm." });
      }
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session || Date.now() - new Date(session.session.createdAt).getTime() > FRESH_MS) {
        return reply.code(403).send({ error: "For your safety, log in again, then delete your account within 10 minutes.", code: "REAUTH" });
      }

      const before = await prisma.user.findUnique({ where: { id }, select: { avatar: true, email: true, displayUsername: true, username: true } });
      const anon = `${DELETED_PREFIX}${id}`;
      await prisma.$transaction([
        prisma.message.deleteMany({ where: { OR: [{ senderId: id }, { recipientId: id }] } }),
        prisma.friendship.deleteMany({ where: { OR: [{ requesterId: id }, { addresseeId: id }] } }),
        prisma.block.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } }),
        prisma.userAchievement.deleteMany({ where: { userId: id } }),
        prisma.twoFactor.deleteMany({ where: { userId: id } }),
        prisma.passkey.deleteMany({ where: { userId: id } }),
        prisma.knownDevice.deleteMany({ where: { userId: id } }),
        prisma.rating.deleteMany({ where: { userId: id } }),
        prisma.account.deleteMany({ where: { userId: id } }),
        prisma.session.deleteMany({ where: { userId: id } }),
        prisma.match.updateMany({ where: { player1Id: id }, data: { player1DisplayName: "Deleted player" } }),
        prisma.match.updateMany({ where: { player2Id: id }, data: { player2DisplayName: "Deleted player" } }),
        prisma.partyMatchPlayer.updateMany({ where: { userId: id }, data: { displayName: "Deleted player" } }),
        prisma.user.update({
          where: { id },
          data: {
            username: anon,
            displayUsername: "Deleted player",
            name: "Deleted player",
            // random part: an attacker can't pre-register this address and make deletion fail
            email: `${anon}-${crypto.randomBytes(8).toString("hex")}@deleted.invalid`,
            emailVerified: false,
            avatar: null,
            look: Prisma.DbNull,
            twoFactorEnabled: false,
            status: "OFFLINE",
          },
        }),
      ]);

      // remove the uploaded avatar file (only ones this user uploaded)
      const avatar = before?.avatar;
      if (avatar?.startsWith("/api/avatars/") && path.basename(avatar).startsWith(`${id}-`)) {
        await fs.unlink(path.join(config.uploadDir, path.basename(avatar))).catch(() => {});
      }
      req.log.info({ userId: id }, "account deleted");
      // confirmation to the address the account had (captured before it was erased)
      if (before) void mail.deleted(before.email, before.displayUsername ?? before.username, localeFrom(req), req.log);
      for (const name of COOKIE_NAMES) reply.header("Set-Cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      return reply.code(204).send();
    }
  );
}
