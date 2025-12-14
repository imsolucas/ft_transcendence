import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import speakeasy from "speakeasy";
import { error } from "console";
import crypto from "crypto";
import { validateSignupInput, validateLoginInput, isValidEmail } from "../utils/validation.ts";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const isProduction = process.env.NODE_ENV === "production";

// Helper function to generate token pair
async function generateTokenPair(userId: number, username: string, email: string) {
  // Generate access token (30 minutes)
  const accessToken = jwt.sign(
    { id: userId, username, email },
    JWT_SECRET,
    { expiresIn: "30m" }
  );

  // Generate refresh token (7 days)
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    expiresAt,
  };
}

// Helper function to set refresh token cookie
function setRefreshTokenCookie(reply: FastifyReply, refreshToken: string) {
  const cookieOptions: any = {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? "strict" : "lax", // Use "lax" in development to allow cross-port cookies
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  };
  
  // Don't set domain in development - let browser handle it for localhost
  // Setting domain explicitly can prevent cookies from working across ports
  if (isProduction) {
    // In production, you might want to set domain based on your setup
    // cookieOptions.domain = '.yourdomain.com';
  }
  
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, cookieOptions);
  console.log('Cookie set:', REFRESH_TOKEN_COOKIE_NAME, 'Options:', JSON.stringify(cookieOptions));
}

// Helper function to clear refresh token cookie
function clearRefreshTokenCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax", // Use "lax" in development to allow cross-port cookies
    path: "/",
  });
}

// Signup controller
export async function signup(req: FastifyRequest, reply: FastifyReply) {
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

  // Generate token pair
  const { accessToken, refreshToken, refreshTokenHash, expiresAt } = await generateTokenPair(
    user.id,
    user.username,
    user.email
  );

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    },
  });

  // Set refresh token as HTTP-only cookie
  setRefreshTokenCookie(reply, refreshToken);

  // Return only access token in response body
  return reply.send({
    token: accessToken,
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

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ONLINE" }
    });

    // Generate token pair
    const { accessToken, refreshToken, refreshTokenHash, expiresAt } = await generateTokenPair(
      user.id,
      user.username,
      user.email
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(reply, refreshToken);

    // Return only access token in response body
    return reply.send({
      token: accessToken,
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

  // Update user status
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ONLINE" }
  });

  // Generate token pair
  const { accessToken, refreshToken, refreshTokenHash, expiresAt } = await generateTokenPair(
    user.id,
    user.username,
    user.email
  );

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    },
  });

  // Set refresh token as HTTP-only cookie
  setRefreshTokenCookie(reply, refreshToken);

  // Return only access token in response body
  return reply.send({
    token: accessToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    },
  });
}

// Refresh token controller
export async function refreshToken(req: FastifyRequest, reply: FastifyReply) {
  console.log('Refresh endpoint called. Request origin:', req.headers.origin);
  console.log('All cookies received:', Object.keys(req.cookies));
  console.log('Cookie header:', req.headers.cookie);
  
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    console.log('Refresh token not found in cookies. Available cookies:', Object.keys(req.cookies));
    console.log('Full cookie header:', req.headers.cookie);
    return reply.code(401).send({ error: "No refresh token provided" });
  }

  // Find refresh token in database
  const refreshTokens = await prisma.refreshToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
      used: false,
    },
  });

  let tokenRecord = null;
  for (const record of refreshTokens) {
    const isValid = await bcrypt.compare(refreshToken, record.tokenHash);
    if (isValid) {
      tokenRecord = record;
      break;
    }
  }

  if (!tokenRecord) {
    clearRefreshTokenCookie(reply);
    return reply.code(401).send({ error: "Invalid or expired refresh token" });
  }

  // Mark old refresh token as used (single-use)
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { used: true },
  });

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: tokenRecord.userId },
  });

  if (!user) {
    clearRefreshTokenCookie(reply);
    return reply.code(401).send({ error: "User not found" });
  }

  // Generate new token pair
  const { accessToken, refreshToken: newRefreshToken, refreshTokenHash, expiresAt } = await generateTokenPair(
    user.id,
    user.username,
    user.email
  );

  // Store new refresh token in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    },
  });

  // Set new refresh token cookie
  setRefreshTokenCookie(reply, newRefreshToken);

  // Return new access token
  return reply.send({
    token: accessToken,
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
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  let accessToken: string | null = null;
  let userId: number | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.replace("Bearer ", "");
  }

  // Get user ID from access token if available
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as { id?: number; exp?: number } | null;
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    } catch (err) {
      // Token might be invalid, ignore
    }
  }

  // Delete refresh token from database if provided and get user ID if not already found
  if (refreshToken) {
    const refreshTokens = await prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        used: false,
      },
    });

    for (const record of refreshTokens) {
      const isValid = await bcrypt.compare(refreshToken, record.tokenHash);
      if (isValid) {
        // Get user ID from refresh token if not already found from access token
        if (!userId) {
          userId = record.userId;
        }
        await prisma.refreshToken.delete({
          where: { id: record.id },
        });
        break;
      }
    }
  }

  // Update user status to OFFLINE if we have a user ID
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "OFFLINE" }
      });
    } catch (err) {
      // User might not exist, ignore
      console.error('Error updating user status on logout:', err);
    }
  }

  // Blacklist access token if provided
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        const tokenHash = await bcrypt.hash(accessToken, 10);
        
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

  // Clear refresh token cookie
  clearRefreshTokenCookie(reply);

  return reply.send({ message: "Logged out successfully" });
}
