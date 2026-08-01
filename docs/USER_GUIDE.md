# User Guide

Phase 1 provides the public platform landing page and live API/database status. Start both applications with `npm run dev`, then open `http://localhost:5173`.

## Customer access

1. Choose **Create an account**, provide a strong password, and submit.
2. Enter the emailed six-digit verification code.
3. Sign in. The protected profile shows identity information and recent login history.
4. Use **Forgot password** to request a one-time reset code.
5. Changing a password signs out all sessions for safety.

After sign-in, each role lands on its dashboard:

- Customers can review total available balance, money sent and received, active loans, accounts, recent transactions, and six-month cash flow.
- Employees can review assigned-customer counts, pending account and loan work, recent volume, account status distribution, and high-value transfers needing attention.
- Administrators can review bank-wide users, accounts, transaction records, transferred value, pending loans, role distribution, and six-month transfer trends.

Use the **Dashboard** link in the header or the dashboard sidebar to return to the overview.

Customers can open **Notifications** to review account, transaction, loan, and security alerts, mark individual alerts as read, or mark all as read. Notification categories can be enabled or disabled from the profile page. Recent successful and unsuccessful sign-ins remain visible under login history.

Employees use **Monitoring** to review recent transactions, flag activity, and add investigation notes. Administrators can also access monitoring and use **System & audit** to configure approved system keys and review immutable action history.

Keyboard users can use the **Skip to main content** link when it appears on focus. All primary workflows expose visible focus indicators, and operating-system reduced-motion preferences are respected. If an unexpected display failure occurs, the recovery page confirms that banking data was not changed and offers a safe reload action.

## Demo roles

The controlled local seed creates one Customer, Employee, and Administrator identity. Run it only against a dedicated development database using the instructions in the README. All three accounts use the locally supplied `DEMO_SEED_PASSWORD`; the password is never stored in source control. Demo credentials must not be enabled or shared for a production deployment.

## Bank accounts

Customers open **Accounts**, select Savings or Current, and submit an application. New applications are pending with a zero balance. Employees or administrators open **Reviews**, enter a review note, and approve or reject the request. Approved accounts become active; rejected accounts are closed and retained.

## Transfers and history

Open **Transfer**, select an active sender account, enter the receiver’s 12-digit account number, amount, and description, then review the confirmation dialog. Do not close the page while a request is processing; safe retries use the same request key.

Open **Transactions** to search by reference, description, or counterparty account and filter by direction, status, or date. Select **Details** for the balance snapshot and receipt. The receipt page can be printed or saved as PDF through the browser.

## Beneficiaries

Open **Beneficiaries**, enter a nickname and another customer’s active 12-digit account number, and choose **Save beneficiary**. Saved beneficiaries appear as optional recipients on the Transfer page. Removing one does not alter previous transactions.

## Loans

Customers open **Loans**, select an active disbursement account, type, requested amount, repayment period, and purpose. The application remains pending until staff review. Approved funds are credited to the selected account and repayment details appear immediately.

Employees and administrators open **Loan reviews**, add a review note, and approve/disburse or reject. Previous decisions remain visible. Customers make payments from an active account through the confirmation dialog; successful payments update the outstanding balance and transaction history.

## Family administrator and members

Open **Family Banking** to create an adult family, invite existing verified adults, publish announcements and create shared goals. Family administrators manage roles and individual permissions from **Members**. Membership never reveals another adult's account balance. Invited adults accept or reject from **Invitations**; contributions debit only the contributor's selected account.

## Junior user

Open **Junior Banking** to see the restricted available balance, allowance, limits, recent approval requests, savings goals and education tips. Junior accounts cannot bypass supervision through the normal transfer endpoint. Requests above the configured threshold wait for a guardian; rejected, expired and completed states remain visible.

## Guardian

Open **Guardian controls**, select an authorized junior and configure integer spending limits, transfer availability and allowances. Review pending transfer requests carefully before approval. The backend rechecks account status, balance, expiry and limits when approved. Guardian permissions do not expose authentication secrets or unrelated accounts.

## Trusted devices

Every authenticated role can open **Security Centre**. Review current and previous devices, rename recognizable devices, trust the current device after confirming the password, remove trust, terminate one device session, or sign out all other sessions. Investigate high-risk or unfamiliar login-history entries and change the password if compromise is suspected.

## Employee and administrator operations

Employees approve/reject accounts, review loans and monitor activity within their authorized tools. Administrators additionally manage allow-listed settings and review immutable audit records. Junior-to-adult conversion requires staff age and identity verification and preserves account and transaction history.
