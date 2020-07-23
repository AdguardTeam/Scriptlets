import { hit } from '../helpers';

/**
 * @scriptlet hyperlink-setter
 *
 * @description
 * Set the links properly. It is specified to work only on multiup.org for now.
 *
 * **Syntax**
 * ```
 * multiup.org#%#//scriptlet('hyperlink-setter')
 * ```
 */
export function hyperlinkSetter(source) {
    const linkSetter = (e) => {
        if (e) {
            window.removeEventListener(e.type, linkSetter, true);
        }

        const buttons = document.querySelectorAll('.panel-footer > form[action] > button[link]');
        const forms = document.querySelectorAll('.panel-footer > form[action]');

        const shouldResetLink = buttons.length !== 0 && forms.length !== 0
            && buttons.length === forms.length;

        if (shouldResetLink) {
            for (let i = 0; i < forms.length; i += 1) {
                const properLink = buttons[i].getAttribute('link');
                forms[i].setAttribute('action', properLink);
                forms[i].setAttribute('target', '_blank');
            }
            hit(source);
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', linkSetter, true);
    } else {
        linkSetter();
    }
}

hyperlinkSetter.names = [
    'hyperlink-setter',
];

hyperlinkSetter.injections = [hit];
