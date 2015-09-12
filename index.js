const assert = (test, message) => {
  if (!test) throw new Error(message);
};
const assertType = (value, type, subject) => {
  assert(typeof value === type, `${subject} must be a ${type}`);
};

const assertInteger = (value, subject) => {
  assert(Math.floor(value) === value, `${subject} must be an integer`);
};

const assertPositive = (value, subject) => {
  assert(value >= 0, `${subject} must be positive`);
};

const assertNonZero = (value, subject) => {
  assert(value !== 0, `${subject} must be different than zero`);
};

const assertIterable = (value) => {
  assert(value !== null && value !== undefined && typeof value[Symbol.iterator] === "function",
         `${value} is not iterable`);
};

const assertIterator = (value) => {
  assert(value !== null && value !== undefined && typeof value.next === "function",
         `${value} is not an iterator`);
};


const DONE = Object.freeze({
  done: true,
  value: undefined,
});

const add = (a, b) => a + b;
const identity = (i) => i;

const iter = (value) => {
  assertIterable(value);
  const result = value[Symbol.iterator]();
  assertIterator(result);

  return result;
};

const factory = (Cls) => (a, b, c, d, e, f) => new Cls(a, b, c, d, e, f);

class Iterator {

  constructor() {
    this._reset();
  }

  _reset() {
    this._item = undefined;
    this._done = false;
  }

  _finish() {
    this._item = DONE;
    this._done = true;
  }

  _yieldValue(value) {
    assert(this._done, "Called yieldValue twice");
    this._done = false;
    if (this._item) this._item.value = value;
    else this._item = { value, done: false };
  }

  _sliceArgs(start, stop, step) {
    if (stop === undefined) {
      stop = start;
      start = 0;
    }

    if (start === undefined) start = 0;
    if (stop === undefined) stop = Infinity;
    if (step === undefined) step = 1;

    assertType(start, "number", "start");
    assertType(stop, "number", "stop");
    assertType(step, "number", "step");
    assertNonZero(step, "step");

    this._start = start;
    this._stop = stop;
    this._step = step;
  }

  next() {
    if (!this._done) {
      this._done = true;
      this._next();
      if (this._done) this._finish();
    }
    return this._item;
  }

  [Symbol.iterator]() {
    return this;
  }

}

class CombinatoryIterator extends Iterator {

  constructor(repeat) {
    super();
    assertType(repeat, "number", "repeat");
    assertPositive(repeat, "repeat");
    assertInteger(repeat, "repeat");
    this._repeat = repeat;
    this._indices = [];
    this._value = [];
    this._first = true;
  }

  _next() {
    if (this._first) {
      this._first = false;
      this._initIndices();
      if (this._maxIndice === undefined) this._maxIndice = this._indices.length;
    }
    else {
      let indice;
      for (let i = this._maxIndice - 1; i >= 0; i -= 1) {
        if (this._indices[i] !== this._nextLimit(i)) {
          indice = i;
          break;
        }
      }
      if (indice === undefined) return;

      this._nextIndices(indice);
    }

    for (let i = 0; i < this._maxIndice; i += 1) {
      this._value[i] = this._pool ? this._pool[this._indices[i]] : this._pools[i][this._indices[i]];
    }
    this._yieldValue(this._value);
  }

}

class AccumulateIterator extends Iterator {

  constructor(iterable, fn=add) {
    super();
    this._iterator = iter(iterable);
    this._acc = undefined;
    this._first = true;
    this._fn = fn;
  }

  _next() {
    const item = this._iterator.next();
    if (!item.done) {
      if (this._first) {
        this._first = false;
        this._acc = item.value;
      }
      else {
        this._acc = this._fn(this._acc, item.value);
      }

      this._yieldValue(this._acc);
    }
  }

}

class ChainIterator extends Iterator {

  constructor(iterables) {
    super();
    this._iterator = iter(iterables);
    this._currentIterator = undefined;
  }

  _next() {
    while (true) {
      if (this._currentIterator) {
        const item = this._currentIterator.next();
        // If the current iterator isn't exhausted, return the item
        if (!item.done) return this._yieldValue(item.value);
      }

      // Get next iterator
      const currentIterableItem = this._iterator.next();
      if (currentIterableItem.done) return;
      this._currentIterator = iter(currentIterableItem.value);
    }
  }

}

