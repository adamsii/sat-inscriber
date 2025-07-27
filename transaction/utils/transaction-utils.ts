import * as ecc from "tiny-secp256k1";
import * as bitcoinjs from "bitcoinjs-lib";
import ECPairFactory from "ecpair";

const ECPair = ECPairFactory(ecc);
bitcoinjs.initEccLib(ecc);

export const toXOnly = (publicKey: Buffer) =>
  publicKey.length === 32 ? publicKey : publicKey.subarray(1, 33);

// Taken from Bitcoinjs
export function tweakSigner(
  signer: bitcoinjs.Signer,
  opts: any = {}
): bitcoinjs.Signer {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!;
  if (!privateKey) {
    throw new Error("Private key is required for tweaking signer!");
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey);
  }

  const tweakedPrivateKey = ecc.privateAdd(
    privateKey,
    tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
  );
  if (!tweakedPrivateKey) {
    throw new Error("Invalid tweaked private key!");
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  });
}

export function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return bitcoinjs.crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  );
}
