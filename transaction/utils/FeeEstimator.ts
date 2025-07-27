import varuint from "varuint-bitcoin";
import { fileExtensionToHexMarker } from "../../utils";
export let FeeEstimationConstants = {
  TAPROOT_INPUT_SIZE: 41,
  // push byte plus the 64-byte signature will make the witness (1 + 64) = 65 bytes
  TAPROOT_KEY_SPEND_WITNESS_SIZE: 65,
};

const CONTOL_BLOCK_LENGTH = 33;

function byteEstimateForTaprootTransaction(
  inputSize: number,
  combinedWitnessSizeOfAllInputs: number,
  outputSize: number = 1
): number {
  return (
    6 + // HEADER INFO (4 version bytes + 1 empty vector  + 1 byte for flag)
    varuint.encodingLength(inputSize) + // Input size should be 1 bytes (input length shouldn't be too long)
    41 * inputSize + // 40 is 32 byte txid + 4 byte outpoint + 1 for empty scriptsig + 4 byte sequence
    // count bytes needed for encoding of length of outputs
    varuint.encodingLength(outputSize) +
    // 8 bytes for amount
    // 1 byte for size of vec
    // 1 byte for witness version push and 1 byte for OP_PUSHBYTES_32
    // 32 for the 32 byte taproot witness program
    // REF: https://github.com/bitcoin/bitcoin/blob/fdd363ebd917e5916742587608d59023ced513e1/src/serialize.h#L752
    (8 + 1 + 2 + 32) * outputSize + // 1 output
    // if it has a witness then add the witness from the input
    // varuint encode the size of the vec of stack items,
    // then encode the size each individual stack item along with their respective bytes
    combinedWitnessSizeOfAllInputs +
    4 // locktime
  );
}

export function getTaprootTransactionVirtualSize(
  inputSize: number,
  combinedWitnessSizeOfAllInputs: number,
  outputSize: number
): number {
  console.log("combinedWitnessSizeOfAllInputs", combinedWitnessSizeOfAllInputs);
  let transactionSizeWithoutWitness = byteEstimateForTaprootTransaction(
    inputSize,
    0,
    outputSize
  );

  let transactionSizeWithWitness = byteEstimateForTaprootTransaction(
    inputSize,
    combinedWitnessSizeOfAllInputs,
    outputSize
  );

  //Subtract 2 from transactionSizeWithoutWitness to remove dummy and flag.
  let transactionVirtualSize =
    ((transactionSizeWithoutWitness - 2) * 3 + transactionSizeWithWitness) / 4;

  console.log("Virtual size", transactionVirtualSize);

  return transactionVirtualSize;
}

export function getTaprootTransactionFee(
  inputSize: number,
  combinedWitnessSizeOfAllInputs: number,
  outputSize: number,
  feerate: number = 1
): number {
  console.log("combinedWitnessSizeOfAllInputs", combinedWitnessSizeOfAllInputs);

  let transactionVirtualSize = getTaprootTransactionVirtualSize(
    inputSize,
    combinedWitnessSizeOfAllInputs,
    outputSize
  );

  let fee = feerate * transactionVirtualSize;
  return Math.ceil(fee);
}

export function getFeeEstimateOfCommitAndRevealForInscriptionBasedOnWitnessSizeInHex(
  inscriptionContentType: string,
  witnessSizeInHex: number,
  feerate: number,
  customCommitTransactionInputNumber?: number
) {
  const TARGET_POSTAGE = 10_000;

  let ordContentTypeHex = fileExtensionToHexMarker(inscriptionContentType);

  let inscriptionHexSizeInBytes: number = witnessSizeInHex / 2;
  let witnessSize =
    113 +
    //content type
    ordContentTypeHex.length / 2 +
    inscriptionHexSizeInBytes +
    // (* 2) for OP_PUSHDATA2
    Math.ceil((inscriptionHexSizeInBytes / 520) * 2) +
    //size of control block included
    CONTOL_BLOCK_LENGTH;

  console.log("Estimated witness size for reveal tx", witnessSize);

  let revealFee = getTaprootTransactionFee(1, witnessSize, 1, feerate);

  console.log("Reveal fee", revealFee);

  customCommitTransactionInputNumber = customCommitTransactionInputNumber || 1;

  let commitFee = getTaprootTransactionFee(
    customCommitTransactionInputNumber, //num utxo from user
    customCommitTransactionInputNumber *
      FeeEstimationConstants.TAPROOT_KEY_SPEND_WITNESS_SIZE + 1,
    2, // One to fund reveal, one for service fee
    feerate
  );
  console.log("Commit fee", commitFee);

  return Math.ceil(revealFee + commitFee + TARGET_POSTAGE);
}