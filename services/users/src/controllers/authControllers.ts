import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import speakeasy from "speakeasy";
import { error } from "console";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";

// Signup controller
export async function signup(req: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  if (!name || !email || !password) {
    return reply.code(400).send({ error: "Invalid input." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return reply.code(400).send({ error: "Email already registered." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username: name,
      email,
      password: hashed,
      avatar: "",
    },
  });

  return reply.code(201).send({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  });
}

// Login controller
export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { name, password } = req.body as { name: string; password: string };

  if (!name || !password) {
    return reply.code(400).send({ error: "Invalid input." });
  }

  const user = await prisma.user.findUnique({ where: { username: name } });
  if (!user) {
    return reply.code(401).send({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid username or password" });
  }

  if (user.is2FAEnabled) {
    return reply.code(202).send({
      twoFARequired: true,
      id: user.id
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ONLINE" }
  });

  // Issue token if 2FA is not enabled
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return reply.send({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
  });
}

// Google Auth controller

const client = new OAuth2Client();

export async function googleAuth(req: FastifyRequest, reply: FastifyReply) {
  const { idToken } = req.body as { idToken: string };

  if (!idToken) {
    return reply.code(400).send({ error: "Missing Google ID token" });
  }

  try {
    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // Your Google Client ID
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return reply.code(400).send({ error: "Invalid Google token" });
    }

    // Extract user info from payload
    const { email, name, picture } = payload;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: name ?? email.split("@")[0],
          email,
          avatar: picture ?? "",
          password: "",
        }
      });
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    return reply.code(400).send({ error: "Invalid Google token" });
  }
}

// 2FA Verification controller
export async function verify2FA(req: FastifyRequest, reply: FastifyReply) {
  const { userId, code } = req.body as { userId: number; code: string };
  if (!userId || !code) {
    return reply.code(400).send({ error: "Missing userId or code" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.is2FAEnabled || !user.twoFASecret) {
    return reply.code(401).send({ error: "2FA not enabled for this user" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: code,
    window: 1 // allows for slight clock drift
  });

  if (!verified) {
    return reply.code(401).send({ error: "Invalid 2FA code" });
  }

  // Issue JWT after successful 2FA
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return reply.send({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
  });
}
