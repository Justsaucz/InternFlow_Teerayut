import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrations use session advisory locks; PgBouncer transaction pooling cannot retain them.
    // Normal application queries continue to use the pooled DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
