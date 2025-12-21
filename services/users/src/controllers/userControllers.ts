import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, FriendshipStatus } from "@prisma/client";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { validateProfileUpdate } from "../utils/validation.ts";

const prisma = new PrismaClient();

// Get user profile
export async function getUserProfile(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return reply.code(404).send({ error: "User not found" });

  return reply.send({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    is2FAEnabled: (user as any).is2FAEnabled || false,
  });
}

// Get user profile by username
export async function getUserProfileByUsername(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { username } = req.params as { username: string };
  if (!username) return reply.code(400).send({ error: "Username is required." });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return reply.code(404).send({ error: "User not found." });

  return reply.send({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    status: user.status,
    is2FAEnabled: (user as any).is2FAEnabled || false,
  });
}

// Update user profile
export async function updateUserProfile(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { username, email, avatar } = req.body as { username?: string; email?: string; avatar?: string };
  if (!username && !email && !avatar) {
    return reply.code(400).send({ error: "Invalid fields." });
  }

  // Validate username and email if provided
  const validation = validateProfileUpdate(username, email);
  if (!validation.valid) {
    return reply.code(400).send({ error: validation.error });
  }

  // Check for username conflicts if username is being updated
  if (username) {
    const trimmedUsername = username.trim();
    const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existingUser && existingUser.id !== userId) {
      return reply.code(409).send({ error: "Username already taken." });
    }
  }

  // Check for email conflicts if email is being updated
  if (email) {
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingUser && existingUser.id !== userId) {
      return reply.code(409).send({ error: "Email already registered." });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username: username.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(avatar && { avatar }),
    },
  });

  return reply.send({
    id: updated.id,
    username: updated.username,
    email: updated.email,
    avatar: updated.avatar,
  });
}

// Get friend list
export async function getFriends(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const friendships = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        { requesterId: userId },
        { addresseeId: userId }
      ]
    },
    include: {
      requester: true,
      addressee: true
    }
  });

  const friends = friendships.map(f => {
    const friend =
      f.requesterId === userId ? f.addressee : f.requester;
    return {
      username: friend.username,
      avatar: friend.avatar,
      status: friend.status
    };
  });

  return reply.send(friends);
}

// Send a friend request
export async function sendFriendRequest(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { username } = req.body as { username: string };
  if (!username) return reply.code(400).send({ error: "Invalid input." });

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return reply.code(404).send({ error: "Target user not found." });
  if (target.id === userId) return reply.code(400).send({ error: "Cannot send friend request to yourself." });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId }
      ]
    }
  });
  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED)
      return reply.code(400).send({ error: "Already friends." });
    else
      return reply.code(409).send({ error: "Friend request already exists." });
  }

  const request = await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId: target.id,
      status: FriendshipStatus.PENDING
    }
  });

  return reply.code(201).send({
    id: request.id,
    fromId: request.requesterId,
    toId: request.addresseeId,
    status: request.status,
    created_at: request.created_at
  });
}

// Retrieve friend requests
export async function getFriendRequests(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const direction = (req.query as any)?.direction ?? "received";
  let where;
  if (direction === "sent") {
    where = { requesterId: userId, status: FriendshipStatus.PENDING };
  } else {
    where = { addresseeId: userId, status: FriendshipStatus.PENDING };
  }

  const requests = await prisma.friendship.findMany({
    where,
    include: {
      requester: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      },
      addressee: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      }
    }
  });

  const result = requests.map(r => {
    // For received requests, show requester info; for sent requests, show addressee info
    const otherUser = direction === "received" ? r.requester : r.addressee;
    return {
      id: r.id,
      fromId: r.requesterId,
      toId: r.addresseeId,
      requesterUsername: r.requester.username,
      addresseeUsername: r.addressee.username,
      requester: otherUser.username,
      requesterAvatar: otherUser.avatar,
      status: r.status,
      created_at: r.created_at
    };
  });

  return reply.send(result);
}

// Accept or reject a friend request
export async function updateFriendRequest(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { requestId } = req.params as { requestId: number };
  const { status } = req.body as { status: "ACCEPTED" | "REJECTED" };

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return reply.code(400).send({ error: "Invalid request." });
  }

  const request = await prisma.friendship.findUnique({ where: { id: Number(requestId) } });
  if (!request || request.addresseeId !== userId) {
    return reply.code(404).send({ error: "Friend request not found." });
  }

  if (status === "REJECTED") {
    await prisma.friendship.delete({
      where: { id: Number(requestId) }
    });
    return reply.send({ message: "Friend request rejected and removed." });
  }

  // If accepted, update status
  await prisma.friendship.update({
    where: { id: Number(requestId) },
    data: { status: status as FriendshipStatus }
  });

  return reply.send({ message: "Friend request updated successfully." });
}

