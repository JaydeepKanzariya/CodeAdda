-- Food delivery dataset for PostgreSQL Lab
-- Fixed March 2026 timestamps without time zone

CREATE TABLE customers (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  email     text NOT NULL UNIQUE,
  city      text NOT NULL,
  joined_on date NOT NULL
);
COMMENT ON TABLE customers IS 'People who order food through the app';

CREATE TABLE restaurants (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  city          text NOT NULL,
  cuisine       text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  opening_hours jsonb NOT NULL,
  rating        numeric(2,1) CHECK (rating BETWEEN 0 AND 5)
);
COMMENT ON TABLE restaurants IS 'Restaurants listed in the app; opening_hours maps day keys (mon…sun) to {"open","close"}';

CREATE TABLE menu_items (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id integer NOT NULL REFERENCES restaurants(id),
  name          text NOT NULL,
  price         numeric(8,2) NOT NULL CHECK (price > 0),
  tags          text[] NOT NULL DEFAULT '{}',
  available     boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE menu_items IS 'Dishes each restaurant sells; tags like veg, spicy, bestseller';

CREATE TABLE riders (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL,
  vehicle   text NOT NULL,
  joined_on date NOT NULL
);
COMMENT ON TABLE riders IS 'Delivery riders';

CREATE TABLE orders (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id   integer NOT NULL REFERENCES customers(id),
  restaurant_id integer NOT NULL REFERENCES restaurants(id),
  rider_id      integer REFERENCES riders(id),
  status        text NOT NULL CHECK (status IN ('placed', 'delivered', 'cancelled')),
  placed_at     timestamp NOT NULL,
  total         numeric(8,2) NOT NULL CHECK (total >= 0),
  details       jsonb NOT NULL
);
COMMENT ON TABLE orders IS 'One row per order; details holds address, payment and notes as JSONB';

CREATE TABLE order_items (
  order_id     integer NOT NULL REFERENCES orders(id),
  menu_item_id integer NOT NULL REFERENCES menu_items(id),
  quantity     integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, menu_item_id)
);
COMMENT ON TABLE order_items IS 'Which dishes are in each order (many-to-many)';

CREATE TABLE reviews (
  id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id integer NOT NULL UNIQUE REFERENCES orders(id),
  rating   integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body     text NOT NULL
);
COMMENT ON TABLE reviews IS 'At most one review per order';

-- 15 customers
INSERT INTO customers (name, email, city, joined_on) VALUES
  ('Aarav Sharma', 'aarav@example.com', 'Mumbai', '2025-01-10'),
  ('Diya Patel', 'diya@example.com', 'Mumbai', '2025-02-14'),
  ('Rohan Mehta', 'rohan@example.com', 'Mumbai', '2025-03-01'),
  ('Ananya Iyer', 'ananya@example.com', 'Bengaluru', '2025-03-15'),
  ('Vikram Rao', 'vikram@example.com', 'Bengaluru', '2025-04-02'),
  ('Neha Joshi', 'neha@example.com', 'Pune', '2025-05-11'),
  ('Kabir Khan', 'kabir@example.com', 'Delhi', '2025-06-20'),
  ('Pooja Nair', 'pooja@example.com', 'Bengaluru', '2025-07-04'),
  ('Siddharth Sen', 'sid@example.com', 'Delhi', '2025-08-18'),
  ('Zara Ali', 'zara@example.com', 'Mumbai', '2025-09-09'),
  ('Aditya Deshmukh', 'aditya@example.com', 'Pune', '2025-10-12'),
  ('Meera Kulkarni', 'meera@example.com', 'Pune', '2025-11-05'),
  ('Liam Wilson', 'liam@example.com', 'Delhi', '2025-11-25'),
  ('Elena Rostova', 'elena@example.com', 'Mumbai', '2025-12-01'),
  ('Kenji Sato', 'kenji@example.com', 'Bengaluru', '2025-12-15');

