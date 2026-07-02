import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Flame, GraduationCap, Eye, EyeOff, UserRound } from "lucide-react";
import { checkUsernameAvailable, signUpWithUsername } from "@/lib/username.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

// Synthetic email domain for username-only accounts.
const USERNAME_EMAIL_DOMAIN = "users.studygenie.app";
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
const isUsernameValid = (u: string) => /^[a-zA-Z0-9_.]{3,20}$/.test(u);

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"email" | "username">("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

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

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Please enter your name");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName.trim(),
              name: displayName.trim(),
              login_method: "email",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleUsername(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isUsernameValid(username)) {
        throw new Error("Username must be 3-20 chars: letters, numbers, _ or .");
      }
      const syntheticEmail = usernameToEmail(username);

      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Please enter a display name");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");

        // Create pre-confirmed user on the server (synthetic email can't receive confirmations)
        const { email: syntheticEmail } = await signUpWithUsername({
          data: {
            username: username.trim(),
            password,
            displayName: displayName.trim(),
          },
        });

        // Sign the user in immediately
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });
        if (signInErr) throw signInErr;
        toast.success(`Welcome, ${displayName.trim()}!`);
      } else {
        // Sign in: username → synthetic email, or use provided email
        const loginEmail = email.trim() || usernameToEmail(username);
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw new Error("Invalid username or password");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above, then tap 'Forgot password?'");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your inbox");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    try {
      localStorage.setItem("sg_guest_mode", "1");
    } catch { /* ignore */ }
    navigate({ to: "/explore" });
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
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 text-sm bg-accent/60 text-accent-foreground px-3 py-1 rounded-full">
              <GraduationCap className="size-4" /> For Math & Science learners
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Start learning today"}
            </h1>
            <p className="mt-1.5 text-muted-foreground text-sm">
              {mode === "signin" ? "Sign in to continue your streak" : "Create an account to save your XP"}
            </p>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden>
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

              <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "username")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="username">Username</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-4">
                  <form onSubmit={handleEmail} className="space-y-3">
                    {mode === "signup" && (
                      <Field label="Display Name" id="dn">
                        <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="h-11" />
                      </Field>
                    )}
                    <Field label="Email" id="email">
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className="h-11" />
                    </Field>
                    <PasswordField id="pw" value={password} onChange={setPassword} show={showPass} setShow={setShowPass} />
                    <BottomRow rememberMe={rememberMe} setRememberMe={setRememberMe} mode={mode} onForgot={handleForgotPassword} />
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="username" className="mt-4">
                  <form onSubmit={handleUsername} className="space-y-3">
                    {mode === "signup" && (
                      <Field label="Display Name" id="dn2">
                        <Input id="dn2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="h-11" />
                      </Field>
                    )}
                    <Field label="Username" id="un">
                      <Input id="un" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="e.g. imtiaz10" className="h-11" autoCapitalize="none" autoCorrect="off" />
                    </Field>
                    {mode === "signup" && (
                      <Field label="Email (optional, for password reset)" id="em2">
                        <Input id="em2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className="h-11" />
                      </Field>
                    )}
                    <PasswordField id="pw2" value={password} onChange={setPassword} show={showPass} setShow={setShowPass} />
                    <BottomRow rememberMe={rememberMe} setRememberMe={setRememberMe} mode={mode} onForgot={handleForgotPassword} usernameMode />
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

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

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button type="button" variant="ghost" className="w-full h-11" onClick={handleGuest}>
                <UserRound className="size-4" /> Continue as Guest
              </Button>
              <p className="text-[11px] text-center text-muted-foreground -mt-1">
                Login to save progress and XP.
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">Go back home</Link>
          </p>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            StudyGenie · Powered by <span className="font-semibold text-foreground/80">StenMey Technologies</span>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function PasswordField({
  id, value, onChange, show, setShow,
}: {
  id: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="At least 6 characters"
          className="h-11 pr-10"
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
  );
}

function BottomRow({
  rememberMe, setRememberMe, mode, onForgot, usernameMode,
}: {
  rememberMe: boolean; setRememberMe: (v: boolean) => void; mode: "signin" | "signup"; onForgot: () => void; usernameMode?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
        <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
        Keep me signed in
      </label>
      {mode === "signin" && !usernameMode && (
        <button type="button" onClick={onForgot} className="text-xs font-medium text-primary hover:underline">
          Forgot password?
        </button>
      )}
    </div>
  );
}
