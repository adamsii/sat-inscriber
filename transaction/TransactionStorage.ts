import BitcoinTransaction from "./models/BitcoinTransaction";
import localStorage from "../LocalStorage";
export default class TransactionStorage {
  storage: BitcoinTransaction[];
  TABLE_NAME = "bitcoin_transaction";

  constructor() {
    
    this.storage = JSON.parse(localStorage.getItem(this.TABLE_NAME)) || []
  }

  save() {
    localStorage.setItem(this.TABLE_NAME, JSON.stringify(this.storage));
  }

  async storeTransaction(bitcoinTx: BitcoinTransaction): Promise<void> {
    this.storage.push(bitcoinTx);
    this.save();
    return Promise.resolve();
  }

  async getAllTransactions(): Promise<BitcoinTransaction[]> {
    return this.storage;
  }

  async getTransactionsByMintRequestId(
    mintRequestId: number
  ): Promise<BitcoinTransaction[] | undefined> {
    return this.storage.filter((t: BitcoinTransaction) => {
      return t.mintRequestId == mintRequestId;
    });
  }
}
