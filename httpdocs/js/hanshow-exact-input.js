// Exact binary input avoids browser image decoding, fitting and palette conversion.
// Each page supplies its connected-device configuration through getContext.
function mountHanshowExactInput(parent, getContext) {
  const details = document.createElement('details');
  details.innerHTML = `<summary>Hanshow exact 4-bit input</summary>
    <p>Use native dimensions. RGB estimates are provisional; all 16 drive codes are addressable.
    <a href="/protocol/hanshow-indexed16.html">Format and qualification details</a></p>
    <label>Input format <select data-format>
      <option value="packed4">Packed 4-bit (high nibble first)</option>
      <option value="indices">One index per byte (0–15)</option>
    </select></label>
    <label>Values <select data-semantics>
      <option value="indices">Logical palette indices</option>
      <option value="drive-codes">Raw drive codes (diagnostics)</option>
    </select></label>
    <label>Exact pixel file <input type="file" data-file accept=".bin,application/octet-stream"></label>
    <button type="button" data-send>Upload exact binary</button>
    <p data-status role="status"></p>`;
  parent.append(details);
  const button = details.querySelector('[data-send]');
  const status = details.querySelector('[data-status]');
  button.onclick = async () => {
    try {
      const { ble, panelIcType, width, height, colorScheme, transmissionModes, authenticate } = getContext();
      if (!ble || !ble.isConnected) throw new Error('Connect and read the display configuration first');
      if (colorScheme !== 10) throw new Error('Exact Hanshow upload requires INDEXED16_2PASS on the connected device');
      const file = details.querySelector('[data-file]').files[0];
      if (!file) throw new Error('Select an exact binary file');
      button.disabled = true;
      if (authenticate) await authenticate();
      await ble.sendHanshowExact(new Uint8Array(await file.arrayBuffer()), width, height, panelIcType, {
        format: details.querySelector('[data-format]').value,
        semantics: details.querySelector('[data-semantics]').value,
        transmissionModes,
        onStatusChange: message => { status.textContent = message; },
        onComplete: (success, error) => {
          button.disabled = false;
          status.textContent = success ? 'Exact image refresh completed' : `Upload failed: ${error?.message || 'Unknown error'}`;
        },
      });
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message;
    }
  };
}
