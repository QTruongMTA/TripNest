import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { emailService } from "./email.service";
import { sessionService } from "./session.service";
import { signAccessToken } from "../utils/jwt.utils";

function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  phone: string | null;
  avatar: string | null;
  birthDate: Date | null;
  nationality: string;
  gender: string | null;
  address: string | null;
  role: string;
  emailVerified: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.displayName,
    phone: user.phone,
    avatar: user.avatar,
    birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
    nationality: user.nationality,
    gender: user.gender,
    address: user.address,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

export const authService = {
  async register(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return { kind: "EMAIL_ALREADY_EXISTS" as const };
    }

    const password = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        role: true,
        emailVerified: true,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    sessionService.markActive(user.id);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        entity: "USER",
        entityId: user.id,
      },
    });

    // Create email verification token and send (best-effort — don't fail registration)
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: verifyToken,
          type: "EMAIL_VERIFY",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await emailService.sendVerificationEmail(user.email, verifyToken);
    } catch (err) {
      console.error("[register] Failed to send verification email:", err);
    }

    return {
      kind: "SUCCESS" as const,
      data: {
        accessToken,
        user: toPublicUser(user),
      },
    };
  },

  async login(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        role: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return { kind: "INVALID_CREDENTIALS" as const };
    }

    const passwordMatches = await bcrypt.compare(input.password, user.password);

    if (!passwordMatches) {
      return { kind: "INVALID_CREDENTIALS" as const };
    }

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    sessionService.markActive(user.id);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "AUTH",
        entityId: user.id,
      },
    });

    return {
      kind: "SUCCESS" as const,
      data: {
        accessToken: token,
        user: toPublicUser(user),
      },
    };
  },

  async getCurrentUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        role: true,
        emailVerified: true,
      },
    });

    return user ? toPublicUser(user) : null;
  },

  async updateAvatar(id: string, avatar: string | null) {
    const user = await prisma.user.update({
      where: { id },
      data: { avatar },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        role: true,
        emailVerified: true,
      },
    });

    return toPublicUser(user);
  },

  async updateProfile(
    id: string,
    input: {
      name?: string;
      displayName?: string | null;
      phone?: string | null;
      birthDate?: string | null;
      nationality?: string;
      gender?: string | null;
      address?: string | null;
    }
  ) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.displayName !== undefined
          ? { displayName: input.displayName?.trim() || null }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.birthDate !== undefined
          ? { birthDate: input.birthDate ? new Date(input.birthDate) : null }
          : {}),
        ...(input.nationality !== undefined
          ? { nationality: input.nationality.trim() || "Việt Nam" }
          : {}),
        ...(input.gender !== undefined ? { gender: input.gender?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        role: true,
        emailVerified: true,
      },
    });

    return toPublicUser(user);
  },

  async changePassword(id: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    return { kind: "SUCCESS" as const };
  },

  async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, emailVerified: true } } },
    });

    if (!record) return { kind: "INVALID_TOKEN" as const };
    if (record.type !== "EMAIL_VERIFY") return { kind: "INVALID_TOKEN" as const };
    if (record.expiresAt < new Date()) return { kind: "TOKEN_EXPIRED" as const };
    if (record.user.emailVerified) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      return { kind: "ALREADY_VERIFIED" as const };
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      prisma.verificationToken.delete({ where: { id: record.id } }),
      prisma.auditLog.create({
        data: { userId: record.userId, action: "EMAIL_VERIFY", entity: "USER", entityId: record.userId },
      }),
    ]);

    return { kind: "SUCCESS" as const };
  },

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) return { kind: "NOT_FOUND" as const };
    if (user.emailVerified) return { kind: "ALREADY_VERIFIED" as const };

    // Delete any existing EMAIL_VERIFY tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId, type: "EMAIL_VERIFY" },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await emailService.sendVerificationEmail(user.email, token);
    return { kind: "SUCCESS" as const };
  },

  async logout(id: string) {
    sessionService.markInactive(id);
    await prisma.auditLog.create({
      data: {
        userId: id,
        action: "LOGOUT",
        entity: "AUTH",
        entityId: id,
      },
    });
    return { kind: "SUCCESS" as const };
  },
};
