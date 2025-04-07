import { 
    logExpectationCreated, 
    logExpectationRemoved, 
    logExpectationsCleared 
} from '../utils/logger.js';
import { loadExpectations, saveExpectations } from './persistence.js';
import { BodyMatcherType, MatchType, JsonUnitPlaceholder } from '../types/expectation.js';
import jsonpath from 'jsonpath';
import xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { v4 as uuidv4 } from 'uuid';

// Główna mapa przechowująca wszystkie oczekiwania
let expectations = new Map();

// Indeksy dla szybszego wyszukiwania
let methodIndex = new Map(); // Indeks dla metod HTTP
let pathIndex = new Map();   // Indeks dla ścieżek bazowych
let wildcardExpectations = new Set(); // Zbiór ID oczekiwań zawierających wildcardy w ścieżkach

// Funkcja do pobierania segmentu bazowego ze ścieżki ("/api/users" -> "/api")
function getBasePathSegment(path) {
    if (!path) return null;
    
    // Usuń początkowe '/' jeśli istnieje
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // Pobierz pierwszy segment ścieżki
    const firstSegment = cleanPath.split('/')[0];
    
    return '/' + firstSegment;
}

export async function initializeStore() {
    expectations = await loadExpectations();
    // Inicjalizacja indeksów dla załadowanych oczekiwań
    initializeIndices();
}

// Inicjalizacja indeksów na podstawie załadowanych oczekiwań
function initializeIndices() {
    // Resetowanie indeksów
    methodIndex = new Map();
    pathIndex = new Map();
    wildcardExpectations = new Set();
    
    // Wypełnianie indeksów wszystkimi oczekiwaniami
    for (const [id, expectation] of expectations.entries()) {
        indexExpectation(id, expectation);
    }
}

// Dodawanie oczekiwania do indeksów
function indexExpectation(id, expectation) {
    if (expectation.type !== 'http') return;
    
    const { httpRequest } = expectation;
    
    // Indeksowanie po metodzie HTTP
    if (httpRequest.method) {
        const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;
        if (!methodIndex.has(methodValue)) {
            methodIndex.set(methodValue, new Set());
        }
        methodIndex.get(methodValue).add(id);
    }
    
    // Indeksowanie po ścieżce bazowej
    if (httpRequest.path) {
        const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;
        
        // Sprawdzanie czy ścieżka zawiera wildcardy
        if (pathValue.includes('*')) {
            wildcardExpectations.add(id);
        } else {
            // Pobieranie segmentu bazowego dla indeksowania
            const baseSegment = getBasePathSegment(pathValue);
            if (baseSegment) {
                if (!pathIndex.has(baseSegment)) {
                    pathIndex.set(baseSegment, new Set());
                }
                pathIndex.get(baseSegment).add(id);
            }
        }
    }
}

// Usuwanie oczekiwania z indeksów
function removeFromIndices(id, expectation) {
    if (expectation.type !== 'http') return;
    
    const { httpRequest } = expectation;
    
    // Usuwanie z indeksu metod
    if (httpRequest.method) {
        const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;
        if (methodIndex.has(methodValue)) {
            methodIndex.get(methodValue).delete(id);
        }
    }
    
    // Usuwanie z indeksu ścieżek
    if (httpRequest.path) {
        const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;
        
        // Usuwanie z indeksu wildcardów jeśli trzeba
        if (pathValue.includes('*')) {
            wildcardExpectations.delete(id);
        } else {
            const baseSegment = getBasePathSegment(pathValue);
            if (baseSegment && pathIndex.has(baseSegment)) {
                pathIndex.get(baseSegment).delete(id);
            }
        }
    }
}

async function saveToFile() {
    await saveExpectations(expectations);
}

export async function addExpectation(expectation) {
    const id = uuidv4();
    const priority = expectation.priority !== undefined ? expectation.priority : 0;
    expectations.set(id, { ...expectation, id, priority });
    
    // Dodaj oczekiwanie do indeksów
    indexExpectation(id, expectations.get(id));
    
    await saveToFile();
    logExpectationCreated(expectations.get(id));
    return id;
}

