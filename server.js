#!/usr/bin/env node

/**
 * Recipe Hunter Server with API endpoints
 * Handles both static file serving and recipe data storage
 */

const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Configuration constants
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = 30000; // 30 seconds
const FILE_LOCK_TIMEOUT = 5000; // 5 seconds
const FILE_LOCK_RETRY_INTERVAL = 100; // 100ms

// File locks management
const fileLocks = new Map();

// Server stats for health check
const serverStats = {
    startTime: Date.now(),
    requests: {
        total: 0,
        successful: 0,
        failed: 0
    },
    lastSync: {
        recipes: null,
        tags: null,
        settings: null
    }
};

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

// ===== File Locking Mechanism =====
async function acquireFileLock(filePath) {
    const startTime = Date.now();

    while (fileLocks.get(filePath)) {
        if (Date.now() - startTime > FILE_LOCK_TIMEOUT) {
            throw new Error('Failed to acquire file lock: timeout');
        }
        await new Promise(resolve => setTimeout(resolve, FILE_LOCK_RETRY_INTERVAL));
    }

    fileLocks.set(filePath, true);
}

function releaseFileLock(filePath) {
    fileLocks.delete(filePath);
}

// ===== Atomic Write with Backup =====
async function atomicWrite(filePath, data) {
    const dir = path.dirname(filePath);
    const tmpFile = path.join(dir, `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`);
    const backupFile = `${filePath}.backup`;

    try {
        // Write to temporary file
        await fs.writeFile(tmpFile, data, { mode: 0o644 });

        // Create backup of existing file if it exists
        try {
            await fs.copyFile(filePath, backupFile);
        } catch (err) {
            // File doesn't exist yet, that's okay
            if (err.code !== 'ENOENT') throw err;
        }

        // Atomic rename
        await fs.rename(tmpFile, filePath);

    } catch (error) {
        // Cleanup temp file if it exists
        try {
            await fs.unlink(tmpFile);
        } catch {}
        throw error;
    }
}

// ===== Input Validation =====
function validateRecipes(data) {
    if (!Array.isArray(data)) {
        throw new Error('Recipes must be an array');
    }

    for (const recipe of data) {
        if (!recipe.id || typeof recipe.id !== 'number') {
            throw new Error('Each recipe must have a numeric id');
        }
        if (!recipe.name || typeof recipe.name !== 'string') {
            throw new Error('Each recipe must have a name');
        }
        if (recipe.ingredients && !Array.isArray(recipe.ingredients)) {
            throw new Error('Recipe ingredients must be an array');
        }
        if (recipe.instructions && !Array.isArray(recipe.instructions)) {
            throw new Error('Recipe instructions must be an array');
        }
        if (recipe.tags && !Array.isArray(recipe.tags)) {
            throw new Error('Recipe tags must be an array');
        }
    }

    return true;
}

function validateTags(data) {
    if (!Array.isArray(data)) {
        throw new Error('Tags must be an array');
    }

    for (const tag of data) {
        if (!tag.id || typeof tag.id !== 'number') {
            throw new Error('Each tag must have a numeric id');
        }
        if (!tag.name || typeof tag.name !== 'string') {
            throw new Error('Each tag must have a name');
        }
    }

    return true;
}

function validateSettings(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Settings must be an object');
    }
    return true;
}

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

// Helper function to parse JSON body from request with size limits and timeout
async function parseBody(req, maxSize = MAX_REQUEST_SIZE) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;

        // Set timeout
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error('Request timeout'));
        }, REQUEST_TIMEOUT);

        req.on('data', chunk => {
            size += chunk.length;

            // Check size limit
            if (size > maxSize) {
                clearTimeout(timeout);
                req.destroy();
                reject(new Error('Request too large'));
                return;
            }

            body += chunk.toString();
        });

        req.on('end', () => {
            clearTimeout(timeout);
            try {
                resolve(body ? JSON.parse(body) : null);
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });

        req.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// API Handlers
async function handleGetRecipes(req, res) {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        serverStats.requests.successful++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/recipes');
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error reading recipes:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read recipes' }));
    }
}

