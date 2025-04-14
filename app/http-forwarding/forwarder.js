/**
 * HTTP Forwarding module for forwarding requests to other servers
 * @module http-forwarding/forwarder
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { HttpScheme } from '../expectations/types.js';


export function convertToCurl(request, url, headers) {
  let curlCommand = ['curl -v'];
  
  curlCommand.push(`'${url}'`);
  
  if (request.method && request.method.toUpperCase() !== 'GET') {
    curlCommand.push(`-X ${request.method.toUpperCase()}`);
  }
  
  if (headers && Object.keys(headers).length > 0) {
    for (const [key, value] of Object.entries(headers)) {
      curlCommand.push(`-H '${key}: ${value}'`);
      
      if (key.toLowerCase() === 'accept-encoding' && 
          typeof value === 'string' && 
          (value.includes('gzip') || value.includes('deflate'))) {
        curlCommand.push('--compress');
      }
    }
  }
  
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    if (request.rawBody) {
      const bodyStr = Buffer.isBuffer(request.rawBody) 
        ? request.rawBody.toString() 
        : String(request.rawBody);
      curlCommand.push(`--data '${bodyStr.replace(/'/g, "\\'")}'`);
    } else if (request.body) {
      let bodyStr;
      if (typeof request.body === 'string') {
        bodyStr = request.body;
      } else {
        bodyStr = JSON.stringify(request.body);
      }
      curlCommand.push(`--data '${bodyStr.replace(/'/g, "\\'")}'`);
    }
  }
  
  return curlCommand.join(' ');
}

/**
 * Builds a URL for forwarding based on the configuration
 * @param {Object} request - Original request
 * @param {Object} forwardConfig - Forward configuration
 * @returns {string} The forward URL
 */
export function buildForwardUrl(request, forwardConfig) {
  const { host, port, scheme = HttpScheme.HTTP } = forwardConfig;
  const protocol = scheme.toLowerCase();
  const path = request.path || '/';
  
  const isDefaultPort = (protocol === 'https' && port === 443) || 
                        (protocol === 'http' && port === 80);
  
  const hostWithPort = isDefaultPort ? host : `${host}:${port}`;
  
  let queryString = '';
  if (request.originalUrl && request.originalUrl.includes('?')) {
    queryString = request.originalUrl.substring(request.originalUrl.indexOf('?'));
  } else if (request.query && Object.keys(request.query).length > 0) {
    const rawQuery = request._parsedUrl?.query;
    if (rawQuery) {
      queryString = '?' + rawQuery;
    } else {
      const queryParts = [];
      const addQueryParam = (baseKey, value) => {
        if (value === null || value === undefined) {
          queryParts.push(`${encodeURIComponent(baseKey)}=`);
          return;
        }
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          Object.entries(value).forEach(([key, nestedValue]) => {
            const newKey = `${baseKey}[${key}]`;
            addQueryParam(newKey, nestedValue);
          });
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            queryParts.push(`${encodeURIComponent(baseKey)}=${encodeURIComponent(item)}`);
          });
        } else {
          queryParts.push(`${encodeURIComponent(baseKey)}=${encodeURIComponent(value)}`);
        }
      };
      
      Object.entries(request.query).forEach(([key, value]) => {
        addQueryParam(key, value);
      });
      
      if (queryParts.length > 0) {
        queryString = `?${queryParts.join('&')}`;
      }
    }
  }

  return `${protocol}://${hostWithPort}${path}${queryString}`;
}

/**
 * @param {Object} request - Original request
 * @param {Object} forwardConfig - Forward configuration
 * @returns {Promise<Object>} The response from the forwarded server
 */
export async function forwardRequest(request, forwardConfig) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG || process.env.DEBUG_CURL) {
    
    if (request.rawBody) {
      let rawBodyPreview;
      if (Buffer.isBuffer(request.rawBody)) {
        try {
          rawBodyPreview = request.rawBody.toString('utf8');
          if (/[\x00-\x08\x0E-\x1F\x80-\xFF]/.test(rawBodyPreview)) {
            rawBodyPreview = '<Binary data: 0x' + request.rawBody.slice(0, 50).toString('hex') + '...>';
          } else if (rawBodyPreview.length > 500) {
            rawBodyPreview = rawBodyPreview.substring(0, 500) + '...';
          }
        } catch (e) {
          rawBodyPreview = '<Binary data: 0x' + request.rawBody.slice(0, 50).toString('hex') + '...>';
        }
      } else {
        rawBodyPreview = String(request.rawBody).substring(0, 500) + (String(request.rawBody).length > 500 ? '...' : '');
      }
    }
    
    const customProperties = [];
    for (const key of Object.keys(request)) {
      if (!['method', 'path', 'originalUrl', 'query', 'headers', 'body', 'rawBody'].includes(key)) {
        try {
          const value = request[key];
          if (value !== undefined && value !== null && typeof value !== 'function') {
            customProperties.push({ key, type: typeof value, preview: String(value).substring(0, 100) });
          }
        } catch (e) {
          customProperties.push({ key, error: e.message });
        }
      }
    }
  }

  const urlString = buildForwardUrl(request, forwardConfig);  
  const parsedUrl = new URL(urlString);
  const skipHeaders = [
    'host',
    'connection',
    'content-length',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-port',
    'x-forwarded-proto',
    'x-forwarded-server',
    'x-nginx-proxy',
    'x-real-ip'
  ];
  
  const headers = {};
  if (request.headers) {  
    for (const [key, value] of Object.entries(request.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    const signatureHeaderKey = Object.keys(headers).find(key => 
      key.toLowerCase() === 'x-lppsignature');
    
    if (signatureHeaderKey) {
      headers[signatureHeaderKey] = 'hmac_bypass_sinsay';
    } else {
      headers['X-LppSignature'] = 'hmac_bypass_sinsay';
    }
  }
  
  headers['host'] = forwardConfig.host;
  const httpModule = parsedUrl.protocol === 'https:' ? https : http;
  
  const options = {
    method: request.method,
    headers: headers,
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    rejectUnauthorized: false
  };
  
  return new Promise((resolve, reject) => {
    const req = httpModule.request(options, (res) => {      
      const responseData = {
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.alloc(0)
      };
      
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        if (chunks.length > 0) {
          responseData.body = Buffer.concat(chunks);
        }
        
        try {
          const contentType = res.headers['content-type'];
          let bodyForLog;
          
          if (contentType && contentType.includes('application/json')) {
            bodyForLog = JSON.parse(responseData.body.toString());
          } else if (contentType && (contentType.includes('text/') || 
                                    contentType.includes('application/xml') || 
                                    contentType.includes('application/javascript'))) {
            bodyForLog = responseData.body.toString().substring(0, 200) + '...';
          } else {
            bodyForLog = '<binary data>';
          }
        } catch (error) {
        }
        
        resolve(responseData);
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Failed to forward request: ${error.message}`));
    });
    
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      if (request.rawBody) {
        req.write(request.rawBody);
      } else if (request.body) {
        if (typeof request.body === 'string') {
          req.write(request.body);
        } else {
          req.write(JSON.stringify(request.body));
        }
      }
    }
    
    req.end();
  });
} 