export function getExpectation(id) {
    return expectations.get(id);
}

export function getAllExpectations() {
    return Array.from(expectations.values());
}

export async function clearExpectations() {
    expectations.clear();
    
    // Wyczyść indeksy
    methodIndex.clear();
    pathIndex.clear();
    wildcardExpectations.clear();
    
    await saveToFile();
    logExpectationsCleared();
}

export async function removeExpectation(id) {
    const expectation = expectations.get(id);
    if (expectation) {
        // Usuń z indeksów
        removeFromIndices(id, expectation);
        
        // Usuń z głównej mapy
        expectations.delete(id);
        await saveToFile();
        logExpectationRemoved(id);
        return true;
    }
    return false;
}

export function findMatchingExpectation(request) {
    // Używamy indeksów do znalezienia kandydatów
    const candidateIds = getCandidateExpectationIds(request);
    
    // Jeśli nie ma kandydatów, zwracamy null
    if (candidateIds.size === 0) {
        return null;
    }
    
    // Filtrujemy kandydatów, którzy faktycznie pasują do żądania
    const matchingExpectations = Array.from(candidateIds)
        .map(id => expectations.get(id))
        .filter(expectation => expectation && matchesExpectation(request, expectation));
    
    if (matchingExpectations.length === 0) {
        return null;
    }
    
    // Sortujemy oczekiwania według priorytetu (malejąco) i czasu dodania (malejąco)
    matchingExpectations.sort((a, b) => {
        // Porównaj priorytety (malejąco)
        if (b.priority !== a.priority) {
            return b.priority - a.priority;
        }
        
        // Przy równym priorytecie, użyj ID jako zastępczej metody porównania czasu dodania
        return b.id.localeCompare(a.id);
    });
    
    // Zwróć oczekiwanie o najwyższym priorytecie
    return matchingExpectations[0];
}

// Funkcja zwracająca zbiór ID oczekiwań, które mogą pasować do żądania
function getCandidateExpectationIds(request) {
    const candidates = new Set();
    
    // 1. Sprawdź indeks metod HTTP
    if (methodIndex.has(request.method)) {
        const methodCandidates = methodIndex.get(request.method);
        methodCandidates.forEach(id => candidates.add(id));
    }
    
    // 2. Sprawdź indeks ścieżek bazowych
    const baseSegment = getBasePathSegment(request.path);
    if (baseSegment && pathIndex.has(baseSegment)) {
        const pathCandidates = pathIndex.get(baseSegment);
        pathCandidates.forEach(id => candidates.add(id));
    }
    
    // 3. Dodaj wszystkie oczekiwania z wildcardami w ścieżkach
    wildcardExpectations.forEach(id => candidates.add(id));
    
    // Optymalizacja: jeśli mamy mniej niż 10 oczekiwań, sprawdźmy wszystkie
    if (expectations.size < 10) {
        expectations.forEach((_, id) => candidates.add(id));
    }
    
    return candidates;
}

