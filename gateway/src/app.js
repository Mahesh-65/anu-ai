require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = (process.env.JWT_SECRET || '').trim() || 'organistation_super_secret_key_change_in_production_2024';

// Enable CORS
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[Gateway] ${req.method} ${req.url}`);
    next();
});

// List of routes that bypass authentication
const publicPrefixes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/health',
    '/api/health'
];

// JWT validation middleware
const authenticateToken = (req, res, next) => {
    // If request path is not an API route or is public, bypass JWT check
    const isApi = req.path.startsWith('/api');
    const isPublic = publicPrefixes.some(prefix => req.path.startsWith(prefix));

    if (!isApi || isPublic) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn(`[Gateway] Blocked unauthorized request to ${req.url}`);
        return res.status(401).json({
            status: 'error',
            message: 'Access token missing. Please authenticate.'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn(`[Gateway] Invalid token for request to ${req.url}: ${err.message}`);
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired access token.'
            });
        }
        
        // Block API access until first-login password change
        if (decoded.must_change_password) {
            const passwordChangeAllowed = [
                '/api/auth/me',
                '/api/auth/change-password',
                '/api/auth/logout',
            ];
            if (!passwordChangeAllowed.some(prefix => req.path.startsWith(prefix))) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Password change required. Update your password before continuing.',
                });
            }
        }

        // Attach user info to request and headers for downstream microservices
        req.user = decoded;
        req.headers['x-user-email'] = decoded.sub || '';
        req.headers['x-user-role'] = decoded.role || '';
        req.headers['x-user-permissions'] = JSON.stringify(decoded.permissions || []);
        
        next();
    });
};

app.use(authenticateToken);

// Gateway Health Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'gateway',
        timestamp: new Date()
    });
});

// Unified Dynamic Multi-Service Proxy Middleware mounted on '/api'
app.use('/api', createProxyMiddleware({
    router: (req) => {
        const path = req.path;
        if (path.startsWith('/auth') || path.startsWith('/users') || path.startsWith('/roles') || path.startsWith('/permissions')) {
            return process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
        }
        if (path.startsWith('/ai')) {
            return process.env.AI_SERVICE_URL || 'http://localhost:8000';
        }
        if (path.startsWith('/hr')) {
            return process.env.HR_SERVICE_URL || 'http://localhost:8002';
        }
        if (path.startsWith('/projects') || path.startsWith('/tickets')) {
            return process.env.PROJECT_SERVICE_URL || 'http://localhost:8003';
        }
        if (path.startsWith('/finance')) {
            return process.env.FINANCE_SERVICE_URL || 'http://localhost:8004';
        }
        return null;
    },
    changeOrigin: true,
    pathRewrite: (path, req) => {
        if (path.startsWith('/auth') || path.startsWith('/users') || path.startsWith('/roles') || path.startsWith('/permissions')) {
            // Keep unchanged since /auth/login, /users etc. map directly in auth-service
            return path;
        }
        if (path.startsWith('/ai')) {
            // Rewrite /ai/query -> /api/query
            return path.replace('/ai', '/api');
        }
        if (path.startsWith('/hr')) {
            // Rewrite /hr/employees -> /api/employees
            return path.replace('/hr', '/api');
        }
        if (path.startsWith('/projects')) {
            // Rewrite /projects/projects -> /api/projects
            return path.replace('/projects', '/api');
        }
        if (path.startsWith('/tickets')) {
            // Rewrite /tickets -> /api/tickets
            return path.replace('/tickets', '/api');
        }
        if (path.startsWith('/finance')) {
            // Rewrite /finance/expenses -> /api/expenses
            return path.replace('/finance', '/api');
        }
        return path;
    },
    onError: (err, req, res) => {
        console.error('[Gateway Proxy Error]', err);
        res.status(502).json({
            status: 'error',
            message: 'Target service is currently offline or unreachable.'
        });
    }
}));

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for Single Page Application routing (React router support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  OrganiStation Gateway is active at: http://localhost:${PORT}`);
    console.log(`  Auth Service proxy: ${process.env.AUTH_SERVICE_URL}`);
    console.log(`  AI Service proxy: ${process.env.AI_SERVICE_URL}`);
    console.log(`=================================================`);
});
