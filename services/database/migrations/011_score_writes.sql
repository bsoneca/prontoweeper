-- Owner inserts over the public-read score table (ir decision-score-writes).
-- #Access has no "everyone reads, the owner writes" mode: `public` emits a
-- SELECT arm and the service catch-all and nothing else, so as declared every
-- posted win would be refused. The arm arrives here, additively: RLS policies
-- are PERMISSIVE and OR together, and nothing is dropped because `public` put
-- nothing there. Declaring `private` and widening SELECT instead would make the
-- browser believe "mine" where the server means "everyone's".
--
-- No UPDATE and no DELETE arm: a posted time is never edited or withdrawn, and
-- the missing policy is what keeps that true.
--
-- Idempotent via DROP POLICY IF EXISTS; initdb replays this on a fresh volume.

SET lock_timeout = '5s';
SET statement_timeout = '60s';

BEGIN;

DROP POLICY IF EXISTS score_app_user_insert ON score;
CREATE POLICY score_app_user_insert ON score FOR INSERT TO app_user
  WITH CHECK (user_id = auth_uid());

COMMIT;