export function matchesExpectation(request, expectation) {
    // Sprawdzamy czy oczekiwanie jest typu HTTP
    if (expectation.type !== 'http') {
        return false;
    }

    const { httpRequest } = expectation;
    const matchType = httpRequest.matchType || MatchType.STRICT;

    // Obsługa method z flagą not
    if (httpRequest.method) {
        const invertMethodMatch = httpRequest.method.not === true;
        const methodValue = typeof httpRequest.method === 'object' ? httpRequest.method.value : httpRequest.method;
        
        const methodMatches = request.method === methodValue;
        if (invertMethodMatch ? methodMatches : !methodMatches) {
            return false;
        }
    }

    // Obsługa path z flagą not
    if (httpRequest.path) {
        const invertPathMatch = httpRequest.path.not === true;
        const pathValue = typeof httpRequest.path === 'object' ? httpRequest.path.value : httpRequest.path;
        
        // Obsługa wzorców wildcard w ścieżkach
        let pathMatches = false;
        
        if (pathValue.includes('*')) {
            // Konwertuj wzorzec wildcard na regex
            const regexPattern = '^' + pathValue.replace(/\*/g, '.*') + '$';
            const regex = new RegExp(regexPattern);
            pathMatches = regex.test(request.path);
        } else {
            // Dokładne dopasowanie ścieżki
            pathMatches = request.path === pathValue;
        }
        
        if (invertPathMatch ? pathMatches : !pathMatches) {
            return false;
        }
    }

    // Obsługa obu formatów - query i queryStringParameters
    const queryParams = httpRequest.queryStringParameters || httpRequest.query;
    if (queryParams) {
        if (matchType === MatchType.STRICT) {
            // W trybie STRICT wszystkie parametry query muszą być identyczne
            // Pomijamy flagę 'not', jeśli występuje
            const expectationQueryKeys = Object.keys(queryParams).filter(key => key !== 'not');
            
            if (Object.keys(request.query).length !== expectationQueryKeys.length && !queryParams.not) {
                return false;
            }
        }
        
        if (matchType === MatchType.ONLY_MATCHING_FIELDS) {
            // W trybie ONLY_MATCHING_FIELDS sprawdzamy tylko parametry określone w oczekiwaniu
            const expectationQueryToMatch = { ...queryParams };
            delete expectationQueryToMatch.not;
            
            // Sprawdzamy czy wszystkie parametry z oczekiwania istnieją w żądaniu
            const allParamsMatch = Object.entries(expectationQueryToMatch).every(([key, value]) => {
                // Porównanie wartości parametrów (uwzględniając, że mogą być tablicami)
                if (Array.isArray(value) && Array.isArray(request.query[key])) {
                    // Sprawdź, czy tablice mają takie same elementy
                    return value.every(v => request.query[key].includes(v));
                }
                return request.query[key] === value;
            });
            
            if (!allParamsMatch) {
                return false;
            }
        } else {
            // Używamy standardowej funkcji do porównywania
            if (!matchesQuery(request.query, queryParams)) {
                return false;
            }
        }
    }

    if (httpRequest.headers) {
        if (matchType === MatchType.STRICT) {
            // W trybie STRICT wszystkie nagłówki (oprócz niektórych standardowych) muszą być identyczne
            const standardHeaders = ['host', 'connection', 'content-length', 'user-agent', 'accept', 'accept-encoding', 'content-type'];
            const requestHeaderKeys = Object.keys(request.headers).filter(header => !standardHeaders.includes(header.toLowerCase()));
            
            // Pomijamy flagę 'not', jeśli występuje
            const expectationHeaderKeys = Object.keys(httpRequest.headers).filter(header => 
                header !== 'not' && !standardHeaders.includes(header.toLowerCase()));
            
            if (requestHeaderKeys.length !== expectationHeaderKeys.length && !httpRequest.headers.not) {
                return false;
            }
        }
        
        if (!matchesHeaders(request.headers, httpRequest.headers)) {
            return false;
        }
    }

    if (httpRequest.body) {
        if (matchType === MatchType.STRICT && typeof request.body === 'object' && 
            typeof httpRequest.body.value === 'object' && 
            httpRequest.body.type === BodyMatcherType.JSON) {
            // W trybie STRICT dla JSON wszystkie pola muszą być identyczne
            const requestBodyKeys = Object.keys(request.body);
            
            // Pomijamy flagę 'not', jeśli występuje
            const expectationBodyKeys = Object.keys(httpRequest.body.value).filter(key => key !== 'not');
            
            if (requestBodyKeys.length !== expectationBodyKeys.length && !httpRequest.body.not) {
                return false;
            }
        }
        
        // W trybie ONLY_MATCHING_FIELDS sprawdzamy tylko pola określone w oczekiwaniu
        if (matchType === MatchType.ONLY_MATCHING_FIELDS) {
            // Sprawdzamy czy body istnieje i czy typ jest zgodny
            if (!request.body) {
                return false;
            }
            
            if (httpRequest.body.type === BodyMatcherType.JSON && typeof request.body === 'object') {
                // Sprawdzamy tylko pola określone w oczekiwaniu
                const expectationBodyValue = httpRequest.body.value;
                
                if (!expectationBodyValue) {
                    return false;
                }
                
                // Sprawdzamy czy wszystkie pola z oczekiwania istnieją w żądaniu
                const allFieldsMatch = Object.entries(expectationBodyValue).every(([key, value]) => {
                    return request.body[key] !== undefined && 
                           JSON.stringify(request.body[key]) === JSON.stringify(value);
                });
                
                return allFieldsMatch;
            }
        }
        
        if (!matchesBody(request.body, httpRequest.body)) {
            return false;
        }
    } else if (matchType === MatchType.STRICT && request.body && 
              Object.keys(request.body).length > 0 && 
              request.headers['content-type']?.includes('application/json')) {
        // W trybie STRICT, jeśli w oczekiwaniu nie ma ciała, ale w żądaniu jest, to nie ma dopasowania
        return false;
    }

    return true;
}

