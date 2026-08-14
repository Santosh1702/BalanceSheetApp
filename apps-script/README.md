# BalanceSheetApp Apps Script workflow

The repository is the authoritative source for reviewed Apps Script source. `Code.gs` stays in this directory, while the local root-level `.clasp.json` selects the existing Apps Script project and is ignored by Git. The production manifest must be pulled and reviewed before `appsscript.json` is managed here.

## One-time setup

1. Install the pinned tools with `npm install`.
2. Authenticate and configure the existing project:

   ```sh
   npm run apps-script:login
   cp .clasp.json.example .clasp.json
   # Set the existing Script ID in .clasp.json.
   npm run apps-script:status
   clasp pull
   ```

   Clasp stores its OAuth credentials outside the repository; never commit credentials or tokens. The script ID from **Project Settings → IDs → Script ID** is intentionally kept only in the ignored `.clasp.json`.
3. Before accepting any pulled files into Git, inspect `apps-script/appsscript.json` and the complete pull diff. Preserve the existing production manifest as the authoritative base, including every existing project setting. Do not replace it with a newly invented minimal manifest.
4. Confirm that the preserved manifest contains this Google Sheets Advanced Service v4 entry required by `Sheets.Spreadsheets.batchUpdate()`; add it without removing other manifest settings if it is absent:

   ```json
   {
     "userSymbol": "Sheets",
     "serviceId": "sheets",
     "version": "v4"
   }
   ```

5. In the Apps Script editor, confirm **Google Sheets API** is listed under **Services**. If the script uses a standard Google Cloud project, also confirm the Google Sheets API is enabled for that project. Only after these checks should the reviewed production manifest be committed and managed from the repository.
6. In **Project Settings → Script properties**, preserve these existing values:

   | Property | Value |
   | --- | --- |
   | `SHEET_ID` | The spreadsheet ID for the shared ledger workbook |
   | `GOOGLE_CLIENT_ID` | The same OAuth web client ID used in the frontend `.env` |

Do not run `clasp create`. This workflow must target the existing project and existing web-app deployment.

## Updating the existing Apps Script project

1. Update the local repository:

   ```sh
   git checkout main
   git pull origin main
   npm install
   ```

2. Verify the repository:

   ```sh
   npm test
   npm run build
   npm run lint
   git diff --check
   ```

3. Reconfirm the script ID in the ignored `.clasp.json`, then inspect the files clasp will push:

   ```sh
   npm run apps-script:status
   ```

4. Update source in the configured existing Apps Script project:

   ```sh
   npm run apps-script:push
   ```

   The push command runs `clasp status` again before `clasp push`. It does not create a project, version, or deployment.

5. Open the existing Apps Script project and verify `Code.gs`, `appsscript.json`, the Sheets Advanced Service, and the script properties.
6. In **Deploy → Manage deployments**, edit the **existing web-app deployment**, select **New version**, and deploy it. Do not create a separate web-app deployment. This preserves the current deployment URL used by `VITE_API_BASE_URL`.

`clasp push` updates project source; it does not publish that source to the web app. Publishing remains an explicit manual version update on the existing deployment.

The API web app should continue to execute as **Me** and allow access to **Anyone**. The backend verifies Google ID tokens and permits only active users in the `Users` sheet, so public web-app access does not itself grant ledger access.

The `AuditLog` sheet requires a `requestId` header. Existing audit rows may leave this cell blank; new transaction creates store their client-generated request ID there for replay-safe idempotency.
