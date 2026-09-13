-- Table: config
-- Stores per-guild key/value configuration.
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (guild_id, key)
);

-- Table: customCommand
-- Stores custom prefix commands per guild.
CREATE TABLE IF NOT EXISTS customCommand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  title TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT NOT NULL,
  response TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (guild_id, command)
);
