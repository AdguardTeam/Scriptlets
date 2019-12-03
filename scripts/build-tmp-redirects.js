import {
    attachDependencies,
    addCall,
    passSourceAndPropsToScriptlet,
} from '../src/injector';

import * as redirectsList from '../src/redirects';


const getRedirectByName = (redirectsList, name) => {
    const redirects = Object.keys(redirectsList).map((key) => redirectsList[key]);
    return redirects.find((s) => s.names && s.names.indexOf(name) > -1);
};

const getRedirectCode = (name) => {
    const redirect = getRedirectByName(redirectsList, name);
    let result = attachDependencies(redirect);
    result = addCall(redirect, result);

    return passSourceAndPropsToScriptlet({ name }, result);
};

redirects = (() => ({ getCode: getRedirectCode }))(); // eslint-disable-line no-undef
