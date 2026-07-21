ALTER TABLE app_user
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP;

-- Defense-in-depth alongside Nginx's IP-based rate limiting: this is
-- account-based, so it still protects against distributed attempts coming
-- from many different IPs (which Nginx's per-IP limiter can't see).
