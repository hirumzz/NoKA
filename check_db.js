const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://kong:kong@localhost:15432/kong",
});

async function main() {
  await client.connect();
  try {
    const res = await client.query('SELECT * FROM konga_kong_nodes');
    console.log("=== konga_kong_nodes ===");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();
