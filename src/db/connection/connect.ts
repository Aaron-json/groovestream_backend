import pg from "pg";
// attempts to connect to both mongodb and postgres
export async function dbConnect() {
  await connect_pg();
}

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
  pool?.on("error", (err) => {
    console.log(err);
  });
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
  let res;
  if (query.params) {
    res = await pool?.query(query.queryStr, query.params);
  } else {
    res = await pool?.query(query.queryStr);
  }
  return { rows: res!.rows, rowCount: res?.rowCount ? res!.rowCount : 0 };
}
/**
 * Used to get a client to execute queries in a row
 * or in a transaction.
 */
export async function getClient() {
  return pool?.connect();
}
