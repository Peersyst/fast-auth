import deepmerge from "./utils/deepmerge";
function mockify(defaultValues = {}) {
  return class {
    constructor(data = {}) {
      Object.assign(this, deepmerge(defaultValues, data));
    }
  };
}
export {
  mockify
};
