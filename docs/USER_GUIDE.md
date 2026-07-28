# User Guide

Phase 1 provides the public platform landing page and live API/database status. Start both applications with `npm run dev`, then open `http://localhost:5173`.

## Customer access

1. Choose **Create an account**, provide a strong password, and submit.
2. Enter the emailed six-digit verification code.
3. Sign in. The protected profile shows identity information and recent login history.
4. Use **Forgot password** to request a one-time reset code.
5. Changing a password signs out all sessions for safety.

Employee and administrator operational dashboards remain scheduled for later phases.

## Bank accounts

Customers open **Accounts**, select Savings or Current, and submit an application. New applications are pending with a zero balance. Employees or administrators open **Reviews**, enter a review note, and approve or reject the request. Approved accounts become active; rejected accounts are closed and retained.

## Transfers and history

Open **Transfer**, select an active sender account, enter the receiver’s 12-digit account number, amount, and description, then review the confirmation dialog. Do not close the page while a request is processing; safe retries use the same request key.

Open **Transactions** to search by reference, description, or counterparty account and filter by direction, status, or date. Select **Details** for the balance snapshot and receipt. The receipt page can be printed or saved as PDF through the browser.

## Beneficiaries

Open **Beneficiaries**, enter a nickname and another customer’s active 12-digit account number, and choose **Save beneficiary**. Saved beneficiaries appear as optional recipients on the Transfer page. Removing one does not alter previous transactions.
