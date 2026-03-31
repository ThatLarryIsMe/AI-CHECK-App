# Chrome Web Store — Factward Listing

## How to Publish

### 1. Register as a Chrome Web Store Developer
- Go to https://chrome.google.com/webstore/devconsole
- Pay the one-time $5 developer registration fee
- Verify your identity

### 2. Package the Extension
```bash
cd apps/extension
./package.sh
```
This creates `factward-extension.zip` ready for upload.

### 3. Upload & Fill In Store Listing

**Name:** Factward — Inline Fact-Checker

**Summary (132 chars max):**
Instantly fact-check any webpage. Highlights claims with color-coded verdicts backed by real sources.

**Description:**
```
Factward brings real-time fact-checking to your browser. With one click, it scans any article or webpage, extracts factual claims, and verifies them against real sources.

HOW IT WORKS
1. Click the Factward icon in your toolbar
2. Hit "Scan this page" or paste text to verify
3. Claims are highlighted right on the page with color-coded verdicts

FEATURES
• Scan any webpage — Automatically extracts and verifies claims from articles
• Inline highlights — See verdicts right on the page with color-coded markers
• Right-click verify — Select any text, right-click, and choose "Verify with Factward"
• Paste & check — Paste any text to fact-check it instantly
• Detailed reports — View full evidence reports on factward.ai

VERDICT TYPES
• Supported (green) — Claim is backed by reliable sources
• Mixed (amber) — Partially supported with some caveats
• Unsupported (red) — Claim contradicts available evidence
• Insufficient (gray) — Not enough evidence to make a determination

GETTING STARTED
Install the extension, sign in with your Factward account, and start fact-checking. No configuration needed — it just works.

Need an account? Sign up free at https://factward.ai/signup
```

**Category:** Productivity

**Language:** English

### 4. Required Assets

You need to provide:
- **Store icon:** 128x128 PNG (use `icons/icon-128.png`)
- **Screenshots:** At least 1 screenshot, 1280x800 or 640x400
  - Screenshot 1: The popup showing scan results on a news article
  - Screenshot 2: Inline highlights on a webpage with tooltips
  - Screenshot 3: The welcome/login page
- **Promotional tile (optional):** 440x280 PNG

### 5. Privacy Practices

When filling in the privacy section:
- **Single purpose:** "Fact-check claims on webpages by verifying them against real sources"
- **Data collected:** Email address (for authentication only)
- **Data usage:** Authentication — not sold, not used for unrelated purposes
- **Remote code:** No remote code execution
- **Privacy policy URL:** https://factward.ai/privacy (or link to the bundled privacy.html)

### 6. Submit for Review

Click "Submit for review." Chrome Web Store review typically takes 1-3 business days.

Once approved, users can install from a direct link like:
```
https://chrome.google.com/webstore/detail/factward/[YOUR_EXTENSION_ID]
```

## After Publishing

Share the Chrome Web Store link on your website. Users will:
1. Click the link → Chrome Web Store page opens
2. Click "Add to Chrome" → Extension installs
3. Welcome page opens automatically → Sign in
4. Done — Factward is in their toolbar, ready to use
