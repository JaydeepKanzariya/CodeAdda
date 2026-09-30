-- Shop dataset for the SQL lab. Original data.

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  age INTEGER,
  country VARCHAR(50),
  city VARCHAR(50),
  signup_date DATE NOT NULL
);
COMMENT ON TABLE users IS 'Customers who shop in the store';

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  location VARCHAR(60)
);
COMMENT ON TABLE departments IS 'Company departments';

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  salary NUMERIC(10,2) NOT NULL,
  hire_date DATE NOT NULL
);
COMMENT ON TABLE employees IS 'Staff, with the manager each person reports to';

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);
COMMENT ON TABLE categories IS 'Product categories';

CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  contact_email VARCHAR(100)
);
COMMENT ON TABLE suppliers IS 'Companies that supply products';

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE products IS 'Products for sale, with price and stock';

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_date DATE NOT NULL,
  status VARCHAR(20)
);
COMMENT ON TABLE orders IS 'Orders: one product per order; status can be NULL';

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  review_date DATE NOT NULL
);
COMMENT ON TABLE reviews IS 'Product reviews written by customers';

INSERT INTO users (name, email, phone, age, country, city, signup_date) VALUES
  ('Aarav Mehta',  'aarav@example.com',  '555-1001', 29, 'India',   'Mumbai',  '2023-01-12'),
  ('Sofia Rossi',  'sofia@example.com',  NULL,       34, 'Italy',   'Milan',   '2023-02-03'),
  ('Liam Carter',  'liam@example.com',   '555-1003', 41, 'USA',     'Denver',  '2023-02-18'),
  ('Mei Tanaka',   'mei@example.com',    '555-1004', 26, 'Japan',   'Osaka',   '2023-03-07'),
  ('Noah Fischer', 'noah@example.com',   NULL,       38, 'Germany', 'Berlin',  '2023-03-22'),
  ('Priya Nair',   'priya@example.com',  '555-1006', 31, 'India',   'Kochi',   '2023-04-09'),
  ('Ethan Brooks', 'ethan@example.com',  '555-1007', 45, 'USA',     'Austin',  '2023-04-30'),
  ('Chloe Martin', 'chloe@example.com',  '555-1008', 23, 'France',  'Lyon',    '2023-05-14'),
  ('Lucas Silva',  'lucas@example.com',  NULL,       36, 'Brazil',  'Recife',  '2023-06-01'),
  ('Hana Kim',     'hana@example.com',   '555-1010', 28, 'Japan',   'Tokyo',   '2023-06-19'),
  ('Omar Haddad',  'omar@example.com',   '555-1011', 52, 'UAE',     'Dubai',   '2023-07-08'),
  ('Isla Murphy',  'isla@example.com',   '555-1012', 33, 'Ireland', 'Cork',    '2023-08-15'),
  ('Rohan Gupta',  'rohan@example.com',  NULL,       27, 'India',   'Pune',    '2023-09-02'),
  ('Ava Thompson', 'ava@example.com',    '555-1014', 39, 'USA',     'Seattle', '2023-10-21'),
  ('Mateo Lopez',  'mateo@example.com',  '555-1015', 30, 'Spain',   'Seville', '2023-11-11');

INSERT INTO departments (name, location) VALUES
  ('Engineering', 'Bengaluru'),
  ('Sales',       'Mumbai'),
  ('Marketing',   'Delhi'),
  ('Support',     'Pune'),
  ('Finance',     'Mumbai'),
  ('Research',    'Hyderabad');

INSERT INTO employees (name, email, department_id, manager_id, salary, hire_date) VALUES
  ('Kavya Rao',    'kavya@shop.dev',  1,    NULL, 150000.00, '2019-04-01'),
  ('Arjun Das',    'arjun@shop.dev',  2,    NULL, 120000.00, '2020-01-15'),
  ('Neha Iyer',    'neha@shop.dev',   1,    1,     98000.00, '2021-06-10'),
  ('Vikram Singh', 'vikram@shop.dev', 1,    1,     91000.00, '2022-02-01'),
  ('Sara Khan',    'sara@shop.dev',   2,    2,     72000.00, '2021-09-20'),
  ('Dev Patel',    'dev@shop.dev',    3,    NULL,  88000.00, '2020-11-05'),
  ('Meera Joshi',  'meera@shop.dev',  4,    2,     54000.00, '2023-03-13'),
  ('Kabir Shah',   'kabir@shop.dev',  4,    7,     48000.00, '2023-08-01'),
  ('Tara Menon',   'tara@shop.dev',   5,    NULL, 105000.00, '2019-12-02'),
  ('Ishaan Bose',  'ishaan@shop.dev', NULL, 1,     60000.00, '2024-01-08');

