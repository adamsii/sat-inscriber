import MintRequest from "../models/MintRequest";

export default interface IMintStorage {
  storeMintRequest(MintRequest): Promise<void>;
  getAllMintRequests(): Promise<MintRequest[]>;
  getMintById(id: number): Promise<MintRequest | null>;
}
