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


const DONE = Object.freeze({
  done: true,
  value: undefined,
});

const add = (a, b) => a + b;

const iter = (value) => {
  if (value === null || value === undefined || typeof value[Symbol.iterator] !== "function") {
    throw new TypeError(`${value} is not iterable`);
  }
  const result = value[Symbol.iterator]();
  if (result === null || value === undefined || typeof result.next !== "function") {
    throw new TypeError(`${result} is not an iterator`);
  }
  return result;
};

const factory = (Cls) => (a, b, c, d, e, f) => new Cls(a, b, c, d, e, f);

class Iterator {

  constructor() {
    this._item = undefined;
    this._done = false;
  }

  _yieldValue(value) {
    if (!this._done) throw new Error("Called yieldValue twice");
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

class IsliceIterator extends Iterator {

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

class CountIterator extends Iterator {

  constructor(start=0, step=1) {
    super();
    assertType(start, "number", "start");
    assertType(step, "number", "step");
    assertNonZero(step, "step");
    this._i = start;
    this._step = step;
  }

  _next() {
    this._yieldValue(this._i);
    this._i += this._step;
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
      let i = 0;
      for (; i < l; i++) {
        const item = this._iterators[i].next();
        if (item.done) return;
        this._value[i] = item.value;
      }
      this._yieldValue(this._value);
    }
  }

}

export const range = factory(RangeIterator);
export const accumulate = factory(AccumulateIterator);
export const islice = factory(IsliceIterator);
export const chain = (...iterables) => new ChainIterator(iterables);
export const chainFromIterable = factory(ChainIterator);
export const count = factory(CountIterator);
export const zip = (...iterables) => new ZipIterator(iterables);


// DRAFT

// const identity = (x) => x;

// export const some = (iterable, fn) => {
//   for (const value of iterable) if (fn(value)) return true;
//   return false;
// };

// export const all = (iterable, fn) => {
//   for (const value of iterable) if (!fn(value)) return false;
//   return true;
// };

// export const groupBy = (keyfn=identity) => {
//   const iterator = iter(this);
//   let currentItem;
//   let targetKey, currentKey;
//   targetKey = currentKey = {};

//   return makeIterator(() => {

//     if (currentItem && currentItem.done) return DONE;

//     while (currentKey === targetKey) {
//       currentItem = iterator.next();
//       if (currentItem.done) return DONE;
//       currentKey = keyfn(currentItem.value);
//     }

//     targetKey = currentKey;

//     return VALUE([

//       currentKey,

//       makeIterator(() => {
//         if (currentItem.done || currentKey !== targetKey) return DONE;
//         const result = currentItem;
//         currentItem = iterator.next();
//         if (!currentItem.done) {
//           currentKey = keyfn(currentItem.value);
//         }
//         return result;
//       }),

//     ]);
//   });
// }

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
