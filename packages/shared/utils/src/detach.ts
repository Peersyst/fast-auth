/**
 * Detaches a function from the main thread.
 * Can be used to avoid blocking the ui thread.
 * @param f The function to detach.
 * @returns The result of the function.
 */
export async function detach<F extends (...args: any[]) => any>(f: F): Promise<ReturnType<F> extends Promise<infer U> ? U : ReturnType<F>> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const result = f();

            if (result && result instanceof Promise) {
                result.then(resolve).catch(reject);
            } else {
                resolve(result);
            }
        });
    });
}
