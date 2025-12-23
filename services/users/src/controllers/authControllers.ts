import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import speakeasy from "speakeasy";
import { validateSignupInput, validateLoginInput, isValidEmail } from "../utils/validation.ts";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";

// Helper function to generate single JWT token
function generateToken(userId: number, username: string, email: string): string {
  // Generate single JWT token (7 days expiry)
  return jwt.sign(
    { id: userId, username, email },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// Signup controller
export async function signup(req: FastifyRequest, reply: FastifyReply) {
  const DEFAULT_AVATAR = "https://i.pravatar.cc/150?u=default";
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  // Validate input format and length
  const validation = validateSignupInput(name, email, password);
  if (!validation.valid) {
    return reply.code(400).send({ error: validation.error });
  }

  // Trim and normalize inputs
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Check for existing username
  const existingUsername = await prisma.user.findUnique({ where: { username: trimmedName } });
  if (existingUsername) {
    return reply.code(409).send({ error: "User name already exists." });
  }

  // Check for existing email
  const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existingEmail) {
    return reply.code(409).send({ error: "Email already registered." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username: trimmedName,
      email: trimmedEmail,
      password: hashed,
      avatar: DEFAULT_AVATAR,
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

  // Validate input format
  const validation = validateLoginInput(name, password);
  if (!validation.valid) {
    return reply.code(400).send({ error: validation.error });
  }

  // Trim username
  const trimmedName = name.trim();
  const user = await prisma.user.findUnique({ where: { username: trimmedName } });
  if (!user) {
    return reply.code(401).send({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid username or password" });
  }

  // Check if user is already logged in on another device/browser
  if (user.status === "ONLINE") {
    return reply.code(403).send({ 
      error: "User is already logged in on another device or browser",
      message: "Please log out from the other device before logging in here."
    });
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

  // Generate single JWT token
  const token = generateToken(user.id, user.username, user.email);

  // Return token in response body
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

    // Validate email from Google
    if (!email || !isValidEmail(email)) {
      return reply.code(400).send({ error: "Invalid Google email" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Generate username from name or email
      const baseUsername = name ? name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30) : email.split("@")[0].substring(0, 30);
      let username = baseUsername || "user";

      // Ensure username meets requirements
      if (username.length < 3) {
        username = username.padEnd(3, '0');
      }

      // Check if username already exists and append number if needed
      let finalUsername = username;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${username}${counter}`.substring(0, 30);
        counter++;
      }

      user = await prisma.user.create({
        data: {
          username: finalUsername,
          email: normalizedEmail,
          avatar: picture ?? "",
          password: "",
        }
      });
    }

    // Check if user is already logged in on another device/browser
    if (user.status === "ONLINE") {
      return reply.code(403).send({ 
        error: "User is already logged in on another device or browser",
        message: "Please log out from the other device before logging in here."
      });
    }

    // Check if user needs to set a password (OAuth users with empty password)
    const needsPassword = !user.password || user.password.trim() === "";
    
    if (needsPassword) {
      // Return special response indicating password is required
      return reply.code(202).send({
        passwordRequired: true,
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        message: "Password required. Please set a password to continue.",
      });
    }

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ONLINE" }
    });

    // Generate single JWT token
    const token = generateToken(user.id, user.username, user.email);

    // Return token in response body
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

  // Check if user is already logged in on another device/browser
  if (user.status === "ONLINE") {
    return reply.code(403).send({ 
      error: "User is already logged in on another device or browser",
      message: "Please log out from the other device before logging in here."
    });
  }

  // Update user status
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ONLINE" }
  });

  // Generate single JWT token
  const token = generateToken(user.id, user.username, user.email);

  // Return token in response body
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

// Logout controller
export async function logout(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;
  let userId: number | null = null;

  // First, try to get user ID from req.user (set by authentication middleware)
  if ((req as any).user && (req as any).user.id) {
    userId = (req as any).user.id;
    req.log?.info(`Logout: Using user ID from req.user: ${userId}`);
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  }

  // If we don't have userId from req.user, try to get it from token
  // Note: jwt.decode() doesn't verify the token, so it works even if token is expired
  if (!userId && token) {
    try {
      const decoded = jwt.decode(token, { complete: false }) as { id?: number; exp?: number } | null;
      if (decoded) {
        if (decoded.id) {
          userId = decoded.id;
          req.log?.info(`Logout: Using user ID from token: ${userId}`);
        } else {
          req.log?.warn(`Logout: Token decoded but no user ID found in payload:`, decoded);
        }
      } else {
        req.log?.warn(`Logout: Token decode returned null - token may be malformed`);
      }
    } catch (err) {
      req.log?.error(`Logout: Exception while decoding token: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update user status to OFFLINE if we have a user ID
  if (userId) {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: "OFFLINE" }
      });
      req.log?.info(`Logout: Successfully updated user ${userId} status to OFFLINE`);
    } catch (err) {
      // User might not exist, log the error
      req.log?.error(`Logout: Error updating user status for user ${userId}:`, err);
    }
  } else {
    req.log?.warn(`Logout: No user ID available, skipping status update`);
  }

  // Blacklist token if provided
  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        const tokenHash = await bcrypt.hash(token, 10);

        await prisma.tokenBlacklist.create({
          data: {
            tokenHash,
            expiresAt,
          },
        });
      }
    } catch (err) {
      // Token might be invalid, ignore
    }
  }

  return reply.send({ message: "Logged out successfully" });
}

// Set password for OAuth users
export async function setPassword(req: FastifyRequest, reply: FastifyReply) {
  const { userId, password } = req.body as { userId: number; password: string };

  if (!userId || !password) {
    return reply.code(400).send({ error: "User ID and password are required." });
  }

  // Validate password
  if (password.length < 6) {
    return reply.code(400).send({ error: "Password must be at least 6 characters long." });
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    // Check if user already has a password
    if (user.password && user.password.trim() !== "") {
      return reply.code(400).send({ error: "User already has a password set." });
    }

    // Check if user is already logged in on another device/browser
    if (user.status === "ONLINE") {
      return reply.code(403).send({ 
        error: "User is already logged in on another device or browser",
        message: "Please log out from the other device before setting a password here."
      });
    }

    // Hash and set password
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ONLINE" }
    });

    // Generate single JWT token now that password is set
    const token = generateToken(user.id, user.username, user.email);

    // Return token
    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      message: "Password set successfully.",
    });
  } catch (error: any) {
    req.log?.error("Error setting password:", error);
    return reply.code(500).send({
      error: "Failed to set password.",
      message: error?.message || "Unknown error",
    });
  }
}
