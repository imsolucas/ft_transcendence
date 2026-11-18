import type { FriendshipState, PublicUser } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { lookFor } from "../../../../shared/cosmetics/look.ts";

/** Columns needed to present a user; use with `select` so wide rows are never loaded. */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayUsername: true,
  name: true,
  avatar: true,
  status: true,
  look: true,
} as const;

type PublicUserRow = {
  id: number;
  username: string;
  displayUsername: string | null;
  name: string;
  avatar: string | null;
  status: "ONLINE" | "INGAME" | "OFFLINE";
  look: unknown;
};

export function toPublicUser(u: PublicUserRow): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayUsername || u.name || u.username,
    avatar: u.avatar,
    presence: u.status,
    look: lookFor(u.id, u.look),
  };
}

/** Relationship between `viewerId` and `targetId`, from the viewer's side. */
export async function friendshipState(viewerId: number, targetId: number): Promise<FriendshipState> {
  if (viewerId === targetId) return "none";
  const [blocks, friendship] = await Promise.all([
    prisma.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
      select: { blockerId: true },
      take: 2,
    }),
    prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: viewerId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: viewerId },
        ],
      },
      select: { requesterId: true, status: true },
    }),
  ]);
  if (blocks.some((b) => b.blockerId === viewerId)) return "blocked";
  // Being blocked is never revealed (same answer as no relationship)
  if (blocks.length > 0) return "none";
  if (!friendship) return "none";
  if (friendship.status === "ACCEPTED") return "friends";
  if (friendship.status === "PENDING") return friendship.requesterId === viewerId ? "request_sent" : "request_received";
  return "none";
}

/** Batch version for lists (one query per relation instead of one per row). */
export async function friendshipStates(viewerId: number, targetIds: number[]): Promise<Map<number, FriendshipState>> {
  const result = new Map<number, FriendshipState>(targetIds.map((id) => [id, "none" as FriendshipState]));
  if (targetIds.length === 0) return result;
  const [blocks, friendships] = await Promise.all([
    prisma.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: { in: targetIds } },
          { blockedId: viewerId, blockerId: { in: targetIds } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: viewerId, addresseeId: { in: targetIds } },
          { addresseeId: viewerId, requesterId: { in: targetIds } },
        ],
      },
      select: { requesterId: true, addresseeId: true, status: true },
    }),
  ]);
  for (const f of friendships) {
    const other = f.requesterId === viewerId ? f.addresseeId : f.requesterId;
    if (f.status === "ACCEPTED") result.set(other, "friends");
    else if (f.status === "PENDING") result.set(other, f.requesterId === viewerId ? "request_sent" : "request_received");
  }
  for (const b of blocks) {
    if (b.blockerId === viewerId) result.set(b.blockedId, "blocked");
    else result.set(b.blockerId, "none"); // never reveal being blocked
  }
  return result;
}

export function parsePage(query: unknown, defaultSize = 10, maxSize = 50) {
  const q = (query ?? {}) as { page?: unknown; pageSize?: unknown };
  const page = Math.min(1000, Math.max(1, Math.floor(Number(q.page) || 1)));
  const pageSize = Math.min(maxSize, Math.max(1, Math.floor(Number(q.pageSize) || defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

/** Params schema for routes with a numeric :id */
export const ID_PARAMS = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1, maximum: 2147483647 } },
} as const;
