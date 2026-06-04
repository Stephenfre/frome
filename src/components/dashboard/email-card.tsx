"use client";

import { useAction, useQuery } from "convex/react";
import {
  AlertTriangle,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { api } from "@convex/_generated/api";
import type { GmailMessageDetail, GmailMessagePreview } from "@/lib/google/gmail";

const INITIAL_EMAIL_PAGE_SIZE = 20;
const EMAIL_PAGE_SIZE = 20;

export function EmailCard() {
  const status = useQuery(api.gmailConnections.getGmailConnectionStatus, {});
  const account = useQuery(api.gmailConnections.getConnectedGmailAccount, {});
  const listRecentMessages = useAction(api.gmailActions.listRecentGmailMessages);
  const getMessageDetail = useAction(api.gmailActions.getGmailMessageDetail);
  const [messages, setMessages] = useState<GmailMessagePreview[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [messageDetails, setMessageDetails] = useState<Record<string, GmailMessageDetail>>({});

  const connectHref = "/dashboard/settings/integrations";
  const isConnected = Boolean(status?.isConnected);

  async function handleRefresh() {
    if (!isConnected || isRefreshing) {
      return;
    }

    setError(null);
    setIsRefreshing(true);

    try {
      const page = await listRecentMessages({ limit: INITIAL_EMAIL_PAGE_SIZE });
      setMessages(page.messages);
      setNextPageToken(page.nextPageToken ?? null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Inbox preview could not be loaded.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLoadMore() {
    if (!isConnected || isLoadingMore || !nextPageToken) {
      return;
    }

    setError(null);
    setIsLoadingMore(true);

    try {
      const page = await listRecentMessages({
        limit: EMAIL_PAGE_SIZE,
        pageToken: nextPageToken,
      });
      setMessages((currentMessages) => [
        ...(currentMessages ?? []),
        ...page.messages.filter(
          (message) =>
            !(currentMessages ?? []).some(
              (currentMessage) => currentMessage.id === message.id,
            ),
        ),
      ]);
      setNextPageToken(page.nextPageToken ?? null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "More email could not be loaded.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!isConnected) {
      setMessages(null);
      setError(null);
      setNextPageToken(null);
      setMessageDetails({});
      return;
    }

    if (messages !== null || isRefreshing) {
      return;
    }

    void handleRefresh();
  }, [isConnected, isRefreshing, messages]);

  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSelectedMessageId(null);
      return;
    }

    const hasSelectedMessage = messages.some(
      (message) => message.id === selectedMessageId,
    );

    if (!selectedMessageId || !hasSelectedMessage) {
      setSelectedMessageId(messages[0].id);
    }
  }, [messages, selectedMessageId]);

  useEffect(() => {
    if (!isInboxOpen || !selectedMessageId || messageDetails[selectedMessageId]) {
      return;
    }

    const messageId = selectedMessageId;
    let isCancelled = false;

    async function loadMessageDetail() {
      setIsLoadingDetail(true);

      try {
        const detail = await getMessageDetail({ messageId });

        if (!isCancelled) {
          setMessageDetails((currentDetails) => ({
            ...currentDetails,
            [detail.id]: detail,
          }));
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Email details could not be loaded.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadMessageDetail();

    return () => {
      isCancelled = true;
    };
  }, [getMessageDetail, isInboxOpen, messageDetails, selectedMessageId]);

  const connectedLabel = useMemo(() => {
    if (account?.googleEmail) {
      return account.googleEmail;
    }

    if (isConnected) {
      return "Connected with Gmail";
    }

    return "Connect Gmail to preview recent messages here.";
  }, [account?.googleEmail, isConnected]);

  const selectedMessage = useMemo(
    () => messages?.find((message) => message.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );
  const selectedMessageDetail = selectedMessageId
    ? messageDetails[selectedMessageId] ?? null
    : null;
  const selectedMessageBodySections = useMemo(
    () =>
      formatEmailBodySections(
        selectedMessageDetail?.body ||
          selectedMessage?.snippet ||
          "No preview text available for this message.",
      ),
    [selectedMessage?.snippet, selectedMessageDetail?.body],
  );

  return (
    <>
      <DashboardCard
        title="Email"
        description="Inbox preview"
        icon={Mail}
        contentClassName="grid gap-4 pt-0"
        headerAction={
          isConnected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden="true" />
              )}
              Refresh
            </Button>
          ) : null
        }
      >
        {status === undefined ? (
          <EmailLoadingState />
        ) : !isConnected ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
              <h3 className="text-sm font-medium">No email connected yet.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect Gmail to surface a calm inbox preview on the dashboard.
              </p>
            </div>

            <div className="flex justify-end">
              <Button asChild size="sm">
                <Link href={connectHref}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Connect Gmail
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Connected</Badge>
              <Badge>{connectedLabel}</Badge>
            </div>

            {error ? (
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-foreground/90">{error}</p>
                </div>
              </div>
            ) : null}

            {isRefreshing && !messages ? (
              <EmailLoadingState />
            ) : messages && messages.length > 0 ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setIsInboxOpen(true)}
                  className="flex items-center justify-between rounded-xl border bg-muted/15 px-4 py-3 text-left transition-colors hover:bg-muted/25"
                >
                  <div>
                    <p className="text-sm font-medium">Open inbox preview</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Search and scan your recent messages without leaving the dashboard.
                    </p>
                  </div>
                  <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>

                <div className="max-h-72 overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    {messages.slice(0, 8).map((message) => (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => {
                          setSelectedMessageId(message.id);
                          setIsInboxOpen(true);
                        }}
                        className="rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {message.subject}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {message.from}
                            </p>
                          </div>
                          <time className="shrink-0 text-xs text-muted-foreground">
                            {formatInboxTimestamp(message.internalDate)}
                          </time>
                        </div>
                        {message.snippet ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {message.snippet}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center">
                <h3 className="text-sm font-medium">No recent messages found.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your inbox is connected, but there is nothing recent to preview.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {messages && messages.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInboxOpen(true)}
                >
                  Open inbox
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href={connectHref}>Manage Gmail</Link>
              </Button>
            </div>
          </>
        )}
      </DashboardCard>

      <Dialog open={isInboxOpen} onOpenChange={setIsInboxOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl p-0">
          <DialogHeader>
            <DialogTitle>Email</DialogTitle>
            <DialogDescription>
              Search recent Gmail messages and keep context close to the dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4 px-6 pb-6 lg:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)]">
            <div className="min-h-0 overflow-hidden rounded-xl border">
              <Command className="h-[36rem]">
                <CommandInput placeholder="Search recent email..." />
                <CommandList className="max-h-[calc(36rem-44px)]">
                  <CommandEmpty>No matching messages found.</CommandEmpty>
                  <CommandGroup heading="Recent email">
                    {messages?.map((message) => (
                      <CommandItem
                        key={message.id}
                        value={[
                          message.subject,
                          message.from,
                          message.snippet,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onSelect={() => setSelectedMessageId(message.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-medium">
                              {message.subject}
                            </p>
                            <time className="shrink-0 text-xs text-muted-foreground">
                              {formatInboxTimestamp(message.internalDate)}
                            </time>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {message.from}
                          </p>
                          {message.snippet ? (
                            <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                              {message.snippet}
                            </p>
                          ) : null}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {nextPageToken ? (
                    <>
                      <Separator />
                      <div className="p-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => void handleLoadMore()}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <LoaderCircle
                              className="size-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : null}
                          {isLoadingMore ? "Loading more..." : "Load more"}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </CommandList>
              </Command>
            </div>

            <div className="min-h-0 rounded-xl border bg-muted/15">
              {selectedMessage ? (
                <div className="grid h-[36rem] gap-4 overflow-y-auto p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Recent email</Badge>
                    <Badge>{formatInboxTimestamp(selectedMessage.internalDate)}</Badge>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{selectedMessage.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedMessage.from}
                    </p>
                  </div>
                  <Separator />
                  {isLoadingDetail && !selectedMessageDetail ? (
                    <div className="grid gap-2">
                      <div className="h-4 w-full rounded-md bg-muted" />
                      <div className="h-4 w-11/12 rounded-md bg-muted" />
                      <div className="h-4 w-10/12 rounded-md bg-muted" />
                      <div className="h-4 w-8/12 rounded-md bg-muted" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {selectedMessageBodySections.map((section, index) =>
                        section.kind === "list" ? (
                          <ul
                            key={`section-${index}`}
                            className="grid gap-2 pl-5 text-sm leading-6 text-foreground/90"
                          >
                            {section.items.map((item) => (
                              <li key={item} className="list-disc">
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            key={`section-${index}`}
                            className="text-sm leading-6 text-foreground/90"
                          >
                            {section.text}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[36rem] items-center justify-center px-6 text-center">
                  <div>
                    <p className="text-sm font-medium">Select a message</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose one from the command list to preview it here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmailLoadingState() {
  return (
    <div className="grid gap-2">
      <div className="h-5 w-36 rounded-md bg-muted" />
      <div className="h-16 rounded-xl border bg-muted/20" />
      <div className="h-16 rounded-xl border bg-muted/15" />
      <div className="h-16 rounded-xl border bg-muted/10" />
    </div>
  );
}

function formatInboxTimestamp(internalDate?: string) {
  if (!internalDate) {
    return "";
  }

  const timestamp = Number(internalDate);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const messageDate = new Date(timestamp);
  const now = new Date();
  const sameDay = messageDate.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat(undefined, {
    ...(sameDay
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          month: "short",
          day: "numeric",
        }),
  }).format(messageDate);
}

type EmailBodySection =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

function formatEmailBodySections(body: string): EmailBodySection[] {
  return body
    .split(/\n\s*\n+/)
    .map((section) =>
      section
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      if (lines.length > 1 && lines.every(isListLine)) {
        return {
          kind: "list" as const,
          items: lines.map((line) => line.replace(/^([•*-]|\d+[.)])\s*/, "")),
        };
      }

      return {
        kind: "paragraph" as const,
        text: lines.join(" "),
      };
    });
}

function isListLine(line: string) {
  return /^([•*-]|\d+[.)])\s+/.test(line);
}
