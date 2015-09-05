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
      if (this._done) this._item = DONE;
    }
    return this._item;
  }

  [Symbol.iterator]() {
    return this;
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

class CombinationsIterator extends Iterator {

  constructor(iterable, r, withReplacement=false) {
    super();
    assertType(r, "number", "r");
    assertPositive(r, "r");
    assertInteger(r, "r");
    assertIterable(iterable);
    this._withReplacement = withReplacement;
    this._pool = Array.from(iterable);
    this._value = [];
    this._indices = [];
    for (let i = 0; i < r; i += 1) this._indices[i] = withReplacement ? 0 : i;
    this._first = true;
  }

  _next() {
    const r = this._indices.length;
    const n = this._pool.length;
    const indices = this._indices;

    if ((!this._withReplacement || n === 0) && r > n) return;

    if (this._first) {
      this._first = false;
    }
    else {
      let indice;
      for (let i = r - 1; i >= 0; i -= 1) {
        const limit = this._withReplacement ? n - 1 : i + n - r;
        if (indices[i] !== limit) {
          indice = i;
          break;
        }
      }
      if (indice === undefined) return;

      if (this._withReplacement) {
        const replace = indices[indice] + 1;
        for (let i = indice; i < r; i += 1) indices[i] = replace;
      }
      else {
        indices[indice] += 1;
        for (let i = indice + 1; i < r; i += 1) indices[i] = indices[i - 1] + 1;
      }
    }

    for (let i = 0; i < r; i += 1) this._value[i] = this._pool[indices[i]];
    this._yieldValue(this._value);
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

class ZipIterator extends Iterator {

  constructor(iterables) {
    super();
    this._iterators = iterables.map(iter);
    this._value = [];
  }

  _next() {
    const l = this._iterators.length;
    if (l) {
      for (let i = 0; i < l; i++) {
        const item = this._iterators[i].next();
        if (item.done) return;
        this._value[i] = item.value;
      }
      this._yieldValue(this._value);
    }
  }

}

export const accumulate        = factory(AccumulateIterator);
export const chain             = (...iterables) => new ChainIterator(iterables);
export const chainFromIterable = factory(ChainIterator);
export const combinations      = (iterable, r) => new CombinationsIterator(iterable, r);
export const combinationsWithReplacement
                               = (iterable, r) => new CombinationsIterator(iterable, r, true);
export const count             = (start=0, step=1) => new RangeIterator(start, Infinity, step);
export const cycle             = factory(CycleIterator);
export const groupBy           = factory(GroupByIterator);
export const slice             = factory(SliceIterator);
export const range             = factory(RangeIterator);
export const repeat            = factory(RepeatIterator);
export const zip               = (...iterables) => new ZipIterator(iterables);


// DRAFT

// export const some = (iterable, fn) => {
//   for (const value of iterable) if (fn(value)) return true;
//   return false;
// };

// export const all = (iterable, fn) => {
//   for (const value of iterable) if (!fn(value)) return false;
//   return true;
// };

// export const map = (iterable, fn=identity) => {
//   const iterator = iter(iterable);
//   return makeIterator(() => {
//     const item = iterator.next();
//     return item.done ? DONE : VALUE(fn(item.value));
//   });
// };

// export const collect = Array.from;

// export const filter = (iterable, fn=identity) => {
//   const iterator = iter(iterable);
//   return makeIterator(() => {
//     let item;

//     do {
//       item = iterator.next();
//     } while (!item.done && !fn(item.value));

//     return item;
//   });
// };

// export const apply = (fn=identity) => {
//   const iterator = iter(this);
//   return makeIterator(() => {
//     const item = iterator.next();
//     return item.done ? DONE : VALUE(fn(...item.value));
//   });
// };
