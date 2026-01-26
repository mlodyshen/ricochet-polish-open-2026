-- Create Tournaments Table
create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date timestamptz default now(),
  status text check (status in ('setup', 'live', 'finished')) default 'setup',
  created_at timestamptz default now()
);

-- Create Players Table
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade not null,
  full_name text not null,
  country text,
  elo int default 0,
  created_at timestamptz default now()
);

-- Create Matches Table (Composite PK)
create table if not exists matches (
  tournament_id uuid references tournaments(id) on delete cascade not null,
  id text not null, -- stores 'wb-r1-m1', etc.
  bracket_type text,
  round_id int,
  player1_id uuid references players(id),
  player2_id uuid references players(id),
  score1 int,
  score2 int,
  micro_points jsonb,
  winner_id uuid references players(id),
  status text,
  court text,
  created_at timestamptz default now(),
  
  primary key (tournament_id, id)
);

-- Enable RLS (Row Level Security) if you want to secure it, 
-- but for this MVP we can leave it public or set minimal policies.
alter table tournaments enable row level security;
alter table players enable row level security;
alter table matches enable row level security;

-- Allow public read access
create policy "Allow public read tournaments" on tournaments for select using (true);
create policy "Allow public read players" on players for select using (true);
create policy "Allow public read matches" on matches for select using (true);

-- Allow authenticated insert/update/delete (or public for MVP simplicity if Auth is not Supabase Auth)
-- Since your app uses custom simple auth ('rpo_admin' in localStorage), 
-- these tables should probably be open for All or you need to implement Supabase Auth.
-- For now, allowing all operations for anon (simplest for your 'kacper/rpo26' setup which is client-side only).
create policy "Allow public all tournaments" on tournaments for all using (true);
create policy "Allow public all players" on players for all using (true);
create policy "Allow public all matches" on matches for all using (true);
