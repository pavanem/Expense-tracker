CREATE TABLE refresh_token (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    -- SHA-256 hash of the token, never the raw token — mirrors how
    -- passwords are stored, so a database leak alone can't be used to
    -- authenticate as anyone.
    token_hash          VARCHAR(64)  NOT NULL,
    issued_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP    NOT NULL,
    revoked_at          TIMESTAMP,
    -- Rotation chain: when a refresh token is used, it's revoked and the
    -- hash of the token that replaced it is recorded here. If a revoked
    -- token is ever presented again, that's a strong signal of token theft
    -- (see AuthService for the reuse-detection response).
    replaced_by_hash    VARCHAR(64),
    device_label        VARCHAR(200),

    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id)
        REFERENCES app_user (id) ON DELETE CASCADE,
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_token_user ON refresh_token (user_id);
CREATE INDEX idx_refresh_token_expires_at ON refresh_token (expires_at);
