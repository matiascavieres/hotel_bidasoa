-- Seed data for Hotel Bidasoa Inventory System

-- Insert categories (based on the CSV product types)
INSERT INTO categories (name, description, sort_order) VALUES
    ('Pisco', 'Piscos chilenos y peruanos', 1),
    ('Ron', 'Rones blancos, dorados y añejos', 2),
    ('Tequila', 'Tequilas blancos, reposados y añejos', 3),
    ('Mezcal', 'Mezcales artesanales', 4),
    ('Whisky', 'Whiskys escoceses, irlandeses y americanos', 5),
    ('Gin', 'Ginebras premium y craft', 6),
    ('Vodka', 'Vodkas premium', 7),
    ('Licores', 'Licores y cremas', 8),
    ('Fernet', 'Fernet y amargos', 9),
    ('Cervezas', 'Cervezas artesanales e importadas', 10),
    ('Kombucha', 'Kombuchas artesanales', 11),
    ('Bebidas', 'Bebidas sin alcohol y mixers', 12),
    ('Vinos', 'Vinos tintos, blancos y espumantes', 13),
    ('Agua', 'Aguas minerales y con gas', 14),
    ('Vegetal', 'Productos vegetales para coctelería', 15),
    ('Barril', 'Productos en barril', 16),
    ('Cilindro', 'Cilindros de gas', 17);

-- Note: Admin user should be created through Supabase Auth first,
-- then the trigger will create the profile.
-- After that, run this to make them admin:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@hotelbidasoa.cl';

-- Sample products (first few from the CSV)
-- These would typically be imported via the CSV import feature

-- Example insert (uncomment if needed):
-- INSERT INTO products (code, name, category_id, format_ml, sale_price) VALUES
--     ('ID01', 'Alto del carmen 35°', (SELECT id FROM categories WHERE name = 'Pisco'), 1000, 5900),
--     ('ID02', 'Alto del carmen 40°', (SELECT id FROM categories WHERE name = 'Pisco'), 1000, 7200);

-- Initialize empty inventory for all locations
-- This will be populated when products are added and stock is set
