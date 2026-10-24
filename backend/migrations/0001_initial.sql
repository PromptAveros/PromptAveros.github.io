CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE prompt_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE IF NOT EXISTS categories (
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

CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  prompt_text text NOT NULL,
  image_url text,
  image_alt text NOT NULL DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
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
  status prompt_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prompt_styles (
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  style_id uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, style_id)
);

CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE TABLE IF NOT EXISTS prompt_generators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL UNIQUE,
  display_name text NOT NULL,
  documentation_url text,
  supports_prefill boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS prompt_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prompt_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('copy')),
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  visitor_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  auth_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompts_published_date_idx ON prompts (published_at DESC, id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS prompts_category_idx ON prompts (category_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS prompts_status_updated_idx ON prompts (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS prompts_search_idx ON prompts USING gin (to_tsvector('english', title || ' ' || description || ' ' || prompt_text));
CREATE INDEX IF NOT EXISTS prompt_styles_style_idx ON prompt_styles (style_id, prompt_id);
CREATE INDEX IF NOT EXISTS prompt_tags_tag_idx ON prompt_tags (tag_id, prompt_id);
CREATE INDEX IF NOT EXISTS usage_prompt_created_idx ON prompt_usage_events (prompt_id, created_at DESC) WHERE event_type = 'copy';
CREATE INDEX IF NOT EXISTS usage_visitor_created_idx ON prompt_usage_events (visitor_hash, created_at DESC);

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('AI Portraits', 'ai-portraits', 'Portrait ideas shaped by expression, light, and point of view.', 1),
  ('Cinematic Photography', 'cinematic-photography', 'Atmospheric scenes with intentional composition and light.', 2),
  ('Fantasy Art', 'fantasy-art', 'Imaginative worlds, characters, and storybook scenes.', 3),
  ('Product Photography', 'product-photography', 'Thoughtful product still life and campaign directions.', 4),
  ('Architecture & Interiors', 'architecture-interiors', 'Spaces and buildings explored through image-making.', 5),
  ('3D Art & Renderings', '3d-art-renderings', 'Playful characters and crafted digital objects.', 6),
  ('Nature & Landscapes', 'nature-landscapes', 'Landscapes and botanical scenes with a sense of place.', 7),
  ('Anime & Illustration', 'anime-illustration', 'Illustrative, graphic, and hand-crafted visual approaches.', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO styles (name, slug) VALUES
  ('Photorealistic', 'photorealistic'), ('Cinematic', 'cinematic'), ('Minimalist', 'minimalist'),
  ('Watercolor', 'watercolor'), ('Vintage', 'vintage'), ('3D Render', '3d-render'),
  ('Studio Portrait', 'studio-portrait'), ('Editorial Fashion', 'editorial-fashion'), ('Surrealism', 'surrealism')
ON CONFLICT (slug) DO NOTHING;
