import IMintStorage from "./interfaces/IMintStorage";
import MintRequest from "./models/MintRequest";
import localStorage from "../LocalStorage";

export default class MintStorage implements IMintStorage {
  storage: MintRequest[];
  TABLE_NAME = "mint";

  constructor() {
    let arr: MintRequest[] = JSON.parse(localStorage.getItem(this.TABLE_NAME) || "[]")
    this.storage = arr|| [];
  }

  save() {
    localStorage.setItem(this.TABLE_NAME, JSON.stringify(this.storage));
  }

  async getAllMintRequests(): Promise<MintRequest[]> {
    return Promise.resolve(this.storage);
  }

  async getMintById(id: number): Promise<MintRequest | null> {
    for (let mintRequest of this.storage) {
      if (id == mintRequest.id) {
        return Promise.resolve(mintRequest);
      }
    }
    return Promise.resolve(null);
  }

  async storeMintRequest(mintRequest: MintRequest): Promise<void> {
    this.storage.push(mintRequest);
    this.save();
    return Promise.resolve();
  }

  async getMintsBySub(sub: string): Promise<MintRequest[]> {
    let chosen: any[] = [];

    for (let mintRequest of this.storage) {
      if (sub == mintRequest.sub) {
        chosen.push(mintRequest);
      }
    }

    return Promise.resolve(chosen);
  }
}
