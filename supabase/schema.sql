-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create organizations table (Tenants)
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for organizations
alter table organizations enable row level security;

-- Create profiles table linked to auth.users
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('saas_admin', 'org_admin', 'pedagogue', 'technician', 'educator', 'operational')) default 'operational',
  organization_id uuid references organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table profiles enable row level security;

-- Create children table with tenant isolation
create table children (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  full_name text not null,
  date_of_birth date,
  admission_date date default now(),
  status text check (status in ('active', 'pending', 'urgent')) default 'active',
  unit text,
  legal_status text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for children
alter table children enable row level security;

-- Create logs table with tenant isolation
create table logs (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  child_id uuid references children(id) not null,
  staff_id uuid references auth.users(id) not null,
  category text check (category in ('behavior', 'health', 'education', 'meal', 'incident')) not null,
  mood text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for logs
alter table logs enable row level security;

-- RLS Policies

-- Helper function to get current user's organization_id
create or replace function get_auth_org_id()
returns uuid
language sql security definer
stable
as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Organizations Policies
create policy "Users can view their own organization." on organizations
  for select using ( id = get_auth_org_id() );

-- Profiles Policies
create policy "Users can view profiles in their organization." on profiles
  for select using ( organization_id = get_auth_org_id() );

create policy "Users can update their own profile." on profiles
  for update using ( id = auth.uid() );

-- Children Policies
create policy "Users can view children in their organization." on children
  for select using ( organization_id = get_auth_org_id() );

create policy "Users can insert children in their organization." on children
  for insert with check ( organization_id = get_auth_org_id() );

create policy "Users can update children in their organization." on children
  for update using ( organization_id = get_auth_org_id() );

-- Logs Policies
create policy "Users can view logs in their organization." on logs
  for select using ( organization_id = get_auth_org_id() );

create policy "Users can insert logs in their organization." on logs
  for insert with check ( organization_id = get_auth_org_id() );

-- Trigger for new users
-- NOTE: For a real SaaS, a user usually gets invited or creates an org. 
-- For simplicity here, if it's the first user, we might want to let them create an org, 
-- but for now, we'll leave the organization_id null and let the app handle assignment or manual DB setup for the first org.

-- Updated handle_new_user to be more flexible
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, organization_id)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'operational'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Initial Seed Data (Optional helper to create first org if needed manually)
-- insert into organizations (name) values ('Casa Lar Exemplo');
