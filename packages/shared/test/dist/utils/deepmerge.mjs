function isPlainObject(item) {
  return item !== null && typeof item === "object" && item?.constructor === Object;
}
function deepmerge(target, source, options = { clone: true }) {
  const output = options.clone ? { ...target } : target;
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach((key) => {
      if (key === "__proto__") {
        return;
      }
      if (isPlainObject(source[key]) && key in target && isPlainObject(target[key])) {
        output[key] = deepmerge(target[key], source[key], options);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}
export {
  deepmerge as default,
  isPlainObject
};
