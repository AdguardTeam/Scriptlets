/**
 * Check is passed property available in base object
 * @param {Object} base
 * @param {string} property
 * @returns {{base: Object, property: string}|boolean}
 */
function getChainProperty(base, property) {
    const isPropertyExists = (base, prop) => {
        try {
            if (base.hasOwnProperty(prop)) {
                base = base[prop];
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    const getPathArray = property => {
        const props = [];
        let currentProp = '';
        property.split('').forEach(s => {
            if (s === '[' || s === ']' || s === '.') {
                currentProp && props.push(currentProp);
                currentProp = '';
            } else {
                currentProp += s;
            }
        });
        currentProp && props.push(currentProp);
        return props;
    };

    let currentBase = base;
    let pathOk = true;
    const path = getPathArray(property);
    for (let i = 0; i < path.length - 1; i++) {
        if (isPropertyExists(currentBase, path[i])) {
            currentBase = currentBase[path[i]];
        } else {
            pathOk = false;
            break;
        }
    }

    const lastProp = path[path.length - 1];
    pathOk = pathOk && isPropertyExists(currentBase, lastProp);

    return pathOk ? {
        base: currentBase,
        property: lastProp
    } : false;
}

export default getChainProperty;

