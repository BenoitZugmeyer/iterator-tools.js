/*eslint-env jasmine*/

const pp = (chunks, ...vars) => {
  let result = chunks[0];
  vars.forEach((v, i) => result += jasmine.pp(v) + chunks[i + 1]);
  return result;
};

const FAIL = (message) => ({ pass: false, message });
const SUCCESS = { pass: true };

const compare = (util, customEqualityTesters, actual, expected) => {
    for (const actualValue of actual) {
        const expectedItem = expected.next();

        if (expectedItem.done) return FAIL(pp`Yielded extra value ${actualValue}`);

        const expectedValue = expectedItem.value;
        const result = util.equals(actualValue, expectedValue, customEqualityTesters);

        if (!result) return FAIL(pp`Yielded ${actualValue}, expected ${expectedValue}`);
    }

    const expectedItem = expected.next();
    if (!expectedItem.done) return FAIL(pp`Expected to yield ${expectedItem.value}`);

    return SUCCESS;
};

beforeEach(() => {

  jasmine.addMatchers({

    toYield(util, customEqualityTesters) {
      return {
        compare(actual, ...expected) {
            return compare(util, customEqualityTesters, actual, expected[Symbol.iterator]());
        },
      };
    },

    toYieldFromIterator(util, customEqualityTesters) {
        return {
            compare(actual, expected) {
                return compare(util, customEqualityTesters, actual, expected);
            },
        };
    },

  });

});