-- 8 restaurants
INSERT INTO restaurants (name, city, cuisine, tags, opening_hours, rating) VALUES
  ('Spice Route', 'Mumbai', 'Indian', '{"curry","spicy"}', '{"mon": {"open": "11:00", "close": "23:00"}, "tue": {"open": "11:00", "close": "23:00"}, "wed": {"open": "11:00", "close": "23:00"}, "thu": {"open": "11:00", "close": "23:00"}, "fri": {"open": "11:00", "close": "23:30"}, "sat": {"open": "11:00", "close": "23:30"}, "sun": {"open": "12:00", "close": "22:30"}}', 4.8),
  ('Pizza Bella', 'Mumbai', 'Italian', '{"pizza","cheese"}', '{"mon": {"open": "12:00", "close": "23:00"}, "tue": {"open": "12:00", "close": "23:00"}, "wed": {"open": "12:00", "close": "23:00"}, "thu": {"open": "12:00", "close": "23:00"}, "fri": {"open": "12:00", "close": "00:00"}, "sat": {"open": "12:00", "close": "00:00"}, "sun": {"open": "12:00", "close": "23:00"}}', 4.5),
  ('Tokyo Ramen', 'Bengaluru', 'Japanese', '{"noodles","asian"}', '{"mon": {"open": "11:30", "close": "22:00"}, "tue": {"open": "11:30", "close": "22:00"}, "wed": {"open": "11:30", "close": "22:00"}, "thu": {"open": "11:30", "close": "22:00"}, "fri": {"open": "11:30", "close": "23:00"}, "sat": {"open": "11:30", "close": "23:00"}, "sun": {"open": "12:00", "close": "22:00"}}', 4.7),
  ('Green Bowl', 'Bengaluru', 'Healthy', '{"vegan","organic"}', '{"mon": {"open": "09:00", "close": "21:00"}, "tue": {"open": "09:00", "close": "21:00"}, "wed": {"open": "09:00", "close": "21:00"}, "thu": {"open": "09:00", "close": "21:00"}, "fri": {"open": "09:00", "close": "21:00"}, "sat": {"open": "10:00", "close": "20:00"}}', 4.3),
  ('Taco Fiesta', 'Pune', 'Mexican', '{"tacos","fast-food"}', '{"mon": {"open": "12:00", "close": "22:30"}, "tue": {"open": "12:00", "close": "22:30"}, "wed": {"open": "12:00", "close": "22:30"}, "thu": {"open": "12:00", "close": "22:30"}, "fri": {"open": "12:00", "close": "23:30"}, "sat": {"open": "12:00", "close": "23:30"}, "sun": {"open": "12:00", "close": "22:30"}}', 4.2),
  ('Dragon Wok', 'Delhi', 'Chinese', '{"chinese","spicy"}', '{"mon": {"open": "11:30", "close": "23:00"}, "tue": {"open": "11:30", "close": "23:00"}, "wed": {"open": "11:30", "close": "23:00"}, "thu": {"open": "11:30", "close": "23:00"}, "fri": {"open": "11:30", "close": "23:30"}, "sat": {"open": "11:30", "close": "23:30"}, "sun": {"open": "12:00", "close": "23:00"}}', 4.6),
  ('Burger Barn', 'Delhi', 'American', '{"burgers","late-night"}', '{"mon": {"open": "11:00", "close": "02:00"}, "tue": {"open": "11:00", "close": "02:00"}, "wed": {"open": "11:00", "close": "02:00"}, "thu": {"open": "11:00", "close": "02:00"}, "fri": {"open": "11:00", "close": "03:00"}, "sat": {"open": "11:00", "close": "03:00"}, "sun": {"open": "11:00", "close": "02:00"}}', 4.1),
  ('Dosa Corner', 'Pune', 'South Indian', '{"breakfast","budget"}', '{"mon": {"open": "07:00", "close": "22:00"}, "tue": {"open": "07:00", "close": "22:00"}, "wed": {"open": "07:00", "close": "22:00"}, "thu": {"open": "07:00", "close": "22:00"}, "fri": {"open": "07:00", "close": "22:00"}, "sat": {"open": "07:00", "close": "22:30"}, "sun": {"open": "07:00", "close": "22:30"}}', 4.9);

