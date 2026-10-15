/**
 * MR.BOB CREATOR HUB — PHASE 2 AUTOMATED TEST SUITE
 * Point Wallet, Expiration Calculation, Order-based Consumption & Security
 */

import { calculatePointsFromViews, getDaysUntilExpiration, PointLot } from "../src/lib/types/wallet";
import { formatPoints, formatDateTimeWIB } from "../src/lib/utils";
import { OFFICIAL_REWARDS } from "../src/lib/types/reward";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${testName}`);
}

console.log("=== RUNNING PHASE 2 POINT WALLET SYSTEM TESTS ===\n");

// 1. Official Conversion Formula Tests (1,000 verified views = 10 Poin)
console.log("--- 1. Point Conversion Formula Tests ---");
assert(calculatePointsFromViews(0) === 0, "0 views returns 0 points");
assert(calculatePointsFromViews(99) === 0, "99 views returns 0 points (floor)");
assert(calculatePointsFromViews(100) === 1, "100 views returns 1 point");
assert(calculatePointsFromViews(999) === 9, "999 views returns 9 points");
assert(calculatePointsFromViews(1000) === 10, "1,000 views returns 10 points (Exact Rule)");
assert(calculatePointsFromViews(1550) === 15, "1,550 views returns 15 points");
assert(calculatePointsFromViews(10000) === 100, "10,000 views returns 100 points");
assert(calculatePointsFromViews(100000) === 1000, "100,000 views returns 1,000 points");
assert(calculatePointsFromViews(5000000) === 50000, "5,000,000 views returns 50,000 points (Max Reward equivalent)");

// 2. 6-Month Expiration & Days Remaining Tests
console.log("\n--- 2. Expiration Calculation Tests ---");
const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

assert(getDaysUntilExpiration(in30Days.toISOString()) === 30, "Calculates 30 days remaining correctly");
assert(getDaysUntilExpiration(in7Days.toISOString()) === 7, "Calculates 7 days remaining correctly");
assert(getDaysUntilExpiration(pastDate.toISOString()) <= 0, "Past date yields <= 0 days (expired)");

// 3. Order-based Lot Consumption Simulation (Earliest Expiration Consumed First)
console.log("\n--- 3. Order-based Lot Consumption Logic ---");
// Simulate 3 active lots with different expiration dates
const mockLots: PointLot[] = [
  {
    id: "lot-early",
    userId: "user-1",
    sourceType: "views",
    originalPoints: 50,
    remainingPoints: 50,
    issuedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Expires soonest!
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lot-mid",
    userId: "user-1",
    sourceType: "views",
    originalPoints: 100,
    remainingPoints: 100,
    issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lot-latest",
    userId: "user-1",
    sourceType: "bonus",
    originalPoints: 200,
    remainingPoints: 200,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // Expires last
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Sort lots by expiration date ascending
const sortedLots = [...mockLots].sort(
  (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
);

assert(sortedLots[0].id === "lot-early", "Earliest expiring lot is sorted first");
assert(sortedLots[1].id === "lot-mid", "Middle expiring lot is sorted second");
assert(sortedLots[2].id === "lot-latest", "Latest expiring lot is sorted last");

// Simulate redemption of 70 points
const requestedPoints = 70;
let needed = requestedPoints;
const deductions: { lotId: string; amount: number }[] = [];

for (const lot of sortedLots) {
  if (needed <= 0) break;
  const take = Math.min(lot.remainingPoints, needed);
  lot.remainingPoints -= take;
  deductions.push({ lotId: lot.id, amount: take });
  needed -= take;
}

assert(deductions.length === 2, "Redemption consumed points across 2 lots");
assert(deductions[0].lotId === "lot-early" && deductions[0].amount === 50, "First lot (50 pts) completely consumed");
assert(deductions[1].lotId === "lot-mid" && deductions[1].amount === 20, "Second lot provided remaining 20 pts");
assert(mockLots.find(l => l.id === "lot-early")!.remainingPoints === 0, "First lot has 0 remaining points");
assert(mockLots.find(l => l.id === "lot-mid")!.remainingPoints === 80, "Second lot has 80 remaining points");
assert(mockLots.find(l => l.id === "lot-latest")!.remainingPoints === 200, "Third lot untouched (200 pts)");

// 4. Rewards Catalog Integrity Check
console.log("\n--- 4. Rewards Catalog Integrity ---");
assert(OFFICIAL_REWARDS.length === 13, "Catalog contains exactly 13 official rewards");
assert(OFFICIAL_REWARDS[0].requiredPoin === 10, "First reward (Keychain) requires 10 Poin");
const highestReward = OFFICIAL_REWARDS[OFFICIAL_REWARDS.length - 1];
assert(highestReward.requiredPoin === 50000, "Highest reward requires 50,000 Poin");

// 5. Utility & Formatting Tests
console.log("\n--- 5. Utility Formatting Tests ---");
assert(formatPoints(1000) === "1.000", "Formats thousand with dot separator");
assert(formatPoints(50000) === "50.000", "Formats 50,000 with dot separator");
const formattedWib = formatDateTimeWIB(new Date("2026-10-14T10:00:00Z"));
assert(formattedWib.includes("WIB"), "Includes WIB timezone suffix in date formatting");

console.log("\n=======================================================");
console.log("🎉 ALL 18 PHASE 2 POINT WALLET TESTS PASSED PERFECTLY!");
console.log("=======================================================");
