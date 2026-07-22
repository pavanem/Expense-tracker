# Phase 4: OS & Network Hardening

Everything here runs **on the Ubuntu host itself**, not in Docker — `ufw`,
SSH, and `fail2ban` all need to touch the real network stack and the real
`sshd`, so they can't be containerized the way the app itself is.

Go through these in order. **Don't skip the SSH section's safety steps** —
it's the one place a mistake can lock you out of your own server.

---

## 1. Review your existing `ufw` rules first

Earlier in this project you had some rules from unrelated setups still
active:

```bash
sudo ufw status numbered
```

If you still see `3389/tcp` (RDP) or `3309` (looks like a typo of MySQL's
3306) allowed from "Anywhere," **remove them now** unless you specifically
need them — an open RDP port on a public IP is one of the most commonly
scanned/attacked ports on the internet:

```bash
sudo ufw delete <number>   # highest number first, so numbering doesn't shift
```

## 2. Reset to a clean, public-safe baseline

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

You should see exactly: SSH, 80/tcp, 443/tcp allowed — nothing else. (5432
for direct DB access should already be closed from earlier work in this
project; verify it's not back in the list.)

## 3. SSH hardening

**Do these in order, and keep your current SSH session open the whole
time** — test each change in a *second* terminal before closing the first.
If step 3c breaks something, your still-open first session is how you fix it.

**3a. Confirm key-based login already works.** From your Windows/local
machine:
```powershell
ssh-copy-id pavan@<server-ip>
```
(or manually append your public key to `~/.ssh/authorized_keys` on the
server). Then, **in a new terminal**, confirm you can log in with the key
and no password prompt:
```bash
ssh pavan@<server-ip>
```

**3b. Only once 3a is confirmed working**, edit `/etc/ssh/sshd_config`:
```bash
sudo nano /etc/ssh/sshd_config
```
Set:
```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

**3c. Restart SSH and test in a new terminal before closing your current one:**
```bash
sudo systemctl restart sshd
```
Open a **new** terminal window and confirm `ssh pavan@<server-ip>` still
works. Only close your original session after that succeeds.

**Optional — reduces automated scan noise, not real security on its own:**
moving SSH off port 22 to something like 2222 cuts down the sheer volume of
drive-by bot scans hitting your logs, but don't treat it as a substitute
for the steps above. If you do this, remember to `sudo ufw allow 2222/tcp`
and remove the `OpenSSH` rule, and add `Port 2222` to `sshd_config`.

## 4. fail2ban

```bash
sudo apt install fail2ban -y
```

Copy the two provided config files (adjusting `<PROJECT_PATH>` in
`jail.local` to your actual path, e.g. `/home/pavan/Apps/Expense-Tracker`):

```bash
sudo cp scripts/hardening/expense-tracker-auth.filter.conf /etc/fail2ban/filter.d/expense-tracker-auth.conf
sudo cp scripts/hardening/jail.local /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local   # fix the <PROJECT_PATH> placeholders
```

**Before starting fail2ban, create the log directory it depends on** (this
is also required for the `frontend` container to start at all once you
rebuild, since Nginx now writes real log files there — see
`docker-compose.yml`):

```bash
mkdir -p logs/nginx
chmod 777 logs/nginx   # simplest fix for the Nginx worker's non-root UID;
                        # tighten later with `chown 101:101 logs/nginx` if
                        # your image's nginx UID matches (check with
                        # `docker compose exec frontend id nginx`)
```

Then:
```bash
docker compose up -d --build   # picks up the new log volume
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
sudo fail2ban-client status expense-tracker-auth
sudo fail2ban-client status nginx-limit-req
```

Each `status <jail>` should show `Currently banned: 0` (unless you've
already been attacked, in which case — good, it's working).

## 5. Automatic security updates

```bash
sudo apt install unattended-upgrades -y
sudo cp scripts/hardening/50unattended-upgrades-expense-tracker /etc/apt/apt.conf.d/
sudo dpkg-reconfigure -plow unattended-upgrades   # confirm "Yes" when asked
sudo systemctl status unattended-upgrades
```

Test it's actually configured correctly (dry run, makes no changes):
```bash
sudo unattended-upgrade --dry-run --debug
```

## 6. Docker daemon — quick confirmation, no changes needed

Already in good shape from earlier work in this project, worth a quick
re-check:
```bash
docker compose ps        # nothing should be running as an unexpected extra port
docker compose exec backend id       # should show a non-root user (see backend/Dockerfile)
docker compose exec frontend id      # nginx worker should be non-root too
```

## 7. Set up push notifications (ntfy.sh)

Free, no account, no API keys. Pick a topic name that's hard to guess
(anyone who knows it can read your notifications — treat it like a
password), e.g. `pavan-expense-alerts-x7k2`.

1. Install the [ntfy app](https://ntfy.sh/#subscribe) on your Android phone
   (or just use a browser at `https://ntfy.sh/<your-topic>`).
2. Subscribe to your topic name in the app.
3. Set `NTFY_TOPIC` in `.env` to that same topic name.
4. Test it works:
   ```bash
   curl -d "Test notification from your server" "https://ntfy.sh/<your-topic>"
   ```
   You should get a push notification within a few seconds.

## 8. Wire fail2ban up to send notifications on every ban

```bash
sudo cp scripts/hardening/ntfy.action.conf /etc/fail2ban/action.d/ntfy.conf
sudo nano /etc/fail2ban/jail.local   # set ntfy_topic to your real topic name
sudo systemctl restart fail2ban
```

Test it end-to-end (bans your own IP for a minute — only do this from a
connection you can afford to briefly lose, e.g. not the only way you can
reach the server):
```bash
sudo fail2ban-client set expense-tracker-auth banip 203.0.113.1   # a test/dummy IP, not your own
```
You should get a push notification. Then unban it:
```bash
sudo fail2ban-client set expense-tracker-auth unbanip 203.0.113.1
```

## 9. Certificate expiry watchdog

Trusts-but-verifies the automatic renewal loop from Phase 1 — checks the
live certificate directly rather than assuming the `certbot` container is
working correctly.

```bash
chmod +x scripts/hardening/check-cert-expiry.sh
./scripts/hardening/check-cert-expiry.sh   # test it manually first
```

Then schedule it daily:
```bash
crontab -e
```
Add:
```
0 9 * * * /home/pavan/Apps/Expense-Tracker/scripts/hardening/check-cert-expiry.sh >> /home/pavan/Apps/Expense-Tracker/logs/cert-check.log 2>&1
```
(adjust the path to match your actual project location)

## 10. Log rotation

Phase 4 made Nginx write real log files for fail2ban to watch — without
rotation those grow forever. Fix that now:

```bash
sudo cp scripts/hardening/logrotate-expense-tracker /etc/logrotate.d/expense-tracker
sudo nano /etc/logrotate.d/expense-tracker   # fix the <PROJECT_PATH> placeholders
sudo logrotate --debug /etc/logrotate.d/expense-tracker   # dry run, no changes made
```

Docker's own `docker logs` output (separate from the Nginx files above) is
already capped via `docker-compose.yml`'s logging config (10MB × 3 files
per container) — no extra setup needed there.

