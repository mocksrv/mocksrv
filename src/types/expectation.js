export const ExpectationType = {
    HTTP: 'http'
};

export const BodyMatcherType = {
    JSON: 'json',
    JSON_PATH: 'jsonPath',
    XPATH: 'xpath',
    REGEX: 'regex',
    STRING: 'string'
};

export const MatchType = {
    STRICT: 'strict',
    ONLY_MATCHING_FIELDS: 'onlyMatchingFields'
};

export const HttpScheme = {
    HTTP: 'HTTP',
    HTTPS: 'HTTPS'
};

export const JsonUnitPlaceholder = {
    IGNORE: '${json-unit.ignore}',
    ANY_STRING: '${json-unit.any-string}',
    ANY_NUMBER: '${json-unit.any-number}',
    ANY_BOOLEAN: '${json-unit.any-boolean}',
    ANY_OBJECT: '${json-unit.any-object}',
    ANY_ARRAY: '${json-unit.any-array}'
};

// Definicja funkcji tworzącej obiekt httpForward zamiast klasy
export function createHttpForward(host, port, scheme = HttpScheme.HTTP) {
    return {
        host,
        port,
        scheme
    };
}

export function createHttpExpectation({
    id,
    method,
    path,
    query,
    headers,
    body,
    bodyMatcherType = BodyMatcherType.JSON,
    matchType = MatchType.STRICT,
    response
}) {
    return {
        id,
        type: ExpectationType.HTTP,
        httpRequest: {
            method,
            path,
            query,
            headers,
            matchType,
            body: body ? {
                type: bodyMatcherType,
                value: body
            } : undefined
        },
        httpResponse: response
    };
}

export function createOpenApiExpectation({
    id,
    spec,
    operationId,
    parameters,
    response
}) {
    return {
        id,
        type: ExpectationType.OPEN_API,
        openApiRequest: {
            spec,
            operationId,
            parameters
        },
        httpResponse: response
    };
}

export function createGraphQLExpectation({
    id,
    operationName,
    query,
    variables,
    response
}) {
    return {
        id,
        type: ExpectationType.GRAPHQL,
        graphQLRequest: {
            operationName,
            query,
            variables
        },
        httpResponse: response
    };
}

export function createWebSocketExpectation({
    id,
    path,
    subProtocols,
    message,
    response
}) {
    return {
        id,
        type: ExpectationType.WEBSOCKET,
        webSocketRequest: {
            path,
            subProtocols,
            message
        },
        webSocketResponse: response
    };
} 