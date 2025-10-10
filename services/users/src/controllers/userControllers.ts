import type { FastifyRequest, FastifyReply } from "fastify";

type User = { id: number; name: string };

let users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];
let nextId = 3;

export const getUsers = (req: FastifyRequest, res: FastifyReply) => {
  return res.send(users);
};

export const getUserById = (
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

  const user = users.find((u) => u.id === id);
  if (!user) return res.code(404).send({ error: "User not found" });

  return res.send(user);
};

export const createUser = (
  req: FastifyRequest<{ Body: { name?: string } }>,
  res: FastifyReply
) => {
  const name = req.body?.name;
  if (!name || typeof name !== "string")
    return res.code(400).send({ error: "Missing or invalid 'name' in body" });

  const newUser: User = { id: nextId++, name };
  users.push(newUser);
  return res.code(201).send(newUser);
};

export const updateUser = (
  req: FastifyRequest<{ Params: { id: string }; Body: { name?: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return res.code(404).send({ error: "User not found" });

  const name = req.body?.name;
  if (name !== undefined && typeof name !== "string")
    return res.code(400).send({ error: "Invalid 'name' in body" });

  if (name !== undefined) users[idx].name = name;

  return res.send(users[idx]);
};

export const deleteUser = (
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return res.code(404).send({ error: "User not found" });

  users.splice(idx, 1);
  return res.code(204).send();
};
