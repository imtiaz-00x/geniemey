import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/integrations/supabase/client";
import { signUpWithUsername } from "@/lib/username.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function safeNext(value: unknown) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@users.studygenie.app`;
}

function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginMode, setLoginMode] = useState<"email" | "username">("email");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nextPath, setNextPath] = useState("/");

  const handleGoogle = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(
            nextPath,
          )}`,
        },
      });

      if (error) throw error;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        toast.success("Account created successfully.");
        await navigate({ to: nextPath });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        toast.success("Welcome back!");
        await navigate({ to: nextPath });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUsername = async () => {
    if (!username.trim() || !password) {
      toast.error("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        if (!displayName.trim()) {
          toast.error("Please enter your display name.");
          return;
        }

        const result = await signUpWithUsername({
          data: {
            username: username.trim(),
            password,
            displayName: displayName.trim(),
          },
        });

        const { error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: result.email,
            password,
          });

        if (signInErr) throw signInErr;

        toast.success(`Welcome, ${displayName.trim()}!`);
        await navigate({ to: nextPath });
      } else {
        const loginEmail =
          email.trim() || usernameToEmail(username);

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (error) throw error;

        toast.success("Welcome back!");
        await navigate({ to: nextPath });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) throw error;

      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send reset email.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      toast.success("Continuing as guest.");
      await navigate({ to: nextPath });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Guest mode is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
            {mode === "signin" ? (
              <Lock className="size-6" />
            ) : (
              <UserPlus className="size-6" />
            )}
          </div>

          <CardTitle className="text-2xl">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue learning with GenieMey."
              : "Create your GenieMey student account."}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={loginMode === "email" ? "default" : "outline"}
              onClick={() => setLoginMode("email")}
            >
              <Mail className="mr-2 size-4" />
              Email
            </Button>

            <Button
              type="button"
              variant={loginMode === "username" ? "default" : "outline"}
              onClick={() => setLoginMode("username")}
            >
              <User className="mr-2 size-4" />
              Username
            </Button>
          </div>

          {mode === "signup" && (
            <Field
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Your name"
              icon={<User className="size-4" />}
            />
          )}

          {loginMode === "email" ? (
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              icon={<Mail className="size-4" />}
            />
          ) : (
            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="yourusername"
              icon={<User className="size-4" />}
            />
          )}

          <PasswordField
            value={password}
            onChange={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
          <BottomRow
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            mode={mode}
            onForgot={handleForgotPassword}
            usernameMode={loginMode === "username"}
          />

          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={loginMode === "email" ? handleEmail : handleUsername}
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogle}
          >
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={handleGuest}
          >
            Continue as guest
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to use GenieMey responsibly for learning.
          </p>

          <div className="text-center">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}

        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={icon ? "pl-10" : undefined}
        />
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  setShowPassword,
}: {
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Password</Label>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Your password"
          className="pl-10 pr-10"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
function BottomRow({
  rememberMe,
  setRememberMe,
  mode,
  onForgot,
  usernameMode,
}: {
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  mode: "signin" | "signup";
  onForgot: () => void;
  usernameMode?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
        <Checkbox
          checked={rememberMe}
          onCheckedChange={(value) => setRememberMe(!!value)}
        />
        Keep me signed in
      </label>

      {mode === "signin" && !usernameMode && (
        <button
          type="button"
          onClick={onForgot}
          className="text-xs font-medium text-primary hover:underline"
        >
          Forgot password?
        </button>
      )}
    </div>
  );
}