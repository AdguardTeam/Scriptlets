export { Redirects } from "./redirects.mjs";

import { redirectsMap } from "../tmp/redirects-map.mjs";

var getRedirectFilename = function getRedirectFilename(name) {
    return redirectsMap[name];
};

export { getRedirectFilename };
