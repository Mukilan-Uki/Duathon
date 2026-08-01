# Stage 7 Test Matrix

| Area                                 |       Customer |                   Junior |                    Guardian |       Employee |          Admin | Automated evidence                                       |
| ------------------------------------ | -------------: | -----------------------: | --------------------------: | -------------: | -------------: | -------------------------------------------------------- |
| Registration and email verification  |            Yes |      Identity foundation | Guardian uses adult account |            N/A |            N/A | `auth.test.js`                                           |
| Login, refresh and password recovery |            Yes |                      Yes |                         Yes |            Yes |            Yes | `auth.test.js`, `userPasswordCompatibility.test.js`      |
| Accounts and ownership               |            Yes |       Restricted account |             Own source only |         Review |         Review | `account.test.js`, `accountModel.test.js`                |
| Transfers and idempotency            |            Yes |          Supervised only |   Allowance/approved action |        Monitor |        Monitor | `transactionApi.test.js`, `transactionService.test.js`   |
| Beneficiaries                        |            Yes |      Approval restricted |              Approve/reject |            N/A |            N/A | `beneficiaryApi.test.js`, `juniorBankingApi.test.js`     |
| Loans                                |            Yes | Blocked by junior policy |                         N/A |         Review |         Review | `loanApi.test.js`, `loanService.test.js`                 |
| Family groups and shared goals       |   Member/admin |            Junior member |          Family permissions |            N/A |            N/A | `familyApi.test.js`, `familyModel.test.js`               |
| Allowances, controls and approvals   |            N/A |             Request/view |               Manage/review |     Conversion |     Conversion | `juniorBankingApi.test.js`, `juniorBankingModel.test.js` |
| Trusted devices and session logout   |            Yes |                      Yes |                         Yes |            Yes |            Yes | `trustedDeviceApi.test.js`, `trustedDeviceModel.test.js` |
| Role and ownership authorization     |            Yes |                      Yes |                         Yes |            Yes |            Yes | API route suites                                         |
| Error handling                       |            Yes |                      Yes |                         Yes |            Yes |            Yes | `errorHandler.test.js` and API suites                    |
| Responsive production bundle         | Build verified |           Build verified |              Build verified | Build verified | Build verified | `npm run build`                                          |

Manual staging checks still required: real email delivery, MongoDB replica-set transactions, cross-domain secure cookies, deployed CORS policy, mobile browser layout, and all seeded role journeys.
