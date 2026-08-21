import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { env } from "../lib/env.js";
import * as schema from "../../db/schema.js";
import * as relations from "../../db/relations.js";

const fullSchema = { ...schema, ...relations };

type DbInstance = ReturnType<typeof drizzle<typeof fullSchema>>;

let instance: DbInstance;
let client: Sql;

export function getDb() {
  if (!instance) {
    client = postgres(env.databaseUrl);
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
