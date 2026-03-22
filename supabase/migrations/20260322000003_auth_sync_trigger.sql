-- =============================================================================
-- CARSI LMS — Auth User Sync Trigger
-- =============================================================================
-- Automatically creates an lms_users record when a user signs up via Supabase Auth
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger function: Create lms_users profile on auth.users insert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.lms_users (
        id,
        email,
        full_name,
        avatar_url,
        is_active,
        is_verified
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        ),
        true,
        COALESCE((NEW.email_confirmed_at IS NOT NULL), false)
    );

    -- Grant default 'student' role
    INSERT INTO public.lms_user_roles (user_id, role_id)
    SELECT NEW.id, id FROM public.lms_roles WHERE name = 'student';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Trigger: After auth.users insert
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger function: Sync email/verification status on auth.users update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.lms_users
    SET
        email = NEW.email,
        full_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            full_name
        ),
        avatar_url = COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            avatar_url
        ),
        is_verified = COALESCE((NEW.email_confirmed_at IS NOT NULL), is_verified),
        updated_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Trigger: After auth.users update
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- ---------------------------------------------------------------------------
-- Trigger function: Cascade delete on auth.users delete
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- lms_users has ON DELETE CASCADE, so this is handled automatically
    -- But we can log or perform additional cleanup here if needed
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Grant execute permissions to authenticated users
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.lms_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_is_instructor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_is_enrolled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_has_active_subscription() TO authenticated;
