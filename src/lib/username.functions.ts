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
