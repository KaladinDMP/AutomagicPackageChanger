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

Think of it as your **Phunk / APKognito alternative** but without the “why is this so annoying” phase.

---

## Features

- **Drag & Drop**  
  Literally drag the file. That’s it. If you can’t do this, we have bigger problems.

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

- **Auto OBB Handling**  
  Finds your OBB folder and fixes it too  
  No more “why isn’t my game loading” moments

- **Auto Re-Sign**  
  Because unsigned APKs are about as useful as a brick

- **Self-Contained**  
  No Java installs. No apktool setup. No nonsense  
  It just works

- **Neon Cyber-Pirate UI**  
  If you are going to break things, at least look cool doing it

---

## How to Use

### 1. Drop Your APK

Launch APC and drag your `.apk` into the drop zone  
Yes, it really is that simple

---

### 2. Choose Your Mode

| Mode | What it does | Example |
|------|-------------|---------|
| **DEFAULT (.apc)** | Inserts `.apc` after the first segment | `com.studio.game` → `com.apc.studio.game` |
| **MR FIX (.mr)** | Inserts `.mr` for MR fixes | `com.studio.game` → `com.mr.studio.game` |
| **CUSTOM TAG** | Your tag, your rules | `com.studio.game` → `com.dmp.studio.game` |

---

### 3. Hit Rename & Sign

APC will:

1. Decompile the APK  
2. Rename everything that actually matters  
3. Rebuild it  
4. Re-sign it so your headset doesn’t complain  
5. Fix any nearby OBB folder automatically  

Your new file shows up next to the original with `_renamed` added

No mystery. No scavenger hunt.

---

### 4. OBB Auto-Detection

If your APK sits next to its OBB folder, APC finds it and fixes everything

Before:

MyGame/
├── game.apk
└── com.studio.game/
└── main.1.com.studio.game.obb


After:

MyGame/
├── game_renamed.apk
└── com.apc.studio.game/
└── main.1.com.apc.studio.game.obb


Yes, it actually does it right.

---

## Download

Grab the latest release from the [Releases](../../releases) page:

- **Portable**  
  One file. Run it. Done.

- **Installer**  
  For people who like clicking “Next” a few times

---

## FAQ

**Q: Does this work with all Quest games?**  
A: Most standard APKs, yes. Some weird ones will fight back. That’s life.

---

**Q: Will multiplayer still work?**  
A: Probably not. You changed the package name. The game thinks it’s a different person now.

---

**Q: My antivirus flagged it!**  
A: Welcome to Electron apps and APK tools. False positives are basically a feature at this point.  
Check the code if you’re paranoid.

---

**Q: Do I need Java installed?**  
A: No. We bundled it so you don’t have to deal with that.

---

**Q: It’s taking a while. Is it stuck?**  
A: No. Big APKs take time. This isn’t magic, it just feels like it.

---

**Q: Can I rename an already renamed APK?**  
A: Yes. APC will warn you if you’re stacking tags like a maniac.

---

## License

MIT

---

<p align="center">
  <em>// SAIL THE DIGITAL SEAS //</em>
</p>
