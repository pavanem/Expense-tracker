CREATE TABLE category (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    icon            VARCHAR(100),
    color           VARCHAR(20)  NOT NULL,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_category_name UNIQUE (name),
    CONSTRAINT chk_category_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_category_status ON category (status);
CREATE INDEX idx_category_display_order ON category (display_order);
