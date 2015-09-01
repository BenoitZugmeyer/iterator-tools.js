/*eslint-env jasmine*/

// Based on https://hg.python.org/releasing/3.4.3/file/tip/Lib/test/test_itertools.py

import {
  accumulate,
  range,
  chain,
  take,
  chain_from_iterable,
} from "../index";

describe("itertools", () => {
  it("range", () => {
    expect(range(10)).toYield(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(range(1, 11)).toYield(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    expect(range(0, 30, 5)).toYield(0, 5, 10, 15, 20, 25);
    expect(range(0, 10, 3)).toYield(0, 3, 6, 9);
    expect(range(0, -10, -1)).toYield(0, -1, -2, -3, -4, -5, -6, -7, -8, -9);
    expect(range(0)).toYield();
    expect(range(1, 0)).toYield();
    // Add more tests from unit tests
  });

  it("take", () => {
    pending("TODO");
  });

  it("accumulate", () => {
    expect(accumulate(range(10))).toYield(0, 1, 3, 6, 10, 15, 21, 28, 36, 45);
    expect(accumulate("abc")).toYield("a", "ab", "abc");
    expect(accumulate([])).toYield();
    expect(accumulate([7])).toYield(7);
    expect(accumulate).toThrowError(TypeError, "undefined is not iterable");
    const s = [2, 8, 9, 5, 7, 0, 3, 4, 1, 6];
    expect(accumulate(s, Math.min)).toYield(2, 2, 2, 2, 2, 0, 0, 0, 0, 0);
    expect(accumulate(s, Math.max)).toYield(2, 8, 9, 9, 9, 9, 9, 9, 9, 9);
    expect(accumulate(s, (a, b) => a * b)).toYield(2, 16, 144, 720, 5040, 0, 0, 0, 0, 0);
  });

  it("chain", () => {
    expect(chain("abc", "def")).toYield("a", "b", "c", "d", "e", "f");
    expect(chain("abc")).toYield("a", "b", "c");
    expect(chain("")).toYield();
    expect(take(chain("abc", "def"), 4)).toYield("a", "b", "c", "d");
    expect(() => chain(2, 3)).toThrowError(TypeError, "2 is not iterable");
  });

  it("chain_from_iterable", () => {
    pending("TODO");

    expect(chain_from_iterable(["abc", "def"])).toYield("a", "b", "c", "d", "e", "f");
    expect(chain_from_iterable(["abc"])).toYield("a", "b", "c");
    expect(chain_from_iterable([""])).toYield();
    expect(take(chain_from_iterable(["abc", "def"]), 4)).toYield("a", "b", "c", "d");
    expect(() => chain_from_iterable([2, 3])).toThrowError(TypeError, "2 is not iterable");
  });
});
