# Web

Website files for https://opendisplay.org/

## Deployment

Publishing a [GitHub Release](https://github.com/OpenDisplay/opendisplay.org/releases) deploys `httpdocs/` to the FTP server at `/httpdocs/`.

## GitHub Actions

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-ftp` | Release published, manual | Upload `httpdocs/` to production FTP |
| `sync-ftp` | Daily 03:00 UTC, manual | Open a PR if the live FTP folder changed |
| `sync-firmware` | Daily 04:00 UTC, manual | Open a PR when [OpenDisplay/Firmware](https://github.com/OpenDisplay/Firmware) has a new release |
| `validate-simple-config` | PR/push touching toolbox presets | Keep simple-config board/display/battery ids & indexes stable |

### Simple-config preset IDs

Toolbox simple-config entries live in `httpdocs/firmware/toolbox/simple-config-presets.json`.

- **String `id`** values are used in share URLs (`?driver=&display=&power=`).
- Numeric **`index`** values are written into device manufacturer data as `simple_config_{driver,display,power}_index`.

Both are permanent once published. To add hardware, append a new id with a new unused index and update `simple-config-id-registry.json` in the same change. Never reuse or renumber existing mappings.

Local check:

```bash
python3 .github/scripts/validate-simple-config-presets.py
```


### Hanshow indexed input

The experimental Telink profiles and `INDEXED16_2PASS` format are documented in
`httpdocs/protocol/hanshow-indexed16.html`. Their RGB palette contains nominal,
uncalibrated estimates; it must not be added to the measured palette catalog.
The exact binary uploader accepts declared logical indices or raw drive codes.
The wire format and golden vectors mirror `OpenDisplay/opendisplay-protocol`;
coordinate changes there before updating this repository's fixture.
Input pixels remain in ordinary image order. The shared encoder transposes
panel 1035 into top-to-bottom columns and keeps panel 1036 in bottom-to-top
rows, for both exact binary and normal RGB uploads in Tester and Designer.

Run the dependency-free JavaScript regression checks from the repository root:

```bash
node tests/hanshow-indexed16.test.cjs
node tests/hanshow-dither.test.mjs
node tests/hanshow-palette-ui.test.mjs
```

The second check uses the bundled WASM library without upgrading it. Installation
links use the Telink target documentation and deliberately declare no release
artifact. Both profiles require hardware and waveform qualification before release.

Tester and Designer keep the seven-state conversion as the default. The
`experimental12` RGB palette is opt-in for panel 1036 (2.66-inch) and restores
nominal estimates from the earlier fox experiment. Its twelve drive codes are
not twelve calibrated optical colors. Vendored `httpdocs/js/hanshow-rgb-palettes.json`
mirrors the protocol repository byte for byte; runtime metadata and WASM mapping
are checked against it. No firmware or wire-mode extension is needed.
