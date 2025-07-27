function getContentTypeByteLength() {
  let contentType = getInscriptionType();

  //Default is 24 because it's the largest of supported file types (text/plain;charset=utf-8)
  return (
    {
      jpeg: 10,
      jpg: 10,
      png: 9,
      txt: 24,
    }[contentType] || 24
  );
}

function getRevealWitnessSize(hexByteLength) {
  return (
    144 +
    getContentTypeByteLength() +
    hexByteLength +
    Math.ceil(hexByteLength / 520) * 2
  );
}

function getRevealVirtualSize(hexByteLength) {
  let revealSizeBase = 96;
  let witnessSize = getRevealWitnessSize(hexByteLength);

  return (revealSizeBase * 3 + (revealSizeBase + witnessSize)) / 4;
}

async function getPrice() {
  // https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
  let response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
  );
  let priceResponse = await response.json();
  return priceResponse.bitcoin.usd;
}
