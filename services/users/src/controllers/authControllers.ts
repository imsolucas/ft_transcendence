import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

// Google OAuth controller
export async function googleAuth(req: FastifyRequest, reply: FastifyReply) {
  const { credential } = req.body as { credential: string };

  if (!credential) {
    return reply.code(400).send({ error: "Invalid input. Credential is required." });
  }

  try {
    // Decode the Google JWT token (basic verification - in production, verify signature)
    const decoded = jwt.decode(credential) as any;
    
    if (!decoded || !decoded.email || !decoded.sub) {
      return reply.code(400).send({ error: "Invalid Google credential." });
    }

    const googleId = decoded.sub;
    const email = decoded.email;
    const name = decoded.name || decoded.given_name || email.split('@')[0];
    const picture = decoded.picture || '';

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user with Google credentials
      // Generate a random password for Google users (they won't use it)
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      
      // Check if username is taken, if so append a number
      let username = name;
      let usernameExists = await prisma.user.findUnique({ where: { username } });
      let counter = 1;
      while (usernameExists) {
        username = `${name}${counter}`;
        usernameExists = await prisma.user.findUnique({ where: { username } });
        counter++;
      }

      user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          password: randomPassword, // Google users don't need password
          avatar: picture,
        },
      });
    } else {
      // Update avatar if it's different and user doesn't have one
      if (picture && (!user.avatar || user.avatar === '')) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: picture },
        });
      }
    }

    // Generate JWT token for the user
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
  } catch (error) {
    console.error('Google auth error:', error);
    return reply.code(500).send({ error: "Failed to authenticate with Google." });
  }
}
