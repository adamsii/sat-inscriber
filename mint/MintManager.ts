import MintStorage from "./MintStorage";
import MintRequest from "./models/MintRequest";
import TransactionManager from "../transaction/TransactionManager";
import FundingManager from "../funding/FundingManager";
import MintResponse from "./models/MintResponse";
import { FundingStatus } from "../funding/models/FundingStatus";
import PaymentManager from "../payment/PaymentManager";

export default class MintManager {
  mintStorage: MintStorage;
  fundingManager: FundingManager;
  transactionManager: TransactionManager;
  paymentManager: PaymentManager;

  constructor(
    mintStorage: MintStorage,
    fundingManager: FundingManager,
    transactionManager: TransactionManager,
    paymentManager: PaymentManager
  ) {
    this.mintStorage = mintStorage;
    this.fundingManager = fundingManager;
    this.transactionManager = transactionManager;
    this.paymentManager = paymentManager;
  }

  async buildMintResponse(
    mintRequest: MintRequest
  ): Promise<MintResponse | null> {
    let funding = await this.fundingManager.getFundingByMintId(mintRequest.id);

    if (!funding) {
      console.log(`No funding found for mint ${mintRequest.id}`);
      //Don't add anything to returned response because funding should be required (if it doesn't exist there's an error)
      return null;
    }

    let amountPaid: number | undefined = undefined;
    if (funding.fundingStatus == FundingStatus.INCOMPLETE) {
      amountPaid = await this.paymentManager.getPaymentTotalBySubAndMintId(
        mintRequest.sub,
        mintRequest.id
      );
    }

    let transactions =
      await this.transactionManager.getTransactionsByMintRequestId(
        mintRequest.id
      );

    if (!transactions) {
      console.log(`No funding found for mint ${mintRequest.id}`);
      return new MintResponse(mintRequest, funding);
    }

    let commit = transactions.find((tx) => tx.type == "commit");
    let reveal = transactions.find((tx) => tx.type == "reveal");

    return new MintResponse(mintRequest, funding, commit?.txid, reveal?.txid, amountPaid);
  }

  async getMintsBySub(sub: string): Promise<MintResponse[]> {
    let mintRequests = await this.mintStorage.getMintsBySub(sub);
    let mintResponses: MintResponse[] = [];

    for (let mintRequest of mintRequests) {
      let mintResponse = await this.buildMintResponse(mintRequest);

      if (mintResponse == null) {
        continue;
      }

      mintResponses.push(mintResponse);
    }

    return mintResponses;
  }

  async getMintBySubAndMintId(
    sub: string,
    mintId: number
  ): Promise<MintResponse | null> {
    let mintRequest = await this.mintStorage.getMintById(mintId);

    if (!mintRequest) {
      return null;
    }

    if (mintRequest.sub !== sub) {
      return null;
    }

    return this.buildMintResponse(mintRequest);
  }

  async storeMintRequest(mintRequest: MintRequest) {
    return this.mintStorage.storeMintRequest(mintRequest);
  }

  async getAllMintRequests() {
    let mintRequests = await this.mintStorage.getAllMintRequests();
    return mintRequests;
  }
}
