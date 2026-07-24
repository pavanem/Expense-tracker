CREATE TABLE income (
    id                 BIGSERIAL      PRIMARY KEY,
    user_id            BIGINT         NOT NULL,
    income_category_id BIGINT         NOT NULL,
    amount             NUMERIC(12, 2) NOT NULL,
    source             VARCHAR(150),
    description        VARCHAR(500),
    income_date        DATE           NOT NULL,
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_income_user          FOREIGN KEY (user_id)            REFERENCES app_user(id)        ON DELETE CASCADE,
    CONSTRAINT fk_income_category      FOREIGN KEY (income_category_id) REFERENCES income_category(id) ON DELETE RESTRICT,
    CONSTRAINT chk_income_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_income_user_id         ON income (user_id);
CREATE INDEX idx_income_date            ON income (income_date);
CREATE INDEX idx_income_category_id     ON income (income_category_id);
CREATE INDEX idx_income_user_date       ON income (user_id, income_date);
