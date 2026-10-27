require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    console.log("=== Testing Supabase Connection ===");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'not set');
    
    let config;
    if (process.env.DATABASE_URL) {
        config = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000,
        };
    } else {
        config = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000,
        };
    }

    const pool = new Pool(config);
    try {
        const client = await pool.connect();
        console.log(" Connection to Supabase successful!");
        const res = await client.query("SELECT COUNT(*) as user_count FROM users");
        console.log(" Users in database:", res.rows[0].user_count);
        const sample = await client.query("SELECT id, name, email, role FROM users LIMIT 3");
        console.log(" Sample Users:", sample.rows);
        client.release();
        await pool.end();
        console.log(" All checks passed successfully!");
    } catch (err) {
        console.error(" Connection failed:", err.message);
        if (err.code === 'ENOTFOUND') {
            console.error("-> Hostname not found. Check your Supabase Project Reference ID.");
        }
        await pool.end();
        process.exit(1);
    }
}

testConnection();
