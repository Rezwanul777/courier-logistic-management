import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { TokenPayload } from "google-auth-library/build/src/auth/loginticket";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../lib/mail";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
  IAuthResponse,
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IPendingRegistration,
  IRegisterCustomerPayload,
  IResetPasswordPayload,
  ITokenUser,
  IVerifyEmailPayload,
} from "./auth.interface";
import { AuthUtils } from "./auth.utils";
import { googleClient } from "../../utils/google";

import { Prisma } from "../../../generated/prisma/client";



const otpKey = (email: string) => `courier:register:${email}`;
const attemptsKey = (email: string) => `courier:register:attempts:${email}`;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const otpDigest = (email: string, otp: string) =>
  createHmac("sha256", config.jwt_access_secret)
    .update(`${email}:${otp}`)
    .digest("hex");
const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerified: true,
  tokenVersion: true,
} as const;

async function issueTokens(user: ITokenUser) {
  const { accessToken, refreshToken, refreshExpiresAt } =
    AuthUtils.generateTokens(user);
  await prisma.$transaction(async (tx) => {
    const valid = await tx.user.updateMany({
      where: {
        id: user.id,
        tokenVersion: user.tokenVersion,
        isActive: true,
        deletedAt: null,
      },
      data: { tokenVersion: { increment: 0 } },
    });
    if (valid.count !== 1)
      throw new AppError(401, "Account changed. Please log in again.");
    await tx.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hash(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
  });
  return { accessToken, refreshToken };
}

async function register(input: IRegisterCustomerPayload) {
  const email = input.email.trim().toLowerCase();
  if (
    await prisma.user.findUnique({ where: { email }, select: { id: true } })
  ) {
    throw new AppError(409, "Email already registered");
  }
  const otp = String(randomInt(100000, 1000000));
  const pending = JSON.stringify({
    name: input.name,
    email,
    passwordHash: await bcrypt.hash(
      input.password,
      config.bcrypt_salt_rounds ?? 10,
    ),
    otpHash: otpDigest(email, otp),
  });
  await redisClient.set(otpKey(email), pending, { EX: 300 });
  await redisClient.del(attemptsKey(email));
  try {
    await sendVerificationEmail(email, otp);
  } catch (error) {
    await redisClient.del(otpKey(email));
    throw error;
  }
  return null;
}

async function verifyEmail(input: IVerifyEmailPayload) {
  const email = input.email.trim().toLowerCase();
  const attempts = await redisClient.incr(attemptsKey(email));
  if (attempts === 1) await redisClient.expire(attemptsKey(email), 300);
  if (attempts > 5) throw new AppError(429, "Too many verification attempts");
  const raw = await redisClient.get(otpKey(email));
  if (!raw) throw new AppError(400, "Code expired or not requested");
  const pending = JSON.parse(raw) as IPendingRegistration;
  const received = Buffer.from(otpDigest(email, input.otp), "hex");
  const expected = Buffer.from(pending.otpHash, "hex");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new AppError(400, "Invalid verification code");
  }
  const consumed = await redisClient.getDel(otpKey(email));
  if (!consumed) throw new AppError(409, "Code already used");
  await redisClient.del(attemptsKey(email));
  const user = await prisma.user.create({
    data: {
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
    },
    select: publicUser,
  });
  return { user, ...(await issueTokens(user)) };
}

async function login(input: ILoginUserPayload) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
  });
  if (
    !user?.passwordHash ||
    !user.emailVerified ||
    !user.isActive ||
    user.deletedAt ||
    !(await bcrypt.compare(input.password, user.passwordHash))
  ) {
    throw new AppError(401, "Invalid credentials");
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    ...(await issueTokens(user)),
  };
}

