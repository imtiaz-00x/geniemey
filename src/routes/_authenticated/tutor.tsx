import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread } from "@/lib/tutor.functions";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: TutorLayout,
});

function TutorLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isThreadOpen = /^\/tutor\/[0-9a-f-]+/.test(pathname);

  const threadsQ = useQuery({ queryKey: ["threads"], queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/tutor/$threadId", params: { threadId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-24">
      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <aside className={`${isThreadOpen ? "hidden md:block" : ""} space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Tutor chats</h2>
            <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              <Plus className="size-4 mr-1" /> New
            </Button>
          </div>
          <div className="space-y-1.5">
            {threadsQ.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No chats yet. Start a new one.</p>
            )}
            {threadsQ.data?.map((t) => {
              const active = pathname === `/tutor/${t.id}`;
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-1 rounded-lg border ${
                    active ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <Link
                    to="/tutor/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm min-w-0"
                  >
                    <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Delete this chat?")) {
                        deleteMut.mutate(t.id);
                        if (active) navigate({ to: "/tutor" });
                      }
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
        <section className={`${!isThreadOpen ? "hidden md:block" : ""}`}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
