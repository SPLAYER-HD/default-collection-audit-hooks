Package.describe({
  name: "splayerhd:default-collection-audit-hooks",
  version: "1.1.21",
  // Brief, one-line summary of the package.
  summary: "Automatically assign default collection fields" + "(createdAt, createdBy, modifiedAt, modifiedBy)",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/SPLAYER-HD/default-collection-audit-hooks",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "README.md",
});

Package.onUse(function (api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('mongo');
  api.use('tracker');
  api.use('matb33:collection-hooks@1.2.2');
  api.addFiles("default-collection-audit-hooks.js");
});

Package.onTest(function (api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use("splayerhd:default-collection-audit-hooks");
  api.addFiles("default-collection-audit-hooks-tests.js");
});
