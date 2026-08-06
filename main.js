// app.js

require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });

  const response = {
    message: "Your Node.js app is running 🚀",
    method: req.method,
    url: req.url,
    time: new Date()
  };

  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});