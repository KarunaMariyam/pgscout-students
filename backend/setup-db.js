require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  let sql = fs.readFileSync(schemaPath, 'utf8');

  // Railway already gives us the target database. Ignore the local
  // CREATE DATABASE / USE lines from the schema and create the tables
  // inside DB_NAME from .env.
  sql = sql
    .replace(/CREATE DATABASE IF NOT EXISTS\s+pgscout\s*;/ig, '')
    .replace(/USE\s+pgscout\s*;/ig, '');

  console.log(`Connecting to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    connectTimeout: 15000,
  });

  try {
    await conn.query(sql);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`Database ready. ${tables.length} tables found.`);
    console.log('Schema loaded successfully.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nDatabase setup failed.');
  console.error(err.message);
  console.error('\nCheck that backend\\.env contains the Railway PUBLIC network values:');
  console.error('DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
  process.exit(1);
});
