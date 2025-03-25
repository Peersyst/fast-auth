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
var mock_exports = {};
__export(mock_exports, {
  Mock: () => Mock
});
module.exports = __toCommonJS(mock_exports);
class Mock {
  /**
   * Clears the mocks.
   */
  clearMocks() {
    Object.values(this).forEach((value) => {
      if (value?.mockClear) value.mockClear();
    });
  }
  /**
   * Resets the mocks.
   */
  resetMocks() {
    Object.values(this).forEach((value) => {
      if (value?.mockReset) value.mockReset();
    });
  }
  /**
   * Restores the mocks.
   */
  restoreMocks() {
    Object.values(this).forEach((value) => {
      if (value?.mockRestore) value.mockRestore();
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Mock
});