-- 30 menu items
INSERT INTO menu_items (restaurant_id, name, price, tags, available) VALUES
  (1, 'Butter Chicken', 340.00, '{"non-veg","bestseller"}', true),
  (1, 'Paneer Tikka Masala', 280.00, '{"veg","spicy","bestseller"}', true),
  (1, 'Garlic Naan', 60.00, '{"veg"}', true),
  (1, 'Dal Makhani', 280.00, '{"veg"}', false),
  (2, 'Margherita Pizza', 290.00, '{"veg","bestseller"}', true),
  (2, 'Pepperoni Feast', 420.00, '{"non-veg"}', true),
  (2, 'Quattro Formaggi', 460.00, '{"veg"}', true),
  (2, 'Tiramisu', 190.00, '{"veg"}', true),
  (3, 'Tonkotsu Ramen', 450.00, '{"non-veg","bestseller"}', true),
  (3, 'Spicy Miso Ramen', 420.00, '{"non-veg","spicy"}', true),
  (3, 'Veg Shoyu Ramen', 380.00, '{"veg"}', true),
  (3, 'Gyoza Dumplings', 240.00, '{"non-veg"}', true),
  (4, 'Avocado Super Bowl', 360.00, '{"veg","bestseller"}', true),
  (4, 'Quinoa Crunch Salad', 310.00, '{"veg"}', true),
  (4, 'Berry Smoothie', 180.00, '{"veg"}', false),
  (5, 'Crispy Chicken Taco', 250.00, '{"non-veg","spicy"}', true),
  (5, 'Black Bean Burrito', 280.00, '{"veg"}', true),
  (5, 'Loaded Nachos', 320.00, '{"veg","bestseller"}', true),
  (5, 'Churros with Chocolate', 160.00, '{"veg"}', true),
  (6, 'Kung Pao Chicken', 360.00, '{"non-veg","spicy","bestseller"}', true),
  (6, 'Veg Hakka Noodles', 220.00, '{"veg"}', true),
  (6, 'Chilli Paneer Gravy', 290.00, '{"veg","spicy"}', true),
  (6, 'Steamed Dim Sum', 260.00, '{"non-veg"}', true),
  (7, 'Classic Smash Cheeseburger', 320.00, '{"non-veg","bestseller"}', true),
  (7, 'Spicy Crispy Chicken Burger', 340.00, '{"non-veg","spicy"}', true),
  (7, 'Truffle Parmesan Fries', 180.00, '{"veg"}', true),
  (7, 'Vanilla Milkshake', 160.00, '{"veg"}', true),
  (8, 'Masala Dosa', 120.00, '{"veg","spicy","bestseller"}', true),
  (8, 'Idli Vada Combo', 90.00, '{"veg"}', true),
  (8, 'Filter Coffee', 60.00, '{"veg"}', true);

-- 5 riders
INSERT INTO riders (name, vehicle, joined_on) VALUES
  ('Rajesh Kumar', 'bike', '2025-02-01'),
  ('Sunil Verma', 'scooter', '2025-03-10'),
  ('Amit Shinde', 'bike', '2025-05-15'),
  ('Praveen Yadav', 'cycle', '2025-07-20'),
  ('Deepak Rawat', 'scooter', '2025-09-01');

