"use strict";

/* global jest -- Load the real Probot ESM package for CommonJS tests on Node 22. */

module.exports = async () => {
	jest.setMock("probot", await import("probot"));
};