INSERT INTO categories (name, description) VALUES
  ('Electronics',    'Gadgets and devices'),
  ('Books',          'Printed and hardcover books'),
  ('Home & Kitchen', 'Cookware and home goods'),
  ('Sports',         'Gear for staying active'),
  ('Toys',           'Games and toys for all ages'),
  ('Garden',         'Plants, tools and outdoor living');

INSERT INTO suppliers (name, country, contact_email) VALUES
  ('Nimbus Traders', 'India',   'sales@nimbus.example'),
  ('Northwind Goods', 'USA',    'hello@northwind.example'),
  ('Sakura Supply',  'Japan',   'info@sakura.example'),
  ('Rhein Handel',   'Germany', 'kontakt@rhein.example'),
  ('Andes Imports',  'Chile',   NULL);

INSERT INTO products (name, description, category_id, supplier_id, price, stock) VALUES
  ('Wireless Earbuds',    'Bluetooth 5.3 earbuds',   1, 3,  59.99, 120),
  ('Mechanical Keyboard', 'Hot-swappable switches',  1, 3,  89.50,  45),
  ('USB-C Hub',           NULL,                      1, 2,  34.00, 200),
  ('4K Monitor',          '27-inch IPS display',     1, 2, 329.00,  15),
  ('Smart Watch',         NULL,                      1, 1, 149.00,   0),
  ('The Pragmatic Coder', 'Paperback',               2, 2,  39.95,  60),
  ('Data at Scale',       'Hardcover',               2, 2,  54.00,  25),
  ('SQL in Practice',     NULL,                      2, 1,  29.00,  80),
  ('Chef''s Knife',       'Stainless steel, 8-inch', 3, 4,  45.00,  35),
  ('Cast Iron Pan',       NULL,                      3, 4,  38.50,  50),
  ('French Press',        '1 litre',                 3, 4,  24.99,   0),
  ('Yoga Mat',            'Non-slip, 6mm',           4, 1,  22.00, 150),
  ('Running Shoes',       NULL,                      4, 5,  95.00,  40),
  ('Tennis Racket',       'Graphite frame',          4, 5, 120.00,  12),
  ('Football',            NULL,                      4, 1,  18.00,  90),
  ('Building Blocks Set', '500 pieces',              5, 3,  49.99,  30),
  ('Puzzle 1000',         NULL,                      5, 2,  15.50,  70),
  ('Board Game Night',    'For 2 to 6 players',      5, 2,  34.99,  22),
  ('Desk Lamp',           'LED, dimmable',           3, 1,  27.00,  65),
  ('Portable Speaker',    NULL,                      1, 3,  79.00,   8);

INSERT INTO orders (user_id, product_id, quantity, order_date, status) VALUES
  (1,  1,  2, '2024-01-05', 'delivered'),
  (1,  6,  1, '2024-01-05', 'delivered'),
  (2,  2,  1, '2024-01-09', 'delivered'),
  (3,  4,  1, '2024-01-14', 'shipped'),
  (4,  12, 3, '2024-01-20', 'delivered'),
  (5,  9,  1, '2024-01-22', 'delivered'),
  (6,  8,  2, '2024-02-02', 'delivered'),
  (7,  13, 1, '2024-02-06', 'shipped'),
  (8,  16, 1, '2024-02-11', 'pending'),
  (9,  3,  4, '2024-02-15', 'delivered'),
  (10, 1,  1, '2024-02-20', NULL),
  (11, 4,  2, '2024-02-25', 'delivered'),
  (13, 15, 2, '2024-03-01', 'pending'),
  (14, 7,  1, '2024-03-04', 'shipped'),
  (3,  19, 2, '2024-03-09', 'delivered'),
  (1,  20, 1, '2024-03-12', 'pending'),
  (6,  6,  1, '2024-03-18', 'delivered'),
  (2,  10, 1, '2024-03-21', NULL),
  (4,  18, 1, '2024-03-27', 'shipped'),
  (7,  2,  2, '2024-04-02', 'delivered'),
  (9,  12, 1, '2024-04-06', 'pending'),
  (10, 16, 2, '2024-04-10', 'delivered'),
  (11, 13, 1, '2024-04-15', 'shipped'),
  (13, 8,  3, '2024-04-19', 'delivered'),
  (14, 1,  1, '2024-04-23', 'delivered');

INSERT INTO reviews (product_id, user_id, rating, comment, review_date) VALUES
  (1,  1,  5, 'Great sound for the price',    '2024-01-15'),
  (2,  2,  4, 'Clicky and solid',             '2024-01-20'),
  (4,  3,  5, 'Crisp picture',                '2024-01-25'),
  (12, 4,  4, NULL,                           '2024-01-30'),
  (9,  5,  5, 'Very sharp',                   '2024-02-01'),
  (8,  6,  3, 'Good examples, dry in places', '2024-02-12'),
  (13, 7,  4, 'Comfortable on long runs',     '2024-02-18'),
  (16, 8,  5, 'Kids love it',                 '2024-02-25'),
  (1,  10, 3, 'Battery could be better',      '2024-03-01'),
  (4,  11, 4, NULL,                           '2024-03-06'),
  (7,  14, 5, 'A must-read for engineers',    '2024-03-14'),
  (2,  7,  2, 'Too loud for the office',      '2024-04-10');

