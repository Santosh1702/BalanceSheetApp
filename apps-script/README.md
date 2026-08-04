# BalanceSheetApp Apps Script deployment

Paste `Code.gs` into the Apps Script project linked to the BalanceSheetApp spreadsheet.

In **Project Settings → Script properties**, add:

| Property | Value |
| --- | --- |
| `SHEET_ID` | The spreadsheet ID for the shared ledger workbook |
| `GOOGLE_CLIENT_ID` | The same OAuth web client ID used in the frontend `.env` |

Deploy using **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. The API verifies Google ID tokens and then permits only active users in the `Users` sheet, so public web-app access does not by itself grant ledger access.

The ledger backend is now aligned to the app's real transaction model:

- `DEPOSIT`
- `MONEY_GIVEN`
- `Sagar` and `Tejas` person records
- Admin-only money-given writes, while member accounts can only create deposits for their own person record

Copy the deployed URL into the frontend `.env` as `VITE_API_BASE_URL`.
