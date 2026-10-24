CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.prompt_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  image_url text,
  seo_title text,
  meta_description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  prompt_text text NOT NULL,
  image_url text,
  image_alt text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  styles text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  generators text[] NOT NULL DEFAULT '{}',
  aspect_ratio text,
  customization_tips text NOT NULL DEFAULT '',
  seo_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image_url text,
  robots_index boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  status public.prompt_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.prompt_styles (
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  style_id uuid NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, style_id)
);

CREATE TABLE IF NOT EXISTS public.prompt_tags (
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.prompt_generators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL UNIQUE,
  display_name text NOT NULL,
  documentation_url text,
  supports_prefill boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.prompt_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.prompt_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('copy')),
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_attempts (
  visitor_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  session_id text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON public.admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  auth_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompts_published_date_idx ON public.prompts (published_at DESC, id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS prompts_category_idx ON public.prompts (category_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS prompts_status_updated_idx ON public.prompts (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS prompts_search_idx ON public.prompts USING gin (to_tsvector('english', title || ' ' || description || ' ' || prompt_text));
CREATE INDEX IF NOT EXISTS prompt_styles_style_idx ON public.prompt_styles (style_id, prompt_id);
CREATE INDEX IF NOT EXISTS prompt_tags_tag_idx ON public.prompt_tags (tag_id, prompt_id);
CREATE INDEX IF NOT EXISTS usage_prompt_created_idx ON public.prompt_usage_events (prompt_id, created_at DESC) WHERE event_type = 'copy';
CREATE INDEX IF NOT EXISTS usage_visitor_created_idx ON public.prompt_usage_events (visitor_hash, created_at DESC);

INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('AI Portraits', 'ai-portraits', 'Portrait ideas shaped by expression, light, and point of view.', 1),
  ('Cinematic Photography', 'cinematic-photography', 'Atmospheric scenes with intentional composition and light.', 2),
  ('Fantasy Art', 'fantasy-art', 'Imaginative worlds, characters, and storybook scenes.', 3),
  ('Product Photography', 'product-photography', 'Thoughtful product still life and campaign directions.', 4),
  ('Architecture & Interiors', 'architecture-interiors', 'Spaces and buildings explored through image-making.', 5),
  ('3D Art & Renderings', '3d-art-renderings', 'Playful characters and crafted digital objects.', 6),
  ('Nature & Landscapes', 'nature-landscapes', 'Landscapes and botanical scenes with a sense of place.', 7),
  ('Anime & Illustration', 'anime-illustration', 'Illustrative, graphic, and hand-crafted visual approaches.', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.styles (name, slug) VALUES
  ('Photorealistic', 'photorealistic'), ('Cinematic', 'cinematic'), ('Minimalist', 'minimalist'),
  ('Watercolor', 'watercolor'), ('Vintage', 'vintage'), ('3D Render', '3d-render'),
  ('Studio Portrait', 'studio-portrait'), ('Editorial Fashion', 'editorial-fashion'), ('Surrealism', 'surrealism')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_visitor_hash text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result integer;
BEGIN
  INSERT INTO public.login_attempts AS current_attempt (visitor_hash, window_started_at, attempts)
  VALUES (p_visitor_hash, now(), 1)
  ON CONFLICT (visitor_hash) DO UPDATE
  SET attempts = CASE WHEN current_attempt.window_started_at < now() - interval '15 minutes' THEN 1 ELSE current_attempt.attempts + 1 END,
      window_started_at = CASE WHEN current_attempt.window_started_at < now() - interval '15 minutes' THEN now() ELSE current_attempt.window_started_at END
  RETURNING attempts INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.create_admin_session(p_session_id text, p_email text, p_expires_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.admin_sessions (session_id, email, expires_at) VALUES (p_session_id, p_email, p_expires_at);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin_session_active(p_session_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_sessions WHERE session_id = p_session_id AND revoked_at IS NULL AND expires_at > now())
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_session(p_session_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.admin_sessions SET revoked_at = now() WHERE session_id = p_session_id AND revoked_at IS NULL;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'prompts', jsonb_build_object(
      'total', count(*),
      'published', count(*) FILTER (WHERE status = 'published'),
      'drafts', count(*) FILTER (WHERE status = 'draft'),
      'archived', count(*) FILTER (WHERE status = 'archived'),
      'featured', count(*) FILTER (WHERE featured)
    ),
    'categories', jsonb_build_object('total', (SELECT count(*) FROM public.categories)),
    'styles', jsonb_build_object('total', (SELECT count(*) FROM public.styles))
  ) FROM public.prompts
$$;

CREATE OR REPLACE FUNCTION public.get_admin_prompts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'title', p.title, 'slug', p.slug, 'description', p.description,
    'prompt_text', p.prompt_text, 'image_url', p.image_url, 'image_alt', p.image_alt,
    'category', COALESCE(c.name, ''), 'category_slug', COALESCE(c.slug, ''),
    'styles', p.styles, 'aspect_ratio', p.aspect_ratio, 'tips', p.customization_tips,
    'featured', p.featured, 'status', p.status, 'tags', p.tags, 'generators', p.generators,
    'seo_title', p.seo_title, 'meta_description', p.meta_description, 'canonical_url', p.canonical_url,
    'og_title', p.og_title, 'og_description', p.og_description, 'og_image_url', p.og_image_url,
    'robots_index', p.robots_index, 'is_demo', p.is_demo, 'published_at', p.published_at,
    'created_at', p.created_at, 'updated_at', p.updated_at
  ) ORDER BY p.updated_at DESC, p.id), '[]'::jsonb)
  FROM public.prompts p LEFT JOIN public.categories c ON c.id = p.category_id
$$;

CREATE OR REPLACE FUNCTION public.get_admin_prompt(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'id', p.id, 'title', p.title, 'slug', p.slug, 'description', p.description, 'prompt_text', p.prompt_text,
    'image_url', COALESCE(p.image_url, ''), 'image_alt', p.image_alt, 'category', COALESCE(c.name, ''),
    'styles', p.styles, 'aspect_ratio', COALESCE(p.aspect_ratio, ''), 'tips', p.customization_tips,
    'tags', p.tags, 'generators', p.generators, 'seo_title', p.seo_title, 'meta_description', p.meta_description,
    'canonical_url', COALESCE(p.canonical_url, ''), 'og_title', COALESCE(p.og_title, ''),
    'og_description', COALESCE(p.og_description, ''), 'og_image_url', COALESCE(p.og_image_url, ''),
    'robots_index', p.robots_index, 'featured', p.featured, 'status', p.status, 'updated_at', p.updated_at,
    'faqs', COALESCE((SELECT jsonb_agg(jsonb_build_object('question', f.question, 'answer', f.answer) ORDER BY f.sort_order, f.id)
                      FROM public.prompt_faqs f WHERE f.prompt_id = p.id), '[]'::jsonb)
  ) FROM public.prompts p LEFT JOIN public.categories c ON c.id = p.category_id WHERE p.id = p_id
$$;

CREATE OR REPLACE FUNCTION public.list_admin_taxonomy(p_kind text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_kind = 'categories' THEN
    RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.sort_order, x.name), '[]'::jsonb)
            FROM (SELECT id, name, slug, description, image_url, seo_title, meta_description, sort_order FROM public.categories) x);
  ELSIF p_kind = 'styles' THEN
    RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'description', description,
      'image_url', '', 'seo_title', '', 'meta_description', '', 'sort_order', 0) ORDER BY name), '[]'::jsonb) FROM public.styles);
  ELSIF p_kind = 'tags' THEN
    RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug,
      'description', '', 'image_url', '', 'seo_title', '', 'meta_description', '', 'sort_order', 0) ORDER BY name), '[]'::jsonb) FROM public.tags);
  END IF;
  RAISE EXCEPTION 'Unknown taxonomy kind';
