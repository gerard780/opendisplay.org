import assert from 'node:assert/strict';
import fs from 'node:fs';
const vendor = fs.readFileSync('httpdocs/js/vendor/epaper-dithering.js', 'utf8');
const vendorUrl = `data:text/javascript;base64,${Buffer.from(vendor).toString('base64')}`;
const profiles = fs.readFileSync('httpdocs/js/hanshow-rgb-palettes.js', 'utf8');
const profilesUrl = `data:text/javascript;base64,${Buffer.from(profiles).toString('base64')}`;
const front = fs.readFileSync('httpdocs/js/dither.js', 'utf8').replace("'./vendor/epaper-dithering.js'", JSON.stringify(vendorUrl)).replace("'./hanshow-rgb-palettes.js'", JSON.stringify(profilesUrl));
globalThis.window = {dispatchEvent() {}};
await import(`data:text/javascript;base64,${Buffer.from(front).toString('base64')}`);
const lib = window.OpenDisplayDither;
const colors = [[0,0,0],[255,255,255],[255,255,0],[255,0,0],[255,128,0],[192,192,192],[64,64,64]];
const pixels = Uint8ClampedArray.from(colors.flatMap(c => [...c, 255]));
for (const panelIcType of [1035, 1036]) {
  const result = lib.dither({width:7, height:1, data:pixels}, {scheme:10, panelIcType, mode:'none', tone:'none', gamut:'none'});
  assert.deepEqual(Array.from(result.indices), [0,1,2,3,4,5,6]);
  assert.deepEqual(result.wireMap, [4,5,9,13,1,6,7,0,2,3,8,10,11,12,14,15]);
  assert.equal(result.measuredId, null);
  assert.equal(result.preview.length, 7);
  assert.equal(lib.paletteForPanel(panelIcType, 10), null);
}
assert.throws(() => lib.wireMap(10, 33), /supported Hanshow/);
assert.deepEqual(lib.wireMap(4), [0,1,2,3,5,6]);
assert.deepEqual(lib.wireMap(8), [0,1,2,3,5,6]);
console.log('Vendored WASM custom palette and existing Spectra maps passed');

const fixturePath = 'httpdocs/js/hanshow-rgb-palettes.json';
const fixture = JSON.parse(fs.readFileSync(fixturePath));
assert.deepEqual(globalThis.OpenDisplayHanshowPalettes.profiles, fixture.profiles);
if (fs.existsSync('../opendisplay-protocol/tests/fixtures/hanshow-rgb-palettes.json')) {
  assert.equal(fs.readFileSync(fixturePath, 'utf8'), fs.readFileSync('../opendisplay-protocol/tests/fixtures/hanshow-rgb-palettes.json', 'utf8'));
}
const observed = fixture.profiles.find(p => p.id === 'observed7');
assert.deepEqual(lib.idealPalette(10), observed.entries.map(e => ({r:e.rgb[0],g:e.rgb[1],b:e.rgb[2]})));
assert.deepEqual(lib.wireMap(10,1036).slice(0,7), observed.entries.map(e => e.drive_code));
const experimental = fixture.profiles.find(p => p.id === 'experimental12');
const rgba = Uint8ClampedArray.from(experimental.entries.flatMap(e => [...e.rgb, 255]));
const twelve = lib.dither({width:12, height:1, data:rgba}, {scheme:10, panelIcType:1036, paletteId:'experimental12', mode:'none', tone:'none', gamut:'none'});
assert.deepEqual(Array.from(twelve.indices), Array.from({length:12}, (_, i) => i));
assert.deepEqual(twelve.wireMap, experimental.entries.map(e => e.drive_code));
assert.deepEqual(twelve.names, experimental.entries.map(e => e.name));
assert.deepEqual(twelve.preview, experimental.entries.map(e => ({r:e.rgb[0],g:e.rgb[1],b:e.rgb[2]})));
assert.deepEqual(Array.from(twelve.counts), Array(12).fill(1));
assert.equal(twelve.measuredId, null);
assert.equal(twelve.paletteId, 'experimental12');
for (const panelIcType of [null, 1035, 33]) {
  assert.throws(() => lib.dither({width:12,height:1,data:rgba}, {scheme:10,panelIcType,paletteId:'experimental12'}), /requires a supported/);
}
assert.throws(() => lib.dither({width:12,height:1,data:rgba}, {scheme:10,panelIcType:1036,paletteId:'typo'}), /Unknown Hanshow/);
console.log('Canonical twelve-code palette, WASM indices, previews and panel guards passed');
