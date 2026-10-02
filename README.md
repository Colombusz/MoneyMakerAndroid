# MoneyMaker &mdash; Android Mobile App

**MoneyMaker Android** is a standalone, offline-first personal finance mobile application built with React Native and Expo. It features a local SQLite engine, biometric token encryption, adaptive launcher icons, and seamless background synchronization with the MoneyMaker ecosystem.

---

## 📱 Production APK Download

You can download and install the standalone production APK directly on any Android 8.0+ device from the deployed frontend endpoint:

* **Direct Web Download Endpoint:** [https://money-maker-frontend.vercel.app/moneymaker.apk](https://money-maker-frontend.vercel.app/moneymaker.apk) *(available at `/moneymaker.apk` on the deployed frontend)*
* **Package Specifications:**
  * **Package Name:** `com.moneysaver.app`
  * **Version:** `1.0.0`
  * **File Size:** ~90 MB
  * **Supported Android:** Android 8.0 (Oreo) and newer

---

## 🌐 Companion Web Platform

MoneyMaker also includes a companion web application with an interactive landing page, instant Guest Mode, and cloud synchronization:

* **Web Application:** [https://money-maker-frontend.vercel.app/](https://money-maker-frontend.vercel.app/) *(or `MoneyMakerFrontend` locally)*

---

## ✨ Features

* **Offline-First SQLite Engine:** Powered by `expo-sqlite`, storing transactions, accounts, categories, and day notes locally. Works at full speed with zero internet connection.
* **Profile Modal & Data Wipe:** Tap the avatar circle on the top bar to inspect user details, currency settings, cloud status, and perform a secure, permanent local data wipe on logout.
* **Partner Goal Sharing:** Generate and accept 6-digit invite codes to connect with your partner and collaborate on shared savings targets.
* **Adaptive Launcher Icon:** High-resolution vector-styled adaptive icon with clean foreground transparency and solid theme contrast.
* **Two-Way Background Sync:** Automatically enqueues writes to a local sync outbox and reconciles with MongoDB Atlas when connected.
* **Quick Cash Spend:** Floating action and one-tap spending sheets for fast expense recording on the go.

---

## 🚀 Development Setup

### 1. Install Dependencies

```bash
cd MoneyMakerAndroid
npm install
```

### 2. Configure Environment
Check or update `.env`:

```env
EXPO_PUBLIC_API_URL=<your_backend_api_url>
```

### 3. Start Development Server

```bash
npm run start:local     # local LAN
npm run start           # ngrok tunnel
```

### 4. Running Tests & Typechecks

```bash
npm test                # run all 21 Vitest test suites
npm run typecheck       # run TypeScript checks
```

---

## 📦 Building Standalone APK with EAS

To generate a new production APK using Expo Application Services:

```bash
# 1. Ensure EAS CLI is installed and logged in
npm install -g eas-cli
eas login

# 2. Trigger Android production APK build
eas build -p android --profile production
```

Build configuration is defined in [`eas.json`](./eas.json) with `"buildType": "apk"` and upload exclusions in [`.easignore`](./.easignore).