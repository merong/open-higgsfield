// Stop the local server first: PGlite must have a single process owner.
import { applyDefaultCreditBalances } from "../src/service/default-credit-migration";
import { database } from "../src/service/db";
console.log(await applyDefaultCreditBalances());
console.log(await (await database()).query("SELECT COUNT(*)::INTEGER AS accounts,MIN(credits) AS minimum,MAX(credits) AS maximum FROM users"));
process.exit(0);
