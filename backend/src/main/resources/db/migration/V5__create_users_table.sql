CREATE TABLE app_user (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_app_user_username UNIQUE (username),
    CONSTRAINT chk_app_user_role CHECK (role IN ('USER', 'ADMIN'))
);

-- Table name is deliberately "app_user", not "user" — "user" is a reserved
-- word in PostgreSQL (and a built-in role name), which causes constant
-- quoting headaches in raw SQL and tooling.
