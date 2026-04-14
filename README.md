<p align="center">
  <img src="banner.png" alt="APC - Automagic Package Changer" width="100%">
</p>

<h1 align="center">AUTOMAGIC PACKAGE CHANGER</h1>

<p align="center">
  <strong>Rename Quest game packages with one drop. No fuss. No command lines. No suffering.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#how-to-use">How to Use</a> &bull;
  <a href="#signer-intel">Signer Intel</a> &bull;
  <a href="#download">Download</a> &bull;
  <a href="#faq">FAQ</a>
</p>

---

## What is APC?

**Automagic Package Changer (APC)** is a desktop app that renames Android APK package names for Meta Quest games.

You drop an APK.  
You click a button.  
It does everything you were about to spend 2 hours Googling and messing up.

Decompile. Rename. Rebuild. Re-sign. OBB fix.

All of it.

Think of it as your **Phunk / APKognito alternative** but without the "why is this so annoying" phase.

---

## Features

- **Drag & Drop**  
  Literally drag the file. That's it. If you can't do this, we have bigger problems.

- **Default Mode (.apc)**  
  Inserts `.apc` like it should have always been there  
  `com.game.title` → `com.apc.game.title`

- **MR Fix Mode (.mr)**  
  Same idea, different tag  
  `com.game.title` → `com.mr.game.title`

- **Custom Tag**  
  Want your own tag? Of course you do  
  `com.game.title` → `com.dmp.game.title`  
  Keep it short. This is not a paragraph.

- **APK Info Scanner**  
  Auto-scans every APK you drop. Package, version, SDK levels, ABIs, OpenGL ES, permissions, hashes, signature details — one click away.

- **Signer Recognition**  
  Knows VRP from NIF from Meta on sight. Tells you who signed what the moment you drop the file.

- **APC Identifiable Signature**  
  Every APC-renamed APK carries a recognizable cert with a lineage breadcrumb showing who signed it before you. Future-you will thank past-you.

- **Auto OBB Handling**  
  Finds your OBB folder and fixes it too  
  No more "why isn't my game loading" moments

- **Auto Re-Sign**  
  Because unsigned APKs are about as useful as a brick

- **Self-Contained**  
  No Java installs. No apktool setup. No nonsense  
  It just works

- **Session Debug Log**  
  APCDebug.log tracks every session. Makes bug reports boring and easy.

- **Neon Cyber-Pirate UI**  
  If you are going to break things, at least look cool doing it

---

## How to Use

### 1. Drop Your APK

Launch APC and drag your `.apk` into the drop zone  
Yes, it really is that simple

APC scans it automatically. The info panel fills in package name, OBB status, and who signed it before you got hold of it.

---

### 2. Choose Your Mode

| Mode | What it does | Example |
|------|-------------|---------|
| **DEFAULT (.apc)** | Inserts `.apc` after the first segment | `com.studio.game` → `com.apc.studio.game` |
| **MR FIX (.mr)** | Inserts `.mr` for MR fixes | `com.studio.game` → `com.mr.studio.game` |
| **CUSTOM TAG** | Your tag, your rules | `com.studio.game` → `com.dmp.studio.game` |

---

### 3. (Optional) Hit APK INFO

Want the full breakdown before you rename? Click **APK INFO** on the info panel for everything — label, version, SDK, ABIs, permissions, certificate details, file hashes.

---

### 4. Hit Rename & Sign

APC will:

1. Decompile the APK  
2. Rename everything that actually matters  
3. Rebuild it  
4. Re-sign it with your personal APC cert (embeds lineage)  
5. Fix any nearby OBB folder automatically  

Your new file shows up next to the original with `_renamed` added

No mystery. No scavenger hunt.

---

### 5. OBB Auto-Detection

If your APK sits next to its OBB folder, APC finds it and fixes everything

Before:

```text
MyGame/
├── game.apk
└── com.studio.game/
└── main.1.com.studio.game.obb
```

After rename (default mode):

```text
MyGame/
├── game_renamed.apk
└── com.apc.studio.game/
└── main.1.com.apc.studio.game.obb
```

Yes, it actually does it right.

---

## Signer Intel

Every APK carries a signing certificate. That certificate has a human-readable "DN" string that almost never changes for a given signer. APC reads it, recognizes it, and labels it.

Known out of the box:

| Group | Detects |
|-------|---------|
| **VRP** | `NotQuestUnderground` |
| **NIF** | `NothingIsFree` |
| **APC** | `Automagic Package Changer` |
| **Meta / Oculus** | `Oculus VR`, `Facebook Technologies`, `Meta Platforms` |
| **Google** | `CN=Android`, `O=Google Inc.` |
| **Debug Key** | Standard Android debug keystore |

Anything else shows up as "Unknown" with the raw CN on display.

When APC re-signs, it doesn't just stamp its name. It also writes who signed it **before**:

```
CN=Automagic Package Changer
OU=DMP used Automagic on this APK!          ← configurable
O=APC
L=Previously signed by NotQuestUnderground (VRP)
```

So the APK carries its lineage forever. Drop an APC-renamed APK into APC again and it'll tell you it was APC-signed, and what it was before that.

---

## Settings

Click the gear in the title bar to configure:

- **Signature Line** — what gets embedded in the OU field of every APK you sign:
  - **DEFAULT** — "DMP used Automagic on this APK!"
  - **USE CURRENT TAG** — matches whatever tag you're renaming with
  - **CUSTOM** — your own text (120 char max)

- **Open APCDebug.log** — reveals this session's log file for when something weird happens and you want to share it

---

## Download

Grab the latest release from the [Releases](../../releases) page:

- **Portable**  
  One file. Run it. Done.

- **Installer**  
  For people who like clicking "Next" a few times

---

## FAQ

**Q: Does this work with all Quest games?**  
A: Most standard APKs, yes. Some weird ones will fight back. That's life.

---

**Q: Will multiplayer still work?**  
A: Probably not. You changed the package name. The game thinks it's a different person now.

---

**Q: My antivirus flagged it!**  
A: Welcome to Electron apps and APK tools. False positives are basically a feature at this point.  
Check the code if you're paranoid.

---

**Q: Do I need Java installed?**  
A: No. We bundled it so you don't have to deal with that.

---

**Q: It's taking a while. Is it stuck?**  
A: No. Big APKs take time. This isn't magic, it just feels like it.

---

**Q: Can I rename an already renamed APK?**  
A: Yes. APC will warn you if you're stacking tags like a maniac.

---

**Q: Will APC work if the APK isn't signed?**  
A: Yes. APC re-signs during rebuild anyway. The info panel will just say "Unsigned" on the way in.

---

**Q: How do I add a new signer to the recognition list?**  
A: Edit `resources/signers.json`, drop in a new entry with a substring from the signer's DN, and rebuild. Easy.

---

**Q: Where's my debug log?**  
A: Settings → OPEN APCDebug.log. It's in your user data folder. Share it if you're filing an issue.

---

## License

MIT

---

<p align="center">
  <em>// SAIL THE DIGITAL SEAS //</em>
</p>
