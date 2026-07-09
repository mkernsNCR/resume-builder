import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://localhost:5432/test_db',
      PORT: '5000',
      NODE_ENV: 'test',
    },
  },
});
