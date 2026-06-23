import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  loadThreadMessages,
  deleteMessage as deleteMessageFn,
  updateMessageText as updateMessageTextFn,
  deleteFromMessage as deleteFromMessageFn,
  clearThreadMessages as clearThreadMessagesFn,
} from "@/lib/tutor.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  Flame,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  RotateCcw,
  Share2,
  Eraser,
  Check,
  X,
} from "lucide-react";
import { StudyMarkdown } from "@/components/study-markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: ThreadView,
});

function ThreadView() {
  const { threadId } = Route.useParams();
  const load = useServerFn(loadThreadMessages);
  const initial = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => load({ data: { threadId } }),
  });

  if (initial.isLoading) {
    return (
      <div className="h-[60vh] grid place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!initial.data?.thread) {
    return <p className="text-sm text-muted-foreground">Chat not found.</p>;
  }
  return (
    <Chat
      key={threadId}
      threadId={threadId}
      title={initial.data.thread.title}
      initialMessages={initial.data.messages as unknown as UIMessage[]}
    />
  );
}

function messageText(m: UIMessage): string {
  return m.parts
    .map((p) => ("text" in p ? (p as { text: string }).text : ""))
    .join("");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Chat({
  threadId,
  title,
  initialMessages,
}: {
  threadId: string;
  title: string;
  initialMessages: UIMessage[];
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers,
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, setMessages, regenerate, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const deleteMsg = useServerFn(deleteMessageFn);
  const updateMsg = useServerFn(updateMessageTextFn);
  const deleteFrom = useServerFn(deleteFromMessageFn);
  const clearAll = useServerFn(clearThreadMessagesFn);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function send() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
    taRef.current?.focus();
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleShare(text: string) {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy(text);
    }
  }

  function startEdit(m: UIMessage) {
    setEditingId(m.id);
    setEditText(messageText(m));
  }

  async function saveEdit() {
    if (!editingId) return;
    const newText = editText.trim();
    if (!newText) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx < 0) return;
    const original = messages[idx];
    const trimmed = messages.slice(0, idx + 1).map((m) =>
      m.id === editingId
        ? { ...m, parts: [{ type: "text" as const, text: newText }] }
        : m,
    );
    setMessages(trimmed);
    setEditingId(null);
    setEditText("");
    try {
      if (UUID_RE.test(original.id)) {
        await Promise.all([
          updateMsg({ data: { id: original.id, text: newText } }),
          deleteFrom({ data: { id: original.id } }),
        ]);
      }
      await regenerate({ body: { persistMode: "assistantOnly" } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    const prev = messages;
    setMessages(messages.filter((m) => m.id !== id));
    if (UUID_RE.test(id)) {
      try {
        await deleteMsg({ data: { id } });
      } catch (e) {
        toast.error((e as Error).message);
        setMessages(prev);
      }
    }
  }

  async function handleRegenerate(assistantId: string) {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx < 0) return;
    setMessages(messages.slice(0, idx));
    if (UUID_RE.test(assistantId)) {
      try {
        await deleteMsg({ data: { id: assistantId } });
      } catch {
        /* ignore */
      }
    }
    try {
      await regenerate({ body: { persistMode: "assistantOnly" } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleClearChat() {
    setConfirmClear(false);
    const prev = messages;
    setMessages([]);
    try {
      await clearAll({ data: { threadId } });
      toast.success("Chat cleared");
    } catch (e) {
      toast.error((e as Error).message);
      setMessages(prev);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border mb-3">
        <h2 className="font-semibold truncate">{title}</h2>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Eraser className="size-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <div className="size-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto">
              <Flame className="size-6" />
            </div>
            <p className="font-semibold">Ask any Math or Science doubt</p>
            <p className="text-sm text-muted-foreground">
              Try: "Explain Newton's third law with examples"
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = messageText(m);
          const isUser = m.role === "user";
          const isEditing = editingId === m.id;

          return (
            <div
              key={m.id}
              className={`group flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-end gap-1.5 max-w-[92%] ${isUser ? "flex-row-reverse" : ""}`}>
                {isEditing ? (
                  <div className="flex-1 min-w-0 w-full space-y-2 rounded-2xl border border-primary/40 bg-card p-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        <X className="size-3.5 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={!editText.trim()}>
                        <Check className="size-3.5 mr-1" /> Save & resend
                      </Button>
                    </div>
                  </div>
                ) : isUser ? (
                  <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                    {text}
                  </div>
                ) : (
                  <article className="prose-study text-[0.95rem] leading-relaxed break-words min-w-0">
                    <StudyMarkdown>{text}</StudyMarkdown>
                  </article>
                )}

                {!isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground opacity-60 md:opacity-0 md:group-hover:opacity-100 transition"
                        aria-label="Message actions"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isUser ? "end" : "start"} className="w-44">
                      <DropdownMenuItem onClick={() => handleCopy(text)}>
                        <Copy className="size-4 mr-2" /> Copy
                      </DropdownMenuItem>
                      {isUser && (
                        <DropdownMenuItem onClick={() => startEdit(m)} disabled={isLoading}>
                          <Pencil className="size-4 mr-2" /> Edit
                        </DropdownMenuItem>
                      )}
                      {!isUser && (
                        <DropdownMenuItem
                          onClick={() => handleRegenerate(m.id)}
                          disabled={isLoading}
                        >
                          <RotateCcw className="size-4 mr-2" /> Regenerate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleShare(text)}>
                        <Share2 className="size-4 mr-2" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmDelete(m.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {error && <p className="text-sm text-destructive">Error: {error.message}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2 items-end"
      >
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything about Math or Science…"
          rows={2}
          className="resize-none min-h-[2.75rem]"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed from your chat history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages in this conversation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
