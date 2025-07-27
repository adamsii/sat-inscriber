import { LocalStorage } from "node-localstorage";
import { MAX_LOCAL_STORAGE_SIZE_IN_MB } from "./config";

let maxLocalStorageSizeInMb = parseInt(MAX_LOCAL_STORAGE_SIZE_IN_MB || "5");

if (isNaN(maxLocalStorageSizeInMb)) {
  console.log("Max local storage size is invalid.");
  maxLocalStorageSizeInMb = 5;
}

console.log(`Setting LocalStorage size to ${maxLocalStorageSizeInMb}mb\n`);

let localStorage: any = new LocalStorage(
  "./db",
  maxLocalStorageSizeInMb * 1024 * 1024
);

export default localStorage;
