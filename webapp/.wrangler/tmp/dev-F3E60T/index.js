var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/auth.js
var ITERATIONS = 1e5;
var SESSION_MS = 30 * 24 * 60 * 60 * 1e3;
var hex = /* @__PURE__ */ __name((bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(""), "hex");
var unhex = /* @__PURE__ */ __name((s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16))), "unhex");
async function hashPassword(password, saltHex) {
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}
__name(hashPassword, "hashPassword");
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(equal, "equal");
async function verifyPassword(password, stored) {
  const [saltHex] = stored.split(":");
  if (!saltHex) return false;
  return equal(await hashPassword(password, saltHex), stored);
}
__name(verifyPassword, "verifyPassword");
function cookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `sid=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
__name(cookie, "cookie");
async function currentUser(request, env2) {
  const sid = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (!sid) return null;
  const row = await env2.DB.prepare(
    `SELECT s.expires_at, u.id, u.username, u.role, u.display_name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND u.active = 1`
  ).bind(sid).first();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await env2.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
    return null;
  }
  return { id: row.id, username: row.username, role: row.role, display_name: row.display_name };
}
__name(currentUser, "currentUser");
async function login({ request, env: env2, body }) {
  const { username, password } = body || {};
  const user = await env2.DB.prepare(
    "SELECT id, password_hash FROM users WHERE username = ? AND active = 1"
  ).bind(String(username || "")).first();
  if (!user || !await verifyPassword(String(password || ""), user.password_hash)) {
    return new Response(JSON.stringify({ error: "Wrong username or password" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  const sid = crypto.randomUUID();
  await env2.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, user.id, Date.now() + SESSION_MS).run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": cookie(request, sid, SESSION_MS / 1e3) }
  });
}
__name(login, "login");
async function logout({ request, env: env2 }) {
  const sid = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (sid) await env2.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": cookie(request, "", 0) }
  });
}
__name(logout, "logout");
async function seed({ env: env2 }) {
  const { c } = await env2.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
  if (c > 0) {
    const e = new Error("Already seeded \u2014 delete the users table to re-seed");
    e.status = 409;
    throw e;
  }
  const people2 = [
    ...Array.from({ length: 6 }, (_, i) => ({ username: `core${i + 1}`, role: "core", display_name: `Core ${i + 1}` })),
    ...Array.from({ length: 10 }, (_, i) => ({ username: `outreach${i + 1}`, role: "outreach", display_name: `Outreach ${i + 1}` }))
  ];
  const created = [];
  for (const p of people2) {
    const password = crypto.randomUUID().slice(0, 8);
    await env2.DB.prepare(
      "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
    ).bind(p.username, await hashPassword(password), p.role, p.display_name).run();
    created.push({ ...p, password });
  }
  return { note: "Save these \u2014 they are not shown again.", users: created };
}
__name(seed, "seed");

// src/screens-api.js
var STATUSES = [
  "Hot lead",
  "Cold lead",
  "Not interested",
  "Not picking",
  "Phone switched off / out of coverage",
  "Invalid number",
  "Pre-paid (advance received)"
];
var PRE_PAID = "Pre-paid (advance received)";
var COMMISSION_RATE = 0.1;
function fail(message, status) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
__name(fail, "fail");
async function listCollections({ env: env2 }) {
  const { results } = await env2.DB.prepare(
    `SELECT c.id, c.category, c.city, c.created_at,
            COUNT(l.id) AS total,
            COUNT(ls.lead_id) AS called
       FROM collections c
       LEFT JOIN leads l ON l.collection_id = c.id
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
      GROUP BY c.id
      ORDER BY c.created_at DESC`
  ).all();
  return { collections: results };
}
__name(listCollections, "listCollections");
async function leadsForCollection({ env: env2, params }) {
  const { results } = await env2.DB.prepare(
    `SELECT l.id, l.name, l.phone, l.website, l.capability, l.address, l.area, l.city, l.state,
            l.assigned_to, au.display_name AS assigned_to_name,
            ls.status, ls.called_by, ls.deal_value, ls.updated_at, ls.updated_by,
            u.display_name AS called_by_name
       FROM leads l
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users u ON u.id = ls.called_by
       LEFT JOIN users au ON au.id = l.assigned_to
      WHERE l.collection_id = ?
      ORDER BY l.id`
  ).bind(Number(params.id)).all();
  return { leads: results };
}
__name(leadsForCollection, "leadsForCollection");
async function checkOutreachUser(env2, userId) {
  if (userId === null || userId === void 0) return null;
  const u = await env2.DB.prepare("SELECT id FROM users WHERE id = ? AND active = 1 AND role = 'outreach'").bind(Number(userId)).first();
  if (!u) fail("user_id must be an active outreach user", 422);
  return Number(userId);
}
__name(checkOutreachUser, "checkOutreachUser");
async function assignLead({ env: env2, params, body }) {
  const leadId = Number(params.id);
  const lead = await env2.DB.prepare("SELECT id FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);
  const userId = body.user_id === null || body.user_id === void 0 ? null : await checkOutreachUser(env2, body.user_id);
  await env2.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(userId, leadId).run();
  return { ok: true };
}
__name(assignLead, "assignLead");
async function assignBulk({ env: env2, params, body }) {
  const collectionId = Number(params.id);
  const collection = await env2.DB.prepare("SELECT id FROM collections WHERE id = ?").bind(collectionId).first();
  if (!collection) fail("No such collection", 404);
  if (body.user_id === null || body.user_id === void 0) fail("user_id is required", 422);
  const userId = await checkOutreachUser(env2, body.user_id);
  let sql = `SELECT id FROM leads WHERE collection_id = ? AND assigned_to IS NULL
             ORDER BY CASE WHEN capability LIKE 'Website + %' OR capability LIKE 'Full webapp%' THEN 1 ELSE 0 END, id`;
  if (body.count !== void 0 && body.count !== null) {
    const count3 = Number(body.count);
    if (!Number.isInteger(count3) || count3 <= 0) fail("count must be a positive integer", 422);
    sql += ` LIMIT ${count3}`;
  }
  const { results: unassigned } = await env2.DB.prepare(sql).bind(collectionId).all();
  if (unassigned.length) {
    await env2.DB.batch(
      unassigned.map((l) => env2.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(userId, l.id))
    );
  }
  return { ok: true, assigned: unassigned.length };
}
__name(assignBulk, "assignBulk");
async function myLeads({ env: env2, user }) {
  const { results } = await env2.DB.prepare(
    `SELECT l.id, l.name, l.phone, l.website, l.capability, l.address, l.area, l.city, l.state,
            c.category, c.city AS collection_city,
            ls.status, ls.called_by, ls.deal_value, ls.updated_at, ls.updated_by,
            u.display_name AS called_by_name
       FROM leads l
       JOIN collections c ON c.id = l.collection_id
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users u ON u.id = ls.called_by
      WHERE l.assigned_to = ?
      ORDER BY l.id`
  ).bind(user.id).all();
  return { leads: results };
}
__name(myLeads, "myLeads");
async function listUsers({ env: env2, url }) {
  const role = url.searchParams.get("role");
  const stmt = role ? env2.DB.prepare("SELECT id, display_name, role FROM users WHERE active = 1 AND role = ? ORDER BY display_name").bind(role) : env2.DB.prepare("SELECT id, display_name, role FROM users WHERE active = 1 ORDER BY display_name");
  const { results } = await stmt.all();
  return { users: results };
}
__name(listUsers, "listUsers");
async function updateLeadStatus({ env: env2, params, body, user }) {
  const leadId = Number(params.id);
  const lead = await env2.DB.prepare("SELECT id, assigned_to FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);
  if (user.role === "outreach" && lead.assigned_to !== user.id) fail("Not your lead", 403);
  const existing = await env2.DB.prepare("SELECT * FROM lead_status WHERE lead_id = ?").bind(leadId).first();
  const status = body.status !== void 0 ? body.status : existing?.status ?? null;
  const called_by = body.called_by !== void 0 ? body.called_by : existing?.called_by ?? null;
  const deal_value = body.deal_value !== void 0 ? body.deal_value : existing?.deal_value ?? null;
  if (status === null) fail("Pick a status first", 422);
  if (!STATUSES.includes(status)) fail("Invalid status", 422);
  if (status === PRE_PAID && (deal_value === null || deal_value === "" || Number.isNaN(Number(deal_value)))) {
    fail("Amount finalized is required before marking Pre-paid", 422);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `INSERT INTO lead_status (lead_id, status, called_by, deal_value, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(lead_id) DO UPDATE SET
       status = excluded.status, called_by = excluded.called_by, deal_value = excluded.deal_value,
       updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).bind(leadId, status, called_by, deal_value, now, user.id).run();
  let projectCreated = false;
  if (status === PRE_PAID) {
    const existingProject = await env2.DB.prepare("SELECT id FROM projects WHERE lead_id = ?").bind(leadId).first();
    if (!existingProject) {
      const commission = COMMISSION_RATE * Number(deal_value);
      await env2.DB.prepare(
        `INSERT INTO projects (lead_id, total_amount, commission, converted_at) VALUES (?, ?, ?, ?)`
      ).bind(leadId, Number(deal_value), commission, now).run();
      projectCreated = true;
    }
  }
  return { ok: true, projectCreated };
}
__name(updateLeadStatus, "updateLeadStatus");
async function listConverted({ env: env2 }) {
  const { results: projects } = await env2.DB.prepare(
    `SELECT p.id AS project_id, p.lead_id, p.kind, p.description, p.total_amount, p.work_status,
            p.future_scope, p.deadline, p.commission, p.converted_at,
            l.name, l.phone, l.area, l.city, l.state,
            COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id), 0) AS amount_paid
       FROM projects p JOIN leads l ON l.id = p.lead_id
      ORDER BY p.converted_at DESC`
  ).all();
  const { results: assigneeRows } = await env2.DB.prepare(
    `SELECT pa.project_id, u.id, u.display_name
       FROM project_assignees pa JOIN users u ON u.id = pa.user_id`
  ).all();
  const byProject = {};
  for (const r of assigneeRows) (byProject[r.project_id] ??= []).push({ id: r.id, display_name: r.display_name });
  return {
    projects: projects.map((p) => ({
      ...p,
      amount_left: (p.total_amount || 0) - p.amount_paid,
      assignees: byProject[p.project_id] || []
    }))
  };
}
__name(listConverted, "listConverted");
var LEAD_FIELDS = ["area", "city", "state"];
var PROJECT_FIELDS = ["kind", "description", "total_amount", "work_status", "future_scope"];
async function updateConverted({ env: env2, params, body }) {
  const projectId = Number(params.id);
  const project = await env2.DB.prepare("SELECT id, lead_id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);
  const leadSet = LEAD_FIELDS.filter((f) => body[f] !== void 0);
  if (leadSet.length) {
    await env2.DB.prepare(`UPDATE leads SET ${leadSet.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`).bind(...leadSet.map((f) => body[f]), project.lead_id).run();
  }
  const projSet = PROJECT_FIELDS.filter((f) => body[f] !== void 0);
  if (projSet.length) {
    await env2.DB.prepare(`UPDATE projects SET ${projSet.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`).bind(...projSet.map((f) => body[f]), projectId).run();
  }
  return { ok: true };
}
__name(updateConverted, "updateConverted");
async function addPayment({ env: env2, params, body }) {
  const projectId = Number(params.id);
  const amount = Number(body.amount);
  if (!amount || amount <= 0) fail("Payment amount must be a positive number", 422);
  const project = await env2.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);
  await env2.DB.prepare("INSERT INTO payments (project_id, amount, received_at) VALUES (?, ?, ?)").bind(projectId, amount, (/* @__PURE__ */ new Date()).toISOString()).run();
  return { ok: true };
}
__name(addPayment, "addPayment");
async function setAssignees({ env: env2, params, body }) {
  const projectId = Number(params.id);
  const project = await env2.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);
  const ids = Array.isArray(body.user_ids) ? [...new Set(body.user_ids.map(Number))] : [];
  await env2.DB.prepare("DELETE FROM project_assignees WHERE project_id = ?").bind(projectId).run();
  if (ids.length) {
    await env2.DB.batch(
      ids.map(
        (uid) => env2.DB.prepare("INSERT INTO project_assignees (project_id, user_id) VALUES (?, ?)").bind(projectId, uid)
      )
    );
  }
  return { ok: true };
}
__name(setAssignees, "setAssignees");
var routes = {
  "GET /api/core/collections": listCollections,
  "GET /api/core/collections/:id/leads": leadsForCollection,
  "GET /api/users": listUsers,
  "PUT /api/leads/:id/status": updateLeadStatus,
  "GET /api/leads/mine": myLeads,
  "GET /api/core/converted": listConverted,
  "PATCH /api/core/converted/:id": updateConverted,
  "POST /api/core/converted/:id/payments": addPayment,
  "PUT /api/core/converted/:id/assignees": setAssignees,
  "PUT /api/core/leads/:id/assign": assignLead,
  "POST /api/core/collections/:id/assign-bulk": assignBulk
};

