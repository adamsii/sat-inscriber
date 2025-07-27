import { BIP32Interface } from "bip32";
import * as ecc from "tiny-secp256k1";
import * as bitcoinjs from "bitcoinjs-lib";
import { coinselection } from "coinselection-ts";
import { Output } from "coinselection-ts/dist/types/output.type";
import {
  FeeEstimationConstants,
  getTaprootTransactionFee,
  getTaprootTransactionVirtualSize,
} from "./utils/FeeEstimator";
import { broadcastTransaction, getUtxos, Utxo } from "../clients/EsploraClient";
import MintRequest from "../mint/models/MintRequest";
import {
  MAINNET_CHANGE_ADDRESS,
  NETWORK,
  NETWORK_NAME,
  REGTEST_CHANGE_ADDRESS,
  SERVICE_FEE,
  TESTNET_CHANGE_ADDRESS,
} from "../config";
import KeyManager from "../keys/KeyManager";
import FundingRequest from "../funding/models/FundingRequest";
import { fileExtensionToHexMarker } from "../utils";
import { toXOnly, tweakSigner } from "./utils/transaction-utils";
import TransactionStorage from "./TransactionStorage";
import BitcoinTransaction from "./models/BitcoinTransaction";

bitcoinjs.initEccLib(ecc);

const ERRORS = {
  INSCRIPTION_DATA_IS_EMPTY: "Inscription data is empty",
};

const TAPROOT_DUST_LIMIT = 380;
const MAX_BYTE_SIZE = 520;
const ORD_PROTOCOL_ID = "6f7264";
const CONTENT_TYPE_MARKER = "01";

export default class TransactionManager {
  transactionStorage: TransactionStorage;

  constructor(transactionStorage: TransactionStorage) {
    this.transactionStorage = transactionStorage;
  }

  private getChangeAddress(networkName: string): string {
    let changeAddress = {
      regtest: REGTEST_CHANGE_ADDRESS,
      testnet: TESTNET_CHANGE_ADDRESS,
      mainnet: MAINNET_CHANGE_ADDRESS,
    }[networkName];

    if (!changeAddress) {
      throw new Error(
        `No change address configured for network ${NETWORK_NAME}`
      );
    }

    return changeAddress;
  }

  private async generateInscriptionScriptFromFileHex(
    publicKey: Buffer,
    contentTypeHex: string,
    fileHex: string
  ): Promise<string> {
    if (!fileHex?.length) {
      throw new Error(ERRORS.INSCRIPTION_DATA_IS_EMPTY);
    }

    let lockingScript = `${toXOnly(publicKey).toString("hex")} OP_CHECKSIG`;

    /****Every string added must start with a space****/

    // Add protocol id
    lockingScript += ` OP_FALSE OP_IF ${ORD_PROTOCOL_ID}`;

    // Add content type
    // Can't push 01 with bitcoin-js's fromASM so CONTENT_TYPE_MARKER not used for now
    // It uses '11' which is a placeholder for '01'. It's replaced in createOutputAddress
    lockingScript += ` 11 ${contentTypeHex}`;

    // Add inscription data

    // 2 * MAX_BYTE_SIZE because 2 characters make up a byte in hex
    let regexChunker = new RegExp(`.{1,${2 * MAX_BYTE_SIZE}}`, "g");
    let chunks = fileHex.match(regexChunker);

    lockingScript += ` OP_0 ${chunks!.join(" ")}`;

    // Finish script with endif
    lockingScript += ` OP_ENDIF`;

    return lockingScript;
  }

  private createOutputAddressForRevealTransaction(
    lockingScript: string,
    internalKeypair: BIP32Interface
  ) {
    const leafScript = bitcoinjs.script.fromASM(lockingScript);

    // Hack to bypass bitcoinjs's limitation of only being able to push values greater than OP_16
    leafScript[41] = parseInt(CONTENT_TYPE_MARKER);

    const scriptTree = {
      output: leafScript,
    };

    const redeem = {
      output: leafScript,
      redeemVersion: 192,
    };

    const { output, address, witness } = bitcoinjs.payments.p2tr({
      internalPubkey: toXOnly(internalKeypair.publicKey),
      scriptTree,
      redeem,
      network: NETWORK,
    });

    return {
      output,
      address,
      witness,
      redeem,
      scriptByteLength: witness?.reduce(
        (size, script) => size + script.length,
        0
      ) || 0,
    };
  }

