import { Prisma } from "@prisma/client";
import type { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcrypt";

export const getUsers = async (req: FastifyRequest, res: FastifyReply) => {
  const users = await req.server.db.user.findMany();
  return res.send(users);
};

export const getUserByName = async (
  req: FastifyRequest<{ Params: { name: string } }>,
  res: FastifyReply
) => {
  const { name } = req.params;

  // Validate the 'name' parameter
  if (!name || typeof name !== "string") {
    return res.code(400).send({ error: "Invalid or missing 'name' parameter" });
  }

  try {
    // Query the user by username
    const user = await req.server.db.user.findUnique({ where: { username: name } });
    if (!user) {
      return res.code(404).send({ error: "User not found" });
    }

    return res.send(user);
  } catch (error) {
    console.error("Error fetching user by name:", error);
    return res.code(500).send({ error: "Internal Server Error" });
  }
};

export const createUser = async (
  req: FastifyRequest<{
     Body: {
      username?: string;
      email?: string;
      password?: string;
      avatar?: string;
     }
  }>,
  res: FastifyReply
) => {
  const username = req.body?.username;
  if (!username || typeof username !== "string")
    return res.code(400).send({ error: "Missing or invalid 'username' in body" });

  const email = req.body?.email;
  if (!email || typeof email !== "string")
    return res.code(400).send({ error: "Missing or invalid 'email' in body"})

  const userAvatar = req.body?.avatar || "http://example.com/default-avatar.png";

  const password = req.body?.password;
  if (!password || typeof password !== "string")
    return res.code(400).send({ error: "Missing or invalid 'password' in body"})

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: User = await req.server.db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        avatar: userAvatar
      }
    })
    return res.code(201).send(newUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code == "P2002") {
      return res.code(409).send({ error: "Email is already in use" })
    }

    console.error("Error creating user:", error);
    return res.code(500).send({ error: "Internal Server Error" })
  }
};

export const updateUser = async (
  req: FastifyRequest<{
    Params: { id: string };
    Body: { username?: string; email?: string; avatar?: string };
  }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.code(400).send({ error: "Invalid id" });
  }

  const { username, email, avatar } = req.body || {};

  // Validate fields if they are provided
  if (username !== undefined && typeof username !== "string") {
    return res.code(400).send({ error: "Invalid 'username' in body" });
  }
  if (email !== undefined && typeof email !== "string") {
    return res.code(400).send({ error: "Invalid 'email' in body" });
  }
  if (avatar !== undefined && typeof avatar !== "string") {
    return res.code(400).send({ error: "Invalid 'avatar' in body" });
  }

  try {
    const updatedUser = await req.server.db.user.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    return res.send(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      // Handle case where user does not exist
      return res.code(404).send({ error: "User not found" });
    }

    return res.code(500).send({ error: "Internal Server Error" });
  }
};

export const deleteUser = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.code(400).send({ error: "Invalid id" });
  }

  try {
    const deletedUser = await req.server.db.user.delete({
      where: { id },
    });

    return res.code(204).send(); // No content response
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      // Handle case where user does not exist
      return res.code(404).send({ error: "User not found" });
    }

    return res.code(500).send({ error: "Internal Server Error" });
  }
};