-- 40 orders
-- Dates: 2026-03-02 through 2026-03-22 with NO orders on 2026-03-09 and 2026-03-16
-- Cancelled: 4 orders (ids 4, 12, 22, 34) with rider_id NULL
-- Placed: 2 orders (ids 39, 40) with rider_id NULL
-- Delivered: 34 orders with rider_id in 1..5
-- Payment methods: upi, card, cash
INSERT INTO orders (customer_id, restaurant_id, rider_id, status, placed_at, total, details) VALUES
  (1, 1, 1, 'delivered', '2026-03-02 12:15:00', 400.00, '{"payment": {"method": "upi"}, "address": {"area": "Bandra", "pincode": "400050"}, "notes": "Ring the bell"}'),
  (2, 2, 2, 'delivered', '2026-03-02 19:30:00', 480.00, '{"payment": {"method": "card"}, "address": {"area": "Colaba", "pincode": "400005"}}'),
  (3, 1, 3, 'delivered', '2026-03-03 13:00:00', 620.00, '{"payment": {"method": "upi"}, "address": {"area": "Andheri", "pincode": "400058"}, "notes": "Leave at front door"}'),
  (4, 3, NULL, 'cancelled', '2026-03-03 20:00:00', 450.00, '{"payment": {"method": "card"}, "address": {"area": "Indiranagar", "pincode": "560038"}}'),
  (5, 4, 4, 'delivered', '2026-03-04 12:45:00', 720.00, '{"payment": {"method": "upi"}, "address": {"area": "Koramangala", "pincode": "560034"}}'),
  (6, 5, 5, 'delivered', '2026-03-04 19:15:00', 730.00, '{"payment": {"method": "cash"}, "address": {"area": "Kothrud", "pincode": "411038"}, "notes": "Call upon arrival"}'),
  (7, 6, 1, 'delivered', '2026-03-05 13:20:00', 1130.00, '{"payment": {"method": "upi"}, "address": {"area": "Connaught Place", "pincode": "110001"}}'),
  (8, 7, 2, 'delivered', '2026-03-05 21:00:00', 660.00, '{"payment": {"method": "card"}, "address": {"area": "Hauz Khas", "pincode": "110016"}}'),
  (9, 8, 3, 'delivered', '2026-03-06 09:30:00', 270.00, '{"payment": {"method": "upi"}, "address": {"area": "Viman Nagar", "pincode": "411014"}}'),
  (10, 2, 4, 'delivered', '2026-03-06 20:10:00', 420.00, '{"payment": {"method": "card"}, "address": {"area": "Juhu", "pincode": "400049"}}'),
  (11, 3, 5, 'delivered', '2026-03-07 14:00:00', 660.00, '{"payment": {"method": "upi"}, "address": {"area": "Whitefield", "pincode": "560066"}, "notes": "Gate code 1234"}'),
  (12, 5, NULL, 'cancelled', '2026-03-07 20:30:00', 280.00, '{"payment": {"method": "cash"}, "address": {"area": "Baner", "pincode": "411045"}}'),
  (13, 1, 1, 'delivered', '2026-03-08 13:10:00', 280.00, '{"payment": {"method": "upi"}, "address": {"area": "Bandra", "pincode": "400050"}}'),
  (14, 6, 2, 'delivered', '2026-03-08 19:40:00', 510.00, '{"payment": {"method": "card"}, "address": {"area": "Saket", "pincode": "110017"}}'),
  (15, 8, 3, 'delivered', '2026-03-10 09:15:00', 300.00, '{"payment": {"method": "upi"}, "address": {"area": "Shivaji Nagar", "pincode": "411005"}}'),
  (1, 7, 4, 'delivered', '2026-03-10 22:00:00', 500.00, '{"payment": {"method": "cash"}, "address": {"area": "Dwarka", "pincode": "110075"}, "notes": "Leave with security"}'),
  (2, 4, 5, 'delivered', '2026-03-11 12:30:00', 670.00, '{"payment": {"method": "upi"}, "address": {"area": "HSR Layout", "pincode": "560102"}}'),
  (3, 2, 1, 'delivered', '2026-03-11 20:45:00', 1360.00, '{"payment": {"method": "card"}, "address": {"area": "Dadar", "pincode": "400014"}}'),
  (4, 3, 2, 'delivered', '2026-03-12 13:30:00', 380.00, '{"payment": {"method": "upi"}, "address": {"area": "Indiranagar", "pincode": "560038"}}'),
  (5, 1, 3, 'delivered', '2026-03-12 19:15:00', 740.00, '{"payment": {"method": "card"}, "address": {"area": "Powai", "pincode": "400076"}}'),
  (6, 5, 4, 'delivered', '2026-03-13 14:10:00', 660.00, '{"payment": {"method": "upi"}, "address": {"area": "Koregaon Park", "pincode": "411001"}}'),
  (7, 6, NULL, 'cancelled', '2026-03-13 21:00:00', 260.00, '{"payment": {"method": "upi"}, "address": {"area": "Karol Bagh", "pincode": "110005"}}'),
  (8, 7, 5, 'delivered', '2026-03-14 13:00:00', 340.00, '{"payment": {"method": "cash"}, "address": {"area": "Rohini", "pincode": "110085"}}'),
  (9, 8, 1, 'delivered', '2026-03-14 18:45:00', 240.00, '{"payment": {"method": "upi"}, "address": {"area": "Kothrud", "pincode": "411038"}}'),
  (10, 2, 2, 'delivered', '2026-03-15 12:15:00', 480.00, '{"payment": {"method": "card"}, "address": {"area": "Bandra", "pincode": "400050"}}'),
  (11, 3, 3, 'delivered', '2026-03-15 20:00:00', 1490.00, '{"payment": {"method": "upi"}, "address": {"area": "Koramangala", "pincode": "560034"}, "notes": "Do not ring bell"}'),
  (12, 4, 4, 'delivered', '2026-03-17 12:50:00', 490.00, '{"payment": {"method": "upi"}, "address": {"area": "Indiranagar", "pincode": "560038"}}'),
  (13, 5, 5, 'delivered', '2026-03-17 19:30:00', 320.00, '{"payment": {"method": "card"}, "address": {"area": "Viman Nagar", "pincode": "411014"}}'),
  (14, 6, 1, 'delivered', '2026-03-18 13:15:00', 910.00, '{"payment": {"method": "upi"}, "address": {"area": "Connaught Place", "pincode": "110001"}}'),
  (15, 1, 2, 'delivered', '2026-03-18 20:20:00', 340.00, '{"payment": {"method": "cash"}, "address": {"area": "Andheri", "pincode": "400058"}}'),
  (1, 7, 3, 'delivered', '2026-03-19 14:00:00', 1000.00, '{"payment": {"method": "card"}, "address": {"area": "Hauz Khas", "pincode": "110016"}}'),
  (2, 8, 4, 'delivered', '2026-03-19 20:45:00', 210.00, '{"payment": {"method": "upi"}, "address": {"area": "Shivaji Nagar", "pincode": "411005"}}'),
  (3, 2, 5, 'delivered', '2026-03-20 13:00:00', 460.00, '{"payment": {"method": "upi"}, "address": {"area": "Colaba", "pincode": "400005"}}'),
  (4, 3, NULL, 'cancelled', '2026-03-20 19:50:00', 620.00, '{"payment": {"method": "card"}, "address": {"area": "Whitefield", "pincode": "560066"}}'),
  (5, 5, 1, 'delivered', '2026-03-21 14:30:00', 690.00, '{"payment": {"method": "cash"}, "address": {"area": "Baner", "pincode": "411045"}}'),
  (6, 6, 2, 'delivered', '2026-03-21 21:15:00', 290.00, '{"payment": {"method": "upi"}, "address": {"area": "Saket", "pincode": "110017"}}'),
  (7, 7, 3, 'delivered', '2026-03-22 13:20:00', 640.00, '{"payment": {"method": "card"}, "address": {"area": "Dwarka", "pincode": "110075"}}'),
  (8, 1, 4, 'delivered', '2026-03-22 19:30:00', 400.00, '{"payment": {"method": "upi"}, "address": {"area": "Juhu", "pincode": "400049"}}'),
  (9, 5, NULL, 'placed', '2026-03-22 21:00:00', 280.00, '{"payment": {"method": "upi"}, "address": {"area": "Koregaon Park", "pincode": "411001"}}'),
  (10, 8, NULL, 'placed', '2026-03-22 22:15:00', 150.00, '{"payment": {"method": "upi"}, "address": {"area": "Kothrud", "pincode": "411038"}}');

