import { toRegExp, isValidStrPattern } from './string-utils';

type FetchResource = Request | URL | string;

/**
 * Aggregates fetch and XMLHttpRequest.open arguments
 * to operate on arbitrary request data objects
 */
type SharedRequestData<T> = {
    [key in LegalRequestProp]?: T;
};

/**
 * Object which is populated with request data from scriptlet arguments
 */
type ParsedMatchProps = SharedRequestData<string>;

/**
 * Derivative of ParsedMatchProps with its values being
 * converted to RegExp
 */
export type MatchPropsData = SharedRequestData<RegExp>;

/**
 * Fetch and xhr.open options that are valid props
 * to match for (trusted-)prevent-(fetch|xhr) scriptlets
 *
 * This type is being derived from getRequestProps return type
 * as enums would be lost at build time disregarding 'const'
 */
export type LegalRequestProp = ReturnType<typeof getRequestProps>[number];

/**
 * Returns array of request props that are supported by fetch/xhr scriptlets.
 * Includes common 'url' and 'method' props and all other fetch-specific props
 *
 * @returns list of request props
 */
export const getRequestProps = () => {
    return [
        'url',
        'method',
        'headers',
        'body',
        'credentials',
        'cache',
        'redirect',
        'referrer',
        'referrerPolicy',
        'integrity',
        'keepalive',
        'signal',
        'mode',
    ] as const;
};

/**
 * Collects Request options to object
 *
 * @param request Request instance to collect properties from
 * @returns data object
 */
export const getRequestData = (request: Request): Partial<Request> => {
    const requestInitOptions = getRequestProps();
    const entries: [keyof Request, any][] = requestInitOptions
        .map((key) => {
            // if request has no such option, value will be undefined
            const value = request[key];
            return [key, value];
        });
    return Object.fromEntries(entries);
};

/**
 * Collects fetch args to object
 *
 * @param args fetch args
 * @returns data object
 */
export const getFetchData = (args: [FetchResource, RequestInit], nativeRequestClone: Function) => {
    const fetchPropsObj: Record<string, unknown> = {};

    const resource = args[0];
    let fetchUrl: FetchResource;
    let fetchInit: RequestInit;
    if (resource instanceof Request) {
        // Get real properties in case if data URL was used
        // and properties were set by Object.defineProperty
        // https://github.com/AdguardTeam/Scriptlets/issues/367
        const realData = nativeRequestClone.call(resource);
        // if Request passed to fetch, it will be in array
        const requestData = getRequestData(realData);
        fetchUrl = requestData.url as string;
        fetchInit = requestData;
    } else {
        fetchUrl = resource; // eslint-disable-line prefer-destructuring
        fetchInit = args[1]; // eslint-disable-line prefer-destructuring
    }

    fetchPropsObj.url = fetchUrl;
    if (fetchInit instanceof Object) {
        const props = Object.keys(fetchInit) as Array<keyof RequestInit>;
        props.forEach((prop) => {
            fetchPropsObj[prop] = fetchInit[prop];
        });
    }
    return fetchPropsObj;
};

/**
 * Collect xhr.open arguments to object
 *
 * @param method request method
 * @param url request url
 * @param async request async prop
 * @param user request user prop
 * @param password request password prop
 * @returns aggregated request data
 */
export const getXhrData = (method: string, url: string, async: string, user: string, password: string) => {
    return {
        method,
        url,
        async,
        user,
        password,
    };
};

/**
 * Parse propsToMatch input string into object;
 * used for prevent-fetch and prevent-xhr
 *
 * @param propsToMatchStr string of space-separated request properties to match
 * @returns object where 'key' is prop name and 'value' is prop value
 */
export const parseMatchProps = (propsToMatchStr: string): ParsedMatchProps => {
    const PROPS_DIVIDER = ' ';
    const PAIRS_MARKER = ':';
    const isRequestProp = (prop: string): prop is LegalRequestProp => {
        return getRequestProps().includes(prop as LegalRequestProp);
    };

    const propsObj: ParsedMatchProps = {};
    const props = propsToMatchStr.split(PROPS_DIVIDER);

    props.forEach((prop) => {
        const dividerInd = prop.indexOf(PAIRS_MARKER);

        const key = prop.slice(0, dividerInd);

        if (isRequestProp(key)) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
        } else {
            // Escape multiple colons in prop
            // i.e regex value and/or url with protocol specified, with or without 'url:' match prop
            // https://github.com/AdguardTeam/Scriptlets/issues/216#issuecomment-1178591463
            propsObj.url = prop;
        }
    });

    return propsObj;
};

/**
 * Validates parsed data values
 *
 * @param data request data
 * @returns if data is valid
 */
export const isValidParsedData = (data: ParsedMatchProps): boolean => {
    return Object.values(data)
        .every((value) => isValidStrPattern(value));
};

/**
 * Converts valid parsed data to data obj for further matching
 *
 * @param data parsed request data
 * @returns data obj ready for matching
 */
export const getMatchPropsData = (data: ParsedMatchProps): MatchPropsData => {
    const matchData: MatchPropsData = {};
    // Assertion is required, as Object.keys always returns string[]
    const dataKeys = Object.keys(data) as LegalRequestProp[];
    dataKeys.forEach((key) => {
        matchData[key] = toRegExp(data[key]);
    });
    return matchData;
};
