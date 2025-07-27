import FundingRequest from "../../funding/models/FundingRequest";
import { getRandomUInt64 } from "../../utils";

export default class OutdatedFunding{
    id: number;
    fundingId: number;
    fundingRequest: FundingRequest;
    createdAt: Date;

    constructor(fundingRequest: FundingRequest){
        this.id = getRandomUInt64();
        this.fundingId = fundingRequest.id;
        this.fundingRequest = fundingRequest;
        this.createdAt = new Date();
    }
}