class CombinationsIterator extends CombinatoryIterator {

  constructor(iterable, repeat) {
    super(repeat);
    assertIterable(iterable);
    this._pool = Array.from(iterable);
    if (this._repeat > this._pool.length) this._finish();
  }

  _initIndices() {
    for (let i = 0; i < this._repeat; i += 1) this._indices[i] = i;
  }

  _nextLimit(indice) {
    return indice + this._pool.length - this._indices.length;
  }

  _nextIndices(indice) {
    this._indices[indice] += 1;
    for (let i = indice + 1; i < this._indices.length; i += 1) this._indices[i] = this._indices[i - 1] + 1;
  }

}

class CombinationsWithReplacementIterator extends CombinatoryIterator {

  constructor(iterable, repeat) {
    super(repeat);
    assertIterable(iterable);
    this._pool = Array.from(iterable);
    if (this._pool.length === 0 && this._repeat > 0) this._finish();
  }

  _initIndices() {
    for (let i = 0; i < this._repeat; i += 1) this._indices[i] = 0;
  }

  _nextLimit() {
    return this._pool.length - 1;
  }

  _nextIndices(indice) {
    const replace = this._indices[indice] + 1;
    for (let i = indice; i < this._repeat; i += 1) this._indices[i] = replace;
  }

}

class CompressIterator extends Iterator {

  constructor(source, selectors) {
    super();
    this._source = iter(source);
    this._selectors = iter(selectors);
  }

  _next() {
    while (true) {
      const sourceItem = this._source.next();
      const selectorItem = this._selectors.next();

      if (sourceItem.done || selectorItem.done) return;

      if (selectorItem.value) return this._yieldValue(sourceItem.value);
    }
  }

}

class CycleIterator extends Iterator {

  constructor(iterable) {
    super();
    this._iterator = iter(iterable);
    this._saved = [];
    this._i = 0;
    this._exhausted = false;
  }

  _next() {

    if (!this._exhausted) {
      const item = this._iterator.next();
      if (item.done) {
        if (this._saved.length) this._exhausted = true;
        else return;
      }
      else {
        this._saved.push(item.value);
        this._yieldValue(item.value);
        return;
      }
    }

    this._yieldValue(this._saved[this._i]);
    this._i = (this._i + 1) % this._saved.length;

  }

}

class FilterIterator extends Iterator {

  constructor(iterable, predicate=identity, { exclude=false, finishOnFalse=false }={}) {
    super();
    assertType(predicate, "function", "predicate");
    assertType(exclude, "boolean", "options.exclude");
    this._iterator = iter(iterable);
    this._predicate = predicate;
    this._exclude = exclude;
    this._finishOnFalse = finishOnFalse;
    this._finished = false;
  }

  _next() {
    while (!this._finished) {
      const { done, value } = this._iterator.next();
      if (done) return;

      const predicateResult = Boolean(this._predicate(value));

      this._finished = this._finishOnFalse && !predicateResult;

      if (predicateResult !== this._exclude) return this._yieldValue(value);
    }

    if (this._exclude) {
      const { done, value } = this._iterator.next();
      if (!done) this._yieldValue(value);
    }
  }

}

const GROUPBY_NO_KEY = {};

class GroupByIterator extends Iterator {

  constructor(iterable, keyFn=identity) {
    super();
    assertType(keyFn, "function", "keyFn");
    this._iterator = iter(iterable);
    this._keyFn = keyFn;
    this._currentItem = undefined;
    this._targetKey = this._currentKey = GROUPBY_NO_KEY;
    this._inner = new GroupByInnerIterator(this);
    this._value = [null, this._inner];
  }

  _next() {
    if (this._currentIterator && this._currentItem.done) return;

    while (this._currentKey === this._targetKey) {
      this._currentItem = this._iterator.next();
      if (this._currentItem.done) return;
      this._currentKey = this._keyFn(this._currentItem.value);
    }

    this._targetKey = this._currentKey;

    this._value[0] = this._currentKey;
    this._inner._reset();

    this._yieldValue(this._value);
  }

}

