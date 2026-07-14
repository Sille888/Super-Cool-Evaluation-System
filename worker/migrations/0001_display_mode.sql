-- Ersetzt das bisherige evaluation_unlocked-Flag durch ein dreistufiges display_mode-Feld
-- ('paused' | 'form' | 'results'), das steuert, was der öffentliche Link /projects/:id zeigt.
ALTER TABLE projects ADD COLUMN display_mode TEXT NOT NULL DEFAULT 'paused';
UPDATE projects SET display_mode = CASE WHEN evaluation_unlocked = 1 THEN 'results' ELSE 'form' END;
ALTER TABLE projects DROP COLUMN evaluation_unlocked;
