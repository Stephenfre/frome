"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  getGmailMessageDetailForConnection,
  listRecentEmailCandidatesForConnection,
  type GmailMessageDetail,
  listRecentEmailsForConnection,
  type GmailMessagePage,
  type GmailMessagePreview,
} from "../src/lib/google/gmail";
import type { EmailCandidate } from "../src/types/email";

export type {
  GmailMessageDetail,
  GmailMessagePage,
  GmailMessagePreview,
} from "../src/lib/google/gmail";
export type { EmailCandidate } from "../src/types/email";

export const listRecentGmailMessages = action({
  args: {
    limit: v.optional(v.number()),
    pageToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GmailMessagePage> => {
    const connection = await ctx.runQuery(
      internal.gmailConnections.getActiveGmailConnectionSecrets,
      {},
    );

    if (!connection) {
      throw new Error("Connect Gmail before fetching recent messages.");
    }

    return await listRecentEmailsForConnection(
      {
        _id: connection._id,
        encryptedAccessToken: connection.encryptedAccessToken,
        encryptedRefreshToken: connection.encryptedRefreshToken,
        googleEmail: connection.googleEmail,
        googleUserId: connection.googleUserId,
        scope: connection.scope,
        tokenExpiryDate: connection.tokenExpiryDate,
      },
      {
        limit: args.limit ?? 5,
        pageToken: args.pageToken,
        onTokenUpdate: async (tokens) => {
          await ctx.runMutation(internal.gmailConnections.updateGmailConnectionTokens, {
            connectionId: connection._id,
            encryptedAccessToken: tokens.encryptedAccessToken,
            encryptedRefreshToken: tokens.encryptedRefreshToken,
            tokenExpiryDate: tokens.tokenExpiryDate,
          });
        },
      },
    );
  },
});

export const getGmailMessageDetail = action({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<GmailMessageDetail> => {
    const connection = await ctx.runQuery(
      internal.gmailConnections.getActiveGmailConnectionSecrets,
      {},
    );

    if (!connection) {
      throw new Error("Connect Gmail before fetching message details.");
    }

    return await getGmailMessageDetailForConnection(
      {
        _id: connection._id,
        encryptedAccessToken: connection.encryptedAccessToken,
        encryptedRefreshToken: connection.encryptedRefreshToken,
        googleEmail: connection.googleEmail,
        googleUserId: connection.googleUserId,
        scope: connection.scope,
        tokenExpiryDate: connection.tokenExpiryDate,
      },
      {
        messageId: args.messageId,
        onTokenUpdate: async (tokens) => {
          await ctx.runMutation(internal.gmailConnections.updateGmailConnectionTokens, {
            connectionId: connection._id,
            encryptedAccessToken: tokens.encryptedAccessToken,
            encryptedRefreshToken: tokens.encryptedRefreshToken,
            tokenExpiryDate: tokens.tokenExpiryDate,
          });
        },
      },
    );
  },
});

export const listRecentEmailCandidatesForDailyBrief = action({
  args: {
    maxCandidates: v.optional(v.number()),
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EmailCandidate[]> => {
    const connection = await ctx.runQuery(
      internal.gmailConnections.getActiveGmailConnectionSecrets,
      {},
    );

    if (!connection) {
      return [];
    }

    return await listRecentEmailCandidatesForConnection(
      {
        _id: connection._id,
        encryptedAccessToken: connection.encryptedAccessToken,
        encryptedRefreshToken: connection.encryptedRefreshToken,
        googleEmail: connection.googleEmail,
        googleUserId: connection.googleUserId,
        scope: connection.scope,
        tokenExpiryDate: connection.tokenExpiryDate,
      },
      {
        maxCandidates: args.maxCandidates ?? 20,
        lookbackDays: args.lookbackDays ?? 3,
        onTokenUpdate: async (tokens) => {
          await ctx.runMutation(internal.gmailConnections.updateGmailConnectionTokens, {
            connectionId: connection._id,
            encryptedAccessToken: tokens.encryptedAccessToken,
            encryptedRefreshToken: tokens.encryptedRefreshToken,
            tokenExpiryDate: tokens.tokenExpiryDate,
          });
        },
      },
    );
  },
});
