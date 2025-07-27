import OutdatedFunding from "./models/OutdatedFunding";
import OutdatedFundingStorage from "./OutdatedFundingStorage";

export default class OutdatedFundingManager {
  outdatedFundingStorage: OutdatedFundingStorage;

  constructor(outdatedFundingStorage: OutdatedFundingStorage) {
    this.outdatedFundingStorage = outdatedFundingStorage;
  }

  storeOutdatedFunding(outdatedFunding: OutdatedFunding) {
    this.outdatedFundingStorage.store(outdatedFunding);
  }
}