function matchesQuery(requestQuery, expectationQuery) {
    // Sprawdź, czy mamy flagę 'not' dla wszystkich parametrów query
    const invertMatch = expectationQuery.not === true;
    
    // Usuń flagę 'not' z porównywanych pól
    const expectationQueryToMatch = { ...expectationQuery };
    delete expectationQueryToMatch.not;
    
    // Sprawdź, czy wszystkie parametry z oczekiwania są obecne w żądaniu
    const result = Object.entries(expectationQueryToMatch).every(([key, value]) => {
        // Porównanie wartości parametrów (uwzględniając, że mogą być tablicami)
        if (Array.isArray(value) && Array.isArray(requestQuery[key])) {
            // Sprawdź, czy tablice mają takie same elementy
            return value.length === requestQuery[key].length && 
                   value.every(v => requestQuery[key].includes(v));
        }
        return requestQuery[key] === value;
    });
    
    // Odwróć wynik, jeśli invertMatch jest true
    return invertMatch ? !result : result;
}

function matchesHeaders(requestHeaders, expectationHeaders) {
    // Sprawdź, czy mamy flagę 'not' dla wszystkich nagłówków
    const invertMatch = expectationHeaders.not === true;
    
    // Usuń flagę 'not' z porównywanych pól
    const expectationHeadersToMatch = { ...expectationHeaders };
    delete expectationHeadersToMatch.not;
    
    // Sprawdź, czy wszystkie nagłówki z oczekiwania są obecne w żądaniu
    const result = Object.entries(expectationHeadersToMatch).every(([key, value]) => {
        // Nagłówki są case-insensitive
        const headerKey = key.toLowerCase();
        return requestHeaders[headerKey] === value;
    });
    
    // Odwróć wynik, jeśli invertMatch jest true
    return invertMatch ? !result : result;
}

