import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "db");
fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
`);

const insert = db.prepare("INSERT INTO users (name) VALUES (?)");
const insertMany = db.transaction((names: string[]) => {
  for (const n of names) insert.run(n);
});

insertMany(["Alice", "Bob"]);
console.log(db.prepare("SELECT id, name FROM users").all());

db.close();
