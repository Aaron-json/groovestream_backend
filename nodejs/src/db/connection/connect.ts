import pg from "pg";

let pool: pg.Pool | undefined;

export async function connect_pg() {
  const poolOptions: pg.PoolConfig = {
    max: 40,
    min: 1,
    idleTimeoutMillis: 1000 * 30,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE_NAME,
    user: process.env.PG_USER,
    ssl: true,
  };
  pool = new pg.Pool(poolOptions);
}

export interface Query {
  queryStr: string;
  params?: any[];
}
export interface QueryResponse {
  rows: any[];
  rowCount: number;
}
export async function queryFn(query: Query): Promise<QueryResponse> {
  if (!pool) {
    throw new Error("Connection pool not initialized");
  }
  let res;
  if (query.params) {
    res = await pool.query(query.queryStr, query.params);
  } else {
    res = await pool.query(query.queryStr);
  }
  return { rows: res.rows, rowCount: res.rowCount ? res.rowCount : 0 };
}