const http = require("http");
const ngrok = require("@ngrok/ngrok");

// Estado global dinâmico: aceita QUALQUER JSON enviado pelo /publish
let estadoGlobal = {};

let clientesConectados = [];

function broadcast(dados) {
  const payload = `data: ${JSON.stringify(dados)}\n\n`;
  clientesConectados.forEach((res) => res.write(payload));
}

function startServer() {
  const server = http.createServer((req, res) => {
    // Configuração de CORS universal
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, ngrok-skip-browser-warning");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. STREAM SSE UNIVERSAL (Aceita query params como ?ngrok-skip-browser-warning=true)
    if (req.url.startsWith("/stream") && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      // Se já houver estado salvo na memória, envia imediatamente ao conectar
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

    // 2. ENDPOINT DE PUBLICAÇÃO UNIVERSAL
    if (req.url.startsWith("/publish") && req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const dadosRecebidos = JSON.parse(body);
          
          // Mescla os dados recebidos no estado global
          estadoGlobal = { ...estadoGlobal, ...dadosRecebidos };

          // Dispara para todos os clientes conectados no /stream
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

    // Rota Padrão (para URLs não reconhecidas)
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "erro", message: "Rota não encontrada" }));
  });

  server.listen(8085, () => console.log("Servidor ML Console rodando na porta 8085"));
}

async function connectNgrok() {
  const forwarder = await ngrok.forward({
    addr: 8085,
    authtoken: "3IdhRIR1iiNWE3hhjmHORXuheuU_2mNcnTR6NiLji1we5qhsi"
  });
  console.log(`\n==================================================`);
  console.log(`URL PUBLICA DO BACKEND: ${forwarder.url()}`);
  console.log(`==================================================\n`);
}

async function main() {
  startServer();
  await connectNgrok();
}

main();