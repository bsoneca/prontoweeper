-- Restores the sync role's login password, which pronto 0.13.4's emitted
-- 001_roles.sql dropped (the line reads `ALTER ROLE electric BYPASSRLS
-- REPLICATION LOGIN;`). mecha's own 001_roles.sql, and the copies pronto emitted
-- before, say `... LOGIN PASSWORD 'electric'`, which is what the electric
-- service's DATABASE_URL (electric:electric@database) logs in with. The
-- database container requires a password on every network connection, so
-- without this Electric is refused and the cluster never comes up.
--
-- Delete this file once the emitter writes the password again. It is the
-- container tier's development password, the same one mecha ships; nothing
-- outside the compose network reaches the role.
--
-- Idempotent: ALTER ROLE restates the same password on every replay.

SET lock_timeout = '5s';
SET statement_timeout = '60s';

ALTER ROLE electric PASSWORD 'electric';
