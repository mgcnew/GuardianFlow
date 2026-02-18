-- Expansão da tabela children para atender necessidades completas de um abrigo
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS judicial_process text,
ADD COLUMN IF NOT EXISTS nis text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS ethnicity text,
ADD COLUMN IF NOT EXISTS health_info text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS medications text,
ADD COLUMN IF NOT EXISTS schooling text,
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS clothes_size text,
ADD COLUMN IF NOT EXISTS shoes_size text,
ADD COLUMN IF NOT EXISTS reason_for_admission text;

-- Criar bucket de storage para fotos das crianças (se não existir)
-- Nota: Isso geralmente é feito via dashboard do Supabase ou via SQL se tiver extensões
-- Mas deixarei o SQL aqui para referência de políticas

insert into storage.buckets (id, name, public) 
values ('children-photos', 'children-photos', true)
on conflict (id) do nothing;

create policy "Fotos públicas para leitura"
on storage.objects for select
using ( bucket_id = 'children-photos' );

create policy "Usuários autenticados podem subir fotos"
on storage.objects for insert
with check ( bucket_id = 'children-photos' AND auth.role() = 'authenticated' );

create policy "Usuários podem apagar suas fotos"
on storage.objects for delete
using ( bucket_id = 'children-photos' AND auth.role() = 'authenticated' );
