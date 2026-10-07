// Host RGB estimates only. Canonical metadata: OpenDisplay/opendisplay-protocol.
// Keep this vendored data synchronized with hanshow-rgb-palettes.json.
(() => {
  const profiles = [
  {
    "id": "observed7",
    "label": "Seven observed states (provisional RGB)",
    "calibrated": false,
    "experimental": false,
    "panel_ic_types": [
      1035,
      1036
    ],
    "entries": [
      {
        "name": "black",
        "rgb": [
          0,
          0,
          0
        ],
        "drive_code": 4,
        "logical_index": 0
      },
      {
        "name": "white",
        "rgb": [
          255,
          255,
          255
        ],
        "drive_code": 5,
        "logical_index": 1
      },
      {
        "name": "yellow",
        "rgb": [
          255,
          255,
          0
        ],
        "drive_code": 9,
        "logical_index": 2
      },
      {
        "name": "red",
        "rgb": [
          255,
          0,
          0
        ],
        "drive_code": 13,
        "logical_index": 3
      },
      {
        "name": "orange",
        "rgb": [
          255,
          128,
          0
        ],
        "drive_code": 1,
        "logical_index": 4
      },
      {
        "name": "light_gray",
        "rgb": [
          192,
          192,
          192
        ],
        "drive_code": 6,
        "logical_index": 5
      },
      {
        "name": "dark_gray",
        "rgb": [
          64,
          64,
          64
        ],
        "drive_code": 7,
        "logical_index": 6
      }
    ]
  },
  {
    "id": "experimental12",
    "label": "Experimental twelve-code palette (uncalibrated, 266 only)",
    "calibrated": false,
    "experimental": true,
    "panel_ic_types": [
      1036
    ],
    "entries": [
      {
        "name": "black",
        "rgb": [
          20,
          20,
          20
        ],
        "drive_code": 4,
        "logical_index": 0
      },
      {
        "name": "ivory",
        "rgb": [
          245,
          245,
          240
        ],
        "drive_code": 5,
        "logical_index": 1
      },
      {
        "name": "yellow",
        "rgb": [
          235,
          205,
          35
        ],
        "drive_code": 9,
        "logical_index": 2
      },
      {
        "name": "red",
        "rgb": [
          180,
          35,
          45
        ],
        "drive_code": 13,
        "logical_index": 3
      },
      {
        "name": "coral_orange",
        "rgb": [
          225,
          110,
          80
        ],
        "drive_code": 1,
        "logical_index": 4
      },
      {
        "name": "light_gray",
        "rgb": [
          175,
          175,
          170
        ],
        "drive_code": 6,
        "logical_index": 5
      },
      {
        "name": "dark_gray",
        "rgb": [
          75,
          75,
          75
        ],
        "drive_code": 7,
        "logical_index": 6
      },
      {
        "name": "dusty_pink",
        "rgb": [
          219,
          133,
          136
        ],
        "drive_code": 2,
        "logical_index": 8
      },
      {
        "name": "khaki",
        "rgb": [
          155,
          146,
          112
        ],
        "drive_code": 10,
        "logical_index": 11
      },
      {
        "name": "middle_gray",
        "rgb": [
          129,
          129,
          123
        ],
        "drive_code": 11,
        "logical_index": 12
      },
      {
        "name": "warm_salmon",
        "rgb": [
          220,
          139,
          124
        ],
        "drive_code": 14,
        "logical_index": 14
      },
      {
        "name": "muted_mauve",
        "rgb": [
          140,
          89,
          111
        ],
        "drive_code": 15,
        "logical_index": 15
      }
    ]
  }
];
  function resolve(id = 'observed7', panelIcType = null) {
    const profile = profiles.find(p => p.id === id);
    if (!profile) throw new Error(`Unknown Hanshow RGB palette: ${id}`);
    if (!profile.panel_ic_types.includes(Number(panelIcType))) {
      throw new Error(`${id} requires a supported Hanshow panel${id === 'experimental12' ? ' (2.66-inch / 1036 only)' : ''}`);
    }
    return profile;
  }
  globalThis.OpenDisplayHanshowPalettes = { profiles, resolve };
})();
