/**
 * @module expectations/schemas
 */

export const schemas = {
  Expectation: {
    description: "expectation",
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      priority: { type: "integer" },
      httpRequest: { $ref: "#/components/schemas/RequestDefinition" },
      httpResponse: { $ref: "#/components/schemas/HttpResponse" },
      httpResponseTemplate: { $ref: "#/components/schemas/HttpTemplate" },
      httpResponseClassCallback: { $ref: "#/components/schemas/HttpClassCallback" },
      httpResponseObjectCallback: { $ref: "#/components/schemas/HttpObjectCallback" },
      httpForward: { $ref: "#/components/schemas/HttpForward" },
      httpForwardTemplate: { $ref: "#/components/schemas/HttpTemplate" },
      httpForwardClassCallback: { $ref: "#/components/schemas/HttpClassCallback" },
      httpForwardObjectCallback: { $ref: "#/components/schemas/HttpObjectCallback" },
      httpOverrideForwardedRequest: { $ref: "#/components/schemas/HttpOverrideForwardedRequest" },
      httpError: { $ref: "#/components/schemas/HttpError" },
      times: { $ref: "#/components/schemas/Times" },
      timeToLive: { $ref: "#/components/schemas/TimeToLive" }
    },
    oneOf: [
      { required: ["httpResponse"] },
      { required: ["httpResponseTemplate"] },
      { required: ["httpResponseClassCallback"] },
      { required: ["httpResponseObjectCallback"] },
      { required: ["httpForward"] },
      { required: ["httpForwardTemplate"] },
      { required: ["httpForwardClassCallback"] },
      { required: ["httpForwardObjectCallback"] },
      { required: ["httpOverrideForwardedRequest"] },
      { required: ["httpError"] }
    ]
  },
  RequestDefinition: {
    description: "request definition",
    oneOf: [
      { $ref: "#/components/schemas/HttpRequest" },
      { $ref: "#/components/schemas/OpenAPIDefinition" }
    ]
  },
  HttpRequest: {
    description: "request properties matcher",
    type: "object",
    additionalProperties: false,
    properties: {
      secure: { type: "boolean" },
      keepAlive: { type: "boolean" },
      method: { $ref: "#/components/schemas/StringOrJsonSchema" },
      path: { $ref: "#/components/schemas/StringOrJsonSchema" },
      pathParameters: { $ref: "#/components/schemas/KeyToMultiValue" },
      queryStringParameters: { $ref: "#/components/schemas/KeyToMultiValue" },
      body: { $ref: "#/components/schemas/Body" },
      headers: { $ref: "#/components/schemas/KeyToMultiValue" },
      cookies: { $ref: "#/components/schemas/KeyToValue" },
      socketAddress: { $ref: "#/components/schemas/SocketAddress" },
      protocol: { $ref: "#/components/schemas/Protocol" }
    }
  },
  HttpResponse: {
    description: "response to return",
    type: "object",
    additionalProperties: false,
    properties: {
      delay: { $ref: "#/components/schemas/Delay" },
      body: { $ref: "#/components/schemas/BodyWithContentType" },
      cookies: { $ref: "#/components/schemas/KeyToValue" },
      connectionOptions: { $ref: "#/components/schemas/ConnectionOptions" },
      headers: { $ref: "#/components/schemas/KeyToMultiValue" },
      statusCode: { type: "integer" },
      reasonPhrase: { type: "string" }
    }
  },
  Times: {
    description: "number of responses",
    type: "object",
    additionalProperties: false,
    properties: {
      remainingTimes: { type: "integer" },
      unlimited: { type: "boolean" }
    }
  },
  TimeToLive: {
    description: "time expectation is valid for",
    type: "object",
    additionalProperties: false,
    properties: {
      timeUnit: {
        enum: ["DAYS", "HOURS", "MINUTES", "SECONDS", "MILLISECONDS", "MICROSECONDS", "NANOSECONDS"]
      },
      timeToLive: { type: "integer" },
      unlimited: { type: "boolean" }
    }
  },
  KeyToMultiValue: {
    oneOf: [
      {
        type: "array",
        additionalProperties: false,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            values: {
              type: "array",
              additionalProperties: false,
              items: { type: "string" }
            }
          }
        }
      },
      {
        type: "object",
        additionalProperties: true,
        properties: {
          keyMatchStyle: {
            type: "string",
            enum: ["MATCHING_KEY", "SUB_SET"],
            default: "SUB_SET"
          }
        }
      }
    ]
  },
  KeyToValue: {
    oneOf: [
      {
        type: "array",
        additionalProperties: false,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            value: { type: "string" }
          }
        }
      },
      {
        type: "object",
        additionalProperties: true
      }
    ]
  },
  StringOrJsonSchema: {
    oneOf: [
      { type: "string" },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          not: { type: "boolean" },
          optional: { type: "boolean" },
          value: { type: "string" },
          schema: { type: "object" },
          parameterStyle: {
            enum: ["SIMPLE", "SIMPLE_EXPLODED", "LABEL", "MATRIX", "FORM", "FORM_EXPLODED", "SPACE_DELIMITED", "PIPE_DELIMITED", "DEEP_OBJECT"]
          }
        }
      }
    ]
  },
  Body: {
    oneOf: [
      { type: "string" },
      { type: "object" },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          not: { type: "boolean" },
          optional: { type: "boolean" },
          type: { type: "string" },
          value: { type: ["string", "object", "array", "boolean", "integer", "number", "null"] },
          matchType: {
            enum: ["STRICT", "ONLY_MATCHING_FIELDS"]
          }
        }
      }
    ]
  },
  BodyWithContentType: {
    oneOf: [
      { type: "string" },
      { type: "object" },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          not: { type: "boolean" },
          type: { type: "string" },
          contentType: { type: "string" },
          string: { type: "string" },
          json: { type: ["object", "array", "string", "boolean", "integer", "number", "null"] },
          base64Bytes: { type: "string" },
          parameters: {
            type: "object",
            additionalProperties: {
              type: ["string", "array", "boolean", "integer", "number", "null", "object"]
            }
          }
        }
      }
    ]
  },
  Delay: {
    type: "object",
    additionalProperties: false,
    properties: {
      timeUnit: {
        enum: ["DAYS", "HOURS", "MINUTES", "SECONDS", "MILLISECONDS", "MICROSECONDS", "NANOSECONDS"]
      },
      value: { type: "integer" }
    }
  },
  ConnectionOptions: {
    type: "object",
    additionalProperties: false,
    properties: {
      suppressContentLengthHeader: { type: "boolean" },
      contentLengthHeaderOverride: { type: "integer" },
      suppressConnectionHeader: { type: "boolean" },
      chunkSize: { type: "integer" },
      keepAliveOverride: { type: "boolean" },
      closeSocket: { type: "boolean" },
      closeSocketDelay: {
        type: "object",
        additionalProperties: false,
        properties: {
          timeUnit: {
            enum: ["DAYS", "HOURS", "MINUTES", "SECONDS", "MILLISECONDS", "MICROSECONDS", "NANOSECONDS"]
          },
          value: { type: "integer" }
        }
      }
    }
  },
  SocketAddress: {
    type: "object",
    additionalProperties: false,
    properties: {
      host: { type: "string" },
      port: { type: "integer" },
      scheme: { type: "string" }
    }
  },
  Protocol: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      value: { type: "string" }
    }
  },
  HttpTemplate: {
    type: "object",
    additionalProperties: false,
    properties: {
      templateType: {
        enum: ["JAVASCRIPT", "VELOCITY"]
      },
      template: { type: "string" },
      delay: { $ref: "#/components/schemas/Delay" }
    }
  },
  HttpClassCallback: {
    type: "object",
    additionalProperties: false,
    properties: {
      callbackClass: { type: "string" }
    }
  },
  HttpObjectCallback: {
    type: "object",
    additionalProperties: false,
    properties: {
      clientId: { type: "string" }
    }
  },
  HttpForward: {
    type: "object",
    additionalProperties: false,
    properties: {
      host: { type: "string" },
      port: { type: "integer" },
      scheme: { type: "string" }
    }
  },
  HttpOverrideForwardedRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      requestOverride: { $ref: "#/components/schemas/HttpRequest" },
      requestModifier: { $ref: "#/components/schemas/RequestModifier" }
    }
  },
  RequestModifier: {
    type: "object",
    additionalProperties: false,
    properties: {
      path: { $ref: "#/components/schemas/RequestModifierConfig" },
      queryStringParameters: { $ref: "#/components/schemas/RequestModifierConfig" },
      headers: { $ref: "#/components/schemas/RequestModifierConfig" },
      cookies: { $ref: "#/components/schemas/RequestModifierConfig" }
    }
  },
  RequestModifierConfig: {
    type: "object",
    additionalProperties: false,
    properties: {
      add: { type: "array", items: { type: "object" } },
      replace: { type: "array", items: { type: "object" } },
      remove: { type: "array", items: { type: "string" } }
    }
  },
  HttpError: {
    type: "object",
    additionalProperties: false,
    properties: {
      delay: { $ref: "#/components/schemas/Delay" },
      dropConnection: { type: "boolean" },
      responseBytes: { type: "string" }
    }
  },
  OpenAPIDefinition: {
    type: "object",
    additionalProperties: false,
    properties: {
      specUrlOrPayload: { type: "string" },
      operationId: { type: "string" }
    },
    required: ["specUrlOrPayload", "operationId"]
  }
}; 