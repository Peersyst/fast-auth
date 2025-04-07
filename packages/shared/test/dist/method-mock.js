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
var method_mock_exports = {};
__export(method_mock_exports, {
  MethodMock: () => MethodMock
});
module.exports = __toCommonJS(method_mock_exports);
class MethodMock {
  type;
  value;
  constructor(type, value = void 0) {
    this.type = type;
    this.value = value;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MethodMock
});
