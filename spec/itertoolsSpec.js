/*eslint-env jasmine*/

// Based on https://hg.python.org/releasing/3.4.3/file/tip/Lib/test/test_itertools.py

import {
  accumulate,
  range,
  chain,
  islice,
  chainFromIterable,
  count,
  zip,
  combinations,
  combinationsWithReplacement,
  groupby,
} from "../index";

const fact = (n) => n <= 1 ? 1 : n * fact(n - 1);
const cmp = (a, b) => {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) throw new Error(`Can't compare ${a} with ${b}`);
    for (const [va, vb] of zip(a, b)) { // TODO use zipLonguest
      const r = cmp(va, vb);
      if (r) return r;
    }
    return 0;
  }
  return (
    a === b ? 0 :
    a < b ? -1 :
      1
  );
};

const cloneTuples = (iterable) => {
  const result = [];
  for (const v of iterable) result.push(v.slice());
  return result;
};

const sorted = (iterable) => Array.from(iterable).sort(cmp);

describe("itertools", () => {

  it("reuse the value object", () => {
    const it = count();
    expect(it.next()).toBe(it.next());
  });

  it("range", () => {
    expect(range(10)).toYield(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(range(1, 11)).toYield(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    expect(range(0, 30, 5)).toYield(0, 5, 10, 15, 20, 25);
    expect(range(0, 10, 3)).toYield(0, 3, 6, 9);
    expect(range(0, -10, -1)).toYield(0, -1, -2, -3, -4, -5, -6, -7, -8, -9);
    expect(range(1, 0)).toYield();

    expect(range(3)).toYield(0, 1, 2);
    expect(range(1, 5)).toYield(1, 2, 3, 4);
    expect(range(0)).toYield();
    expect(range(-3)).toYield();
    expect(range(1, 10, 3)).toYield(1, 4, 7);
    expect(range(5, -5, -3)).toYield(5, 2, -1, -4);

    const a = 10;
    const b = 100;
    const c = 50;

    expect(range(a, a + 2)).toYield(a, a + 1);
    expect(range(a + 2, a, -1)).toYield(a + 2, a + 1);
    expect(range(a + 4, a, -2)).toYield(a + 4, a + 2);

    const seq = Array.from(range(a, b, c));
    expect(seq).toContain(a);
    expect(seq).not.toContain(b);
    expect(seq.length).toBe(2);

    const negSeq = Array.from(range(-a, -b, -c));
    expect(negSeq).toContain(-a);
    expect(negSeq).not.toContain(-b);
    expect(negSeq.length).toBe(2);

    expect(range).toThrowError(Error, "start must be a number");
    expect(() => range(1, 2, 0)).toThrowError(Error, "step must be different than zero");
    expect(() => range("spam")).toThrowError(Error, "start must be a number");
    expect(() => range(0, "spam")).toThrowError(Error, "stop must be a number");
    expect(() => range(0, 42, "spam")).toThrowError(Error, "step must be a number");
  });

  describe("islice", () => {
    it("should agree with range", () => {
      expect(islice(range(100), 10, 20, 3)).toYieldFromIterator(range(10, 20, 3));
      expect(islice(range(100), 10, 3, 20)).toYieldFromIterator(range(10, 3, 20));
      expect(islice(range(100), 10, 20)).toYieldFromIterator(range(10, 20));
      expect(islice(range(100), 10, 3)).toYieldFromIterator(range(10, 3));
      expect(islice(range(100), 20)).toYieldFromIterator(range(20));
    });

    it("stops when seqn is exhausted", () => {
      expect(islice(range(100), 10, 110, 3)).toYieldFromIterator(range(10, 100, 3));
      expect(islice(range(100), 10, 110)).toYieldFromIterator(range(10, 100));
      expect(islice(range(100), 110)).toYieldFromIterator(range(100));
    });

    it("works when stop=null", () => {
      expect(islice(range(10))).toYieldFromIterator(range(10));
      expect(islice(range(10), 2, Infinity)).toYieldFromIterator(range(2, 10));
      expect(islice(range(10), 1, Infinity, 2)).toYieldFromIterator(range(1, 10, 2));
    });

    it("consumes the right number of items", () => {
      const iterator = range(10);
      expect(islice(iterator, 3)).toYieldFromIterator(range(3));
      expect(iterator).toYieldFromIterator(range(3, 10));
    });

    it("throws errors when passing invalid arguments", () => {
      const ra = range(10);
      expect(() => islice(ra, -5, 10, 1)).toThrowError(Error, "start must be positive");
      expect(() => islice(ra, 1, -5, -1)).toThrowError(Error, "stop must be positive");
      expect(() => islice(ra, 1, 10, -1)).toThrowError(Error, "step must be positive");
      expect(() => islice(ra, 1, 10, 0)).toThrowError(Error, "step must be different than zero");
      expect(() => islice(ra, "a")).toThrowError(Error, "stop must be a number");
      expect(() => islice(ra, "a", 1)).toThrowError(Error, "start must be a number");
      expect(() => islice(ra, 1, "a")).toThrowError(Error, "stop must be a number");
      expect(() => islice(ra, "a", 1, 1)).toThrowError(Error, "start must be a number");
      expect(() => islice(ra, 1, "a", 1)).toThrowError(Error, "stop must be a number");

      expect(() => islice(ra, 0.5)).toThrowError(Error, "stop must be an integer");
      expect(() => islice(ra, 0.5, 1)).toThrowError(Error, "start must be an integer");
      expect(() => islice(ra, 1, 0.5)).toThrowError(Error, "stop must be an integer");
      expect(() => islice(ra, 0.5, 1, 1)).toThrowError(Error, "start must be an integer");
      expect(() => islice(ra, 1, 0.5, 1)).toThrowError(Error, "stop must be an integer");
    });

    it("is in a predictable state", () => {
      const c = count();
      expect(islice(c, 1, 3, 50)).toYield(1);
      expect(c.next().value).toBe(3);
    });

  });

  it("accumulate", () => {
    expect(accumulate(range(10))).toYield(0, 1, 3, 6, 10, 15, 21, 28, 36, 45);
    expect(accumulate("abc")).toYield("a", "ab", "abc");
    expect(accumulate([])).toYield();
    expect(accumulate([7])).toYield(7);
    expect(accumulate).toThrowError(Error, "undefined is not iterable");
    const s = [2, 8, 9, 5, 7, 0, 3, 4, 1, 6];
    expect(accumulate(s, Math.min)).toYield(2, 2, 2, 2, 2, 0, 0, 0, 0, 0);
    expect(accumulate(s, Math.max)).toYield(2, 8, 9, 9, 9, 9, 9, 9, 9, 9);
    expect(accumulate(s, (a, b) => a * b)).toYield(2, 16, 144, 720, 5040, 0, 0, 0, 0, 0);
  });

  it("chain", () => {
    expect(chain("abc", "def")).toYield("a", "b", "c", "d", "e", "f");
    expect(chain("abc")).toYield("a", "b", "c");
    expect(chain("")).toYield();
    expect(chain("a", "b", "c")).toYield("a", "b", "c");
    expect(islice(chain("abc", "def"), 4)).toYield("a", "b", "c", "d");
    expect(() => chain(2, 3).next()).toThrowError(Error, "2 is not iterable");
  });

  it("chainFromIterable", () => {
    expect(chainFromIterable(["abc", "def"])).toYield("a", "b", "c", "d", "e", "f");
    expect(chainFromIterable(["abc"])).toYield("a", "b", "c");
    expect(chainFromIterable([""])).toYield();
    expect(chainFromIterable(["", "ab", "", "c"])).toYield("a", "b", "c");
    expect(islice(chainFromIterable(["abc", "def"]), 4)).toYield("a", "b", "c", "d");
    expect(() => chainFromIterable([2, 3]).next()).toThrowError(Error, "2 is not iterable");
  });

  it("count", () => {
    expect(islice(count(), 5)).toYield(0, 1, 2, 3, 4);
    expect(islice(count(3), 5)).toYield(3, 4, 5, 6, 7);
    expect(islice(count(-3), 5)).toYield(-3, -2, -1, 0, 1);
    expect(islice(count(0, 2), 5)).toYield(0, 2, 4, 6, 8);
    expect(islice(count(.5, .3), 5)).toYield(.5,
                                             .5 + .3,
                                             .5 + .3 + .3,
                                             .5 + .3 + .3 + .3,
                                             .5 + .3 + .3 + .3 + .3);

    expect(zip("abc", count())).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc", count(3))).toYield(["a", 3], ["b", 4], ["c", 5]);
    expect(islice(zip("abc", count(3)), 2)).toYield(["a", 3], ["b", 4]);
    expect(islice(zip("abc", count(-1)), 2)).toYield(["a", -1], ["b", 0]);
    expect(islice(zip("abc", count(-3)), 2)).toYield(["a", -3], ["b", -2]);

    expect(() => count("a")).toThrowError(Error, "start must be a number");
    expect(() => count(0, 0)).toThrowError(Error, "step must be different than zero");
  });

  it("zip", () => {
    expect(zip("abc", count())).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc", range(6))).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abcdef", range(3))).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(islice(zip("abcdef", count()), 3)).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc")).toYield(["a"], ["b"], ["c"]);
    expect(zip()).toYield();
    expect(zip("abc", "def", "ghi")).toYield(["a", "d", "g"], ["b", "e", "h"], ["c", "f", "i"]);

    expect(() => zip(3).next()).toThrowError(Error, "3 is not iterable");
    expect(() => zip(range(3), 3).next()).toThrowError(Error, "3 is not iterable");

    // Array reusability
    const it = zip("abc");
    expect(it.next().value).toBe(it.next().value);
  });

  it("combinations", () => {
    expect(() => combinations("abc")).toThrowError(Error, "r must be a number");
    expect(() => combinations(null, 1)).toThrowError(Error, "null is not iterable");
    expect(() => combinations("abc", -2)).toThrowError(Error, "r must be positive");

    expect(combinations("abc", 32)).toYield();
    expect(combinations("ABCD", 2)).toYield(["A","B"], ["A","C"], ["A","D"], ["B","C"],
                                            ["B","D"], ["C","D"]);

    const testIntermediate = combinations("ABCD", 2);
    testIntermediate.next();
    expect(testIntermediate).toYield(["A","C"], ["A","D"], ["B","C"], ["B","D"],
                                     ["C","D"]);

    expect(combinations(range(4), 3)).toYield([0, 1, 2], [0, 1, 3], [0, 2, 3],
                                              [1, 2, 3]);

    for (const n of range(4)) {
      const values = Array.from(range(n)).map((x) => 5 * x - 12);
      for (const r of range(n + 2)) {
        const result = cloneTuples(combinations(values, r));

        expect(result.length).toBe(r > n ? 0 : fact(n) / fact(r) / fact(n - r));
        expect(result.length).toBe(new Set(result).size);
        expect(result).toEqual(sorted(result));
        for (const c of result) {
          expect(c.length).toBe(r);
          expect(new Set(c).size).toBe(r);
          expect(c).toEqual(sorted(c));
          for (const e of c) expect(values).toContain(e);
          expect(c).toEqual(values.filter((e) => c.includes(e)));
        }
      }
    }
  });

  it("combinationsWithReplacement", () => {
    pending("TODO: implement combinationsWithReplacement and groupby");
    const cwr = combinationsWithReplacement;

    expect(() => cwr("abc")).toThrowError(Error, "r must be a number");
    expect(() => cwr(null, 1)).toThrowError(Error, "null is not iterable");
    expect(() => cwr("abc", -2)).toThrowError(Error, "r must be positive");


    expect(cwr('ABC', 2)).toYield(['A', 'A'], ['A', 'B'], ['A', 'C'], ['B', 'B'],
                                  ['B', 'C'], ['C', 'C']);

    const testIntermediate = cwr('ABC', 2);
    testIntermediate.next();
    expect(testIntermediate).toYield(['A', 'B'], ['A', 'C'], ['B', 'B'], ['B', 'C'],
                                     ['C', 'C']);

    const numcombs = (n, r) => n ? fact(n + r - 1) / fact(r) / fact(n - 1) : r ? 0 : 1;

    for (const n of range(7)) {
      const values = Array.from(range(n)).map((x) => 5 * x - 12);
      for (const r of range(n + 2)) {
        const result = cloneTuples(combinations(values, r));

        expect(result.length).toBe(numcombs(n, r));
        expect(result.length).toBe(new Set(result).size);
        expect(result).toEqual(sorted(result));

        const regularCombs = combinations(values, r);
        if (n === 0 || r <= 1) {
          expect(result).toEqual(regularCombs);
        }
        else {
          for (const comb of regularCombs) expect(result).toContain(comb);
        }

        for (const c in result) {
          expect(c.length).toBe(r);
          const noruns = [];
          for (const [k] of groupby(c)) noruns.push(k);
          expect(noruns.length).toBe(new Set(noruns).size);
          expect(c).toEqual(sorted(c));
          for (const e of c) expect(values).toContain(e);
          expect(noruns).toEqual(values.filter((e) => c.includes(e)));
        }
      }
    }
  });

  describe("groupby", () => {
    pending("TODO: implement groupby");
    const getKeys = (iterable) => {
      const keys = [];
      for (const [k] of iterable) keys.push(k);
      return keys;
    };

    const s = [[0, 10, 20], [0, 11,21], [0,12,21], [1,13,21], [1,14,22],
      [2,15,22], [3,16,23], [3,17,23]];

    it("accepts arguments correctly", () => {
      expect(groupby([])).toYield();
      expect(groupby([], () => {})).toYield();
      expect(() => groupby("abc", []).next()).toThrowError(Error, "TODO");
      expect(() => groupby(null)).toThrowError(Error, "TODO");
    });

    it("works with normal input", () => {
      const dup = [];

      for (const [k, g] of groupby(s, (r) => r[0])) {
        for (const elem of g) {
          expect(k).toEqual(elem[0]);
          dup.push(elem);
        }
      }

      expect(s).toEqual(dup);
    });

    it("works with nested inputs", () => {
      const dup = [];

      for (const [k, g] of groupby(s, (r) => r[0])) {
        for (const [ik, ig] of groupby(g, (r) => r[2])) {
          for (const elem of ig) {
            expect(k).toEqual(elem[0]);
            expect(ik).toEqual(elem[2]);
            dup.push(elem);
          }
        }
      }

      expect(s).toEqual(dup);
    });

    it("works when inner iterator is not used", () => {
      const keys = getKeys(groupby(s, (r) => r[0]));
      const expectedKeys = new Set();
      for (const r of s) expectedKeys.add(r[0]);

      expect(keys).toEqual(Array.from(expectedKeys));
      expect(keys.length).toEqual(expectedKeys.size);
    });

    it("works with different use cases", () => {
      const t = "abracadabra";
      expect(getKeys(groupby(sorted(t)))).toEqual(["a", "b", "c", "d", "r"]);
      const keys = [];
      for (const [k, g] of groupby(sorted(t))) {
        if (g.next() && !g.next().done) keys.push(k);
      }
      expect(keys).toEqual(["a", "b", "r"]);

      const lengths = [];
      for (const [k, g] of groupby(sorted(s))) {
        lengths.push([Array.from(g).length, k]);
      }
      expect[lengths].toEqual[[[5, "a"], [2, "b"], [1, "c"], [1, "d"], [2, "r"]]];
    });
  });
});
