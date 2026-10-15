import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function capture() {
  console.log("=== CAPTURING ADMIN ANALYTICS SCREENSHOT ===");

  // 1. Get authenticated session for leadersosmed@gmail.com
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "leadersosmed@gmail.com",
  });

  if (linkErr || !link.properties?.hashed_token) {
    throw new Error("Failed to generate magic link: " + linkErr?.message);
  }

  const anon = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: sessErr } = await anon.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });

  if (sessErr || !sessionData.session) {
    throw new Error("Failed to verify OTP: " + sessErr?.message);
  }

  const session = sessionData.session;
  console.log("Authenticated as:", session.user.email);

  // 2. Generate SSR Cookies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cookiesToSet: any[] = [];
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return []; },
      setAll(c) { cookiesToSet = c; }
    }
  });

  await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  console.log(`Prepared ${cookiesToSet.length} SSR auth cookies.`);

  // 3. Launch Chrome with CDP
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const port = 9222;
  const chromeProc = spawn(chromePath, [
    "--headless",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    "--window-size=1400,900",
  ]);

  // Wait for Chrome CDP to be available
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const verRes = await fetch(`http://127.0.0.1:${port}/json/version`);
    const verData = await verRes.json();
    console.log("Connected to Headless Chrome via CDP:", verData.Browser);

    // Get existing page target from /json/list
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    console.log("Using page target:", pageTarget.id);

    // Connect WebSocket
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingRequests = new Map<number, (res: any) => void>();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingRequests.has(msg.id)) {
        pendingRequests.get(msg.id)!(msg.result);
        pendingRequests.delete(msg.id);
      }
    };

    await new Promise((resolve) => { ws.onopen = resolve; });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sendCDP(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = msgId++;
        pendingRequests.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCDP("Page.enable");
    await sendCDP("Network.enable");

    // Set Cookies in browser
    for (const cookie of cookiesToSet) {
      await sendCDP("Network.setCookie", {
        name: cookie.name,
        value: cookie.value,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
      });
    }

    // Set LocalStorage in browser for client-side AuthContext
    const projectRef = "cxanvbryqeqlgntxvghy";
    const storageKey = `sb-${projectRef}-auth-token`;
    const storageValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    });

    await sendCDP("Runtime.evaluate", {
      expression: `localStorage.setItem('${storageKey}', '${storageValue}');`,
    });

    console.log("Navigating to http://localhost:3000/admin/analytics?year=2026&quarter=Q4 ...");
    await sendCDP("Page.navigate", { url: "http://localhost:3000/admin/analytics?year=2026&quarter=Q4" });

    // Wait 3.5s for page to fetch data and render charts
    await new Promise((r) => setTimeout(r, 3500));

    // Capture Screenshot
    const screenshotData = await sendCDP("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });

    const buffer = Buffer.from(screenshotData.data, "base64");
    const outPath = "/tmp/admin-analytics-q4.png";
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot to ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Copy to artifact directory
    const artifactDir = "/Users/bayuaji/.gemini/antigravity/brain/35f9a2ca-6e40-49a6-901c-366859909e26";
    const artifactPath = path.join(artifactDir, "admin-analytics-header-q4.png");
    fs.copyFileSync(outPath, artifactPath);
    console.log(`Copied to artifact directory: ${artifactPath}`);

    ws.close();
  } finally {
    chromeProc.kill();
  }

  console.log("✅ Admin Analytics header screenshot captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
