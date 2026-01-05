const { sapRequest } = require("../utils/sapClient");

const login = async (req, res) => {
    const { username, password, environment } = req.body;

    if (!username || !password || !environment) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Format the request data to match the Android app
        const payload = {
            I_UNAME: username,
            I_PWD: password
        };

        const sapResponse = await sapRequest(environment, JSON.stringify(payload));
        
        // Format the response to match what the Android app expects
        const result = sapResponse["ns0:Z_WM_HANDHELD_LOGINResponse"];
        
        if (result?.E_TYPE === "S") {
            return res.status(200).json(sapResponse);
        } else {
            return res.status(401).json({
                "ns0:Z_WM_HANDHELD_LOGINResponse": {
                    E_TYPE: "E",
                    E_MESSAGE: result?.E_MESSAGE || "Authentication failed"
                }
            });
        }
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            "ns0:Z_WM_HANDHELD_LOGINResponse": {
                E_TYPE: "E",
                E_MESSAGE: "SAP authentication failed: " + (err.message || "Unknown error")
            }
        });
    }
};

module.exports = { login };