# Build Notes

Developer instructions for building APC from source.

## Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+ (for running apktool/signer during development; bundled in production builds)
- **Git**

## Setup

```bash
# Clone the repo
git clone https://github.com/KaladinDMP/AutomagicPackageChanger.git
cd AutomagicPackageChanger

# Install dependencies
npm install

# Download required tools (apktool.jar, uber-apk-signer.jar)
npm run setup-tools
```

## Development

```bash
# Run in development mode
npm start

# Run with DevTools open
npm start -- --dev
```

## Tool Dependencies

APC uses these external Java tools (downloaded by `npm run setup-tools`):

| Tool | Version | Purpose |
|------|---------|---------|
| [apktool](https://github.com/iBotPeaches/Apktool) | 2.9.3 | Decompile and rebuild APKs |
| [uber-apk-signer](https://github.com/nicholasgasior/uber-apk-signer) | 1.3.0 | Sign APKs with debug keystore |

These JARs go in `resources/tools/` and are bundled into the final build via electron-builder's `extraResources`.

## Portable JRE (for self-contained builds)

To make the app fully self-contained (no system Java required):

1. Download [Adoptium Temurin JRE 17](https://adoptium.net/temurin/releases/?version=17&package=jre) (Windows x64)
2. Extract to `resources/jre/` so the structure looks like:
   ```
   resources/jre/
   ├── bin/
   │   ├── java.exe
   │   └── ...
   ├── lib/
   └── ...
   ```

Without a bundled JRE, APC falls back to system Java.

## Building

```bash
# Build portable .exe (single file, no installer)
npm run build:portable

# Build NSIS installer
npm run build:installer

# Build all targets
npm run build
```

Output goes to `dist/`.

### Build sizes

| Component | Approximate Size |
|-----------|-----------------|
| Electron runtime | ~90 MB |
| Portable JRE | ~45 MB |
| Tools (apktool + signer) | ~15 MB |
| App code + assets | ~1 MB |
| **Total portable .exe** | **~150 MB** |

## Project Structure

```
AutomagicPackageChanger/
├── package.json                  # Electron + electron-builder config
├── electron-builder.yml          # Build/packaging configuration
├── src/
│   ├── main/                     # Electron main process
│   │   ├── main.js               # Window creation, app lifecycle
│   │   ├── preload.js            # Secure IPC bridge
│   │   ├── ipc-handlers.js       # IPC handler registration
│   │   ├── apk-processor.js      # Core rename pipeline orchestrator
│   │   ├── apktool-wrapper.js    # Spawns apktool d / apktool b
│   │   ├── signer-wrapper.js     # Spawns uber-apk-signer
│   │   ├── manifest-editor.js    # Edits AndroidManifest.xml + apktool.yml
│   │   ├── smali-renamer.js      # Deep rename in smali/xml/assets
│   │   ├── obb-handler.js        # OBB folder detection + rename
│   │   └── file-utils.js         # Temp dirs, path resolution, helpers
│   └── renderer/                 # Electron renderer (UI)
│       ├── index.html            # App shell
│       ├── styles/
│       │   ├── main.css          # Core layout
│       │   ├── neon-theme.css    # Neon glow effects, particles, animations
│       │   └── drop-zone.css     # Drag-and-drop area styling
│       ├── scripts/
│       │   ├── app.js            # Main controller, wires everything
│       │   ├── drag-drop.js      # Drag-and-drop handler
│       │   ├── ui-controller.js  # Mode switching, info panel, state
│       │   └── progress.js       # Progress bar + result display
│       └── assets/               # Fonts, images
├── resources/
│   ├── tools/                    # apktool.jar, uber-apk-signer.jar
│   └── jre/                      # Portable JRE (optional)
├── scripts/
│   └── setup-tools.js            # Downloads required JARs
└── docs/                         # Additional documentation
```

## How the Rename Pipeline Works

1. **Extract package name** - Quick apktool decode (`-s` flag, skips dex) to read `AndroidManifest.xml`
2. **Compute new name** - Default mode inserts `.mr.` after first segment; Custom mode uses user input
3. **Full decompile** - `apktool d` decodes the entire APK (manifest, resources, smali)
4. **Manifest edit** - Updates `package=`, `android:authorities`, `android:taskAffinity` in `AndroidManifest.xml`
5. **apktool.yml edit** - Sets `renameManifestPackage` as a safety net
6. **Smali/resource rename** - For Custom mode: deep find-and-replace of `Lcom/old/pkg/` references in `.smali` files, plus dotted references in XML and asset files. For Default mode: lighter touch (XML resources only, `renameManifestPackage` handles the rest)
7. **Rebuild** - `apktool b` produces the modified APK
8. **Sign** - `uber-apk-signer` applies a debug signature (v1+v2+v3)
9. **OBB rename** - Scans nearby directories for the old package name folder and renames it + any `.obb` files inside

## Troubleshooting Builds

- **`apktool.jar not found`** - Run `npm run setup-tools` or manually download to `resources/tools/`
- **Electron-builder fails on Windows** - Make sure you have Visual C++ build tools installed, or use the pre-built release
- **Large APK timeouts** - The default timeout is 10 minutes for apktool operations. For very large APKs (4GB+), you may need to increase `timeout` in `apktool-wrapper.js`
