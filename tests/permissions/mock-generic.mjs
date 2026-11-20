const proxy = new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : proxy), apply: () => proxy, construct: () => proxy });
export default proxy; export const read = proxy, utils = proxy, Pool = proxy;
