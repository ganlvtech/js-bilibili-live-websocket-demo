const WebSocket = require('ws');
const TextEncoder = require('util').TextEncoder;
const TextDecoder = require('util').TextDecoder;
const textEncoder = new TextEncoder('utf-8');
const textDecoder = new TextDecoder('utf-8');

function encode(str, op) {
  const data = textEncoder.encode(str);
  const packetLen = 16 + data.byteLength;
  const buf = Buffer.alloc(packetLen);
  buf.writeInt32BE(packetLen, 0);
  buf.writeInt16BE(16, 4); // Header Length
  buf.writeInt16BE(1, 6); // Protocol Version
  buf.writeInt32BE(op, 8); // Operation
  buf.writeInt32BE(1, 12); // Sequence Id
  buf.set(data, 16);
  return buf;
}

function decode(buf) {
  const result = {}
  result.packetLen = buf.readInt32BE(0);
  result.headerLen = buf.readInt16BE(4);
  result.ver = buf.readInt16BE(6);
  result.op = buf.readInt32BE(8);
  result.seq = buf.readInt32BE(12);
  if (result.op === 5) {
    result.body = [];
    let offset = 0;
    while (offset < buf.length) {
      const packetLen = buf.readInt32BE(offset + 0);
      const headerLen = buf.readInt16BE(offset + 4);
      const data = buf.slice(offset + headerLen, offset + packetLen);
      const body = JSON.parse(textDecoder.decode(data));
      result.body.push(body);
      offset += packetLen;
    }
  } else if (result.op === 3) {
    result.body = {
      count: buf.readInt32BE(16)
    };
  }
  return result;
}




// const ws = new WebSocket('ws://broadcastlv.chat.bilibili.com:2244/sub');
const ws = new WebSocket('wss://broadcastlv.chat.bilibili.com:2245/sub');

ws.on('open', function () {
  console.log('connected');

  ws.send(encode(JSON.stringify({
    uid: 0,
    roomid: 2029840
  }), 7));

  let heartTimerId = setInterval(function () {
    console.log('send heartbeat');
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(encode('', 2));
    } else {
      clearInterval(heartTimerId);
    }
  }, 30000);
});

ws.on('message', function (data) {
  data = decode(data);

  if (data.op === 5) {
    for (let i = 0; i < data.body.length; ++i) {
      const body = data.body[i];
      if (body.cmd === 'DANMU_MSG') {
        console.log(`${body.cmd} ${body.info[2][1]} ${body.info[1]}`);
      } else if (body.cmd === 'SEND_GIFT') {
        console.log(`${body.cmd} ${body.data.uname} ${body.data.action} ${body.data.num} ${body.data.giftName}`);
      } else if (body.cmd === 'WELCOME') {
        console.log(`${body.cmd} ${body.data.uname}`);
      } else {
        console.log(body);
      }
    }
  } else {
    console.log(data);
  }
});

ws.on('close', function () {
  console.log('disconnected');
});