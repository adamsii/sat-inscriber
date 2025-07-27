import localStorage from "../LocalStorage";
import { throwIfNullOrUndefined } from "../utils";

export default class InMemoryStorage {
  protected storage: any[];
  TABLE_NAME: string;

  constructor(tableName: string) {
    throwIfNullOrUndefined(tableName, Object.keys({ tableName })[0]);

    this.TABLE_NAME = tableName;
    let arr: any[] = JSON.parse(localStorage.getItem(this.TABLE_NAME) || "[]");
    this.storage = arr || [];
  }

  save() {
    localStorage.setItem(this.TABLE_NAME, JSON.stringify(this.storage));
  }
}
