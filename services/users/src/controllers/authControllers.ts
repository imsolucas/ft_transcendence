import { FastifyRequest, FastifyReply } from "fastify";
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
