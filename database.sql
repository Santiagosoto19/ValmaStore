-- ============================================
-- BASE DE DATOS VALMA - TIENDA DE MAQUILLAJE
-- ============================================

-- Crear la base de datos (ejecutar esto primero como superusuario)
-- CREATE DATABASE valma_db;

-- Conectar a la base de datos: \c valma_db;

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla de Marcas
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tipos de Producto (Categorías)
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    product_type_id INTEGER REFERENCES product_types(id) ON DELETE SET NULL,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Carritos
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Items del Carrito
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cart_id INTEGER REFERENCES carts(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    notes TEXT,
    whatsapp_link TEXT,
    whatsapp_message TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Items del Pedido (historial)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    brand_name VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Historial de Estados de Pedidos
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ============================================
-- DATOS INICIALES (SEED)
-- ============================================

-- Insertar marcas de maquillaje
INSERT INTO brands (name, description) VALUES
('Maybelline', 'Marca líder en maquillaje accesible y de calidad'),
('L\'Oréal Paris', 'Maquillaje profesional con tecnología de vanguardia'),
('MAC Cosmetics', 'Maquillaje profesional para artistas y consumidores'),
('NYX Professional Makeup', 'Maquillaje profesional a precios accesibles'),
('Revlon', 'Marca icónica de belleza desde 1932'),
('Covergirl', 'Maquillaje accesible y de tendencia'),
('Rimmel London', 'Maquillaje británico con estilo urbano'),
('Wet n Wild', 'Maquillaje cruelty-free y accesible'),
('e.l.f. Cosmetics', 'Maquillaje vegano y cruelty-free'),
('Physicians Formula', 'Maquillaje hipoalergénico para pieles sensibles')
ON CONFLICT (name) DO NOTHING;

-- Insertar tipos de producto
INSERT INTO product_types (name, description, icon) VALUES
('Base de Maquillaje', 'Productos para uniformizar el tono de la piel', 'foundation'),
('Corrector', 'Productos para cubrir imperfecciones y ojeras', 'concealer'),
('Polvo', 'Polvos compactos y sueltos para fijar el maquillaje', 'powder'),
('Rubor', 'Productos para dar color a las mejillas', 'blush'),
('Iluminador', 'Productos para resaltar puntos del rostro', 'highlighter'),
('Contorno', 'Productos para esculpir y definir el rostro', 'contour'),
('Sombra de Ojos', 'Paletas y sombras individuales para ojos', 'eyeshadow'),
('Delineador', 'Delineadores líquidos, en gel o lápiz', 'eyeliner'),
('Máscara de Pestañas', 'Productos para realzar las pestañas', 'mascara'),
('Labial', 'Labiales líquidos, en barra y gloss', 'lipstick'),
('Primer', 'Preparadores de piel para maquillaje', 'primer'),
('Fijador', 'Sprays y productos para fijar el maquillaje', 'setting-spray'),
('Brochas y Esponjas', 'Herramientas de aplicación', 'brushes'),
('Desmaquillante', 'Productos para remover el maquillaje', 'remover')
ON CONFLICT (name) DO NOTHING;

-- Insertar usuario administrador (contraseña: admin123)
-- La contraseña está hasheada con bcrypt (10 rounds)
INSERT INTO users (first_name, last_name, email, password, phone, role) VALUES
('Administrador', 'Valma', 'admin@valma.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '3001234567', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar el timestamp de actualización
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON product_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar número de orden único
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR(50);
    date_part VARCHAR(20);
BEGIN
    date_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD');
    new_number := 'ORD-' || date_part || '-' || LPAD(NEXTVAL('orders_id_seq')::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de productos con información completa
CREATE OR REPLACE VIEW product_details AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.image_url,
    p.is_active,
    p.featured,
    p.created_at,
    b.id as brand_id,
    b.name as brand_name,
    pt.id as type_id,
    pt.name as type_name,
    pt.icon as type_icon
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_types pt ON p.product_type_id = pt.id;

-- Vista de pedidos con información del usuario
CREATE OR REPLACE VIEW order_details AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.shipping_address,
    o.shipping_city,
    o.shipping_phone,
    o.notes,
    o.whatsapp_link,
    o.whatsapp_message,
    o.paid_at,
    o.created_at,
    u.id as user_id,
    u.first_name || ' ' || u.last_name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone
FROM orders o
LEFT JOIN users u ON o.user_id = u.id;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE brands IS 'Marcas de maquillaje disponibles en la tienda';
COMMENT ON TABLE product_types IS 'Categorías de productos de maquillaje';
COMMENT ON TABLE users IS 'Usuarios registrados (clientes y administradores)';
COMMENT ON TABLE products IS 'Catálogo de productos de maquillaje';
COMMENT ON TABLE carts IS 'Carritos de compra activos o convertidos';
COMMENT ON TABLE cart_items IS 'Items dentro de cada carrito';
COMMENT ON TABLE orders IS 'Pedidos realizados por los clientes';
COMMENT ON TABLE order_items IS 'Items incluidos en cada pedido (snapshot)';

-- Mensaje de confirmación
SELECT 'Base de datos VALMA creada exitosamente!' as status;
