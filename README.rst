============
itertools.js
============

Iterator tools inspired from the python standard library.

Functions
=========

:code:`accumulate(iterable, func=(a, b) => a + b)`
  Make an iterator that returns accumulated sums. If the optional :code:`func` argument is supplied,
  it should be a function of two arguments and it will be used instead of addition.

  .. code:: javascript

    accumulate([1, 2, 3, 4, 5])                   // 1 3 6 10 15
    accumulate([1, 2, 3, 4, 5], (a, b) => a * b)  // 1 2 6 24 120

:code:`chain(...iterables)`
  Make an iterator that returns elements from the first iterable until it is exhausted, then
  proceeds to the next iterable, until all of the iterables are exhausted.

  .. code:: javascript

    chain('ABC', 'DEF')  // A B C D E F

:code:`chainFromIterable(iterable)`
  Alternate constructor for :code:`chain()`. Gets chained inputs from a single iterable argument
  that is evaluated lazily.

  .. code:: javascript

    chainFromIterable(['ABC', 'DEF'])  // A B C D E F

:code:`combinations(iterable, r)`
  Return :code:`r` length subsequences of elements from the input :code:`iterable`.

  .. code:: javascript

    combinations('ABCD', 2)    // AB AC AD BC BD CD
    combinations(range(4), 3)  // 012 013 023 123

:code:`combinationsWithReplacement(iterable, r)`
  Return :code:`r` length subsequences of elements from the input :code:`iterable` allowing
  individual elements to be repeated more than once.

  .. code:: javascript

    combinationsWithReplacement('ABC', 2)  // AA AB AC BB BC CC

:code:`compress(data, selectors)`
  Make an iterator that filters elements from :code:`data` returning only those that have a
  corresponding element in :code:`selectors` that evaluates to :code:`true`. Stops when either the
  data or selectors iterables has been exhausted.

  .. code:: javascript

    compress('ABCDEF', [1, 0, 1, 0, 1, 1])  // A C E F

:code:`count(start=0, step=1)`
  Make an iterator that returns evenly spaced values starting with number :code:`start`.

  .. code:: javascript

    count(10)        // 10 11 12 13 14 ...
    count(2.5, 0.5)  // 2.5 3.0 3.5 ...

:code:`cycle(iterable)`
  Make an iterator returning elements from the :code:`iterable` and saving a copy of each.

  .. code:: javascript

      cycle('ABCD')  // A B C D A B C D A B C D ...

:code:`dropWhile(iterable, predicate=(i) => i)`
  Make an iterator that drops elements from the :code:`iterable` as long as the :code:`predicate` is
  true; afterwards, returns every element.

  .. code:: javascript

    dropWhile([1, 4, 6, 4, 1], (x) => x < 5)  // 6 4 1


:code:`filter(iterable, predicate=(i) => i)`
  Make an iterator that filters elements from :code:`iterable` returning only those for which the
  predicate is true. If :code:`predicate` isn't defined, return the items that are true.

  .. code:: javascript

    filterFalse(range(10), (x) => x % 2)  // 1 3 5 7 9


:code:`filterFalse(iterable, predicate=(i) => i)`
  Make an iterator that filters elements from :code:`iterable` returning only those for which the
  predicate is false. If :code:`predicate` isn't defined, return the items that are false.

  .. code:: javascript

    filterFalse(range(10), (x) => x % 2)  // 0 2 4 6 8


:code:`groupBy(iterable, key=(i) => i)`
  Make an iterator that returns consecutive keys and groups from the :code:`iterable`. The
  :code:`key` is a function computing a key value for each element. If not specified, :code:`key`
  defaults to an identity function and returns the element unchanged. Generally, the iterable needs
  to already be sorted on the same key function.

  .. code:: javascript

    groupBy('AAAABBBCCDAABBB')  // A, A A A A
                                // B, B B B
                                // C, C C
                                // D, D
                                // A, A A
                                // B, B B


:code:`map(...iterable, fn)`
  Make an iterator that computes the function using arguments obtained from the :code:`iterables`.

  .. code:: javascript

    map([1, 2], [3, 4], (a, b) => a + b)  // 4 6


