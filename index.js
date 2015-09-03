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

const VALUE = (value) => ({ done: false, value });

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

const makeIterator = (next) => ({
  next,
  [Symbol.iterator]() {
    return this;
  },
});

const emptyIterator = makeIterator(() => DONE);

const sliceArgs = (start, stop, step) => {

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

  return [start, stop, step];
};

export const range = (start, stop, step) => {
  assertType(start, "number", "start");

  [start, stop, step] = sliceArgs(start, stop, step);

  let i = start;

  return makeIterator(() => {
    if (step > 0 ? i >= stop : i <= stop) return DONE;
    const result = i;
    i += step;
    return VALUE(result);
  });
};

export const accumulate = (iterable, fn=add) => {
  const iterator = iter(iterable);
  let acc;
  let first = true;

  return makeIterator(() => {
    const item = iterator.next();
    if (item.done) return item;

    if (first) {
      first = false;
      acc = item.value;
    }
    else {
      acc = fn(acc, item.value);
    }

    return VALUE(acc);
  });
};

export const chain = (...iterables) => chainFromIterable(iterables);

export const chainFromIterable = (iterable) => {
  const iterator = iter(iterable);
  let currentIterator;

  return makeIterator(() => {
    while (true) {
      if (currentIterator) {
        const item = currentIterator.next();
        // If the current iterator isn't exhausted, return the item
        if (!item.done) return item;
      }

      // Get next iterator
      const currentIterableItem = iterator.next();
      if (currentIterableItem.done) return DONE;
      currentIterator = iter(currentIterableItem.value);
    }
  });
};

export const islice = (iterable, start, stop, step) => {

  [start, stop, step] = sliceArgs(start, stop, step);

  assertPositive(start, "start");
  assertPositive(stop, "stop");
  assertPositive(step, "step");
  assertInteger(start, "start");
  assertInteger(stop, "stop");
  assertInteger(step, "step");

  const iterator = iter(iterable);
  let i = 0;
  let nexti = start;

  return makeIterator(() => {
    while (true) {
      if (i >= stop) return DONE;

      const item = iterator.next();
      if (item.done) return DONE;

      i += 1;

      if (i > nexti) {
        nexti += step;
        return item;
      }
    }
  });
};

export const zip = (...iterables) => {
  if (!iterables.length) return emptyIterator;
  const iterators = iterables.map(iter);
  const value = [];
  return makeIterator(() => {
    const l = iterators.length;
    let i = 0;
    for (; i < l; i++) {
      const item = iterators[i].next();
      if (item.done) return DONE;
      value[i] = item.value;
    }
    return VALUE(value);
  });
};

export const count = (start=0, step=1) => {
  assertType(start, "number", "start");
  assertType(step, "number", "step");
  assertNonZero(step, "step");
  let i = start;

  return makeIterator(() => {
    const result = VALUE(i);
    i += step;
    return result;
  });
};

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
