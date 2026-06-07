
-- Enable trigram extension for fuzzy / wildcard ILIKE acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profiles: name, profession, bio (the three columns useUnifiedSearch hits)
CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx     ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_profession_trgm_idx    ON public.profiles USING gin (profession gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_bio_trgm_idx           ON public.profiles USING gin (bio gin_trgm_ops);

-- Jobs (job_posts table) — title, description, company
CREATE INDEX IF NOT EXISTS job_posts_title_trgm_idx        ON public.job_posts USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS job_posts_description_trgm_idx  ON public.job_posts USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS job_posts_company_trgm_idx      ON public.job_posts USING gin (company_name gin_trgm_ops);

-- Gigs (jobs_services)
CREATE INDEX IF NOT EXISTS jobs_services_title_trgm_idx       ON public.jobs_services USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS jobs_services_description_trgm_idx ON public.jobs_services USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS jobs_services_category_trgm_idx    ON public.jobs_services USING gin (category gin_trgm_ops);

-- Courses
CREATE INDEX IF NOT EXISTS courses_title_trgm_idx          ON public.courses USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS courses_description_trgm_idx    ON public.courses USING gin (description gin_trgm_ops);

-- Digital products
CREATE INDEX IF NOT EXISTS digital_products_title_trgm_idx       ON public.digital_products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS digital_products_description_trgm_idx ON public.digital_products USING gin (description gin_trgm_ops);

-- Expert classes
CREATE INDEX IF NOT EXISTS expert_classes_title_trgm_idx       ON public.expert_classes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS expert_classes_description_trgm_idx ON public.expert_classes USING gin (description gin_trgm_ops);

-- Fundraising campaigns
CREATE INDEX IF NOT EXISTS fundraisings_title_trgm_idx     ON public.fundraisings USING gin (title gin_trgm_ops);
