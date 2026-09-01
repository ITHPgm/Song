// server.js
import { createServer } from "node:http";

const server = createServer((req, res) => {
  res.end("Server is running");
});

server.listen(process.env.PORT || 3000);