END $$;

CREATE OR REPLACE FUNCTION public.save_admin_taxonomy(p_kind text, p_input jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result uuid;
BEGIN
  IF p_kind = 'categories' THEN
    INSERT INTO public.categories (name, slug, description, image_url, seo_title, meta_description, sort_order)
    VALUES (p_input->>'name', p_input->>'slug', COALESCE(p_input->>'description', ''), NULLIF(p_input->>'image_url', ''),
      NULLIF(p_input->>'seo_title', ''), NULLIF(p_input->>'meta_description', ''), COALESCE((p_input->>'sort_order')::integer, 0))
    RETURNING id INTO result;
  ELSIF p_kind = 'styles' THEN
    INSERT INTO public.styles (name, slug, description)
    VALUES (p_input->>'name', p_input->>'slug', COALESCE(p_input->>'description', '')) RETURNING id INTO result;
  ELSIF p_kind = 'tags' THEN
    INSERT INTO public.tags (name, slug) VALUES (p_input->>'name', p_input->>'slug') RETURNING id INTO result;
  ELSE
    RAISE EXCEPTION 'Unknown taxonomy kind';
  END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.update_admin_taxonomy(p_kind text, p_id uuid, p_input jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result uuid;
BEGIN
  IF p_kind = 'categories' THEN
    UPDATE public.categories SET name = p_input->>'name', slug = p_input->>'slug', description = COALESCE(p_input->>'description', ''),
      image_url = NULLIF(p_input->>'image_url', ''), seo_title = NULLIF(p_input->>'seo_title', ''),
      meta_description = NULLIF(p_input->>'meta_description', ''), sort_order = COALESCE((p_input->>'sort_order')::integer, 0), updated_at = now()
    WHERE id = p_id RETURNING id INTO result;
  ELSIF p_kind = 'styles' THEN
    UPDATE public.styles SET name = p_input->>'name', slug = p_input->>'slug', description = COALESCE(p_input->>'description', '')
    WHERE id = p_id RETURNING id INTO result;
  ELSIF p_kind = 'tags' THEN
    UPDATE public.tags SET name = p_input->>'name', slug = p_input->>'slug' WHERE id = p_id RETURNING id INTO result;
  ELSE
    RAISE EXCEPTION 'Unknown taxonomy kind';
  END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.delete_admin_taxonomy(p_kind text, p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE affected integer;
BEGIN
  IF p_kind = 'categories' THEN DELETE FROM public.categories WHERE id = p_id;
  ELSIF p_kind = 'styles' THEN DELETE FROM public.styles WHERE id = p_id;
  ELSIF p_kind = 'tags' THEN DELETE FROM public.tags WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Unknown taxonomy kind';
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END $$;

CREATE OR REPLACE FUNCTION public.save_admin_prompt(p_input jsonb, p_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_category_id uuid;
  result_id uuid;
  item text;
  related_id uuid;
  sort_index integer := 0;
  item_json jsonb;
BEGIN
  IF p_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.prompts WHERE id = p_id) THEN RETURN NULL; END IF;

  INSERT INTO public.categories (name, slug)
  VALUES (p_input->>'category', trim(both '-' from regexp_replace(lower(p_input->>'category'), '[^a-z0-9]+', '-', 'g')))
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
  RETURNING id INTO v_category_id;

  IF p_id IS NULL THEN
    INSERT INTO public.prompts (
      title, slug, description, prompt_text, image_url, image_alt, category_id, styles, tags, generators,
      aspect_ratio, customization_tips, featured, status, published_at, seo_title, meta_description,
      canonical_url, og_title, og_description, og_image_url, robots_index
    ) VALUES (
      p_input->>'title', p_input->>'slug', p_input->>'description', p_input->>'prompt_text',
      NULLIF(p_input->>'image_url', ''), COALESCE(p_input->>'image_alt', ''), v_category_id,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'styles', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'tags', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'generators', '[]'::jsonb))),
      NULLIF(p_input->>'aspect_ratio', ''), COALESCE(p_input->>'tips', ''), COALESCE((p_input->>'featured')::boolean, false),
      COALESCE((p_input->>'status')::public.prompt_status, 'draft'),
      CASE WHEN p_input->>'status' = 'published' THEN now() ELSE NULL END,
      NULLIF(p_input->>'seo_title', ''), NULLIF(p_input->>'meta_description', ''), NULLIF(p_input->>'canonical_url', ''),
      NULLIF(p_input->>'og_title', ''), NULLIF(p_input->>'og_description', ''), NULLIF(p_input->>'og_image_url', ''),
      COALESCE((p_input->>'robots_index')::boolean, true)
    ) RETURNING id INTO result_id;
  ELSE
    UPDATE public.prompts SET
      title = p_input->>'title', slug = p_input->>'slug', description = p_input->>'description',
      prompt_text = p_input->>'prompt_text', image_url = NULLIF(p_input->>'image_url', ''),
      image_alt = COALESCE(p_input->>'image_alt', ''), category_id = v_category_id,
      styles = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'styles', '[]'::jsonb))),
      tags = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'tags', '[]'::jsonb))),
      generators = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_input->'generators', '[]'::jsonb))),
      aspect_ratio = NULLIF(p_input->>'aspect_ratio', ''), customization_tips = COALESCE(p_input->>'tips', ''),
      seo_title = NULLIF(p_input->>'seo_title', ''), meta_description = NULLIF(p_input->>'meta_description', ''),
      canonical_url = NULLIF(p_input->>'canonical_url', ''), og_title = NULLIF(p_input->>'og_title', ''),
      og_description = NULLIF(p_input->>'og_description', ''), og_image_url = NULLIF(p_input->>'og_image_url', ''),
      robots_index = COALESCE((p_input->>'robots_index')::boolean, true),
      featured = COALESCE((p_input->>'featured')::boolean, false),
      status = COALESCE((p_input->>'status')::public.prompt_status, 'draft'),
      published_at = CASE WHEN p_input->>'status' = 'published' THEN COALESCE(published_at, now()) ELSE NULL END,
      updated_at = now()
    WHERE id = p_id RETURNING id INTO result_id;
  END IF;

  DELETE FROM public.prompt_styles WHERE prompt_id = result_id;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(p_input->'styles', '[]'::jsonb)) LOOP
    INSERT INTO public.styles (name, slug) VALUES (item, trim(both '-' from regexp_replace(lower(item), '[^a-z0-9]+', '-', 'g')))
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO related_id;
    INSERT INTO public.prompt_styles (prompt_id, style_id) VALUES (result_id, related_id) ON CONFLICT DO NOTHING;
  END LOOP;

  DELETE FROM public.prompt_tags WHERE prompt_id = result_id;
  FOR item IN SELECT jsonb_array_elements_text(COALESCE(p_input->'tags', '[]'::jsonb)) LOOP
    INSERT INTO public.tags (name, slug) VALUES (item, trim(both '-' from regexp_replace(lower(item), '[^a-z0-9]+', '-', 'g')))
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO related_id;
    INSERT INTO public.prompt_tags (prompt_id, tag_id) VALUES (result_id, related_id) ON CONFLICT DO NOTHING;
  END LOOP;

  DELETE FROM public.prompt_faqs WHERE prompt_id = result_id;
  FOR item_json IN SELECT jsonb_array_elements(COALESCE(p_input->'faqs', '[]'::jsonb)) LOOP
    INSERT INTO public.prompt_faqs (prompt_id, question, answer, sort_order)
    VALUES (result_id, item_json->>'question', item_json->>'answer', sort_index);
    sort_index := sort_index + 1;
  END LOOP;
  RETURN result_id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_admin_prompt(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE affected integer;
BEGIN
  DELETE FROM public.prompts WHERE id = p_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'categories', 'prompts', 'styles', 'tags', 'prompt_styles', 'prompt_tags', 'prompt_generators',
    'prompt_faqs', 'prompt_usage_events', 'login_attempts', 'admin_sessions', 'admin_users', 'site_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.record_login_attempt(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_admin_session(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin_session_active(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_admin_session(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_overview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_prompts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_prompt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_admin_taxonomy(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_admin_taxonomy(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_admin_taxonomy(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_admin_taxonomy(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_admin_prompt(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_admin_prompt(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_login_attempt(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_session(text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_session_active(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_admin_session(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_prompts() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_prompt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_admin_taxonomy(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_admin_taxonomy(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_taxonomy(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_admin_taxonomy(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_admin_prompt(jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_admin_prompt(uuid) TO service_role;
