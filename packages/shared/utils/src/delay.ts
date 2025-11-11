/**
 * Delays the execution.
 * @param t The time to delay.
 * @param val The value to return.
 * @returns The promise.
 */
export function delay(t: any, val?: any): any {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(val);
        }, t);
    });
}
