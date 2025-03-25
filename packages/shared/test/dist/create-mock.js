"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var create_mock_exports = {};
__export(create_mock_exports, {
  createMock: () => createMock
});
module.exports = __toCommonJS(create_mock_exports);
var import_method_mock = require("./method-mock");
var import_mock = require("./mock");
function createMock(data) {
  const mock = class extends import_mock.Mock {
    constructor(customData = {}) {
      super();
      for (const [key, item] of Object.entries(data)) {
        if (item instanceof import_method_mock.MethodMock) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMock
});
