const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://kong:kong@localhost:15432/kong",
});

async function main() {
  await client.connect();
  try {
    const res = await client.query('SELECT id, username, email, admin, role FROM konga_users');
    console.log("=== konga_users ===");
    console.log(JSON.stringify(res.rows, null, 2));

    const commentsRes = await client.query('SELECT * FROM konga_kongacomment');
    console.log("\n=== konga_comments ===");
    console.log(JSON.stringify(commentsRes.rows, null, 2));

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();
