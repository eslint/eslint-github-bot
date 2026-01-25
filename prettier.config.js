"use strict";

module.exports = {
	useTabs: true,
	tabWidth: 4,
	arrowParens: "avoid",

	overrides: [
		{
			files: ["*.json"],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
};
