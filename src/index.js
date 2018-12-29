import { resolveDependencies } from './injector';

import * as scriptlets from './scriptlets';

scriptlet = (() => {

    const invoke = (data) => {
        if (!data.name) {
            return;
        }
        if (!scriptlets[data.name]) {
            return;
        }

        const result = resolveDependencies(scriptlets[data.name]);
        return result(data.args);
    }

    return { invoke };
})();