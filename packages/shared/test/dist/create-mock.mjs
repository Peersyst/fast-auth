import { MethodMock } from "./method-mock";
import { Mock } from "./mock";
function createMock(data) {
  const mock = class extends Mock {
    constructor(customData = {}) {
      super();
      for (const [key, item] of Object.entries(data)) {
        if (item instanceof MethodMock) {
          const usedMethod = customData?.[key] || item;
          this[key] = jest.fn()[usedMethod.type](usedMethod.value);
        } else {
          this[key] = item;
        }
      }
    }
  };
  return mock;
}
export {
  createMock
};
