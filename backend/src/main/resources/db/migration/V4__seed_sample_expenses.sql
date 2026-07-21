-- Sample seed data for local development / demo purposes.
-- Safe to run in prod too (small, harmless dataset); remove if not desired.

INSERT INTO expense (amount, category_id, merchant, description, payment_mode, expense_date) VALUES
    (120.00, (SELECT id FROM category WHERE name = 'Food'),      'Cafe Coffee Day', 'Breakfast',           'UPI',         CURRENT_DATE - INTERVAL '12 days'),
    (250.00, (SELECT id FROM category WHERE name = 'Food'),      'Domino''s',       'Lunch',               'CREDIT_CARD', CURRENT_DATE - INTERVAL '12 days'),
    (1800.00,(SELECT id FROM category WHERE name = 'Fuel'),      'Indian Oil',      'Bike fuel',           'UPI',         CURRENT_DATE - INTERVAL '12 days'),
    (180.00, (SELECT id FROM category WHERE name = 'Food'),      'Starbucks',       'Coffee',              'UPI',         CURRENT_DATE - INTERVAL '11 days'),
    (2500.00,(SELECT id FROM category WHERE name = 'Shopping'),  'Amazon',          'Headphones',          'CREDIT_CARD', CURRENT_DATE - INTERVAL '11 days'),
    (3200.00,(SELECT id FROM category WHERE name = 'Groceries'), 'Big Bazaar',      'Monthly groceries',   'DEBIT_CARD',  CURRENT_DATE - INTERVAL '9 days'),
    (15000.00,(SELECT id FROM category WHERE name = 'EMI'),      'HDFC Bank',       'Bike EMI',            'NET_BANKING', CURRENT_DATE - INTERVAL '8 days'),
    (600.00, (SELECT id FROM category WHERE name = 'Medical'),   'Apollo Pharmacy', 'Monthly medicines',   'UPI',         CURRENT_DATE - INTERVAL '6 days'),
    (450.00, (SELECT id FROM category WHERE name = 'Entertainment'),'PVR Cinemas',  'Movie tickets',       'UPI',         CURRENT_DATE - INTERVAL '4 days'),
    (999.00, (SELECT id FROM category WHERE name = 'Bills'),     'Airtel',          'Mobile recharge',     'UPI',         CURRENT_DATE - INTERVAL '2 days'),
    (5000.00,(SELECT id FROM category WHERE name = 'Investment'),'Zerodha',         'SIP investment',      'NET_BANKING', CURRENT_DATE - INTERVAL '1 days'),
    (75.00,  (SELECT id FROM category WHERE name = 'Others'),    NULL,              'Misc expense',        'CASH',        CURRENT_DATE);
