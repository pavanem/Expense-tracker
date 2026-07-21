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

---

## What this phase does and doesn't cover

**Covered:** network-level exposure is now minimal (only 80/443/SSH open),
SSH itself is hardened against brute-force and key theft, repeated
attackers get automatically firewalled off entirely (not just slowed down),
and the OS keeps itself patched without you having to remember.

**Not covered — Phase 5:** you still have no visibility into *whether*
you're being attacked unless you go looking (`fail2ban-client status`,
`docker compose logs`). Phase 5 adds lightweight monitoring/alerting so you
find out proactively instead of by accident.
