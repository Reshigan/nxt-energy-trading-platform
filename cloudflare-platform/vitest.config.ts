import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true,
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