-- 80 order items
-- Orders hold 1 to 4 different dishes (14 orders with 1, 16 with 2, 6 with 3, 4 with 4)
-- Dishes strictly belong to the order's restaurant
-- Quantities and prices strictly sum to orders.total
INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES
  -- Order 1 (R1, total 400, 2 dishes): Butter Chicken (340) + Garlic Naan (60)
  (1, 1, 1),
  (1, 3, 1),
  -- Order 2 (R2, total 480, 2 dishes): Margherita Pizza (290) + Tiramisu (190)
  (2, 5, 1),
  (2, 8, 1),
  -- Order 3 (R1, total 620, 2 dishes): Butter Chicken (340) + Paneer Tikka Masala (280)
  (3, 1, 1),
  (3, 2, 1),
  -- Order 4 (R3, total 450, 1 dish): Tonkotsu Ramen (450)
  (4, 9, 1),
  -- Order 5 (R4, total 720, 1 dish): Avocado Super Bowl x2 (720)
  (5, 13, 2),
  -- Order 6 (R5, total 730, 3 dishes): Crispy Chicken Taco (250) + Loaded Nachos (320) + Churros with Chocolate (160)
  (6, 16, 1),
  (6, 18, 1),
  (6, 19, 1),
  -- Order 7 (R6, total 1130, 4 dishes): Kung Pao Chicken (360) + Veg Hakka Noodles (220) + Chilli Paneer Gravy (290) + Steamed Dim Sum (260)
  (7, 20, 1),
  (7, 21, 1),
  (7, 22, 1),
  (7, 23, 1),
  -- Order 8 (R7, total 660, 3 dishes): Classic Smash Cheeseburger (320) + Truffle Parmesan Fries (180) + Vanilla Milkshake (160)
  (8, 24, 1),
  (8, 26, 1),
  (8, 27, 1),
  -- Order 9 (R8, total 270, 3 dishes): Masala Dosa (120) + Idli Vada Combo (90) + Filter Coffee (60)
  (9, 28, 1),
  (9, 29, 1),
  (9, 30, 1),
  -- Order 10 (R2, total 420, 1 dish): Pepperoni Feast (420)
  (10, 6, 1),
  -- Order 11 (R3, total 660, 2 dishes): Spicy Miso Ramen (420) + Gyoza Dumplings (240)
  (11, 10, 1),
  (11, 12, 1),
  -- Order 12 (R5, total 280, 1 dish): Black Bean Burrito (280)
  (12, 17, 1),
  -- Order 13 (R1, total 280, 1 dish): Paneer Tikka Masala (280)
  (13, 2, 1),
  -- Order 14 (R6, total 510, 2 dishes): Veg Hakka Noodles (220) + Chilli Paneer Gravy (290)
  (14, 21, 1),
  (14, 22, 1),
  -- Order 15 (R8, total 300, 2 dishes): Masala Dosa (120) + Filter Coffee x3 (180)
  (15, 28, 1),
  (15, 30, 3),
  -- Order 16 (R7, total 500, 2 dishes): Spicy Crispy Chicken Burger (340) + Vanilla Milkshake (160)
  (16, 25, 1),
  (16, 27, 1),
  -- Order 17 (R4, total 670, 2 dishes): Avocado Super Bowl (360) + Quinoa Crunch Salad (310)
  (17, 13, 1),
  (17, 14, 1),
  -- Order 18 (R2, total 1360, 4 dishes): Margherita Pizza (290) + Pepperoni Feast (420) + Quattro Formaggi (460) + Tiramisu (190)
  (18, 5, 1),
  (18, 6, 1),
  (18, 7, 1),
  (18, 8, 1),
  -- Order 19 (R3, total 380, 1 dish): Veg Shoyu Ramen (380)
  (19, 11, 1),
  -- Order 20 (R1, total 740, 3 dishes): Butter Chicken (340) + Paneer Tikka Masala (280) + Garlic Naan x2 (120)
  (20, 1, 1),
  (20, 2, 1),
  (20, 3, 2),
  -- Order 21 (R5, total 660, 2 dishes): Crispy Chicken Taco x2 (500) + Churros with Chocolate (160)
  (21, 16, 2),
  (21, 19, 1),
  -- Order 22 (R6, total 260, 1 dish): Steamed Dim Sum (260)
  (22, 23, 1),
  -- Order 23 (R7, total 340, 2 dishes): Truffle Parmesan Fries (180) + Vanilla Milkshake (160)
  (23, 26, 1),
  (23, 27, 1),
  -- Order 24 (R8, total 240, 1 dish): Masala Dosa x2 (240)
  (24, 28, 2),
  -- Order 25 (R2, total 480, 2 dishes): Margherita Pizza (290) + Tiramisu (190)
  (25, 5, 1),
  (25, 8, 1),
  -- Order 26 (R3, total 1490, 4 dishes): Tonkotsu Ramen (450) + Spicy Miso Ramen (420) + Veg Shoyu Ramen (380) + Gyoza Dumplings (240)
  (26, 9, 1),
  (26, 10, 1),
  (26, 11, 1),
  (26, 12, 1),
  -- Order 27 (R4, total 490, 2 dishes): Quinoa Crunch Salad (310) + Berry Smoothie (180)
  (27, 14, 1),
  (27, 15, 1),
  -- Order 28 (R5, total 320, 1 dish): Loaded Nachos (320)
  (28, 18, 1),
  -- Order 29 (R6, total 910, 3 dishes): Kung Pao Chicken (360) + Chilli Paneer Gravy (290) + Steamed Dim Sum (260)
  (29, 20, 1),
  (29, 22, 1),
  (29, 23, 1),
  -- Order 30 (R1, total 340, 1 dish): Butter Chicken (340)
  (30, 1, 1),
  -- Order 31 (R7, total 1000, 4 dishes): Classic Smash Cheeseburger (320) + Spicy Crispy Chicken Burger (340) + Truffle Parmesan Fries (180) + Vanilla Milkshake (160)
  (31, 24, 1),
  (31, 25, 1),
  (31, 26, 1),
  (31, 27, 1),
  -- Order 32 (R8, total 210, 2 dishes): Masala Dosa (120) + Idli Vada Combo (90)
  (32, 28, 1),
  (32, 29, 1),
  -- Order 33 (R2, total 460, 1 dish): Quattro Formaggi (460)
  (33, 7, 1),
  -- Order 34 (R3, total 620, 2 dishes): Veg Shoyu Ramen (380) + Gyoza Dumplings (240)
  (34, 11, 1),
  (34, 12, 1),
  -- Order 35 (R5, total 690, 3 dishes): Black Bean Burrito (280) + Churros with Chocolate (160) + Crispy Chicken Taco (250)
  (35, 17, 1),
  (35, 19, 1),
  (35, 16, 1),
  -- Order 36 (R6, total 290, 1 dish): Chilli Paneer Gravy (290)
  (36, 22, 1),
  -- Order 37 (R7, total 640, 1 dish): Classic Smash Cheeseburger x2 (640)
  (37, 24, 2),
  -- Order 38 (R1, total 400, 2 dishes): Butter Chicken (340) + Garlic Naan (60)
  (38, 1, 1),
  (38, 3, 1),
  -- Order 39 (R5, total 280, 1 dish): Black Bean Burrito (280)
  (39, 17, 1),
  -- Order 40 (R8, total 150, 2 dishes): Idli Vada Combo (90) + Filter Coffee (60)
  (40, 29, 1),
  (40, 30, 1);

