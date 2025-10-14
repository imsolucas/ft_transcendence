import type { FastifyRequest, FastifyReply } from "fastify";

export const getUsers = async (req: FastifyRequest, res: FastifyReply) => {
  const users = await req.server.db.user.findMany();
  return res.send(users);
};

export const getUserById = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

  const user = await req.server.db.user.findUnique({ where: {id} });
  if (!user) return res.code(404).send({ error: "User not found" });

  return res.send(user);
};

// export const createUser = async (
//   req: FastifyRequest<{
//      Body: { name?: string }
//   }>,
//   res: FastifyReply
// ) => {
//   const name = req.body?.name;
//   if (!name || typeof name !== "string")
//     return res.code(400).send({ error: "Missing or invalid 'name' in body" });

//   const newUser: User = await req.server.db.user.create({

//   })
//   users.push(newUser);
//   return res.code(201).send(newUser);
// };

// export const updateUser = async (
//   req: FastifyRequest<{ Params: { id: string }; Body: { name?: string } }>,
//   res: FastifyReply
// ) => {
//   const id = Number(req.params.id);
//   if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

//   const idx = users.findIndex((u) => u.id === id);
//   if (idx === -1) return res.code(404).send({ error: "User not found" });

//   const name = req.body?.name;
//   if (name !== undefined && typeof name !== "string")
//     return res.code(400).send({ error: "Invalid 'name' in body" });

//   if (name !== undefined) users[idx].name = name;

//   return res.send(users[idx]);
// };

// export const deleteUser = async (
//   req: FastifyRequest<{ Params: { id: string } }>,
//   res: FastifyReply
// ) => {
//   const id = Number(req.params.id);
//   if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

//   const idx = users.findIndex((u) => u.id === id);
//   if (idx === -1) return res.code(404).send({ error: "User not found" });

//   users.splice(idx, 1);
//   return res.code(204).send();
// };
