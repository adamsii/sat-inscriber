import * as bip39 from "bip39";
import { BIP32Factory, BIP32Interface } from "bip32";
import * as ecc from "tiny-secp256k1";
import * as bitcoinjs from "bitcoinjs-lib";
import { SEED_PHRASE } from "../config";

//Always call this when importing ecc
bitcoinjs.initEccLib(ecc);

const bip32API = BIP32Factory(ecc);

export default class KeyManager {
  static getApplicationKeypair(): BIP32Interface {
    let seedPhrase = SEED_PHRASE;

    if (!seedPhrase) {
      throw new Error("Seed phrase not found");
    }

    let seed = bip39.mnemonicToSeedSync(seedPhrase);
    return bip32API.fromSeed(seed);
  }
}
