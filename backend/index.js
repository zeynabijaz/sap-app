// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const sapRoutes = require("./routes/sapRoutes");
const migoRoutes = require("./routes/migoRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS middleware - only once at the top
app.use(cors({
  origin: [
    'http://localhost:3000',           // Web development
    'http://192.168.60.97:3000',      // Your mobile app
    'http://192.168.60.96:3000',      // Old mobile app IP
    'http://192.168.60.96:3001',      // Old mobile app port
    'http://192.168.60.95:5000',      // Old mobile app config
    'capacitor://localhost',          // Capacitor local
    'http://localhost',               // Any localhost
    '*'                             // Allow all origins for development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({ message: "SAP Integration Backend is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", sapRoutes);
app.use('/api/migo', migoRoutes);  // Moved before error handling

// Error handling middleware - keep this last
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Start server
// Start server on all interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Login endpoint: POST http://${getLocalIP()}:${PORT}/api/auth/Login`);
    console.log(`MIGO Check endpoint: POST http://${getLocalIP()}:${PORT}/api/migo/check`);
    console.log(`MIGO Post endpoint: POST http://${getLocalIP()}:${PORT}/api/migo/post`);
});

// Utility function to log your local IP

function getLocalIP() {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}