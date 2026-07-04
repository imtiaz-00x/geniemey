import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Flame, GraduationCap, Info, Camera, Trash2, User as UserIcon } from "lucide-react";
import { checkUsernameAvailable } from "@/lib/username.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const isUsernameValid = (u: string) => /^[a-zA-Z0-9_.]{3,20}$/.test(u);

async function resizeImageToDataUrl(file: File, size = 320): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // cover-fit crop
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

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


  const fileRef = useRef<HTMLInputElement | null>(null);
  const avatarMut = useMutation({
    mutationFn: async (file: File | null) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      let avatar_url: string | null = null;
      if (file) {
        if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
        if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large (max 8MB)");
        avatar_url = await resizeImageToDataUrl(file, 320);
      }
      const { error } = await supabase.from("profiles").update({ avatar_url }).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: (_d, file) => {
      toast.success(file ? "Photo updated" : "Photo removed");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard-header"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profile = profileQ.data?.profile;
  const initial = (displayName || profile?.display_name || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-24">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update how you appear in GenieMey.</p>
      </div>

      <Card className="p-5 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="size-28 rounded-full overflow-hidden border-4 border-primary/25 bg-primary/10 grid place-items-center shadow">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Your profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">{initial}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarMut.isPending}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:opacity-90 disabled:opacity-60"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) avatarMut.mutate(f);
          }}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={avatarMut.isPending}
          >
            <UserIcon className="size-4" />
            {avatarMut.isPending ? "Uploading..." : profile?.avatar_url ? "Change photo" : "Upload photo"}
          </Button>
          {profile?.avatar_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => avatarMut.mutate(null)}
              disabled={avatarMut.isPending}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Square images look best. Max 8MB.
        </p>
      </Card>


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
          <p className="font-semibold text-sm">About GenieMey</p>
          <p className="text-xs text-muted-foreground">Learn what GenieMey can do for you.</p>
        </div>
        <Link to="/about">
          <Button variant="outline">
            <Info className="size-4" /> About
          </Button>
        </Link>
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

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        GenieMey · Powered by <span className="font-semibold text-foreground/80">StenMey Technologies</span>
      </p>
    </div>
  );
}
