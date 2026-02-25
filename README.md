# North Star Focus Planner

Simple planner web app for ideas/initiatives and accomplishments.

## Google Sheets hookup

This repo includes Apps Script backend code for your spreadsheet:
`1H222Vt9HnLQAICXBhKPXuOIoCW5azZMqF4JRdVLvz60`

1. Open `Extensions -> Apps Script` from that spreadsheet.
2. Paste the code from `apps-script/planner-webapp.gs` into `Code.gs`.
3. Deploy as web app:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Copy the web app URL.
5. In `index.html`, set:
   - `window.PLANNER_SHEETS_URL = "YOUR_WEB_APP_URL";`
6. Commit and push. GitHub Pages will deploy automatically.

When configured, the app uses Google Sheets and also keeps a local browser backup.

## Build

```bash
npm install
npm run build
```
