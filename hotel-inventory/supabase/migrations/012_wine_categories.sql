-- Migration 012: Add wine categories (one per cepa/grape variety)

INSERT INTO categories (id, name, sort_order) VALUES
  (gen_random_uuid(), 'Sauvignon Blanc', 100),
  (gen_random_uuid(), 'Chardonnay', 101),
  (gen_random_uuid(), 'Espumantes', 102),
  (gen_random_uuid(), 'Rosé', 103),
  (gen_random_uuid(), 'Blancos Distintos', 104),
  (gen_random_uuid(), 'Pinot Noir', 105),
  (gen_random_uuid(), 'Íconos', 106),
  (gen_random_uuid(), 'Blend', 107),
  (gen_random_uuid(), 'Tintos Distintos', 108),
  (gen_random_uuid(), 'Syrah', 109),
  (gen_random_uuid(), 'Malbec', 110),
  (gen_random_uuid(), 'Merlot', 111),
  (gen_random_uuid(), 'Carmenere', 112),
  (gen_random_uuid(), 'Cabernet Sauvignon', 113)
ON CONFLICT DO NOTHING;
