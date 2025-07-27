import InMemoryStorage from "../common/InMemoryStorage";
import OutdatedFunding from "./models/OutdatedFunding";

export default class OutdatedFundingStorage extends InMemoryStorage {
  // eslint-disable-line
  declare storage: OutdatedFunding[];

  constructor() {
    super("outdated_funding");
  }

  store(outdatedFunding: OutdatedFunding) {
    this.storage.push(outdatedFunding);
    this.save();
  }
}
