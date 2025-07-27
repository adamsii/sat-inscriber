let id = (x) => document.getElementById(x);

function setDomValue(elementId, value) {
  let element = id(elementId);
  element.innerHTML = value;
}
