import FundingManager from "../funding/FundingManager";
import MintManager from "../mint/MintManager";
import Payment from "./models/Payment";
import PaymentStorage from "./PaymentStorage";

export default class PaymentManager {
  paymentStorage: PaymentStorage;
  fundingManager: FundingManager;

  constructor(paymentStorage: PaymentStorage, fundingManager: FundingManager) {
    this.paymentStorage = paymentStorage;
    this.fundingManager = fundingManager;
  }

  async tryAddPayments(payments: Payment[]): Promise<void> {
    let paymentPromises: Promise<any>[] = [];
    for (let payment of payments) {
      paymentPromises.push(this.paymentStorage.storePayment(payment));
    }

    await paymentPromises;
  }

  async getPaymentTotalBySubAndMintId(
    sub: string,
    mintId: number
  ): Promise<number> {
    let funding = await this.fundingManager.getFundingByMintId(mintId);

    if (!funding) {
      let err = `Funding for mint id ${mintId} and sub ${sub} was not found`;
      console.error(err);
      throw new Error(err);
    }

    let payments = await this.paymentStorage.getPaymentsByFundingId(funding.id);

    if (!payments) {
      let err = `No payments found for funding ${funding.id} and sub ${sub}`;
      console.error(err);
      throw new Error(err);
    }

    return payments.reduce((sum: number, p: Payment) => sum + p.amountSats, 0);
  }
}