  async createAndBroadcastInscriptionTxs(
    mintRequest: MintRequest,
    fundingRequest: FundingRequest
  ) {
    const internalKey = KeyManager.getApplicationKeypair().derivePath(
      fundingRequest.fundingAddressDerivationPath
    );

    // Create funding address
    const { output, address } = bitcoinjs.payments.p2tr({
      internalPubkey: toXOnly(internalKey.publicKey),
      network: NETWORK,
    });

    // get utxos from funding address
    let utxos = await getUtxos(address!);

    let commitTxInputs = fundingRequest.numInputs || 1;
    let commitTransactionFee = getTaprootTransactionFee(
      commitTxInputs,
      commitTxInputs * FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE + 1,
      2,
      mintRequest.feerate
    );

    let inscriptionScript = await this.generateInscriptionScriptFromFileHex(
      internalKey.publicKey,
      fileExtensionToHexMarker(mintRequest.inscriptionContentType),
      mintRequest.inscriptionHex
    );

    let addressResponse = this.createOutputAddressForRevealTransaction(
      inscriptionScript,
      internalKey
    );

    let revealTransactionFee = getTaprootTransactionFee(
      1,
      addressResponse.scriptByteLength +
      1 + //Witness stack size
      1 + //reveal script size
      1 + //control block size
        FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE,
      1,
      mintRequest.feerate
    );

    console.log("Reveal transaction witness size", addressResponse.scriptByteLength +
        FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE + 1)

    let outputs: Output[] = [
      {
        value: commitTransactionFee,
      },
      {
        value: revealTransactionFee + 10_000,
      },
      {
        value: SERVICE_FEE,
      },
    ];

    let inputUtxos = utxos.map((u: any) => {
      u.witness_utxo = {
        value: u.value,
        script: output!,
      };

      return u;
    });

    let chosen = coinselection(inputUtxos, outputs, 0, 0);

    let alreadyChosen: any = {};
    let chosenUtxos: (undefined | Utxo)[] = chosen!.inputs!.map((x) => {
      for (let i of utxos) {
        if (x.value == i.value && !alreadyChosen[i.txid as string]) {
          alreadyChosen[i.txid] = true;
          return i;
        }
      }
    });

    // Remove the output reserved for fee: chosen.outputs[0].value
    chosen?.outputs?.shift();

    let outputValues = chosen.outputs?.map((o) => o.value);

    if (!outputValues) {
      throw new Error(
        "Output values cannot be null when constructing the commit transaction"
      );
    }

    // Create tx spending from address
    const psbt = this.createUnfundedCommitPsbt(
      addressResponse.address!,
      outputValues
    );

    chosenUtxos?.forEach((c) => {
      psbt.addInput({
        hash: c!.txid,
        index: c!.vout,
        witnessUtxo: { value: c!.value, script: output! },
        tapInternalKey: toXOnly(internalKey.publicKey),
      });
    });

    if (chosenUtxos.length == 0) {
      console.log(`Could not find enough utxos to fund output`);
    }

    const tweakedSigner = tweakSigner(internalKey!, { network: NETWORK });
    await Promise.all(
      psbt.data.inputs.map(async (_, index) => {
        return psbt.signInputAsync(index, tweakedSigner);
      })
    );

    psbt.finalizeAllInputs();

    console.log(psbt.extractTransaction().toHex());
    console.log("Done");

    console.log("Broadcasting commit tx...");
    let txid = await broadcastTransaction(psbt);
    console.log("Broadcast response:", txid);

    let numInputs = fundingRequest.numInputs || 1;

    // STORE TRANSACTION
    let commitTransactionvSize = getTaprootTransactionVirtualSize(
      numInputs,
      numInputs * FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE + 1,
      2
    );

    console.log(
      `Commitment Tx: Actual vSize: ${commitTransactionvSize}, Expected vSize: ${psbt
        .extractTransaction()
        .virtualSize()}\n\n`
    );

    //FIRE & FORGET
    this.transactionStorage.storeTransaction(
      new BitcoinTransaction({
        mintRequestId: mintRequest.id,
        txid: txid,
        feeSats: commitTransactionFee,
        virtualSize: commitTransactionvSize,
        type: "commit",
      })
    );

    return this.createAndBroadcastRevealTransaction(
      internalKey,
      addressResponse,
      mintRequest,
      txid,
      revealTransactionFee
    );
  }

