-- =============================================================================
-- Importacion de 90 items a Bar Casa Sanz (02-03-2026)
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- PASO 0: Crear categorias que no existen aun
-- (Las categorias de vino ya existen: Sauvignon Blanc, Chardonnay, Espumantes,
--  Rosé, Blancos Distintos, Pinot Noir, Íconos, Blend, Tintos Distintos,
--  Syrah, Malbec, Merlot, Carmenere, Cabernet Sauvignon)
INSERT INTO categories (name, sort_order) VALUES
  ('Bebidas', 200),
  ('Cervezas', 201),
  ('Gin', 202),
  ('Whisky', 203),
  ('Pisco', 204),
  ('Licores', 205)
ON CONFLICT (name) DO NOTHING;

-- PASO 1: Insertar productos nuevos (los existentes se omiten via ON CONFLICT)
INSERT INTO products (code, name, category_id, format_ml, is_active)
SELECT
  v.code,
  v.name,
  c.id,
  v.format_ml,
  true
FROM (VALUES
  -- Bebidas
  ('7801620008086', 'Canada dry ginger ale zero', 'Bebidas', 350),
  ('7801620852597', 'Canada dry agua tonica 350 ml', 'Bebidas', 350),
  ('4260310556352', 'Thomas henry cherry blossom', 'Bebidas', 350),
  ('7801610350355', 'Coca zero 350ml lata', 'Bebidas', 350),
  ('7801610001196', 'Coca normal 350ml lata', 'Bebidas', 350),
  -- Cervezas
  ('INV-001', 'Alhambra verde', 'Cervezas', 330),
  -- Gin
  ('5000299618240', 'Beefeater orange', 'Gin', 750),
  ('7804665710006', 'Gin proa', 'Gin', 750),
  ('8411640000459', 'Gin mare', 'Gin', 750),
  -- Whisky
  ('INV-002', 'Chivas 25', 'Whisky', 750),
  ('INV-003', 'THE GLENROTHES', 'Whisky', 750),
  ('5000281021621', 'The singleton 12', 'Whisky', 750),
  -- Pisco
  ('7802110501056', 'Alto del carmen 35 750ml', 'Pisco', 750),
  ('7804617140011', 'Malpaso reservado 40', 'Pisco', 750),
  -- Licores
  ('4067700018243', 'Jagermeister', 'Licores', 750),
  ('8411183198217', 'Pacharan', 'Licores', 750),
  ('8001110016303', 'Amaretto disaronno', 'Licores', 750),
  ('8004160660304', 'Frangelico', 'Licores', 750),
  -- Espumantes
  ('78004660560569', 'Puntilla', 'Espumantes', 750),
  ('7809623803776', 'Indomita', 'Espumantes', 750),
  ('7804602361375', 'Vinamar 0.0', 'Espumantes', 750),
  ('7804304002875', 'Errazuriz Natur Brut', 'Espumantes', 750),
  ('7804320762043', 'Brocato brut', 'Espumantes', 750),
  ('7804449003980', 'Morande brut natur', 'Espumantes', 750),
  ('8410023016308', 'Villarnau brut', 'Espumantes', 750),
  ('8410036805807', 'Freixenet ice', 'Espumantes', 750),
  ('8410036009090', 'Freixenet cordon negro', 'Espumantes', 750),
  ('7790975198675', 'Chandon aperitiff', 'Espumantes', 750),
  ('3185370693445', 'Don Perignon 2010', 'Espumantes', 750),
  ('3185370693902', 'Don Perignon 2010 etiqueta luminosa', 'Espumantes', 750),
  ('3018334100003', 'Piper Heidsieck', 'Espumantes', 750),
  ('3185370000335', 'Moet Chandon', 'Espumantes', 750),
  ('8000368202605', 'Prosecco Riccadonna', 'Espumantes', 750),
  ('INV-005', 'Indomita brut', 'Espumantes', 750),
  ('8410428300019', 'Segura Viudas Espumante', 'Espumantes', 750),
  -- Tintos Distintos (tinto, cinsault, pais, petite syrah)
  ('8410036808419', 'Freixenet xianti', 'Tintos Distintos', 750),
  ('8410113556950', 'Tenaz cinsault', 'Tintos Distintos', 750),
  ('7804343005592', 'Bisquertt crazy rows pais', 'Tintos Distintos', 750),
  ('7804330005550', 'Bougainville petite sirah', 'Tintos Distintos', 750),
  -- Blancos Distintos (riesling, muscat)
  ('7808748900230', 'Casa marin riesling', 'Blancos Distintos', 750),
  ('7804315010630', 'TH riesling', 'Blancos Distintos', 750),
  ('7804625900188', 'Koyle don cande muscat', 'Blancos Distintos', 750),
  -- Rose
  ('7808748900469', 'Casa marin rose', 'Rosé', 750),
  ('7804613640065', 'Vivendo rose', 'Rosé', 750),
  -- Sauvignon Blanc
  ('7804613640072', 'Vivendo sauvignon blanc', 'Sauvignon Blanc', 750),
  ('815992010070', 'Matetic eq sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7804343001938', 'La joya sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7809636300644', 'Arboleda sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7804454003234', 'Casa silva cool coast sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7804620040247', 'Ritual sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7808748900186', 'Cartagena casa marin sauvignon blanc', 'Sauvignon Blanc', 750),
  ('7809623805275', 'Indomita duette sauvignon blanc', 'Sauvignon Blanc', 750),
  -- Chardonnay
  ('7804304001366', 'Aconcagua costa chardonnay', 'Chardonnay', 750),
  ('7804605830252', 'Amayna chardonnay', 'Chardonnay', 750),
  ('7804304105590', 'Arboleda chardonnay', 'Chardonnay', 750),
  ('7804315002871', 'TH chardonnay', 'Chardonnay', 750),
  ('7804454005177', 'Casa silva cool coast chardonnay', 'Chardonnay', 750),
  ('7804320411149', 'Marques de casa concha chardonnay', 'Chardonnay', 750),
  ('7804314001127', 'Viu manent chardonnay', 'Chardonnay', 750),
  ('7804449006820', 'Morande pioner chardonnay', 'Chardonnay', 750),
  -- Pinot Noir
  ('7804454004194', 'Cool coast casa silva pinot noir', 'Pinot Noir', 750),
  ('7804620040230', 'Ritual pinot noir', 'Pinot Noir', 750),
  ('659438775310', 'Berta pinot noir', 'Pinot Noir', 750),
  ('7804320117522', 'Ocio cono sur pinot noir', 'Pinot Noir', 750),
  ('7809531601723', 'Casa del bosque pinot noir', 'Pinot Noir', 750),
  ('INV-004', 'El peuco pinot noir', 'Pinot Noir', 750),
  -- Carmenere
  ('7804604060100', 'Orocoipo carmenere', 'Carmenere', 750),
  ('7808748900421', 'Cartagena casa marin carmenere', 'Carmenere', 750),
  ('7804300134327', 'San Pedro Tierras moradas Carmenere', 'Carmenere', 750),
  ('7809590500029', 'Antiyal pura fe carmenere', 'Carmenere', 750),
  ('7804350002225', 'Santa carolina carmenere', 'Carmenere', 750),
  ('7804454002459', 'Casa silva microterroir carmenere', 'Carmenere', 750),
  -- Syrah
  ('7804362000066', 'Tanagra syrah', 'Syrah', 750),
  ('7808734200258', 'Tabali vetas blancas syrah', 'Syrah', 750),
  -- Malbec
  ('7804647210715', 'Tabali talinay litico malbec', 'Malbec', 750),
  ('7809636300729', 'Caliterra tributo malbec', 'Malbec', 750),
  ('7804314910023', 'Viu manent malbec', 'Malbec', 750),
  -- Merlot
  ('7804613640447', 'Calyptra merlot', 'Merlot', 750),
  ('7804319001542', 'Amplus merlot', 'Merlot', 750),
  -- Cabernet Sauvignon
  ('7809623801475', 'Zardoz cabernet sauvignon', 'Cabernet Sauvignon', 750),
  ('7804304001687', 'Aconcagua alto cabernet sauvignon', 'Cabernet Sauvignon', 750),
  ('7804320402703', '20 barrels cabernet sauvignon', 'Cabernet Sauvignon', 750),
  ('7804449018939', 'La capilla Cabernet de Ranquil', 'Cabernet Sauvignon', 750),
  -- Blend
  ('7804338222072', 'Amalia Blend', 'Blend', 750),
  ('7809623801376', 'Indomita duette blend', 'Blend', 750),
  ('7804315010647', 'Undurraga red field blend', 'Blend', 750),
  ('7804620040308', 'Primus blend', 'Blend', 750),
  ('7804300150853', '1865 master blend', 'Blend', 750),
  ('7804449114259', 'House of morande 2018 blend', 'Blend', 750),
  ('INV-006', 'House of morande 2006 blend', 'Blend', 750)
) AS v(code, name, category_name, format_ml)
JOIN categories c ON c.name = v.category_name
ON CONFLICT (code) DO NOTHING;


