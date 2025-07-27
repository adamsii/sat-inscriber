import { getUtxos, Utxo } from "./clients/EsploraClient";
import FundingRequest from "./funding/models/FundingRequest";
import TransactionManager from "./transaction/TransactionManager";
import MintRequest from "./mint/models/MintRequest";
import FundingManager from "./funding/FundingManager";
import MintStorage from "./mint/MintStorage";
import { FundingStatus } from "./funding/models/FundingStatus";
import { SERVICE_FEE, WORKER_CONFIG } from "./config";
import OutdatedFunding from "./outdated-funding/models/OutdatedFunding";
import OutdatedFundingManager from "./outdated-funding/OutdatedFundingManager";
import Payment from "./payment/models/Payment";
import PaymentManager from "./payment/PaymentManager";
import { getFeeEstimateOfCommitAndRevealForInscriptionBasedOnWitnessSizeInHex } from "./transaction/utils/FeeEstimator";

function toMiliseconds({ hrs = 0, min = 0, sec = 0 }) {
  return (hrs * 60 * 60 + min * 60 + sec) * 1000;
}

export default class InscriptionWorker {
  mintStorage: MintStorage;
  fundingManager: FundingManager;
  transactionManager: TransactionManager;
  outdatedFundingManager: OutdatedFundingManager;
  paymentManager: PaymentManager;
  interval: number;

  constructor(
    mintStorage: MintStorage,
    fundingManager: FundingManager,
    transactionManager: TransactionManager,
    outdatedFundingManager: OutdatedFundingManager,
    paymentManager: PaymentManager
  ) {
    this.mintStorage = mintStorage;
    this.fundingManager = fundingManager;
    this.transactionManager = transactionManager;
    this.outdatedFundingManager = outdatedFundingManager;
    this.paymentManager = paymentManager;

    let workerConfig = JSON.parse(WORKER_CONFIG || "");

    if (!workerConfig) {
      workerConfig = { min: 5 };
    }

    this.interval = toMiliseconds(workerConfig);
  }

  async runJob() {
    //work with pagination
    console.log("Funding worker starting...");
    await this.checkFundingStatus();
  }

  async getFundingRequests() {
    try {
      let fundingRequests = await this.fundingManager.getAllFundingRequests();
      return fundingRequests;
    } catch (e) {
      console.log(e);
    }
  }

  async getMintRequestById(mintId: number): Promise<MintRequest | null> {
    try {
      let mintRequest = await this.mintStorage.getMintById(mintId);
      return mintRequest;
    } catch (e) {
      console.log(e);
      console.log(`Failed to find mint with id ${mintId}`);
      return null;
    }
  }

  async updateFunding(fundingId: number, fundingStatus: FundingStatus) {
    try {
      this.fundingManager.updateFundingStatusById(fundingId, fundingStatus);
    } catch (e) {
      console.log(e);
      throw new Error("Funding update failed");
    }
  }

  async isFundingRequestPaid(f: FundingRequest): Promise<boolean> {
    let utxos = await getUtxos(f.fundingAddress);

    if (!utxos || !utxos.length) {
      return false;
    }

    if (utxos.length > 1) {
      console.log(
        `More than one UTXO used for mint ${f.mintRequestId}, additional fee may be required`
      );
    }

    let utxoValueSum = utxos.reduce((s, u) => {
      return s + u.value;
    }, 0);

    if (utxoValueSum < f.amount) {
      if (utxos.length < (f.numInputs || 1)) {
        console.log("Waiting on more inputs");
        return false;
      }

      await this.updateFundingWithMoreInputs(utxos, f, utxoValueSum);
      return false;
    }

    if (!utxos.every((u) => u.status.confirmed)) {
      console.log("Utxo not confirmed");
      await this.updateFunding(f.id, FundingStatus.UNCONFIRMED);
      return false;
    }

    return true;
  }

  //TODO: Paginate fundingRequests
  async updateFundingWithMoreInputs(
    utxos: Utxo[],
    f: FundingRequest,
    utxoValueSum: number
  ) {
    console.log(
      `Not enough funds sent for funding request ${f.id}, Expected: ${f.amount}, Got `
    );

    let outdatedFunding = new OutdatedFunding(f);
    this.outdatedFundingManager.storeOutdatedFunding(outdatedFunding);

    //create new payment objs
    let payments = utxos.map((u) => {
      return new Payment(f.id, u.txid, u.value);
    });

    //add new payments to db
    await this.paymentManager.tryAddPayments(payments);

    let mintRequest = await this.getMintRequestById(f.mintRequestId);

    if (!mintRequest) {
      console.log(
        `Could not locate mint request when calculating new fee for funding ${f.id}`
      );
      return;
    }

    //calculate new fee amount
    let newFundingAmount =
      getFeeEstimateOfCommitAndRevealForInscriptionBasedOnWitnessSizeInHex(
        mintRequest.inscriptionContentType,
        mintRequest.inscriptionHex.length,
        mintRequest.feerate,
        utxos.length + 1
      ) + SERVICE_FEE;

    console.log(
      `Mint ${mintRequest.id} needs ${
        newFundingAmount - utxoValueSum
      } sats sent to ${f.fundingAddress}`
    );

    //update funding with new cost
    this.fundingManager.updateFundingById(f.id, {
      amount: newFundingAmount,
      numInputs: utxos.length + 1,
      fundingStatus: FundingStatus.INCOMPLETE,
    });
  }

  async createInscription(f: FundingRequest) {
    let mintRequest: MintRequest | null = await this.getMintRequestById(
      f.mintRequestId
    );

    if (!mintRequest) {
      console.log(`mint request is undefined for id ${f.mintRequestId}`);
      return;
    }

    console.log(`Processing mint request ${mintRequest.id}`);

    await this.updateFunding(f.id, FundingStatus.CONFIRMED);

    await this.transactionManager.createAndBroadcastInscriptionTxs(
      mintRequest,
      f
    );

    console.log("Finished");
    await this.updateFunding(f.id, FundingStatus.COMPLETED);
  }

  async checkFundingStatus() {
    // console.log(`Running job on: ${new Date().toString()}`);

    let fundingRequests: FundingRequest[] = await this.getFundingRequests();

    for (let i = 0; i < fundingRequests.length; i++) {
      let f = fundingRequests[i];
      if (f.fundingStatus == FundingStatus.COMPLETED) {
        continue;
      }

      if (f.fundingStatus != FundingStatus.CONFIRMED) {
        if (!(await this.isFundingRequestPaid(f))) {
          continue;
        }
      }

      await this.createInscription(f);
    }

    setTimeout(() => {
      try {
        this.checkFundingStatus();
      } catch (e) {
        console.error(e);
      }
    }, this.interval);
  }
}

// runJob();
