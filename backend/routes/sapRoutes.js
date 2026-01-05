// utils/sapRoutes.js
const express = require("express");
const axios = require("axios");
const https = require("https");

const router = express.Router();

// SAP credentials from environment variables
const SAP_USER = process.env.SAP_USER;
const SAP_PASS = process.env.SAP_PASS;
const SAP_BASE_URL = process.env.SAP_BASE_URL; // e.g., https://10.200.11.37:44300

// Ignore SSL certificate errors (for dev/self-signed SSL)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// GET batch info by batch number
router.get("/BatchInfo/:batchNumber", async (req, res) => {
  const { batchNumber } = req.params;
  if (!batchNumber) return res.status(400).json({ error: "Batch number is required" });

  try {
    const url = `${SAP_BASE_URL}/sap/opu/odata/sap/ZUM_BSP_BATCH_INFORMATION_SRV/BatchInfoSet(Charg='${batchNumber}')?$format=json&sap-client=110`;
;

    const response = await axios.get(url, {
      httpsAgent,
      auth: {
        username: SAP_USER,
        password: SAP_PASS
      }, // Basic Auth
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      validateStatus: () => true // handle status manually
    });

    if (response.status === 401) {
      return res.status(401).json({ error: "Unauthorized. Check SAP credentials." });
    }

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: "Error fetching batch info from SAP",
        data: response.data
      });
    }

    res.json(response.data);

  } catch (err) {
    console.error("SAP batch fetch error:", err.message);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
