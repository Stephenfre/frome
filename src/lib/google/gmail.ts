import { google, gmail_v1 } from "googleapis";

import { createGoogleOAuthClient } from "@/lib/google/oauth";
import { decryptGoogleToken, encryptGoogleToken } from "@/lib/google/token-crypto";
import type { EmailCandidate } from "@/types/email";

export type GmailMessagePreview = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate?: string;
};

export type GmailMessagePage = {
  messages: GmailMessagePreview[];
  nextPageToken?: string;
};

export type GmailMessageDetail = GmailMessagePreview & {
  body: string;
};

export type StoredGmailConnection = {
  _id: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  googleEmail?: string;
  googleUserId?: string;
  scope: string;
  tokenExpiryDate?: number;
};

type TokenUpdate = {
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiryDate?: number;
};

export async function getGmailProfile(connection: StoredGmailConnection) {
  const { gmail } = await createAuthenticatedGmailClient(connection);
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    emailAddress: profile.data.emailAddress ?? undefined,
    historyId: profile.data.historyId ?? undefined,
    messagesTotal: profile.data.messagesTotal ?? undefined,
    threadsTotal: profile.data.threadsTotal ?? undefined,
  };
}

export async function listRecentEmailsForConnection(
  connection: StoredGmailConnection,
  {
    limit = 5,
    pageToken,
    onTokenUpdate,
  }: {
    limit?: number;
    pageToken?: string;
    onTokenUpdate?: (tokens: TokenUpdate) => Promise<void>;
  } = {},
): Promise<GmailMessagePage> {
  const { gmail } = await createAuthenticatedGmailClient(connection, onTokenUpdate);
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: Math.min(Math.max(limit, 1), 500),
    pageToken,
  });
  const messages = listResponse.data.messages ?? [];

  if (messages.length === 0) {
    return {
      messages: [],
      nextPageToken: listResponse.data.nextPageToken ?? undefined,
    };
  }

  const previews = await Promise.all(
    messages.slice(0, limit).map(async (message) => {
      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      });
      const payloadHeaders = messageResponse.data.payload?.headers ?? [];

      return {
        id: messageResponse.data.id ?? message.id!,
        threadId: messageResponse.data.threadId ?? message.threadId ?? message.id!,
        subject: getHeaderValue(payloadHeaders, "Subject") ?? "(No subject)",
        from: getHeaderValue(payloadHeaders, "From") ?? "Unknown sender",
        snippet: messageResponse.data.snippet ?? "",
        internalDate: messageResponse.data.internalDate ?? undefined,
      };
    }),
  );

  return {
    messages: previews,
    nextPageToken: listResponse.data.nextPageToken ?? undefined,
  };
}

export async function listRecentEmailCandidatesForConnection(
  connection: StoredGmailConnection,
  {
    maxCandidates = 20,
    lookbackDays = 3,
    onTokenUpdate,
  }: {
    maxCandidates?: number;
    lookbackDays?: number;
    onTokenUpdate?: (tokens: TokenUpdate) => Promise<void>;
  } = {},
): Promise<EmailCandidate[]> {
  const { gmail } = await createAuthenticatedGmailClient(connection, onTokenUpdate);
  const normalizedLimit = Math.min(Math.max(maxCandidates, 1), 20);
  const newerThanQuery = `newer_than:${Math.min(Math.max(lookbackDays, 1), 7)}d`;
  const messageIds: string[] = [];
  const seenIds = new Set<string>();

  for (const query of [`is:unread ${newerThanQuery}`, newerThanQuery]) {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: normalizedLimit,
    });

    for (const message of listResponse.data.messages ?? []) {
      if (!message.id || seenIds.has(message.id)) {
        continue;
      }

      seenIds.add(message.id);
      messageIds.push(message.id);

      if (messageIds.length === normalizedLimit) {
        break;
      }
    }

    if (messageIds.length === normalizedLimit) {
      break;
    }
  }

  if (messageIds.length === 0) {
    return [];
  }

  const candidates = await Promise.all(
    messageIds.map(async (messageId) => {
      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      });
      const payloadHeaders = messageResponse.data.payload?.headers ?? [];
      const labels = messageResponse.data.labelIds ?? [];

      return {
        id: messageResponse.data.id ?? messageId,
        threadId: messageResponse.data.threadId ?? messageId,
        subject: getHeaderValue(payloadHeaders, "Subject") ?? "(No subject)",
        from: getHeaderValue(payloadHeaders, "From") ?? "Unknown sender",
        snippet: messageResponse.data.snippet ?? "",
        internalDate: messageResponse.data.internalDate ?? undefined,
        labels,
        isUnread: labels.includes("UNREAD"),
      } satisfies EmailCandidate;
    }),
  );

  return candidates.sort(
    (left, right) =>
      Number(right.isUnread ?? false) - Number(left.isUnread ?? false) ||
      Number(right.internalDate ?? 0) - Number(left.internalDate ?? 0),
  );
}

