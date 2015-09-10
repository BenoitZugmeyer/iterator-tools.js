/*eslint-env jasmine*/

// Based on https://hg.python.org/releasing/3.4.3/file/tip/Lib/test/test_itertools.py

import {
  accumulate,
  chain,
  chainFromIterable,
  combinations,
  combinationsWithReplacement,
  compress,
  count,
  cycle,
  filter,
  filterFalse,
  groupBy,
  map,
  mapApply,
  range,
  repeat,
  slice,
  zip,
  zipLongest,
} from "../index";

const fact = (n) => n <= 1 ? 1 : n * fact(n - 1);
const cmp = (a, b) => {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) throw new Error(`Can't compare ${a} with ${b}`);
    for (const [va, vb] of zip(a, b)) { // TODO use zipLongest
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
    expect(slice(chain("abc", "def"), 4)).toYield("a", "b", "c", "d");
    expect(() => chain(2, 3).next()).toThrowError(Error, "2 is not iterable");
  });

  it("chainFromIterable", () => {
    expect(chainFromIterable(["abc", "def"])).toYield("a", "b", "c", "d", "e", "f");
    expect(chainFromIterable(["abc"])).toYield("a", "b", "c");
    expect(chainFromIterable([""])).toYield();
    expect(chainFromIterable(["", "ab", "", "c"])).toYield("a", "b", "c");
    expect(slice(chainFromIterable(["abc", "def"]), 4)).toYield("a", "b", "c", "d");
    expect(() => chainFromIterable([2, 3]).next()).toThrowError(Error, "2 is not iterable");
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
        const result = cloneTuples(cwr(values, r));

        expect(result.length).toBe(numcombs(n, r));
        expect(result.length).toBe(new Set(result).size);
        expect(result).toEqual(sorted(result));

        const regularCombs = combinations(values, r);
        if (n === 0 || r <= 1) {
          expect(result).toYieldFromIterator(regularCombs);
        }
        else {
          for (const comb of regularCombs) expect(result).toContain(comb);
        }

        for (const c of result) {
          expect(c.length).toBe(r);
          const noruns = [];
          for (const [k] of groupBy(c)) noruns.push(k);
          expect(noruns.length).toBe(new Set(noruns).size);
          expect(c).toEqual(sorted(c));
          for (const e of c) expect(values).toContain(e);
          expect(noruns).toEqual(values.filter((e) => c.includes(e)));
        }
      }
    }
  });

  it("compress", () => {
    expect(compress("ABCDEF", [1, 0, 1, 0, 1, 1])).toYield("A", "C", "E", "F");
    expect(compress("ABCDEF", [0, 0, 0, 0, 0, 0])).toYield();
    expect(compress("ABCDEF", [1, 1, 1, 1, 1, 1])).toYield("A", "B", "C", "D", "E", "F");
    expect(compress("ABCDEF", [1, 0, 1])).toYield("A", "C");
    expect(compress("ABC", [0, 1, 1, 1, 1, 1])).toYield("B", "C");

    const n = 2;
    const data = chainFromIterable(repeat([0, 1, 2, 3, 4, 5], n));
    const selectors = chainFromIterable(repeat([0, 1]));
    const it = compress(data, selectors);
    for (let i = 0; i < n; i += 1) {
      expect(it.next().value).toBe(1);
      expect(it.next().value).toBe(3);
      expect(it.next().value).toBe(5);
    }
    expect(it.next().done).toBe(true);

    expect(() => compress(null, range(6))).toThrowError(Error, "null is not iterable");
    expect(() => compress(range(6), null)).toThrowError(Error, "null is not iterable");
    expect(() => compress(range(6))).toThrowError(Error, "undefined is not iterable");
  });

  it("count", () => {
    expect(slice(count(), 5)).toYield(0, 1, 2, 3, 4);
    expect(slice(count(3), 5)).toYield(3, 4, 5, 6, 7);
    expect(slice(count(-3), 5)).toYield(-3, -2, -1, 0, 1);
    expect(slice(count(0, 2), 5)).toYield(0, 2, 4, 6, 8);
    expect(slice(count(.5, .3), 5)).toYield(.5,
                                             .5 + .3,
                                             .5 + .3 + .3,
                                             .5 + .3 + .3 + .3,
                                             .5 + .3 + .3 + .3 + .3);

    expect(zip("abc", count())).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc", count(3))).toYield(["a", 3], ["b", 4], ["c", 5]);
    expect(slice(zip("abc", count(3)), 2)).toYield(["a", 3], ["b", 4]);
    expect(slice(zip("abc", count(-1)), 2)).toYield(["a", -1], ["b", 0]);
    expect(slice(zip("abc", count(-3)), 2)).toYield(["a", -3], ["b", -2]);

    expect(() => count("a")).toThrowError(Error, "start must be a number");
    expect(() => count(0, 0)).toThrowError(Error, "step must be different than zero");
  });

  it("cycle", () => {
    expect(slice(cycle("abc"), 10)).toYield("a", "b", "c", "a", "b", "c", "a", "b", "c", "a");
    expect(cycle("")).toYield();
    expect(() => cycle()).toThrowError(Error, "undefined is not iterable");
    expect(() => cycle(5)).toThrowError(Error, "5 is not iterable");
    expect(slice(cycle(range(3)), 10)).toYield(0, 1, 2, 0, 1, 2, 0, 1, 2, 0)
  });

  it("filter", () => {
    const isEven = (i) => i % 2 === 0;
    expect(filter(range(6), isEven)).toYield(0, 2, 4);
    expect(filter([0, 1, 0, 2, 0])).toYield(1, 2);
    expect(filter([0, 1, 0, 2, 0], Boolean)).toYield(1, 2);
    expect(slice(filter(count(), isEven), 4)).toYield(0, 2, 4, 6);
    expect(() => filter()).toThrowError(Error, "undefined is not iterable");
    expect(() => filter([], null)).toThrowError(Error, "predicate must be a function");
  });

  it("filterFalse", () => {
    const isEven = (i) => i % 2 === 0;
    expect(filterFalse(range(6), isEven)).toYield(1, 3, 5);
    expect(filterFalse([0, 1, 0, 2, 0])).toYield(0, 0, 0);
    expect(filterFalse([0, 1, 0, 2, 0], Boolean)).toYield(0, 0, 0);
    expect(slice(filterFalse(count(), isEven), 4)).toYield(1, 3, 5, 7);
    expect(() => filterFalse()).toThrowError(Error, "undefined is not iterable");
    expect(() => filterFalse([], null)).toThrowError(Error, "predicate must be a function");
  });

  describe("groupBy", () => {
    const getKeys = (iterable) => {
      const keys = [];
      for (const [k] of iterable) keys.push(k);
      return keys;
    };

    const s = [[0, 10, 20], [0, 11,21], [0,12,21], [1,13,21], [1,14,22],
      [2,15,22], [3,16,23], [3,17,23]];

    it("accepts arguments correctly", () => {
      expect(groupBy([])).toYield();
      expect(groupBy([], () => {})).toYield();
      expect(() => groupBy("abc", []).next()).toThrowError(Error, "keyFn must be a function");
      expect(() => groupBy(null)).toThrowError(Error, "null is not iterable");
    });

    it("works with normal input", () => {
      const dup = [];

      for (const [k, g] of groupBy(s, (r) => r[0])) {
        for (const elem of g) {
          expect(k).toEqual(elem[0]);
          dup.push(elem);
        }
      }

      expect(s).toEqual(dup);
    });

    it("works with nested inputs", () => {
      const dup = [];

      for (const [k, g] of groupBy(s, (r) => r[0])) {
        for (const [ik, ig] of groupBy(g, (r) => r[2])) {
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
      const keys = getKeys(groupBy(s, (r) => r[0]));
      const expectedKeys = new Set();
      for (const r of s) expectedKeys.add(r[0]);

      expect(keys).toEqual(Array.from(expectedKeys));
      expect(keys.length).toEqual(expectedKeys.size);
    });

    it("works with different use cases", () => {
      const t = "abracadabra";
      expect(getKeys(groupBy(sorted(t)))).toEqual(["a", "b", "c", "d", "r"]);
      const keys = [];
      for (const [k, g] of groupBy(sorted(t))) {
        if (g.next() && !g.next().done) keys.push(k);
      }
      expect(keys).toEqual(["a", "b", "r"]);

      const lengths = [];
      for (const [k, g] of groupBy(sorted(s))) {
        lengths.push([Array.from(g).length, k]);
      }
      expect(lengths).toEqual[[[5, "a"], [2, "b"], [1, "c"], [1, "d"], [2, "r"]]];
    });
  });

  it("map", () => {
    expect(map(range(3), range(1, 7), Math.pow)).toYield(0, 1, 8);
    expect(map("abc", range(5), (...args) => args)).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(map("abc", count(), (...args) => args)).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(slice(map("abc", count(), (...args) => args), 2)).toYield(["a", 0], ["b", 1]);
    expect(map([], Math.pow)).toYield();

    expect(() => map(Math.pow)).toThrowError(Error, "at least one iterable must be provided");
    expect(() => map([1], [2], null)).toThrowError(Error, "fn must be a function");
    expect(() => map(Math.pow)).toThrowError(Error, "at least one iterable must be provided");
  });

  it("mapApply", () => {
    expect(mapApply(zip(range(3), range(1, 7)), Math.pow)).toYield(0, 1, 8);
    expect(slice(mapApply(zip(count(), count(1)), Math.pow), 3)).toYield(0, 1, 8);
    expect(mapApply([], Math.pow)).toYield();
    expect(mapApply([range(4, 6)], Math.pow)).toYield(Math.pow(4, 5));
    expect(() => mapApply([null], Math.pow).next()).toThrowError(Error, "null is not iterable");
    expect(() => mapApply(Math.pow)).toThrowError(Error, "at least one iterable must be provided");
    expect(() => mapApply([[4, 5]], 10).next()).toThrowError(Error, "fn must be a function");
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

  it("repeat", () => {
    expect(repeat("a", 3)).toYield("a", "a", "a");
    expect(zip(range(3), repeat("a"))).toYield([0, "a"], [1, "a"], [2, "a"]);
    expect(slice(repeat("a"), 3)).toYield("a", "a", "a");
    expect(repeat("a", 0)).toYield();
    expect(repeat("a", -3)).toYield();

    expect(slice(repeat(), 3)).toYield(undefined, undefined, undefined);
    expect(() => repeat(null, "a")).toThrowError(Error, "times must be a number");
  });

  describe("slice", () => {
    it("should agree with range", () => {
      expect(slice(range(100), 10, 20, 3)).toYieldFromIterator(range(10, 20, 3));
      expect(slice(range(100), 10, 3, 20)).toYieldFromIterator(range(10, 3, 20));
      expect(slice(range(100), 10, 20)).toYieldFromIterator(range(10, 20));
      expect(slice(range(100), 10, 3)).toYieldFromIterator(range(10, 3));
      expect(slice(range(100), 20)).toYieldFromIterator(range(20));
    });

    it("stops when seqn is exhausted", () => {
      expect(slice(range(100), 10, 110, 3)).toYieldFromIterator(range(10, 100, 3));
      expect(slice(range(100), 10, 110)).toYieldFromIterator(range(10, 100));
      expect(slice(range(100), 110)).toYieldFromIterator(range(100));
    });

    it("works when stop=null", () => {
      expect(slice(range(10))).toYieldFromIterator(range(10));
      expect(slice(range(10), 2, Infinity)).toYieldFromIterator(range(2, 10));
      expect(slice(range(10), 1, Infinity, 2)).toYieldFromIterator(range(1, 10, 2));
    });

    it("consumes the right number of items", () => {
      const iterator = range(10);
      expect(slice(iterator, 3)).toYieldFromIterator(range(3));
      expect(iterator).toYieldFromIterator(range(3, 10));
    });

    it("throws errors when passing invalid arguments", () => {
      const ra = range(10);
      expect(() => slice(ra, -5, 10, 1)).toThrowError(Error, "start must be positive");
      expect(() => slice(ra, 1, -5, -1)).toThrowError(Error, "stop must be positive");
      expect(() => slice(ra, 1, 10, -1)).toThrowError(Error, "step must be positive");
      expect(() => slice(ra, 1, 10, 0)).toThrowError(Error, "step must be different than zero");
      expect(() => slice(ra, "a")).toThrowError(Error, "stop must be a number");
      expect(() => slice(ra, "a", 1)).toThrowError(Error, "start must be a number");
      expect(() => slice(ra, 1, "a")).toThrowError(Error, "stop must be a number");
      expect(() => slice(ra, "a", 1, 1)).toThrowError(Error, "start must be a number");
      expect(() => slice(ra, 1, "a", 1)).toThrowError(Error, "stop must be a number");

      expect(() => slice(ra, 0.5)).toThrowError(Error, "stop must be an integer");
      expect(() => slice(ra, 0.5, 1)).toThrowError(Error, "start must be an integer");
      expect(() => slice(ra, 1, 0.5)).toThrowError(Error, "stop must be an integer");
      expect(() => slice(ra, 0.5, 1, 1)).toThrowError(Error, "start must be an integer");
      expect(() => slice(ra, 1, 0.5, 1)).toThrowError(Error, "stop must be an integer");
    });

    it("is in a predictable state", () => {
      const c = count();
      expect(slice(c, 1, 3, 50)).toYield(1);
      expect(c.next().value).toBe(3);
    });
  });

  it("zip", () => {
    expect(zip("abc", count())).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc", range(6))).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abcdef", range(3))).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(slice(zip("abcdef", count()), 3)).toYield(["a", 0], ["b", 1], ["c", 2]);
    expect(zip("abc")).toYield(["a"], ["b"], ["c"]);
    expect(zip("abc", "def", "ghi")).toYield(["a", "d", "g"], ["b", "e", "h"], ["c", "f", "i"]);

    expect(() => zip(3).next()).toThrowError(Error, "3 is not iterable");
    expect(() => zip(range(3), 3).next()).toThrowError(Error, "3 is not iterable");
    expect(() => zip()).toThrowError(Error, "at least one iterable must be provided");

    // Array reusability
    const it = zip("abc");
    expect(it.next().value).toBe(it.next().value);
  });

  it("zipLongest", () => {
    const testSimpleCase = (...args) => {
      args = args.map((a) => Array.from(a));
      let target = [];
      for (const i of range(Math.max(...args.map((a) => a.length)))) {
        const t = [];
        for (const arg of args) t.push(i < arg.length ? arg[i] : undefined);
        target.push(t);
      }
      expect(zipLongest(...args)).toYieldFromIterator(target[Symbol.iterator]());
      target = target.map((t) => t.map((e) => e === undefined ? "x" : e));
      expect(zipLongest(...args, { fillValue: "x" })).toYieldFromIterator(target[Symbol.iterator]());
    };

    testSimpleCase('abc', range(6));
    testSimpleCase(range(6), 'abc');
    testSimpleCase(range(1000), range(2000, 2100), range(3000, 3050));
    testSimpleCase(range(1000), range(0), range(3000, 3050), range(1200), range(1500));
    testSimpleCase(range(1000), range(0), range(3000, 3050), range(1200), range(1500), range(0));

    expect(slice(zipLongest("abcdef", count()), 3)).toYield(["a", 0], ["b", 1], ["c", 2]);

    expect(() => zipLongest()).toThrowError(Error, "at least one iterable must be provided");
    expect(zipLongest([])).toYield();
    expect(zipLongest("abcdef")).toYieldFromIterator(zip("abcdef"));

    expect(zipLongest("abc", "defg", {})).toYield(["a", "d"], ["b", "e"], ["c", "f"], [undefined, "g"]);

    expect(zipLongest("abc", "def")).toYieldFromIterator(zip("abc", "def"));
  });

});
