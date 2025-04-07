# MockSrv

> ⚠️ **Warning**: This project is under active development and may be unstable before reaching version 1.0. API and functionality may change between releases. Use in production environments at your own risk.

MockSrv is a flexible and powerful mock server implementation in Node.js that allows you to easily simulate API responses for testing and development purposes. It's designed to be a drop-in replacement for the original MockServer, offering compatible API with significantly lower resource requirements.

## Features

- HTTP request mocking with flexible matching rules
- Support for various response types (JSON, text, XML)
- Request forwarding capabilities
- JSON path and XPath matching
- Regular expression pattern matching
- Configurable response delays
- Wildcard path matching
- Priority-based expectation handling
- Persistent storage of expectations
- Comprehensive logging system

## Quick Start

Create an expectation using the REST API:

```bash
curl -X PUT "http://localhost:1080/mockserver/expectation" \
  -H "Content-Type: application/json" \
  -d '{
    "httpRequest": {
      "method": "GET",
      "path": "/api/users"
    },
    "httpResponse": {
      "statusCode": 200,
      "body": {
        "users": [
          { "id": 1, "name": "John" },
          { "id": 2, "name": "Jane" }
        ]
      }
    }
  }'
```

Test the mock endpoint:

```bash
curl -X GET "http://localhost:1080/api/users"
```

## API Reference

### Creating Expectations

```javascript
// Basic expectation
{
  httpRequest: {
    method: 'POST',
    path: '/api/data',
    headers: {
      'content-type': 'application/json'
    },
    body: {
      type: 'json',
      value: { key: 'value' }
    }
  },
  httpResponse: {
    statusCode: 201,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      status: 'created'
    }
  }
}
```

### Request Matching

The server supports various matching strategies:

- Exact matching
- JSON/XML body matching
- JSONPath expressions
- XPath queries
- Regular expressions
- Wildcard paths

### Response Configuration

You can configure responses with:

- Status codes
- Custom headers
- Response bodies (JSON, text, XML)
- Response delays
- Forward to other servers

## Examples

### JSON Matching

Create an expectation with JSON body matching:

```bash
curl -X PUT "http://localhost:1080/mockserver/expectation" \
  -H "Content-Type: application/json" \
  -d '{
    "httpRequest": {
      "method": "POST",
      "path": "/api/users",
      "body": {
        "type": "json",
        "value": {
          "name": "${json-unit.any-string}",
          "age": "${json-unit.any-number}"
        }
      }
    },
    "httpResponse": {
      "statusCode": 201,
      "body": {
        "status": "created"
      }
    }
  }'
```

Test the endpoint:

```bash
curl -X POST "http://localhost:1080/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "age": 30}'
```

### Request Forwarding

Configure a request to be forwarded to another server:

```bash
curl -X PUT "http://localhost:1080/mockserver/expectation" \
  -H "Content-Type: application/json" \
  -d '{
    "httpRequest": {
      "method": "GET",
      "path": "/api/external"
    },
    "httpForward": {
      "host": "api.external.com",
      "port": 443,
      "scheme": "HTTPS"
    }
  }'
```

When calling `/api/external`, the request will be forwarded to `https://api.external.com:443`:

## REST API

The mock server provides a REST API for managing expectations:

- `PUT /mockserver/expectation` - Create new expectation
- `GET /mockserver/expectation` - List all expectations
- `GET /mockserver/expectation/:id` - Get specific expectation
- `DELETE /mockserver/expectation/:id` - Delete specific expectation
- `DELETE /mockserver/expectation` - Clear all expectations

## Configuration

The server can be configured through environment variables:

- `NODE_PORT` - Server port (default: 1080)
- `MOCKSERVER_HOST` - Host to bind to (default: 0.0.0.0)
- `MOCKSERVER_LOG_LEVEL` - Logging level: error, warn, info, debug (default: info)
- `MOCKSERVER_MAX_HEADER_SIZE` - Maximum size of HTTP headers in KB (default: 8192)
- `MOCKSERVER_INITIALIZATION_JSON_PATH` - Path to JSON file with initial expectations (default: none)
- `MOCKSERVER_WATCH_INITIALIZATION_JSON` - Watch initialization file for changes: true, false (default: false)
- `MOCKSERVER_PERSIST_EXPECTATIONS` - Whether to persist expectations to disk: true, false (default: true)
- `MOCKSERVER_PERSISTED_EXPECTATIONS_PATH` - Path to the file for storing persisted expectations (default: ./data/expectations.json)

### Example Using Environment Variables

