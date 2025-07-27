import { MAX_INT_32, MAX_UINT_32 } from "./constants";

export function getRandomUInt32() {
  return Math.floor(Math.random() * MAX_UINT_32);
}

export function getRandomUInt31() {
  //Using MAX_INT_32 because the extra bit is just used for signing (so max is uint31)
  return Math.floor(Math.random() * MAX_INT_32);
}

export function getRandomUInt64() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

//ORD

export function fileExtensionToHexMarker(fileExtension: string) {
  let x = {
    json: "application/json",
    pdf: "application/pdf",
    //...
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    //...
    txt: "text/plain;charset=utf-8",
  }[fileExtension];

  if (!x) {
    throw new Error(`Unsupported content type: ${x}`);
  }

  return asciiToHex(x);
}

export function extensionToContentTypeAscii(fileExtension: string) {
  let x = {
    json: "application/json",
    pdf: "application/pdf",
    //...
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    //...
    txt: "text/plain;charset=utf-8",
  }[fileExtension];

  if (!x) {
    throw new Error(`Unsupported content type: ${x}`);
  }

  return x;
}

function asciiToHex(s: string) {
  return s
    .split("")
    .map((c) => c.charCodeAt(0).toString(16))
    .join("");
}

export function throwIfNullOrUndefined(value: any, valueName: string) {
  if (value == undefined || value === null) {
    throw new Error(`${valueName} is null or undefined`);
  }
}
