import { MethodMock } from "./method-mock";
import { Mock } from "./mock";
function createGlobalMock(obj, data) {
  const mock = class extends Mock {
    constructor(customData = {}) {
      super();
      for (const [key, item] of Object.entries(data)) {
        if (item instanceof MethodMock) {
          const usedMethod = customData?.[key] || item;
          this[key] = jest.spyOn(obj, key)[usedMethod.type](usedMethod.value);
        } else {
        }
      }
    }
  };
  return mock;
}
export {
  createGlobalMock
};