  public createUnfundedCommitPsbt(
    destinationAddress: string,
    outputValues: number[]
  ): bitcoinjs.Psbt {
    let psbt = new bitcoinjs.Psbt({ network: NETWORK });

    // REVEAL TX FUNDING UTXO
    psbt.addOutput({
      address: destinationAddress,
      value: outputValues[0],
    });

    // SERVICE FEE
    psbt.addOutput({
      address: this.getChangeAddress(NETWORK_NAME),
      value: outputValues[1],
    });

    // The second part of the condition was added because there might be a 1 byte discrepancy between
    // my fee estimation and the actual fee calculation due to this file using the appropriate
    // op push codes for inscription data (which could be pushdata1 in some cases) and my estimation using
    // pushdata2 by default
    if (outputValues[2]) {
      if (outputValues[2] < TAPROOT_DUST_LIMIT) {
        console.log(
          `The excess Bitcoin cannot be used as an output, ${outputValues[2]} sats exceeds the taproot dust threshold of ${TAPROOT_DUST_LIMIT}`
        );
      } else {
        console.log(
          `Adding extra output of ${outputValues[2]}. Is there an error in the fee calculation?`
        );
        // CHANGE
        psbt.addOutput({
          address: this.getChangeAddress(NETWORK_NAME),
          value: outputValues[2],
        });
      }
    }

    return psbt;
  }

  private async createAndBroadcastRevealTransaction(
    internalKey: any,
    addressResponse: any,
    mintRequest: MintRequest,
    txid: string,
    revealTxFee: number
  ) {
    // Create tx spending from address
    let utxos = await getUtxos(addressResponse.address);

    // SPENDING
    let revealTxFundingUtxo = utxos.find((x) => x.txid == txid);

    if (!revealTxFundingUtxo) {
      console.log(
        "Commit transaction not found. Reveal transaction has no funding."
      );
      return null;
    }

    let psbt = new bitcoinjs.Psbt({ network: NETWORK });

    psbt.addInput({
      hash: revealTxFundingUtxo.txid,
      index: revealTxFundingUtxo.vout,
      witnessUtxo: {
        value: revealTxFundingUtxo.value,
        script: addressResponse!.output!,
      },
      tapInternalKey: toXOnly(internalKey.publicKey),
    });

    psbt.addOutput({
      address: mintRequest.destinationAddress,
      value: revealTxFundingUtxo!.value - revealTxFee, // the fee should be set as the value of the inscription
    });

    psbt.updateInput(0, {
      tapLeafScript: [
        {
          leafVersion: addressResponse.redeem.redeemVersion,
          script: addressResponse.redeem.output,
          controlBlock:
            addressResponse.witness![addressResponse!.witness!.length - 1],
        },
      ],
    });

    psbt.signInput(0, internalKey);

    psbt.finalizeAllInputs();

    console.log("\n\n\n");

    let finalTxid = await broadcastTransaction(psbt);
    console.log("Broadcast response:", finalTxid);

    // STORE TRANSACTION

    let revealVirtualSize = getTaprootTransactionVirtualSize(
      1,
      addressResponse.scriptByteLength +
        FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE + 1,
      1
    );

    //FIRE & FORGET
    this.transactionStorage.storeTransaction(
      new BitcoinTransaction({
        mintRequestId: mintRequest.id,
        txid: finalTxid,
        feeSats: revealTxFee,
        virtualSize: revealVirtualSize,
        type: "reveal",
      })
    );

    console.log("Done");
  }

  getAllTransactions() {
    return this.transactionStorage.getAllTransactions();
  }

  async getTransactionsByMintRequestId(
    mintRequestId: number
  ): Promise<BitcoinTransaction[] | undefined> {
    return this.transactionStorage.getTransactionsByMintRequestId(
      mintRequestId
    );
  }
}