async function handleSaveRecipes(req, res) {
    let lockAcquired = false;
    try {
        const recipes = await parseBody(req);

        // Validate input
        validateRecipes(recipes);

        // Acquire file lock
        await acquireFileLock(RECIPES_FILE);
        lockAcquired = true;

        // Atomic write with backup
        await atomicWrite(RECIPES_FILE, JSON.stringify(recipes, null, 2));

        // Update stats
        serverStats.lastSync.recipes = new Date().toISOString();
        serverStats.requests.successful++;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log(`✓ POST /api/recipes (${recipes.length} recipes saved)`);
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error saving recipes:', error);

        // Determine appropriate error code
        let statusCode = 500;
        let errorMessage = 'Failed to save recipes';

        if (error.message === 'Request too large') {
            statusCode = 413;
            errorMessage = 'Request too large';
        } else if (error.message === 'Request timeout') {
            statusCode = 408;
            errorMessage = 'Request timeout';
        } else if (error.message === 'Invalid JSON' || error.message.includes('must')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message === 'Failed to acquire file lock: timeout') {
            statusCode = 503;
            errorMessage = 'Server busy, please try again';
        }

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage }));
    } finally {
        if (lockAcquired) {
            releaseFileLock(RECIPES_FILE);
        }
    }
}

async function handleGetTags(req, res) {
    try {
        const data = await fs.readFile(TAGS_FILE, 'utf8');
        serverStats.requests.successful++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/tags');
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error reading tags:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read tags' }));
    }
}

async function handleSaveTags(req, res) {
    let lockAcquired = false;
    try {
        const tags = await parseBody(req);

        // Validate input
        validateTags(tags);

        // Acquire file lock
        await acquireFileLock(TAGS_FILE);
        lockAcquired = true;

        // Atomic write with backup
        await atomicWrite(TAGS_FILE, JSON.stringify(tags, null, 2));

        // Update stats
        serverStats.lastSync.tags = new Date().toISOString();
        serverStats.requests.successful++;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log(`✓ POST /api/tags (${tags.length} tags saved)`);
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error saving tags:', error);

        // Determine appropriate error code
        let statusCode = 500;
        let errorMessage = 'Failed to save tags';

        if (error.message === 'Request too large') {
            statusCode = 413;
            errorMessage = 'Request too large';
        } else if (error.message === 'Request timeout') {
            statusCode = 408;
            errorMessage = 'Request timeout';
        } else if (error.message === 'Invalid JSON' || error.message.includes('must')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message === 'Failed to acquire file lock: timeout') {
            statusCode = 503;
            errorMessage = 'Server busy, please try again';
        }

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage }));
    } finally {
        if (lockAcquired) {
            releaseFileLock(TAGS_FILE);
        }
    }
}

async function handleGetSettings(req, res) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        serverStats.requests.successful++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        console.log('✓ GET /api/settings');
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error reading settings:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read settings' }));
    }
}

async function handleSaveSettings(req, res) {
    let lockAcquired = false;
    try {
        const settings = await parseBody(req);

        // Validate input
        validateSettings(settings);

        // Acquire file lock
        await acquireFileLock(SETTINGS_FILE);
        lockAcquired = true;

        // Atomic write with backup
        await atomicWrite(SETTINGS_FILE, JSON.stringify(settings, null, 2));

        // Update stats
        serverStats.lastSync.settings = new Date().toISOString();
        serverStats.requests.successful++;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('✓ POST /api/settings');
    } catch (error) {
        serverStats.requests.failed++;
        console.error('Error saving settings:', error);

        // Determine appropriate error code
        let statusCode = 500;
        let errorMessage = 'Failed to save settings';

        if (error.message === 'Request too large') {
            statusCode = 413;
            errorMessage = 'Request too large';
        } else if (error.message === 'Request timeout') {
            statusCode = 408;
            errorMessage = 'Request timeout';
        } else if (error.message === 'Invalid JSON' || error.message.includes('must')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message === 'Failed to acquire file lock: timeout') {
            statusCode = 503;
            errorMessage = 'Server busy, please try again';
        }

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage }));
    } finally {
        if (lockAcquired) {
            releaseFileLock(SETTINGS_FILE);
        }
    }
}

