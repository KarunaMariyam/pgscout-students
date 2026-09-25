# PGScout — Simple Local Runner

This is the PGScout full-stack project. The normal project architecture is
React + Node/Express + MySQL, matching the SRS.

## The easy way

You already have Node.js installed.

1. Keep the Railway MySQL service running.
2. Make sure `backend/.env` contains the Railway **PUBLIC NETWORK** values:
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Double-click:

   `RUN_PGSCOUT.bat`

That's it.

The runner will:
- install npm packages if they are missing
- load `backend/sql/schema.sql` directly into your Railway MySQL database
- seed the demo accounts/listings
- start the backend on `http://localhost:4000`
- start the frontend on `http://localhost:5173`
- open the frontend in Chrome/Edge

No Docker. No local MySQL. No MySQL command-line client.

## If you need to set the Railway values again

Open:

`backend/.env`

Use the values from Railway > MySQL > Variables / Public Network.

Do not share `DB_PASSWORD`.

## Demo accounts

Password for all demo accounts: `password123`

- Seeker: `vignesh.seeker@example.com`
- Owner: `anand.owner@example.com`
- Owner: `blueorchid.owner@example.com`
- Institution Admin: `institution.admin@example.com`
- System Admin: `admin@example.com`

## Stopping the app

Double-click:

`STOP_PGSCOUT.bat`

or close the two PGScout terminal windows.

## Important

The database is still MySQL, as required by the SRS. The only thing we removed
from your manual workflow is the need to install a MySQL client locally. The
included `setup-db.js` uses the existing Node `mysql2` package to load the
schema directly into Railway.

Razorpay, SMTP, and Cloudinary remain optional demo integrations as described
in the original project.
