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

export const range = (start, stop, step=1) => {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }

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

export const chain = (iterable, otherIterable=emptyIterator) => {
  const iterator = iter(iterable);
  const otherIterator = iter(otherIterable);
  let firstIsExhausted = false;

  return makeIterator(() => {
    let item;
    if (!firstIsExhausted) {
      item = iterator.next();
      if (item.done) {
        firstIsExhausted = true;
        item = otherIterator.next();
      }
    }
    else {
      item = otherIterator.next();
    }

    return item;
  });
};

export const take = (iterable, n) => {
  const iterator = iter(iterable);
  let i = 0;

  return makeIterator(() => {
    if (i >= n) return DONE;
    i += 1;
    return iterator.next();
  });
};

// TODO
export const chain_from_iterable = () => emptyIterator;

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