:code:`mapApply(...iterable, fn)`
  Make an iterator that computes the :code:`function` using arguments obtained from the
  :code:`iterables`. Used instead of :code:`map()` when argument parameters are already grouped in
  arrays from a single :code:`iterable`.

  .. code:: javascript

    mapApply([[2, 5], [3, 2], [10, 3]], Math.pow)  // 32 9 1000


**TODO** :code:`permutations(iterable, r=undefined)`
  Return successive :code:`r` length permutations of elements in the :code:`iterable`.

  If :code:`r` is undefined, :code:`r` defaults to the length of the :code:`iterable` and all
  possible full-length permutations are generated.

  .. code:: javascript

    permutations('ABCD', 2)  // AB AC AD BA BC BD CA CB CD DA DB DC
    permutations(range(3))   // 012 021 102 120 201 210


**TODO** :code:`product(...iterables, repeat=1)`
  Cartesian product of input :code:`iterables`. To compute the product of an iterable with itself,
  specify the number of repetitions with the optional :code:`repeat` argument.

  .. code:: javascript

    product('ABCD', 'xy')  // Ax Ay Bx By Cx Cy Dx Dy
    product(range(2), 3)   // 000 001 010 011 100 101 110 111


:code:`range(stop)` or :code:`range(start, stop, step=1)`
  Make an iterator that returns a number starting from :code:`start` to :code:`stop`, incremented by
  :code:`step`.

  .. code:: javascript

    range(10)          // 0 1 2 3 4 5 6 7 8 9
    range(1, 11)       // 1 2 3 4 5 6 7 8 9 10
    range(0, 30, 5)    // 0 5 10 15 20 25
    range(0, 10, 3)    // 0 3 6 9
    range(0, -10, -1)  // 0 -1 -2 -3 -4 -5 -6 -7 -8 -9


:code:`repeat(element, times=Infinity)`
  Make an iterator that returns :code:`element` over and over again. Runs indefinitely unless the
  :code:`times` argument is specified.

  .. code:: javascript

    repeat(10, 3)  // 10 10 10


:code:`slice(iterable, stop=Infinity)` or :code:`slice(iterable, start=0, stop=Infinity, step=1)`
  Make an iterator that returns selected elements from the :code:`iterable`. If :code:`start` is
  non-zero, then elements from the iterable are skipped until :code:`start` is reached. Afterward,
  elements are returned consecutively unless :code:`step` is set higher than one which results in
  items being skipped.

  .. code:: javascript

    slice('ABCDEFG', 2)               // A B
    slice('ABCDEFG', 2, 4)            // C D
    slice('ABCDEFG', 2, Infinity)     // C D E F G
    slice('ABCDEFG', 0, Infinity, 2)  // A C E G


:code:`takeWhile(iterable, predicate=(i) => i)`
  Make an iterator that returns elements from the :code:`iterable` as long as the :code:`predicate`
  is true.

  .. code:: javascript

    takeWhile([1, 4, 6, 4, 1], (x) => x < 5)  // 1 4


:code:`tee(iterable, n=2)`
  Return :code:`n` independent iterators from a single :code:`iterable`.

  .. code:: javascript

    const [a, b] = tee([1, 2, 3]);
    a.next().value // 1
    a.next().value // 2
    b.next().value // 1


:code:`zip(...iterables)`
  Make an iterator that aggregates elements from each of the :code:`iterables`. Returns an iterator
  of arrays, where the i-th array contains the i-th element from each of the argument iterables. The
  iterator stops when the shortest input iterable is exhausted. With a single iterable argument, it
  returns an iterator of arrays of size 1. With no arguments, it returns an empty iterator.

  .. code:: javascript

    zip('ABCD', 'xy')  // [A, x] [B, y]

:code:`zipLongest(...iterables)`
  Make an iterator that aggregates elements from each of the :code:`iterables`. If the
  :code:`iterables` are of uneven length, missing values are filled-in with :code:`undefined`.

  .. code:: javascript

    zipLongest('ABCD', 'xy')  // [A, x] [B, y] [C, undefined] [D, undefined]
