import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Allow self-signed and expired TLS certificates for local or domestic IPTV feeds
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Global memory for active session tokens
const sessionTokens = new Map<string, string>();
const sessionCookies = new Map<string, string>();

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
      const proxySegments = req.query.proxySegments === "true";

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

      let mergedCookie = cookie;
      if (sessionId && sessionCookies.has(sessionId)) {
        const storedCookies = sessionCookies.get(sessionId) || "";
        if (storedCookies) {
          if (mergedCookie) {
            mergedCookie = `${mergedCookie}; ${storedCookies}`;
          } else {
            mergedCookie = storedCookies;
          }
        }
      }

      const fetchHeaders: Record<string, string> = {
        "Accept": "*/*"
      };
      if (mergedCookie) fetchHeaders["Cookie"] = mergedCookie;
      
      const isTelewebionOrDomestic = 
        finalUrl.includes("telewebion") ||
        finalUrl.includes("shasans") ||
        finalUrl.includes("irib") ||
        finalUrl.includes("sepehr") ||
        finalUrl.includes("live.ir") ||
        finalUrl.includes("hls.ir") ||
        finalUrl.includes(".ir/") ||
        finalUrl.includes("arvan") ||
        finalUrl.includes("sedaoseema");

      if (referer) {
        fetchHeaders["Referer"] = referer;
      } else if (isTelewebionOrDomestic) {
        fetchHeaders["Referer"] = "https://www.telewebion.com/";
        fetchHeaders["Origin"] = "https://www.telewebion.com";
      }
      fetchHeaders["User-Agent"] = userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      // Bypassing Iranian geoblocks on foreign hosting (e.g., Cloud Run) using header IP spoofing pool
      if (isTelewebionOrDomestic) {
        const iranIps = [
          "2.180.12.34",    // TCI / Telecommunication Company of Iran (Tehran)
          "5.200.120.45",   // Irancell (Mobile & FTTH)
          "185.123.44.12",  // Shatel (High-speed broad)
          "46.224.1.2",     // Asiatech
          "94.101.240.1",   // Pars Online
          "176.101.54.32",  // Hamrah-e-Aval (Mobile LTE Network)
          "185.208.174.15", // Respina
          "31.56.0.4",      // Mobinnet (TD-LTE)
          "89.199.1.5",     // Rightel
          "79.175.128.1"    // Tebyan IDC
        ];
        // Rotate Iranian IP to mimic genuine local residential stream consumers
        const spoofedIranIp = iranIps[Math.floor(Math.random() * iranIps.length)];
        
        fetchHeaders["X-Forwarded-For"] = spoofedIranIp;
        fetchHeaders["X-Real-IP"] = spoofedIranIp;
        fetchHeaders["Client-IP"] = spoofedIranIp;
        fetchHeaders["X-Client-IP"] = spoofedIranIp;
        fetchHeaders["True-Client-IP"] = spoofedIranIp;
        fetchHeaders["CF-Connecting-IP"] = spoofedIranIp;
        fetchHeaders["X-Originating-IP"] = spoofedIranIp;
        fetchHeaders["X-Remote-IP"] = spoofedIranIp;
        fetchHeaders["X-Remote-Addr"] = spoofedIranIp;
      }

      const response = await fetch(finalUrl, { headers: fetchHeaders });
      
      // Extract and save Set-Cookie headers targeting the active session
      if (sessionId) {
        let setCookies: string[] = [];
        if (typeof (response.headers as any).getSetCookie === "function") {
          setCookies = (response.headers as any).getSetCookie();
        } else {
          const rawSetCookie = response.headers.get("set-cookie");
          if (rawSetCookie) {
            setCookies = rawSetCookie.split(/,\s*(?=[a-zA-Z0-9_]+=)/);
          }
        }

        if (setCookies && setCookies.length > 0) {
          const cookieMap = new Map<string, string>();
          const existingCookies = sessionCookies.get(sessionId) || "";
          if (existingCookies) {
            existingCookies.split(";").forEach(c => {
              const parts = c.trim().split("=");
              if (parts[0] && parts[1]) {
                cookieMap.set(parts[0].trim(), parts[1].trim());
              }
            });
          }

          setCookies.forEach(cookieStr => {
            const cleanPart = cookieStr.split(";")[0];
            if (cleanPart) {
              const parts = cleanPart.trim().split("=");
              if (parts[0] && parts[1]) {
                cookieMap.set(parts[0].trim(), parts[1].trim());
              }
            }
          });

          const serialized = Array.from(cookieMap.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
          
          sessionCookies.set(sessionId, serialized);
        }
      }
      
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

          // If proxySegments is FALSE (default): we bypass media segments (.ts, .mp4, .m4s, etc.)
          // so they are downloaded directly by the user's browser, maximizing speed with their local ISP.
          // If proxySegments is TRUE: even media segments are routed via our proxy (useful for extreme VPNs).
          // We also FORCE proxySegments for domestic Iranian / Telewebion streams since they require cookie/IP spoofing.
          const isPlayListLine = absUrl.toLowerCase().includes(".m3u8") || !absUrl.toLowerCase().match(/\.(ts|mp4|m4s|aac|mp3|m4a|webvtt)(\?|$)/);
          const segmentNeedsProxy = proxySegments || isPlayListLine || isTelewebionOrDomestic;
          if (!segmentNeedsProxy) {
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
          if (proxySegments || isTelewebionOrDomestic) qParams.set("proxySegments", "true");

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
