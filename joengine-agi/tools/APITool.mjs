/**
 * API Tool - أداة استدعاء واجهات برمجة التطبيقات الخارجية لـ JOEngine AGI
 * 
 * القدرات:
 * - إرسال طلبات HTTP (GET, POST, PUT, DELETE)
 * - التعامل مع بيانات JSON
 */

import { BaseTool } from './ToolsSystem.mjs';
import axios from 'axios';

export class APITool extends BaseTool {
  constructor() {
    super(
      'api',
      'Call external REST APIs using HTTP methods (GET, POST, PUT, DELETE)',
      {
        method: {
          type: 'string',
          required: true,
          description: 'HTTP method (GET, POST, PUT, DELETE)'
        },
        url: {
          type: 'string',
          required: true,
          description: 'The full URL of the API endpoint'
        },
        data: {
          type: 'object',
          required: false,
          description: 'JSON data payload for POST/PUT requests'
        },
        headers: {
          type: 'object',
          required: false,
          description: 'Custom HTTP headers (e.g., Authorization)'
        }
      }
    );
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);

    const { method, url, data, headers } = params;

    console.log(`📡 Calling API: ${method} ${url}`);

    try {
      const response = await axios({
        method: method.toUpperCase(),
        url,
        data,
        headers
      });

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }
}

export default APITool;