// Setup 2Fa
export async function enable2FA(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Check if 2FA is already enabled
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if ((user as any)?.is2FAEnabled) {
    return reply.code(400).send({ error: "2FA is already enabled." });
  }

  // Generate a new 2FA secret
  const secret = speakeasy.generateSecret({ length: 20, name: "User Management System" });

  // Ensure otpauth_url is defined before generating QR code
  if (!secret.otpauth_url) {
    return reply.code(500).send({ error: "Failed to generate 2FA setup URL." });
  }

  // Generate QR code for authenticator apps
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);

  // Save secret to user in DB
  await prisma.user.update({
    where: { id: userId },
    data: { twoFASecret: secret.base32, is2FAEnabled: true } as any
  });

  return reply.send({
    secret: secret.base32,
    qrCode
  });
}

// Update user status
export async function updateUserStatus(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { status } = req.body as { status?: "ONLINE" | "OFFLINE" | "INGAME" };
  if (!status || !["ONLINE", "OFFLINE", "INGAME"].includes(status)) {
    return reply.code(400).send({ error: "Invalid status value." });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status }
  });

  return reply.send({ status });
}

// Remove a friend
export async function removeFriend(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { username } = req.params as { username: string };
  if (!username) return reply.code(400).send({ error: "Username is required." });

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return reply.code(404).send({ error: "User not found." });
  if (target.id === userId) return reply.code(400).send({ error: "Cannot remove yourself as a friend." });

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId }
      ]
    }
  });

  if (!friendship) {
    return reply.code(404).send({ error: "Friendship not found." });
  }

  await prisma.friendship.delete({
    where: { id: friendship.id }
  });

  return reply.send({ message: "Friend removed successfully." });
}

// Search users by username
export async function searchUsers(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify authentication
    const userId = req.user?.id;
    if (!userId) {
      req.log?.warn('Search users: Unauthorized - no user ID in request');
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // Validate query parameter
    const { q } = req.query as { q?: string };
    if (!q || typeof q !== 'string') {
      return reply.code(400).send({ error: "Search query parameter 'q' is required." });
    }

    const searchQuery = q.trim();
    if (searchQuery.length < 2) {
      return reply.code(400).send({ error: "Search query must be at least 2 characters." });
    }

    // Verify Prisma client is available
    if (!prisma) {
      req.log?.error('Search users: Prisma client not initialized');
      return reply.code(500).send({ error: "Database connection error." });
    }

    // Fetch all users (excluding current user) - SQLite compatibility
    // SQLite doesn't support case-insensitive search natively in Prisma
    // We fetch all and filter client-side for case-insensitive matching
    const allUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId // Exclude the current user from search results
        }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true
      }
    });

    // Case-insensitive search filter
    const searchLower = searchQuery.toLowerCase();
    const filteredUsers = allUsers
      .filter(user => user.username && user.username.toLowerCase().includes(searchLower))
      .slice(0, 20); // Limit results to 20

    req.log?.info(`Search users: Found ${filteredUsers.length} results for query "${searchQuery}"`);
    return reply.send(filteredUsers);
  } catch (error: any) {
    req.log?.error('Error searching users:', error);
    console.error('Error searching users:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    
    // Provide more specific error messages
    if (error?.code === 'P2002') {
      return reply.code(500).send({ error: "Database constraint error." });
    }
    if (error?.code?.startsWith('P')) {
      return reply.code(500).send({ 
        error: "Database error while searching users.",
        message: error?.message || "Unknown database error"
      });
    }
    
    return reply.code(500).send({
      error: "Internal server error while searching users.",
      message: error?.message || "Unknown error"
    });
  }
}

// API Key Management Controllers

// Generate new API key
export async function generateApiKey(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { name } = req.body as { name?: string };
  if (!name || name.trim().length === 0) {
    return reply.code(400).send({ error: "API key name is required." });
  }

  try {
    // Generate a secure random API key
    const apiKey = `ft_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Store the hashed key in database
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        name: name.trim(),
        isActive: true,
      },
    });

    // Return the plain API key only once (user must save it)
    return reply.code(201).send({
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      apiKey, // Only returned once during creation
      createdAt: apiKeyRecord.createdAt,
      message: "API key created successfully. Please save this key securely - it will not be shown again."
    });
  } catch (error: any) {
    req.log?.error('Error generating API key:', error);
    return reply.code(500).send({
      error: "Failed to generate API key.",
      message: error?.message || "Unknown error"
    });
  }
}

// List user's API keys
export async function listApiKeys(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(apiKeys);
  } catch (error: any) {
    req.log?.error('Error listing API keys:', error);
    return reply.code(500).send({
      error: "Failed to list API keys.",
      message: error?.message || "Unknown error"
    });
  }
}

// Revoke API key
export async function revokeApiKey(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = req.params as { id?: string };
  if (!id || isNaN(Number(id))) {
    return reply.code(400).send({ error: "Invalid API key ID." });
  }

  try {
    const apiKeyId = parseInt(id, 10);
    
    // Verify the API key belongs to the user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
      },
    });

    if (!apiKey) {
      return reply.code(404).send({ error: "API key not found." });
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    return reply.send({ message: "API key revoked successfully." });
  } catch (error: any) {
    req.log?.error('Error revoking API key:', error);
    return reply.code(500).send({
      error: "Failed to revoke API key.",
      message: error?.message || "Unknown error"
    });
  }
}
