-- V7: Add user_id FK to expense table and backfill existing rows to the first (admin) user.
-- The backfill ensures the NOT NULL constraint succeeds even on databases with existing data.

ALTER TABLE expense ADD COLUMN user_id BIGINT;

UPDATE expense
SET    user_id = (SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1)
WHERE  user_id IS NULL;

ALTER TABLE expense
    ADD CONSTRAINT fk_expense_user
    FOREIGN KEY (user_id) REFERENCES app_user(id);

ALTER TABLE expense ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_expense_user_id ON expense(user_id);
