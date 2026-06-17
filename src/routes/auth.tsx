import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Flame, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/40 to-accent/30">
      <header className="px-6 py-5 flex items-center gap-2">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
          <Flame className="size-5" />
        </div>
        <span className="font-bold text-lg">StudyGenie</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-sm bg-accent/60 text-accent-foreground px-3 py-1 rounded-full">
              <GraduationCap className="size-4" /> For Math & Science learners
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Start learning today"}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {mode === "signin"
                ? "Sign in to continue your streak"
                : "Create an account to save your progress"}
            </p>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="size-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.2 1.7 14.8.8 12 .8 7.4.8 3.5 3.4 1.6 7.2l3.5 2.7C6 7.1 8.8 5 12 5z"/>
                  <path fill="#34A853" d="M23.2 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.3c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.6-5 3.6-8.7z"/>
                  <path fill="#FBBC05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.6 7C.8 8.5.4 10.2.4 12s.4 3.5 1.2 5l3.5-2.7z"/>
                  <path fill="#4285F4" d="M12 23.2c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.2 1.1-3.2 0-5.9-2.1-6.9-5l-3.5 2.7C3.5 20.6 7.4 23.2 12 23.2z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form onSubmit={handleEmail} className="space-y-3">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">Go back home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
