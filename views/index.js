let id = (x) => document.getElementById(x);

function setFee(speed, feerate) {
  id(`${speed}-feerate`).innerHTML = `${feerate} sats/vByte`;
  id(`${speed}-fee-radio`).value = feerate;
}

// FILE TYPE

function getInscriptionType() {
  let fileInput = document.getElementById("inscription-content");
  let file = fileInput.files[0];

  if (!file) {
    console.log("No file was found in file input");
    return null;
  }

  fileNameComponents = file.name?.split(".");

  if (!fileNameComponents?.length) {
    console.log("No extension could be found");
  }

  return fileNameComponents[fileNameComponents.length - 1];
}

// FILE

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

function getFileSize() {
  let fileInput = document.getElementById("inscription-content");
  let file = fileInput.files[0];

  if (!file) {
    return 0;
  }

  return file.size;
}

async function getFileBase64() {
  let fileInput = document.getElementById("inscription-content");
  let file = fileInput.files[0];

  if (!file) {
    return null;
  }

  document.getElementById("file-name").innerHTML = file.name;
  return toBase64(file);
}

// FEERATE

function getFeerateSelection() {
  return document.querySelector('input[name="feerate-selection"]:checked')
    ?.value;
}

// DESTINATION

function getDestinationAddress() {
  return document.getElementById("destination-address").value;
}

// ERRORS

function setFileError(error) {
  let el = id("file-error");

  if (!error) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }

  el.innerHTML = error;
  el.classList.remove("hidden");
}

function setAddressError(error) {
  let el = id("address-error");

  if (!error) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }

  el.innerHTML = error;
  el.classList.remove("hidden");
}

function setFeeError(error) {
  let el = id("fee-error");

  if (!error) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }

  el.innerHTML = error;
  el.classList.remove("hidden");
}
