-- Run with psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 -f ops/sql/0001_resume_owner.sql
-- Back up first. Existing resumes remain unowned and inaccessible until an
-- administrator verifies ownership and explicitly assigns owner_id.
BEGIN;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS owner_id varchar;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resumes_owner_id_users_id_fk'
      AND conrelid = 'public.resumes'::regclass
  ) THEN
    ALTER TABLE public.resumes ADD CONSTRAINT resumes_owner_id_users_id_fk
      FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS resumes_owner_id_idx ON public.resumes (owner_id);
COMMIT;
