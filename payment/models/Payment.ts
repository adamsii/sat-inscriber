import { getRandomUInt64 } from "../../utils";

export default class Payment {
  id: number;
  fundingId: number;
  txId: string;
  amountSats: number;
  createdAt: Date;

  constructor(fundingId: number, txId: string, amountSats: number) {
    this.id = getRandomUInt64();
    this.fundingId = fundingId;
    this.txId = txId;
    this.amountSats = amountSats;
    this.createdAt = new Date();
  }
}
