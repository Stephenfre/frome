import { google } from "googleapis";

const defaultGoogleScopes = ["https://www.googleapis.com/auth/gmail.readonly"];

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

export function getGoogleOAuthScopes() {
  const rawScopes = process.env.GOOGLE_OAUTH_SCOPES?.trim();

  if (!rawScopes) {
    return defaultGoogleScopes;
  }

  return rawScopes
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getRequiredEnv("GOOGLE_OAUTH_REDIRECT_URI"),
  );
}

export function createGoogleOAuthUrl({
  state,
  loginHint,
}: {
  state: string;
  loginHint?: string;
}) {
  const client = createGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    response_type: "code",
    scope: getGoogleOAuthScopes(),
    state,
    login_hint: loginHint,
  });
}

export async function exchangeGoogleOAuthCode(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  return { client, tokens };
}