// async function googleLogin(input: IGoogleLoginPayload) {
//   if (!config.google_client_id)
//     throw new AppError(503, "Google login is not configured");
//   const client = new OAuth2Client(config.google_client_id);
//   let payload: TokenPayload | undefined;
//   try {
//     payload = (
//       await client.verifyIdToken({
//         idToken: input.idToken,
//         audience: config.google_client_id,
//       })
//     ).getPayload();
//   } catch {
//     throw new AppError(401, "Invalid Google ID token");
//   }
//   if (!payload?.sub || !payload.email || !payload.email_verified) {
//     throw new AppError(401, "A verified Google email is required");
//   }
//   const email = payload.email.trim().toLowerCase();
//   let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
//   if (!user) {
//     const existing = await prisma.user.findUnique({ where: { email } });
//     if (existing)
//       throw new AppError(
//         409,
//         "Email already registered. Sign in with your existing method.",
//       );
//     user = await prisma.user.create({
//       data: {
//         email,
//         name: payload.name || email.split("@")[0],
//         googleId: payload.sub,
//         authProvider: "GOOGLE",
//         emailVerified: true,
//         role: Role.CUSTOMER,
//       },
//     });
//   }
//   if (user.email !== email || !user.isActive || user.deletedAt)
//     throw new AppError(403, "Account unavailable");
//   return {
//     user: {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//       tokenVersion: user.tokenVersion,
//     },
//     ...(await issueTokens(user)),
//   };
// }

// const googleLogin = async (idToken: string) => {
//   const ticket = await googleClient.verifyIdToken({
//     idToken,

//     audience: config.google_client_id,
//   });

//   const payload = ticket.getPayload();

//   if (!payload) {
//     throw new Error("Invalid Google token");
//   }

//   const email = payload.email;

//   const name = payload.name || "Google User";

//   const googleId = payload.sub;

//   if (!email) {
//     throw new Error("Google email not found");
//   }

//   let user = await prisma.user.findUnique({
//     where: {
//       email,
//     },
//   });

//   if (!user) {
//     user = await prisma.user.create({
//       data: {
//         name,

//         email,

//         googleId,

//         authProvider: "GOOGLE",

//         emailVerified: true,

//         isActive: true,

//         role: "CUSTOMER",
//       },
//     });
//   }

//   return user;
// };


async function googleLogin(
  input: IGoogleLoginPayload,
): Promise<IAuthResponse> {
  // 1. Check configuration.
  if (!config.google_client_id) {
    throw new AppError(
      503,
      "Google login is not configured.",
    );
  }

  // 2. Verify Google's signed ID token.
  let payload: TokenPayload | undefined;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: config.google_client_id,
    });

    payload = ticket.getPayload();
  } catch {
    throw new AppError(
      401,
      "Invalid or expired Google ID token.",
    );
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new AppError(
      401,
      "A verified Google account is required.",
    );
  }

  const googleId = payload.sub;
  const email = payload.email.trim().toLowerCase();

  // 3. Returning Google users must match
  //    their original Google account ID.
  let user = await prisma.user.findUnique({
    where: {
      googleId,
    },
  });

  if (!user) {
    // 4. Do not automatically link an existing
    // password, Courier, or Admin account.
    const existingEmail =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (existingEmail) {
      throw new AppError(
        409,
        "This email already has an account. Please sign in using its existing method.",
      );
    }

    // 5. Create only CUSTOMER accounts.
    try {
      user = await prisma.user.create({
        data: {
          email,

          name:
            payload.name?.trim() ||
            email.split("@")[0],

          googleId,

          authProvider: "GOOGLE",

          emailVerified: true,
          isActive: true,

          role: Role.CUSTOMER,
        },
      });
    } catch (error: unknown) {
      // Handle concurrent sign-ups safely.
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          409,
          "A matching account already exists. Please try signing in again.",
        );
      }

      throw error;
    }
  }

  // 6. Enforce both identity and Customer role.
  if (
    user.googleId !== googleId ||
    user.email !== email ||
    user.role !== Role.CUSTOMER
  ) {
    throw new AppError(
      403,
      "This Google account cannot access the customer workspace.",
    );
  }

  // 7. Respect account restrictions.
  if (
    !user.isActive ||
    user.deletedAt ||
    !user.emailVerified
  ) {
    throw new AppError(
      403,
      "Account unavailable.",
    );
  }

  // 8. Issue the existing CourierFlow
  //    access and refresh tokens.
  const tokens = await issueTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || email.split("@")[0],
      role: user.role,
      tokenVersion: user.tokenVersion,
    },

    ...tokens,
  };
}

