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
export {
  Mock
};
