import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Flame, GraduationCap } from "lucide-react";
import { checkUsernameAvailable } from "@/lib/username.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const isUsernameValid = (u: string) => /^[a-zA-Z0-9_.]{3,20}$/.test(u);

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, login_method, total_xp, current_streak, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return { profile: data, email: userData.user?.email ?? null };
    },
  });

  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hydrated && profileQ.data?.profile) {
      setDisplayName(profileQ.data.profile.display_name ?? "");
      setUsername(profileQ.data.profile.username ?? "");
      setHydrated(true);
    }
  }, [hydrated, profileQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!displayName.trim()) throw new Error("Display name is required");
      const cleanUsername = username.trim().toLowerCase();
      const currentUsername = profileQ.data?.profile?.username ?? null;

      if (cleanUsername && !isUsernameValid(cleanUsername)) {
        throw new Error("Username must be 3-20 chars: letters, numbers, _ or .");
      }
      if (cleanUsername && cleanUsername !== currentUsername) {
        const { available } = await checkUsernameAvailable({ data: { username: cleanUsername } });
        if (!available) throw new Error("That username is already taken");
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          username: cleanUsername || null,
        })
        .eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard-header"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const profile = profileQ.data?.profile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-24">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update how you appear in StudyGenie.</p>
      </div>

      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          <GraduationCap className="size-4" />
          {profile?.total_xp ?? 0} XP
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/60 text-accent-foreground text-sm font-medium">
          <Flame className="size-4 text-flame" />
          {profile?.current_streak ?? 0} day streak
        </div>
        {profile?.login_method && (
          <span className="text-xs text-muted-foreground px-2">
            Signed in via <span className="font-medium capitalize">{profile.login_method}</span>
          </span>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dn">Display Name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="un">Username</Label>
          <Input
            id="un"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            className="h-11"
            placeholder="pick a unique handle"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="text-[11px] text-muted-foreground">3-20 characters. Letters, numbers, _ or . only.</p>
        </div>
        {profileQ.data?.email && (
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profileQ.data.email} disabled className="h-11" />
          </div>
        )}
        <Button className="w-full h-11" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving..." : "Save changes"}
        </Button>
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Sign out</p>
          <p className="text-xs text-muted-foreground">You'll be returned to the login screen.</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="size-4" /> Log out
        </Button>
      </Card>
    </div>
  );
}
