# Pocket Ledger Apps Script deployment

Paste `Code.gs` into the Apps Script project linked to the Pocket Ledger spreadsheet.

In **Project Settings → Script properties**, add:

| Property | Value |
| --- | --- |
| `SHEET_ID` | `17gCjznp1B2crUTbjK_c3R7M_0LLoeBXlYfrTexpqRAA` |
| `GOOGLE_CLIENT_ID` | The same OAuth web client ID used in the frontend `.env` |

Deploy using **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. The API verifies Google ID tokens and then permits only active users in the `Users` sheet, so public web-app access does not by itself grant ledger access.

Copy the deployed URL into the frontend `.env` as `VITE_API_BASE_URL`.
