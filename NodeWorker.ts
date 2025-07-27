import fetch from "node-fetch";

let urls = {
  regtest: "http://localhost:9999",
};

const API_KEY = "709c19d6-20a3-4e1e-96c8-5abe069a0238";
const INTERVAL = 5000;

const enum FundingStatus {
  PENDING = "PENDING",
  INCOMPLETE = "INCOMPLETE",
  UNCONFIRMED = "UNCONFIRMED",
  ONE_CONFIRMATION = "ONE_CONFIRMATION",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
}

interface Utxo {
  status: any;
  txid: string;
  value: number;
  vout: number;
}

export async function getUtxos(address: string): Promise<Utxo[]> {
  // get utxos for this address
  let response = await fetch(`http://localhost:3000/address/${address}/utxo`);
  let utxos: Utxo[] = (await response.json()) as any;

  if (!utxos) {
    throw new Error("No utxos");
  }

  // return as many utxo ids and amounts as need to reach desired amount in param
  return utxos;
}

async function updateFunding(fundingId: number) {
  await fetch(
    `${urls.regtest}/funding/update/${fundingId}?apiKey=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fundingStatus: FundingStatus.UNCONFIRMED,
      }),
    }
  );
}

async function runJob() {
  //work with pagination
  console.log("Funding worker starting...");
  await checkFundingStatus();
}

let initial = true;
let lastDate: Date | undefined;

let fundingRequests: any[] = [];
async function getFundingRequests() {
  try {
    let fundingRequestResponse = await fetch(
      `${urls.regtest}/funding?apiKey=${API_KEY}&fromDate=${lastDate || ""}`
    );

    if (initial) {
      initial = false;
      lastDate = new Date();
    }

    let newFundingRequests: any[] = await fundingRequestResponse.json();

    fundingRequests.push(...newFundingRequests);

    return fundingRequests;
  } catch (e) {
    console.log(e);
  }
}

async function checkFundingStatus() {
  console.log(`Running job on: ${new Date().toString()}`);

  let fundingRequests: any[] | undefined = await getFundingRequests();

  if (!fundingRequests) {
    throw new Error("funding req were null");
  }

  for (let i = 0; i < fundingRequests.length; i++) {
    let f = fundingRequests[i];
    if (f.fundingStatus == FundingStatus.COMPLETED) {
      continue;
    }

    if (f.fundingStatus != FundingStatus.CONFIRMED) {
      if (!(await isFundingRequestPaid(f))) {
        continue;
      }
    }

    console.log(`Updating payment status on paid funding with id ${f.id}...`);
    await fetch(
      `${urls.regtest}/funding/inscription?apiKey=${API_KEY}&fundingId=${f.id}`
    );
  }

  setTimeout(() => {
    try {
      checkFundingStatus();
    } catch (e) {
      console.error(e);
    }
  }, INTERVAL);
}

async function updateFundingWithMoreInputs(
  utxos: any,
  f: any,
  utxoValueSum: any
) {
  await fetch(`${urls.regtest}/funding/update/inputs?apiKey=${API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      utxos: utxos,
      f: f,
      utxoValueSum: utxoValueSum,
    }),
  });
}

async function isFundingRequestPaid(f: any): Promise<boolean> {
  let utxos = await getUtxos(f.fundingAddress);

  if (!utxos || !utxos.length) {
    return false;
  }

  if (utxos.length > 1) {
    console.log(
      `More than one UTXO used for mint ${f.mintRequestId}, additional fee may be required`
    );
  }

  let utxoValueSum = utxos.reduce((s, u) => {
    return s + u.value;
  }, 0);

  if (utxoValueSum < f.amount) {
    if (utxos.length < (f.numInputs || 1)) {
      console.log("Waiting on more inputs");
      return false;
    }

    await updateFundingWithMoreInputs(utxos, f, utxoValueSum);
    return false;
  }

  if (!utxos.every((u) => u.status.confirmed)) {
    console.log("Utxo not confirmed");
    await updateFunding(f.id);
    return false;
  }

  return true;
}

runJob();