## 11. Automated nightly backups

Security and resilience are two sides of the same coin — a server hardened
against attack that still has no backup isn't actually safe from data loss
(disk failure, a bad `docker compose down -v`, human error). Local-only, no
cloud dependency, per the original SRS.

```bash
chmod +x scripts/monitoring/backup-db.sh scripts/monitoring/notify.sh
./scripts/monitoring/backup-db.sh   # test it manually first
ls -lh backups/
```

Schedule it nightly:
```bash
crontab -e
```
Add:
```
0 2 * * * cd /home/pavan/Apps/Expense-Tracker && ./scripts/monitoring/backup-db.sh >> logs/backup.log 2>&1
```
(adjust the path to match your actual project location)

Alerts to your phone via the same `NTFY_TOPIC` from `.env` if a backup
fails outright, or "succeeds" with a suspiciously tiny/empty file.

## 12. Weekly heartbeat (optional)

The alerts above are all *negative* signals — silence could mean "nothing
happened" or could mean cron quietly stopped running weeks ago. This adds
one positive "still alive" confirmation per week, summarizing fail2ban ban
counts, latest backup, and certificate days-remaining in one notification.

```bash
chmod +x scripts/monitoring/weekly-summary.sh
./scripts/monitoring/weekly-summary.sh   # test it manually first
```

Schedule it (Monday mornings suggested):
```
0 9 * * 1 cd /home/pavan/Apps/Expense-Tracker && ./scripts/monitoring/weekly-summary.sh >> logs/weekly-summary.log 2>&1
```

`sudo crontab -e` (root's crontab, not your user's) may be needed instead —
this script's `fail2ban-client status` call requires root. Check which
applies with `sudo fail2ban-client status` vs. plain `fail2ban-client status`.

## 13. Weekly review habit

Automation catches the routine stuff; a two-minute weekly glance catches
what it can't:

```bash
sudo fail2ban-client status                      # anything currently banned?
docker compose logs backend --since 168h | grep -i "locked out\|reuse detected"
docker compose ps                                # everything still healthy?
```

---

## What this phase does and doesn't cover

**Covered:** you now find out — on your phone, within seconds — when
someone gets banned for hammering your login, and get an independent daily
check that HTTPS hasn't quietly broken. Container and Nginx logs are
bounded instead of growing forever. Nightly backups happen automatically
with failure alerting, and a weekly heartbeat confirms the whole monitoring
setup — cron, fail2ban, backups, certs — is still alive, not just silent.

**Not covered, and reasonably out of scope for a personal single-user app:**
centralized log aggregation (ELK/Loki-style), intrusion detection beyond
fail2ban's log-pattern matching, and vulnerability scanning of the Docker
images themselves. If this app's threat model ever grows beyond "protect my
own household's spending data," those would be the next additions — but
for what this is, Phases 1–5 cover the real, proportionate risks.

