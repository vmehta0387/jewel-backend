# SQL Files

Place project SQL migrations, patches, repair scripts, and database dumps in this folder.

Use `backend/scripts/apply-sql-upgrades.js` for the default upgrade chain. When adding a new default upgrade, add its filename to that script using `sqlRoot`.