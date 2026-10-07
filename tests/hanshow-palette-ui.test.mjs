import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import './hanshow-dither.test.mjs';

const lib = window.OpenDisplayDither;
const tester = fs.readFileSync('httpdocs/firmware/display/index.html', 'utf8');
const designer = fs.readFileSync('httpdocs/designer/index.html', 'utf8');
// Parse every inline script too: the tested handlers run inside larger legacy scripts.
for (const html of [tester, designer]) {
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new vm.Script(match[1]);
  }
  assert.ok(html.indexOf('/js/hanshow-rgb-palettes.js') < html.indexOf('/js/ble-common.js'));
}
function functionSource(html, name, indent) {
  const start = html.indexOf(`${indent}function ${name}(`);
  assert.ok(start >= 0, name);
  const end = html.indexOf(`\n${indent}}`, start) + indent.length + 2;
  return html.slice(start, end);
}
const select = {
  value: 'experimental12', options: [],
  set innerHTML(_value) { this.options = []; },
  appendChild(option) { this.options.push(option); },
};
const context = vm.createContext({
  document: {getElementById: () => select, createElement: () => ({})},
  currentColorScheme: () => 10, displayPanelIcType: 1036,
});
vm.runInContext(functionSource(tester, 'populatePaletteSelect', '        '), context);
context.populatePaletteSelect(lib);
assert.equal(select.value, 'experimental12');
assert.equal(select.options.find(o => o.value === 'experimental12').disabled, false);
context.displayPanelIcType = 1035;
context.populatePaletteSelect(lib);
assert.equal(select.options.find(o => o.value === 'experimental12').disabled, true);
// A panel change presents the valid default; direct incompatible API requests still reject.
assert.equal(select.value, 'auto');

const image = {width:12,height:1,data:Uint8ClampedArray.from(globalThis.OpenDisplayHanshowPalettes.resolve('experimental12',1036).entries.flatMap(e => [...e.rgb,255]))};
const plainContext = vm.createContext({
  sourceImage: null, baseImageData: null, getBaseImageData: () => image,
  compositeInkOntoIndices: () => false,
});
vm.runInContext(functionSource(tester, 'ditherBaseAndCompositeInk', '        '), plainContext);
const paintedLib = {...lib, paint() {}};
const plain = plainContext.ditherBaseAndCompositeInk(paintedLib, {}, 12, 1, 10, 'auto', {paletteId:'experimental12',panelIcType:1036,tone:'none',gamut:'none'});
assert.equal(plain.paletteId, 'experimental12');
assert.deepEqual(Array.from(plain.indices), Array.from({length:12}, (_, i) => i));

const designerSelect = {value:'experimental12', querySelector: () => option};
const option = {};
const row = {};
const designerContext = vm.createContext({
  document: {getElementById: id => id === 'hanshowPaletteRow' ? row : designerSelect},
  displayConfig: {colorScheme:10, panelIcType:1036, rgbPalette:'experimental12'},
});
vm.runInContext(functionSource(designer, 'syncHanshowPalette', '    '), designerContext);
designerContext.syncHanshowPalette();
assert.equal(row.hidden, false);
assert.equal(option.disabled, false);
designerContext.displayConfig.panelIcType = 1035;
designerContext.syncHanshowPalette();
assert.equal(option.disabled, true);
assert.equal(designerSelect.value, 'observed7');
assert.equal(designerContext.displayConfig.rgbPalette, 'observed7');
designerContext.displayConfig.panelIcType = 1036;
designerContext.displayConfig.rgbPalette = 'experimental12';
designerContext.displayConfig.colorScheme = 4;
designerContext.syncHanshowPalette();
assert.equal(row.hidden, true);
assert.equal(designerSelect.value, 'observed7');

let sent = null;
const start = designer.indexOf('    async function sendCanvasToDisplay()');
const sendSource = designer.slice(start, designer.indexOf('</script>', start));
const sendContext = vm.createContext({
  document:{getElementById:() => ({value:'10'})},
  displayConfig:{panelIcType:1036,rgbPalette:'experimental12'},
  canvas:{width:12,height:1}, ctx:{getImageData:() => image},
  OpenDisplayBLE:{ditherReady:async () => lib},
  bleLib:{isConnected:true,sendCanvasToDisplay:(_canvas,_scheme,options) => {sent=options;}},
  addBLELog(){},setBLEStatus(){},
});
vm.runInContext(sendSource, sendContext);
await sendContext.sendCanvasToDisplay();
assert.equal(sent.rgbPalette,'experimental12');
assert.deepEqual(Array.from(sent.ditherIndices),Array.from({length:12},(_,i)=>i));
assert.deepEqual(Array.from(sent.ditherWireMap),[4,5,9,13,1,6,7,2,10,11,14,15]);
sent = null;
sendContext.displayConfig.panelIcType = 1035;
await sendContext.sendCanvasToDisplay();
assert.equal(sent,null);
console.log('Tester and Designer palette selection, preview and upload handler paths passed');
