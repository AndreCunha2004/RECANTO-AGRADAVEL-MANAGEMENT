-- Esquema do painel. Rode inteiro no SQL Editor do Supabase (projeto do Recanto).
-- Contém só estrutura e regras de acesso. Nenhum dado.

-- 1. Quem pode acessar (todos com o mesmo nível)
create table if not exists public.usuarios_permitidos (
  email text primary key check (email = lower(email))
);

-- Função fora da API pública (schema privado), usada só pelas regras de acesso
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;
create or replace function privado.eh_membro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_permitidos where email = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function privado.eh_membro() from public, anon;
grant execute on function privado.eh_membro() to authenticated;

-- 2. Dados do Airbnb (totais por mês e por ano)
create table if not exists public.meses (
  ym text primary key check (ym ~ '^[0-9]{4}-[0-9]{2}$'),
  bruto numeric not null check (bruto >= 0),
  liquido numeric not null check (liquido >= 0)
);
create table if not exists public.anos (
  ano int primary key,
  ini text not null, fim text not null, rotulo text not null,
  dias int not null, noites int,
  media_estadia numeric, imposto_hospede numeric, imposto_rotulo text, outros numeric not null default 0,
  pdf_bruto numeric not null, pdf_taxa numeric not null, pdf_liquido numeric not null
);

-- Reservas, resoluções e créditos do Airbnb (pagos e programados)
create table if not exists public.reservas_airbnb (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  tipo text not null check (tipo in ('reserva','resolucao','credito','ajuste')),
  status text not null check (status in ('concluida','programada')),
  hospede text,
  data_reserva date,
  entrada date, saida date,
  noites int not null default 0,
  bruto numeric not null default 0, taxa numeric not null default 0, limpeza numeric not null default 0, pet numeric not null default 0,
  liquido numeric not null,
  pagamento date not null,
  descricao text
);
-- Informações gerais (ex.: data da última atualização)
create table if not exists public.config (chave text primary key, valor text not null);

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
alter table public.reservas_airbnb enable row level security;
alter table public.config enable row level security;
alter table public.custos enable row level security;
alter table public.reservas enable row level security;

create policy membros_leem_lista on public.usuarios_permitidos for select to authenticated using ((select privado.eh_membro()));
create policy membros_tudo on public.meses for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
create policy membros_tudo on public.anos for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
create policy membros_tudo on public.reservas_airbnb for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
create policy membros_tudo on public.config for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
create policy membros_tudo on public.custos for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
create policy membros_tudo on public.reservas for all to authenticated using ((select privado.eh_membro())) with check ((select privado.eh_membro()));
grant select, insert, update, delete on public.meses, public.anos, public.reservas_airbnb, public.config, public.custos, public.reservas to authenticated;
grant select on public.usuarios_permitidos to authenticated;

-- 5. Anexos: bucket privado, 20 MB, só PDF e imagens
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf'];
create policy anexos_membros on storage.objects for all to authenticated
  using (bucket_id = 'anexos' and (select privado.eh_membro())) with check (bucket_id = 'anexos' and (select privado.eh_membro()));

-- 6. Atualização em tempo real dos lançamentos
alter publication supabase_realtime add table public.custos, public.reservas;

-- 7. Consulta de manutenção (mantém o projeto gratuito ativo). Não expõe dado nenhum.
create or replace function public.ping() returns timestamptz language sql stable set search_path = '' as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;

-- ============================================================
-- Preferências por usuário (tema e ordem do Início) — 27/11/2026
-- Cada pessoa só lê e grava a própria linha, e só se estiver na lista de membros.
-- ============================================================
create table if not exists public.preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tema text not null default 'sistema' check (tema in ('claro','escuro','sistema')),
  ordem_inicio jsonb not null default '[]'::jsonb check (jsonb_typeof(ordem_inicio) = 'array'),
  atualizado_em timestamptz not null default now()
);
alter table public.preferencias enable row level security;
revoke all on public.preferencias from anon;
grant select, insert, update on public.preferencias to authenticated;

create policy "le as proprias" on public.preferencias
  for select to authenticated
  using (user_id = (select auth.uid()) and (select privado.eh_membro()));
create policy "cria as proprias" on public.preferencias
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select privado.eh_membro()));
create policy "altera as proprias" on public.preferencias
  for update to authenticated
  using (user_id = (select auth.uid()) and (select privado.eh_membro()))
  with check (user_id = (select auth.uid()) and (select privado.eh_membro()));
