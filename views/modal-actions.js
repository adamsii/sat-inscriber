const FundingStatus = {
  PENDING: "PENDING",
  UNCONFIRMED: "UNCONFIRMED",
  ONE_CONFIRMATION: "ONE_CONFIRMATION",
  INCOMPLETE: "INCOMPLETE",
  COMPLETED: "COMPLETED",
};


function satsToBtc(amountSats) {
  return amountSats / 100_000_000;
}

let MODAL_STATE = {
  INVOICE: "INVOICE",
  HEX: "HEX",
};

let modalScreen = MODAL_STATE.INVOICE;
let mintState;

function highlightStateLabel(selectedOption) {
  let modalOptions = document.getElementsByClassName("modal-options")[0];
  Array.from(modalOptions.children).forEach((c) => {
    c.classList.remove("modal-option-selected");
  });

  selectedOption.classList.add("modal-option-selected");
}

let paymentTimeoutId;
function renderModalScreen(newModalScreen, event) {
  modalScreen = newModalScreen;
  let modalBody = document.getElementById("modal-body");

  switch (modalScreen) {
    case MODAL_STATE.INVOICE:
      modalBody.innerHTML = `
      <p class="modal-subtext">
        Please pay the full amount in one payment. If a partial payment is made,
        the invoice will be updated to reflect the new amount in fees required to
        create your inscription transaction.
      </p>

      <div class="payment-details">
        <h1>Payment Address</h1>
        <p id="payment-address"></p>
      </div>
      <div class="payment-details">
        <h1>Payment Amount</h1>
        <p id="payment-amount"></p>
      </div>

      <div id="invoice-ctn">
        <div id="invoice"></div>
      </div>

      <div id="payment-status" class="payment-status pending-payment-status">
        <p id="payment-status-message">Waiting for payment</p>
      </div>
      `;
      populateModalInformation(mintState);
      clearTimeout(paymentTimeoutId);
      paymentTimeoutId = waitForPayment(mintState.mintId);
      break;
    case MODAL_STATE.HEX:
      modalBody.innerHTML = `
      <p class="modal-subtext">
        Coming soon
      </p>`;
      break;
    default:
      throw new Error(`Invalid modal state: ${modalScreen}`);
  }

  if (event) {
    highlightStateLabel(event.target);
  }
}

function addModalToDom() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-ctn">
  <div id="modal" class="modal">
    <div class="modal-header">
      <h1 class="modal-title">Your mint request has been submitted</h1>
      <p class="modal-text">
        Please pay the invoice below to fund your inscription
      </p>
    </div>
    <div class="modal-options">
      <p onclick="renderModalScreen('${MODAL_STATE.INVOICE}', event)" class="modal-option-selected">Invoice</p>
      <p onclick="renderModalScreen('${MODAL_STATE.HEX}', event)">Hex</p>
    </div>
    <div id="modal-body">
    </div>
    
  </div>
</div>`
  );

  renderModalScreen(MODAL_STATE.INVOICE);
}


function openModal(mintResponse) {
  if(this.modalOpen) {
    return;
  }

  mintState = mintResponse;
  addModalToDom();
  this.modalOpen = true;
}

function populateModalInformation({
  fundingAddress,
  amount,
  fundingStatus,
  amountPaid,
}) {
  let paymentAddress = document.getElementById("payment-address");

  paymentAddress.innerHTML = fundingAddress;

  let finalAmount =
    fundingStatus == FundingStatus.INCOMPLETE ? amount - amountPaid : amount;

  let paymentAmount = document.getElementById("payment-amount");
  paymentAmount.innerHTML = `${finalAmount} sats | ${satsToBtc(
    finalAmount
  )} BTC`;

  displayInvoice(
    `bitcoin:${fundingAddress}?amount=${satsToBtc(
      finalAmount
    )}&label=SatInscriber`
  );
}

function displayInvoice(bitcoinUri) {
  new QRCode(document.getElementById("invoice"), {
    width: 150,
    height: 150,
    text: bitcoinUri,
  });
}

async function getMint(mintId) {
  let sub = localStorage.getItem("sub");
  let response = await fetch(`/mint/sub/${sub}/${mintId}`);
  let mintResponse = await response.json();
  return mintResponse;
}

async function waitForPayment(mintId) {
  let mintResponse = await getMint(mintId);

  if (mintResponse.fundingStatus == "PENDING") {
    return setTimeout(waitForPayment.bind(this, mintId), 5000);
  }

  let paymentStatus = document.getElementById("payment-status");
  paymentStatus.classList.remove("pending-payment-status");

  paymentStatus.insertAdjacentHTML(
    "afterend",
    `
    <a href="/mint/${mintResponse.mintId}/details">
      <button class="button modal-button">View Details</button>
    </a>
  `
  );

  paymentStatus.remove();
}
