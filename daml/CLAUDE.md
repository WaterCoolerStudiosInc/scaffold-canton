# Daml Contract (Example)

Vault smart contract for Canton 3.x — deposit/withdraw with propose-accept pattern. **This is an example DAR** demonstrating the propose-accept pattern. Use as reference when writing new contracts.

## Commands

- `daml build` — Compile to `.daml/dist/scaffold-vault-0.1.0.dar`
- `daml test` — Run Daml Script tests (if any)

## Config

- **SDK**: 3.4.10
- **Package**: scaffold-vault 0.1.0
- **Target**: LF 2.1
- **Dependencies**: daml-prim, daml-stdlib (no external data-dependencies)

## Templates

### DepositRequest
- **Signatories**: user
- **Observers**: admin
- **Choices**: `DepositRequest_Accept` (admin), `DepositRequest_Cancel` (user)

### Deposit
- **Signatories**: user, admin
- **Choices**: `Deposit_Withdraw` (user), `Deposit_Release` (admin)

## After Changes

```bash
daml build
cd .. && scripts/daml-codegen.sh -i daml/.daml/dist -o backend/src/generated
# Upload DAR, re-index PQS
```
