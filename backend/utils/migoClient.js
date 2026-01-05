const axios = require('axios');
const https = require('https');
const { parseStringPromise } = require('xml2js');
require('dotenv').config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Only for development
  keepAlive: true
});

class MigoClient {
  constructor() {
    this.csrfToken = null;
    this.cookies = null;
    this.baseUrl = 'https://10.200.11.37:44300/sap/opu/odata/sap/ZMIGO_TRANSFER_SRV';

    const username = process.env.SAP_USERNAME || process.env.SAP_USER;
    const password = process.env.SAP_PASSWORD || process.env.SAP_PASS;

    if (!username || !password) {
      throw new Error('Missing SAP credentials: set SAP_USERNAME/SAP_PASSWORD or SAP_USER/SAP_PASS in backend/.env');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'X',
      },
      withCredentials: true,
      auth: { username, password }
    });
  }

  async getCsrfToken() {
    try {
      // Fetch CSRF from the same entity as POST
      const response = await this.client.get('/TransferHeaderSet', {
        params: { 'sap-client': '110' },
        headers: {
          'X-CSRF-Token': 'Fetch',
          'Accept': 'application/json'
        }
      });

      const token = response.headers['x-csrf-token'];
      const setCookie = response.headers['set-cookie'];

      if (!token) {
        throw new Error('No X-CSRF-Token returned by SAP');
      }

      this.csrfToken = token;
      this.cookies = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie;

      return { success: true, csrfToken: token };
    } catch (error) {
      console.error('CSRF Token Error:', {
        message: error.message,
        status: error.response?.status,
        contentType: error.response?.headers?.['content-type'],
        preview: typeof error.response?.data === 'string' ? error.response.data.slice(0, 300) : error.response?.data
      });
      return { success: false, error: 'Failed to retrieve CSRF token' };
    }
  }

  async executeTransfer(transferData, isTestRun = false) {
    try {
      // Ensure CSRF token is available
      if (!this.csrfToken) {
        const tokenResult = await this.getCsrfToken();
        if (!tokenResult.success) throw new Error('Failed to get CSRF token');
      }

      const payload = this.formatPayload(transferData, isTestRun);
      console.log('Sending to SAP:', JSON.stringify(payload, null, 2));

      const response = await this.client.post('/TransferHeaderSet', payload, {
        params: { 'sap-client': '110' },
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Cookie': this.cookies,
          'Accept': 'application/xml'
        },
        responseType: 'text'
      });

      console.log('Raw SAP Response:', response.data);
      return await this.parseSapResponse(response.data);

    } catch (error) {
      // Reset CSRF if 401/403 to allow refetch next time
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.csrfToken = null;
        this.cookies = null;
      }

      // Try to parse SAP error XML
      if (error.response?.data) {
        try {
          const errorResult = await parseStringPromise(error.response.data, {
            explicitArray: false,
            mergeAttrs: true
          });
          const errorMessage = errorResult?.['m:error']?.['m:message']?.['_'] ||
                               errorResult?.['error']?.['message']?.['_'] ||
                               'Unknown error from SAP';
          return { success: false, error: errorMessage };
        } catch (_) {}
      }

      return { success: false, error: error.message || 'Failed SAP request' };
    }
  }

  async parseSapResponse(xmlText) {
    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: true
    });

    const properties = result?.entry?.content?.['m:properties'] || result?.content?.['m:properties'] || result?.['m:properties'];
    if (!properties) throw new Error('Invalid response format from SAP');

    const rawSuccess = properties['d:Success'] ?? properties['d:EvSuccess'];
    const success = rawSuccess === 'true' || rawSuccess === true;
    const message = properties['d:Message'] || properties['d:EvMessage'] || (success ? 'Operation completed successfully' : 'Operation failed');
    const matDoc = properties['d:MatDoc'] || properties['d:EvMatDoc'];
    const matDocYear = properties['d:MatDocYear'] || properties['d:EvMatDocYear'];

    return { success, message, data: { materialDocument: matDoc, documentYear: matDocYear } };
  }

  formatPayload(transferData, isTestRun) {
    const docDateMs = transferData.docDate ? new Date(transferData.docDate).getTime() : Date.now();
    const postingDateMs = transferData.postingDate ? new Date(transferData.postingDate).getTime() : Date.now();

    const salesOrder = transferData.salesOrder || '';
    const soItem = String(transferData.salesOrderItem || '').padStart(6, '0');
    const moveType = transferData.movementType || '413';
    const specStock = transferData.specialStock || transferData.SOBKZ || 'E';
    const stgeLocTo = transferData.storageLocationTo || '';

    const normalizeMaterial = mat => String(mat || '').padStart(18, '0');
    const normalizeItemNo = i => String(i + 1).padStart(6, '0');

    const itemsSource = Array.isArray(transferData.TransferItemSet) && transferData.TransferItemSet.length > 0
      ? transferData.TransferItemSet
      : Array.isArray(transferData.items) && transferData.items.length > 0
        ? transferData.items
        : [{}];

    const transferItems = itemsSource.map((item, i) => {
      const materialRaw = item.Material ?? item.MATNR ?? transferData.MATNR;
      const plant = item.Plant ?? item.Werks ?? transferData.Werks;
      const stgeLoc = item.StgeLoc ?? item.LGORT ?? transferData.LGORT;
      const quantity = item.Quantity ?? item.QTY ?? transferData.QTY;
      const entryUom = item.EntryUom ?? item.MEINS ?? transferData.MEINS;
      const batch = item.Batch ?? item.Charg ?? transferData.Charg;
      const batchTo = item.BatchTo ?? item.Charg ?? transferData.Charg;

      return {
        HeaderId: "1",
        ItemNo: item.ItemNo || normalizeItemNo(i),
        Material: normalizeMaterial(materialRaw),
        Plant: plant || '',
        StgeLoc: stgeLoc || '',
        Quantity: quantity || '0.000',
        EntryUom: entryUom || 'TO',
        Batch: batch || '',
        SalesOrder: item.SalesOrder || salesOrder,
        SoItem: String(item.SoItem || soItem).padStart(6, '0'),
        SpecStock: item.SpecStock || specStock,
        StgeLocTo: item.StgeLocTo || stgeLocTo,
        BatchTo: batchTo || '',
        MoveType: item.MoveType || moveType
      };
    });

    return {
      HeaderId: "1",
      DocDate: `/Date(${docDateMs})/`,
      PstngDate: `/Date(${postingDateMs})/`,
      TestRun: isTestRun,
      TransferItemSet: transferItems
    };
  }
}

module.exports = new MigoClient();
