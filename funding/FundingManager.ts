import MintRequest from "../mint/models/MintRequest";
import { getFeeEstimateOfCommitAndRevealForInscriptionBasedOnWitnessSizeInHex } from "../transaction/utils/FeeEstimator";
import FundingRequest from "./models/FundingRequest";
import FundingStorage from "./FundingStorage";
import { SERVICE_FEE } from "../config";
import { FundingStatus } from "./models/FundingStatus";

export default class FundingManager {
  fundingStorage: FundingStorage;

  constructor(fundingStorage: FundingStorage) {
    this.fundingStorage = fundingStorage;
  }

  getFundingById(id: number) {
    return this.fundingStorage.getFundingById(id);
  }

  getFundingByMintId(id: number) {
    return this.fundingStorage.getFundingByMintId(id);
  }

  async getAllFundingRequests(fromDate?: Date): Promise<any> {
    return this.fundingStorage.getAllFundingRequests(fromDate);
  }

  updateFundingStatusById(id: number, fundingStatus: FundingStatus) {
    this.fundingStorage.updateFundingById(id, {
      fundingStatus: fundingStatus,
    });
  }

  updateFundingById(id: number, fundingUpdate: any) {
    this.fundingStorage.updateFundingById(id, fundingUpdate);
  }

  async createFundingRequest(mintRequest: MintRequest) {
    let totalInscriptionFee =
      getFeeEstimateOfCommitAndRevealForInscriptionBasedOnWitnessSizeInHex(
        mintRequest.inscriptionContentType,
        mintRequest.inscriptionHex.length,
        mintRequest.feerate
      );

    let fundingRequest = new FundingRequest(
      mintRequest.id,
      totalInscriptionFee + SERVICE_FEE
    );

    this.fundingStorage.store(fundingRequest);

    return fundingRequest;
  }
}