// src/dashboard-api.js
var ST = {
  hot: "Hot lead",
  cold: "Cold lead",
  not_interested: "Not interested",
  switched_off: "Phone switched off / out of coverage",
  not_picking: "Not picking",
  invalid: "Invalid number",
  converted: "Pre-paid (advance received)"
};
var STATUS_TO_KEY = Object.fromEntries(Object.entries(ST).map(([k, v]) => [v, k]));
var MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthsForYear(year) {
  const y = Number(year);
  if (y < 2026) return [];
  const start = y === 2026 ? 7 : 1;
  return Array.from({ length: 12 - start + 1 }, (_, i) => start + i);
}
__name(monthsForYear, "monthsForYear");
var bad = /* @__PURE__ */ __name((msg, status = 400) => {
  const e = new Error(msg);
  e.status = status;
  return e;
}, "bad");
async function people(env2, role) {
  const { results } = await env2.DB.prepare(
    "SELECT id, display_name FROM users WHERE role = ? AND active = 1 ORDER BY id"
  ).bind(role).all();
  return results;
}
__name(people, "people");
async function outreachPerformance({ params, env: env2 }) {
  const userId = Number(params.userId);
  const { results: yearRows } = await env2.DB.prepare(
    "SELECT DISTINCT CAST(strftime('%Y', updated_at) AS INTEGER) AS y FROM lead_status WHERE called_by = ? ORDER BY y"
  ).bind(userId).all();
  const years = [];
  for (const { y } of yearRows) {
    const { results: statusRows } = await env2.DB.prepare(
      `SELECT CAST(strftime('%m', updated_at) AS INTEGER) AS month, status, deal_value
         FROM lead_status WHERE called_by = ? AND strftime('%Y', updated_at) = ?`
    ).bind(userId, String(y)).all();
    const { results: collectedRows } = await env2.DB.prepare(
      `SELECT CAST(strftime('%m', pay.received_at) AS INTEGER) AS month, SUM(pay.amount) AS amt
         FROM payments pay
         JOIN projects p ON p.id = pay.project_id
         JOIN lead_status ls ON ls.lead_id = p.lead_id
        WHERE ls.called_by = ? AND strftime('%Y', pay.received_at) = ?
        GROUP BY month`
    ).bind(userId, String(y)).all();
    const rows = {};
    for (let m = 1; m <= 12; m++) {
      rows[m] = {
        month: m,
        month_name: MONTH_NAMES[m],
        hot: 0,
        cold: 0,
        not_interested: 0,
        switched_off: 0,
        not_picking: 0,
        invalid: 0,
        converted: 0,
        revenue_finalized: 0,
        revenue_collected: 0
      };
    }
    for (const r of statusRows) {
      const key = STATUS_TO_KEY[r.status];
      if (!key || !rows[r.month]) continue;
      rows[r.month][key]++;
      if (key === "converted") rows[r.month].revenue_finalized += r.deal_value || 0;
    }
    for (const r of collectedRows) if (rows[r.month]) rows[r.month].revenue_collected = r.amt || 0;
    years.push({ year: y, rows: Object.values(rows) });
  }
  return { years };
}
__name(outreachPerformance, "outreachPerformance");
async function projectsSummary({ env: env2 }) {
  const core = await people(env2, "core");
  const { results: agg } = await env2.DB.prepare(
    `SELECT pa.user_id,
            SUM(CASE WHEN p.work_status = 'Completed & payment received' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN p.work_status = 'Working on project' THEN 1 ELSE 0 END) AS continuing,
            SUM(MAX(p.total_amount - COALESCE(pay.collected, 0), 0)) AS outstanding
       FROM project_assignees pa
       JOIN projects p ON p.id = pa.project_id
       LEFT JOIN (SELECT project_id, SUM(amount) AS collected FROM payments GROUP BY project_id) pay
              ON pay.project_id = p.id
      GROUP BY pa.user_id`
  ).all();
  const byUser = Object.fromEntries(agg.map((r) => [r.user_id, r]));
  return core.map((u) => ({
    user_id: u.id,
    display_name: u.display_name,
    delivered: byUser[u.id]?.delivered || 0,
    continuing: byUser[u.id]?.continuing || 0,
    outstanding: byUser[u.id]?.outstanding || 0
  }));
}
__name(projectsSummary, "projectsSummary");
async function projectsList({ env: env2 }) {
  const { results } = await env2.DB.prepare(
    `SELECT p.id, l.name AS lead_name, p.kind, p.description, p.work_status, p.deadline,
            GROUP_CONCAT(u.display_name, ', ') AS handled_by
       FROM projects p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN project_assignees pa ON pa.project_id = p.id
       LEFT JOIN users u ON u.id = pa.user_id
      GROUP BY p.id
      ORDER BY (p.deadline IS NULL), p.deadline ASC`
  ).all();
  return results;
}
__name(projectsList, "projectsList");
async function setDeadline({ params, body, env: env2 }) {
  const deadline = body?.deadline ? String(body.deadline) : null;
  await env2.DB.prepare("UPDATE projects SET deadline = ? WHERE id = ?").bind(deadline, params.id).run();
  return { ok: true };
}
__name(setDeadline, "setDeadline");
async function salariesGrid({ params, env: env2 }) {
  const { team, year } = params;
  if (team !== "outreach" && team !== "core") throw bad("team must be outreach or core");
  const months = monthsForYear(year);
  const team_people = await people(env2, team);
  const { results: paidRows } = await env2.DB.prepare(
    "SELECT user_id, month, amount, paid FROM salaries WHERE year = ?"
  ).bind(Number(year)).all();
  const paidByKey = Object.fromEntries(paidRows.map((r) => [`${r.user_id}-${r.month}`, r]));
  let computedByKey = {};
  if (team === "outreach") {
    const { results } = await env2.DB.prepare(
      `SELECT ls.called_by AS user_id, CAST(strftime('%m', p.converted_at) AS INTEGER) AS month, SUM(p.commission) AS amt
         FROM projects p JOIN lead_status ls ON ls.lead_id = p.lead_id
        WHERE strftime('%Y', p.converted_at) = ?
        GROUP BY ls.called_by, month`
    ).bind(String(year)).all();
    computedByKey = Object.fromEntries(results.map((r) => [`${r.user_id}-${r.month}`, r.amt || 0]));
  }
  return {
    months: months.map((m) => ({ month: m, month_name: MONTH_NAMES[m] })),
    people: team_people.map((u) => ({
      user_id: u.id,
      display_name: u.display_name,
      cells: months.map((m) => {
        const key = `${u.id}-${m}`;
        const amount = team === "outreach" ? computedByKey[key] || 0 : paidByKey[key]?.amount ?? null;
        return { month: m, amount, paid: !!paidByKey[key]?.paid };
      })
    }))
  };
}
__name(salariesGrid, "salariesGrid");
async function toggleSalaryPaid({ params, env: env2 }) {
  const { year, userId, month } = params;
  const existing = await env2.DB.prepare(
    "SELECT paid FROM salaries WHERE user_id = ? AND year = ? AND month = ?"
  ).bind(userId, year, month).first();
  if (existing) {
    await env2.DB.prepare("UPDATE salaries SET paid = ? WHERE user_id = ? AND year = ? AND month = ?").bind(existing.paid ? 0 : 1, userId, year, month).run();
  } else {
    await env2.DB.prepare("INSERT INTO salaries (user_id, year, month, paid) VALUES (?, ?, ?, 1)").bind(userId, year, month).run();
  }
  return { ok: true };
}
__name(toggleSalaryPaid, "toggleSalaryPaid");
async function setCoreSalaryAmount({ params, body, env: env2 }) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount)) throw bad("amount must be a number");
  const { year, userId, month } = params;
  const existing = await env2.DB.prepare(
    "SELECT paid FROM salaries WHERE user_id = ? AND year = ? AND month = ?"
  ).bind(userId, year, month).first();
  if (existing) {
    await env2.DB.prepare("UPDATE salaries SET amount = ? WHERE user_id = ? AND year = ? AND month = ?").bind(amount, userId, year, month).run();
  } else {
    await env2.DB.prepare("INSERT INTO salaries (user_id, year, month, amount, paid) VALUES (?, ?, ?, ?, 0)").bind(userId, year, month, amount).run();
  }
  return { ok: true };
}
__name(setCoreSalaryAmount, "setCoreSalaryAmount");
async function expensesGrid({ params, env: env2 }) {
  const { year } = params;
  const months = monthsForYear(year);
  const { results: feeRows } = await env2.DB.prepare(
    "SELECT month, ai_fees FROM expenses WHERE year = ?"
  ).bind(Number(year)).all();
  const feesByMonth = Object.fromEntries(feeRows.map((r) => [r.month, r.ai_fees]));
  const { results: commissionRows } = await env2.DB.prepare(
    `SELECT CAST(strftime('%m', converted_at) AS INTEGER) AS month, SUM(commission) AS amt
       FROM projects WHERE strftime('%Y', converted_at) = ? GROUP BY month`
  ).bind(String(year)).all();
  const outreachByMonth = Object.fromEntries(commissionRows.map((r) => [r.month, r.amt || 0]));
  const { results: paymentRows } = await env2.DB.prepare(
    `SELECT CAST(strftime('%m', received_at) AS INTEGER) AS month, SUM(amount) AS amt
       FROM payments WHERE strftime('%Y', received_at) = ? GROUP BY month`
  ).bind(String(year)).all();
  const totalByMonth = Object.fromEntries(paymentRows.map((r) => [r.month, r.amt || 0]));
  return months.map((m) => {
    const ai_fees = feesByMonth[m] || 0;
    const outreach_fees = outreachByMonth[m] || 0;
    const total_money = totalByMonth[m] || 0;
    return {
      month: m,
      month_name: MONTH_NAMES[m],
      ai_fees,
      outreach_fees,
      total_money,
      money_left: total_money - ai_fees - outreach_fees
    };
  });
}
__name(expensesGrid, "expensesGrid");
async function setAiFees({ params, body, env: env2 }) {
  const ai_fees = Number(body?.ai_fees);
  if (!Number.isFinite(ai_fees)) throw bad("ai_fees must be a number");
  const { year, month } = params;
  await env2.DB.prepare(
    `INSERT INTO expenses (year, month, ai_fees) VALUES (?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET ai_fees = excluded.ai_fees`
  ).bind(Number(year), Number(month), ai_fees).run();
  return { ok: true };
}
__name(setAiFees, "setAiFees");
var routes2 = {
  "GET /api/core/dashboard/people/:role": /* @__PURE__ */ __name(({ params, env: env2 }) => people(env2, params.role), "GET /api/core/dashboard/people/:role"),
  "GET /api/core/dashboard/outreach/:userId": outreachPerformance,
  "GET /api/core/dashboard/projects-summary": projectsSummary,
  "GET /api/core/dashboard/projects": projectsList,
  "PATCH /api/core/dashboard/projects/:id/deadline": setDeadline,
  "GET /api/core/dashboard/salaries/:team/:year": salariesGrid,
  "POST /api/core/dashboard/salaries/:year/:userId/:month/toggle": toggleSalaryPaid,
  "PATCH /api/core/dashboard/salaries/core/:year/:userId/:month": setCoreSalaryAmount,
  "GET /api/core/dashboard/expenses/:year": expensesGrid,
  "PATCH /api/core/dashboard/expenses/:year/:month": setAiFees
};

