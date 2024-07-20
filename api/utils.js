const { PROVIDERS } = require("./constants");

const filterProviders = (offers) => {
  return offers.filter((offer) => PROVIDERS.includes(offer.package.clearName));
};

const limitConcurrentRequests = async (tasks, limit) => {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);

    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
};

module.exports = {
  filterProviders,
  limitConcurrentRequests,
};