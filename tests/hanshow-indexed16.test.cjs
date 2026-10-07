const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let lastTimeout;
const context = { Uint8Array, console, setTimeout: (_callback, delay) => { lastTimeout = delay; return 1; }, clearTimeout: () => {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('httpdocs/js/hanshow-rgb-palettes.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('httpdocs/js/ble-common.js', 'utf8') + '\nglobalThis.BLE = OpenDisplayBLE;', context);
const ble = Object.create(context.BLE.prototype);
// Independent four-pixel diagnostic fixture, upper component then lower.
assert.deepEqual(Array.from(ble._packHanshowCodes(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]), 4, 2)), [0x55, 0x00, 0x1b, 0x1b]);
const allCodes = Array.from({length: 16}, (_, i) => i);
assert.deepEqual(Array.from(ble._packHanshowCodes(Uint8Array.from(allCodes), 16, 1)), [0x00, 0x55, 0xaa, 0xff, 0x1b, 0x1b, 0x1b, 0x1b]);
const map = [4, 5, 9, 13, 1, 6, 7, 0, 2, 3, 8, 10, 11, 12, 14, 15];
// Native asymmetric corners and two adjacent markers distinguish a transpose
// from every rotation, reflection, or the 266's reversed-row scan.
const corners154 = new Uint8Array(40000);
corners154[0] = 15;
corners154[1] = 5;
corners154[200] = 10;
corners154[199] = 12;
corners154[39800] = 3;
corners154[39999] = 6;
const expected154 = new Uint8Array(20000);
expected154[0] = 0xe0;
expected154[50] = 0x40;
expected154[9950] = 0xc0;
expected154[9999] = 0x01;
expected154[10000] = 0xe0;
expected154[10049] = 0x03;
expected154[10050] = 0x40;
expected154[19999] = 0x02;
assert.deepEqual(ble.encodeHanshowExact(corners154, 200, 200, 1035, {semantics: 'drive-codes'}), expected154);
// RGB fallback and pre-dithered palette indices take the same shared panel
// packing path as exact logical input; both must preserve an asymmetric image.
const rgbIndices154 = new Uint8Array(40000);
for (const [pixel, index] of [[0, 3], [1, 6], [200, 5], [199, 2], [39800, 1], [39999, 4]]) rgbIndices154[pixel] = index;
const observedRgb = [[0,0,0], [255,255,255], [255,255,0], [255,0,0], [255,128,0], [192,192,192], [64,64,64]];
const rgb154 = Uint8Array.from(Array.from(rgbIndices154).flatMap(i => [...observedRgb[i],255]));
const canvas154 = {width: 200, height: 200, getContext: () => ({getImageData: () => ({width: 200, height: 200, data: rgb154})})};
const exactRgb154 = Array.from(ble.encodeHanshowExact(rgbIndices154, 200, 200, 1035));
assert.deepEqual(Array.from(ble.encodeCanvasToByteData(canvas154, 10, 0, null, null, 1035)), exactRgb154);
assert.deepEqual(Array.from(ble.encodeCanvasToByteData(canvas154, 10, 0, null, null, 1035, rgbIndices154, map)), exactRgb154);
for (const [panel, w, h] of [[1035, 200, 200], [1036, 152, 296]]) {
  const indices = Uint8Array.from({length: w * h}, (_, i) => i % 16);
  const packed = Uint8Array.from({length: indices.length / 2}, (_, i) => (indices[i * 2] << 4) | indices[i * 2 + 1]);
  const wire = ble.encodeHanshowExact(indices, w, h, panel);
  assert.equal(wire.length, panel === 1035 ? 20000 : 22496);
  assert.deepEqual(wire, ble.encodeHanshowExact(packed, w, h, panel, {format: 'packed4'}));
  const raw = Uint8Array.from(indices, i => map[i]);
  assert.deepEqual(wire, ble.encodeHanshowExact(raw, w, h, panel, {semantics: 'drive-codes'}));
  const invalid = indices.slice(); invalid[0] = 16;
  assert.throws(() => ble.encodeHanshowExact(invalid, w, h, panel), /0..15/);
  assert.throws(() => ble.encodeHanshowExact(packed, w, h, panel), /requires/);
  assert.throws(() => ble.encodeHanshowExact(indices, h, w + 1, panel), /exactly/);
}
assert.throws(() => ble.encodeHanshowExact(new Uint8Array(16), 4, 4, null), /supported/);
ble.pipeProbe = {probed: false};
assert.equal(ble._pipeEligible({colorScheme: 10, transmissionModes: 0xff}), false);
// Existing formats: 2-bit BWRY and 4-bit grayscale packing remain stable.
const fakeCanvas = { width: 4, height: 1, getContext: () => ({getImageData: () => ({width: 4, height: 1, data: new Uint8Array(16)})}) };
assert.deepEqual(Array.from(ble.encodeCanvasToByteData(fakeCanvas, 3, 0, null, null, null, Uint8Array.from([0,1,2,3]), [0,1,2,3])), [0x1b]);
assert.deepEqual(Array.from(ble.encodeCanvasToByteData(fakeCanvas, 6, 0, null, null, null, Uint8Array.from([0,1,14,15]), allCodes)), [0x01, 0xef]);
console.log('Hanshow encoding and existing format fixtures passed');

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/indexed16-2pass.json', 'utf8'));
for (const vector of fixture.vectors) {
  const panel = fixture.panels.find(p => p.panel_ic_type === vector.panel_ic_type);
  assert.ok(panel, `Known panel for ${vector.name}`);
  const codes = vector.pixels.map(i => vector.semantics === 'logical_indices' ? panel.logical_to_drive[i] : i);
  assert.equal(Buffer.from(ble._packHanshowCodes(Uint8Array.from(codes), vector.width, vector.height, panel.panel_ic_type)).toString('hex'), vector.wire_hex);
}
ble.directWriteState = {active: true, colorScheme: 10};
for (const label of ['start', 'chunk', 'end', 'refresh']) {
  ble._armDirectWriteAckTimer(label, 60000);
  assert.equal(lastTimeout, 215000);
}
ble.directWriteState = {active: true, colorScheme: 6};
ble._armDirectWriteAckTimer('chunk'); assert.equal(lastTimeout, 15000);
ble._armDirectWriteAckTimer('end', 60000); assert.equal(lastTimeout, 60000);
console.log('Canonical vectors and mode-specific timeouts passed');

(async () => {
  const prepare = Object.create(context.BLE.prototype);
  prepare.isConnected = true;
  prepare.encryptionSession = {authenticated: true, sessionKey: new Uint8Array(16), nonceCounter: 0};
  prepare.log = () => {};
  let prepared;
  prepare._startFullUpload = async value => { prepared = value; };
  const canvas = {width: 200, height: 200};
  const options = {panelIcType: 1035, exactInput: new Uint8Array(40000), useFastRefresh: true, transmissionModes: 0x1b};
  // A 155-byte compressed stream must be split after 150 bytes: START also has
  // the four-byte decompressed-size header, all within the 154-byte encrypted cap.
  context.pako = {deflate: () => Uint8Array.from({length: 155}, (_, i) => i)};
  await prepare.sendCanvasToDisplay(canvas, 10, options);
  assert.equal(prepared.colorScheme, 10);
  assert.equal(prepared.useFastRefresh, false);
  assert.equal(prepared.chunkSize, 154);
  assert.equal(prepared.startCommandHex.length / 2, 156);
  const startBytes = Uint8Array.from(Buffer.from(prepared.startCommandHex, 'hex'));
  assert.deepEqual(Array.from(startBytes.slice(2, 6)), [0x20, 0x4e, 0x00, 0x00]);
  const compressed = [...startBytes.slice(6), ...prepared.chunks.slice(prepared.chunkIndex).flat()];
  assert.deepEqual(compressed, Array.from({length: 155}, (_, i) => i));
  prepare.getCurrentNonce = () => new Uint8Array(16);
  prepare.aesCcmEncrypt = async (_key, _nonce, _ad, payload) => ({ciphertext: payload, tag: new Uint8Array(12)});
  assert.equal((await prepare.encryptCommand(startBytes)).length, 185);
  assert.equal((await prepare.encryptCommand(Uint8Array.from([0,0x71,...new Uint8Array(154)]))).length, 185);
  // A highly compressed full stream can be entirely in START, including a
  // refresh boundary; it keeps the same mode-specific state and no DATA bytes.
  context.pako.deflate = () => new Uint8Array(12);
  await prepare.sendCanvasToDisplay(canvas, 10, options);
  assert.equal(prepared.chunkIndex, prepared.chunks.length);
  assert.equal(prepared.startCommandHex.length / 2, 18);
  // Exact native input rejects rotation instead of silently dropping it.
  await assert.rejects(prepare.sendHanshowExact(options.exactInput, 200, 200, 1035, {rotation: 1}), /rotation 0/);
  await assert.rejects(prepare.sendCanvasToDisplay(canvas, 10, {...options, rotation: 2}), /rotation 0/);
  console.log('Encrypted frame caps, compressed START boundaries and exact rotation passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

const profiles = JSON.parse(fs.readFileSync('httpdocs/js/hanshow-rgb-palettes.json')).profiles;
const observed = profiles.find(p => p.id === 'observed7');
const observedPixels = Uint8Array.from(observed.entries.flatMap(e => [...e.rgb,255]));
assert.deepEqual(Array.from(ble.buildWireCodes(observedPixels,7,10,1036,null,null)),observed.entries.map(e => e.drive_code));
const exp = profiles.find(p => p.id === 'experimental12');
const palettePixels = Uint8Array.from(exp.entries.flatMap(e => [...e.rgb, 255]));
const expectedCodes = exp.entries.map(e => e.drive_code);
assert.deepEqual(Array.from(ble.buildWireCodes(palettePixels, 12, 10, 1036, null, null, 'experimental12')), expectedCodes);
const reversed = Uint8Array.from({length:12}, (_, i) => 11-i);
assert.deepEqual(Array.from(ble.buildWireCodes(new Uint8Array(48), 12, 10, 1036, reversed, expectedCodes, 'experimental12')), expectedCodes.slice().reverse());
assert.throws(() => ble.buildWireCodes(palettePixels, 12, 10, 1035, null, null, 'experimental12'), /2.66-inch/);
assert.throws(() => ble.buildWireCodes(palettePixels, 12, 10, 1036, reversed, null, 'experimental12'), /complete palette mapping/);
assert.throws(() => ble.buildWireCodes(palettePixels, 12, 10, 1036, reversed.slice(1), expectedCodes, 'experimental12'), /complete palette mapping/);
for (const entry of exp.entries) {
  assert.deepEqual(Array.from(ble.findNearestColor(...entry.rgb, 10, 'experimental12', 1036)), entry.rgb);
  assert.equal(ble.detectColor(...entry.rgb, 10, 'experimental12', 1036), entry.name);
}
console.log('Selected RGB fallback and direct dither mappings passed');