```bash
# Start the server on port 8080 with higher log level and custom expectations file
MOCKSERVER_HOST=localhost NODE_PORT=8080 MOCKSERVER_LOG_LEVEL=debug MOCKSERVER_INITIALIZATION_JSON_PATH=./my-expectations.json npm start
```

## Docker

### Multi-stage builds

MockSrv uses multi-stage Docker builds, which allows for easy switching between production and development environments.

### Production Environment

```bash
# Build production image
docker build --target production -t mocksrv:prod .

# Run production container
docker run -p 1080:1080 -v $(pwd)/data:/app/data --name mocksrv-prod mocksrv:prod
```

### Development Environment

```bash
# Build development image
docker build --target development -t mocksrv:dev .

# Run development container with hot-reloading
docker run -p 1080:1080 -v $(pwd)/app:/app/app -v $(pwd)/test:/app/test -v $(pwd)/data:/app/data --name mocksrv-dev mocksrv:dev
```

### Using Docker Compose

MockSrv can also be run using Docker Compose:

```bash
# Run in development mode (default)
docker-compose up -d

# Run in production mode (ignoring docker-compose.override.yml)
docker-compose -f docker-compose.yml up -d
```

Expectations are persisted in the `./data` directory, which is mounted as a volume in the container.

### Using VS Code DevContainer

The project includes a DevContainer configuration for VS Code, which allows you to work directly in a Docker container:

1. Install the "Remote - Containers" extension in VS Code
2. Open the project in VS Code
3. Click the "Reopen in Container" button or use the Command Palette (F1) and select "Remote-Containers: Reopen in Container"

This will open the development environment in a Docker container with all necessary tools and extensions.

## Comparison with MockServer

While MockSrv is inspired by MockServer, it offers a different approach and implementation:

### Feature Comparison and Roadmap

| Feature | MockServer Java | MockServer Node (current) | Status |
|---------|----------------|---------------------------|--------|
| Basic request matching | ✅ | ✅ | Implemented |
| Method and path matching | ✅ | ✅ | Implemented |
| Header matching | ✅ | ✅ | Implemented |
| Query params matching | ✅ | ✅ | Implemented |
| JSON body matching | ✅ | ✅ | Implemented |
| JsonPath matching | ✅ | ✅ | Implemented |
| JSON Schema validation | ✅ | ❌ | Planned |
| XPath matching for XML | ✅ | ✅ | Implemented |
| RegEx matching for all fields | ✅ | ✅ | Implemented |
| Conditional matching | ✅ | ⚠️ (partial) | Planned |
| OpenAPI/Swagger support | ✅ | ❌ | Not planned |
| Dynamic responses (callback classes) | ✅ | ❌ | Planned |
| Response templates | ✅ | ❌ | Planned |
| HTTP error simulation | ✅ | ❌ | Planned |
| Request forwarding | ✅ | ✅ | Implemented |
| Request modification before forwarding | ✅ | ❌ | Planned |
| Request verification | ✅ | ❌ | Planned |
| Request history | ✅ | ❌ | Planned |
| Advanced logging | ✅ | ✅ | Implemented |
| Node.js client library | ❌ | ❌ | Not planned |
| Testing framework integration | ✅ (Java) | ❌ | Not planned |
| Admin UI | ✅ | ❌ | Not planned |
| HTTPS proxy | ✅ | ❌ | Planned |
| WebSockets support | ✅ | ❌ | Not planned |
| TLS/SSL support | ✅ | ❌ | Planned |
| Authentication & authorization | ✅ | ❌ | Not planned |

**Legend:**
- ✅ - Implemented
- ⚠️ - Partially implemented
- ❌ - Not implemented

The implementation order of planned features will be driven by current project needs and community feedback.

### Why Choose MockSrv?

- **Active Development**: Unlike the original MockServer, MockSrv is actively maintained and regularly updated
- **Simplicity**: If you need a lightweight, easy-to-use mock server without complex setup
- **Resource Efficiency**: If you need a mock server with minimal resource usage
- **Modern Development**: If you prefer modern JavaScript features and workflows
- **Minimal Dependencies**: If you want fewer external dependencies
- **Quick Setup**: If you need to get started quickly without extensive configuration
- **Drop-in Replacement**: Designed to be compatible with the original MockServer API, allowing for easy migration from existing MockServer implementations

MockSrv is designed as a simpler, more lightweight alternative to MockServer for JavaScript/Node.js developers who need the core functionality without the complexity and resource overhead of the Java-based MockServer.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Express](https://expressjs.com/)
- Inspired by [MockServer](https://www.mock-server.com/) (no longer maintained) - this project aims to provide a modern, actively maintained alternative