-- 20 reviews
INSERT INTO reviews (order_id, rating, body) VALUES
  (1, 5, 'The butter chicken was incredibly rich and the garlic naan was perfectly fresh and warm.'),
  (2, 4, 'Crispy crust on the margherita pizza, arrived fast and hot.'),
  (3, 5, 'Wonderfully spicy curry with generous paneer tikka portions.'),
  (5, 4, 'Very fresh avocado bowl, healthy and satisfying lunch.'),
  (6, 2, 'The food was late and arrived cold, though the tacos tasted decent.'),
  (7, 5, 'Delicious Kung Pao chicken, super spicy and packed with flavour.'),
  (8, 4, 'Juicy smash burger with crispy fries on the side.'),
  (9, 5, 'Crispy hot masala dosa, excellent chutney and fresh, fluffy idli.'),
  (10, 5, 'Generous pepperoni toppings and rich cheese, highly recommended.'),
  (11, 4, 'Rich broth and crispy gyoza, very authentic ramen.'),
  (13, 3, 'Delivery was late by twenty minutes, but the paneer was fresh.'),
  (14, 5, 'Spicy hakka noodles with a great smoky wok aroma.'),
  (15, 5, 'Authentic South Indian breakfast, the sambar was delightfully spicy.'),
  (16, 4, 'Crispy chicken burger was tasty, though the milkshake arrived warm, not cold.'),
  (17, 5, 'Fresh ingredients and generous quinoa bowl, perfect meal.'),
  (18, 4, 'Great Italian flavours and lovely tiramisu dessert.'),
  (19, 4, 'Flavourful ramen, noodles had great springiness and broth was hot.'),
  (20, 5, 'Generous portions, wonderfully spicy and authentic taste.'),
  (21, 4, 'Crispy taco shells and zesty salsa, very satisfying.'),
  (23, 3, 'Decent fries, but order arrived a bit late and melted.');
