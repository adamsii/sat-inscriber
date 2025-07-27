//Global config

import * as bitcoinjs from "bitcoinjs-lib";
import { Network } from "bitcoinjs-lib";
let secureEnv = require("secure-env");

declare global {
  var env: any;
}

if (!process.env.secret) {
  global.env = process.env;
} else {
  global.env = secureEnv({ secret: process.env.secret });
}

export const NETWORK_NAME: string = global.env.bitcoin_network || "regtest";
export const NETWORK: Network = (bitcoinjs.networks as any)[
  NETWORK_NAME == "mainnet" ? "bitcoin" : NETWORK_NAME
];
export const SERVICE_FEE: number =
  (global.env.serviceFee && parseInt(global.env.serviceFee)) || 4000;
export const WORKER_CONFIG: string = global.env.workerConfig;
export const MAX_LOCAL_STORAGE_SIZE_IN_MB: string =
  global.env.maxLocalStorageSizeInMb;
export const SEED_PHRASE: string = global.env.seedPhrase;
export const REGTEST_CHANGE_ADDRESS: string = global.env.regtestChangeAddress;
export const TESTNET_CHANGE_ADDRESS: string = global.env.testnetChangeAddress;
export const MAINNET_CHANGE_ADDRESS: string = global.env.mainnetChangeAddress;
