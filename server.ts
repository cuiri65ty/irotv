import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Allow self-signed and expired TLS certificates for local or domestic IPTV feeds
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Global memory for active session tokens
const sessionTokens = new Map<string, string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Keep CORS headers active for all requests
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Save or update raw token of a session
  app.post("/api/session/token", (req, res) => {
    const { sessionId, token } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }
    sessionTokens.set(sessionId, token || "");
    return res.json({ success: true, sessionId, token });
  });

  // API Route: Read session token
  app.get("/api/session/token", (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }
    return res.json({ token: sessionTokens.get(sessionId) || "" });
  });

  // API Route: CORS token fetch proxy
  app.get("/api/fetch-token", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "Missing Token URL" });
      }

      const headers: Record<string, string> = {
        "Accept": "*/*"
      };
      if (req.query.cookie) headers["Cookie"] = req.query.cookie as string;
      if (req.query.referer) headers["Referer"] = req.query.referer as string;
      if (req.query.userAgent) {
        headers["User-Agent"] = req.query.userAgent as string;
      } else {
        headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      }

      const fetchRes = await fetch(url, { headers });
      const text = await fetchRes.text();
      return res.send(text);
    } catch (err: any) {
      console.error("Token API Proxy Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Stream proxy for M3U8, TS, and HLS sub-directories
  app.get("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("url is required");
      }

      // Check if session state holds a renewed token
      const sessionId = req.query.sessionId as string || "";
      let token = req.query.token as string || "";
      if (sessionId && sessionTokens.has(sessionId)) {
        token = sessionTokens.get(sessionId) || "";
      }

      const cookie = req.query.cookie as string || "";
      const referer = req.query.referer as string || "";
      const userAgent = req.query.userAgent as string || "";
      const tokenParam = req.query.tokenParam as string || "token";

      // Append token
      let finalUrl = targetUrl;
      if (token) {
        try {
          const parsedUrl = new URL(targetUrl);
          parsedUrl.searchParams.set(tokenParam, token);
          finalUrl = parsedUrl.toString();
        } catch (e) {
          const joinChar = targetUrl.includes("?") ? "&" : "?";
          finalUrl = `${targetUrl}${joinChar}${tokenParam}=${token}`;
        }
      }

      const fetchHeaders: Record<string, string> = {
        "Accept": "*/*"
      };
      if (cookie) fetchHeaders["Cookie"] = cookie;
      if (referer) {
        fetchHeaders["Referer"] = referer;
      } else if (
        finalUrl.includes("telewebion") ||
        finalUrl.includes("shasans") ||
        finalUrl.includes("irib") ||
        finalUrl.includes("sepehr") ||
        finalUrl.includes("live.ir") ||
        finalUrl.includes("hls.ir")
      ) {
        fetchHeaders["Referer"] = "https://www.telewebion.com/";
        fetchHeaders["Origin"] = "https://www.telewebion.com";
      }
      fetchHeaders["User-Agent"] = userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      const response = await fetch(finalUrl, { headers: fetchHeaders });
      
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const isM3U8 = 
        contentType.includes("mpegurl") || 
        contentType.includes("apple-mpegurl") || 
        targetUrl.toLowerCase().includes(".m3u8") ||
        targetUrl.toLowerCase().split("?")[0].endsWith(".m3u8");

      if (isM3U8) {
        const text = await response.text();
        const baseToUse = response.url || finalUrl;

        // Rewrite m3u8 playlist addresses
        const rewritten = text.split("\n").map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            return line;
          }

          // Convert to direct absolute url
          let absUrl = "";
          try {
            absUrl = new URL(trimmed, baseToUse).toString();
          } catch (e) {
            absUrl = trimmed;
          }

          // Only proxy playlists or files requiring auth header bypass (e.g., .m3u8).
          // Media segments (.ts, .mp4, .m4s, .aac, .mp3, etc.) are downloaded directly by the client browser.
          // This keeps media traffic local on Iranian internet with high speed and zero proxy geoblocks!
          const isPlayListLine = absUrl.toLowerCase().includes(".m3u8") || !absUrl.toLowerCase().match(/\.(ts|mp4|m4s|aac|mp3|m4a|webvtt)(\?|$)/);
          if (!isPlayListLine) {
            return absUrl;
          }

          // Build proxy link for sub-playlists or auth endpoints
          const qParams = new URLSearchParams();
          qParams.set("url", absUrl);
          if (sessionId) qParams.set("sessionId", sessionId);
          if (token) qParams.set("token", token);
          if (cookie) qParams.set("cookie", cookie);
          if (referer) qParams.set("referer", referer);
          if (userAgent) qParams.set("userAgent", userAgent);
          if (tokenParam) qParams.set("tokenParam", tokenParam);

          return `/api/proxy?${qParams.toString()}`;
        }).join("\n");

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        return res.send(rewritten);
      } else {
        // Audio/Video or TS binary chunks download
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const resType = response.headers.get("content-type");
        if (resType) {
          res.setHeader("Content-Type", resType);
        }
        res.setHeader("Content-Length", buffer.length.toString());
        return res.send(buffer);
      }
    } catch (err: any) {
      console.error("IPTV Proxy Controller Fail:", err);
      return res.status(500).send("Proxy error: " + err.message);
    }
  });

  // Mount Vite or serve production site
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TV Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
