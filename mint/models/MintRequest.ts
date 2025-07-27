import { getRandomUInt64, throwIfNullOrUndefined } from "../../utils";
import { getAddressInfo } from "bitcoin-address-validation";

export default class MintRequest {
  id: number;
  sub: string;
  destinationAddress: string;
  inscriptionHex: string;
  inscriptionContentType: string;

  //These are populated server-side
  feerate: number;
  createdAt: Date;

  constructor({
    sub,
    destinationAddress,
    inscriptionBase64,
    inscriptionContentType,
    feerate,
  }: {
    sub: string;
    destinationAddress: string;
    inscriptionBase64: string;
    inscriptionContentType: string;
    feerate: number;
  }) {
    throwIfNullOrUndefined(sub, Object.keys({ sub })[0]);
    throwIfNullOrUndefined(
      destinationAddress,
      Object.keys({ destinationAddress })[0]
    );
    throwIfNullOrUndefined(
      inscriptionBase64,
      Object.keys({ inscriptionBase64 })[0]
    );
    throwIfNullOrUndefined(
      inscriptionContentType,
      Object.keys({ inscriptionContentType })[0]
    );
    throwIfNullOrUndefined(feerate, Object.keys({ feerate })[0]);

    this.id = getRandomUInt64();
    this.sub = sub;

    let addressInfo = getAddressInfo(destinationAddress);

    if (addressInfo.type != "p2tr") {
      throw new Error("Support is currently limited to P2TR addresses");
    }

    this.destinationAddress = destinationAddress;

    inscriptionBase64 = inscriptionBase64.split(",")[1];
    let inscriptionBuffer = Buffer.from(inscriptionBase64, "base64");
    this.inscriptionHex = inscriptionBuffer.toString("hex");

    this.inscriptionContentType = inscriptionContentType?.toLowerCase();
    this.feerate = feerate;
    this.createdAt = new Date();
  }

  sample() {
    return {
      sub: "deec8672-0dc2-4ce8-8708-db21ba61174c",
      destinationAddress: "",
      inscriptionHex: "",
      feerate: 0,
      fundingAddress: "",
      fundingAddressDerivationPath: "",
    };
  }
}
