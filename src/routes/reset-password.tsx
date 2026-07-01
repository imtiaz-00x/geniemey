import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Flame, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places a recovery access_token in the URL hash; the client picks it up.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you're signed in");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/40 to-accent/30">
      <header className="px-6 py-5 flex items-center gap-2">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
          <Flame className="size-5" />
        </div>
        <span className="font-bold text-lg">StudyGenie</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ready ? "Enter your new password below." : "Waiting for reset link to verify..."}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="np">New password</Label>
                <div className="relative">
                  <Input
                    id="np"
                    type={show ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 pr-10"
                    disabled={!ready}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={!ready || loading}>
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/auth" className="hover:underline">Back to sign in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
