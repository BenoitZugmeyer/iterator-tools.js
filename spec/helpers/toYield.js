/*eslint-env jasmine*/

const pp = (chunks, ...vars) => {
  let result = chunks[0];
  vars.forEach((v, i) => result += jasmine.pp(v) + chunks[i + 1]);
  return result;
};

const FAIL = (message) => ({ pass: false, message });
const SUCCESS = { pass: true };

beforeEach(() => {
  jasmine.addMatchers({
    toYield(util, customEqualityTesters) {
      return {
        compare(actual, ...expected) {
          for (const value of actual) {
            if (!expected.length) return FAIL(pp`Yielded extra value ${value}`);

            const next = expected.shift();
            const result = util.equals(value, next, customEqualityTesters);

            if (!result) return FAIL(pp`Yielded ${value}, expected ${next}`);
          }
          if (expected.length) return FAIL(pp`Expected to yield ${expected}`);
          return SUCCESS;
        },
      };
    },
  });
});
