# EventPilot
Smart Event Planning Assistant, built with Expo and React Native in JavaScript.

The app currently displays a simple welcome screen. Navigation and database functionality are not included.

## Project structure

The source folders are organized as follows:

```text
EventPilot/
├── assets/              # Static assets and Expo icons
├── src/
│   ├── app/index.js     # Welcome screen and future route screens
│   ├── components/     # Reusable UI components
│   ├── constants/      # Shared values, including theme.js colors
│   ├── database/       # Reserved for future data access
│   ├── hooks/          # Reusable React hooks
│   └── utils/          # Shared helper functions
├── App.js              # Root component
└── index.js            # Expo entry point
```

The welcome screen is rendered directly by `App.js`; file-based routing is not enabled. Use Expo Router when adding navigation. Empty folders contain `.gitkeep` files so Git preserves them. Existing assets stay at the root to preserve the configured Expo icon paths.

## Run

The Expo app lives in the nested `EventPilot` directory. From this repository root:

```sh
cd EventPilot
npm ci
npm start
```

Open the app using an Expo Go version compatible with the project's Expo SDK 58. Connect your phone and computer to the same Wi-Fi network, then scan the QR code shown by Expo (Android: Expo Go; iPhone: Camera). If your network blocks the connection, try `npm start -- --tunnel`.

For an installed Android emulator, run `npm run android` or press `a` in the Expo terminal. The iOS simulator requires macOS and Xcode; on Windows, use a physical iPhone with Expo Go.

## Test

Confirm that the screen shows **EventPilot** and **Smart Event Planning Assistant**, centered on a light background, with no starter instructions or error overlay. Check both a small phone screen and a larger screen, including increased system text size. Edit `src/app/index.js` inside the Expo project and save to check Fast Refresh. Stop Expo with Ctrl+C.

To check dependency compatibility and compile both native JavaScript bundles without a device:

```sh
npx expo install --check
npx expo export --platform android --platform ios --output-dir dist
```

Native bundling does not replace a visual check on a phone or emulator. This JavaScript starter does not currently include ESLint, TypeScript, or an automated test suite. Web dependencies are installed; run `npm run web` to open the app in a browser.
