-- V7: Add user_id FK to expense table and backfill existing rows to the first (admin) user.
-- The backfill ensures the NOT NULL constraint succeeds even on databases with existing data.
-- On a fresh database (e.g. Testcontainers) there may be no users yet — in that case the
-- sample seed expenses from V4 cannot be assigned an owner, so we delete them before
-- applying the NOT NULL constraint.  In production this DELETE is a harmless no-op.

ALTER TABLE expense ADD COLUMN user_id BIGINT;

UPDATE expense
SET    user_id = (SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1)
WHERE  user_id IS NULL;

-- Remove orphan rows whose user_id could not be backfilled (empty app_user table).
DELETE FROM expense WHERE user_id IS NULL;

ALTER TABLE expense
    ADD CONSTRAINT fk_expense_user
    FOREIGN KEY (user_id) REFERENCES app_user(id);

ALTER TABLE expense ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_expense_user_id ON expense(user_id);