class GroupByInnerIterator extends Iterator {

  constructor(outer) {
    super();
    this._outer = outer;
  }

  _next() {
    const outer = this._outer;
    if (outer._currentItem.done || outer._currentKey !== outer._targetKey) return;
    this._yieldValue(outer._currentItem.value);
    outer._currentItem = outer._iterator.next();
    if (!outer._currentItem.done) outer._currentKey = outer._keyFn(outer._currentItem.value);
  }

}

class MapIterator extends Iterator {

  constructor(iterables, { fn, apply=false, longest=false, fillValue }={}) {
    super();
    if (fn !== undefined) assertType(fn, "function", "fn");
    assert(iterables.length, "at least one iterable must be provided");
    this._iterators = iterables.map(iter);
    this._fn = fn;
    this._apply = apply;
    this._longest = longest;
    this._fillValue = fillValue;
    this._args = [];
  }

  _next() {
    this._args.length = 0;
    let allExhausted = true;
    for (const iterator of this._iterators) {
      let { done, value } = iterator.next();  // eslint-disable-line prefer-const

      if (done) {
        if (!this._longest) return;
        value = this._fillValue;
      }
      else {
        allExhausted = false;
      }

      if (this._apply) {
        assertIterable(value);
        for (const v of value) {
          this._args.push(v);
        }
      }
      else {
        this._args.push(value);
      }
    }

    if (!allExhausted) {
      this._yieldValue(this._fn ? this._fn.apply(null, this._args) : this._args);
    }
  }

}

class PermutationsIterator extends CombinatoryIterator {

  constructor(iterable, repeat) {
    assertIterable(iterable);
    const pool = Array.from(iterable);
    super(repeat === undefined ? pool.length : repeat);
    this._pool = pool;
    if (this._repeat > pool.length) this._finish();
    this._maxIndice = this._repeat;
  }

  _initIndices() {
    const n = this._pool.length;
    for (let i = 0; i < n; i += 1) this._indices[i] = i;
    this._cycles = [];
    for (let i = n; i > n - this._repeat; i -= 1) this._cycles.push(i);
  }

  _nextLimit(indice) {
    const cycles = this._cycles;
    const indices = this._indices;
    cycles[indice] -= 1;
    if (cycles[indice] === 0) {
      const result = indices[indice];
      for (let i = indice; i < indices.length - 1; i += 1) indices[i] = indices[i + 1];
      indices[indices.length - 1] = result;
      cycles[indice] = this._pool.length - indice;
      return result;
    }
  }

  _nextIndices(indice) {
    const j = this._cycles[indice];
    const n = this._indices.length;
    const tmp = this._indices[indice];
    this._indices[indice] = this._indices[n - j];
    this._indices[n - j] = tmp;
  }

}

class ProductIterator extends CombinatoryIterator {

  constructor(iterables, repeat=1) {
    super(repeat);

    for (const iterable of iterables) assertIterable(iterable);

    if (iterables.length === 0 || repeat === 0) {
      this._finish();
      return;
    }

    const pools = iterables.map((iterable) => Array.from(iterable));

    for (const pool of pools) {
      if (pool.length === 0) {
        this._finish();
        return;
      }
    }

    this._pools = [];
    for (let i = 0; i < repeat; i += 1) this._pools.push.apply(this._pools, pools);
  }

  _initIndices() {
    for (let i = 0; i < this._pools.length; i += 1) this._indices.push(0);
  }

  _nextLimit(i) {
    return this._pools[i].length - 1;
  }

  _nextIndices(indice) {
    this._indices[indice] += 1;
    for (let j = indice + 1; j < this._pools.length; j += 1) this._indices[j] = 0;
  }

}

class RangeIterator extends Iterator {

  constructor(start, stop, step) {
    super();
    assertType(start, "number", "start");
    this._sliceArgs(start, stop, step);
    this._i = this._start;
  }

  _next() {
    if (this._step > 0 ? this._i < this._stop : this._i > this._stop) {
      this._yieldValue(this._i);
      this._i += this._step;
    }
  }

}

class RepeatIterator extends Iterator {

