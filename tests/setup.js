"use strict";

/* global jest -- Load the real Probot ESM package for CommonJS tests. */

module.exports = async () => {
	jest.setMock("probot", await import("probot"));
};
