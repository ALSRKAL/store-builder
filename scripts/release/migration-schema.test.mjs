import test from 'node:test';
import assert from 'node:assert/strict';
import { schemaCompatible } from '../db/managed.mjs';

const table = columns => `CREATE TABLE admins (${columns.join(', ')})`;

test('same table definition with reordered columns is compatible', () => {
  const expected = table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL', 'trial_used INTEGER DEFAULT 0', 'dashboard_is_active INTEGER DEFAULT 1']);
  const actual = table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL', 'dashboard_is_active INTEGER DEFAULT 1', 'trial_used INTEGER DEFAULT 0']);
  assert.equal(schemaCompatible(actual, expected), true);
});

test('missing, extra, or changed columns are rejected', () => {
  const expected = table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL', 'trial_used INTEGER DEFAULT 0']);
  assert.equal(schemaCompatible(table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL']), expected), false);
  assert.equal(schemaCompatible(table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL', 'trial_used INTEGER DEFAULT 0', 'extra TEXT']), expected), false);
  assert.equal(schemaCompatible(table(['id TEXT PRIMARY KEY', 'email TEXT UNIQUE NOT NULL', 'trial_used TEXT DEFAULT 0']), expected), false);
});

test('non-table objects still require exact normalized definitions', () => {
  assert.equal(schemaCompatible('CREATE INDEX idx ON admins(email)', 'CREATE INDEX idx ON admins(slug)'), false);
  assert.equal(schemaCompatible('CREATE TRIGGER trg AFTER INSERT ON admins BEGIN SELECT 1; END', 'CREATE TRIGGER trg AFTER DELETE ON admins BEGIN SELECT 1; END'), false);
});
