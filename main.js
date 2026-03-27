/**
 * NeonAnime Hub - Advanced CF Link Extractor
 * Logic based on discovered 'fireplayer_player' handshake
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // --- STEP 1: UI PANEL (Temporary) ---
    if (request.method === "GET" && !url.searchParams.has("id")) {
      return new Response(renderUI(), { headers: { "Content-Type": "text/html" } });
    }

    // --- STEP 2: SCRAPER ENGINE ---
    try {
      // We need the 'data' hash from the user (e.g., e6bfd869a81f98ce424bfff9642fbe39)
      const hashId = url.searchParams.get("id");
      if (!hashId) throw new Error("No Hash ID provided.");

      const targetDomain = "as-cdn21.top";
      const playerUrl = `https://${targetDomain}/video/${hashId}`;
      const apiEndpoint = `https://${targetDomain}/player/index.php?data=${hashId}&do=getVideo`;

      // 1. STAGE ONE: "The Knock" - Capture the Session Cookie
      const sessionResponse = await fetch(playerUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://toonstream.dad/"
        }
      });

      const setCookie = sessionResponse.headers.get("set-cookie");
      if (!setCookie) throw new Error("Failed to capture fireplayer_player cookie.");
      
      // Clean the cookie string for the next request
      const fireCookie = setCookie.split(';')[0];

      // 2. STAGE TWO: "The Handshake" - Replicate the AJAX POST
      const payload = new URLSearchParams();
      payload.append('hash', hashId);
      payload.append('r', 'https://toonstream.dad/');

      const finalResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Cookie": fireCookie,
          "X-Requested-With": "XMLHttpRequest", // Critical suspect header
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Origin": `https://${targetDomain}`,
          "Referer": playerUrl,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: payload
      });

      const data = await finalResponse.text();
      
      // Return the raw link data or the parsed M3U8
      return new Response(data, { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};

function renderUI() {
  return `
    <html>
      <head>
        <title>Neon Scraper Debug</title>
        <style>
          body { font-family: sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
          input { width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none; }
          button { background: #e91e63; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
          #result { background: #333; padding: 15px; margin-top: 20px; word-break: break-all; border-left: 4px solid #e91e63; }
        </style>
      </head>
      <body>
        <h2>⚡ NeonAnime Link Extractor</h2>
        <p>Paste the <b>Hash ID</b> from your Network Tab</p>
        <input type="text" id="hashInput" placeholder="e.g. e6bfd869a81f98ce424bfff9642fbe39">
        <button onclick="scrape()">Extract Link</button>
        <div id="result">Waiting for input...</div>

        <script>
          async function scrape() {
            const id = document.getElementById('hashInput').value;
            const res = await fetch('?id=' + id);
            const data = await res.text();
            document.getElementById('result').innerText = data;
          }
        </script>
      </body>
    </html>
  `;
}
