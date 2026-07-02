import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const usernameSchema = z.object({ username: z.string().min(1).max(64) });

export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((data) => usernameSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: available, error } = await supabaseAdmin.rpc("is_username_available", {
      _username: data.username,
    });
    if (error) throw new Error(error.message);
    return { available: Boolean(available) };
  });

const signUpSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_.]+$/),
  password: z.string().min(6).max(200),
  displayName: z.string().min(1).max(80),
});

const USERNAME_EMAIL_DOMAIN = "users.studygenie.app";

export const signUpWithUsername = createServerFn({ method: "POST" })
  .inputValidator((data) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uname = data.username.trim().toLowerCase();

    // Availability check
    const { data: available, error: rpcErr } = await supabaseAdmin.rpc(
      "is_username_available",
      { _username: uname },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    if (!available) throw new Error("That username is already taken");

    const email = `${uname}@${USERNAME_EMAIL_DOMAIN}`;
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.displayName.trim(),
        name: data.displayName.trim(),
        username: uname,
        login_method: "username",
      },
    });
    if (error) throw new Error(error.message);
    return { email };
  });
