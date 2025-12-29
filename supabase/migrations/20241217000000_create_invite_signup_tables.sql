-- Invite-only signup support
-- NOTE: per instructions, do not auto-run; review and execute manually when ready.

-- 1. Invitations table -------------------------------------------------------
create table if not exists public.invitations (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    email text,
    allowed_modules jsonb not null default '[]'::jsonb,
    max_uses integer not null default 1,
    uses integer not null default 0,
    expires_at timestamptz,
    created_by uuid,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint invitations_code_length check (char_length(code) >= 12),
    constraint invitations_uses_check check (max_uses > 0 and uses >= 0 and uses <= max_uses)
);

create index if not exists idx_invitations_code on public.invitations (code);
create index if not exists idx_invitations_email on public.invitations (lower(email));

alter table public.invitations enable row level security;

-- Only service role (or backend RPC) can manage invitations by default.
create policy if not exists "Invitations service access"
    on public.invitations
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');


-- 2. User profiles table -----------------------------------------------------
create table if not exists public.user_profiles (
    auth_user_id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique,
    display_name text,
    allowed_modules jsonb not null default '[]'::jsonb,
    invitation_id uuid references public.invitations (id),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint user_profiles_username_length check (char_length(username) between 3 and 64)
);

create index if not exists idx_user_profiles_invitation_id on public.user_profiles (invitation_id);

alter table public.user_profiles enable row level security;

-- Owners (logged-in users) can read/update their own profile.
create policy if not exists "User profiles self access"
    on public.user_profiles
    for select
    using (auth.uid() = auth_user_id);

create policy if not exists "User profiles self modify"
    on public.user_profiles
    for update
    using (auth.uid() = auth_user_id)
    with check (auth.uid() = auth_user_id);

-- Service role can insert/update profiles when provisioning accounts.
create policy if not exists "User profiles service manage"
    on public.user_profiles
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');


-- 3. Helper function to keep timestamps fresh--------------------------------
create or replace function public.touch_user_profile()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists trg_user_profiles_touch on public.user_profiles;
create trigger trg_user_profiles_touch
before update on public.user_profiles
for each row execute procedure public.touch_user_profile();


-- Helper trigger for invitations.updated_at as well
create or replace function public.touch_invitations()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists trg_invitations_touch on public.invitations;
create trigger trg_invitations_touch
before update on public.invitations
for each row execute procedure public.touch_invitations();


-- 4. Helper RPC to validate + reserve an invitation -------------------------
create or replace function public.redeem_invitation(p_code text)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inv public.invitations;
begin
    if p_code is null or char_length(p_code) < 12 then
        raise exception 'invalid_code';
    end if;

    select * into v_inv
    from public.invitations
    where code = p_code
    for update;

    if not found then
        raise exception 'invitation_not_found';
    end if;

    if v_inv.expires_at is not null and v_inv.expires_at < timezone('utc', now()) then
        raise exception 'invitation_expired';
    end if;

    if v_inv.uses >= v_inv.max_uses then
        raise exception 'invitation_maxed';
    end if;

    update public.invitations
    set uses = uses + 1
    where id = v_inv.id
    returning * into v_inv;

    return v_inv;
end;
$$;

revoke execute on function public.redeem_invitation(text) from public;
grant execute on function public.redeem_invitation(text) to service_role;


