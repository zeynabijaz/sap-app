// backend/routes/migoRoutes.js
const express = require('express');
const router = express.Router();
const migoClient = require('../utils/migoClient');

router.get('/metadata', async (req, res) => {
  try {
    const response = await migoClient.client.get('/$metadata', {
      params: { 'sap-client': '110' },
      headers: { 'Accept': 'application/xml' },
      responseType: 'text'
    });
    res.type('application/xml').send(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate transfer (test run)
router.post('/check', async (req, res) => {
  try {
    console.log('Received check request with body:', JSON.stringify(req.body, null, 2));

    const hasTransferItemSet = Array.isArray(req.body.TransferItemSet) && req.body.TransferItemSet.length > 0;

    if (hasTransferItemSet) {
      const invalidItems = req.body.TransferItemSet
        .map((item, index) => {
          const itemRequiredFields = [
            'Material',
            'Plant',
            'StgeLoc',
            'Quantity',
            'EntryUom',
            'Batch',
            'SalesOrder',
            'SoItem',
            'SpecStock',
            'StgeLocTo',
            'BatchTo',
            'MoveType'
          ];
          const missing = itemRequiredFields.filter(field => !item[field]);
          return missing.length > 0 ? `Item ${index + 1} missing: ${missing.join(', ')}` : null;
        })
        .filter(Boolean);

      if (invalidItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid items: ${invalidItems.join('; ')}`
        });
      }
    } else {
      const requiredFields = [
        'salesOrder',
        'salesOrderItem',
        'movementType',
        'storageLocationTo',
        'specialStock',
        'MATNR',
        'Werks',
        'LGORT',
        'QTY',
        'MEINS',
        'Charg'
      ];

      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    }

    const result = await migoClient.executeTransfer(req.body, true); // true for test run
    res.json(result);
  } catch (error) {
    console.error('Check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Execute transfer
router.post('/post', async (req, res) => {
  try {
    console.log('Received post request with body:', JSON.stringify(req.body, null, 2));

    const hasTransferItemSet = Array.isArray(req.body.TransferItemSet) && req.body.TransferItemSet.length > 0;

    if (hasTransferItemSet) {
      const invalidItems = req.body.TransferItemSet
        .map((item, index) => {
          const itemRequiredFields = [
            'Material',
            'Plant',
            'StgeLoc',
            'Quantity',
            'EntryUom',
            'Batch',
            'SalesOrder',
            'SoItem',
            'SpecStock',
            'StgeLocTo',
            'BatchTo',
            'MoveType'
          ];
          const missing = itemRequiredFields.filter(field => !item[field]);
          return missing.length > 0 ? `Item ${index + 1} missing: ${missing.join(', ')}` : null;
        })
        .filter(Boolean);

      if (invalidItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid items: ${invalidItems.join('; ')}`
        });
      }
    } else {
      const requiredFields = [
        'salesOrder',
        'salesOrderItem',
        'movementType',
        'storageLocationTo',
        'specialStock',
        'MATNR',
        'Werks',
        'LGORT',
        'QTY',
        'MEINS',
        'Charg'
      ];

      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    }

    const result = await migoClient.executeTransfer(req.body, false); // false for actual post
    res.json(result);
  } catch (error) {
    console.error('Post error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;