// node_modules/csv-parse/lib/api/CsvError.js
var CsvError = class _CsvError extends Error {
  static {
    __name(this, "CsvError");
  }
  constructor(code, message, options, ...contexts) {
    if (Array.isArray(message)) message = message.join(" ").trim();
    super(message);
    if (Error.captureStackTrace !== void 0) {
      Error.captureStackTrace(this, _CsvError);
    }
    this.code = code;
    for (const context2 of contexts) {
      for (const key in context2) {
        const value = context2[key];
        this[key] = Buffer.isBuffer(value) ? value.toString(options.encoding) : value == null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }
};

// node_modules/csv-parse/lib/utils/is_object.js
var is_object = /* @__PURE__ */ __name(function(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}, "is_object");

// node_modules/csv-parse/lib/api/normalize_columns_array.js
var normalize_columns_array = /* @__PURE__ */ __name(function(columns) {
  const normalizedColumns = [];
  for (let i = 0, l = columns.length; i < l; i++) {
    const column = columns[i];
    if (column === void 0 || column === null || column === false) {
      normalizedColumns[i] = { disabled: true };
    } else if (typeof column === "string" || typeof column === "number") {
      normalizedColumns[i] = { name: `${column}` };
    } else if (is_object(column)) {
      if (typeof column.name !== "string") {
        throw new CsvError("CSV_OPTION_COLUMNS_MISSING_NAME", [
          "Option columns missing name:",
          `property "name" is required at position ${i}`,
          "when column is an object literal"
        ]);
      }
      normalizedColumns[i] = column;
    } else {
      throw new CsvError("CSV_INVALID_COLUMN_DEFINITION", [
        "Invalid column definition:",
        "expect a string or a literal object,",
        `got ${JSON.stringify(column)} at position ${i}`
      ]);
    }
  }
  return normalizedColumns;
}, "normalize_columns_array");

// node_modules/csv-parse/lib/utils/ResizeableBuffer.js
var ResizeableBuffer = class {
  static {
    __name(this, "ResizeableBuffer");
  }
  constructor(size = 100) {
    this.size = size;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size);
  }
  prepend(val) {
    if (Buffer.isBuffer(val)) {
      const length = this.length + val.length;
      if (length >= this.size) {
        this.resize();
        if (length >= this.size) {
          throw Error("INVALID_BUFFER_STATE");
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    } else {
      const length = this.length++;
      if (length === this.size) {
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf, 1, 0, length);
    }
  }
  append(val) {
    const length = this.length++;
    if (length === this.size) {
      this.resize();
    }
    this.buf[length] = val;
  }
  clone() {
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize() {
    const length = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf, 0, 0, length);
    this.buf = buf;
  }
  toString(encoding) {
    if (encoding) {
      return this.buf.toString(encoding, 0, this.length);
    } else {
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON() {
    return this.toString("utf8");
  }
  reset() {
    this.length = 0;
  }
};
var ResizeableBuffer_default = ResizeableBuffer;

// node_modules/csv-parse/lib/api/init_state.js
var init_state = /* @__PURE__ */ __name(function(options) {
  const timchars = [
    // Basic Latin
    32,
    // [Space](https://www.fileformat.info/info/unicode/char/0020/index.htm)
    9,
    // [CHARACTER TABULATION (HT)](https://www.fileformat.info/info/unicode/char/0009/index.htm)
    10,
    // [LINE FEED (LF)](https://www.fileformat.info/info/unicode/char/000a/index.htm)
    13,
    // [CARRIAGE RETURN (CR)](https://www.fileformat.info/info/unicode/char/000d/index.htm)
    12,
    // [FORM FEED (FF)](https://www.fileformat.info/info/unicode/char/000c/index.htm)
    11,
    // [LINE TABULATION (VT)](https://www.fileformat.info/info/unicode/char/000b/index.htm)
    // Latin-1 Supplement
    160,
    // [NO-BREAK SPACE (NBSP)](https://www.fileformat.info/info/unicode/char/00a0/index.htm)
    // Ogham
    5760,
    // [OGHAM SPACE MARK](https://www.fileformat.info/info/unicode/char/1680/index.htm)
    // General Punctuation
    8192,
    // [EN QUAD](https://www.fileformat.info/info/unicode/char/2000/index.htm)
    8193,
    // [EM QUAD](https://www.fileformat.info/info/unicode/char/2001/index.htm)
    8194,
    // [EN SPACE](https://www.fileformat.info/info/unicode/char/2002/index.htm)
    8195,
    // [EM SPACE](https://www.fileformat.info/info/unicode/char/2003/index.htm)
    8196,
    // [THREE-PER-EM SPACE](https://www.fileformat.info/info/unicode/char/2004/index.htm)
    8197,
    // [FOUR-PER-EM SPACE](https://www.fileformat.info/info/unicode/char/2005/index.htm)
    8198,
    // [SIX-PER-EM SPACE](https://www.fileformat.info/info/unicode/char/2006/index.htm)
    8199,
    // [FIGURE SPACE](https://www.fileformat.info/info/unicode/char/2007/index.htm)
    8200,
    // [PUNCTUATION SPACE](https://www.fileformat.info/info/unicode/char/2008/index.htm)
    8201,
    // [THIN SPACE](https://www.fileformat.info/info/unicode/char/2009/index.htm)
    8202,
    // [HAIR SPACE](https://www.fileformat.info/info/unicode/char/200a/index.htm)
    8232,
    // [LINE SEPARATOR](https://www.fileformat.info/info/unicode/char/2028/index.htm)
    8233,
    // [PARAGRAPH SEPARATOR](https://www.fileformat.info/info/unicode/char/2029/index.htm)
    8239,
    // [NARROW NO-BREAK SPACE (NNBSP)](https://www.fileformat.info/info/unicode/char/202f/index.htm)
    8287,
    // [MEDIUM MATHEMATICAL SPACE (MMSP)](https://www.fileformat.info/info/unicode/char/205f/index.htm)
    12288,
    // [IDEOGRAPHIC SPACE](https://www.fileformat.info/info/unicode/char/3000/index.htm)
    65279
    // [ZERO WIDTH NO-BREAK SPACE (BOM)](https://www.fileformat.info/info/unicode/char/feff/index.htm)
  ].reduce((acc, codepoint) => {
    const encoded = Buffer.from(
      String.fromCharCode(codepoint),
      options.encoding
    );
    if (codepoint !== 63 && encoded.length === 1 && encoded[0] === 63) {
      return acc;
    }
    acc.push(encoded);
    return acc;
  }, []);
  const timcharFirstBytes = new Uint8Array(256);
  for (const t of timchars) timcharFirstBytes[t[0]] = 1;
  return {
    bomSkipped: false,
    bufBytesStart: 0,
    castField: options.cast_function,
    commenting: false,
    delimiterBufPrevious: void 0,
    delimiterDiscovered: false,
    // Current error encountered by a record
    error: void 0,
    enabled: options.from_line === 1,
    escaping: false,
    escapeIsQuote: Buffer.isBuffer(options.escape) && Buffer.isBuffer(options.quote) && Buffer.compare(options.escape, options.quote) === 0,
    // columns can be `false`, `true`, `Array`
    expectedRecordLength: Array.isArray(options.columns) ? options.columns.length : void 0,
    field: new ResizeableBuffer_default(20),
    firstLineToHeaders: options.cast_first_line_to_header,
    needMoreDataSize: Math.max(
      // Skip if the remaining buffer smaller than comment
      options.comment !== null ? options.comment.length : 0,
      ...options.delimiter ? options.delimiter.map((delimiter) => delimiter.length) : [],
      // Auto discovery of delimiter is limited to 1 character
      options.delimiter_auto ? 1 : 0,
      // Skip if the remaining buffer can be escape sequence
      options.quote !== null ? options.quote.length : 0,
      ...timchars.map((t) => t.length)
    ),
    previousBuf: void 0,
    quoting: false,
    stop: false,
    rawBuffer: new ResizeableBuffer_default(100),
    record: [],
    recordHasError: false,
    record_length: 0,
    recordDelimiterMaxLength: options.record_delimiter.length === 0 ? 0 : Math.max(...options.record_delimiter.map((v) => v.length)),
    trimChars: [
      Buffer.from(" ", options.encoding)[0],
      Buffer.from("	", options.encoding)[0]
    ],
    wasQuoting: false,
    wasRowDelimiter: false,
    timchars,
    timcharFirstBytes
  };
}, "init_state");

// node_modules/csv-parse/lib/utils/underscore.js
var underscore = /* @__PURE__ */ __name(function(str) {
  return str.replace(/([A-Z])/g, function(_, match) {
    return "_" + match.toLowerCase();
  });
}, "underscore");

// node_modules/csv-parse/lib/api/normalize_options.js
var normalize_options = /* @__PURE__ */ __name(function(opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore(opt)] = opts[opt];
  }
  if (options.encoding === void 0 || options.encoding === true) {
    options.encoding = "utf8";
  } else if (options.encoding === null || options.encoding === false) {
    options.encoding = null;
  } else if (typeof options.encoding !== "string" && options.encoding !== null) {
    throw new CsvError(
      "CSV_INVALID_OPTION_ENCODING",
      [
        "Invalid option encoding:",
        "encoding must be a string or null to return a buffer,",
        `got ${JSON.stringify(options.encoding)}`
      ],
      options
    );
  }
  if (options.bom === void 0 || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_BOM",
      [
        "Invalid option bom:",
        "bom must be true,",
        `got ${JSON.stringify(options.bom)}`
      ],
      options
    );
  }
  options.cast_function = null;
  if (options.cast === void 0 || options.cast === null || options.cast === false || options.cast === "") {
    options.cast = void 0;
  } else if (typeof options.cast === "function") {
    options.cast_function = options.cast;
    options.cast = true;
  } else if (options.cast !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST",
      [
        "Invalid option cast:",
        "cast must be true or a function,",
        `got ${JSON.stringify(options.cast)}`
      ],
      options
    );
  }
  if (options.cast_date === void 0 || options.cast_date === null || options.cast_date === false || options.cast_date === "") {
    options.cast_date = false;
  } else if (options.cast_date === true) {
    options.cast_date = function(value) {
      const date = Date.parse(value);
      return !isNaN(date) ? new Date(date) : value;
    };
  } else if (typeof options.cast_date !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_CAST_DATE",
      [
        "Invalid option cast_date:",
        "cast_date must be true or a function,",
        `got ${JSON.stringify(options.cast_date)}`
      ],
      options
    );
  }
  options.cast_first_line_to_header = void 0;
  if (options.columns === true) {
    options.cast_first_line_to_header = void 0;
  } else if (typeof options.columns === "function") {
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  } else if (Array.isArray(options.columns)) {
    options.columns = normalize_columns_array(options.columns);
  } else if (options.columns === void 0 || options.columns === null || options.columns === false) {
    options.columns = false;
  } else {
    throw new CsvError(
      "CSV_INVALID_OPTION_COLUMNS",
      [
        "Invalid option columns:",
        "expect an array, a function or true,",
        `got ${JSON.stringify(options.columns)}`
      ],
      options
    );
  }
  if (options.group_columns_by_name === void 0 || options.group_columns_by_name === null || options.group_columns_by_name === false) {
    options.group_columns_by_name = false;
  } else if (options.group_columns_by_name !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "expect an boolean,",
        `got ${JSON.stringify(options.group_columns_by_name)}`
      ],
      options
    );
  } else if (options.columns === false) {
    throw new CsvError(
      "CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME",
      [
        "Invalid option group_columns_by_name:",
        "the `columns` mode must be activated."
      ],
      options
    );
  }
  if (options.comment === void 0 || options.comment === null || options.comment === false || options.comment === "") {
    options.comment = null;
  } else {
    if (typeof options.comment === "string") {
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if (!Buffer.isBuffer(options.comment)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_COMMENT",
        [
          "Invalid option comment:",
          "comment must be a buffer or a string,",
          `got ${JSON.stringify(options.comment)}`
        ],
        options
      );
    }
  }
  if (options.comment_no_infix === void 0 || options.comment_no_infix === null || options.comment_no_infix === false) {
    options.comment_no_infix = false;
  } else if (options.comment_no_infix !== true) {
    throw new CsvError(
      "CSV_INVALID_OPTION_COMMENT",
      [
        "Invalid option comment_no_infix:",
        "value must be a boolean,",
        `got ${JSON.stringify(options.comment_no_infix)}`
      ],
      options
    );
  }
  if (options.delimiter_auto === void 0 || options.delimiter_auto === null || options.delimiter_auto === false) {
    options.delimiter_auto = false;
  } else if (options.delimiter_auto === true) {
    options.delimiter_auto = {};
  } else if (!is_object(options.delimiter_auto)) {
    throw new CsvError(
      "CSV_INVALID_OPTION_DELIMITER_AUTO",
      [
        "Invalid option delimiter_auto:",
        "delimiter_auto must be a boolean or a configuration object,",
        `got ${JSON.stringify(options.delimiter_auto)}`
      ],
      options
    );
  }
  if (options.delimiter_auto) {
    if (options.delimiter_auto.preferred === void 0)
      options.delimiter_auto.preferred = {
        [",".charCodeAt(0)]: 1.8,
        ["	".charCodeAt(0)]: 1.8,
        [";".charCodeAt(0)]: 1.6,
        [" ".charCodeAt(0)]: 1.6,
        [":".charCodeAt(0)]: 1.5,
        [".".charCodeAt(0)]: 1.4,
        ["/".charCodeAt(0)]: 1.4
      };
    else if (!is_object(options.delimiter_auto.preferred)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER_AUTO",
        [
          "Invalid option delimiter_auto:",
          "preferred must be an object,",
          `got ${JSON.stringify(options.delimiter_auto.preferred)}`
        ],
        options
      );
    }
    if (options.delimiter_auto.score === void 0)
      options.delimiter_auto.score = (info3, options2) => {
        return (info3.total - info3.std) * (options2.preferred[info3.char_code] || 1);
      };
    else if (typeof options.delimiter_auto.score !== "function") {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER_AUTO",
        [
          "Invalid option delimiter_auto:",
          "score must be a function,",
          `got ${JSON.stringify(options.delimiter_auto.score)}`
        ],
        options
      );
    }
    if (options.delimiter_auto.size === void 0)
      options.delimiter_auto.size = 2048;
    else if (typeof options.delimiter_auto.size !== "number") {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER_AUTO",
        [
          "Invalid option delimiter_auto:",
          "size must be a number,",
          `got ${JSON.stringify(options.delimiter_auto.size)}`
        ],
        options
      );
    }
  }
  const delimiter_json = JSON.stringify(options.delimiter);
  if (options.delimiter_auto !== false) {
    options.delimiter = [];
  }
  if (!Array.isArray(options.delimiter)) {
    if (options.delimiter === void 0 || options.delimiter === null || options.delimiter === false) {
      options.delimiter = Buffer.from(",", options.encoding);
    }
    options.delimiter = [options.delimiter];
  }
  options.delimiter = options.delimiter.map(function(delimiter) {
    if (typeof delimiter === "string") {
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if (!Buffer.isBuffer(delimiter) || delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_DELIMITER",
        [
          "Invalid option delimiter:",
          "delimiter must be a non empty string or buffer or array of string|buffer,",
          `got ${delimiter_json}`
        ],
        options
      );
    }
    return delimiter;
  });
  if (options.escape === void 0 || options.escape === true) {
    options.escape = Buffer.from('"', options.encoding);
  } else if (typeof options.escape === "string") {
    options.escape = Buffer.from(options.escape, options.encoding);
  } else if (options.escape === null || options.escape === false) {
    options.escape = null;
  }
  if (options.escape !== null) {
    if (!Buffer.isBuffer(options.escape)) {
      throw new Error(
        `Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`
      );
    }
  }
  if (options.from === void 0 || options.from === null) {
    options.from = 1;
  } else {
    if (typeof options.from === "string" && /\d+/.test(options.from)) {
      options.from = parseInt(options.from);
    }
    if (Number.isInteger(options.from)) {
      if (options.from < 0) {
        throw new Error(
          `Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`
      );
    }
  }
  if (options.from_line === void 0 || options.from_line === null) {
    options.from_line = 1;
  } else {
    if (typeof options.from_line === "string" && /\d+/.test(options.from_line)) {
      options.from_line = parseInt(options.from_line);
    }
    if (Number.isInteger(options.from_line)) {
      if (options.from_line <= 0) {
        throw new Error(
          `Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`
      );
    }
  }
  if (options.ignore_last_delimiters === void 0 || options.ignore_last_delimiters === null) {
    options.ignore_last_delimiters = false;
  } else if (typeof options.ignore_last_delimiters === "number") {
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if (options.ignore_last_delimiters === 0) {
      options.ignore_last_delimiters = false;
    }
  } else if (typeof options.ignore_last_delimiters !== "boolean") {
    throw new CsvError(
      "CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS",
      [
        "Invalid option `ignore_last_delimiters`:",
        "the value must be a boolean value or an integer,",
        `got ${JSON.stringify(options.ignore_last_delimiters)}`
      ],
      options
    );
  }
  if (options.ignore_last_delimiters === true && options.columns === false) {
    throw new CsvError(
      "CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS",
      [
        "The option `ignore_last_delimiters`",
        "requires the activation of the `columns` option"
      ],
      options
    );
  }
  if (options.info === void 0 || options.info === null || options.info === false) {
    options.info = false;
  } else if (options.info !== true) {
    throw new Error(
      `Invalid Option: info must be true, got ${JSON.stringify(options.info)}`
    );
  }
  if (options.max_record_size === void 0 || options.max_record_size === null || options.max_record_size === false) {
    options.max_record_size = 0;
  } else if (Number.isInteger(options.max_record_size) && options.max_record_size >= 0) {
  } else if (typeof options.max_record_size === "string" && /\d+/.test(options.max_record_size)) {
    options.max_record_size = parseInt(options.max_record_size);
  } else {
    throw new Error(
      `Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`
    );
  }
  if (options.objname === void 0 || options.objname === null || options.objname === false) {
    options.objname = void 0;
  } else if (Buffer.isBuffer(options.objname)) {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if (options.encoding === null) {
    } else {
      options.objname = options.objname.toString(options.encoding);
    }
  } else if (typeof options.objname === "string") {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
  } else if (typeof options.objname === "number") {
  } else {
    throw new Error(
      `Invalid Option: objname must be a string or a buffer, got ${options.objname}`
    );
  }
  if (options.objname !== void 0) {
    if (typeof options.objname === "number") {
      if (options.columns !== false) {
        throw Error(
          "Invalid Option: objname index cannot be combined with columns or be defined as a field"
        );
      }
    } else {
      if (options.columns === false) {
        throw Error(
          "Invalid Option: objname field must be combined with columns or be defined as an index"
        );
      }
    }
  }
  if (options.on_record === void 0 || options.on_record === null) {
    options.on_record = void 0;
  } else if (typeof options.on_record !== "function") {
    throw new CsvError(
      "CSV_INVALID_OPTION_ON_RECORD",
      [
        "Invalid option `on_record`:",
        "expect a function,",
        `got ${JSON.stringify(options.on_record)}`
      ],
      options
    );
  }
  if (options.on_skip !== void 0 && options.on_skip !== null && typeof options.on_skip !== "function") {
    throw new Error(
      `Invalid Option: on_skip must be a function, got ${JSON.stringify(options.on_skip)}`
    );
  }
  if (options.quote === null || options.quote === false || options.quote === "") {
    options.quote = null;
  } else {
    if (options.quote === void 0 || options.quote === true) {
      options.quote = Buffer.from('"', options.encoding);
    } else if (typeof options.quote === "string") {
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if (!Buffer.isBuffer(options.quote)) {
      throw new Error(
        `Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`
      );
    }
  }
  if (options.raw === void 0 || options.raw === null || options.raw === false) {
    options.raw = false;
  } else if (options.raw !== true) {
    throw new Error(
      `Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`
    );
  }
  if (options.record_delimiter === void 0) {
    options.record_delimiter = [];
  } else if (typeof options.record_delimiter === "string" || Buffer.isBuffer(options.record_delimiter)) {
    if (options.record_delimiter.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer,",
          `got ${JSON.stringify(options.record_delimiter)}`
        ],
        options
      );
    }
    options.record_delimiter = [options.record_delimiter];
  } else if (!Array.isArray(options.record_delimiter)) {
    throw new CsvError(
      "CSV_INVALID_OPTION_RECORD_DELIMITER",
      [
        "Invalid option `record_delimiter`:",
        "value must be a string, a buffer or array of string|buffer,",
        `got ${JSON.stringify(options.record_delimiter)}`
      ],
      options
    );
  }
  options.record_delimiter = options.record_delimiter.map(function(rd, i) {
    if (typeof rd !== "string" && !Buffer.isBuffer(rd)) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a string, a buffer or array of string|buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    } else if (rd.length === 0) {
      throw new CsvError(
        "CSV_INVALID_OPTION_RECORD_DELIMITER",
        [
          "Invalid option `record_delimiter`:",
          "value must be a non empty string or buffer",
          `at index ${i},`,
          `got ${JSON.stringify(rd)}`
        ],
        options
      );
    }
    if (typeof rd === "string") {
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  if (typeof options.relax_column_count === "boolean") {
  } else if (options.relax_column_count === void 0 || options.relax_column_count === null) {
    options.relax_column_count = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`
    );
  }
  if (typeof options.relax_column_count_less === "boolean") {
  } else if (options.relax_column_count_less === void 0 || options.relax_column_count_less === null) {
    options.relax_column_count_less = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`
    );
  }
  if (typeof options.relax_column_count_more === "boolean") {
  } else if (options.relax_column_count_more === void 0 || options.relax_column_count_more === null) {
    options.relax_column_count_more = false;
  } else {
    throw new Error(
      `Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`
    );
  }
  if (typeof options.relax_quotes === "boolean") {
  } else if (options.relax_quotes === void 0 || options.relax_quotes === null) {
    options.relax_quotes = false;
  } else {
    throw new Error(
      `Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`
    );
  }
  if (typeof options.skip_empty_lines === "boolean") {
  } else if (options.skip_empty_lines === void 0 || options.skip_empty_lines === null) {
    options.skip_empty_lines = false;
  } else {
    throw new Error(
      `Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`
    );
  }
  if (typeof options.skip_records_with_empty_values === "boolean") {
  } else if (options.skip_records_with_empty_values === void 0 || options.skip_records_with_empty_values === null) {
    options.skip_records_with_empty_values = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`
    );
  }
  if (typeof options.skip_records_with_error === "boolean") {
  } else if (options.skip_records_with_error === void 0 || options.skip_records_with_error === null) {
    options.skip_records_with_error = false;
  } else {
    throw new Error(
      `Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`
    );
  }
  if (options.rtrim === void 0 || options.rtrim === null || options.rtrim === false) {
    options.rtrim = false;
  } else if (options.rtrim !== true) {
    throw new Error(
      `Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`
    );
  }
  if (options.ltrim === void 0 || options.ltrim === null || options.ltrim === false) {
    options.ltrim = false;
  } else if (options.ltrim !== true) {
    throw new Error(
      `Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`
    );
  }
  if (options.trim === void 0 || options.trim === null || options.trim === false) {
    options.trim = false;
  } else if (options.trim !== true) {
    throw new Error(
      `Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`
    );
  }
  if (options.trim === true && opts.ltrim !== false) {
    options.ltrim = true;
  } else if (options.ltrim !== true) {
    options.ltrim = false;
  }
  if (options.trim === true && opts.rtrim !== false) {
    options.rtrim = true;
  } else if (options.rtrim !== true) {
    options.rtrim = false;
  }
  if (options.to === void 0 || options.to === null) {
    options.to = -1;
  } else if (options.to !== -1) {
    if (typeof options.to === "string" && /\d+/.test(options.to)) {
      options.to = parseInt(options.to);
    }
    if (Number.isInteger(options.to)) {
      if (options.to <= 0) {
        throw new Error(
          `Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`
      );
    }
  }
  if (options.to_line === void 0 || options.to_line === null) {
    options.to_line = -1;
  } else if (options.to_line !== -1) {
    if (typeof options.to_line === "string" && /\d+/.test(options.to_line)) {
      options.to_line = parseInt(options.to_line);
    }
    if (Number.isInteger(options.to_line)) {
      if (options.to_line <= 0) {
        throw new Error(
          `Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`
        );
      }
    } else {
      throw new Error(
        `Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`
      );
    }
  }
  return options;
}, "normalize_options");

// node_modules/csv-parse/lib/utils/delimiter_discover.js
var delimiter_discover = /* @__PURE__ */ __name(function(records, options) {
  if (!options) {
    ({ delimiter_auto: options } = normalize_options({ delimiter_auto: true }));
  }
  if (typeof records === "string") {
    records = Buffer.from(records);
  }
  if (Buffer.isBuffer(records)) {
    records = ((data) => {
      const records2 = [];
      const parser = transform({ delimiter: [] });
      const push = /* @__PURE__ */ __name((record) => records2.push(record), "push");
      const close = /* @__PURE__ */ __name(() => {
      }, "close");
      const error3 = parser.parse(data, true, push, close);
      if (error3 !== void 0) throw error3;
      return records2;
    })(records);
  }
  const info3 = Array(127).fill().map(() => ({ lines: [] }));
  records.map(([record], line) => {
    for (let i = 0, l = record.length; i < l; i++) {
      const code = record.charCodeAt(i);
      if (info3[code].lines[line] === void 0) info3[code].lines[line] = 0;
      info3[code].lines[line]++;
    }
  });
  info3.map((info4, i) => {
    info4.char_code = i;
    info4.std = std(info4.lines);
    info4.total = info4.lines.reduce((acc, val) => acc + val, 0);
    info4.preferred = !!options.preferred[i];
    info4.score = options.score(info4, options);
  });
  const result = info3.reduce(
    (acc, info4) => acc.score > info4.score ? acc : info4,
    {}
  );
  return String.fromCharCode(result.char_code);
}, "delimiter_discover");
var std = /* @__PURE__ */ __name(function(array) {
  const n = array.length;
  if (n === 0) return 0;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(
    array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n
  );
}, "std");

// node_modules/csv-parse/lib/api/index.js
var isRecordEmpty = /* @__PURE__ */ __name(function(record) {
  return record.every(
    (field) => field == null || field.toString && field.toString().trim() === ""
  );
}, "isRecordEmpty");
var cr = 13;
var nl = 10;
var boms = {
  // Note, the following are equals:
  // Buffer.from("\ufeff")
  // Buffer.from([239, 187, 191])
  // Buffer.from('EFBBBF', 'hex')
  utf8: Buffer.from([239, 187, 191]),
  // Note, the following are equals:
  // Buffer.from "\ufeff", 'utf16le
  // Buffer.from([255, 254])
  utf16le: Buffer.from([255, 254])
};
var transform = /* @__PURE__ */ __name(function(original_options = {}) {
  const info3 = {
    bytes: 0,
    bytes_records: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0
  };
  const options = normalize_options(original_options);
  return {
    info: info3,
    original_options,
    options,
    state: init_state(options),
    __needMoreData: /* @__PURE__ */ __name(function(i, bufLen, end) {
      if (end) return false;
      const { encoding, escape, quote } = this.options;
      const { quoting, needMoreDataSize, recordDelimiterMaxLength } = this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(
        needMoreDataSize,
        // Skip if the remaining buffer smaller than record delimiter
        // If "record_delimiter" is yet to be discovered:
        // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
        // 2. We set the length to windows line ending in the current encoding
        // Note, that encoding is known from user or bom discovery at that point
        // recordDelimiterMaxLength,
        recordDelimiterMaxLength === 0 ? Buffer.from("\r\n", encoding).length : recordDelimiterMaxLength,
        // Skip if remaining buffer can be an escaped quote
        quoting ? (escape === null ? 0 : escape.length) + quote.length : 0,
        // Skip if remaining buffer can be record delimiter following the closing quote
        quoting ? quote.length + recordDelimiterMaxLength : 0
      );
      return numOfCharLeft < requiredLength;
    }, "__needMoreData"),
    // Central parser implementation
    parse: /* @__PURE__ */ __name(function(nextBuf, end, push, close) {
      const {
        bom,
        comment_no_infix,
        delimiter_auto,
        encoding,
        from_line,
        ltrim,
        max_record_size,
        raw,
        relax_quotes,
        rtrim,
        skip_empty_lines,
        to,
        to_line
      } = this.options;
      let { comment, escape, quote, record_delimiter } = this.options;
      const {
        bomSkipped,
        delimiterDiscovered,
        delimiterBufPrevious,
        rawBuffer,
        escapeIsQuote
      } = this.state;
      if (!delimiterDiscovered && delimiter_auto) {
        let delimiterBuf;
        if (delimiterBufPrevious === void 0) {
          delimiterBuf = nextBuf;
        } else if (delimiterBufPrevious !== void 0 && nextBuf === void 0) {
          delimiterBuf = delimiterBufPrevious;
        } else {
          delimiterBuf = Buffer.concat([delimiterBufPrevious, nextBuf]);
        }
        nextBuf = void 0;
        if (end || delimiterBuf.length > delimiter_auto.size) {
          this.options.delimiter = [
            Buffer.from(
              delimiter_discover(delimiterBuf, this.options.delimiter_auto)
            )
          ];
          this.state.previousBuf = delimiterBuf;
          this.state.delimiterBufPrevious = void 0;
          this.state.delimiterDiscovered = true;
        } else {
          this.state.delimiterBufPrevious = delimiterBuf;
          return;
        }
      }
      const { previousBuf } = this.state;
      let buf;
      if (previousBuf === void 0) {
        if (nextBuf === void 0) {
          close();
          return;
        } else {
          buf = nextBuf;
        }
      } else if (previousBuf !== void 0 && nextBuf === void 0) {
        buf = previousBuf;
      } else {
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      if (bomSkipped === false) {
        if (bom === false) {
          this.state.bomSkipped = true;
        } else if (buf.length < 3) {
          if (end === false) {
            this.state.previousBuf = buf;
            return;
          }
        } else {
          for (const encoding2 in boms) {
            if (boms[encoding2].compare(buf, 0, boms[encoding2].length) === 0) {
              const bomLength = boms[encoding2].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              const options2 = normalize_options({
                ...this.original_options,
                encoding: encoding2
              });
              for (const key in options2) {
                this.options[key] = options2[key];
              }
              ({ comment, escape, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for (pos = 0; pos < bufLen; pos++) {
        if (this.__needMoreData(pos, bufLen, end)) {
          break;
        }
        if (this.state.wasRowDelimiter === true) {
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if (to_line !== -1 && this.info.lines > to_line) {
          this.state.stop = true;
          close();
          return;
        }
        if (this.state.quoting === false && record_delimiter.length === 0) {
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(
            buf,
            pos
          );
          if (record_delimiterCount) {
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if (raw === true) {
          rawBuffer.append(chr);
        }
        if ((chr === cr || chr === nl) && this.state.wasRowDelimiter === false) {
          this.state.wasRowDelimiter = true;
        }
        if (this.state.escaping === true) {
          this.state.escaping = false;
        } else {
          if (escape !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape.length < bufLen) {
            if (escapeIsQuote) {
              if (this.__isQuote(buf, pos + escape.length)) {
                this.state.escaping = true;
                pos += escape.length - 1;
                continue;
              }
            } else {
              this.state.escaping = true;
              pos += escape.length - 1;
              continue;
            }
          }
          if (this.state.commenting === false && this.__isQuote(buf, pos)) {
            if (this.state.quoting === true) {
              const nextChr = buf[pos + quote.length];
              const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos + quote.length);
              const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos + quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(
                buf,
                pos + quote.length,
                nextChr
              );
              const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos + quote.length) : this.__isRecordDelimiter(nextChr, buf, pos + quote.length);
              if (escape !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape.length)) {
                pos += escape.length - 1;
              } else if (!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable) {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              } else if (relax_quotes === false) {
                const err = this.__error(
                  new CsvError(
                    "CSV_INVALID_CLOSING_QUOTE",
                    [
                      "Invalid Closing Quote:",
                      `got "${String.fromCharCode(nextChr)}"`,
                      `at line ${this.info.lines}`,
                      "instead of delimiter, record delimiter, trimable character",
                      "(if activated) or comment"
                    ],
                    this.options,
                    this.__infoField()
                  )
                );
                if (err !== void 0) return err;
              } else {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            } else {
              if (this.state.field.length !== 0) {
                if (relax_quotes === false) {
                  const info4 = this.__infoField();
                  const bom2 = Object.keys(boms).map(
                    (b) => boms[b].equals(this.state.field.toString()) ? b : false
                  ).filter(Boolean)[0];
                  const err = this.__error(
                    new CsvError(
                      "INVALID_OPENING_QUOTE",
                      [
                        "Invalid Opening Quote:",
                        `a quote is found on field ${JSON.stringify(info4.column)} at line ${info4.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                        bom2 ? `(${bom2} bom)` : void 0
                      ],
                      this.options,
                      info4,
                      {
                        field: this.state.field
                      }
                    )
                  );
                  if (err !== void 0) return err;
                }
              } else {
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if (this.state.quoting === false) {
            const recordDelimiterLength = this.__isRecordDelimiter(
              chr,
              buf,
              pos
            );
            if (recordDelimiterLength !== 0) {
              const skipCommentLine = this.state.commenting && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0;
              if (skipCommentLine) {
                this.info.comment_lines++;
              } else {
                if (this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1 : 0) >= from_line) {
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                if (skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0) {
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if (errField !== void 0) return errField;
                this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if (errRecord !== void 0) return errRecord;
                if (to !== -1 && this.info.records >= to) {
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if (this.state.commenting) {
              continue;
            }
            if (comment !== null && (comment_no_infix === false || this.state.record.length === 0 && this.state.field.length === 0)) {
              const commentCount = this.__compareBytes(comment, buf, pos, chr);
              if (commentCount !== 0) {
                this.state.commenting = true;
                continue;
              }
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if (delimiterLength !== 0) {
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if (errField !== void 0) return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if (this.state.commenting === false) {
          if (max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size) {
            return this.__error(
              new CsvError(
                "CSV_MAX_RECORD_SIZE",
                [
                  "Max Record Size:",
                  "record exceed the maximum number of tolerated bytes",
                  `of ${max_record_size}`,
                  `at line ${this.info.lines}`
                ],
                this.options,
                this.__infoField()
              )
            );
          }
        }
        const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if (lappend === true && rappend === true) {
          this.state.field.append(chr);
        } else if (rtrim === true && !this.__isCharTrimable(buf, pos)) {
          return this.__error(
            new CsvError(
              "CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE",
              [
                "Invalid Closing Quote:",
                "found non trimable byte after quote",
                `at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
        } else {
          if (lappend === false) {
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if (end === true) {
        if (this.state.quoting === true) {
          const err = this.__error(
            new CsvError(
              "CSV_QUOTE_NOT_CLOSED",
              [
                "Quote Not Closed:",
                `the parsing is finished with an opening quote at line ${this.info.lines}`
              ],
              this.options,
              this.__infoField()
            )
          );
          if (err !== void 0) return err;
        } else {
          if (this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0) {
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if (errField !== void 0) return errField;
            const errRecord = this.__onRecord(push);
            if (errRecord !== void 0) return errRecord;
          } else if (this.state.wasRowDelimiter === true) {
            this.info.empty_lines++;
          } else if (this.state.commenting === true) {
            this.info.comment_lines++;
          }
        }
      } else {
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if (this.state.wasRowDelimiter === true) {
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    }, "parse"),
    __onRecord: /* @__PURE__ */ __name(function(push) {
      const {
        columns,
        group_columns_by_name,
        encoding,
        info: info4,
        from,
        relax_column_count,
        relax_column_count_less,
        relax_column_count_more,
        raw,
        skip_records_with_empty_values
      } = this.options;
      const { enabled, record } = this.state;
      if (enabled === false) {
        return this.__resetRecord();
      }
      const recordLength = record.length;
      if (columns === true) {
        if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record);
      }
      if (columns === false && this.info.records === 0) {
        this.state.expectedRecordLength = recordLength;
      }
      if (recordLength !== this.state.expectedRecordLength) {
        const err = columns === false ? new CsvError(
          "CSV_RECORD_INCONSISTENT_FIELDS_LENGTH",
          [
            "Invalid Record Length:",
            `expect ${this.state.expectedRecordLength},`,
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        ) : new CsvError(
          "CSV_RECORD_INCONSISTENT_COLUMNS",
          [
            "Invalid Record Length:",
            `columns length is ${columns.length},`,
            // rename columns
            `got ${recordLength} on line ${this.info.lines}`
          ],
          this.options,
          this.__infoField(),
          {
            record
          }
        );
        if (relax_column_count === true || relax_column_count_less === true && recordLength < this.state.expectedRecordLength || relax_column_count_more === true && recordLength > this.state.expectedRecordLength) {
          this.info.invalid_field_length++;
          this.state.error = err;
        } else {
          const finalErr = this.__error(err);
          if (finalErr) return finalErr;
        }
      }
      if (skip_records_with_empty_values === true && isRecordEmpty(record)) {
        this.__resetRecord();
        return;
      }
      if (this.state.recordHasError === true) {
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if (from === 1 || this.info.records >= from) {
        const { objname } = this.options;
        if (columns !== false) {
          const obj = {};
          for (let i = 0, l = record.length; i < l; i++) {
            if (columns[i] === void 0 || columns[i].disabled) continue;
            if (group_columns_by_name === true && Object.hasOwn(obj, columns[i].name)) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record[i]];
              }
            } else {
              Object.defineProperty(obj, columns[i].name, {
                value: record[i],
                enumerable: true,
                writable: true,
                configurable: true
              });
            }
          }
          if (raw === true || info4 === true) {
            const extRecord = Object.assign(
              { record: obj },
              raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info4 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [obj[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? obj : [obj[objname], obj],
              push
            );
            if (err) {
              return err;
            }
          }
        } else {
          if (raw === true || info4 === true) {
            const extRecord = Object.assign(
              { record },
              raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {},
              info4 === true ? { info: this.__infoRecord() } : {}
            );
            const err = this.__push(
              objname === void 0 ? extRecord : [record[objname], extRecord],
              push
            );
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(
              objname === void 0 ? record : [record[objname], record],
              push
            );
            if (err) {
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    }, "__onRecord"),
    __firstLineToColumns: /* @__PURE__ */ __name(function(record) {
      const { firstLineToHeaders } = this.state;
      try {
        const headers = firstLineToHeaders === void 0 ? record : firstLineToHeaders.call(null, record);
        if (!Array.isArray(headers)) {
          return this.__error(
            new CsvError(
              "CSV_INVALID_COLUMN_MAPPING",
              [
                "Invalid Column Mapping:",
                "expect an array from column function,",
                `got ${JSON.stringify(headers)}`
              ],
              this.options,
              this.__infoField(),
              {
                headers
              }
            )
          );
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      } catch (err) {
        return err;
      }
    }, "__firstLineToColumns"),
    __resetRecord: /* @__PURE__ */ __name(function() {
      if (this.options.raw === true) {
        this.state.rawBuffer.reset();
      }
      this.state.error = void 0;
      this.state.record = [];
      this.state.record_length = 0;
    }, "__resetRecord"),
    __onField: /* @__PURE__ */ __name(function() {
      const { cast, encoding, rtrim, max_record_size } = this.options;
      const { enabled, wasQuoting } = this.state;
      if (enabled === false) {
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if (rtrim === true && wasQuoting === false) {
        field = field.trimRight();
      }
      if (cast === true) {
        const [err, f] = this.__cast(field);
        if (err !== void 0) return err;
        field = f;
      }
      this.state.record.push(field);
      if (max_record_size !== 0 && typeof field === "string") {
        this.state.record_length += field.length;
      }
      this.__resetField();
    }, "__onField"),
    __resetField: /* @__PURE__ */ __name(function() {
      this.state.field.reset();
      this.state.wasQuoting = false;
    }, "__resetField"),
    __push: /* @__PURE__ */ __name(function(record, push) {
      const { on_record } = this.options;
      if (on_record !== void 0) {
        const info4 = this.__infoRecord();
        try {
          record = on_record.call(null, record, info4);
        } catch (err) {
          return err;
        }
        if (record === void 0 || record === null) {
          return;
        }
      }
      this.info.bytes_records += this.info.bytes;
      push(record);
    }, "__push"),
    // Return a tuple with the error and the casted value
    __cast: /* @__PURE__ */ __name(function(field) {
      const { columns, relax_column_count } = this.options;
      const isColumns = Array.isArray(columns);
      if (isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length) {
        return [void 0, void 0];
      }
      if (this.state.castField !== null) {
        try {
          const info4 = this.__infoField();
          return [void 0, this.state.castField.call(null, field, info4)];
        } catch (err) {
          return [err];
        }
      }
      if (this.__isFloat(field)) {
        return [void 0, parseFloat(field)];
      } else if (this.options.cast_date !== false) {
        const info4 = this.__infoField();
        return [void 0, this.options.cast_date.call(null, field, info4)];
      }
      return [void 0, field];
    }, "__cast"),
    __compareBytes: /* @__PURE__ */ __name(function(sourceBuf, targetBuf, targetPos, firstByte) {
      if (sourceBuf[0] !== firstByte) return 0;
      const sourceLength = sourceBuf.length;
      for (let i = 1; i < sourceLength; i++) {
        if (sourceBuf[i] !== targetBuf[targetPos + i]) return 0;
      }
      return sourceLength;
    }, "__compareBytes"),
    // Helper to test if a character is trimable
    __isCharTrimable: /* @__PURE__ */ __name(function(buf, pos) {
      const { timchars, timcharFirstBytes } = this.state;
      const first = buf[pos];
      if (first === void 0 || timcharFirstBytes[first] === 0) return 0;
      loop1: for (let i = 0; i < timchars.length; i++) {
        const timchar = timchars[i];
        for (let j = 0; j < timchar.length; j++) {
          if (timchar[j] !== buf[pos + j]) continue loop1;
        }
        return timchar.length;
      }
      return 0;
    }, "__isCharTrimable"),
    __isDelimiter: /* @__PURE__ */ __name(function(buf, pos, chr) {
      const { delimiter, ignore_last_delimiters } = this.options;
      if (ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1) {
        return 0;
      } else if (ignore_last_delimiters !== false && typeof ignore_last_delimiters === "number" && this.state.record.length === ignore_last_delimiters - 1) {
        return 0;
      }
      loop1: for (let i = 0; i < delimiter.length; i++) {
        const del = delimiter[i];
        if (del[0] === chr) {
          for (let j = 1; j < del.length; j++) {
            if (del[j] !== buf[pos + j]) continue loop1;
          }
          return del.length;
        }
      }
      return 0;
    }, "__isDelimiter"),
    __isEscape: /* @__PURE__ */ __name(function(buf, pos, chr) {
      const { escape } = this.options;
      if (escape === null) return false;
      const l = escape.length;
      if (escape[0] === chr) {
        for (let i = 0; i < l; i++) {
          if (escape[i] !== buf[pos + i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    }, "__isEscape"),
    __isFloat: /* @__PURE__ */ __name(function(value) {
      return value - parseFloat(value) + 1 >= 0;
    }, "__isFloat"),
    // Keep it in case we implement the `cast_int` option
    // __isInt(value){
    //   // return Number.isInteger(parseInt(value))
    //   // return !isNaN( parseInt( obj ) );
    //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
    // }
    __isQuote: /* @__PURE__ */ __name(function(buf, pos) {
      const { quote } = this.options;
      if (quote === null) return false;
      const l = quote.length;
      for (let i = 0; i < l; i++) {
        if (quote[i] !== buf[pos + i]) {
          return false;
        }
      }
      return true;
    }, "__isQuote"),
    __isRecordDelimiter: /* @__PURE__ */ __name(function(chr, buf, pos) {
      const { record_delimiter } = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1: for (let i = 0; i < recordDelimiterLength; i++) {
        const rd = record_delimiter[i];
        const rdLength = rd.length;
        if (rd[0] !== chr) {
          continue;
        }
        for (let j = 1; j < rdLength; j++) {
          if (rd[j] !== buf[pos + j]) {
            continue loop1;
          }
        }
        return rd.length;
      }
      return 0;
    }, "__isRecordDelimiter"),
    __autoDiscoverRecordDelimiter: /* @__PURE__ */ __name(function(buf, pos) {
      const { encoding } = this.options;
      const rds = [
        // Important, the windows line ending must be before mac os 9
        Buffer.from("\r\n", encoding),
        Buffer.from("\n", encoding),
        Buffer.from("\r", encoding)
      ];
      loop: for (let i = 0; i < rds.length; i++) {
        const l = rds[i].length;
        for (let j = 0; j < l; j++) {
          if (rds[i][j] !== buf[pos + j]) {
            continue loop;
          }
        }
        this.options.record_delimiter.push(rds[i]);
        this.state.recordDelimiterMaxLength = rds[i].length;
        return rds[i].length;
      }
      return 0;
    }, "__autoDiscoverRecordDelimiter"),
    __error: /* @__PURE__ */ __name(function(msg) {
      const { encoding, raw, skip_records_with_error } = this.options;
      const err = typeof msg === "string" ? new Error(msg) : msg;
      if (skip_records_with_error) {
        this.state.recordHasError = true;
        if (this.options.on_skip !== void 0) {
          try {
            this.options.on_skip(
              err,
              raw ? this.state.rawBuffer.toString(encoding) : void 0
            );
          } catch (err2) {
            return err2;
          }
        }
        return void 0;
      } else {
        return err;
      }
    }, "__error"),
    __infoDataSet: /* @__PURE__ */ __name(function() {
      return {
        ...this.info,
        columns: this.options.columns
      };
    }, "__infoDataSet"),
    __infoRecord: /* @__PURE__ */ __name(function() {
      const { columns, raw, encoding } = this.options;
      return {
        ...this.__infoDataSet(),
        bytes_records: this.info.bytes,
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw ? this.state.rawBuffer.toString(encoding) : void 0
      };
    }, "__infoRecord"),
    __infoField: /* @__PURE__ */ __name(function() {
      const { columns } = this.options;
      const isColumns = Array.isArray(columns);
      const bytes_records = this.info.bytes_records;
      return {
        ...this.__infoRecord(),
        bytes_records,
        column: isColumns === true ? columns.length > this.state.record.length ? columns[this.state.record.length].name : null : this.state.record.length,
        quoting: this.state.wasQuoting
      };
    }, "__infoField")
  };
}, "transform");

// node_modules/csv-parse/lib/sync.js
var parse = /* @__PURE__ */ __name(function(data, opts = {}) {
  if (typeof data === "string") {
    data = Buffer.from(data);
  }
  const records = opts && opts.objname ? /* @__PURE__ */ Object.create(null) : [];
  const parser = transform(opts);
  const push = /* @__PURE__ */ __name((record) => {
    if (parser.options.objname === void 0) records.push(record);
    else {
      records[record[0]] = record[1];
    }
  }, "push");
  const close = /* @__PURE__ */ __name(() => {
  }, "close");
  const error3 = parser.parse(data, true, push, close);
  if (error3 !== void 0) throw error3;
  return records;
}, "parse");

// src/lib/geocode.js
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "user-agent": "LeadFlow/1.0 (internal lead-gen tool)" } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: hit.lat, lon: hit.lon } : null;
}
__name(geocode, "geocode");

// src/lib/capability.js
var CONCURRENCY = 6;
var TIMEOUT_MS = 1e4;
var UA = "Mozilla/5.0 (compatible; LeadFlow/1.0)";
var SIGNALS = {
  ordering: /order\s*online|online\s*order|order\s*now|add to cart|checkout|start\s*(your\s*)?order|scan to order|qr\s*menu|digital\s*menu/,
  booking: /book\s*(a\s*)?table|reserv(e|ation)|book\s*(an\s*)?appointment|book\s*now|schedule\s*(a\s*)?(visit|call|demo)|enquiry\s*form|admission\s*form/,
  delivery: /home\s*delivery|free\s*delivery|doorstep|takeaway|take\s*away|parcel|self\s*pickup/
};
var SOCIAL_HOST = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|wa\.me|whatsapp\.com|linktr\.ee|youtube\.com|business\.site|zomato\.com|swiggy\.com|dotpe\.in)$/;
function socialName(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!SOCIAL_HOST.test(host)) return null;
    if (/instagram/.test(host)) return "Instagram page";
    if (/facebook|fb\.com/.test(host)) return "Facebook page";
    if (/wa\.me|whatsapp/.test(host)) return "WhatsApp link";
    if (/zomato|swiggy/.test(host)) return "aggregator listing";
    if (/business\.site/.test(host)) return "Google business page";
    return "social link";
  } catch {
    return null;
  }
}
__name(socialName, "socialName");
var isSocialOnly = /* @__PURE__ */ __name((url) => socialName(url) !== null, "isSocialOnly");
function describe(website, probe) {
  const url = (website || "").trim();
  if (!url) return "No website";
  const social = socialName(url);
  if (social) return `No real website \u2014 ${social} only`;
  if (!probe || !probe.reachable) return "Website broken / dead";
  const has = {};
  for (const [name, re] of Object.entries(SIGNALS)) has[name] = re.test(probe.html);
  if (has.ordering && has.booking && has.delivery) return "Full webapp \u2014 ordering, booking, delivery";
  const parts = [];
  if (has.ordering) parts.push("online ordering");
  if (has.booking) parts.push("online booking");
  if (has.delivery) parts.push("delivery");
  if (!parts.length) return "Website only \u2014 no online booking";
  return `Website + ${parts.join(", ")}`;
}
__name(describe, "describe");
async function probeSite(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) return { reachable: false };
    const html = (await res.text()).slice(0, 4e5).toLowerCase();
    return { reachable: true, html };
  } catch {
    return { reachable: false };
  }
}
__name(probeSite, "probeSite");
async function mapPool(items, limit, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}
__name(mapPool, "mapPool");
async function addCapabilities(rows) {
  const needsProbe = rows.filter((r) => (r.website || "").trim() && !isSocialOnly(r.website.trim()));
  const probes = /* @__PURE__ */ new Map();
  await mapPool(needsProbe, CONCURRENCY, async (r) => {
    probes.set(r, await probeSite(r.website.trim()));
  });
  return rows.map((r) => ({ ...r, capability: describe(r.website, probes.get(r)) }));
}
__name(addCapabilities, "addCapabilities");

// src/leadgen-api.js
var SCRAPER_BASE = "http://localhost:8080";
function fail2(message, status) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
__name(fail2, "fail");
function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}
__name(normalizePhone, "normalizePhone");
function splitAddress(address) {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  const withoutCountry = parts.length > 1 && /^india$/i.test(parts.at(-1)) ? parts.slice(0, -1) : parts;
  const state = (withoutCountry.at(-1) || "").replace(/\s*\d{6}\s*$/, "").trim();
  const city = withoutCountry.at(-2) || "";
  const area = withoutCountry.at(-3) || "";
  return { area, city, state };
}
__name(splitAddress, "splitAddress");
async function startScrape({ env: env2, body, user }) {
  const category = String(body.category || "").trim();
  const city = String(body.city || "").trim();
  const area = String(body.area || "").trim();
  if (!category || !city) fail2("Category and city are required", 422);
  const keyword = area ? `${category} in ${area} ${city}` : `${category} in ${city}`;
  const loc = await geocode(area ? `${area}, ${city}` : city);
  if (!loc) fail2("Could not find that location", 422);
  const res = await fetch(`${SCRAPER_BASE}/api/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: keyword,
      keywords: [keyword],
      lang: "en",
      zoom: 15,
      lat: loc.lat,
      lon: loc.lon,
      fast_mode: false,
      radius: 1e4,
      depth: body.depth ? Number(body.depth) : 5,
      email: true,
      max_time: 300
    })
  });
  if (!res.ok) fail2("Scraper request failed \u2014 is the scraper container running? (docker compose up -d)", 502);
  const { id } = await res.json();
  await env2.DB.prepare(
    `INSERT INTO scrape_jobs (id, category, area, city, keyword, status, created_by) VALUES (?, ?, ?, ?, ?, 'working', ?)`
  ).bind(id, category, area || null, city, keyword, user.id).run();
  return { id };
}
__name(startScrape, "startScrape");
async function pollScrape({ env: env2, params }) {
  const job = await env2.DB.prepare("SELECT * FROM scrape_jobs WHERE id = ?").bind(params.id).first();
  if (!job) fail2("No such scrape job", 404);
  if (job.status === "done" || job.status === "failed") return { job };
  const res = await fetch(`${SCRAPER_BASE}/api/v1/jobs/${job.id}`);
  if (!res.ok) fail2("Could not reach the scraper", 502);
  const { Status } = await res.json();
  if (Status === "working") return { job };
  if (Status === "failed") {
    await env2.DB.prepare("UPDATE scrape_jobs SET status = 'failed', error = ? WHERE id = ?").bind("Scrape failed \u2014 Google may be rate-limiting this IP", job.id).run();
    return { job: { ...job, status: "failed" } };
  }
  const dl = await fetch(`${SCRAPER_BASE}/api/v1/jobs/${job.id}/download`);
  if (!dl.ok) fail2("Could not download scrape results", 502);
  const rows = parse(await dl.text(), { columns: true, skip_empty_lines: true });
  const leadRows = rows.map((r) => {
    const a = splitAddress(r.address);
    return {
      name: r.title || null,
      phone: normalizePhone(r.phone) || r.phone || null,
      website: r.website || null,
      address: r.address || null,
      area: a.area || job.area || null,
      city: a.city || job.city,
      state: a.state || null
    };
  });
  const withCapability = await addCapabilities(leadRows);
  const collection = await env2.DB.prepare(
    "INSERT INTO collections (category, city, source_csv) VALUES (?, ?, ?) RETURNING id"
  ).bind(job.category, job.city, `scrape:${job.id}`).first();
  if (withCapability.length) {
    await env2.DB.batch(
      withCapability.map(
        (r) => env2.DB.prepare(
          `INSERT INTO leads (collection_id, name, phone, website, capability, address, area, city, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(collection.id, r.name, r.phone, r.website, r.capability, r.address, r.area, r.city, r.state)
      )
    );
  }
  await env2.DB.prepare("UPDATE scrape_jobs SET status = 'done', collection_id = ? WHERE id = ?").bind(collection.id, job.id).run();
  return { job: { ...job, status: "done", collection_id: collection.id }, imported: withCapability.length };
}
__name(pollScrape, "pollScrape");
async function listScrapeJobs({ env: env2 }) {
  const { results } = await env2.DB.prepare(
    "SELECT * FROM scrape_jobs ORDER BY created_at DESC LIMIT 30"
  ).all();
  return { jobs: results };
}
__name(listScrapeJobs, "listScrapeJobs");
var routes3 = {
  "POST /api/core/scrape": startScrape,
  "GET /api/core/scrape": listScrapeJobs,
  "GET /api/core/scrape/:id": pollScrape
};

// src/index.js
var routes4 = {
  "POST /api/login": login,
  "POST /api/logout": logout,
  "POST /api/seed": seed,
  "GET /api/session": /* @__PURE__ */ __name(({ user }) => ({ user }), "GET /api/session"),
  ...routes,
  ...routes2,
  ...routes3
};
var PUBLIC = /* @__PURE__ */ new Set(["POST /api/login", "POST /api/seed", "GET /api/session"]);
function matchPath(pattern, path) {
  const p = pattern.split("/"), s = path.split("/");
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}
__name(matchPath, "matchPath");
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } }), "json");
var src_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env2.ASSETS.fetch(request);
    for (const [route, handler] of Object.entries(routes4)) {
      const [method, pattern] = route.split(" ");
      if (method !== request.method) continue;
      const params = matchPath(pattern, url.pathname);
      if (!params) continue;
      const user = await currentUser(request, env2);
      if (!PUBLIC.has(route) && !user) return json({ error: "Not logged in" }, 401);
      if (url.pathname.startsWith("/api/core/") && user?.role !== "core") {
        return json({ error: "Core team only" }, 403);
      }
      const body = request.method === "GET" ? null : await request.json().catch(() => ({}));
      try {
        const out = await handler({ request, env: env2, body, params, user, url });
        return out instanceof Response ? out : json(out ?? { ok: true });
      } catch (err) {
        return json({ error: err.message }, err.status || 500);
      }
    }
    return json({ error: "No such endpoint" }, 404);
  }
};

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-JFJRtd/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-JFJRtd/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  matchPath
};
//# sourceMappingURL=index.js.map
