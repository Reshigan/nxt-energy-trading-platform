import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: { DB: 'test-db' },
          kvNamespaces: { KV: 'test-kv' },
          r2Buckets: { R2: 'test-r2' },
          durableObjects: {
            ORDER_BOOK: 'OrderBookDO',
            ESCROW_MGR: 'EscrowManagerDO',
            P2P_MATCHER: 'P2PMatcherDO',
            SMART_CONTRACT: 'SmartContractDO',
            RISK_ENGINE: 'RiskEngineDO',
          },
        },
      },
    },
  },
});
