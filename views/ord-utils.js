let opcodes = {
  OP_0: 0,
  OP_FALSE: 0,
  OP_IF: 0x63,
  OP_PUSHDATA1: 0x4c,
  OP_PUSHDATA2: 0x4d,
  OP_PUSHDATA4: 0x4e,
};

const HEX_BYTE_LEN = 2;
function parseWitness(s) {
  let cursor = 0;

  let pubkeyWithPushByte = s.substr(0, 66);
  cursor += 66;

  let checksig = s.substr(cursor, HEX_BYTE_LEN);
  cursor += 2;
  //ac

  const OP_FALSE = s.substr(cursor, HEX_BYTE_LEN);
  cursor += 2;
  //00

  const OP_IF = s.substr(cursor, HEX_BYTE_LEN);
  cursor += 2;
  //63

  const OP_PUSH = s.substr(cursor, HEX_BYTE_LEN);
  cursor += 2;
  //03

  const PROTOCOL_LENGTH = 6;
  const ORD_PROTOCOL_ID = s.substr(cursor, PROTOCOL_LENGTH);
  cursor += PROTOCOL_LENGTH;
  //6f7264

  let contentTypeMarker = getData(s);
  let contentType = getData(s);

  const op_0 = s.substr(cursor, HEX_BYTE_LEN);
  cursor += 2;

  let chunks = [];
  let chunk;
  while ((chunk = getData(s))) {
    chunks.push(chunk);
  }

  return {
    contentType,
    hexData: chunks.join(""),
  };

  function parseIntLE(str, base) {
    let regexChunker = new RegExp(`.{1,${2}}`, "g");
    let chunks = str.match(regexChunker);
    return parseInt(chunks.reverse().join(""), base);
  }

  function getData(s) {
    let opcode = parseInt(s.substr(cursor, HEX_BYTE_LEN), 16);
    cursor += 2;

    let nSize = 0;

    if (opcode <= opcodes.OP_PUSHDATA4) {
      if (opcode < opcodes.OP_PUSHDATA1) {
        nSize = opcode;
      } else if (opcode == opcodes.OP_PUSHDATA1) {
        nSize = parseIntLE(s.substr(cursor, HEX_BYTE_LEN), 16);
        cursor += HEX_BYTE_LEN;
      } else if (opcode == opcodes.OP_PUSHDATA2) {
        nSize = parseIntLE(s.substr(cursor, HEX_BYTE_LEN * 2), 16);
        cursor += HEX_BYTE_LEN * 2;
      } else {
        nSize = parseIntLE(s.substr(cursor, HEX_BYTE_LEN * 4), 16);
        cursor += HEX_BYTE_LEN * 4;
      }
    } else {
      //undo the read
      cursor -= 2;
      return null;
    }

    let ret = s.substr(cursor, nSize * 2);
    cursor += nSize * 2;
    return ret;
  }
}
