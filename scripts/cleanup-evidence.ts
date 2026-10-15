import { cleanupExpiredEvidence } from "../src/lib/supabase/submissions";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  console.log("=================================================");
  console.log("MR.BOB CREATOR HUB — EVIDENCE CLEANUP WORKER");
  console.log("Retention Policy: 14 Days after Final Decision");
  console.log("=================================================\n");

  try {
    const res = await cleanupExpiredEvidence(50);
    console.log(`Scan completed at ${new Date().toISOString()}`);
    console.log(`- Expired evidence processed: ${res.processed}`);
    console.log(`- Storage files safely deleted: ${res.deleted}`);
    console.log(`- Failures / errors: ${res.errors}`);
    console.log("\nCleanup worker finished successfully.");
  } catch (err) {
    console.error("Cleanup worker error:", err);
    process.exit(1);
  }
}

main();
