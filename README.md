# AdWatch Rewards Platform (PHP + MySQL) — Starter Kit

A learning-ready starter kit for a **Paid Registration + Tasks to Earn** platform.
Users must **pay to join** (payment simulated here), then access a **dashboard** with
their **investment overview** and a **Task Center**: Referrals, Watching YouTube Ads,
and Downloading Files — each can award points/earnings.

> ⚠️ For education/demo only. Not production-ready. Add real security, validation, and
> replace the **payment simulation** with a real gateway (M‑Pesa/Stripe/PayPal/Flutterwave).

---

## Features
- Paid registration (simulated) + login/logout
- Dashboard showing Joined Amount, Expected Profit, Balance, and task earnings
- Task Center: Referrals (unique link), Watch Ads (YouTube timer), Downloads (award on click)
- Simple Admin pages to manage ads and downloadable files
- MySQL schema included (`db.sql`)

---

## Quick Start

1) Create a MySQL database and import `db.sql`:
```sql
CREATE DATABASE adwatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- then import db.sql into this database
```

2) Configure DB in `config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'adwatch');
define('DB_USER', 'root');
define('DB_PASS', '');
define('APP_URL', 'http://localhost/adwatch'); // adjust to your local path/base URL
```

3) Place the project in your web server root, e.g.:
- XAMPP on Windows: `C:\xampp\htdocs\adwatch`
- Linux Apache: `/var/www/html/adwatch`

4) Visit the app in your browser at `APP_URL` (e.g. `http://localhost/adwatch/public/`).

5) Admin default login:
```
email: admin@example.com
password: admin123
```
> Change this after first login.

---

## Payment Simulation
- Registration takes an entered **Joined Amount**.
- Clicking **"Simulate Payment Success"** completes registration.
- Replace with real payment integration:
  - M‑Pesa: Safaricom Daraja API
  - Stripe/PayPal/Flutterwave: Server-side SDKs and webhooks

---

## Notes
- This is **minimal** to stay readable. Add CSRF tokens, stronger validation,
  server-side verification of watch-time, and real anti-cheat for tasks.
- Ad rewards are limited to **once per ad per day**.
- Download rewards are limited to **once per file per day**.
- Referral reward is granted **once** when the referred user completes payment.

---

## Folder Structure
```
adwatch_rewards_php/
├─ public/
│  ├─ index.php            # Landing page
│  ├─ register.php         # Registration + payment simulation
│  ├─ pay.php              # Simulate payment success
│  ├─ login.php            # Login
│  ├─ logout.php           # Logout
│  ├─ dashboard.php        # User dashboard
│  ├─ tasks.php            # Task center (tabs/cards)
│  ├─ watch.php            # Watch an ad
│  ├─ award_ad.php         # POST endpoint to award ad
│  ├─ download.php         # Download + award
│  ├─ referrals.php        # Referral details
│  ├─ profile.php          # Edit profile (basic)
│  ├─ admin/
│  │  ├─ index.php         # Admin home
│  │  ├─ manage_ads.php    # CRUD for ads
│  │  ├─ manage_dl.php     # CRUD for downloads
│  ├─ css/styles.css
│  ├─ js/app.js
├─ config.php              # DB + helpers
├─ db.sql                  # MySQL schema + seed
└─ README.md
```

---

## Legal
- If you show YouTube videos, respect **YouTube Terms of Service** and your local laws.
- For music downloads, use **properly licensed** files only.
