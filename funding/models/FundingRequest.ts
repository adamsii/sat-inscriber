import KeyManager from "../../keys/KeyManager";
import { getRandomUInt31, getRandomUInt64 } from "../../utils";
import * as bitcoinjs from "bitcoinjs-lib";
import { NETWORK } from "../../config";
import { FundingStatus } from "./FundingStatus";

export default class FundingRequest {
  id: number;
  mintRequestId: number;
  amount: number;
  fundingAddress: string;
  fundingAddressDerivationPath: string;
  fundingStatus: FundingStatus;
  numInputs: number | undefined;
  createdAt: Date;

  constructor(mintRequestId: number, amount: number) {
    this.id = getRandomUInt64();
    this.mintRequestId = mintRequestId;
    this.amount = amount;
    this.fundingAddressDerivationPath = this.getFundingAddressDerivationPath();
    this.fundingAddress = this.getAddressFromDerivationPath(
      this.fundingAddressDerivationPath
    );
    this.fundingStatus = FundingStatus.PENDING;
    this.createdAt = new Date();
  }

  private getFundingAddressDerivationPath() {
    /* This does *NOT* follow the pattern in BIP44 */

    let randomPath = "m";

    for (let i = 0; i < 5; i++) {
      let randomUInt32 = getRandomUInt31();
      randomPath += `/${randomUInt32}'`;
    }

    return randomPath;
  }

  private toXOnly = (publicKey: Buffer) =>
    publicKey.length === 32 ? publicKey : publicKey.slice(1, 33);

  private getAddressFromDerivationPath(
    fundingAddressDerivationPath: string
  ): string {
    let applicationKeypair = KeyManager.getApplicationKeypair();
    let derivedKeypair = applicationKeypair.derivePath(
      fundingAddressDerivationPath
    );

    // Create funding address from derived keypair
    const { address } = bitcoinjs.payments.p2tr({
      internalPubkey: this.toXOnly(derivedKeypair.publicKey),
      network: NETWORK,
    });

    return address!;
  }
}
