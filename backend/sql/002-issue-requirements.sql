-- Eseguito in transazione da db:init, ripetibile su database nuovi o esistenti.
LOCK TABLE issues, notifications IN ACCESS EXCLUSIVE MODE;
ALTER TABLE issues ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;
UPDATE issues SET status = 'TODO' WHERE status = 'OPEN';
ALTER TABLE issues ADD CONSTRAINT issues_status_check
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'CLOSED'));
ALTER TABLE issues ALTER COLUMN status SET DEFAULT 'TODO';

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL
    DEFAULT 'ACTIVITY' CHECK (kind IN ('ACTIVITY', 'RESOLUTION'));
