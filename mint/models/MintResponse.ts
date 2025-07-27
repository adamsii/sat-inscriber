import FundingRequest from "../../funding/models/FundingRequest";
import { FundingStatus } from "../../funding/models/FundingStatus";
import BitcoinTransaction from "../../transaction/models/BitcoinTransaction";
import MintRequest from "./MintRequest";
import { extensionToContentTypeAscii } from "../../utils";
export default class MintResponse {
  amount: number;
  amountPaid: Number | undefined;
  commitTxId: string | undefined;
  contentType: string;
  createdAt: Date;
  feerate: number;
  fundingAddress: string;
  fundingStatus: FundingStatus;
  mintId: number;
  revealTxId: string | undefined;

  constructor(
    mintRequest: MintRequest,
    fundingRequest: FundingRequest,
    commitTxId?: string,
    revealTxId?: string,
    amountPaid?: number
  ) {
    this.mintId = mintRequest.id;
    this.fundingStatus = fundingRequest.fundingStatus;
    this.createdAt = mintRequest.createdAt;
    this.feerate = mintRequest.feerate;
    this.fundingAddress = fundingRequest.fundingAddress;
    this.amount = fundingRequest.amount;
    this.amountPaid = amountPaid;
    this.contentType = extensionToContentTypeAscii(
      mintRequest.inscriptionContentType
    );

    this.commitTxId = commitTxId;
    this.revealTxId = revealTxId;
  }
}
