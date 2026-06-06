import { createRouter } from "next-connect";
import database from "infra/database.js";
import controller from "infra/controller.js";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const updateAt = new Date().toISOString();

  const versionResult = await database.query("SHOW server_version;");

  const maxConnResult = await database.query("SHOW max_connections");

  const databaseName = process.env.POSTGRES_DB;

  const openConnResult = await database.query({
    text: "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });
  // const openConnResult = await database.query("SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'local_db';");

  const dbVersion = versionResult.rows[0].server_version;

  const maxConn = maxConnResult.rows[0].max_connections;

  const openConn = openConnResult.rows[0].count;

  console.log(openConn);

  response.status(200).json({
    updated_at: updateAt,
    dependencies: {
      database: {
        version: dbVersion,
        max_connections: parseInt(maxConn),
        current_connections: parseInt(openConn),
      },
    },
  });
}