-- Column and relationship descriptions shown in the schema viewer.
COMMENT ON COLUMN users.id IS 'Unique customer id (primary key)';
COMMENT ON COLUMN users.name IS 'Full name';
COMMENT ON COLUMN users.email IS 'Email address, unique per customer';
COMMENT ON COLUMN users.phone IS 'Phone number, NULL when not given';
COMMENT ON COLUMN users.age IS 'Age in years, NULL when not given';
COMMENT ON COLUMN users.country IS 'Country the customer lives in';
COMMENT ON COLUMN users.city IS 'City the customer lives in';
COMMENT ON COLUMN users.signup_date IS 'Day the account was created';
COMMENT ON COLUMN departments.id IS 'Unique department id (primary key)';
COMMENT ON COLUMN departments.name IS 'Department name';
COMMENT ON COLUMN departments.location IS 'Office the department works from';
COMMENT ON COLUMN employees.id IS 'Unique employee id (primary key)';
COMMENT ON COLUMN employees.name IS 'Full name';
COMMENT ON COLUMN employees.email IS 'Work email, unique per employee';
COMMENT ON COLUMN employees.department_id IS 'Department the employee belongs to';
COMMENT ON COLUMN employees.manager_id IS 'Employee this person reports to, NULL for top managers';
COMMENT ON COLUMN employees.salary IS 'Yearly salary';
COMMENT ON COLUMN employees.hire_date IS 'First day at the company';
COMMENT ON COLUMN categories.id IS 'Unique category id (primary key)';
COMMENT ON COLUMN categories.name IS 'Category name, unique';
COMMENT ON COLUMN categories.description IS 'What the category contains';
COMMENT ON COLUMN suppliers.id IS 'Unique supplier id (primary key)';
COMMENT ON COLUMN suppliers.name IS 'Company name';
COMMENT ON COLUMN suppliers.country IS 'Country the supplier is based in';
COMMENT ON COLUMN suppliers.contact_email IS 'Email for orders and questions';
COMMENT ON COLUMN products.id IS 'Unique product id (primary key)';
COMMENT ON COLUMN products.name IS 'Product name';
COMMENT ON COLUMN products.description IS 'Short product description';
COMMENT ON COLUMN products.category_id IS 'Category the product is listed in';
COMMENT ON COLUMN products.supplier_id IS 'Supplier the product comes from';
COMMENT ON COLUMN products.price IS 'Price per unit, never negative';
COMMENT ON COLUMN products.stock IS 'Units in the warehouse';
COMMENT ON COLUMN orders.id IS 'Unique order id (primary key)';
COMMENT ON COLUMN orders.user_id IS 'Customer who placed the order';
COMMENT ON COLUMN orders.product_id IS 'Product that was ordered';
COMMENT ON COLUMN orders.quantity IS 'Units ordered, at least 1';
COMMENT ON COLUMN orders.order_date IS 'Day the order was placed';
COMMENT ON COLUMN orders.status IS 'Order status, NULL when unknown';
COMMENT ON COLUMN reviews.id IS 'Unique review id (primary key)';
COMMENT ON COLUMN reviews.product_id IS 'Product being reviewed';
COMMENT ON COLUMN reviews.user_id IS 'Customer who wrote the review';
COMMENT ON COLUMN reviews.rating IS 'Stars, from 1 to 5';
COMMENT ON COLUMN reviews.comment IS 'Review text, may be NULL';
COMMENT ON COLUMN reviews.review_date IS 'Day the review was written';

COMMENT ON CONSTRAINT employees_department_id_fkey ON employees IS 'Each employee works in one department';
COMMENT ON CONSTRAINT employees_manager_id_fkey ON employees IS 'Each employee may report to a manager, who is also an employee';
COMMENT ON CONSTRAINT products_category_id_fkey ON products IS 'Each product belongs to one category';
COMMENT ON CONSTRAINT products_supplier_id_fkey ON products IS 'Each product comes from one supplier';
COMMENT ON CONSTRAINT orders_user_id_fkey ON orders IS 'Each order is placed by one customer';
COMMENT ON CONSTRAINT orders_product_id_fkey ON orders IS 'Each order is for one product';
COMMENT ON CONSTRAINT reviews_product_id_fkey ON reviews IS 'Each review is about one product';
COMMENT ON CONSTRAINT reviews_user_id_fkey ON reviews IS 'Each review is written by one customer';