// Health check handler
async function handleHealthCheck(req, res) {
    try {
        const uptime = Date.now() - serverStats.startTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        const uptimeDays = Math.floor(uptimeSeconds / 86400);
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeSecs = uptimeSeconds % 60;

        // Get file sizes and info
        const dataFiles = {
            recipes: { exists: false, size: 0, count: 0, lastModified: null },
            tags: { exists: false, size: 0, count: 0, lastModified: null },
            settings: { exists: false, size: 0, lastModified: null }
        };

        try {
            const recipesStats = await fs.stat(RECIPES_FILE);
            const recipesData = JSON.parse(await fs.readFile(RECIPES_FILE, 'utf8'));
            dataFiles.recipes = {
                exists: true,
                size: recipesStats.size,
                count: Array.isArray(recipesData) ? recipesData.length : 0,
                lastModified: recipesStats.mtime.toISOString()
            };
        } catch (e) {}

        try {
            const tagsStats = await fs.stat(TAGS_FILE);
            const tagsData = JSON.parse(await fs.readFile(TAGS_FILE, 'utf8'));
            dataFiles.tags = {
                exists: true,
                size: tagsStats.size,
                count: Array.isArray(tagsData) ? tagsData.length : 0,
                lastModified: tagsStats.mtime.toISOString()
            };
        } catch (e) {}

        try {
            const settingsStats = await fs.stat(SETTINGS_FILE);
            dataFiles.settings = {
                exists: true,
                size: settingsStats.size,
                lastModified: settingsStats.mtime.toISOString()
            };
        } catch (e) {}

        // Calculate success rate
        const successRate = serverStats.requests.total > 0
            ? ((serverStats.requests.successful / serverStats.requests.total) * 100).toFixed(2)
            : 100;

        // Get memory usage
        const memoryUsage = process.memoryUsage();

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Hunter - Health Check</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .card h2 {
            font-size: 1.3em;
            margin-bottom: 16px;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .card-icon {
            font-size: 1.5em;
        }
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .stat-row:last-child {
            border-bottom: none;
        }
        .stat-label {
            color: #6b7280;
            font-weight: 500;
        }
        .stat-value {
            color: #1f2937;
            font-weight: 600;
        }
        .stat-value.good {
            color: #10b981;
        }
        .stat-value.warning {
            color: #f59e0b;
        }
        .stat-value.error {
            color: #ef4444;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            transition: width 0.3s ease;
        }
        .file-status {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .file-status.online {
            background: #10b981;
        }
        .file-status.offline {
            background: #ef4444;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            .dashboard {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍳 Recipe Hunter Server</h1>
            <div class="status-badge">✓ OPERATIONAL</div>
        </div>

        <div class="dashboard">
            <!-- Server Status Card -->
            <div class="card">
                <h2><span class="card-icon">🖥️</span> Server Status</h2>
                <div class="stat-row">
                    <span class="stat-label">Uptime</span>
                    <span class="stat-value good">${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m ${uptimeSecs}s</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Started</span>
                    <span class="stat-value">${new Date(serverStats.startTime).toLocaleString()}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Platform</span>
                    <span class="stat-value">${process.platform} (${process.arch})</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Node Version</span>
                    <span class="stat-value">${process.version}</span>
                </div>
            </div>

            <!-- Request Stats Card -->
            <div class="card">
                <h2><span class="card-icon">📊</span> Request Statistics</h2>
                <div class="stat-row">
                    <span class="stat-label">Total Requests</span>
                    <span class="stat-value">${serverStats.requests.total}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Successful</span>
                    <span class="stat-value good">${serverStats.requests.successful}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Failed</span>
                    <span class="stat-value ${serverStats.requests.failed > 0 ? 'error' : ''}">${serverStats.requests.failed}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Success Rate</span>
                    <span class="stat-value good">${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${successRate}%"></div>
                </div>
            </div>

            <!-- Data Files Card -->
            <div class="card">
                <h2><span class="card-icon">📁</span> Data Files</h2>
                <div class="stat-row">
                    <span class="stat-label">
                        <span class="file-status ${dataFiles.recipes.exists ? 'online' : 'offline'}"></span>
                        Recipes
                    </span>
                    <span class="stat-value ${dataFiles.recipes.exists ? 'good' : 'error'}">
                        ${dataFiles.recipes.exists ? dataFiles.recipes.count + ' recipes' : 'Not found'}
                    </span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">
                        <span class="file-status ${dataFiles.tags.exists ? 'online' : 'offline'}"></span>
                        Tags
                    </span>
                    <span class="stat-value ${dataFiles.tags.exists ? 'good' : 'error'}">
                        ${dataFiles.tags.exists ? dataFiles.tags.count + ' tags' : 'Not found'}
                    </span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">
                        <span class="file-status ${dataFiles.settings.exists ? 'online' : 'offline'}"></span>
                        Settings
                    </span>
                    <span class="stat-value ${dataFiles.settings.exists ? 'good' : 'error'}">
                        ${dataFiles.settings.exists ? 'OK' : 'Not found'}
                    </span>
                </div>
            </div>

            <!-- Sync Status Card -->
            <div class="card">
                <h2><span class="card-icon">🔄</span> Last Sync</h2>
                <div class="stat-row">
                    <span class="stat-label">Recipes</span>
                    <span class="stat-value">${serverStats.lastSync.recipes ? new Date(serverStats.lastSync.recipes).toLocaleString() : 'Never'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Tags</span>
                    <span class="stat-value">${serverStats.lastSync.tags ? new Date(serverStats.lastSync.tags).toLocaleString() : 'Never'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Settings</span>
                    <span class="stat-value">${serverStats.lastSync.settings ? new Date(serverStats.lastSync.settings).toLocaleString() : 'Never'}</span>
                </div>
            </div>

            <!-- Memory Usage Card -->
            <div class="card">
                <h2><span class="card-icon">💾</span> Memory Usage</h2>
                <div class="stat-row">
                    <span class="stat-label">RSS</span>
                    <span class="stat-value">${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Heap Used</span>
                    <span class="stat-value">${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Heap Total</span>
                    <span class="stat-value">${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">External</span>
                    <span class="stat-value">${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            </div>

            <!-- Storage Info Card -->
            <div class="card">
                <h2><span class="card-icon">💿</span> Storage Details</h2>
                <div class="stat-row">
                    <span class="stat-label">Data Directory</span>
                    <span class="stat-value" style="font-size: 0.85em; word-break: break-all;">${DATA_DIR}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Recipes File Size</span>
                    <span class="stat-value">${dataFiles.recipes.exists ? (dataFiles.recipes.size / 1024).toFixed(2) + ' KB' : 'N/A'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Tags File Size</span>
                    <span class="stat-value">${dataFiles.tags.exists ? (dataFiles.tags.size / 1024).toFixed(2) + ' KB' : 'N/A'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Settings File Size</span>
                    <span class="stat-value">${dataFiles.settings.exists ? (dataFiles.settings.size / 1024).toFixed(2) + ' KB' : 'N/A'}</span>
                </div>
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        console.log('✓ GET /health');
    } catch (error) {
        console.error('Error generating health check:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Health check failed' }));
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

    // Track request (exclude OPTIONS and static files for cleaner stats)
    if (method !== 'OPTIONS' && (url.startsWith('/api/') || url === '/health')) {
        serverStats.requests.total++;
    }

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

    // Health check endpoint
    if (url === '/health' && method === 'GET') {
        await handleHealthCheck(req, res);
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
        console.log(`   Network: http://${networkIP}:${PORT}`);
        console.log(`   Health:  http://localhost:${PORT}/health\n`);
        console.log('📱 Access from other devices on your network using the Network URL above');
        console.log('💾 Recipe data saved to: ' + DATA_DIR);
        console.log('📊 View server health dashboard at /health\n');
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
