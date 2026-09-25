import type {
  Request,
  Response
} from "express";

import {
  updateProfileSchema
} from "./profile.schemas.js";

import {
  getProfile,
  updateProfile
} from "./profile.service.js";

function getAuthorizedCustomerId(
  req: Request,
  res: Response
) {
  const customerId =
    req.customer?.id;

  if (!customerId) {
    res.status(401).json({
      error: {
        code:
          "UNAUTHORIZED",

        message:
          "Требуется авторизация"
      }
    });

    return null;
  }

  return customerId;
}

export async function getProfileController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const profile =
    await getProfile(
      customerId
    );

  if (!profile) {
    res.status(404).json({
      error: {
        code:
          "PROFILE_NOT_FOUND",

        message:
          "Профиль покупателя не найден"
      }
    });

    return;
  }

  res.json({
    data: profile
  });
}

export async function updateProfileController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const bodyResult =
    updateProfileSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PROFILE_DATA",

        message:
          "Некорректные данные профиля",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const profile =
    await updateProfile(
      customerId,
      bodyResult.data
    );

  req.customer = {
    id:
      profile.id,

    phone:
      profile.phone,

    name:
      profile.name,

    email:
      profile.email,

    username:
      profile.username
  };

  res.json({
    data: profile
  });
}
export async function getReferralProfileController(req: Request,res: Response): Promise<void> {
  const customerId = getAuthorizedCustomerId(req,res); if(!customerId)return;
  const { prisma } = await import("../../database/prisma.js");
  const codeValue = `TM${customerId.replaceAll("-","").slice(0,10).toUpperCase()}`;
  const [code,account,settings] = await Promise.all([
    prisma.referral_codes.upsert({where:{customer_id:customerId},create:{customer_id:customerId,code:codeValue},update:{}}),
    prisma.loyalty_accounts.upsert({where:{customer_id:customerId},create:{customer_id:customerId,balance:0},update:{}}),
    prisma.referral_settings.upsert({where:{id:1},create:{id:1},update:{}})
  ]);
  res.json({data:{code:code.code,bonusBalance:account.balance,referral:settings}});
}
