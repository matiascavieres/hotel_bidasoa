-- Script para importar datos del inventario
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Crear categorías
INSERT INTO categories (name, sort_order) VALUES
('Pisco', 1),
('Ron', 2),
('Tequila', 3),
('Mezcal', 4),
('Whisky', 5),
('Gin', 6),
('Vodka', 7),
('Licores', 8),
('Fernet', 9),
('Cervezas', 10),
('Kombucha', 11),
('Bebida', 12),
('Vino', 13),
('Agua', 14),
('Vegetal', 15),
('Barril', 16),
('Cilindro', 17)
ON CONFLICT (name) DO NOTHING;

-- 2. Crear productos
INSERT INTO products (code, name, category_id, format_ml, sale_price, is_active) VALUES
-- Pisco
('ID01', 'Alto del carmen 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 1000, 5900, true),
('ID02', 'Alto del carmen 40° Transparente', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID03', 'Mistral 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID04', 'Mistral Cristalino 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID05', 'Mistral Nobel 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID06', 'Mistral Gran Nobel 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID07', 'Mistral Nobel Fire 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID08', 'Mistral Nobel Apple 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID09', 'Sagrado Corazon 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID10', 'Sagrado Corazon 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID11', 'Espiritu de los andes 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID12', 'Malpaso 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID13', 'Malpaso 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID14', 'Malpaso Pedro Jimenez 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID15', 'Malpaso Icono 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID16', 'Waqar 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID17', 'Tres erres 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 750, NULL, true),
('ID18', 'Cultura Pisco 38°', (SELECT id FROM categories WHERE name = 'Pisco'), 2000, NULL, true),
('ID19', 'Barsol 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 4000, NULL, true),
-- Ron
('ID20', 'Havana 3 años', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
('ID21', 'Havana 7 años', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
('ID22', 'Havana Club Seleccion de maestros', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
('ID23', 'Santa Teresa 1796', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
('ID24', 'Zacapa Ambar 12 Años', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
('ID25', 'Zacapa 23 años', (SELECT id FROM categories WHERE name = 'Ron'), 750, NULL, true),
-- Tequila
('ID26', 'Olmeca Silver', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
('ID27', 'Avion Silver', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
('ID28', 'Patron Silver', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
('ID29', '1800 Cristalino', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
('ID30', 'Don julio Blanco', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
('ID31', 'Don Julio Reposado', (SELECT id FROM categories WHERE name = 'Tequila'), 750, NULL, true),
-- Mezcal
('ID32', 'Del Bateo', (SELECT id FROM categories WHERE name = 'Mezcal'), 750, NULL, true),
('ID33', '100 Conejos', (SELECT id FROM categories WHERE name = 'Mezcal'), 750, NULL, true),
-- Whisky
('ID34', 'Chivas Regal 12', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID35', 'Chivas Regal 13 Extra', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID36', 'Chivas Regal XV', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID37', 'Chivas Regal Mizunara', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID38', 'Chivas Regal 18', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID39', 'Chivas Regal 25', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID40', 'Johnnie Walker Red Label', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID41', 'Johnnie Walker Black Label', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID42', 'Johnnie Walker Gold Label', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID43', 'Johnnie Walker Blue Label', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID44', 'Macallan 12', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID45', 'Glendfiddich 12', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID46', 'Glendfiddich 18', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID47', 'Glendfiddich 21 Gran Reserva', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID48', 'The Singleton 18', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID49', 'The Glenlivet', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID50', 'Monkey Shoulder', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID51', 'The Glenrothes 12 Años', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID52', 'Hatozaki', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID53', 'Dewars 12 Años', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID54', 'Jameson', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID55', 'Ballantine wild', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID56', 'Ballantines Finest', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID57', 'Ballantines 17 Años', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID58', 'Glenmorangie', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID59', 'Jim Beam White', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID60', 'Nomad', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID61', 'Texas TX', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID62', 'Jack Daniels N°7', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID63', 'Jack Daniels Gentleman Jack', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID64', 'Jack Daniels Single Barrel', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID65', 'Jack Daniels Fire', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID66', 'Jack Daniels Apple', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
('ID67', 'Jack Daniels Honey', (SELECT id FROM categories WHERE name = 'Whisky'), 750, NULL, true),
-- Gin
('ID68', 'Bombay', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID69', 'Bombay Bramble', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID70', 'Beefeater', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID71', 'Beefeater 24', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID72', 'Beefeater Pink', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID73', 'Tanqueray', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID74', 'Tanqueray Sevilla', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID75', 'Tanqueray Ten', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID76', 'London N°1', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID77', 'Mom', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID78', 'Hendricks', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID79', '135° Hyogo', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID80', 'Malfy Original', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID81', 'Malfy Pomelo', (SELECT id FROM categories WHERE name = 'Gin'), 750, NULL, true),
('ID82', 'Monkey 47°', (SELECT id FROM categories WHERE name = 'Gin'), 500, NULL, true),
-- Vodka
('ID83', 'Smirnoff', (SELECT id FROM categories WHERE name = 'Vodka'), 500, NULL, true),
('ID84', 'Stolichnaya', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
('ID85', 'Absolut Blue', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
('ID86', 'Absolut Elyx', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
('ID87', 'Grey Goose', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
('ID88', 'Grey Goose Pear', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
('ID89', 'Grey Goose VX', (SELECT id FROM categories WHERE name = 'Vodka'), 750, NULL, true),
-- Licores
('ID90', 'Limoncello Luxardo', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID91', 'Limoncello Villa Massa', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID92', 'Borghetti Cafe', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID93', 'Buhero Negro', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID96', 'Martini Rosso', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID97', 'Martini Extra Dry', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID98', 'Martini Ambrato', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID99', 'Cinzano Bianco', (SELECT id FROM categories WHERE name = 'Licores'), 1000, NULL, true),
('ID100', 'Punt E Mes', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID101', 'Campari', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID102', 'Aperol', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID103', 'Ramazzotti Rosato', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID104', 'Ramazzotti Violetto', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID105', 'Lillet', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID106', 'St Germain', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID107', 'Cynar', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID108', 'Cointreau', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID109', 'D.O.M Becedictine', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID110', 'Grand Marnier', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID111', 'Mitjans curacao blue', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID112', 'Mitjans Triple Sec', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID113', 'Bols Triple Sec', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
('ID114', 'Mitjans Licor de Casis', (SELECT id FROM categories WHERE name = 'Licores'), 750, NULL, true),
('ID115', 'Araucano', (SELECT id FROM categories WHERE name = 'Licores'), 900, NULL, true),
('ID116', 'Licor 43', (SELECT id FROM categories WHERE name = 'Licores'), 700, NULL, true),
-- Fernet
('ID94', 'Fernet Branca', (SELECT id FROM categories WHERE name = 'Fernet'), 750, NULL, true),
('ID95', 'Martini Fiero', (SELECT id FROM categories WHERE name = 'Fernet'), 750, NULL, true),
-- Cervezas
('ID117', 'Heineken Silver', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID118', 'Heineken 0.0', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID119', 'Heineken Lata', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID120', 'Kunstmann Torobayo', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID121', 'Kunstmann Sin Alcohol', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID122', 'Kunstmann IPA', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID123', 'Kunstmann VPL', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID124', 'Austral Lager', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID125', 'Austral Calafate', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID126', 'Mahou 5 Estrellas', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID127', 'Mahou Sin Gluten', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID128', 'Mahou 0.0 Tostada', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID129', 'Kross 5', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
('ID130', 'Kross Stout', (SELECT id FROM categories WHERE name = 'Cervezas'), 330, NULL, true),
-- Kombucha
('ID131', 'Kombuchacha Arandanos', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
('ID132', 'Kombuchacha Jengibre', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
('ID133', 'Kombuchacha Cedron', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
('ID134', 'Biloba Momentum', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
('ID135', 'Biloba Zen', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
('ID136', 'Biloba Elixir', (SELECT id FROM categories WHERE name = 'Kombucha'), 500, NULL, true),
-- Bebidas
('ID137', 'Pepsi', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID138', 'Pepsi Zero', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID139', 'Coca Cola Original', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID140', 'Coca Cola Zero', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID141', 'Coca Light', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID142', 'Sprite Zero', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID143', 'Sprite Normal', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID144', 'Canada Dry Ginger Zero 1.5L', (SELECT id FROM categories WHERE name = 'Bebida'), 1500, NULL, true),
('ID145', 'Canada Dry Ginger', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID146', 'Canada Dry Agua Tonica Zero', (SELECT id FROM categories WHERE name = 'Bebida'), 350, NULL, true),
('ID147', 'Canada Dry Agua Tonica Zero 1.5L', (SELECT id FROM categories WHERE name = 'Bebida'), 1500, NULL, true),
('ID148', 'Schweppes', (SELECT id FROM categories WHERE name = 'Bebida'), 310, NULL, true),
('ID149', 'Schweppes Zero', (SELECT id FROM categories WHERE name = 'Bebida'), 310, NULL, true),
('ID150', 'Fentimans India Tonic Water', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID151', 'Fentimans India Light', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID152', 'Fentimans Valencian Orange', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID153', 'Fentimans Lemon Rose', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID154', 'Fentimans Ginger Ale', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID155', 'Fentimans Ginger Beer', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID156', 'Thomas Tonic Water', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID157', 'Thomas Pomelo', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
('ID158', 'Thomas Ginger Beer', (SELECT id FROM categories WHERE name = 'Bebida'), 200, NULL, true),
-- Vino
('ID159', 'Espumante 0,0', (SELECT id FROM categories WHERE name = 'Vino'), 750, NULL, true),
('ID160', 'Espumante', (SELECT id FROM categories WHERE name = 'Vino'), 750, NULL, true),
-- Agua
('ID161', 'Andes Sin Gas 500ml', (SELECT id FROM categories WHERE name = 'Agua'), 500, NULL, true),
('ID162', 'Andes Sin Gas 750ml', (SELECT id FROM categories WHERE name = 'Agua'), 750, NULL, true),
('ID163', 'Andes Con Gas 500ml', (SELECT id FROM categories WHERE name = 'Agua'), 500, NULL, true),
('ID164', 'Andes Con Gas 750ml', (SELECT id FROM categories WHERE name = 'Agua'), 750, NULL, true),
('ID165', 'Perrier 750ml', (SELECT id FROM categories WHERE name = 'Agua'), 750, NULL, true),
('ID166', 'Perrier 330ml', (SELECT id FROM categories WHERE name = 'Agua'), 330, NULL, true),
-- Vegetal
('ID167', 'Almendra', (SELECT id FROM categories WHERE name = 'Vegetal'), 1000, NULL, true),
('ID168', 'Soya', (SELECT id FROM categories WHERE name = 'Vegetal'), 1000, NULL, true),
-- Barril
('ID169', 'Austral Calafate Barril', (SELECT id FROM categories WHERE name = 'Barril'), 30000, NULL, true),
('ID170', 'Alhambra Barril', (SELECT id FROM categories WHERE name = 'Barril'), 20000, NULL, true),
('ID171', 'Kunstmann Vpl Barril', (SELECT id FROM categories WHERE name = 'Barril'), 30000, NULL, true),
-- Cilindro
('ID172', 'Co2 Primas', (SELECT id FROM categories WHERE name = 'Cilindro'), NULL, NULL, true),
('ID173', 'Co2 CCU', (SELECT id FROM categories WHERE name = 'Cilindro'), NULL, NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  format_ml = EXCLUDED.format_ml,
  sale_price = EXCLUDED.sale_price;

-- 3. Crear inventario inicial para las 3 ubicaciones (con cantidad 0)
INSERT INTO inventory (product_id, location, quantity_ml, min_stock_ml)
SELECT p.id, loc.location, 0,
  CASE
    WHEN c.name IN ('Pisco', 'Ron', 'Tequila', 'Whisky', 'Gin', 'Vodka') THEN 1500
    WHEN c.name IN ('Licores', 'Fernet', 'Mezcal') THEN 750
    WHEN c.name = 'Cervezas' THEN 3300
    WHEN c.name = 'Bebida' THEN 3500
    ELSE 1000
  END
FROM products p
JOIN categories c ON p.category_id = c.id
CROSS JOIN (
  SELECT 'bodega'::text AS location
  UNION ALL SELECT 'bar_casa_sanz'
  UNION ALL SELECT 'bar_hotel_bidasoa'
) loc
ON CONFLICT (product_id, location) DO NOTHING;

-- Verificar datos importados
SELECT 'Categorias creadas:' as info, COUNT(*) as total FROM categories;
SELECT 'Productos creados:' as info, COUNT(*) as total FROM products;
SELECT 'Registros de inventario:' as info, COUNT(*) as total FROM inventory;
