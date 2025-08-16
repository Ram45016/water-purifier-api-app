-- Drop if exists (dev-friendly)
DROP TABLE IF EXISTS enquiries;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS admins;

CREATE TABLE categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT,
  sku TEXT,
  category_slug TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  price NUMERIC(12,2) NOT NULL,
  mrp NUMERIC(12,2),
  rating NUMERIC(3,2),
  reviews INTEGER,
  badge TEXT,
  thumbnail TEXT,
  tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_url TEXT,
  image TEXT,
  valid_till DATE
);

CREATE TABLE testimonials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  location TEXT,
  date DATE
);

CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  q TEXT NOT NULL,
  a TEXT NOT NULL
);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_slug);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating);