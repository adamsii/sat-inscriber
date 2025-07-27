import { getRandomUInt64 } from "../../utils";

export default class BitcoinTransaction {
  id: number;
  txid: string;
  feeSats: number;
  virtualSize: number;
  mintRequestId: number;
  type: string;

  constructor({
    txid,
    feeSats,
    virtualSize,
    mintRequestId,
    type,
  }: {
    txid: string;
    feeSats: number;
    virtualSize: number;
    mintRequestId: number;
    type: string;
  }) {
    this.id = getRandomUInt64();
    this.txid = txid;
    this.feeSats = feeSats;
    this.virtualSize = virtualSize;
    this.mintRequestId = mintRequestId;
    this.type = type;
  }
}
