CREATE TABLE expense (
    id              BIGSERIAL PRIMARY KEY,
    amount          NUMERIC(12, 2) NOT NULL,
    category_id     BIGINT         NOT NULL,
    merchant        VARCHAR(150),
    description     VARCHAR(500),
    payment_mode    VARCHAR(30)    NOT NULL,
    expense_date    DATE           NOT NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_category FOREIGN KEY (category_id)
        REFERENCES category (id) ON DELETE RESTRICT,
    CONSTRAINT chk_expense_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_expense_payment_mode CHECK (payment_mode IN
        ('CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'WALLET', 'OTHER'))
);

CREATE INDEX idx_expense_date ON expense (expense_date);
CREATE INDEX idx_expense_category ON expense (category_id);
CREATE INDEX idx_expense_payment_mode ON expense (payment_mode);
CREATE INDEX idx_expense_merchant ON expense (merchant);
CREATE INDEX idx_expense_date_category ON expense (expense_date, category_id);
