/* eslint-disable no-underscore-dangle */
import { createPreventTimerTests } from './prevent-timer.helpers';

createPreventTimerTests({
    name: 'prevent-setInterval',
    uboAlias: 'ubo-no-setInterval-if.js',
    setTimer: window.setInterval,
    clearTimer: clearInterval,
    timerMethodName: 'setInterval',
});
