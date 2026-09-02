const http = require("http");

// Estado global dinâmico
let estadoGlobal = {};
let clientesConectados = [];

function broadcast(dados) {
  const payload = `data: ${JSON.stringify(dados)}\n\n`;
  clientesConectados.forEach((res) => res.write(payload));
}

function startServer() {
  const server = http.createServer((req, res) => {
  // Libera qualquer origem (seu site na HostGator ou local)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // Libera TODOS os cabeçalhos recebidos para não travar o Preflight
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // ... restante do código da rota /stream e /publish

    // STREAM SSE UNIVERSAL
    if (req.url.startsWith("/stream") && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      if (Object.keys(estadoGlobal).length > 0) {
        res.write(`data: ${JSON.stringify(estadoGlobal)}\n\n`);
      }

      clientesConectados.push(res);
      console.log(`[ML Console] Cliente conectado. Total: ${clientesConectados.length}`);

      req.on("close", () => {
        clientesConectados = clientesConectados.filter((client) => client !== res);
        console.log(`[ML Console] Cliente desconectado. Total: ${clientesConectados.length}`);
      });
      return;
    }

    // PUBLISH UNIVERSAL
    if (req.url.startsWith("/publish") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const dadosRecebidos = JSON.parse(body);
          estadoGlobal = { ...estadoGlobal, ...dadosRecebidos };
          broadcast(estadoGlobal);

          console.log("[ML Console] Estado atualizado:", estadoGlobal);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "sucesso", estadoAtual: estadoGlobal }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "erro", message: "JSON Inválido" }));
        }
      });
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "online", message: "ML Console Universal Backend" }));
  });

  // O Render define a porta automaticamente em process.env.PORT
  const PORT = process.env.PORT || 8085;
  server.listen(PORT, () => console.log(`Servidor ML Console rodando na porta ${PORT}`));
}

startServer();
