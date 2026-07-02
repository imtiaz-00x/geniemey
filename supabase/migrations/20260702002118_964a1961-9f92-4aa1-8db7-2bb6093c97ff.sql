REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO service_role;