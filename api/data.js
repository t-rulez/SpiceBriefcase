import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);
  const username = req.method === "GET" ? req.query.username : req.body?.username;
  if (!username) return res.status(400).json({ error: "Missing username" });

  await sql`CREATE TABLE IF NOT EXISTS sb_userdata (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    notes TEXT DEFAULT '[]',
    pantry TEXT DEFAULT '{}'
  )`;

  if (req.method === "GET") {
    const rows = await sql`SELECT notes, pantry FROM sb_userdata WHERE username = ${username}`;
    if (rows.length === 0) return res.status(200).json({ notes: [], pantry: {} });
    return res.status(200).json({
      notes: JSON.parse(rows[0].notes),
      pantry: JSON.parse(rows[0].pantry),
    });
  }

  if (req.method === "POST") {
    const { notes, pantry } = req.body;
    const notesJson = JSON.stringify(notes ?? []);
    const pantryJson = JSON.stringify(pantry ?? {});
    await sql`INSERT INTO sb_userdata (username, notes, pantry)
      VALUES (${username}, ${notesJson}, ${pantryJson})
      ON CONFLICT (username) DO UPDATE SET notes = ${notesJson}, pantry = ${pantryJson}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
