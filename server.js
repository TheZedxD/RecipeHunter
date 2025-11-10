#!/usr/bin/env node

/**
 * Recipe Hunter Server with API endpoints
 * Handles both static file serving and recipe data storage
 */

const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// MIME types for common file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Initialize data directory and files
async function initializeDataDirectory() {
    try {
        // Create data directory if it doesn't exist
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
            console.log('✓ Created data directory');
        }

        // Initialize recipes.json if it doesn't exist
        try {
            await fs.access(RECIPES_FILE);
        } catch {
            await fs.writeFile(RECIPES_FILE, JSON.stringify([], null, 2));
            console.log('✓ Initialized recipes.json');
        }

        // Initialize tags.json if it doesn't exist
        try {
            await fs.access(TAGS_FILE);
        } catch {
            await fs.writeFile(TAGS_FILE, JSON.stringify([], null, 2));
            console.log('✓ Initialized tags.json');
        }

        // Initialize settings.json if it doesn't exist
        try {
            await fs.access(SETTINGS_FILE);
        } catch {
            await fs.writeFile(SETTINGS_FILE, JSON.stringify({}, null, 2));
            console.log('✓ Initialized settings.json');
        }
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
}

// Helper function to parse JSON body from request
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : null);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// API Handlers
async function handleGetRecipes(req, res) {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/recipes');
    } catch (error) {
        console.error('Error reading recipes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read recipes' }));
    }
}

async function handleSaveRecipes(req, res) {
    try {
        const recipes = await parseBody(req);
        await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log(`✓ POST /api/recipes (${recipes.length} recipes saved)`);
    } catch (error) {
        console.error('Error saving recipes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save recipes' }));
    }
}

async function handleGetTags(req, res) {
    try {
        const data = await fs.readFile(TAGS_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/tags');
    } catch (error) {
        console.error('Error reading tags:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read tags' }));
    }
}

async function handleSaveTags(req, res) {
    try {
        const tags = await parseBody(req);
        await fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log(`✓ POST /api/tags (${tags.length} tags saved)`);
    } catch (error) {
        console.error('Error saving tags:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save tags' }));
    }
}

async function handleGetSettings(req, res) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/settings');
    } catch (error) {
        console.error('Error reading settings:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read settings' }));
    }
}

async function handleSaveSettings(req, res) {
    try {
        const settings = await parseBody(req);
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('✓ POST /api/settings');
    } catch (error) {
        console.error('Error saving settings:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save settings' }));
    }
}

// Static file handler
async function handleStaticFile(req, res, filePath) {
    const fullPath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Get file extension for MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
        const data = await fs.readFile(fullPath);
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache'
        });
        res.end(data);
        console.log(`✓ Served: ${filePath}`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(500);
            res.end('Server error');
        }
        console.error(`Error serving ${filePath}:`, err.message);
    }
}

const server = http.createServer(async (req, res) => {
    // Parse URL and remove query parameters
    const url = req.url.split('?')[0];
    const method = req.method;

    // Enable CORS for API requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API Routes
    if (url.startsWith('/api/')) {
        if (url === '/api/recipes' && method === 'GET') {
            await handleGetRecipes(req, res);
        } else if (url === '/api/recipes' && method === 'POST') {
            await handleSaveRecipes(req, res);
        } else if (url === '/api/tags' && method === 'GET') {
            await handleGetTags(req, res);
        } else if (url === '/api/tags' && method === 'POST') {
            await handleSaveTags(req, res);
        } else if (url === '/api/settings' && method === 'GET') {
            await handleGetSettings(req, res);
        } else if (url === '/api/settings' && method === 'POST') {
            await handleSaveSettings(req, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
        return;
    }

    // Static file serving
    let filePath = url;
    if (filePath === '/') {
        filePath = '/index.html';
    }

    await handleStaticFile(req, res, filePath);
});

// Get local network IP address
function getNetworkIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (localhost) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Start server
async function startServer() {
    // Initialize data storage
    await initializeDataDirectory();

    server.listen(PORT, '0.0.0.0', () => {
        const networkIP = getNetworkIP();
        console.log('\n🍳 Recipe Hunter Server Started!\n');
        console.log(`   Local:   http://localhost:${PORT}`);
        console.log(`   Network: http://${networkIP}:${PORT}\n`);
        console.log('📱 Access from other devices on your network using the Network URL above');
        console.log('💾 Recipe data saved to: ' + DATA_DIR + '\n');
        console.log('Press Ctrl+C to stop the server\n');
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
