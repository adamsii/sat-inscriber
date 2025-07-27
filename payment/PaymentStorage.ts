import InMemoryStorage from "../common/InMemoryStorage";
import Payment from "./models/Payment";

export default class PaymentStorage extends InMemoryStorage {
  declare storage: Payment[];

  constructor() {
    super("payment");
  }

  async storePayment(payment: Payment): Promise<void> {
    if(this.storage.findIndex(p => p.txId == payment.txId) != -1) {
      return;
    }

    this.storage.push(payment);
    this.save();
    return Promise.resolve();
  }

  async getPaymentsByFundingId(fundingId: number) {
    let chosen: any[] = [];

    for (let payment of this.storage) {
      if (fundingId == payment.fundingId) {
        chosen.push(payment);
      }
    }

    return Promise.resolve(chosen);
  }
}
