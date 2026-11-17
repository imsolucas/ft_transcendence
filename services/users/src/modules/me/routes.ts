import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Me } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { config } from "../../config.ts";
import { requireUser } from "../../auth/guards.ts";
import { PUBLIC_USER_SELECT, toPublicUser } from "../shared/presenters.ts";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_URL_PREFIX = "/api/avatars/";

// Accept only real images: check magic bytes, never the client's content type.
function detectImage(buf: Buffer): "png" | "jpg" | "webp" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function loadMe(userId: number): Promise<Me | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...PUBLIC_USER_SELECT, email: true, twoFactorEnabled: true },
  });
  if (!u) return null;
  return { ...toPublicUser(u), email: u.email, twoFactorEnabled: !!u.twoFactorEnabled };
}

/** Deletes an uploaded avatar file, but only one this user uploaded (name starts with their id). */
async function removeStoredAvatar(userId: number, avatar: string | null) {
  if (!avatar?.startsWith(AVATAR_URL_PREFIX)) return;
  const file = path.basename(avatar);
  if (!file.startsWith(`${userId}-`)) return;
  await fs.unlink(path.join(config.uploadDir, file)).catch(() => {});
}

export default async function meRoutes(app: FastifyInstance) {
  await app.register(import("@fastify/multipart"), {
    limits: { fileSize: MAX_AVATAR_BYTES, files: 1, fields: 0 },
  });

  app.get("/me", { preHandler: requireUser }, async (req, reply) => {
    const me = await loadMe(req.user!.id);
    if (!me) return reply.code(404).send({ error: "User not found" });
    return me;
  });

  app.patch(
    "/me",
    {
      preHandler: requireUser,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            displayName: { type: "string", minLength: 3, maxLength: 30, pattern: "^[A-Za-z0-9_.]+$" },
          },
        },
      },
    },
    async (req, reply) => {
      const { displayName } = req.body as { displayName?: string };
      if (displayName !== undefined) {
        // The display name is the handle with its original casing; it must match the handle.
        if (displayName.toLowerCase() !== req.user!.username) {
          const taken = await prisma.user.findUnique({ where: { username: displayName.toLowerCase() }, select: { id: true } });
          if (taken) return reply.code(409).send({ error: "That username is taken." });
        }
        try {
          await prisma.user.update({
            where: { id: req.user!.id },
            data: { username: displayName.toLowerCase(), displayUsername: displayName, name: displayName },
          });
        } catch (err: any) {
          if (err?.code === "P2002") return reply.code(409).send({ error: "That username is taken." });
          throw err;
        }
      }
      return loadMe(req.user!.id);
    }
  );

  app.post("/me/avatar", { preHandler: requireUser }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "Choose an image to upload." });
    let buf: Buffer;
    try {
      buf = await file.toBuffer();
    } catch {
      return reply.code(413).send({ error: "That image is larger than 2 MB." });
    }
    const kind = detectImage(buf);
    if (!kind) return reply.code(415).send({ error: "Use a PNG, JPEG or WebP image." });

    await fs.mkdir(config.uploadDir, { recursive: true });
    const name = `${req.user!.id}-${crypto.randomBytes(8).toString("hex")}.${kind}`;
    await fs.writeFile(path.join(config.uploadDir, name), buf, { mode: 0o640 });

    const previous = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatar: true } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatar: AVATAR_URL_PREFIX + name } });
    await removeStoredAvatar(req.user!.id, previous?.avatar ?? null);
    return loadMe(req.user!.id);
  });

  app.delete("/me/avatar", { preHandler: requireUser }, async (req) => {
    const previous = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatar: true } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatar: null } });
    await removeStoredAvatar(req.user!.id, previous?.avatar ?? null);
    return loadMe(req.user!.id);
  });

  // Public avatar files (names are random; no directory listing)
  app.get("/avatars/:file", async (req, reply) => {
    const { file } = req.params as { file: string };
    if (!/^\d+-[0-9a-f]{16}\.(png|jpg|webp)$/.test(file)) return reply.code(404).send({ error: "Not found" });
    try {
      const data = await fs.readFile(path.join(config.uploadDir, file));
      const ext = file.split(".").pop();
      reply.header("Content-Type", ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(data);
    } catch {
      return reply.code(404).send({ error: "Not found" });
    }
  });
}
