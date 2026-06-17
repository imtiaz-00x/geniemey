import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { loadThreadMessages } from "@/lib/tutor.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <h2 className="font-semibold truncate">{title}</h2>
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
          const text = m.parts
            .map((p) => ("text" in p ? (p as { text: string }).text : ""))
            .join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="max-w-full">
              <article className="prose-study text-sm">
                <ReactMarkdown>{text}</ReactMarkdown>
              </article>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">Error: {error.message}</p>
        )}
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
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
