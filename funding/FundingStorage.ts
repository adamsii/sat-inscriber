import FundingRequest from "./models/FundingRequest";
import localStorage from "../LocalStorage";
import { FundingStatus } from "./models/FundingStatus";

const MIGRATIONS: { [key: string]: Function } = {
  "Change funding storage to use funding status instead of funded": (
    fundingStorage: any[]
  ) => {
    fundingStorage.forEach((f) => {
      if (f.funded == undefined) {
        return;
      }

      let funded: boolean = f.funded;
      delete f.funded;

      if (funded) {
        f.fundingStatus = FundingStatus.COMPLETED;
      } else {
        f.fundingStatus = FundingStatus.PENDING;
      }
    });
  },
};

export default class FundingStorage {
  storage: FundingRequest[];
  TABLE_NAME = "funding";

  constructor() {
    this.storage = JSON.parse(localStorage.getItem(this.TABLE_NAME)) || [];
    this.runMigrations();
  }

  runMigrations() {
    for (let migrationName of Object.keys(MIGRATIONS)) {
      console.log(`Running migration '${migrationName}'...`);
      try {
        MIGRATIONS[migrationName](this.storage);
        console.log("Migration completed successfully");
      } catch (e) {
        console.log(`Migration failed with error: ${e}`);
        console.log("Cancelling the rest of the migrations");
        //Return so save doesn't get run
        return;
      }
    }

    this.save();
  }

  save() {
    localStorage.setItem(this.TABLE_NAME, JSON.stringify(this.storage));
  }

  async getAllFundingRequests(fromDate?: Date): Promise<FundingRequest[]> {
    return this.storage.filter((f) => {
      if (f.createdAt && fromDate && new Date(f.createdAt) < fromDate) {
        return false;
      }

      return true;
    });
  }

  async getFundingById(id: number) {
    return this.storage.find((i: any) => i.id == id);
  }

  async getFundingByMintId(id: number): Promise<FundingRequest | undefined> {
    return this.storage.find((i: FundingRequest) => i.mintRequestId == id);
  }

  async store(fundingRequest: FundingRequest): Promise<void> {
    this.storage.push(fundingRequest);
    this.save();
  }

  updateFundingById(id: any, updatedProperties: Object) {
    this.storage.forEach((i: any) => {
      if (i.id != id) return;
      Object.assign(i, updatedProperties);
    });

    this.save();
  }
}
