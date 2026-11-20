// Append migrations; never change a migration that has already shipped.
// Only trusted, static SQL belongs here. User values are bound in repositories.
export const migrations = [
    `
  CREATE TABLE Events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    date TEXT,
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(budget_cents) = 'integer' AND budget_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'LKR' CHECK (length(currency) = 3),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE Tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    notes TEXT NOT NULL DEFAULT '',
    due_at TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE Expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents >= 0),
    category TEXT NOT NULL DEFAULT '',
    incurred_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE Activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    starts_at TEXT,
    ends_at TEXT,
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
  );
  CREATE INDEX tasks_event_id ON Tasks(event_id);
  CREATE INDEX expenses_event_id ON Expenses(event_id);
  CREATE INDEX activities_event_id ON Activities(event_id);
  `,
    `
  ALTER TABLE Events ADD COLUMN category TEXT NOT NULL DEFAULT 'Other' CHECK (length(trim(category)) > 0);
  ALTER TABLE Events ADD COLUMN time TEXT;
  `,
    `
  ALTER TABLE Tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
  CREATE INDEX tasks_due_at ON Tasks(due_at);
  `,
    `
  ALTER TABLE Expenses ADD COLUMN estimated_cents INTEGER NOT NULL DEFAULT 0 CHECK (typeof(estimated_cents) = 'integer' AND estimated_cents >= 0);
  UPDATE Expenses SET estimated_cents = amount_cents;
  `,
    `
  ALTER TABLE Events ADD COLUMN status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('draft','planning','ready','ongoing','completed','cancelled'));
  ALTER TABLE Events ADD COLUMN end_date TEXT;
  ALTER TABLE Events ADD COLUMN end_time TEXT;
  ALTER TABLE Events ADD COLUMN archived_at TEXT;
  ALTER TABLE Events ADD COLUMN deleted_at TEXT;
  CREATE TABLE Guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    rsvp TEXT NOT NULL DEFAULT 'invited' CHECK(rsvp IN ('invited','confirmed','tentative','declined')),
    plus_ones INTEGER NOT NULL DEFAULT 0 CHECK(typeof(plus_ones) = 'integer' AND plus_ones BETWEEN 0 AND 20),
    dietary TEXT NOT NULL DEFAULT '', checked_in INTEGER NOT NULL DEFAULT 0 CHECK(checked_in IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE Vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0), service TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    quoted_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(quoted_cents) = 'integer' AND quoted_cents >= 0),
    booking_status TEXT NOT NULL DEFAULT 'inquiry' CHECK(booking_status IN ('inquiry','quoted','booked','cancelled')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  ALTER TABLE Expenses ADD COLUMN vendor_id INTEGER REFERENCES Vendors(id) ON DELETE SET NULL;
  ALTER TABLE Expenses ADD COLUMN payment_due_at TEXT;
  CREATE TABLE Payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL REFERENCES Expenses(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents) = 'integer' AND amount_cents > 0),
    paid_at TEXT NOT NULL, method TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX guests_event ON Guests(event_id);
  CREATE INDEX vendors_event ON Vendors(event_id);
  CREATE INDEX payments_expense ON Payments(expense_id);
  CREATE TABLE Receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL REFERENCES Expenses(id) ON DELETE CASCADE,
    name TEXT NOT NULL, mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','application/pdf')),
    data_url TEXT NOT NULL CHECK(length(data_url) <= 3000000),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX receipts_expense ON Receipts(expense_id);
  CREATE TABLE Reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0), remind_at TEXT NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0 CHECK(dismissed IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX reminders_event ON Reminders(event_id);
  `,
    `
  CREATE TRIGGER expenses_vendor_insert BEFORE INSERT ON Expenses
  WHEN NEW.vendor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Vendors WHERE id = NEW.vendor_id AND event_id = NEW.event_id)
  BEGIN SELECT RAISE(ABORT,'Vendor must belong to the same event'); END;
  CREATE TRIGGER expenses_vendor_update BEFORE UPDATE OF vendor_id,event_id ON Expenses
  WHEN NEW.vendor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Vendors WHERE id = NEW.vendor_id AND event_id = NEW.event_id)
  BEGIN SELECT RAISE(ABORT,'Vendor must belong to the same event'); END;
  `,
];
// Preferences are device-specific and intentionally excluded from event backups.
migrations.push('CREATE TABLE AppPreferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
export const SCHEMA_VERSION = migrations.length;
