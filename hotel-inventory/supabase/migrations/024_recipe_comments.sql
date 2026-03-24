-- Add comments field to recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS comments TEXT;
