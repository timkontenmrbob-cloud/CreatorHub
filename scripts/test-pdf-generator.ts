import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { fetchQuarterlyAnalytics } from "../src/lib/supabase/analytics";
import { generateQuarterlyPDF } from "../src/lib/pdf/generate-quarterly-report";

async function testPDF() {
  console.log("=== TESTING QUARTERLY PDF REPORT GENERATOR ===");
  const data = await fetchQuarterlyAnalytics(2026, "Q4");

  console.log("Loaded Q4 2026 analytics data:");
  console.log("  Views:", data.kpis.totalVerifiedViews);
  console.log("  Points:", data.kpis.totalPointsIssued);
  console.log("  Creators:", data.kpis.participatingCreators);
  console.log("  Top Creators count:", data.topCreators.length);
  console.log("  Top Videos count:", data.topVideos.length);

  const doc = generateQuarterlyPDF(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc as any).internal.getNumberOfPages();
  console.log(`Generated PDF successfully! Total pages: ${totalPages}`);

  const outputDir = "/tmp/reports";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `Laporan-UGC-MrBOB-Q4-2026.pdf`);
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  const stats = fs.statSync(outputPath);
  console.log(`Saved PDF to: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);

  if (totalPages < 3) {
    throw new Error(`Expected at least 3 pages, got ${totalPages}`);
  }

  console.log("✅ PDF GENERATION AND STRUCTURAL VERIFICATION PASSED!");
}

testPDF().catch((err) => {
  console.error("❌ PDF generation failed:", err);
  process.exit(1);
});
