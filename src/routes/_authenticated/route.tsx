import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/study.functions";
import { Flame, GraduationCap, Home, MessageCircle, BarChart3, LogOut, Camera, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const dashboard = useServerFn(getDashboard);
  const { data } = useQuery({
    queryKey: ["dashboard-header", user?.id],
    queryFn: async () => {
      try {
        return await dashboard();
      } catch {
        return null;
      }
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
  });
  const profile = data?.profile;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/", label: "Learn", icon: Home, match: (p: string) => p === "/" || p.startsWith("/learn") || p.startsWith("/ncert") },
    { to: "/tutor", label: "Tutor", icon: MessageCircle, match: (p: string) => p.startsWith("/tutor") },
    { to: "/homework", label: "Homework", icon: Camera, match: (p: string) => p.startsWith("/homework") },
    { to: "/exams", label: "Exams", icon: Trophy, match: (p: string) => p.startsWith("/exams") },
    { to: "/progress", label: "Progress", icon: BarChart3, match: (p: string) => p.startsWith("/progress") },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Flame className="size-4" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold tracking-tight truncate">GenieMey AI</span>
              <span className="text-[9px] text-muted-foreground truncate">
                Powered by StenMey Technologies
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {navItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium">
              <Flame className="size-3.5 text-flame" />
              <span>{profile?.current_streak ?? 0}d</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <GraduationCap className="size-3.5" />
              {profile?.total_xp ?? 0} XP
            </div>
            <Link to="/profile" aria-label="Your profile" className="inline-flex items-center justify-center size-9 rounded-full bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/80 transition">
              {(profile?.display_name?.trim()?.[0] ?? "U").toUpperCase()}
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>

          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
