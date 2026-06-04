import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchAuthedConvexMutation } from "@/lib/convex-server-auth";
import { getGmailProfile } from "@/lib/google/gmail";
import { exchangeGoogleOAuthCode } from "@/lib/google/oauth";
import { encryptGoogleToken } from "@/lib/google/token-crypto";
import { api } from "@convex/_generated/api";

const gmailStateCookieName = "forme_gmail_oauth_state";
const gmailReturnToCookieName = "forme_gmail_oauth_return_to";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const storedState = cookieStore.get(gmailStateCookieName)?.value;
  const returnTo =
    cookieStore.get(gmailReturnToCookieName)?.value ??
    "/dashboard/settings/integrations";

  const clearCookies = (response: NextResponse) => {
    response.cookies.delete(gmailStateCookieName);
    response.cookies.delete(gmailReturnToCookieName);
    return response;
  };

  if (oauthError) {
    return clearCookies(
      NextResponse.redirect(
        buildReturnUrl(request.url, returnTo, {
          gmail: "error",
          message: "Google authorization was cancelled or denied.",
        }),
      ),
    );
  }

  if (!code || !state || !storedState || state !== storedState) {
    return clearCookies(
      NextResponse.redirect(
        buildReturnUrl(request.url, returnTo, {
          gmail: "error",
          message: "Google OAuth state validation failed. Try connecting again.",
        }),
      ),
    );
  }

  try {
    const { client, tokens } = await exchangeGoogleOAuthCode(code);
    const profile = await getGmailProfile({
      _id: "callback" as never,
      encryptedAccessToken: tokens.access_token
        ? encryptGoogleToken(tokens.access_token)
        : undefined,
      encryptedRefreshToken: tokens.refresh_token
        ? encryptGoogleToken(tokens.refresh_token)
        : undefined,
      googleEmail: undefined,
      googleUserId: undefined,
      scope: tokens.scope ?? "",
      tokenExpiryDate: tokens.expiry_date ?? undefined,
    });

    await fetchAuthedConvexMutation(api.gmailConnections.upsertGmailConnection, {
      googleEmail: profile.emailAddress,
      googleUserId: undefined,
      encryptedAccessToken: tokens.access_token
        ? encryptGoogleToken(tokens.access_token)
        : undefined,
      encryptedRefreshToken: tokens.refresh_token
        ? encryptGoogleToken(tokens.refresh_token)
        : undefined,
      scope: tokens.scope ?? "",
      tokenExpiryDate: tokens.expiry_date ?? undefined,
    });

    return clearCookies(
      NextResponse.redirect(
        buildReturnUrl(request.url, returnTo, {
          gmail: "connected",
        }),
      ),
    );
  } catch (error) {
    console.error("Gmail OAuth callback failed", error);

    return clearCookies(
      NextResponse.redirect(
        buildReturnUrl(request.url, returnTo, {
          gmail: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not connect Gmail right now.",
        }),
      ),
    );
  }
}

function buildReturnUrl(
  requestUrl: string,
  returnTo: string,
  params: Record<string, string>,
) {
  const url = new URL(returnTo, requestUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}
