import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