function matchesBody(requestBody, expectationBody) {
    if (!requestBody || !expectationBody) {
        return false;
    }

    // Sprawdź, czy mamy flagę 'not' dla body
    const invertMatch = expectationBody.not === true;
    
    const { type } = expectationBody;
    // Obsługa obu formatów: value/json/string/jsonPath/xpath/regex
    const expectedValue = expectationBody.value || 
                         expectationBody.json || 
                         expectationBody.string || 
                         expectationBody.jsonPath ||
                         expectationBody.xpath ||
                         expectationBody.regex;

    if (!expectedValue) {
        return false;
    }

    let result = false;
    try {
        switch (type) {
            case BodyMatcherType.JSON:
                // Sprawdź czy wartość zawiera placeholdery JSONUnit
                const containsPlaceholders = typeof expectedValue === 'object' && 
                    JSON.stringify(expectedValue).includes('${json-unit.');
                
                if (containsPlaceholders) {
                    result = matchesJsonWithUnit(requestBody, expectedValue);
                } else {
                    result = JSON.stringify(requestBody) === JSON.stringify(expectedValue);
                }
                break;
            
            case BodyMatcherType.JSON_PATH:
                const jsonPathResults = jsonpath.query(requestBody, expectedValue);
                result = jsonPathResults.length > 0;
                break;
            
            case BodyMatcherType.XPATH:
                if (typeof requestBody !== 'string') {
                    requestBody = JSON.stringify(requestBody);
                }
                try {
                    const doc = new DOMParser().parseFromString(requestBody);
                    const nodes = xpath.select(expectedValue, doc);
                    result = nodes.length > 0;
                } catch (xmlError) {
                    console.error('Error parsing XML:', xmlError);
                    result = false;
                }
                break;
            
            case BodyMatcherType.REGEX:
                let regex;
                try {
                    regex = new RegExp(expectedValue);
                    const stringToMatch = typeof requestBody === 'object' 
                        ? JSON.stringify(requestBody) 
                        : String(requestBody);
                    result = regex.test(stringToMatch);
                } catch (regexError) {
                    console.error('Invalid regex pattern:', regexError);
                    result = false;
                }
                break;
            
            case BodyMatcherType.STRING:
                const requestString = typeof requestBody === 'object' 
                    ? JSON.stringify(requestBody) 
                    : String(requestBody);
                result = requestString === expectedValue;
                break;
            
            default:
                result = false;
        }
    } catch (error) {
        console.error('Error matching body:', error);
        result = false;
    }
    
    // Odwróć wynik, jeśli invertMatch jest true
    return invertMatch ? !result : result;
}

function matchesJsonWithUnit(requestBody, expectedBody) {
    // Obsługa płaskiego obiektu
    if (typeof expectedBody !== 'object' || expectedBody === null) {
        return matchesJsonUnitValue(requestBody, expectedBody);
    }
    
    // Obsługa tablicy
    if (Array.isArray(expectedBody)) {
        if (!Array.isArray(requestBody) || requestBody.length !== expectedBody.length) {
            return false;
        }
        
        return expectedBody.every((expectedItem, index) => 
            matchesJsonWithUnit(requestBody[index], expectedItem)
        );
    }
    
    // Obsługa obiektu
    if (typeof requestBody !== 'object' || requestBody === null) {
        return false;
    }
    
    return Object.entries(expectedBody).every(([key, expectedValue]) => {
        // Sprawdź czy pole istnieje w requestBody
        if (!(key in requestBody) && expectedValue !== JsonUnitPlaceholder.IGNORE) {
            return false;
        }
        
        // Jeśli placeholder to IGNORE, zawsze zwracaj true
        if (expectedValue === JsonUnitPlaceholder.IGNORE) {
            return true;
        }
        
        return matchesJsonWithUnit(requestBody[key], expectedValue);
    });
}

function matchesJsonUnitValue(actualValue, expectedValue) {
    if (expectedValue === JsonUnitPlaceholder.IGNORE) {
        return true;
    }
    
    if (expectedValue === JsonUnitPlaceholder.ANY_STRING) {
        return typeof actualValue === 'string';
    }
    
    if (expectedValue === JsonUnitPlaceholder.ANY_NUMBER) {
        return typeof actualValue === 'number';
    }
    
    if (expectedValue === JsonUnitPlaceholder.ANY_BOOLEAN) {
        return typeof actualValue === 'boolean';
    }
    
    if (expectedValue === JsonUnitPlaceholder.ANY_OBJECT) {
        return typeof actualValue === 'object' && actualValue !== null && !Array.isArray(actualValue);
    }
    
    if (expectedValue === JsonUnitPlaceholder.ANY_ARRAY) {
        return Array.isArray(actualValue);
    }
    
    return actualValue === expectedValue;
}

// Eksportujemy funkcje pomocnicze dla testów
export {
    matchesQuery,
    matchesHeaders,
    matchesBody,
    matchesJsonWithUnit
};
