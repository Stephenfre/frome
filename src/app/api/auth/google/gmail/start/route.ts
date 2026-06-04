import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { createGoogleOAuthUrl } from "@/lib/google/oauth";

const gmailStateCookieName = "forme_gmail_oauth_state";
const gmailReturnToCookieName = "forme_gmail_oauth_return_to";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const returnTo = normalizeReturnTo(
    url.searchParams.get("returnTo") ?? "/dashboard/settings/integrations",
  );
  const user = await currentUser();
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(
    createGoogleOAuthUrl({
      state,
      loginHint: user?.primaryEmailAddress?.emailAddress,
    }),
  );

  response.cookies.set(gmailStateCookieName, state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(gmailReturnToCookieName, returnTo, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function normalizeReturnTo(returnTo: string) {
  return returnTo.startsWith("/") ? returnTo : "/dashboard/settings/integrations";
}
