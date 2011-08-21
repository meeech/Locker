var lsearch = require("../../Common/node/lsearch");

lsearch.setEngine(lsearch.engines.CLucene);
lsearch.setIndexPath(process.cwd() + "/testsearch.index");

