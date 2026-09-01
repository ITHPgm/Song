const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 50;
const messageHistory = [];

// Path to the HTML file (index.html is in parent directory)
const htmlPath = path.join(__dirname, '..', 'song', 'general-community', 'index.html');

const server = http.createServer((req, res) => {
    // Serve the index.html for any request (or only root)
    fs.readFile(htmlPath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading HTML file');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

const wss = new WebSocketServer({ server });
const clients = new Map(); // Map<WebSocket, { username }>

// Helper color generator
const nameColors = [
    'text-blue-400', 'text-indigo-400', 'text-purple-400',
    'text-pink-400', 'text-emerald-400', 'text-amber-400', 'text-cyan-400'
];

function getUserColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return nameColors[Math.abs(hash) % nameColors.length];
}

function broadcastNotification(text, clientCount) {
    const payload = JSON.stringify({
        type: 'notification',
        message: text,
        clientCount: clientCount
    });
    for (const [client] of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    clients.set(ws, { username: 'Anonymous' });
    broadcastNotification('A new user connected.', clients.size);

    // Send existing history to the new client
    if (messageHistory.length > 0) {
        ws.send(JSON.stringify({
            type: 'history',
            messages: messageHistory.map(m => ({ ...m, isSelf: false }))
        }));
    }

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (rawMessage) => {
        try {
            const data = JSON.parse(rawMessage.toString());

            // Heartbeat ping
            if (data.type === 'ping') {
                ws.isAlive = true;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
                return;
            }

            // Typing indicator
            if (data.type === 'typing') {
                const username = (data.username && typeof data.username === 'string')
                    ? data.username.trim().slice(0, 20)
                    : 'Anonymous';
                for (const [client] of clients) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'typing', username }));
                    }
                }
                return;
            }

            // Message
            if (!data.message || typeof data.message !== 'string') return;
            const sanitizedMessage = data.message.trim().slice(0, 500);
            const sanitizedUsername = (data.username && typeof data.username === 'string')
                ? data.username.trim().slice(0, 20)
                : 'Anonymous';

            clients.set(ws, { username: sanitizedUsername });

            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const userColor = getUserColor(sanitizedUsername);

            const messageRecord = {
                type: 'message',
                username: sanitizedUsername,
                message: sanitizedMessage,
                time: timeString,
                color: userColor
            };

            // Keep history
            messageHistory.push(messageRecord);
            if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

            // Broadcast to all
            for (const [client] of clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        ...messageRecord,
                        isSelf: client === ws
                    }));
                }
            }
        } catch (err) {
            console.error('Error processing message:', err);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        broadcastNotification('A user left the chat.', clients.size);
    });

    ws.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

// Heartbeat sweep every 30 seconds
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        if (typeof ws.ping === 'function') ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

server.listen(PORT, () => {
    console.log('====================================================');
    console.log('🚀 Premium WebSocket Chat Server running!');
    console.log(`👉 Open your browser at: http://localhost:${PORT}`);
    console.log('====================================================');
});
