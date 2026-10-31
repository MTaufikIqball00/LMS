import mysql from 'mysql2/promise';
import pg from 'pg';
import type { PoolClient } from 'pg';

const { Pool: PgPool } = pg;

// Determine whether we are connecting to Supabase / PostgreSQL or local MySQL
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;
const dbDialect = (process.env.DB_DIALECT || '').toLowerCase();
const dbHost = process.env.DB_HOST || '';

const isPostgres = Boolean(
    databaseUrl?.startsWith('postgres://') ||
    databaseUrl?.startsWith('postgresql://') ||
    dbDialect === 'postgres' ||
    dbDialect === 'supabase' ||
    dbDialect === 'postgresql' ||
    dbPort === 5432 ||
    dbPort === 6543 ||
    dbHost.includes('supabase.co') ||
    dbHost.includes('pooler.supabase.com')
);

/**
 * Converts MySQL-style positional '?' placeholders into PostgreSQL-style '$1, $2, ...'
 * while preserving string literals containing question marks.
 */
function convertPlaceholders(sql: string): string {
    let index = 1;
    let inQuote = false;
    let quoteChar = '';
    let result = '';

    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        if (!inQuote && (char === "'" || char === '"')) {
            inQuote = true;
            quoteChar = char;
            result += char;
        } else if (inQuote && char === quoteChar) {
            if (sql[i + 1] === quoteChar) {
                result += char + sql[i + 1];
                i++;
            } else {
                inQuote = false;
                result += char;
            }
        } else if (!inQuote && char === '?') {
            result += `$${index++}`;
        } else {
            result += char;
        }
    }
    return result;
}

/**
 * Normalizes PostgreSQL query results into a [rows, fields] tuple matching mysql2's API contract.
 */
function normalizePgResult(result: any) {
    const isModification = ['INSERT', 'UPDATE', 'DELETE'].includes(result.command || '');
    if (isModification && (!result.rows || result.rows.length === 0)) {
        const header = {
            affectedRows: result.rowCount ?? 0,
            rowCount: result.rowCount ?? 0,
            insertId: result.rows?.[0]?.id ?? 0,
        };
        return [header, result.fields || []];
    }
    return [result.rows || [], result.fields || []];
}

export interface UniversalConnection {
    query: (sql: string, values?: any[]) => Promise<any>;
    execute: (sql: string, values?: any[]) => Promise<any>;
    beginTransaction: () => Promise<any>;
    commit: () => Promise<any>;
    rollback: () => Promise<any>;
    release: () => void;
    [key: string]: any;
}

export interface UniversalDbPool {
    query: (sql: string, values?: any[]) => Promise<any>;
    execute: (sql: string, values?: any[]) => Promise<any>;
    getConnection: () => Promise<UniversalConnection>;
    end?: () => Promise<void>;
    [key: string]: any;
}

let poolInstance: UniversalDbPool;

if (isPostgres) {
    const isCloudSupabase = Boolean(
        databaseUrl?.includes('supabase.co') ||
        databaseUrl?.includes('pooler.supabase.com') ||
        dbHost.includes('supabase.co') ||
        dbHost.includes('pooler.supabase.com')
    );

    const pgConfig: any = databaseUrl
        ? {
            connectionString: databaseUrl,
            ssl: isCloudSupabase || process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : undefined,
        }
        : {
            host: process.env.DB_HOST || '127.0.0.1',
            port: dbPort || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'postgres',
            ssl: isCloudSupabase || process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : undefined,
        };

    const pgPool = new PgPool(pgConfig);

    poolInstance = {
        async query(sql: string, values: any[] = []) {
            const convertedSql = convertPlaceholders(sql);
            const res = await pgPool.query(convertedSql, values);
            return normalizePgResult(res);
        },
        async execute(sql: string, values: any[] = []) {
            return this.query(sql, values);
        },
        async getConnection(): Promise<UniversalConnection> {
            const client: PoolClient = await pgPool.connect();
            return {
                async query(sql: string, values: any[] = []) {
                    const convertedSql = convertPlaceholders(sql);
                    const res = await client.query(convertedSql, values);
                    return normalizePgResult(res);
                },
                async execute(sql: string, values: any[] = []) {
                    return (this as UniversalConnection).query(sql, values);
                },
                async beginTransaction() {
                    await client.query('BEGIN');
                },
                async commit() {
                    await client.query('COMMIT');
                },
                async rollback() {
                    await client.query('ROLLBACK');
                },
                release() {
                    client.release();
                },
            };
        },
        async end() {
            await pgPool.end();
        },
    };
} else {
    // Default to MySQL
    const mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lms_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    poolInstance = {
        async query(sql: string, values: any[] = []) {
            return mysqlPool.query(sql, values);
        },
        async execute(sql: string, values: any[] = []) {
            return mysqlPool.execute(sql, values);
        },
        async getConnection(): Promise<UniversalConnection> {
            const conn = await mysqlPool.getConnection();
            return {
                async query(sql: string, values: any[] = []) {
                    return conn.query(sql, values);
                },
                async execute(sql: string, values: any[] = []) {
                    return conn.execute(sql, values);
                },
                async beginTransaction() {
                    return conn.beginTransaction();
                },
                async commit() {
                    return conn.commit();
                },
                async rollback() {
                    return conn.rollback();
                },
                release() {
                    conn.release();
                },
            };
        },
        async end() {
            await mysqlPool.end();
        },
    };
}

export default poolInstance;