async function refresh(refreshToken: string) {
  const verified = jwtUtils.verifyToken(
    refreshToken,
    config.jwt_refresh_secret,
  );
  if (
    !verified.success ||
    !verified.data ||
    verified.data.type !== "refresh" ||
    !verified.data.jti
  ) {
    throw new AppError(401, "Invalid or expired refresh token");
  }
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: hash(refreshToken) },
    include: { user: true },
  });
  if (
    !session ||
    verified.data.userId !== Number(session.userId) ||
    verified.data.tokenVersion !== session.user.tokenVersion ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive ||
    session.user.deletedAt ||
    !session.user.emailVerified
  )
    throw new AppError(401, "Invalid refresh token");
  const {
    accessToken,
    refreshToken: newRefreshToken,
    refreshExpiresAt,
  } = AuthUtils.generateTokens(session.user);
  await prisma.$transaction(async (tx) => {
    const valid = await tx.user.updateMany({
      where: {
        id: session.userId,
        tokenVersion: session.user.tokenVersion,
        isActive: true,
        deletedAt: null,
      },
      data: { tokenVersion: { increment: 0 } },
    });
    if (valid.count !== 1) throw new AppError(401, "Invalid refresh token");
    const updated = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count !== 1)
      throw new AppError(401, "Refresh token already used");
    await tx.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: hash(newRefreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
  });
  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

async function logout(refreshToken: string) {
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hash(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function me(userId: number) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: publicUser,
  });
}

// Redis scripts keep attempt limits and one-time use atomic across API instances.
const CONSUME_RESET = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
local value = cjson.decode(raw)
if value.attempts >= 5 then return nil end
if value.otpHash ~= ARGV[1] then
 value.attempts = value.attempts + 1
 redis.call('SET', KEYS[1], cjson.encode(value), 'KEEPTTL')
 return nil
