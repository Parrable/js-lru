!function(g, f) {
  if (typeof exports == "object" && typeof module != "undefined") {
    f(exports);
  } else if (typeof define == "function" && define.amd) {
    define(["exports"], f);
  } else {
    f((g = g || self)["lru_map"] = g["lru_map"] || {});
  }
}(this, function(exports2) {
  const NEWER = Symbol("newer");
  const OLDER = Symbol("older");
  class LRUMap {
    constructor(limit, entries) {
      if (typeof limit !== "number") {
        entries = limit;
        limit = 0;
      }
      this.size = 0;
      this.limit = limit;
      this.oldest = this.newest = void 0;
      this._keymap = new Map();
      this.isProcessingForEachWithBreak = false;
      if (entries) {
        this.assign(entries);
        if (limit < 1) {
          this.limit = this.size;
        }
      }
    }
    _markEntryAsUsed(entry) {
      if (entry === this.newest) {
        return;
      }
      if (entry[NEWER]) {
        if (entry === this.oldest) {
          this.oldest = entry[NEWER];
        }
        entry[NEWER][OLDER] = entry[OLDER];
      }
      if (entry[OLDER]) {
        entry[OLDER][NEWER] = entry[NEWER];
      }
      entry[NEWER] = void 0;
      entry[OLDER] = this.newest;
      if (this.newest) {
        this.newest[NEWER] = entry;
      }
      this.newest = entry;
    }
    assign(entries) {
      let entry, limit = this.limit || Number.MAX_VALUE;
      this._keymap.clear();
      let it = entries[Symbol.iterator]();
      for (let itv = it.next(); !itv.done; itv = it.next()) {
        let e = new Entry(itv.value[0], itv.value[1]);
        this._keymap.set(e.key, e);
        if (!entry) {
          this.oldest = e;
        } else {
          entry[NEWER] = e;
          e[OLDER] = entry;
        }
        entry = e;
        if (limit-- == 0) {
          throw new Error("overflow");
        }
      }
      this.newest = entry;
      this.size = this._keymap.size;
    }
    get(key) {
      var entry = this._keymap.get(key);
      if (!entry)
        return;
      this._markEntryAsUsed(entry);
      return entry.value;
    }
    set(key, value) {
      var entry = this._keymap.get(key);
      if (entry) {
        entry.value = value;
        this._markEntryAsUsed(entry);
        return this;
      }
      this._keymap.set(key, entry = new Entry(key, value));
      if (this.newest) {
        this.newest[NEWER] = entry;
        entry[OLDER] = this.newest;
      } else {
        this.oldest = entry;
      }
      this.newest = entry;
      ++this.size;
      if (this.size > this.limit) {
        this.shift();
      }
      return this;
    }
    shift() {
      var entry = this.oldest;
      if (entry) {
        if (this.oldest[NEWER]) {
          this.oldest = this.oldest[NEWER];
          this.oldest[OLDER] = void 0;
        } else {
          this.oldest = void 0;
          this.newest = void 0;
        }
        entry[NEWER] = entry[OLDER] = void 0;
        this._keymap.delete(entry.key);
        --this.size;
        return [entry.key, entry.value];
      }
    }
    find(key) {
      let e = this._keymap.get(key);
      return e ? e.value : void 0;
    }
    has(key) {
      return this._keymap.has(key);
    }
    delete(key) {
      var entry = this._keymap.get(key);
      if (!entry)
        return;
      this._keymap.delete(entry.key);
      if (entry[NEWER] && entry[OLDER]) {
        entry[OLDER][NEWER] = entry[NEWER];
        entry[NEWER][OLDER] = entry[OLDER];
      } else if (entry[NEWER]) {
        entry[NEWER][OLDER] = void 0;
        this.oldest = entry[NEWER];
      } else if (entry[OLDER]) {
        entry[OLDER][NEWER] = void 0;
        this.newest = entry[OLDER];
      } else {
        this.oldest = this.newest = void 0;
      }
      this.size--;
      return entry.value;
    }
    clear() {
      this.oldest = this.newest = void 0;
      this.size = 0;
      this._keymap.clear();
    }
    keys() {
      return new KeyIterator(this.oldest);
    }
    values() {
      return new ValueIterator(this.oldest);
    }
    entries() {
      return this;
    }
    [Symbol.iterator]() {
      return new EntryIterator(this.oldest);
    }
    forEach(fun, thisObj) {
      if (typeof thisObj !== "object") {
        thisObj = this;
      }
      let entry = this.oldest;
      while (entry) {
        fun.call(thisObj, entry.value, entry.key, this);
        entry = entry[NEWER];
      }
    }
    forEachWithBreak(fun) {
      if (this.isProcessingForEachWithBreak)
        return 0;
      this.isProcessingFunWithBreak = true;
      let entry = this.oldest;
      let removedEntryCount = 0;
      while (entry) {
        if (!fun.call(this, entry.value, entry.key, this)) {
          break;
        }
        this.delete(entry.key);
        entry = this.oldest;
        removedEntryCount++;
      }
      this.isProcessingForEachWithBreak = false;
      return removedEntryCount;
    }
    toJSON() {
      var s = new Array(this.size), i = 0, entry = this.oldest;
      while (entry) {
        s[i++] = {key: entry.key, value: entry.value};
        entry = entry[NEWER];
      }
      return s;
    }
    toString() {
      var s = "", entry = this.oldest;
      while (entry) {
        s += String(entry.key) + ":" + entry.value;
        entry = entry[NEWER];
        if (entry) {
          s += " < ";
        }
      }
      return s;
    }
  }
  exports2.LRUMap = LRUMap;
  function Entry(key, value) {
    this.key = key;
    this.value = value;
    this[NEWER] = void 0;
    this[OLDER] = void 0;
  }
  function EntryIterator(oldestEntry) {
    this.entry = oldestEntry;
  }
  EntryIterator.prototype[Symbol.iterator] = function() {
    return this;
  };
  EntryIterator.prototype.next = function() {
    let ent = this.entry;
    if (ent) {
      this.entry = ent[NEWER];
      return {done: false, value: [ent.key, ent.value]};
    } else {
      return {done: true, value: void 0};
    }
  };
  function KeyIterator(oldestEntry) {
    this.entry = oldestEntry;
  }
  KeyIterator.prototype[Symbol.iterator] = function() {
    return this;
  };
  KeyIterator.prototype.next = function() {
    let ent = this.entry;
    if (ent) {
      this.entry = ent[NEWER];
      return {done: false, value: ent.key};
    } else {
      return {done: true, value: void 0};
    }
  };
  function ValueIterator(oldestEntry) {
    this.entry = oldestEntry;
  }
  ValueIterator.prototype[Symbol.iterator] = function() {
    return this;
  };
  ValueIterator.prototype.next = function() {
    let ent = this.entry;
    if (ent) {
      this.entry = ent[NEWER];
      return {done: false, value: ent.value};
    } else {
      return {done: true, value: void 0};
    }
  };
});
//# sourceMappingURL=lru.js.map