export async function getGmailMessageDetailForConnection(
  connection: StoredGmailConnection,
  {
    messageId,
    onTokenUpdate,
  }: {
    messageId: string;
    onTokenUpdate?: (tokens: TokenUpdate) => Promise<void>;
  },
): Promise<GmailMessageDetail> {
  const { gmail } = await createAuthenticatedGmailClient(connection, onTokenUpdate);
  const messageResponse = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const payloadHeaders = messageResponse.data.payload?.headers ?? [];

  return {
    id: messageResponse.data.id ?? messageId,
    threadId: messageResponse.data.threadId ?? messageId,
    subject: getHeaderValue(payloadHeaders, "Subject") ?? "(No subject)",
    from: getHeaderValue(payloadHeaders, "From") ?? "Unknown sender",
    snippet: messageResponse.data.snippet ?? "",
    internalDate: messageResponse.data.internalDate ?? undefined,
    body: extractMessageBody(messageResponse.data.payload) ?? messageResponse.data.snippet ?? "",
  };
}

async function createAuthenticatedGmailClient(
  connection: StoredGmailConnection,
  onTokenUpdate?: (tokens: TokenUpdate) => Promise<void>,
) {
  const oauth2Client = createGoogleOAuthClient();
  const refreshToken = connection.encryptedRefreshToken
    ? decryptGoogleToken(connection.encryptedRefreshToken)
    : undefined;
  const accessToken = connection.encryptedAccessToken
    ? decryptGoogleToken(connection.encryptedAccessToken)
    : undefined;

  if (!refreshToken && !accessToken) {
    throw new Error("No Gmail tokens are available for this connection.");
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiryDate,
  });

  if (onTokenUpdate) {
    oauth2Client.on("tokens", async (tokens) => {
      const updates: TokenUpdate = {
        ...(tokens.access_token
          ? { encryptedAccessToken: encryptGoogleToken(tokens.access_token) }
          : {}),
        ...(tokens.refresh_token
          ? { encryptedRefreshToken: encryptGoogleToken(tokens.refresh_token) }
          : {}),
        ...(tokens.expiry_date ? { tokenExpiryDate: tokens.expiry_date } : {}),
      };

      if (Object.keys(updates).length > 0) {
        await onTokenUpdate(updates);
      }
    });
  }

  return {
    gmail: google.gmail({ version: "v1", auth: oauth2Client }),
    oauth2Client,
  };
}

function getHeaderValue(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string,
) {
  return (
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? undefined
  );
}

function extractMessageBody(payload?: gmail_v1.Schema$MessagePart | null): string | undefined {
  if (!payload) {
    return undefined;
  }

  const plainText = findPartBody(payload, "text/plain");

  if (plainText) {
    return plainText;
  }

  const htmlText = findPartBody(payload, "text/html");

  if (htmlText) {
    return stripHtml(htmlText);
  }

  const directBody = decodeMessageBody(payload.body?.data);

  if (directBody) {
    return directBody;
  }

  return undefined;
}

function findPartBody(
  part: gmail_v1.Schema$MessagePart,
  mimeType: string,
): string | undefined {
  if (part.mimeType === mimeType) {
    return decodeMessageBody(part.body?.data);
  }

  for (const childPart of part.parts ?? []) {
    const body = findPartBody(childPart, mimeType);

    if (body) {
      return body;
    }
  }

  return undefined;
}

function decodeMessageBody(data?: string | null) {
  if (!data) {
    return undefined;
  }

  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = normalizeEmailText(
    Buffer.from(padded, "base64").toString("utf8"),
  );

  return decoded || undefined;
}

function stripHtml(value: string) {
  return normalizeEmailText(
    decodeHtmlEntities(value)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " "),
  );
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    shy: "",
    zwnj: "",
    zwj: "",
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      const lowerEntity = entity.toLowerCase();

      if (lowerEntity.startsWith("#x")) {
        const codePoint = Number.parseInt(lowerEntity.slice(2), 16);
        return safeCodePointToString(codePoint) ?? match;
      }

      if (lowerEntity.startsWith("#")) {
        const codePoint = Number.parseInt(lowerEntity.slice(1), 10);
        return safeCodePointToString(codePoint) ?? match;
      }

      return namedEntities[lowerEntity] ?? match;
    },
  );
}

function safeCodePointToString(codePoint: number) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return undefined;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return undefined;
  }
}

function normalizeEmailText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g, "")
    .replace(/\u00ad/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => {
      if (line.length > 0) {
        return true;
      }

      const previousLine = lines[index - 1];
      return previousLine !== "";
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