end
redis.call('DEL', KEYS[1])
return raw
`;
const DELETE_MATCHING = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;
const resetKey = (email: string) => `courier:password-reset:${hash(email)}`;
const resetDigest = (email: string, otp: string) =>
  createHmac("sha256", config.jwt_access_secret)
    .update(`password-reset:${email}:${otp}`)
    .digest("hex");

async function forgotPassword(input: IForgotPasswordPayload) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Keep the public response identical for unavailable accounts and Google-only users.
  if (
    !user?.passwordHash ||
    !user.emailVerified ||
    !user.isActive ||
    user.deletedAt
  )
    return;
  const otp = String(randomInt(100000, 1000000));
  const pending = JSON.stringify({
    userId: user.id,
    tokenVersion: user.tokenVersion,
    otpHash: resetDigest(email, otp),
    attempts: 0,
  });
  // A valid code is not replaced by repeated requests. Request another after expiry.
  if (!(await redisClient.set(resetKey(email), pending, { EX: 300, NX: true })))
    return;
  try {
    await sendPasswordResetEmail(email, otp);
  } catch {
    await redisClient.eval(DELETE_MATCHING, {
      keys: [resetKey(email)],
      arguments: [pending],
    });
    console.error("Password reset email delivery failed");
  }
}

async function resetPassword(input: IResetPasswordPayload) {
  const email = input.email.trim().toLowerCase();
  const raw = await redisClient.eval(CONSUME_RESET, {
    keys: [resetKey(email)],
    arguments: [resetDigest(email, input.otp)],
  });
  if (typeof raw !== "string")
    throw new AppError(
      400,
      "Invalid or expired reset code. Request a new code after the current code expires.",
    );
  const pending = JSON.parse(raw) as { userId: number; tokenVersion: number };
  const passwordHash = await bcrypt.hash(
    input.newPassword,
    config.bcrypt_salt_rounds ?? 10,
  );
  await prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: {
        id: pending.userId,
        email,
        tokenVersion: pending.tokenVersion,
        passwordHash: { not: null },
        emailVerified: true,
        isActive: true,
        deletedAt: null,
      },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new AppError(400, "Invalid or expired reset code");
    await tx.refreshSession.updateMany({
      where: { userId: pending.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}


// --------------------------------------------
// Customer account security helpers
// --------------------------------------------

async function getActiveCustomer(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      deletedAt: true,
      passwordHash: true,
      googleId: true,
    },
  });

  if (
    !user ||
    user.role !== Role.CUSTOMER ||
    !user.isActive ||
    !user.emailVerified ||
    user.deletedAt
  ) {
    throw new AppError(
      403,
      "Customer account is unavailable.",
    );
  }

  return user;
}

// Require a recently issued, verified Google
// credential belonging to this Customer email.
async function verifyFreshGoogleIdentity(
  idToken: string,
  expectedEmail: string,
): Promise<string> {
  if (!config.google_client_id) {
    throw new AppError(
      503,
      "Google authentication is unavailable.",
    );
  }

  let payload: TokenPayload | undefined;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });

    payload = ticket.getPayload();
  } catch {
    throw new AppError(
      401,
      "Google verification failed.",
    );
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true ||
    payload.email.trim().toLowerCase() !==
      expectedEmail.toLowerCase()
  ) {
    throw new AppError(
      403,
      "The Google account must match your CourierFlow email.",
    );
  }

  const issuedAt = payload.iat;
  const now = Math.floor(Date.now() / 1000);

  if (
    typeof issuedAt !== "number" ||
    issuedAt > now + 60 ||
    now - issuedAt > 300
  ) {
    throw new AppError(
      401,
      "Please verify with Google again.",
    );
  }

  return payload.sub;
}

// --------------------------------------------
// GET /auth/login-methods
// --------------------------------------------

async function getLoginMethods(userId: number) {
  const user = await getActiveCustomer(userId);

  return {
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleId),
  };
}

// --------------------------------------------
// POST /auth/set-password
//
// For Customer accounts first created with
// Google. The existing Customer ID is retained.
// --------------------------------------------

async function setPasswordForGoogleCustomer(
  userId: number,
  input: {
    idToken: string;
    newPassword: string;
  },
) {
  const user = await getActiveCustomer(userId);

  if (!user.googleId) {
    throw new AppError(
      409,
      "No Google account is linked.",
    );
  }

  if (user.passwordHash) {
    throw new AppError(
      409,
      "Password login is already enabled.",
    );
  }

  const verifiedGoogleId =
    await verifyFreshGoogleIdentity(
      input.idToken,
      user.email,
    );

  if (verifiedGoogleId !== user.googleId) {
    throw new AppError(
      403,
      "Google identity does not match this account.",
    );
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    config.bcrypt_salt_rounds ?? 10,
  );

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        role: Role.CUSTOMER,
        isActive: true,
        deletedAt: null,
        emailVerified: true,
        googleId: verifiedGoogleId,
        passwordHash: null,
      },
      data: {
        passwordHash,
      },
    });

    if (updated.count !== 1) {
      throw new AppError(
        409,
        "Account changed. Refresh and try again.",
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "USER_PASSWORD_ENABLED",
        entityType: "User",
        entityId: userId,
        requestId: randomUUID(),
        after: {
          passwordLoginEnabled: true,
        },
      },
    });
  });
}

// --------------------------------------------
// POST /auth/link-google
//
// For Customers first created with password.
// Current password + Google proof are required.
// --------------------------------------------

async function linkGoogleToCustomer(
  userId: number,
  input: {
    idToken: string;
    password: string;
  },
) {
  const user = await getActiveCustomer(userId);

  if (user.googleId) {
    throw new AppError(
      409,
      "Google login is already enabled.",
    );
  }

  if (
    !user.passwordHash ||
    !(await bcrypt.compare(
      input.password,
      user.passwordHash,
    ))
  ) {
    throw new AppError(
      401,
      "Current password is incorrect.",
    );
  }

  const googleId = await verifyFreshGoogleIdentity(
    input.idToken,
    user.email,
  );

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          role: Role.CUSTOMER,
          isActive: true,
          deletedAt: null,
          emailVerified: true,
          googleId: null,
          passwordHash: {
            not: null,
          },
        },
        data: {
          googleId,
        },
      });

      if (updated.count !== 1) {
        throw new AppError(
          409,
          "Account changed. Refresh and try again.",
        );
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "USER_GOOGLE_LINKED",
          entityType: "User",
          entityId: userId,
          requestId: randomUUID(),
          after: {
            googleLoginEnabled: true,
          },
        },
      });
    });
  } catch (error: unknown) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "This Google account is linked to another user.",
      );
    }

    throw error;
  }
}


export const AuthService = {
  forgotPassword,
  resetPassword,
  registerCustomer: register,
  verifyEmail,
  loginUser: login,
  googleLogin,
  refreshToken: refresh,
  logout,
  getMe: me,
  setPasswordForGoogleCustomer,
  linkGoogleToCustomer,
  getLoginMethods,
};
