"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import type { GmailMessagePreview } from "@/lib/google/gmail";

export function GmailConnectCard() {
  const searchParams = useSearchParams();
  const status = useQuery(api.gmailConnections.getGmailConnectionStatus, {});
  const account = useQuery(api.gmailConnections.getConnectedGmailAccount, {});
  const disconnectConnection = useMutation(
    api.gmailConnections.disconnectGmailConnection,
  );
  const listRecentMessages = useAction(api.gmailActions.listRecentGmailMessages);
  const [messages, setMessages] = useState<GmailMessagePreview[] | null>(null);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const oauthMessage = useMemo(() => {
    const gmailStatus = searchParams.get("gmail");
    const message = searchParams.get("message");

    if (gmailStatus === "connected") {
      return {
        tone: "success" as const,
        text: "Gmail connected successfully.",
      };
    }

    if (gmailStatus === "error") {
      return {
        tone: "error" as const,
        text: message ?? "Gmail could not be connected.",
      };
    }

    return null;
  }, [searchParams]);

  async function handleTestFetch() {
    if (isFetchingMessages) {
      return;
    }

    setFetchError(null);
    setIsFetchingMessages(true);

    try {
      const recentMessagesPage = await listRecentMessages({ limit: 5 });
      setMessages(recentMessagesPage.messages);
    } catch (error) {
      setFetchError(
        error instanceof Error
          ? error.message
          : "Recent Gmail messages could not be fetched.",
      );
    } finally {
      setIsFetchingMessages(false);
    }
  }

  async function handleDisconnect() {
    if (isDisconnecting) {
      return;
    }

    setIsDisconnecting(true);

    try {
      await disconnectConnection({});
      setMessages(null);
      setFetchError(null);
    } finally {
      setIsDisconnecting(false);
    }
  }

  const connectHref = "/api/auth/google/gmail/start?returnTo=/dashboard/settings/integrations";

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" aria-hidden="true" />
          Gmail
        </CardTitle>
        <CardDescription>
          Connect Gmail with read-only access so ForMe can later summarize and
          organize inbox signals.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status === undefined ? (
          <div className="h-28 rounded-xl border bg-muted/20" />
        ) : (
          <>
            {oauthMessage ? (
              <StatusBanner tone={oauthMessage.tone} text={oauthMessage.text} />
            ) : null}

            <div className="grid gap-3 rounded-xl border bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {status.isConnected ? "Gmail connected" : "Not connected"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {account?.googleEmail
                      ? account.googleEmail
                      : "Authorize one Gmail account for inbox access."}
                  </p>
                </div>
                <span
                  className={
                    status.isConnected
                      ? "inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
                      : "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium text-muted-foreground"
                  }
                >
                  {status.isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center rounded-md border bg-background px-2 py-1">
                  Scope: gmail.readonly
                </span>
                <span className="inline-flex items-center rounded-md border bg-background px-2 py-1">
                  Server-side token storage
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={connectHref}>
                    {status.isConnected ? (
                      <RefreshCw className="size-4" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="size-4" aria-hidden="true" />
                    )}
                    {status.isConnected ? "Reconnect Gmail" : "Connect Gmail"}
                  </Link>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleTestFetch()}
                  disabled={!status.isConnected || isFetchingMessages}
                >
                  {isFetchingMessages ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Mail className="size-4" aria-hidden="true" />
                  )}
                  Test Gmail fetch
                </Button>

                {status.isConnected ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={isDisconnecting}
                      >
                        <Unplug className="size-4" aria-hidden="true" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes stored Gmail tokens from ForMe. You can
                          reconnect later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleDisconnect()}
                          disabled={isDisconnecting}
                        >
                          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>

            {fetchError ? (
              <StatusBanner tone="error" text={fetchError} />
            ) : null}

            {messages ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm font-medium">Recent Gmail messages</p>
                </div>

                {messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    No recent messages were found.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-xl border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {message.subject}
                            </p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {message.from}
                            </p>
                          </div>
                          {message.internalDate ? (
                            <p className="text-xs text-muted-foreground">
                              {new Date(Number(message.internalDate)).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground/80">
                          {message.snippet || "No snippet available."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBanner({
  text,
  tone,
}: {
  text: string;
  tone: "error" | "success";
}) {
  return (
    <div
      className={
        tone === "success"
          ? "flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800"
          : "flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
      }
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p>{text}</p>
    </div>
  );
}
