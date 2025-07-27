import { Psbt } from "bitcoinjs-lib";
import fetch from "node-fetch";
import { NETWORK_NAME } from "../config";
const Spline = require("cubic-spline");

export interface Utxo {
  status: any;
  txid: string;
  value: number;
  vout: number;
}

let networkExplorers: { [key: string]: string } = {
  regtest: "http://localhost:3000",
  testnet: "https://blockstream.info/testnet/api",
  mainnet: "https://blockstream.info/api",
};

const API_URL = networkExplorers[NETWORK_NAME];

export async function getUtxos(address: string): Promise<Utxo[]> {
  // get utxos for this address
  let response = await fetch(`${API_URL}/address/${address}/utxo`);
  let utxos: Utxo[] = (await response.json()) as any;

  if (!utxos) {
    throw new Error("No utxos");
  }

  // return as many utxo ids and amounts as need to reach desired amount in param
  return utxos;
}
export async function getFeerate(
  feeTargets: number[]
): Promise<{ [key: number]: number }> {
  let response = await fetch(`${API_URL}/fee-estimates`);
  let feeEstimates = await response.json();

  let interpolatedFeeRates: { [key: number]: number } = {};

  if (!feeEstimates || !Object.keys(feeEstimates).length) {
    feeTargets.map((t) => (interpolatedFeeRates[t] = 1));
    return interpolatedFeeRates;
  }

  let xs = Object.keys(feeEstimates);
  let ys = Object.values(feeEstimates);
  const spline = new Spline(xs, ys);

  feeTargets.map((t) => (interpolatedFeeRates[t] = spline.at(t)));
  return interpolatedFeeRates;
}

export async function broadcastTransaction(psbt: Psbt): Promise<string> {
  let response = await fetch(`${API_URL}/tx`, {
    method: "POST",
    body: psbt.extractTransaction().toHex(),
  });

  console.log("BROADCAST RESPONSE STATUS CODE", response.status);
  if (response.status != 200) {
    let error = await response.text();
    throw new Error(`Broadcast failed: ${error}`);
  }
  return response.text();
}
