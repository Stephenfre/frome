import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getCurrentUser, getOrCreateCurrentUser } from "./goalsHelpers";

export type GmailConnectionStatus = {
  connectedAt?: number;
  googleEmail?: string;
  isActive: boolean;
  isConnected: boolean;
  provider: "google";
  scope?: string;
  updatedAt?: number;
};

export type GmailConnectedAccount = GmailConnectionStatus & {
  connectionId: Id<"gmailConnections">;
  googleUserId?: string;
};

export type GmailConnectionSecretView = {
  _id: Id<"gmailConnections">;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  googleEmail?: string;
  googleUserId?: string;
  scope: string;
  tokenExpiryDate?: number;
};

function normalizeStatus(connection?: {
  _id: Id<"gmailConnections">;
  googleEmail?: string;
  googleUserId?: string;
  isActive: boolean;
  scope: string;
  createdAt: number;
  updatedAt: number;
} | null): GmailConnectionStatus {
  return {
    connectedAt: connection?.createdAt,
    googleEmail: connection?.googleEmail,
    isActive: connection?.isActive ?? false,
    isConnected: Boolean(connection?.isActive),
    provider: "google",
    scope: connection?.scope,
    updatedAt: connection?.updatedAt,
  };
}

async function getGmailConnection(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("gmailConnections")
    .withIndex("by_user_provider", (q) =>
      q.eq("userId", userId).eq("provider", "google"),
    )
    .unique();
}

export const getGmailConnectionStatus = query({
  args: {},
  handler: async (ctx): Promise<GmailConnectionStatus> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return {
        isActive: false,
        isConnected: false,
        provider: "google",
      };
    }

    return normalizeStatus(await getGmailConnection(ctx, user._id));
  },
});

export const getConnectedGmailAccount = query({
  args: {},
  handler: async (ctx): Promise<GmailConnectedAccount | null> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const connection = await getGmailConnection(ctx, user._id);

    if (!connection || !connection.isActive) {
      return null;
    }

    return {
      connectionId: connection._id,
      googleEmail: connection.googleEmail,
      googleUserId: connection.googleUserId,
      isActive: true,
      isConnected: true,
      provider: "google",
      scope: connection.scope,
      updatedAt: connection.updatedAt,
      connectedAt: connection.createdAt,
    };
  },
});

export const upsertGmailConnection = mutation({
  args: {
    googleEmail: v.optional(v.string()),
    googleUserId: v.optional(v.string()),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    scope: v.string(),
    tokenExpiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GmailConnectedAccount> => {
    const user = await getOrCreateCurrentUser(ctx);
    const existingConnection = await getGmailConnection(ctx, user._id);
    const now = Date.now();

    if (!args.encryptedRefreshToken && !existingConnection?.encryptedRefreshToken) {
      throw new Error(
        "Google did not return a refresh token. Disconnect the app in your Google account and try connecting again.",
      );
    }

    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        googleEmail: args.googleEmail ?? existingConnection.googleEmail,
        googleUserId: args.googleUserId ?? existingConnection.googleUserId,
        encryptedAccessToken:
          args.encryptedAccessToken ?? existingConnection.encryptedAccessToken,
        encryptedRefreshToken:
          args.encryptedRefreshToken ?? existingConnection.encryptedRefreshToken,
        scope: args.scope,
        tokenExpiryDate: args.tokenExpiryDate,
        updatedAt: now,
        isActive: true,
      });

      const updatedConnection = await getGmailConnection(ctx, user._id);

      if (!updatedConnection) {
        throw new Error("Could not load the Gmail connection.");
      }

      return {
        connectionId: updatedConnection._id,
        googleEmail: updatedConnection.googleEmail,
        googleUserId: updatedConnection.googleUserId,
        isActive: updatedConnection.isActive,
        isConnected: updatedConnection.isActive,
        provider: "google",
        scope: updatedConnection.scope,
        updatedAt: updatedConnection.updatedAt,
        connectedAt: updatedConnection.createdAt,
      };
    }

    const connectionId = await ctx.db.insert("gmailConnections", {
      userId: user._id,
      provider: "google",
      googleEmail: args.googleEmail,
      googleUserId: args.googleUserId,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      scope: args.scope,
      tokenExpiryDate: args.tokenExpiryDate,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    return {
      connectionId,
      googleEmail: args.googleEmail,
      googleUserId: args.googleUserId,
      isActive: true,
      isConnected: true,
      provider: "google",
      scope: args.scope,
      updatedAt: now,
      connectedAt: now,
    };
  },
});

export const disconnectGmailConnection = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateCurrentUser(ctx);
    const connection = await getGmailConnection(ctx, user._id);

    if (!connection) {
      return null;
    }

    await ctx.db.replace(connection._id, {
      userId: connection.userId,
      provider: connection.provider,
      googleEmail: connection.googleEmail,
      googleUserId: connection.googleUserId,
      scope: connection.scope,
      createdAt: connection.createdAt,
      updatedAt: Date.now(),
      isActive: false,
    });

    return connection._id;
  },
});

export const getActiveGmailConnectionSecrets = internalQuery({
  args: {},
  handler: async (ctx): Promise<GmailConnectionSecretView | null> => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const connection = await getGmailConnection(ctx, user._id);

    if (!connection || !connection.isActive) {
      return null;
    }

    return {
      _id: connection._id,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      googleEmail: connection.googleEmail,
      googleUserId: connection.googleUserId,
      scope: connection.scope,
      tokenExpiryDate: connection.tokenExpiryDate,
    };
  },
});

export const updateGmailConnectionTokens = internalMutation({
  args: {
    connectionId: v.id("gmailConnections"),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection) {
      throw new Error("Gmail connection not found.");
    }

    await ctx.db.patch(connection._id, {
      ...(args.encryptedAccessToken
        ? { encryptedAccessToken: args.encryptedAccessToken }
        : {}),
      ...(args.encryptedRefreshToken
        ? { encryptedRefreshToken: args.encryptedRefreshToken }
        : {}),
      ...(args.tokenExpiryDate ? { tokenExpiryDate: args.tokenExpiryDate } : {}),
      updatedAt: Date.now(),
    });

    return connection._id;
  },
});