-- PASO 2: Upsert inventario en bar_casa_sanz (quantity_ml = botellas × format_ml)
INSERT INTO inventory (product_id, location, quantity_ml, min_stock_ml)
SELECT
  p.id,
  'bar_casa_sanz',
  v.quantity_ml,
  0
FROM (VALUES
  -- code, quantity_ml (pre-calculado)
  ('7801620008086', 10150),   -- Canada dry ginger ale zero: 29 × 350
  ('7801620852597', 12600),   -- Canada dry agua tonica: 36 × 350
  ('4260310556352', 700),     -- Thomas henry cherry blossom: 2 × 350
  ('INV-001', 2640),          -- Alhambra verde: 8 × 330
  ('5000299618240', 450),     -- Beefeater orange: 0.6 × 750
  ('7804665710006', 675),     -- Gin proa: 0.9 × 750
  ('8411640000459', 750),     -- Gin mare: 1 × 750
  ('INV-002', 675),           -- Chivas 25: 0.9 × 750
  ('INV-003', 525),           -- THE GLENROTHES: 0.7 × 750
  ('5000281021621', 150),     -- The singleton 12: 0.2 × 750
  ('7802110501056', 1950),    -- Alto del carmen 35: 2.6 × 750
  ('7804617140011', 750),     -- Malpaso reservado 40: 1 × 750
  ('4067700018243', 750),     -- Jagermeister: 1 × 750
  ('8411183198217', 225),     -- Pacharan: 0.3 × 750
  ('8001110016303', 150),     -- Amaretto disaronno: 0.2 × 750
  ('8004160660304', 750),     -- Frangelico: 1 × 750
  ('78004660560569', 4500),   -- Puntilla: 6 × 750
  ('7809623803776', 3000),    -- Indomita: 4 × 750
  ('7804602361375', 3000),    -- Vinamar 0.0: 4 × 750
  ('7801610350355', 33600),   -- Coca zero 350ml: 96 × 350
  ('7801610001196', 6300),    -- Coca normal 350ml: 18 × 350
  ('7804304002875', 2250),    -- Errazuriz Natur Brut: 3 × 750
  ('7804320762043', 750),     -- Brocato brut: 1 × 750
  ('7804449003980', 750),     -- Morande brut natur: 1 × 750
  ('8410023016308', 750),     -- Villarnau brut: 1 × 750
  ('8410036808419', 750),     -- Freixenet xianti: 1 × 750
  ('8410036805807', 750),     -- Freixenet ice: 1 × 750
  ('8410036009090', 2250),    -- Freixenet cordon negro: 3 × 750
  ('7790975198675', 750),     -- Chandon aperitiff: 1 × 750
  ('3185370693445', 750),     -- Don Perignon 2010: 1 × 750
  ('3185370693902', 750),     -- Don Perignon 2010 luminosa: 1 × 750
  ('3018334100003', 3000),    -- Piper Heidsieck: 4 × 750
  ('3185370000335', 2250),    -- Moet Chandon: 3 × 750
  ('7808748900230', 1500),    -- Casa marin riesling: 2 × 750
  ('7808748900469', 1500),    -- Casa marin rose: 2 × 750
  ('7804613640065', 2250),    -- Vivendo rose: 3 × 750
  ('7804613640072', 2250),    -- Vivendo sauvignon blanc: 3 × 750
  ('815992010070', 750),      -- Matetic eq sauvignon blanc: 1 × 750
  ('7804343001938', 750),     -- La joya sauvignon blanc: 1 × 750
  ('7809636300644', 750),     -- Arboleda sauvignon blanc: 1 × 750
  ('8000368202605', 750),     -- Prosecco Riccadonna: 1 × 750
  ('7804454003234', 750),     -- Casa silva cool coast SB: 1 × 750
  ('7804620040247', 1500),    -- Ritual sauvignon blanc: 2 × 750
  ('7808748900186', 3000),    -- Cartagena casa marin SB: 4 × 750
  ('7809623805275', 1500),    -- Indomita duette SB: 2 × 750
  ('7804304001366', 750),     -- Aconcagua costa chardonnay: 1 × 750
  ('7804605830252', 3000),    -- Amayna chardonnay: 4 × 750
  ('7804304105590', 750),     -- Arboleda chardonnay: 1 × 750
  ('7804315002871', 2250),    -- TH chardonnay: 3 × 750
  ('7804454005177', 3000),    -- Casa silva cool coast chard: 4 × 750
  ('7804320411149', 2250),    -- Marques de casa concha chard: 3 × 750
  ('7804314001127', 750),     -- Viu manent chardonnay: 1 × 750
  ('7804454004194', 3750),    -- Cool coast casa silva PN: 5 × 750
  ('7804620040230', 1500),    -- Ritual pinot noir: 2 × 750
  ('659438775310', 1500),     -- Berta pinot noir: 2 × 750
  ('7804320117522', 2250),    -- Ocio cono sur pinot noir: 3 × 750
  ('7809531601723', 750),     -- Casa del bosque pinot noir: 1 × 750
  ('7804315010630', 1500),    -- TH riesling: 2 × 750
  ('INV-004', 1500),          -- El peuco pinot noir: 2 × 750
  ('7804449006820', 1500),    -- Morande pioner chardonnay: 2 × 750
  ('7804625900188', 3000),    -- Koyle don cande muscat: 4 × 750
  ('INV-005', 1500),          -- Indomita brut: 2 × 750
  ('7804604060100', 1500),    -- Orocoipo carmenere: 2 × 750
  ('7808748900421', 2250),    -- Cartagena casa marin carm: 3 × 750
  ('7804362000066', 750),     -- Tanagra syrah: 1 × 750
  ('8410113556950', 1500),    -- Tenaz cinsault: 2 × 750
  ('7804343005592', 3750),    -- Bisquertt crazy rows pais: 5 × 750
  ('7808734200258', 750),     -- Tabali vetas blancas syrah: 1 × 750
  ('7804647210715', 2250),    -- Tabali talinay litico malbec: 3 × 750
  ('7809636300729', 2250),    -- Caliterra tributo malbec: 3 × 750
  ('7804613640447', 750),     -- Calyptra merlot: 1 × 750
  ('7804319001542', 1500),    -- Amplus merlot: 2 × 750
  ('7809623801475', 3000),    -- Zardoz cabernet sauvignon: 4 × 750
  ('7804304001687', 750),     -- Aconcagua alto CS: 1 × 750
  ('7804320402703', 2250),    -- 20 barrels CS: 3 × 750
  ('7804300134327', 750),     -- San Pedro Tierras moradas: 1 × 750
  ('7809590500029', 2250),    -- Antiyal pura fe carmenere: 3 × 750
  ('7804350002225', 1500),    -- Santa carolina carmenere: 2 × 750
  ('7804454002459', 750),     -- Casa silva microterroir carm: 1 × 750
  ('7804314910023', 2250),    -- Viu manent malbec: 3 × 750
  ('7804330005550', 2250),    -- Bougainville petite sirah: 3 × 750
  ('7804338222072', 750),     -- Amalia Blend: 1 × 750
  ('7809623801376', 5250),    -- Indomita duette blend: 7 × 750
  ('7804315010647', 750),     -- Undurraga red field blend: 1 × 750
  ('7804449018939', 1500),    -- La capilla Cabernet de Ranquil: 2 × 750
  ('7804620040308', 750),     -- Primus blend: 1 × 750
  ('7804300150853', 750),     -- 1865 master blend: 1 × 750
  ('7804449114259', 750),     -- House of morande 2018 blend: 1 × 750
  ('INV-006', 750),           -- House of morande 2006 blend: 1 × 750
  ('8410428300019', 750)      -- Segura Viudas Espumante: 1 × 750
) AS v(code, quantity_ml)
JOIN products p ON p.code = v.code
ON CONFLICT (product_id, location)
DO UPDATE SET quantity_ml = EXCLUDED.quantity_ml,
              updated_at = NOW();
