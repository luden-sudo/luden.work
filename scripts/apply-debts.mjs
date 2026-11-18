import fs from "node:fs";
import postgres from "postgres";

const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).find(value => value.startsWith("POSTGRES_URL_NON_POOLING="));
if (!line) throw new Error("Missing POSTGRES_URL_NON_POOLING");
const url = line.slice(line.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql.file("supabase/debts.sql").simple();
  console.log("Debt tables and access policies created.");
} finally {
  await sql.end();
}
