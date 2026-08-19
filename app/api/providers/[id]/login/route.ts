import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const authCode = body.authCode;

  // Providers that use auth-code paste flow
  const providersUsingAuthCode = ["steam", "epic", "gog", "ubisoft", "ea"];

  if (providersUsingAuthCode.includes(id)) {
    if (!authCode) {
      // Return instructions for the user
      const instructions: Record<string, { title: string; steps: string[]; note?: string }> = {
        steam: {
          title: "Login to Steam",
          steps: [
            "Open Steam on your PC (or web browser)",
            "Make sure you are logged in",
            "Copy your Steam ID (numeric, e.g. 76561198012345678)",
            "Find it at: steamcommunity.com/id/YOURNAME → right-click → Copy Page URL",
            "The number after /id/ is your Steam ID",
            "Paste it below",
          ],
          note: "Anonymous login is used for free games. For paid games, provide your Steam ID.",
        },
        epic: {
          title: "Login to Epic Games",
          steps: [
            "Open a terminal on your Colab runtime",
            "Run: legendary auth",
            "Follow the instructions to log in",
            "Copy the authorization code that appears",
            "Paste it below",
          ],
          note: "legendary is the open-source Epic Games launcher.",
        },
        gog: {
          title: "Login to GOG",
          steps: [
            "Open a terminal on your Colab runtime",
            "Run: lgogdownloader --login",
            "Follow the instructions to log in",
            "Copy the authentication code that appears",
            "Paste it below",
          ],
          note: "lgogdownloader is the open-source GOG downloader.",
        },
        ubisoft: {
          title: "Login to Ubisoft Connect",
          steps: [
            "Ubisoft Connect requires manual authentication.",
            "Your games will be available when the agent is connected.",
          ],
          note: "Coming soon - Ubisoft Connect integration.",
        },
        ea: {
          title: "Login to EA App",
          steps: [
            "EA App requires manual authentication.",
            "Your games will be available when the agent is connected.",
          ],
          note: "Coming soon - EA App integration.",
        },
      };

      return NextResponse.json({
        ok: true,
        data: { provider: id, method: "auth_code", instructions: instructions[id] || { title: "Login", steps: ["Paste your auth code below"] } },
      });
    }

    // Save the auth code to a file the agent can read
    const fs = require("fs");
    const path = require("path");
    const authDir = path.join(process.cwd(), ".auth");
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(path.join(authDir, `${id}_auth.txt`), authCode);

    return NextResponse.json({
      ok: true,
      data: { provider: id, method: "auth_code", status: "saved", message: "Auth code saved. Agent will use it on next sync." },
    });
  }

  return NextResponse.json({
    ok: false,
    error: `Provider ${id} not supported`,
  });
}