  constructor(object, times=Infinity) {
    super();
    assertType(times, "number", "times");
    this._object = object;
    this._times = times;
  }

  _next() {
    if (this._times > 0) {
      this._yieldValue(this._object);
      this._times -= 1;
    }
  }

}

class SliceIterator extends Iterator {

  constructor(iterable, start, stop, step) {
    super();

    this._sliceArgs(start, stop, step);
    assertPositive(this._start, "start");
    assertPositive(this._stop, "stop");
    assertPositive(this._step, "step");
    assertInteger(this._start, "start");
    assertInteger(this._stop, "stop");
    assertInteger(this._step, "step");

    this._iterator = iter(iterable);
    this._i = 0;
    this._nexti = this._start;
  }

  _next() {
    while (true) {
      if (this._i >= this._stop) return;

      const item = this._iterator.next();
      if (item.done) return;

      this._i += 1;

      if (this._i > this._nexti) {
        this._nexti += this._step;
        return this._yieldValue(item.value);
      }
    }
  }

}

class TeeIterator extends Iterator {

  constructor(iterator, pool) {
    super();
    this._pool = pool;
    pool.push(this);
    this._iterator = iterator;
    this._buffer = [];
    this._iteratorDone = false;
  }

  _next() {
    if (this._buffer.length) return this._yieldValue(this._buffer.shift());
    if (this._iteratorDone) return;

    const { done, value } = this._iterator.next();
    if (done) {
      for (const other of this._pool) if (other !== this) other._iteratorDone = true;
    }
    else {
      this._yieldValue(value);
      for (const other of this._pool) if (other !== this) other._buffer.push(value);
    }
  }

}

export const accumulate = factory(AccumulateIterator);

export const chain = (...iterables) => new ChainIterator(iterables);

export const chainFromIterable = factory(ChainIterator);

export const combinations = (iterable, r) => new CombinationsIterator(iterable, r);

export const combinationsWithReplacement = (iterable, r) =>
  new CombinationsWithReplacementIterator(iterable, r);

export const compress = factory(CompressIterator);

export const count = (start=0, step=1) => new RangeIterator(start, Infinity, step);

export const cycle = factory(CycleIterator);

export const dropWhile = (iterable, predicate) =>
  new FilterIterator(iterable, predicate, { exclude: true, finishOnFalse: true });

export const filter = (iterable, predicate) =>
  new FilterIterator(iterable, predicate);

export const filterFalse = (iterable, predicate) =>
  new FilterIterator(iterable, predicate, { exclude: true });

export const groupBy = factory(GroupByIterator);

export const map = (...args) => {
  const fn = args.pop();
  assertType(fn, "function", "fn");
  return new MapIterator(args, { fn });
};

export const mapApply = (...args) => {
  const fn = args.pop();
  assertType(fn, "function", "fn");
  return new MapIterator(args, { fn, apply: true });
};

export const permutations = (iterable, repeat) => new PermutationsIterator(iterable, repeat);

export const product = (...args) => {
  const r = typeof args[args.length - 1] === "number" ? args.pop() : 1;
  return new ProductIterator(args, r);
}

export const range = factory(RangeIterator);

export const repeat = factory(RepeatIterator);

export const slice = factory(SliceIterator);

export const takeWhile = (iterable, predicate) =>
  new FilterIterator(iterable, predicate, { finishOnFalse: true });

export const tee = (iterable, n=2) => {
  assertType(n, "number", "n");
  assertPositive(n, "n");

  let iterator = iter(iterable);
  let pool;
  const result = [];

  if (n === 0) return result;

  if (iterator instanceof TeeIterator) {
    result.push(iterator);
    pool = iterator._pool;
    iterator = iterator._iterator;
    n -= 1;
  } else {
    pool = [];
  }

  for (let i = 0; i < n; i++) result.push(new TeeIterator(iterator, pool));

  return result;
};

export const zip = (...iterables) => new MapIterator(iterables);

export const zipLongest = (...args) => {
  const fillValue = args.length && typeof args[args.length - 1][Symbol.iterator] !== "function" ?
    args.pop().fillValue :
    undefined;
  return new MapIterator(args, { longest: true, fillValue });
}
