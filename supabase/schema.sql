-- Esquema do painel. Rode inteiro no SQL Editor do Supabase (projeto do Recanto).
-- Contém só estrutura e regras de acesso. Nenhum dado.

-- 1. Quem pode acessar (todos com o mesmo nível)
create table if not exists public.usuarios_permitidos (
  email text primary key check (email = lower(email))
);

create or replace function public.eh_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios_permitidos where email = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function public.eh_membro() from public;
grant execute on function public.eh_membro() to authenticated;

-- 2. Dados do Airbnb (totais por mês e por ano)
create table if not exists public.meses (
  ym text primary key check (ym ~ '^[0-9]{4}-[0-9]{2}$'),
  bruto numeric not null check (bruto >= 0),
  liquido numeric not null check (liquido >= 0)
);
create table if not exists public.anos (
  ano int primary key,
  ini text not null, fim text not null, rotulo text not null,
  dias int not null, noites int not null,
  media_estadia numeric not null, imposto_hospede numeric not null, outros numeric not null,
  pdf_bruto numeric not null, pdf_taxa numeric not null, pdf_liquido numeric not null
);

-- 3. Lançamentos feitos no painel
create table if not exists public.custos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  categoria text not null check (char_length(categoria) <= 60),
  descricao text not null default '' check (char_length(descricao) <= 200),
  valor numeric not null check (valor > 0),
  anexo text check (anexo is null or anexo ~ '^[A-Za-z0-9_-]{6,64}(\.[a-z0-9]{2,5})?$'),
  anexo_tipo text not null default '',
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid()
);
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  entrada date not null,
  saida date not null check (saida > entrada),
  canal text not null check (char_length(canal) <= 60),
  descricao text not null default '' check (char_length(descricao) <= 200),
  valor numeric not null check (valor > 0),
  anexo text check (anexo is null or anexo ~ '^[A-Za-z0-9_-]{6,64}(\.[a-z0-9]{2,5})?$'),
  anexo_tipo text not null default '',
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid()
);

-- 4. RLS: sem login nada é lido; com login, só quem está em usuarios_permitidos
revoke all on all tables in schema public from anon;
alter table public.usuarios_permitidos enable row level security;
alter table public.meses enable row level security;
alter table public.anos enable row level security;
alter table public.custos enable row level security;
alter table public.reservas enable row level security;

create policy membros_leem_lista on public.usuarios_permitidos for select to authenticated using (public.eh_membro());
create policy membros_tudo on public.meses for all to authenticated using (public.eh_membro()) with check (public.eh_membro());
create policy membros_tudo on public.anos for all to authenticated using (public.eh_membro()) with check (public.eh_membro());
create policy membros_tudo on public.custos for all to authenticated using (public.eh_membro()) with check (public.eh_membro());
create policy membros_tudo on public.reservas for all to authenticated using (public.eh_membro()) with check (public.eh_membro());
grant select, insert, update, delete on public.meses, public.anos, public.custos, public.reservas to authenticated;
grant select on public.usuarios_permitidos to authenticated;

-- 5. Anexos: bucket privado, 20 MB, só PDF e imagens
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf'];
create policy anexos_membros on storage.objects for all to authenticated
  using (bucket_id = 'anexos' and public.eh_membro()) with check (bucket_id = 'anexos' and public.eh_membro());

-- 6. Atualização em tempo real dos lançamentos
alter publication supabase_realtime add table public.custos, public.reservas;

-- 7. Consulta de manutenção (mantém o projeto gratuito ativo). Não expõe dado nenhum.
create or replace function public.ping() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;
