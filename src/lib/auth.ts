import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";

export interface AppSession {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  email: string;
  name: string;
  role: string;
}

async function bootstrapDevSession(email: string, orgSlug: string) {
  const organization = await db.organization.upsert({
    where: {
      slug: orgSlug
    },
    update: {
      name: env.DEV_ORG_NAME
    },
    create: {
      name: env.DEV_ORG_NAME,
      slug: orgSlug
    }
  });

  const user = await db.user.upsert({
    where: {
      email
    },
    update: {
      name: env.DEV_USER_NAME,
      organizationId: organization.id,
      role: "manager"
    },
    create: {
      email,
      name: env.DEV_USER_NAME,
      organizationId: organization.id,
      role: "manager"
    }
  });

  return {
    userId: user.id,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    email: user.email,
    name: user.name,
    role: user.role
  } satisfies AppSession;
}

export const getCurrentAppSession = cache(async (): Promise<AppSession> => {
  const requestHeaders = await headers();
  const email = requestHeaders.get("x-veriload-user-email")?.trim() || env.DEV_USER_EMAIL;
  const requestedOrgSlug =
    requestHeaders.get("x-veriload-org-slug")?.trim() || env.DEV_ORG_SLUG;
  const orgSlug = slugify(requestedOrgSlug);

  const user = await db.user.findFirst({
    where: {
      email,
      organization: {
        slug: orgSlug
      }
    },
    include: {
      organization: true
    }
  });

  if (user) {
    return {
      userId: user.id,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return bootstrapDevSession(email, orgSlug);
  }

  throw new Error("No authenticated Veriload user was found for the current request.");
});
