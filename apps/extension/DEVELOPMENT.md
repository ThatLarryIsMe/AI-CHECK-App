# Extension Development

## Setup

1. Start the web app from the repo root:
   ```
   npm run dev
   ```
2. Build the dev extension:
   ```
   npm -w extension run dev
   ```
3. Open Chrome → `chrome://extensions` → Enable **Developer mode**
4. Click **Load unpacked** → select `apps/extension/dist/`
5. The Factward icon should appear in the toolbar

## Testing

- Click the Factward icon → sign in with a test account (must exist in your local DB)
- **Scan this page**: click the button on any webpage to auto-verify claims
- **Paste & verify**: paste text into the textarea and click Verify
- **Right-click**: select text on any page → right-click → "Verify with Factward"

## After Code Changes

Re-run `npm -w extension run dev` and click the refresh icon on the extension card in `chrome://extensions`.

## Production Build

```
npm -w extension run build     # builds prod dist/
npm -w extension run package   # creates factward-extension.zip for Chrome Web Store
```
