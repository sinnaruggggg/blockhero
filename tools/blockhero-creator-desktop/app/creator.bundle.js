"use strict";
(() => {
  // node_modules/tslib/tslib.es6.mjs
  function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }

  // node_modules/@supabase/functions-js/dist/module/helper.js
  var resolveFetch = (customFetch) => {
    if (customFetch) {
      return (...args) => customFetch(...args);
    }
    return (...args) => fetch(...args);
  };

  // node_modules/@supabase/functions-js/dist/module/types.js
  var FunctionsError = class extends Error {
    constructor(message, name = "FunctionsError", context) {
      super(message);
      this.name = name;
      this.context = context;
    }
  };
  var FunctionsFetchError = class extends FunctionsError {
    constructor(context) {
      super("Failed to send a request to the Edge Function", "FunctionsFetchError", context);
    }
  };
  var FunctionsRelayError = class extends FunctionsError {
    constructor(context) {
      super("Relay Error invoking the Edge Function", "FunctionsRelayError", context);
    }
  };
  var FunctionsHttpError = class extends FunctionsError {
    constructor(context) {
      super("Edge Function returned a non-2xx status code", "FunctionsHttpError", context);
    }
  };
  var FunctionRegion;
  (function(FunctionRegion2) {
    FunctionRegion2["Any"] = "any";
    FunctionRegion2["ApNortheast1"] = "ap-northeast-1";
    FunctionRegion2["ApNortheast2"] = "ap-northeast-2";
    FunctionRegion2["ApSouth1"] = "ap-south-1";
    FunctionRegion2["ApSoutheast1"] = "ap-southeast-1";
    FunctionRegion2["ApSoutheast2"] = "ap-southeast-2";
    FunctionRegion2["CaCentral1"] = "ca-central-1";
    FunctionRegion2["EuCentral1"] = "eu-central-1";
    FunctionRegion2["EuWest1"] = "eu-west-1";
    FunctionRegion2["EuWest2"] = "eu-west-2";
    FunctionRegion2["EuWest3"] = "eu-west-3";
    FunctionRegion2["SaEast1"] = "sa-east-1";
    FunctionRegion2["UsEast1"] = "us-east-1";
    FunctionRegion2["UsWest1"] = "us-west-1";
    FunctionRegion2["UsWest2"] = "us-west-2";
  })(FunctionRegion || (FunctionRegion = {}));

  // node_modules/@supabase/functions-js/dist/module/FunctionsClient.js
  var FunctionsClient = class {
    /**
     * Creates a new Functions client bound to an Edge Functions URL.
     *
     * @example
     * ```ts
     * import { FunctionsClient, FunctionRegion } from '@supabase/functions-js'
     *
     * const functions = new FunctionsClient('https://xyzcompany.supabase.co/functions/v1', {
     *   headers: { apikey: 'public-anon-key' },
     *   region: FunctionRegion.UsEast1,
     * })
     * ```
     */
    constructor(url, { headers = {}, customFetch, region = FunctionRegion.Any } = {}) {
      this.url = url;
      this.headers = headers;
      this.region = region;
      this.fetch = resolveFetch(customFetch);
    }
    /**
     * Updates the authorization header
     * @param token - the new jwt token sent in the authorisation header
     * @example
     * ```ts
     * functions.setAuth(session.access_token)
     * ```
     */
    setAuth(token) {
      this.headers.Authorization = `Bearer ${token}`;
    }
    /**
     * Invokes a function
     * @param functionName - The name of the Function to invoke.
     * @param options - Options for invoking the Function.
     * @example
     * ```ts
     * const { data, error } = await functions.invoke('hello-world', {
     *   body: { name: 'Ada' },
     * })
     * ```
     */
    invoke(functionName_1) {
      return __awaiter(this, arguments, void 0, function* (functionName, options = {}) {
        var _a;
        let timeoutId;
        let timeoutController;
        try {
          const { headers, method, body: functionArgs, signal, timeout } = options;
          let _headers = {};
          let { region } = options;
          if (!region) {
            region = this.region;
          }
          const url = new URL(`${this.url}/${functionName}`);
          if (region && region !== "any") {
            _headers["x-region"] = region;
            url.searchParams.set("forceFunctionRegion", region);
          }
          let body;
          if (functionArgs && (headers && !Object.prototype.hasOwnProperty.call(headers, "Content-Type") || !headers)) {
            if (typeof Blob !== "undefined" && functionArgs instanceof Blob || functionArgs instanceof ArrayBuffer) {
              _headers["Content-Type"] = "application/octet-stream";
              body = functionArgs;
            } else if (typeof functionArgs === "string") {
              _headers["Content-Type"] = "text/plain";
              body = functionArgs;
            } else if (typeof FormData !== "undefined" && functionArgs instanceof FormData) {
              body = functionArgs;
            } else {
              _headers["Content-Type"] = "application/json";
              body = JSON.stringify(functionArgs);
            }
          } else {
            if (functionArgs && typeof functionArgs !== "string" && !(typeof Blob !== "undefined" && functionArgs instanceof Blob) && !(functionArgs instanceof ArrayBuffer) && !(typeof FormData !== "undefined" && functionArgs instanceof FormData)) {
              body = JSON.stringify(functionArgs);
            } else {
              body = functionArgs;
            }
          }
          let effectiveSignal = signal;
          if (timeout) {
            timeoutController = new AbortController();
            timeoutId = setTimeout(() => timeoutController.abort(), timeout);
            if (signal) {
              effectiveSignal = timeoutController.signal;
              signal.addEventListener("abort", () => timeoutController.abort());
            } else {
              effectiveSignal = timeoutController.signal;
            }
          }
          const response = yield this.fetch(url.toString(), {
            method: method || "POST",
            // headers priority is (high to low):
            // 1. invoke-level headers
            // 2. client-level headers
            // 3. default Content-Type header
            headers: Object.assign(Object.assign(Object.assign({}, _headers), this.headers), headers),
            body,
            signal: effectiveSignal
          }).catch((fetchError) => {
            throw new FunctionsFetchError(fetchError);
          });
          const isRelayError = response.headers.get("x-relay-error");
          if (isRelayError && isRelayError === "true") {
            throw new FunctionsRelayError(response);
          }
          if (!response.ok) {
            throw new FunctionsHttpError(response);
          }
          let responseType = ((_a = response.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "text/plain").split(";")[0].trim();
          let data;
          if (responseType === "application/json") {
            data = yield response.json();
          } else if (responseType === "application/octet-stream" || responseType === "application/pdf") {
            data = yield response.blob();
          } else if (responseType === "text/event-stream") {
            data = response;
          } else if (responseType === "multipart/form-data") {
            data = yield response.formData();
          } else {
            data = yield response.text();
          }
          return { data, error: null, response };
        } catch (error) {
          return {
            data: null,
            error,
            response: error instanceof FunctionsHttpError || error instanceof FunctionsRelayError ? error.context : void 0
          };
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      });
    }
  };

  // node_modules/@supabase/postgrest-js/dist/index.mjs
  var PostgrestError = class extends Error {
    /**
    * @example
    * ```ts
    * import PostgrestError from '@supabase/postgrest-js'
    *
    * throw new PostgrestError({
    *   message: 'Row level security prevented the request',
    *   details: 'RLS denied the insert',
    *   hint: 'Check your policies',
    *   code: 'PGRST301',
    * })
    * ```
    */
    constructor(context) {
      super(context.message);
      this.name = "PostgrestError";
      this.details = context.details;
      this.hint = context.hint;
      this.code = context.code;
    }
  };
  var PostgrestBuilder = class {
    /**
    * Creates a builder configured for a specific PostgREST request.
    *
    * @example
    * ```ts
    * import PostgrestQueryBuilder from '@supabase/postgrest-js'
    *
    * const builder = new PostgrestQueryBuilder(
    *   new URL('https://xyzcompany.supabase.co/rest/v1/users'),
    *   { headers: new Headers({ apikey: 'public-anon-key' }) }
    * )
    * ```
    */
    constructor(builder) {
      var _builder$shouldThrowO, _builder$isMaybeSingl, _builder$urlLengthLim;
      this.shouldThrowOnError = false;
      this.method = builder.method;
      this.url = builder.url;
      this.headers = new Headers(builder.headers);
      this.schema = builder.schema;
      this.body = builder.body;
      this.shouldThrowOnError = (_builder$shouldThrowO = builder.shouldThrowOnError) !== null && _builder$shouldThrowO !== void 0 ? _builder$shouldThrowO : false;
      this.signal = builder.signal;
      this.isMaybeSingle = (_builder$isMaybeSingl = builder.isMaybeSingle) !== null && _builder$isMaybeSingl !== void 0 ? _builder$isMaybeSingl : false;
      this.urlLengthLimit = (_builder$urlLengthLim = builder.urlLengthLimit) !== null && _builder$urlLengthLim !== void 0 ? _builder$urlLengthLim : 8e3;
      if (builder.fetch) this.fetch = builder.fetch;
      else this.fetch = fetch;
    }
    /**
    * If there's an error with the query, throwOnError will reject the promise by
    * throwing the error instead of returning it as part of a successful response.
    *
    * {@link https://github.com/supabase/supabase-js/issues/92}
    */
    throwOnError() {
      this.shouldThrowOnError = true;
      return this;
    }
    /**
    * Set an HTTP header for the request.
    */
    setHeader(name, value) {
      this.headers = new Headers(this.headers);
      this.headers.set(name, value);
      return this;
    }
    then(onfulfilled, onrejected) {
      var _this = this;
      if (this.schema === void 0) {
      } else if (["GET", "HEAD"].includes(this.method)) this.headers.set("Accept-Profile", this.schema);
      else this.headers.set("Content-Profile", this.schema);
      if (this.method !== "GET" && this.method !== "HEAD") this.headers.set("Content-Type", "application/json");
      const _fetch = this.fetch;
      let res = _fetch(this.url.toString(), {
        method: this.method,
        headers: this.headers,
        body: JSON.stringify(this.body),
        signal: this.signal
      }).then(async (res$1) => {
        let error = null;
        let data = null;
        let count = null;
        let status = res$1.status;
        let statusText = res$1.statusText;
        if (res$1.ok) {
          var _this$headers$get2, _res$headers$get;
          if (_this.method !== "HEAD") {
            var _this$headers$get;
            const body = await res$1.text();
            if (body === "") {
            } else if (_this.headers.get("Accept") === "text/csv") data = body;
            else if (_this.headers.get("Accept") && ((_this$headers$get = _this.headers.get("Accept")) === null || _this$headers$get === void 0 ? void 0 : _this$headers$get.includes("application/vnd.pgrst.plan+text"))) data = body;
            else data = JSON.parse(body);
          }
          const countHeader = (_this$headers$get2 = _this.headers.get("Prefer")) === null || _this$headers$get2 === void 0 ? void 0 : _this$headers$get2.match(/count=(exact|planned|estimated)/);
          const contentRange = (_res$headers$get = res$1.headers.get("content-range")) === null || _res$headers$get === void 0 ? void 0 : _res$headers$get.split("/");
          if (countHeader && contentRange && contentRange.length > 1) count = parseInt(contentRange[1]);
          if (_this.isMaybeSingle && _this.method === "GET" && Array.isArray(data)) if (data.length > 1) {
            error = {
              code: "PGRST116",
              details: `Results contain ${data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
              hint: null,
              message: "JSON object requested, multiple (or no) rows returned"
            };
            data = null;
            count = null;
            status = 406;
            statusText = "Not Acceptable";
          } else if (data.length === 1) data = data[0];
          else data = null;
        } else {
          var _error$details;
          const body = await res$1.text();
          try {
            error = JSON.parse(body);
            if (Array.isArray(error) && res$1.status === 404) {
              data = [];
              error = null;
              status = 200;
              statusText = "OK";
            }
          } catch (_unused) {
            if (res$1.status === 404 && body === "") {
              status = 204;
              statusText = "No Content";
            } else error = { message: body };
          }
          if (error && _this.isMaybeSingle && (error === null || error === void 0 || (_error$details = error.details) === null || _error$details === void 0 ? void 0 : _error$details.includes("0 rows"))) {
            error = null;
            status = 200;
            statusText = "OK";
          }
          if (error && _this.shouldThrowOnError) throw new PostgrestError(error);
        }
        return {
          error,
          data,
          count,
          status,
          statusText
        };
      });
      if (!this.shouldThrowOnError) res = res.catch((fetchError) => {
        var _fetchError$name2;
        let errorDetails = "";
        let hint = "";
        let code = "";
        const cause = fetchError === null || fetchError === void 0 ? void 0 : fetchError.cause;
        if (cause) {
          var _cause$message, _cause$code, _fetchError$name, _cause$name;
          const causeMessage = (_cause$message = cause === null || cause === void 0 ? void 0 : cause.message) !== null && _cause$message !== void 0 ? _cause$message : "";
          const causeCode = (_cause$code = cause === null || cause === void 0 ? void 0 : cause.code) !== null && _cause$code !== void 0 ? _cause$code : "";
          errorDetails = `${(_fetchError$name = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _fetchError$name !== void 0 ? _fetchError$name : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`;
          errorDetails += `

Caused by: ${(_cause$name = cause === null || cause === void 0 ? void 0 : cause.name) !== null && _cause$name !== void 0 ? _cause$name : "Error"}: ${causeMessage}`;
          if (causeCode) errorDetails += ` (${causeCode})`;
          if (cause === null || cause === void 0 ? void 0 : cause.stack) errorDetails += `
${cause.stack}`;
        } else {
          var _fetchError$stack;
          errorDetails = (_fetchError$stack = fetchError === null || fetchError === void 0 ? void 0 : fetchError.stack) !== null && _fetchError$stack !== void 0 ? _fetchError$stack : "";
        }
        const urlLength = this.url.toString().length;
        if ((fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) === "AbortError" || (fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) === "ABORT_ERR") {
          code = "";
          hint = "Request was aborted (timeout or manual cancellation)";
          if (urlLength > this.urlLengthLimit) hint += `. Note: Your request URL is ${urlLength} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`;
        } else if ((cause === null || cause === void 0 ? void 0 : cause.name) === "HeadersOverflowError" || (cause === null || cause === void 0 ? void 0 : cause.code) === "UND_ERR_HEADERS_OVERFLOW") {
          code = "";
          hint = "HTTP headers exceeded server limits (typically 16KB)";
          if (urlLength > this.urlLengthLimit) hint += `. Your request URL is ${urlLength} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`;
        }
        return {
          error: {
            message: `${(_fetchError$name2 = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _fetchError$name2 !== void 0 ? _fetchError$name2 : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`,
            details: errorDetails,
            hint,
            code
          },
          data: null,
          count: null,
          status: 0,
          statusText: ""
        };
      });
      return res.then(onfulfilled, onrejected);
    }
    /**
    * Override the type of the returned `data`.
    *
    * @typeParam NewResult - The new result type to override with
    * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
    */
    returns() {
      return this;
    }
    /**
    * Override the type of the returned `data` field in the response.
    *
    * @typeParam NewResult - The new type to cast the response data to
    * @typeParam Options - Optional type configuration (defaults to { merge: true })
    * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
    * @example
    * ```typescript
    * // Merge with existing types (default behavior)
    * const query = supabase
    *   .from('users')
    *   .select()
    *   .overrideTypes<{ custom_field: string }>()
    *
    * // Replace existing types completely
    * const replaceQuery = supabase
    *   .from('users')
    *   .select()
    *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
    * ```
    * @returns A PostgrestBuilder instance with the new type
    */
    overrideTypes() {
      return this;
    }
  };
  var PostgrestTransformBuilder = class extends PostgrestBuilder {
    /**
    * Perform a SELECT on the query result.
    *
    * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
    * return modified rows. By calling this method, modified rows are returned in
    * `data`.
    *
    * @param columns - The columns to retrieve, separated by commas
    */
    select(columns) {
      let quoted = false;
      const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
        if (/\s/.test(c) && !quoted) return "";
        if (c === '"') quoted = !quoted;
        return c;
      }).join("");
      this.url.searchParams.set("select", cleanedColumns);
      this.headers.append("Prefer", "return=representation");
      return this;
    }
    /**
    * Order the query result by `column`.
    *
    * You can call this method multiple times to order by multiple columns.
    *
    * You can order referenced tables, but it only affects the ordering of the
    * parent table if you use `!inner` in the query.
    *
    * @param column - The column to order by
    * @param options - Named parameters
    * @param options.ascending - If `true`, the result will be in ascending order
    * @param options.nullsFirst - If `true`, `null`s appear first. If `false`,
    * `null`s appear last.
    * @param options.referencedTable - Set this to order a referenced table by
    * its columns
    * @param options.foreignTable - Deprecated, use `options.referencedTable`
    * instead
    */
    order(column, { ascending = true, nullsFirst, foreignTable, referencedTable = foreignTable } = {}) {
      const key = referencedTable ? `${referencedTable}.order` : "order";
      const existingOrder = this.url.searchParams.get(key);
      this.url.searchParams.set(key, `${existingOrder ? `${existingOrder},` : ""}${column}.${ascending ? "asc" : "desc"}${nullsFirst === void 0 ? "" : nullsFirst ? ".nullsfirst" : ".nullslast"}`);
      return this;
    }
    /**
    * Limit the query result by `count`.
    *
    * @param count - The maximum number of rows to return
    * @param options - Named parameters
    * @param options.referencedTable - Set this to limit rows of referenced
    * tables instead of the parent table
    * @param options.foreignTable - Deprecated, use `options.referencedTable`
    * instead
    */
    limit(count, { foreignTable, referencedTable = foreignTable } = {}) {
      const key = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
      this.url.searchParams.set(key, `${count}`);
      return this;
    }
    /**
    * Limit the query result by starting at an offset `from` and ending at the offset `to`.
    * Only records within this range are returned.
    * This respects the query order and if there is no order clause the range could behave unexpectedly.
    * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
    * and fourth rows of the query.
    *
    * @param from - The starting index from which to limit the result
    * @param to - The last index to which to limit the result
    * @param options - Named parameters
    * @param options.referencedTable - Set this to limit rows of referenced
    * tables instead of the parent table
    * @param options.foreignTable - Deprecated, use `options.referencedTable`
    * instead
    */
    range(from, to, { foreignTable, referencedTable = foreignTable } = {}) {
      const keyOffset = typeof referencedTable === "undefined" ? "offset" : `${referencedTable}.offset`;
      const keyLimit = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
      this.url.searchParams.set(keyOffset, `${from}`);
      this.url.searchParams.set(keyLimit, `${to - from + 1}`);
      return this;
    }
    /**
    * Set the AbortSignal for the fetch request.
    *
    * @param signal - The AbortSignal to use for the fetch request
    */
    abortSignal(signal) {
      this.signal = signal;
      return this;
    }
    /**
    * Return `data` as a single object instead of an array of objects.
    *
    * Query result must be one row (e.g. using `.limit(1)`), otherwise this
    * returns an error.
    */
    single() {
      this.headers.set("Accept", "application/vnd.pgrst.object+json");
      return this;
    }
    /**
    * Return `data` as a single object instead of an array of objects.
    *
    * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
    * this returns an error.
    */
    maybeSingle() {
      if (this.method === "GET") this.headers.set("Accept", "application/json");
      else this.headers.set("Accept", "application/vnd.pgrst.object+json");
      this.isMaybeSingle = true;
      return this;
    }
    /**
    * Return `data` as a string in CSV format.
    */
    csv() {
      this.headers.set("Accept", "text/csv");
      return this;
    }
    /**
    * Return `data` as an object in [GeoJSON](https://geojson.org) format.
    */
    geojson() {
      this.headers.set("Accept", "application/geo+json");
      return this;
    }
    /**
    * Return `data` as the EXPLAIN plan for the query.
    *
    * You need to enable the
    * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
    * setting before using this method.
    *
    * @param options - Named parameters
    *
    * @param options.analyze - If `true`, the query will be executed and the
    * actual run time will be returned
    *
    * @param options.verbose - If `true`, the query identifier will be returned
    * and `data` will include the output columns of the query
    *
    * @param options.settings - If `true`, include information on configuration
    * parameters that affect query planning
    *
    * @param options.buffers - If `true`, include information on buffer usage
    *
    * @param options.wal - If `true`, include information on WAL record generation
    *
    * @param options.format - The format of the output, can be `"text"` (default)
    * or `"json"`
    */
    explain({ analyze = false, verbose = false, settings = false, buffers = false, wal = false, format = "text" } = {}) {
      var _this$headers$get;
      const options = [
        analyze ? "analyze" : null,
        verbose ? "verbose" : null,
        settings ? "settings" : null,
        buffers ? "buffers" : null,
        wal ? "wal" : null
      ].filter(Boolean).join("|");
      const forMediatype = (_this$headers$get = this.headers.get("Accept")) !== null && _this$headers$get !== void 0 ? _this$headers$get : "application/json";
      this.headers.set("Accept", `application/vnd.pgrst.plan+${format}; for="${forMediatype}"; options=${options};`);
      if (format === "json") return this;
      else return this;
    }
    /**
    * Rollback the query.
    *
    * `data` will still be returned, but the query is not committed.
    */
    rollback() {
      this.headers.append("Prefer", "tx=rollback");
      return this;
    }
    /**
    * Override the type of the returned `data`.
    *
    * @typeParam NewResult - The new result type to override with
    * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
    */
    returns() {
      return this;
    }
    /**
    * Set the maximum number of rows that can be affected by the query.
    * Only available in PostgREST v13+ and only works with PATCH and DELETE methods.
    *
    * @param value - The maximum number of rows that can be affected
    */
    maxAffected(value) {
      this.headers.append("Prefer", "handling=strict");
      this.headers.append("Prefer", `max-affected=${value}`);
      return this;
    }
  };
  var PostgrestReservedCharsRegexp = /* @__PURE__ */ new RegExp("[,()]");
  var PostgrestFilterBuilder = class extends PostgrestTransformBuilder {
    /**
    * Match only rows where `column` is equal to `value`.
    *
    * To check if the value of `column` is NULL, you should use `.is()` instead.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    eq(column, value) {
      this.url.searchParams.append(column, `eq.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is not equal to `value`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    neq(column, value) {
      this.url.searchParams.append(column, `neq.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is greater than `value`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    gt(column, value) {
      this.url.searchParams.append(column, `gt.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is greater than or equal to `value`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    gte(column, value) {
      this.url.searchParams.append(column, `gte.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is less than `value`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    lt(column, value) {
      this.url.searchParams.append(column, `lt.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is less than or equal to `value`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    lte(column, value) {
      this.url.searchParams.append(column, `lte.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` matches `pattern` case-sensitively.
    *
    * @param column - The column to filter on
    * @param pattern - The pattern to match with
    */
    like(column, pattern) {
      this.url.searchParams.append(column, `like.${pattern}`);
      return this;
    }
    /**
    * Match only rows where `column` matches all of `patterns` case-sensitively.
    *
    * @param column - The column to filter on
    * @param patterns - The patterns to match with
    */
    likeAllOf(column, patterns) {
      this.url.searchParams.append(column, `like(all).{${patterns.join(",")}}`);
      return this;
    }
    /**
    * Match only rows where `column` matches any of `patterns` case-sensitively.
    *
    * @param column - The column to filter on
    * @param patterns - The patterns to match with
    */
    likeAnyOf(column, patterns) {
      this.url.searchParams.append(column, `like(any).{${patterns.join(",")}}`);
      return this;
    }
    /**
    * Match only rows where `column` matches `pattern` case-insensitively.
    *
    * @param column - The column to filter on
    * @param pattern - The pattern to match with
    */
    ilike(column, pattern) {
      this.url.searchParams.append(column, `ilike.${pattern}`);
      return this;
    }
    /**
    * Match only rows where `column` matches all of `patterns` case-insensitively.
    *
    * @param column - The column to filter on
    * @param patterns - The patterns to match with
    */
    ilikeAllOf(column, patterns) {
      this.url.searchParams.append(column, `ilike(all).{${patterns.join(",")}}`);
      return this;
    }
    /**
    * Match only rows where `column` matches any of `patterns` case-insensitively.
    *
    * @param column - The column to filter on
    * @param patterns - The patterns to match with
    */
    ilikeAnyOf(column, patterns) {
      this.url.searchParams.append(column, `ilike(any).{${patterns.join(",")}}`);
      return this;
    }
    /**
    * Match only rows where `column` matches the PostgreSQL regex `pattern`
    * case-sensitively (using the `~` operator).
    *
    * @param column - The column to filter on
    * @param pattern - The PostgreSQL regular expression pattern to match with
    */
    regexMatch(column, pattern) {
      this.url.searchParams.append(column, `match.${pattern}`);
      return this;
    }
    /**
    * Match only rows where `column` matches the PostgreSQL regex `pattern`
    * case-insensitively (using the `~*` operator).
    *
    * @param column - The column to filter on
    * @param pattern - The PostgreSQL regular expression pattern to match with
    */
    regexIMatch(column, pattern) {
      this.url.searchParams.append(column, `imatch.${pattern}`);
      return this;
    }
    /**
    * Match only rows where `column` IS `value`.
    *
    * For non-boolean columns, this is only relevant for checking if the value of
    * `column` is NULL by setting `value` to `null`.
    *
    * For boolean columns, you can also set `value` to `true` or `false` and it
    * will behave the same way as `.eq()`.
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    is(column, value) {
      this.url.searchParams.append(column, `is.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` IS DISTINCT FROM `value`.
    *
    * Unlike `.neq()`, this treats `NULL` as a comparable value. Two `NULL` values
    * are considered equal (not distinct), and comparing `NULL` with any non-NULL
    * value returns true (distinct).
    *
    * @param column - The column to filter on
    * @param value - The value to filter with
    */
    isDistinct(column, value) {
      this.url.searchParams.append(column, `isdistinct.${value}`);
      return this;
    }
    /**
    * Match only rows where `column` is included in the `values` array.
    *
    * @param column - The column to filter on
    * @param values - The values array to filter with
    */
    in(column, values) {
      const cleanedValues = Array.from(new Set(values)).map((s) => {
        if (typeof s === "string" && PostgrestReservedCharsRegexp.test(s)) return `"${s}"`;
        else return `${s}`;
      }).join(",");
      this.url.searchParams.append(column, `in.(${cleanedValues})`);
      return this;
    }
    /**
    * Match only rows where `column` is NOT included in the `values` array.
    *
    * @param column - The column to filter on
    * @param values - The values array to filter with
    */
    notIn(column, values) {
      const cleanedValues = Array.from(new Set(values)).map((s) => {
        if (typeof s === "string" && PostgrestReservedCharsRegexp.test(s)) return `"${s}"`;
        else return `${s}`;
      }).join(",");
      this.url.searchParams.append(column, `not.in.(${cleanedValues})`);
      return this;
    }
    /**
    * Only relevant for jsonb, array, and range columns. Match only rows where
    * `column` contains every element appearing in `value`.
    *
    * @param column - The jsonb, array, or range column to filter on
    * @param value - The jsonb, array, or range value to filter with
    */
    contains(column, value) {
      if (typeof value === "string") this.url.searchParams.append(column, `cs.${value}`);
      else if (Array.isArray(value)) this.url.searchParams.append(column, `cs.{${value.join(",")}}`);
      else this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`);
      return this;
    }
    /**
    * Only relevant for jsonb, array, and range columns. Match only rows where
    * every element appearing in `column` is contained by `value`.
    *
    * @param column - The jsonb, array, or range column to filter on
    * @param value - The jsonb, array, or range value to filter with
    */
    containedBy(column, value) {
      if (typeof value === "string") this.url.searchParams.append(column, `cd.${value}`);
      else if (Array.isArray(value)) this.url.searchParams.append(column, `cd.{${value.join(",")}}`);
      else this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`);
      return this;
    }
    /**
    * Only relevant for range columns. Match only rows where every element in
    * `column` is greater than any element in `range`.
    *
    * @param column - The range column to filter on
    * @param range - The range to filter with
    */
    rangeGt(column, range) {
      this.url.searchParams.append(column, `sr.${range}`);
      return this;
    }
    /**
    * Only relevant for range columns. Match only rows where every element in
    * `column` is either contained in `range` or greater than any element in
    * `range`.
    *
    * @param column - The range column to filter on
    * @param range - The range to filter with
    */
    rangeGte(column, range) {
      this.url.searchParams.append(column, `nxl.${range}`);
      return this;
    }
    /**
    * Only relevant for range columns. Match only rows where every element in
    * `column` is less than any element in `range`.
    *
    * @param column - The range column to filter on
    * @param range - The range to filter with
    */
    rangeLt(column, range) {
      this.url.searchParams.append(column, `sl.${range}`);
      return this;
    }
    /**
    * Only relevant for range columns. Match only rows where every element in
    * `column` is either contained in `range` or less than any element in
    * `range`.
    *
    * @param column - The range column to filter on
    * @param range - The range to filter with
    */
    rangeLte(column, range) {
      this.url.searchParams.append(column, `nxr.${range}`);
      return this;
    }
    /**
    * Only relevant for range columns. Match only rows where `column` is
    * mutually exclusive to `range` and there can be no element between the two
    * ranges.
    *
    * @param column - The range column to filter on
    * @param range - The range to filter with
    */
    rangeAdjacent(column, range) {
      this.url.searchParams.append(column, `adj.${range}`);
      return this;
    }
    /**
    * Only relevant for array and range columns. Match only rows where
    * `column` and `value` have an element in common.
    *
    * @param column - The array or range column to filter on
    * @param value - The array or range value to filter with
    */
    overlaps(column, value) {
      if (typeof value === "string") this.url.searchParams.append(column, `ov.${value}`);
      else this.url.searchParams.append(column, `ov.{${value.join(",")}}`);
      return this;
    }
    /**
    * Only relevant for text and tsvector columns. Match only rows where
    * `column` matches the query string in `query`.
    *
    * @param column - The text or tsvector column to filter on
    * @param query - The query text to match with
    * @param options - Named parameters
    * @param options.config - The text search configuration to use
    * @param options.type - Change how the `query` text is interpreted
    */
    textSearch(column, query, { config, type } = {}) {
      let typePart = "";
      if (type === "plain") typePart = "pl";
      else if (type === "phrase") typePart = "ph";
      else if (type === "websearch") typePart = "w";
      const configPart = config === void 0 ? "" : `(${config})`;
      this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`);
      return this;
    }
    /**
    * Match only rows where each column in `query` keys is equal to its
    * associated value. Shorthand for multiple `.eq()`s.
    *
    * @param query - The object to filter with, with column names as keys mapped
    * to their filter values
    */
    match(query) {
      Object.entries(query).forEach(([column, value]) => {
        this.url.searchParams.append(column, `eq.${value}`);
      });
      return this;
    }
    /**
    * Match only rows which doesn't satisfy the filter.
    *
    * Unlike most filters, `opearator` and `value` are used as-is and need to
    * follow [PostgREST
    * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
    * to make sure they are properly sanitized.
    *
    * @param column - The column to filter on
    * @param operator - The operator to be negated to filter with, following
    * PostgREST syntax
    * @param value - The value to filter with, following PostgREST syntax
    */
    not(column, operator, value) {
      this.url.searchParams.append(column, `not.${operator}.${value}`);
      return this;
    }
    /**
    * Match only rows which satisfy at least one of the filters.
    *
    * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
    * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
    * to make sure it's properly sanitized.
    *
    * It's currently not possible to do an `.or()` filter across multiple tables.
    *
    * @param filters - The filters to use, following PostgREST syntax
    * @param options - Named parameters
    * @param options.referencedTable - Set this to filter on referenced tables
    * instead of the parent table
    * @param options.foreignTable - Deprecated, use `referencedTable` instead
    */
    or(filters, { foreignTable, referencedTable = foreignTable } = {}) {
      const key = referencedTable ? `${referencedTable}.or` : "or";
      this.url.searchParams.append(key, `(${filters})`);
      return this;
    }
    /**
    * Match only rows which satisfy the filter. This is an escape hatch - you
    * should use the specific filter methods wherever possible.
    *
    * Unlike most filters, `opearator` and `value` are used as-is and need to
    * follow [PostgREST
    * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
    * to make sure they are properly sanitized.
    *
    * @param column - The column to filter on
    * @param operator - The operator to filter with, following PostgREST syntax
    * @param value - The value to filter with, following PostgREST syntax
    */
    filter(column, operator, value) {
      this.url.searchParams.append(column, `${operator}.${value}`);
      return this;
    }
  };
  var PostgrestQueryBuilder = class {
    /**
    * Creates a query builder scoped to a Postgres table or view.
    *
    * @example
    * ```ts
    * import PostgrestQueryBuilder from '@supabase/postgrest-js'
    *
    * const query = new PostgrestQueryBuilder(
    *   new URL('https://xyzcompany.supabase.co/rest/v1/users'),
    *   { headers: { apikey: 'public-anon-key' } }
    * )
    * ```
    */
    constructor(url, { headers = {}, schema, fetch: fetch$1, urlLengthLimit = 8e3 }) {
      this.url = url;
      this.headers = new Headers(headers);
      this.schema = schema;
      this.fetch = fetch$1;
      this.urlLengthLimit = urlLengthLimit;
    }
    /**
    * Clone URL and headers to prevent shared state between operations.
    */
    cloneRequestState() {
      return {
        url: new URL(this.url.toString()),
        headers: new Headers(this.headers)
      };
    }
    /**
    * Perform a SELECT query on the table or view.
    *
    * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
    *
    * @param options - Named parameters
    *
    * @param options.head - When set to `true`, `data` will not be returned.
    * Useful if you only need the count.
    *
    * @param options.count - Count algorithm to use to count rows in the table or view.
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    *
    * @remarks
    * When using `count` with `.range()` or `.limit()`, the returned `count` is the total number of rows
    * that match your filters, not the number of rows in the current page. Use this to build pagination UI.
    */
    select(columns, options) {
      const { head: head2 = false, count } = options !== null && options !== void 0 ? options : {};
      const method = head2 ? "HEAD" : "GET";
      let quoted = false;
      const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
        if (/\s/.test(c) && !quoted) return "";
        if (c === '"') quoted = !quoted;
        return c;
      }).join("");
      const { url, headers } = this.cloneRequestState();
      url.searchParams.set("select", cleanedColumns);
      if (count) headers.append("Prefer", `count=${count}`);
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schema,
        fetch: this.fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Perform an INSERT into the table or view.
    *
    * By default, inserted rows are not returned. To return it, chain the call
    * with `.select()`.
    *
    * @param values - The values to insert. Pass an object to insert a single row
    * or an array to insert multiple rows.
    *
    * @param options - Named parameters
    *
    * @param options.count - Count algorithm to use to count inserted rows.
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    *
    * @param options.defaultToNull - Make missing fields default to `null`.
    * Otherwise, use the default value for the column. Only applies for bulk
    * inserts.
    */
    insert(values, { count, defaultToNull = true } = {}) {
      var _this$fetch;
      const method = "POST";
      const { url, headers } = this.cloneRequestState();
      if (count) headers.append("Prefer", `count=${count}`);
      if (!defaultToNull) headers.append("Prefer", `missing=default`);
      if (Array.isArray(values)) {
        const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
        if (columns.length > 0) {
          const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
          url.searchParams.set("columns", uniqueColumns.join(","));
        }
      }
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schema,
        body: values,
        fetch: (_this$fetch = this.fetch) !== null && _this$fetch !== void 0 ? _this$fetch : fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Perform an UPSERT on the table or view. Depending on the column(s) passed
    * to `onConflict`, `.upsert()` allows you to perform the equivalent of
    * `.insert()` if a row with the corresponding `onConflict` columns doesn't
    * exist, or if it does exist, perform an alternative action depending on
    * `ignoreDuplicates`.
    *
    * By default, upserted rows are not returned. To return it, chain the call
    * with `.select()`.
    *
    * @param values - The values to upsert with. Pass an object to upsert a
    * single row or an array to upsert multiple rows.
    *
    * @param options - Named parameters
    *
    * @param options.onConflict - Comma-separated UNIQUE column(s) to specify how
    * duplicate rows are determined. Two rows are duplicates if all the
    * `onConflict` columns are equal.
    *
    * @param options.ignoreDuplicates - If `true`, duplicate rows are ignored. If
    * `false`, duplicate rows are merged with existing rows.
    *
    * @param options.count - Count algorithm to use to count upserted rows.
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    *
    * @param options.defaultToNull - Make missing fields default to `null`.
    * Otherwise, use the default value for the column. This only applies when
    * inserting new rows, not when merging with existing rows under
    * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
    *
    * @example Upsert a single row using a unique key
    * ```ts
    * // Upserting a single row, overwriting based on the 'username' unique column
    * const { data, error } = await supabase
    *   .from('users')
    *   .upsert({ username: 'supabot' }, { onConflict: 'username' })
    *
    * // Example response:
    * // {
    * //   data: [
    * //     { id: 4, message: 'bar', username: 'supabot' }
    * //   ],
    * //   error: null
    * // }
    * ```
    *
    * @example Upsert with conflict resolution and exact row counting
    * ```ts
    * // Upserting and returning exact count
    * const { data, error, count } = await supabase
    *   .from('users')
    *   .upsert(
    *     {
    *       id: 3,
    *       message: 'foo',
    *       username: 'supabot'
    *     },
    *     {
    *       onConflict: 'username',
    *       count: 'exact'
    *     }
    *   )
    *
    * // Example response:
    * // {
    * //   data: [
    * //     {
    * //       id: 42,
    * //       handle: "saoirse",
    * //       display_name: "Saoirse"
    * //     }
    * //   ],
    * //   count: 1,
    * //   error: null
    * // }
    * ```
    */
    upsert(values, { onConflict, ignoreDuplicates = false, count, defaultToNull = true } = {}) {
      var _this$fetch2;
      const method = "POST";
      const { url, headers } = this.cloneRequestState();
      headers.append("Prefer", `resolution=${ignoreDuplicates ? "ignore" : "merge"}-duplicates`);
      if (onConflict !== void 0) url.searchParams.set("on_conflict", onConflict);
      if (count) headers.append("Prefer", `count=${count}`);
      if (!defaultToNull) headers.append("Prefer", "missing=default");
      if (Array.isArray(values)) {
        const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
        if (columns.length > 0) {
          const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
          url.searchParams.set("columns", uniqueColumns.join(","));
        }
      }
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schema,
        body: values,
        fetch: (_this$fetch2 = this.fetch) !== null && _this$fetch2 !== void 0 ? _this$fetch2 : fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Perform an UPDATE on the table or view.
    *
    * By default, updated rows are not returned. To return it, chain the call
    * with `.select()` after filters.
    *
    * @param values - The values to update with
    *
    * @param options - Named parameters
    *
    * @param options.count - Count algorithm to use to count updated rows.
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    */
    update(values, { count } = {}) {
      var _this$fetch3;
      const method = "PATCH";
      const { url, headers } = this.cloneRequestState();
      if (count) headers.append("Prefer", `count=${count}`);
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schema,
        body: values,
        fetch: (_this$fetch3 = this.fetch) !== null && _this$fetch3 !== void 0 ? _this$fetch3 : fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Perform a DELETE on the table or view.
    *
    * By default, deleted rows are not returned. To return it, chain the call
    * with `.select()` after filters.
    *
    * @param options - Named parameters
    *
    * @param options.count - Count algorithm to use to count deleted rows.
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    */
    delete({ count } = {}) {
      var _this$fetch4;
      const method = "DELETE";
      const { url, headers } = this.cloneRequestState();
      if (count) headers.append("Prefer", `count=${count}`);
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schema,
        fetch: (_this$fetch4 = this.fetch) !== null && _this$fetch4 !== void 0 ? _this$fetch4 : fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
  };
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
      return typeof o$1;
    } : function(o$1) {
      return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
    }, _typeof(o);
  }
  function toPrimitive(t, r) {
    if ("object" != _typeof(t) || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != _typeof(i)) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function toPropertyKey(t) {
    var i = toPrimitive(t, "string");
    return "symbol" == _typeof(i) ? i : i + "";
  }
  function _defineProperty(e, r, t) {
    return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r$1) {
        return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function(r$1) {
        _defineProperty(e, r$1, t[r$1]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r$1) {
        Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
      });
    }
    return e;
  }
  var PostgrestClient = class PostgrestClient2 {
    /**
    * Creates a PostgREST client.
    *
    * @param url - URL of the PostgREST endpoint
    * @param options - Named parameters
    * @param options.headers - Custom headers
    * @param options.schema - Postgres schema to switch to
    * @param options.fetch - Custom fetch
    * @param options.timeout - Optional timeout in milliseconds for all requests. When set, requests will automatically abort after this duration to prevent indefinite hangs.
    * @param options.urlLengthLimit - Maximum URL length in characters before warnings/errors are triggered. Defaults to 8000.
    * @example
    * ```ts
    * import PostgrestClient from '@supabase/postgrest-js'
    *
    * const postgrest = new PostgrestClient('https://xyzcompany.supabase.co/rest/v1', {
    *   headers: { apikey: 'public-anon-key' },
    *   schema: 'public',
    *   timeout: 30000, // 30 second timeout
    * })
    * ```
    */
    constructor(url, { headers = {}, schema, fetch: fetch$1, timeout, urlLengthLimit = 8e3 } = {}) {
      this.url = url;
      this.headers = new Headers(headers);
      this.schemaName = schema;
      this.urlLengthLimit = urlLengthLimit;
      const originalFetch = fetch$1 !== null && fetch$1 !== void 0 ? fetch$1 : globalThis.fetch;
      if (timeout !== void 0 && timeout > 0) this.fetch = (input, init) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const existingSignal = init === null || init === void 0 ? void 0 : init.signal;
        if (existingSignal) {
          if (existingSignal.aborted) {
            clearTimeout(timeoutId);
            return originalFetch(input, init);
          }
          const abortHandler = () => {
            clearTimeout(timeoutId);
            controller.abort();
          };
          existingSignal.addEventListener("abort", abortHandler, { once: true });
          return originalFetch(input, _objectSpread2(_objectSpread2({}, init), {}, { signal: controller.signal })).finally(() => {
            clearTimeout(timeoutId);
            existingSignal.removeEventListener("abort", abortHandler);
          });
        }
        return originalFetch(input, _objectSpread2(_objectSpread2({}, init), {}, { signal: controller.signal })).finally(() => clearTimeout(timeoutId));
      };
      else this.fetch = originalFetch;
    }
    /**
    * Perform a query on a table or a view.
    *
    * @param relation - The table or view name to query
    */
    from(relation) {
      if (!relation || typeof relation !== "string" || relation.trim() === "") throw new Error("Invalid relation name: relation must be a non-empty string.");
      return new PostgrestQueryBuilder(new URL(`${this.url}/${relation}`), {
        headers: new Headers(this.headers),
        schema: this.schemaName,
        fetch: this.fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Select a schema to query or perform an function (rpc) call.
    *
    * The schema needs to be on the list of exposed schemas inside Supabase.
    *
    * @param schema - The schema to query
    */
    schema(schema) {
      return new PostgrestClient2(this.url, {
        headers: this.headers,
        schema,
        fetch: this.fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
    /**
    * Perform a function call.
    *
    * @param fn - The function name to call
    * @param args - The arguments to pass to the function call
    * @param options - Named parameters
    * @param options.head - When set to `true`, `data` will not be returned.
    * Useful if you only need the count.
    * @param options.get - When set to `true`, the function will be called with
    * read-only access mode.
    * @param options.count - Count algorithm to use to count rows returned by the
    * function. Only applicable for [set-returning
    * functions](https://www.postgresql.org/docs/current/functions-srf.html).
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    *
    * @example
    * ```ts
    * // For cross-schema functions where type inference fails, use overrideTypes:
    * const { data } = await supabase
    *   .schema('schema_b')
    *   .rpc('function_a', {})
    *   .overrideTypes<{ id: string; user_id: string }[]>()
    * ```
    */
    rpc(fn, args = {}, { head: head2 = false, get: get2 = false, count } = {}) {
      var _this$fetch;
      let method;
      const url = new URL(`${this.url}/rpc/${fn}`);
      let body;
      const _isObject = (v) => v !== null && typeof v === "object" && (!Array.isArray(v) || v.some(_isObject));
      const _hasObjectArg = head2 && Object.values(args).some(_isObject);
      if (_hasObjectArg) {
        method = "POST";
        body = args;
      } else if (head2 || get2) {
        method = head2 ? "HEAD" : "GET";
        Object.entries(args).filter(([_, value]) => value !== void 0).map(([name, value]) => [name, Array.isArray(value) ? `{${value.join(",")}}` : `${value}`]).forEach(([name, value]) => {
          url.searchParams.append(name, value);
        });
      } else {
        method = "POST";
        body = args;
      }
      const headers = new Headers(this.headers);
      if (_hasObjectArg) headers.set("Prefer", count ? `count=${count},return=minimal` : "return=minimal");
      else if (count) headers.set("Prefer", `count=${count}`);
      return new PostgrestFilterBuilder({
        method,
        url,
        headers,
        schema: this.schemaName,
        body,
        fetch: (_this$fetch = this.fetch) !== null && _this$fetch !== void 0 ? _this$fetch : fetch,
        urlLengthLimit: this.urlLengthLimit
      });
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
  var WebSocketFactory = class {
    /**
     * Static-only utility ??prevent instantiation.
     */
    constructor() {
    }
    static detectEnvironment() {
      var _a;
      if (typeof WebSocket !== "undefined") {
        return { type: "native", constructor: WebSocket };
      }
      if (typeof globalThis !== "undefined" && typeof globalThis.WebSocket !== "undefined") {
        return { type: "native", constructor: globalThis.WebSocket };
      }
      if (typeof global !== "undefined" && typeof global.WebSocket !== "undefined") {
        return { type: "native", constructor: global.WebSocket };
      }
      if (typeof globalThis !== "undefined" && typeof globalThis.WebSocketPair !== "undefined" && typeof globalThis.WebSocket === "undefined") {
        return {
          type: "cloudflare",
          error: "Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.",
          workaround: "Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime."
        };
      }
      if (typeof globalThis !== "undefined" && globalThis.EdgeRuntime || typeof navigator !== "undefined" && ((_a = navigator.userAgent) === null || _a === void 0 ? void 0 : _a.includes("Vercel-Edge"))) {
        return {
          type: "unsupported",
          error: "Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.",
          workaround: "Use serverless functions or a different deployment target for WebSocket functionality."
        };
      }
      const _process = globalThis["process"];
      if (_process) {
        const processVersions = _process["versions"];
        if (processVersions && processVersions["node"]) {
          const versionString = processVersions["node"];
          const nodeVersion = parseInt(versionString.replace(/^v/, "").split(".")[0]);
          if (nodeVersion >= 22) {
            if (typeof globalThis.WebSocket !== "undefined") {
              return { type: "native", constructor: globalThis.WebSocket };
            }
            return {
              type: "unsupported",
              error: `Node.js ${nodeVersion} detected but native WebSocket not found.`,
              workaround: "Provide a WebSocket implementation via the transport option."
            };
          }
          return {
            type: "unsupported",
            error: `Node.js ${nodeVersion} detected without native WebSocket support.`,
            workaround: 'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })'
          };
        }
      }
      return {
        type: "unsupported",
        error: "Unknown JavaScript runtime without WebSocket support.",
        workaround: "Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation."
      };
    }
    /**
     * Returns the best available WebSocket constructor for the current runtime.
     *
     * @example
     * ```ts
     * const WS = WebSocketFactory.getWebSocketConstructor()
     * const socket = new WS('wss://realtime.supabase.co/socket')
     * ```
     */
    static getWebSocketConstructor() {
      const env = this.detectEnvironment();
      if (env.constructor) {
        return env.constructor;
      }
      let errorMessage = env.error || "WebSocket not supported in this environment.";
      if (env.workaround) {
        errorMessage += `

Suggested solution: ${env.workaround}`;
      }
      throw new Error(errorMessage);
    }
    /**
     * Creates a WebSocket using the detected constructor.
     *
     * @example
     * ```ts
     * const socket = WebSocketFactory.createWebSocket('wss://realtime.supabase.co/socket')
     * ```
     */
    static createWebSocket(url, protocols) {
      const WS = this.getWebSocketConstructor();
      return new WS(url, protocols);
    }
    /**
     * Detects whether the runtime can establish WebSocket connections.
     *
     * @example
     * ```ts
     * if (!WebSocketFactory.isWebSocketSupported()) {
     *   console.warn('Falling back to long polling')
     * }
     * ```
     */
    static isWebSocketSupported() {
      try {
        const env = this.detectEnvironment();
        return env.type === "native" || env.type === "ws";
      } catch (_a) {
        return false;
      }
    }
  };
  var websocket_factory_default = WebSocketFactory;

  // node_modules/@supabase/realtime-js/dist/module/lib/version.js
  var version = "2.98.0";

  // node_modules/@supabase/realtime-js/dist/module/lib/constants.js
  var DEFAULT_VERSION = `realtime-js/${version}`;
  var VSN_1_0_0 = "1.0.0";
  var VSN_2_0_0 = "2.0.0";
  var DEFAULT_VSN = VSN_2_0_0;
  var DEFAULT_TIMEOUT = 1e4;
  var WS_CLOSE_NORMAL = 1e3;
  var MAX_PUSH_BUFFER_SIZE = 100;
  var SOCKET_STATES;
  (function(SOCKET_STATES2) {
    SOCKET_STATES2[SOCKET_STATES2["connecting"] = 0] = "connecting";
    SOCKET_STATES2[SOCKET_STATES2["open"] = 1] = "open";
    SOCKET_STATES2[SOCKET_STATES2["closing"] = 2] = "closing";
    SOCKET_STATES2[SOCKET_STATES2["closed"] = 3] = "closed";
  })(SOCKET_STATES || (SOCKET_STATES = {}));
  var CHANNEL_STATES;
  (function(CHANNEL_STATES2) {
    CHANNEL_STATES2["closed"] = "closed";
    CHANNEL_STATES2["errored"] = "errored";
    CHANNEL_STATES2["joined"] = "joined";
    CHANNEL_STATES2["joining"] = "joining";
    CHANNEL_STATES2["leaving"] = "leaving";
  })(CHANNEL_STATES || (CHANNEL_STATES = {}));
  var CHANNEL_EVENTS;
  (function(CHANNEL_EVENTS2) {
    CHANNEL_EVENTS2["close"] = "phx_close";
    CHANNEL_EVENTS2["error"] = "phx_error";
    CHANNEL_EVENTS2["join"] = "phx_join";
    CHANNEL_EVENTS2["reply"] = "phx_reply";
    CHANNEL_EVENTS2["leave"] = "phx_leave";
    CHANNEL_EVENTS2["access_token"] = "access_token";
  })(CHANNEL_EVENTS || (CHANNEL_EVENTS = {}));
  var TRANSPORTS;
  (function(TRANSPORTS2) {
    TRANSPORTS2["websocket"] = "websocket";
  })(TRANSPORTS || (TRANSPORTS = {}));
  var CONNECTION_STATE;
  (function(CONNECTION_STATE2) {
    CONNECTION_STATE2["Connecting"] = "connecting";
    CONNECTION_STATE2["Open"] = "open";
    CONNECTION_STATE2["Closing"] = "closing";
    CONNECTION_STATE2["Closed"] = "closed";
  })(CONNECTION_STATE || (CONNECTION_STATE = {}));

  // node_modules/@supabase/realtime-js/dist/module/lib/serializer.js
  var Serializer = class {
    constructor(allowedMetadataKeys) {
      this.HEADER_LENGTH = 1;
      this.USER_BROADCAST_PUSH_META_LENGTH = 6;
      this.KINDS = { userBroadcastPush: 3, userBroadcast: 4 };
      this.BINARY_ENCODING = 0;
      this.JSON_ENCODING = 1;
      this.BROADCAST_EVENT = "broadcast";
      this.allowedMetadataKeys = [];
      this.allowedMetadataKeys = allowedMetadataKeys !== null && allowedMetadataKeys !== void 0 ? allowedMetadataKeys : [];
    }
    encode(msg, callback) {
      if (msg.event === this.BROADCAST_EVENT && !(msg.payload instanceof ArrayBuffer) && typeof msg.payload.event === "string") {
        return callback(this._binaryEncodeUserBroadcastPush(msg));
      }
      let payload = [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload];
      return callback(JSON.stringify(payload));
    }
    _binaryEncodeUserBroadcastPush(message) {
      var _a;
      if (this._isArrayBuffer((_a = message.payload) === null || _a === void 0 ? void 0 : _a.payload)) {
        return this._encodeBinaryUserBroadcastPush(message);
      } else {
        return this._encodeJsonUserBroadcastPush(message);
      }
    }
    _encodeBinaryUserBroadcastPush(message) {
      var _a, _b;
      const userPayload = (_b = (_a = message.payload) === null || _a === void 0 ? void 0 : _a.payload) !== null && _b !== void 0 ? _b : new ArrayBuffer(0);
      return this._encodeUserBroadcastPush(message, this.BINARY_ENCODING, userPayload);
    }
    _encodeJsonUserBroadcastPush(message) {
      var _a, _b;
      const userPayload = (_b = (_a = message.payload) === null || _a === void 0 ? void 0 : _a.payload) !== null && _b !== void 0 ? _b : {};
      const encoder = new TextEncoder();
      const encodedUserPayload = encoder.encode(JSON.stringify(userPayload)).buffer;
      return this._encodeUserBroadcastPush(message, this.JSON_ENCODING, encodedUserPayload);
    }
    _encodeUserBroadcastPush(message, encodingType, encodedPayload) {
      var _a, _b;
      const topic = message.topic;
      const ref = (_a = message.ref) !== null && _a !== void 0 ? _a : "";
      const joinRef = (_b = message.join_ref) !== null && _b !== void 0 ? _b : "";
      const userEvent = message.payload.event;
      const rest = this.allowedMetadataKeys ? this._pick(message.payload, this.allowedMetadataKeys) : {};
      const metadata = Object.keys(rest).length === 0 ? "" : JSON.stringify(rest);
      if (joinRef.length > 255) {
        throw new Error(`joinRef length ${joinRef.length} exceeds maximum of 255`);
      }
      if (ref.length > 255) {
        throw new Error(`ref length ${ref.length} exceeds maximum of 255`);
      }
      if (topic.length > 255) {
        throw new Error(`topic length ${topic.length} exceeds maximum of 255`);
      }
      if (userEvent.length > 255) {
        throw new Error(`userEvent length ${userEvent.length} exceeds maximum of 255`);
      }
      if (metadata.length > 255) {
        throw new Error(`metadata length ${metadata.length} exceeds maximum of 255`);
      }
      const metaLength = this.USER_BROADCAST_PUSH_META_LENGTH + joinRef.length + ref.length + topic.length + userEvent.length + metadata.length;
      const header = new ArrayBuffer(this.HEADER_LENGTH + metaLength);
      let view = new DataView(header);
      let offset = 0;
      view.setUint8(offset++, this.KINDS.userBroadcastPush);
      view.setUint8(offset++, joinRef.length);
      view.setUint8(offset++, ref.length);
      view.setUint8(offset++, topic.length);
      view.setUint8(offset++, userEvent.length);
      view.setUint8(offset++, metadata.length);
      view.setUint8(offset++, encodingType);
      Array.from(joinRef, (char) => view.setUint8(offset++, char.charCodeAt(0)));
      Array.from(ref, (char) => view.setUint8(offset++, char.charCodeAt(0)));
      Array.from(topic, (char) => view.setUint8(offset++, char.charCodeAt(0)));
      Array.from(userEvent, (char) => view.setUint8(offset++, char.charCodeAt(0)));
      Array.from(metadata, (char) => view.setUint8(offset++, char.charCodeAt(0)));
      var combined = new Uint8Array(header.byteLength + encodedPayload.byteLength);
      combined.set(new Uint8Array(header), 0);
      combined.set(new Uint8Array(encodedPayload), header.byteLength);
      return combined.buffer;
    }
    decode(rawPayload, callback) {
      if (this._isArrayBuffer(rawPayload)) {
        let result = this._binaryDecode(rawPayload);
        return callback(result);
      }
      if (typeof rawPayload === "string") {
        const jsonPayload = JSON.parse(rawPayload);
        const [join_ref, ref, topic, event, payload] = jsonPayload;
        return callback({ join_ref, ref, topic, event, payload });
      }
      return callback({});
    }
    _binaryDecode(buffer) {
      const view = new DataView(buffer);
      const kind = view.getUint8(0);
      const decoder = new TextDecoder();
      switch (kind) {
        case this.KINDS.userBroadcast:
          return this._decodeUserBroadcast(buffer, view, decoder);
      }
    }
    _decodeUserBroadcast(buffer, view, decoder) {
      const topicSize = view.getUint8(1);
      const userEventSize = view.getUint8(2);
      const metadataSize = view.getUint8(3);
      const payloadEncoding = view.getUint8(4);
      let offset = this.HEADER_LENGTH + 4;
      const topic = decoder.decode(buffer.slice(offset, offset + topicSize));
      offset = offset + topicSize;
      const userEvent = decoder.decode(buffer.slice(offset, offset + userEventSize));
      offset = offset + userEventSize;
      const metadata = decoder.decode(buffer.slice(offset, offset + metadataSize));
      offset = offset + metadataSize;
      const payload = buffer.slice(offset, buffer.byteLength);
      const parsedPayload = payloadEncoding === this.JSON_ENCODING ? JSON.parse(decoder.decode(payload)) : payload;
      const data = {
        type: this.BROADCAST_EVENT,
        event: userEvent,
        payload: parsedPayload
      };
      if (metadataSize > 0) {
        data["meta"] = JSON.parse(metadata);
      }
      return { join_ref: null, ref: null, topic, event: this.BROADCAST_EVENT, payload: data };
    }
    _isArrayBuffer(buffer) {
      var _a;
      return buffer instanceof ArrayBuffer || ((_a = buffer === null || buffer === void 0 ? void 0 : buffer.constructor) === null || _a === void 0 ? void 0 : _a.name) === "ArrayBuffer";
    }
    _pick(obj, keys) {
      if (!obj || typeof obj !== "object") {
        return {};
      }
      return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)));
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/lib/timer.js
  var Timer = class {
    constructor(callback, timerCalc) {
      this.callback = callback;
      this.timerCalc = timerCalc;
      this.timer = void 0;
      this.tries = 0;
      this.callback = callback;
      this.timerCalc = timerCalc;
    }
    reset() {
      this.tries = 0;
      clearTimeout(this.timer);
      this.timer = void 0;
    }
    // Cancels any previous scheduleTimeout and schedules callback
    scheduleTimeout() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.tries = this.tries + 1;
        this.callback();
      }, this.timerCalc(this.tries + 1));
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/lib/transformers.js
  var PostgresTypes;
  (function(PostgresTypes2) {
    PostgresTypes2["abstime"] = "abstime";
    PostgresTypes2["bool"] = "bool";
    PostgresTypes2["date"] = "date";
    PostgresTypes2["daterange"] = "daterange";
    PostgresTypes2["float4"] = "float4";
    PostgresTypes2["float8"] = "float8";
    PostgresTypes2["int2"] = "int2";
    PostgresTypes2["int4"] = "int4";
    PostgresTypes2["int4range"] = "int4range";
    PostgresTypes2["int8"] = "int8";
    PostgresTypes2["int8range"] = "int8range";
    PostgresTypes2["json"] = "json";
    PostgresTypes2["jsonb"] = "jsonb";
    PostgresTypes2["money"] = "money";
    PostgresTypes2["numeric"] = "numeric";
    PostgresTypes2["oid"] = "oid";
    PostgresTypes2["reltime"] = "reltime";
    PostgresTypes2["text"] = "text";
    PostgresTypes2["time"] = "time";
    PostgresTypes2["timestamp"] = "timestamp";
    PostgresTypes2["timestamptz"] = "timestamptz";
    PostgresTypes2["timetz"] = "timetz";
    PostgresTypes2["tsrange"] = "tsrange";
    PostgresTypes2["tstzrange"] = "tstzrange";
  })(PostgresTypes || (PostgresTypes = {}));
  var convertChangeData = (columns, record, options = {}) => {
    var _a;
    const skipTypes = (_a = options.skipTypes) !== null && _a !== void 0 ? _a : [];
    if (!record) {
      return {};
    }
    return Object.keys(record).reduce((acc, rec_key) => {
      acc[rec_key] = convertColumn(rec_key, columns, record, skipTypes);
      return acc;
    }, {});
  };
  var convertColumn = (columnName, columns, record, skipTypes) => {
    const column = columns.find((x) => x.name === columnName);
    const colType = column === null || column === void 0 ? void 0 : column.type;
    const value = record[columnName];
    if (colType && !skipTypes.includes(colType)) {
      return convertCell(colType, value);
    }
    return noop(value);
  };
  var convertCell = (type, value) => {
    if (type.charAt(0) === "_") {
      const dataType = type.slice(1, type.length);
      return toArray(value, dataType);
    }
    switch (type) {
      case PostgresTypes.bool:
        return toBoolean(value);
      case PostgresTypes.float4:
      case PostgresTypes.float8:
      case PostgresTypes.int2:
      case PostgresTypes.int4:
      case PostgresTypes.int8:
      case PostgresTypes.numeric:
      case PostgresTypes.oid:
        return toNumber(value);
      case PostgresTypes.json:
      case PostgresTypes.jsonb:
        return toJson(value);
      case PostgresTypes.timestamp:
        return toTimestampString(value);
      // Format to be consistent with PostgREST
      case PostgresTypes.abstime:
      // To allow users to cast it based on Timezone
      case PostgresTypes.date:
      // To allow users to cast it based on Timezone
      case PostgresTypes.daterange:
      case PostgresTypes.int4range:
      case PostgresTypes.int8range:
      case PostgresTypes.money:
      case PostgresTypes.reltime:
      // To allow users to cast it based on Timezone
      case PostgresTypes.text:
      case PostgresTypes.time:
      // To allow users to cast it based on Timezone
      case PostgresTypes.timestamptz:
      // To allow users to cast it based on Timezone
      case PostgresTypes.timetz:
      // To allow users to cast it based on Timezone
      case PostgresTypes.tsrange:
      case PostgresTypes.tstzrange:
        return noop(value);
      default:
        return noop(value);
    }
  };
  var noop = (value) => {
    return value;
  };
  var toBoolean = (value) => {
    switch (value) {
      case "t":
        return true;
      case "f":
        return false;
      default:
        return value;
    }
  };
  var toNumber = (value) => {
    if (typeof value === "string") {
      const parsedValue = parseFloat(value);
      if (!Number.isNaN(parsedValue)) {
        return parsedValue;
      }
    }
    return value;
  };
  var toJson = (value) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (_a) {
        return value;
      }
    }
    return value;
  };
  var toArray = (value, type) => {
    if (typeof value !== "string") {
      return value;
    }
    const lastIdx = value.length - 1;
    const closeBrace = value[lastIdx];
    const openBrace = value[0];
    if (openBrace === "{" && closeBrace === "}") {
      let arr;
      const valTrim = value.slice(1, lastIdx);
      try {
        arr = JSON.parse("[" + valTrim + "]");
      } catch (_) {
        arr = valTrim ? valTrim.split(",") : [];
      }
      return arr.map((val) => convertCell(type, val));
    }
    return value;
  };
  var toTimestampString = (value) => {
    if (typeof value === "string") {
      return value.replace(" ", "T");
    }
    return value;
  };
  var httpEndpointURL = (socketUrl) => {
    const wsUrl = new URL(socketUrl);
    wsUrl.protocol = wsUrl.protocol.replace(/^ws/i, "http");
    wsUrl.pathname = wsUrl.pathname.replace(/\/+$/, "").replace(/\/socket\/websocket$/i, "").replace(/\/socket$/i, "").replace(/\/websocket$/i, "");
    if (wsUrl.pathname === "" || wsUrl.pathname === "/") {
      wsUrl.pathname = "/api/broadcast";
    } else {
      wsUrl.pathname = wsUrl.pathname + "/api/broadcast";
    }
    return wsUrl.href;
  };

  // node_modules/@supabase/realtime-js/dist/module/lib/push.js
  var Push = class {
    /**
     * Initializes the Push
     *
     * @param channel The Channel
     * @param event The event, for example `"phx_join"`
     * @param payload The payload, for example `{user_id: 123}`
     * @param timeout The push timeout in milliseconds
     */
    constructor(channel, event, payload = {}, timeout = DEFAULT_TIMEOUT) {
      this.channel = channel;
      this.event = event;
      this.payload = payload;
      this.timeout = timeout;
      this.sent = false;
      this.timeoutTimer = void 0;
      this.ref = "";
      this.receivedResp = null;
      this.recHooks = [];
      this.refEvent = null;
    }
    resend(timeout) {
      this.timeout = timeout;
      this._cancelRefEvent();
      this.ref = "";
      this.refEvent = null;
      this.receivedResp = null;
      this.sent = false;
      this.send();
    }
    send() {
      if (this._hasReceived("timeout")) {
        return;
      }
      this.startTimeout();
      this.sent = true;
      this.channel.socket.push({
        topic: this.channel.topic,
        event: this.event,
        payload: this.payload,
        ref: this.ref,
        join_ref: this.channel._joinRef()
      });
    }
    updatePayload(payload) {
      this.payload = Object.assign(Object.assign({}, this.payload), payload);
    }
    receive(status, callback) {
      var _a;
      if (this._hasReceived(status)) {
        callback((_a = this.receivedResp) === null || _a === void 0 ? void 0 : _a.response);
      }
      this.recHooks.push({ status, callback });
      return this;
    }
    startTimeout() {
      if (this.timeoutTimer) {
        return;
      }
      this.ref = this.channel.socket._makeRef();
      this.refEvent = this.channel._replyEventName(this.ref);
      const callback = (payload) => {
        this._cancelRefEvent();
        this._cancelTimeout();
        this.receivedResp = payload;
        this._matchReceive(payload);
      };
      this.channel._on(this.refEvent, {}, callback);
      this.timeoutTimer = setTimeout(() => {
        this.trigger("timeout", {});
      }, this.timeout);
    }
    trigger(status, response) {
      if (this.refEvent)
        this.channel._trigger(this.refEvent, { status, response });
    }
    destroy() {
      this._cancelRefEvent();
      this._cancelTimeout();
    }
    _cancelRefEvent() {
      if (!this.refEvent) {
        return;
      }
      this.channel._off(this.refEvent, {});
    }
    _cancelTimeout() {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = void 0;
    }
    _matchReceive({ status, response }) {
      this.recHooks.filter((h) => h.status === status).forEach((h) => h.callback(response));
    }
    _hasReceived(status) {
      return this.receivedResp && this.receivedResp.status === status;
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js
  var REALTIME_PRESENCE_LISTEN_EVENTS;
  (function(REALTIME_PRESENCE_LISTEN_EVENTS2) {
    REALTIME_PRESENCE_LISTEN_EVENTS2["SYNC"] = "sync";
    REALTIME_PRESENCE_LISTEN_EVENTS2["JOIN"] = "join";
    REALTIME_PRESENCE_LISTEN_EVENTS2["LEAVE"] = "leave";
  })(REALTIME_PRESENCE_LISTEN_EVENTS || (REALTIME_PRESENCE_LISTEN_EVENTS = {}));
  var RealtimePresence = class _RealtimePresence {
    /**
     * Creates a Presence helper that keeps the local presence state in sync with the server.
     *
     * @param channel - The realtime channel to bind to.
     * @param opts - Optional custom event names, e.g. `{ events: { state: 'state', diff: 'diff' } }`.
     *
     * @example
     * ```ts
     * const presence = new RealtimePresence(channel)
     *
     * channel.on('presence', ({ event, key }) => {
     *   console.log(`Presence ${event} on ${key}`)
     * })
     * ```
     */
    constructor(channel, opts) {
      this.channel = channel;
      this.state = {};
      this.pendingDiffs = [];
      this.joinRef = null;
      this.enabled = false;
      this.caller = {
        onJoin: () => {
        },
        onLeave: () => {
        },
        onSync: () => {
        }
      };
      const events = (opts === null || opts === void 0 ? void 0 : opts.events) || {
        state: "presence_state",
        diff: "presence_diff"
      };
      this.channel._on(events.state, {}, (newState) => {
        const { onJoin, onLeave, onSync } = this.caller;
        this.joinRef = this.channel._joinRef();
        this.state = _RealtimePresence.syncState(this.state, newState, onJoin, onLeave);
        this.pendingDiffs.forEach((diff) => {
          this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
        });
        this.pendingDiffs = [];
        onSync();
      });
      this.channel._on(events.diff, {}, (diff) => {
        const { onJoin, onLeave, onSync } = this.caller;
        if (this.inPendingSyncState()) {
          this.pendingDiffs.push(diff);
        } else {
          this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
          onSync();
        }
      });
      this.onJoin((key, currentPresences, newPresences) => {
        this.channel._trigger("presence", {
          event: "join",
          key,
          currentPresences,
          newPresences
        });
      });
      this.onLeave((key, currentPresences, leftPresences) => {
        this.channel._trigger("presence", {
          event: "leave",
          key,
          currentPresences,
          leftPresences
        });
      });
      this.onSync(() => {
        this.channel._trigger("presence", { event: "sync" });
      });
    }
    /**
     * Used to sync the list of presences on the server with the
     * client's state.
     *
     * An optional `onJoin` and `onLeave` callback can be provided to
     * react to changes in the client's local presences across
     * disconnects and reconnects with the server.
     *
     * @internal
     */
    static syncState(currentState, newState, onJoin, onLeave) {
      const state2 = this.cloneDeep(currentState);
      const transformedState = this.transformState(newState);
      const joins = {};
      const leaves = {};
      this.map(state2, (key, presences) => {
        if (!transformedState[key]) {
          leaves[key] = presences;
        }
      });
      this.map(transformedState, (key, newPresences) => {
        const currentPresences = state2[key];
        if (currentPresences) {
          const newPresenceRefs = newPresences.map((m) => m.presence_ref);
          const curPresenceRefs = currentPresences.map((m) => m.presence_ref);
          const joinedPresences = newPresences.filter((m) => curPresenceRefs.indexOf(m.presence_ref) < 0);
          const leftPresences = currentPresences.filter((m) => newPresenceRefs.indexOf(m.presence_ref) < 0);
          if (joinedPresences.length > 0) {
            joins[key] = joinedPresences;
          }
          if (leftPresences.length > 0) {
            leaves[key] = leftPresences;
          }
        } else {
          joins[key] = newPresences;
        }
      });
      return this.syncDiff(state2, { joins, leaves }, onJoin, onLeave);
    }
    /**
     * Used to sync a diff of presence join and leave events from the
     * server, as they happen.
     *
     * Like `syncState`, `syncDiff` accepts optional `onJoin` and
     * `onLeave` callbacks to react to a user joining or leaving from a
     * device.
     *
     * @internal
     */
    static syncDiff(state2, diff, onJoin, onLeave) {
      const { joins, leaves } = {
        joins: this.transformState(diff.joins),
        leaves: this.transformState(diff.leaves)
      };
      if (!onJoin) {
        onJoin = () => {
        };
      }
      if (!onLeave) {
        onLeave = () => {
        };
      }
      this.map(joins, (key, newPresences) => {
        var _a;
        const currentPresences = (_a = state2[key]) !== null && _a !== void 0 ? _a : [];
        state2[key] = this.cloneDeep(newPresences);
        if (currentPresences.length > 0) {
          const joinedPresenceRefs = state2[key].map((m) => m.presence_ref);
          const curPresences = currentPresences.filter((m) => joinedPresenceRefs.indexOf(m.presence_ref) < 0);
          state2[key].unshift(...curPresences);
        }
        onJoin(key, currentPresences, newPresences);
      });
      this.map(leaves, (key, leftPresences) => {
        let currentPresences = state2[key];
        if (!currentPresences)
          return;
        const presenceRefsToRemove = leftPresences.map((m) => m.presence_ref);
        currentPresences = currentPresences.filter((m) => presenceRefsToRemove.indexOf(m.presence_ref) < 0);
        state2[key] = currentPresences;
        onLeave(key, currentPresences, leftPresences);
        if (currentPresences.length === 0)
          delete state2[key];
      });
      return state2;
    }
    /** @internal */
    static map(obj, func) {
      return Object.getOwnPropertyNames(obj).map((key) => func(key, obj[key]));
    }
    /**
     * Remove 'metas' key
     * Change 'phx_ref' to 'presence_ref'
     * Remove 'phx_ref' and 'phx_ref_prev'
     *
     * @example
     * // returns {
     *  abc123: [
     *    { presence_ref: '2', user_id: 1 },
     *    { presence_ref: '3', user_id: 2 }
     *  ]
     * }
     * RealtimePresence.transformState({
     *  abc123: {
     *    metas: [
     *      { phx_ref: '2', phx_ref_prev: '1' user_id: 1 },
     *      { phx_ref: '3', user_id: 2 }
     *    ]
     *  }
     * })
     *
     * @internal
     */
    static transformState(state2) {
      state2 = this.cloneDeep(state2);
      return Object.getOwnPropertyNames(state2).reduce((newState, key) => {
        const presences = state2[key];
        if ("metas" in presences) {
          newState[key] = presences.metas.map((presence) => {
            presence["presence_ref"] = presence["phx_ref"];
            delete presence["phx_ref"];
            delete presence["phx_ref_prev"];
            return presence;
          });
        } else {
          newState[key] = presences;
        }
        return newState;
      }, {});
    }
    /** @internal */
    static cloneDeep(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
    /** @internal */
    onJoin(callback) {
      this.caller.onJoin = callback;
    }
    /** @internal */
    onLeave(callback) {
      this.caller.onLeave = callback;
    }
    /** @internal */
    onSync(callback) {
      this.caller.onSync = callback;
    }
    /** @internal */
    inPendingSyncState() {
      return !this.joinRef || this.joinRef !== this.channel._joinRef();
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js
  var REALTIME_POSTGRES_CHANGES_LISTEN_EVENT;
  (function(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2) {
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["ALL"] = "*";
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["INSERT"] = "INSERT";
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["UPDATE"] = "UPDATE";
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["DELETE"] = "DELETE";
  })(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT || (REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {}));
  var REALTIME_LISTEN_TYPES;
  (function(REALTIME_LISTEN_TYPES2) {
    REALTIME_LISTEN_TYPES2["BROADCAST"] = "broadcast";
    REALTIME_LISTEN_TYPES2["PRESENCE"] = "presence";
    REALTIME_LISTEN_TYPES2["POSTGRES_CHANGES"] = "postgres_changes";
    REALTIME_LISTEN_TYPES2["SYSTEM"] = "system";
  })(REALTIME_LISTEN_TYPES || (REALTIME_LISTEN_TYPES = {}));
  var REALTIME_SUBSCRIBE_STATES;
  (function(REALTIME_SUBSCRIBE_STATES2) {
    REALTIME_SUBSCRIBE_STATES2["SUBSCRIBED"] = "SUBSCRIBED";
    REALTIME_SUBSCRIBE_STATES2["TIMED_OUT"] = "TIMED_OUT";
    REALTIME_SUBSCRIBE_STATES2["CLOSED"] = "CLOSED";
    REALTIME_SUBSCRIBE_STATES2["CHANNEL_ERROR"] = "CHANNEL_ERROR";
  })(REALTIME_SUBSCRIBE_STATES || (REALTIME_SUBSCRIBE_STATES = {}));
  var RealtimeChannel = class _RealtimeChannel {
    /**
     * Creates a channel that can broadcast messages, sync presence, and listen to Postgres changes.
     *
     * The topic determines which realtime stream you are subscribing to. Config options let you
     * enable acknowledgement for broadcasts, presence tracking, or private channels.
     *
     * @example
     * ```ts
     * import RealtimeClient from '@supabase/realtime-js'
     *
     * const client = new RealtimeClient('https://xyzcompany.supabase.co/realtime/v1', {
     *   params: { apikey: 'public-anon-key' },
     * })
     * const channel = new RealtimeChannel('realtime:public:messages', { config: {} }, client)
     * ```
     */
    constructor(topic, params = { config: {} }, socket) {
      var _a, _b;
      this.topic = topic;
      this.params = params;
      this.socket = socket;
      this.bindings = {};
      this.state = CHANNEL_STATES.closed;
      this.joinedOnce = false;
      this.pushBuffer = [];
      this.subTopic = topic.replace(/^realtime:/i, "");
      this.params.config = Object.assign({
        broadcast: { ack: false, self: false },
        presence: { key: "", enabled: false },
        private: false
      }, params.config);
      this.timeout = this.socket.timeout;
      this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
      this.rejoinTimer = new Timer(() => this._rejoinUntilConnected(), this.socket.reconnectAfterMs);
      this.joinPush.receive("ok", () => {
        this.state = CHANNEL_STATES.joined;
        this.rejoinTimer.reset();
        this.pushBuffer.forEach((pushEvent) => pushEvent.send());
        this.pushBuffer = [];
      });
      this._onClose(() => {
        this.rejoinTimer.reset();
        this.socket.log("channel", `close ${this.topic} ${this._joinRef()}`);
        this.state = CHANNEL_STATES.closed;
        this.socket._remove(this);
      });
      this._onError((reason) => {
        if (this._isLeaving() || this._isClosed()) {
          return;
        }
        this.socket.log("channel", `error ${this.topic}`, reason);
        this.state = CHANNEL_STATES.errored;
        this.rejoinTimer.scheduleTimeout();
      });
      this.joinPush.receive("timeout", () => {
        if (!this._isJoining()) {
          return;
        }
        this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
        this.state = CHANNEL_STATES.errored;
        this.rejoinTimer.scheduleTimeout();
      });
      this.joinPush.receive("error", (reason) => {
        if (this._isLeaving() || this._isClosed()) {
          return;
        }
        this.socket.log("channel", `error ${this.topic}`, reason);
        this.state = CHANNEL_STATES.errored;
        this.rejoinTimer.scheduleTimeout();
      });
      this._on(CHANNEL_EVENTS.reply, {}, (payload, ref) => {
        this._trigger(this._replyEventName(ref), payload);
      });
      this.presence = new RealtimePresence(this);
      this.broadcastEndpointURL = httpEndpointURL(this.socket.endPoint);
      this.private = this.params.config.private || false;
      if (!this.private && ((_b = (_a = this.params.config) === null || _a === void 0 ? void 0 : _a.broadcast) === null || _b === void 0 ? void 0 : _b.replay)) {
        throw `tried to use replay on public channel '${this.topic}'. It must be a private channel.`;
      }
    }
    /** Subscribe registers your client with the server */
    subscribe(callback, timeout = this.timeout) {
      var _a, _b, _c;
      if (!this.socket.isConnected()) {
        this.socket.connect();
      }
      if (this.state == CHANNEL_STATES.closed) {
        const { config: { broadcast, presence, private: isPrivate } } = this.params;
        const postgres_changes = (_b = (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.map((r) => r.filter)) !== null && _b !== void 0 ? _b : [];
        const presence_enabled = !!this.bindings[REALTIME_LISTEN_TYPES.PRESENCE] && this.bindings[REALTIME_LISTEN_TYPES.PRESENCE].length > 0 || ((_c = this.params.config.presence) === null || _c === void 0 ? void 0 : _c.enabled) === true;
        const accessTokenPayload = {};
        const config = {
          broadcast,
          presence: Object.assign(Object.assign({}, presence), { enabled: presence_enabled }),
          postgres_changes,
          private: isPrivate
        };
        if (this.socket.accessTokenValue) {
          accessTokenPayload.access_token = this.socket.accessTokenValue;
        }
        this._onError((e) => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, e));
        this._onClose(() => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CLOSED));
        this.updateJoinPayload(Object.assign({ config }, accessTokenPayload));
        this.joinedOnce = true;
        this._rejoin(timeout);
        this.joinPush.receive("ok", async ({ postgres_changes: postgres_changes2 }) => {
          var _a2;
          if (!this.socket._isManualToken()) {
            this.socket.setAuth();
          }
          if (postgres_changes2 === void 0) {
            callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
            return;
          } else {
            const clientPostgresBindings = this.bindings.postgres_changes;
            const bindingsLen = (_a2 = clientPostgresBindings === null || clientPostgresBindings === void 0 ? void 0 : clientPostgresBindings.length) !== null && _a2 !== void 0 ? _a2 : 0;
            const newPostgresBindings = [];
            for (let i = 0; i < bindingsLen; i++) {
              const clientPostgresBinding = clientPostgresBindings[i];
              const { filter: { event, schema, table, filter } } = clientPostgresBinding;
              const serverPostgresFilter = postgres_changes2 && postgres_changes2[i];
              if (serverPostgresFilter && serverPostgresFilter.event === event && _RealtimeChannel.isFilterValueEqual(serverPostgresFilter.schema, schema) && _RealtimeChannel.isFilterValueEqual(serverPostgresFilter.table, table) && _RealtimeChannel.isFilterValueEqual(serverPostgresFilter.filter, filter)) {
                newPostgresBindings.push(Object.assign(Object.assign({}, clientPostgresBinding), { id: serverPostgresFilter.id }));
              } else {
                this.unsubscribe();
                this.state = CHANNEL_STATES.errored;
                callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error("mismatch between server and client bindings for postgres changes"));
                return;
              }
            }
            this.bindings.postgres_changes = newPostgresBindings;
            callback && callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
            return;
          }
        }).receive("error", (error) => {
          this.state = CHANNEL_STATES.errored;
          callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error(JSON.stringify(Object.values(error).join(", ") || "error")));
          return;
        }).receive("timeout", () => {
          callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.TIMED_OUT);
          return;
        });
      }
      return this;
    }
    /**
     * Returns the current presence state for this channel.
     *
     * The shape is a map keyed by presence key (for example a user id) where each entry contains the
     * tracked metadata for that user.
     */
    presenceState() {
      return this.presence.state;
    }
    /**
     * Sends the supplied payload to the presence tracker so other subscribers can see that this
     * client is online. Use `untrack` to stop broadcasting presence for the same key.
     */
    async track(payload, opts = {}) {
      return await this.send({
        type: "presence",
        event: "track",
        payload
      }, opts.timeout || this.timeout);
    }
    /**
     * Removes the current presence state for this client.
     */
    async untrack(opts = {}) {
      return await this.send({
        type: "presence",
        event: "untrack"
      }, opts);
    }
    on(type, filter, callback) {
      if (this.state === CHANNEL_STATES.joined && type === REALTIME_LISTEN_TYPES.PRESENCE) {
        this.socket.log("channel", `resubscribe to ${this.topic} due to change in presence callbacks on joined channel`);
        this.unsubscribe().then(async () => await this.subscribe());
      }
      return this._on(type, filter, callback);
    }
    /**
     * Sends a broadcast message explicitly via REST API.
     *
     * This method always uses the REST API endpoint regardless of WebSocket connection state.
     * Useful when you want to guarantee REST delivery or when gradually migrating from implicit REST fallback.
     *
     * @param event The name of the broadcast event
     * @param payload Payload to be sent (required)
     * @param opts Options including timeout
     * @returns Promise resolving to object with success status, and error details if failed
     */
    async httpSend(event, payload, opts = {}) {
      var _a;
      if (payload === void 0 || payload === null) {
        return Promise.reject("Payload is required for httpSend()");
      }
      const headers = {
        apikey: this.socket.apiKey ? this.socket.apiKey : "",
        "Content-Type": "application/json"
      };
      if (this.socket.accessTokenValue) {
        headers["Authorization"] = `Bearer ${this.socket.accessTokenValue}`;
      }
      const options = {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            {
              topic: this.subTopic,
              event,
              payload,
              private: this.private
            }
          ]
        })
      };
      const response = await this._fetchWithTimeout(this.broadcastEndpointURL, options, (_a = opts.timeout) !== null && _a !== void 0 ? _a : this.timeout);
      if (response.status === 202) {
        return { success: true };
      }
      let errorMessage = response.statusText;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch (_b) {
      }
      return Promise.reject(new Error(errorMessage));
    }
    /**
     * Sends a message into the channel.
     *
     * @param args Arguments to send to channel
     * @param args.type The type of event to send
     * @param args.event The name of the event being sent
     * @param args.payload Payload to be sent
     * @param opts Options to be used during the send process
     */
    async send(args, opts = {}) {
      var _a, _b;
      if (!this._canPush() && args.type === "broadcast") {
        console.warn("Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.");
        const { event, payload: endpoint_payload } = args;
        const headers = {
          apikey: this.socket.apiKey ? this.socket.apiKey : "",
          "Content-Type": "application/json"
        };
        if (this.socket.accessTokenValue) {
          headers["Authorization"] = `Bearer ${this.socket.accessTokenValue}`;
        }
        const options = {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [
              {
                topic: this.subTopic,
                event,
                payload: endpoint_payload,
                private: this.private
              }
            ]
          })
        };
        try {
          const response = await this._fetchWithTimeout(this.broadcastEndpointURL, options, (_a = opts.timeout) !== null && _a !== void 0 ? _a : this.timeout);
          await ((_b = response.body) === null || _b === void 0 ? void 0 : _b.cancel());
          return response.ok ? "ok" : "error";
        } catch (error) {
          if (error.name === "AbortError") {
            return "timed out";
          } else {
            return "error";
          }
        }
      } else {
        return new Promise((resolve) => {
          var _a2, _b2, _c;
          const push = this._push(args.type, args, opts.timeout || this.timeout);
          if (args.type === "broadcast" && !((_c = (_b2 = (_a2 = this.params) === null || _a2 === void 0 ? void 0 : _a2.config) === null || _b2 === void 0 ? void 0 : _b2.broadcast) === null || _c === void 0 ? void 0 : _c.ack)) {
            resolve("ok");
          }
          push.receive("ok", () => resolve("ok"));
          push.receive("error", () => resolve("error"));
          push.receive("timeout", () => resolve("timed out"));
        });
      }
    }
    /**
     * Updates the payload that will be sent the next time the channel joins (reconnects).
     * Useful for rotating access tokens or updating config without re-creating the channel.
     */
    updateJoinPayload(payload) {
      this.joinPush.updatePayload(payload);
    }
    /**
     * Leaves the channel.
     *
     * Unsubscribes from server events, and instructs channel to terminate on server.
     * Triggers onClose() hooks.
     *
     * To receive leave acknowledgements, use the a `receive` hook to bind to the server ack, ie:
     * channel.unsubscribe().receive("ok", () => alert("left!") )
     */
    unsubscribe(timeout = this.timeout) {
      this.state = CHANNEL_STATES.leaving;
      const onClose = () => {
        this.socket.log("channel", `leave ${this.topic}`);
        this._trigger(CHANNEL_EVENTS.close, "leave", this._joinRef());
      };
      this.joinPush.destroy();
      let leavePush = null;
      return new Promise((resolve) => {
        leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
        leavePush.receive("ok", () => {
          onClose();
          resolve("ok");
        }).receive("timeout", () => {
          onClose();
          resolve("timed out");
        }).receive("error", () => {
          resolve("error");
        });
        leavePush.send();
        if (!this._canPush()) {
          leavePush.trigger("ok", {});
        }
      }).finally(() => {
        leavePush === null || leavePush === void 0 ? void 0 : leavePush.destroy();
      });
    }
    /**
     * Teardown the channel.
     *
     * Destroys and stops related timers.
     */
    teardown() {
      this.pushBuffer.forEach((push) => push.destroy());
      this.pushBuffer = [];
      this.rejoinTimer.reset();
      this.joinPush.destroy();
      this.state = CHANNEL_STATES.closed;
      this.bindings = {};
    }
    /** @internal */
    async _fetchWithTimeout(url, options, timeout) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await this.socket.fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal }));
      clearTimeout(id);
      return response;
    }
    /** @internal */
    _push(event, payload, timeout = this.timeout) {
      if (!this.joinedOnce) {
        throw `tried to push '${event}' to '${this.topic}' before joining. Use channel.subscribe() before pushing events`;
      }
      let pushEvent = new Push(this, event, payload, timeout);
      if (this._canPush()) {
        pushEvent.send();
      } else {
        this._addToPushBuffer(pushEvent);
      }
      return pushEvent;
    }
    /** @internal */
    _addToPushBuffer(pushEvent) {
      pushEvent.startTimeout();
      this.pushBuffer.push(pushEvent);
      if (this.pushBuffer.length > MAX_PUSH_BUFFER_SIZE) {
        const removedPush = this.pushBuffer.shift();
        if (removedPush) {
          removedPush.destroy();
          this.socket.log("channel", `discarded push due to buffer overflow: ${removedPush.event}`, removedPush.payload);
        }
      }
    }
    /**
     * Overridable message hook
     *
     * Receives all events for specialized message handling before dispatching to the channel callbacks.
     * Must return the payload, modified or unmodified.
     *
     * @internal
     */
    _onMessage(_event, payload, _ref) {
      return payload;
    }
    /** @internal */
    _isMember(topic) {
      return this.topic === topic;
    }
    /** @internal */
    _joinRef() {
      return this.joinPush.ref;
    }
    /** @internal */
    _trigger(type, payload, ref) {
      var _a, _b;
      const typeLower = type.toLocaleLowerCase();
      const { close, error, leave, join } = CHANNEL_EVENTS;
      const events = [close, error, leave, join];
      if (ref && events.indexOf(typeLower) >= 0 && ref !== this._joinRef()) {
        return;
      }
      let handledPayload = this._onMessage(typeLower, payload, ref);
      if (payload && !handledPayload) {
        throw "channel onMessage callbacks must return the payload, modified or unmodified";
      }
      if (["insert", "update", "delete"].includes(typeLower)) {
        (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.filter((bind) => {
          var _a2, _b2, _c;
          return ((_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event) === "*" || ((_c = (_b2 = bind.filter) === null || _b2 === void 0 ? void 0 : _b2.event) === null || _c === void 0 ? void 0 : _c.toLocaleLowerCase()) === typeLower;
        }).map((bind) => bind.callback(handledPayload, ref));
      } else {
        (_b = this.bindings[typeLower]) === null || _b === void 0 ? void 0 : _b.filter((bind) => {
          var _a2, _b2, _c, _d, _e, _f;
          if (["broadcast", "presence", "postgres_changes"].includes(typeLower)) {
            if ("id" in bind) {
              const bindId = bind.id;
              const bindEvent = (_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event;
              return bindId && ((_b2 = payload.ids) === null || _b2 === void 0 ? void 0 : _b2.includes(bindId)) && (bindEvent === "*" || (bindEvent === null || bindEvent === void 0 ? void 0 : bindEvent.toLocaleLowerCase()) === ((_c = payload.data) === null || _c === void 0 ? void 0 : _c.type.toLocaleLowerCase()));
            } else {
              const bindEvent = (_e = (_d = bind === null || bind === void 0 ? void 0 : bind.filter) === null || _d === void 0 ? void 0 : _d.event) === null || _e === void 0 ? void 0 : _e.toLocaleLowerCase();
              return bindEvent === "*" || bindEvent === ((_f = payload === null || payload === void 0 ? void 0 : payload.event) === null || _f === void 0 ? void 0 : _f.toLocaleLowerCase());
            }
          } else {
            return bind.type.toLocaleLowerCase() === typeLower;
          }
        }).map((bind) => {
          if (typeof handledPayload === "object" && "ids" in handledPayload) {
            const postgresChanges = handledPayload.data;
            const { schema, table, commit_timestamp, type: type2, errors } = postgresChanges;
            const enrichedPayload = {
              schema,
              table,
              commit_timestamp,
              eventType: type2,
              new: {},
              old: {},
              errors
            };
            handledPayload = Object.assign(Object.assign({}, enrichedPayload), this._getPayloadRecords(postgresChanges));
          }
          bind.callback(handledPayload, ref);
        });
      }
    }
    /** @internal */
    _isClosed() {
      return this.state === CHANNEL_STATES.closed;
    }
    /** @internal */
    _isJoined() {
      return this.state === CHANNEL_STATES.joined;
    }
    /** @internal */
    _isJoining() {
      return this.state === CHANNEL_STATES.joining;
    }
    /** @internal */
    _isLeaving() {
      return this.state === CHANNEL_STATES.leaving;
    }
    /** @internal */
    _replyEventName(ref) {
      return `chan_reply_${ref}`;
    }
    /** @internal */
    _on(type, filter, callback) {
      const typeLower = type.toLocaleLowerCase();
      const binding = {
        type: typeLower,
        filter,
        callback
      };
      if (this.bindings[typeLower]) {
        this.bindings[typeLower].push(binding);
      } else {
        this.bindings[typeLower] = [binding];
      }
      return this;
    }
    /** @internal */
    _off(type, filter) {
      const typeLower = type.toLocaleLowerCase();
      if (this.bindings[typeLower]) {
        this.bindings[typeLower] = this.bindings[typeLower].filter((bind) => {
          var _a;
          return !(((_a = bind.type) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === typeLower && _RealtimeChannel.isEqual(bind.filter, filter));
        });
      }
      return this;
    }
    /** @internal */
    static isEqual(obj1, obj2) {
      if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
      }
      for (const k in obj1) {
        if (obj1[k] !== obj2[k]) {
          return false;
        }
      }
      return true;
    }
    /**
     * Compares two optional filter values for equality.
     * Treats undefined, null, and empty string as equivalent empty values.
     * @internal
     */
    static isFilterValueEqual(serverValue, clientValue) {
      const normalizedServer = serverValue !== null && serverValue !== void 0 ? serverValue : void 0;
      const normalizedClient = clientValue !== null && clientValue !== void 0 ? clientValue : void 0;
      return normalizedServer === normalizedClient;
    }
    /** @internal */
    _rejoinUntilConnected() {
      this.rejoinTimer.scheduleTimeout();
      if (this.socket.isConnected()) {
        this._rejoin();
      }
    }
    /**
     * Registers a callback that will be executed when the channel closes.
     *
     * @internal
     */
    _onClose(callback) {
      this._on(CHANNEL_EVENTS.close, {}, callback);
    }
    /**
     * Registers a callback that will be executed when the channel encounteres an error.
     *
     * @internal
     */
    _onError(callback) {
      this._on(CHANNEL_EVENTS.error, {}, (reason) => callback(reason));
    }
    /**
     * Returns `true` if the socket is connected and the channel has been joined.
     *
     * @internal
     */
    _canPush() {
      return this.socket.isConnected() && this._isJoined();
    }
    /** @internal */
    _rejoin(timeout = this.timeout) {
      if (this._isLeaving()) {
        return;
      }
      this.socket._leaveOpenTopic(this.topic);
      this.state = CHANNEL_STATES.joining;
      this.joinPush.resend(timeout);
    }
    /** @internal */
    _getPayloadRecords(payload) {
      const records = {
        new: {},
        old: {}
      };
      if (payload.type === "INSERT" || payload.type === "UPDATE") {
        records.new = convertChangeData(payload.columns, payload.record);
      }
      if (payload.type === "UPDATE" || payload.type === "DELETE") {
        records.old = convertChangeData(payload.columns, payload.old_record);
      }
      return records;
    }
  };

  // node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js
  var noop2 = () => {
  };
  var CONNECTION_TIMEOUTS = {
    HEARTBEAT_INTERVAL: 25e3,
    RECONNECT_DELAY: 10,
    HEARTBEAT_TIMEOUT_FALLBACK: 100
  };
  var RECONNECT_INTERVALS = [1e3, 2e3, 5e3, 1e4];
  var DEFAULT_RECONNECT_FALLBACK = 1e4;
  var WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
  var RealtimeClient = class {
    /**
     * Initializes the Socket.
     *
     * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
     * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
     * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
     * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
     * @param options.params The optional params to pass when connecting.
     * @param options.headers Deprecated: headers cannot be set on websocket connections and this option will be removed in the future.
     * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
     * @param options.heartbeatCallback The optional function to handle heartbeat status and latency.
     * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
     * @param options.logLevel Sets the log level for Realtime
     * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
     * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
     * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
     * @param options.worker Use Web Worker to set a side flow. Defaults to false.
     * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
     * @param options.vsn The protocol version to use when connecting. Supported versions are "1.0.0" and "2.0.0". Defaults to "2.0.0".
     * @example
     * ```ts
     * import RealtimeClient from '@supabase/realtime-js'
     *
     * const client = new RealtimeClient('https://xyzcompany.supabase.co/realtime/v1', {
     *   params: { apikey: 'public-anon-key' },
     * })
     * client.connect()
     * ```
     */
    constructor(endPoint, options) {
      var _a;
      this.accessTokenValue = null;
      this.apiKey = null;
      this._manuallySetToken = false;
      this.channels = new Array();
      this.endPoint = "";
      this.httpEndpoint = "";
      this.headers = {};
      this.params = {};
      this.timeout = DEFAULT_TIMEOUT;
      this.transport = null;
      this.heartbeatIntervalMs = CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
      this.heartbeatTimer = void 0;
      this.pendingHeartbeatRef = null;
      this.heartbeatCallback = noop2;
      this.ref = 0;
      this.reconnectTimer = null;
      this.vsn = DEFAULT_VSN;
      this.logger = noop2;
      this.conn = null;
      this.sendBuffer = [];
      this.serializer = new Serializer();
      this.stateChangeCallbacks = {
        open: [],
        close: [],
        error: [],
        message: []
      };
      this.accessToken = null;
      this._connectionState = "disconnected";
      this._wasManualDisconnect = false;
      this._authPromise = null;
      this._heartbeatSentAt = null;
      this._resolveFetch = (customFetch) => {
        if (customFetch) {
          return (...args) => customFetch(...args);
        }
        return (...args) => fetch(...args);
      };
      if (!((_a = options === null || options === void 0 ? void 0 : options.params) === null || _a === void 0 ? void 0 : _a.apikey)) {
        throw new Error("API key is required to connect to Realtime");
      }
      this.apiKey = options.params.apikey;
      this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
      this.httpEndpoint = httpEndpointURL(endPoint);
      this._initializeOptions(options);
      this._setupReconnectionTimer();
      this.fetch = this._resolveFetch(options === null || options === void 0 ? void 0 : options.fetch);
    }
    /**
     * Connects the socket, unless already connected.
     */
    connect() {
      if (this.isConnecting() || this.isDisconnecting() || this.conn !== null && this.isConnected()) {
        return;
      }
      this._setConnectionState("connecting");
      if (this.accessToken && !this._authPromise) {
        this._setAuthSafely("connect");
      }
      if (this.transport) {
        this.conn = new this.transport(this.endpointURL());
      } else {
        try {
          this.conn = websocket_factory_default.createWebSocket(this.endpointURL());
        } catch (error) {
          this._setConnectionState("disconnected");
          const errorMessage = error.message;
          if (errorMessage.includes("Node.js")) {
            throw new Error(`${errorMessage}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`);
          }
          throw new Error(`WebSocket not available: ${errorMessage}`);
        }
      }
      this._setupConnectionHandlers();
    }
    /**
     * Returns the URL of the websocket.
     * @returns string The URL of the websocket.
     */
    endpointURL() {
      return this._appendParams(this.endPoint, Object.assign({}, this.params, { vsn: this.vsn }));
    }
    /**
     * Disconnects the socket.
     *
     * @param code A numeric status code to send on disconnect.
     * @param reason A custom reason for the disconnect.
     */
    disconnect(code, reason) {
      if (this.isDisconnecting()) {
        return;
      }
      this._setConnectionState("disconnecting", true);
      if (this.conn) {
        const fallbackTimer = setTimeout(() => {
          this._setConnectionState("disconnected");
        }, 100);
        this.conn.onclose = () => {
          clearTimeout(fallbackTimer);
          this._setConnectionState("disconnected");
        };
        if (typeof this.conn.close === "function") {
          if (code) {
            this.conn.close(code, reason !== null && reason !== void 0 ? reason : "");
          } else {
            this.conn.close();
          }
        }
        this._teardownConnection();
      } else {
        this._setConnectionState("disconnected");
      }
    }
    /**
     * Returns all created channels
     */
    getChannels() {
      return this.channels;
    }
    /**
     * Unsubscribes and removes a single channel
     * @param channel A RealtimeChannel instance
     */
    async removeChannel(channel) {
      const status = await channel.unsubscribe();
      if (this.channels.length === 0) {
        this.disconnect();
      }
      return status;
    }
    /**
     * Unsubscribes and removes all channels
     */
    async removeAllChannels() {
      const values_1 = await Promise.all(this.channels.map((channel) => channel.unsubscribe()));
      this.channels = [];
      this.disconnect();
      return values_1;
    }
    /**
     * Logs the message.
     *
     * For customized logging, `this.logger` can be overridden.
     */
    log(kind, msg, data) {
      this.logger(kind, msg, data);
    }
    /**
     * Returns the current state of the socket.
     */
    connectionState() {
      switch (this.conn && this.conn.readyState) {
        case SOCKET_STATES.connecting:
          return CONNECTION_STATE.Connecting;
        case SOCKET_STATES.open:
          return CONNECTION_STATE.Open;
        case SOCKET_STATES.closing:
          return CONNECTION_STATE.Closing;
        default:
          return CONNECTION_STATE.Closed;
      }
    }
    /**
     * Returns `true` is the connection is open.
     */
    isConnected() {
      return this.connectionState() === CONNECTION_STATE.Open;
    }
    /**
     * Returns `true` if the connection is currently connecting.
     */
    isConnecting() {
      return this._connectionState === "connecting";
    }
    /**
     * Returns `true` if the connection is currently disconnecting.
     */
    isDisconnecting() {
      return this._connectionState === "disconnecting";
    }
    /**
     * Creates (or reuses) a {@link RealtimeChannel} for the provided topic.
     *
     * Topics are automatically prefixed with `realtime:` to match the Realtime service.
     * If a channel with the same topic already exists it will be returned instead of creating
     * a duplicate connection.
     */
    channel(topic, params = { config: {} }) {
      const realtimeTopic = `realtime:${topic}`;
      const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
      if (!exists) {
        const chan = new RealtimeChannel(`realtime:${topic}`, params, this);
        this.channels.push(chan);
        return chan;
      } else {
        return exists;
      }
    }
    /**
     * Push out a message if the socket is connected.
     *
     * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
     */
    push(data) {
      const { topic, event, payload, ref } = data;
      const callback = () => {
        this.encode(data, (result) => {
          var _a;
          (_a = this.conn) === null || _a === void 0 ? void 0 : _a.send(result);
        });
      };
      this.log("push", `${topic} ${event} (${ref})`, payload);
      if (this.isConnected()) {
        callback();
      } else {
        this.sendBuffer.push(callback);
      }
    }
    /**
     * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
     *
     * If param is null it will use the `accessToken` callback function or the token set on the client.
     *
     * On callback used, it will set the value of the token internal to the client.
     *
     * When a token is explicitly provided, it will be preserved across channel operations
     * (including removeChannel and resubscribe). The `accessToken` callback will not be
     * invoked until `setAuth()` is called without arguments.
     *
     * @param token A JWT string to override the token set on the client.
     *
     * @example
     * // Use a manual token (preserved across resubscribes, ignores accessToken callback)
     * client.realtime.setAuth('my-custom-jwt')
     *
     * // Switch back to using the accessToken callback
     * client.realtime.setAuth()
     */
    async setAuth(token = null) {
      this._authPromise = this._performAuth(token);
      try {
        await this._authPromise;
      } finally {
        this._authPromise = null;
      }
    }
    /**
     * Returns true if the current access token was explicitly set via setAuth(token),
     * false if it was obtained via the accessToken callback.
     * @internal
     */
    _isManualToken() {
      return this._manuallySetToken;
    }
    /**
     * Sends a heartbeat message if the socket is connected.
     */
    async sendHeartbeat() {
      var _a;
      if (!this.isConnected()) {
        try {
          this.heartbeatCallback("disconnected");
        } catch (e) {
          this.log("error", "error in heartbeat callback", e);
        }
        return;
      }
      if (this.pendingHeartbeatRef) {
        this.pendingHeartbeatRef = null;
        this._heartbeatSentAt = null;
        this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
        try {
          this.heartbeatCallback("timeout");
        } catch (e) {
          this.log("error", "error in heartbeat callback", e);
        }
        this._wasManualDisconnect = false;
        (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close(WS_CLOSE_NORMAL, "heartbeat timeout");
        setTimeout(() => {
          var _a2;
          if (!this.isConnected()) {
            (_a2 = this.reconnectTimer) === null || _a2 === void 0 ? void 0 : _a2.scheduleTimeout();
          }
        }, CONNECTION_TIMEOUTS.HEARTBEAT_TIMEOUT_FALLBACK);
        return;
      }
      this._heartbeatSentAt = Date.now();
      this.pendingHeartbeatRef = this._makeRef();
      this.push({
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: this.pendingHeartbeatRef
      });
      try {
        this.heartbeatCallback("sent");
      } catch (e) {
        this.log("error", "error in heartbeat callback", e);
      }
      this._setAuthSafely("heartbeat");
    }
    /**
     * Sets a callback that receives lifecycle events for internal heartbeat messages.
     * Useful for instrumenting connection health (e.g. sent/ok/timeout/disconnected).
     */
    onHeartbeat(callback) {
      this.heartbeatCallback = callback;
    }
    /**
     * Flushes send buffer
     */
    flushSendBuffer() {
      if (this.isConnected() && this.sendBuffer.length > 0) {
        this.sendBuffer.forEach((callback) => callback());
        this.sendBuffer = [];
      }
    }
    /**
     * Return the next message ref, accounting for overflows
     *
     * @internal
     */
    _makeRef() {
      let newRef = this.ref + 1;
      if (newRef === this.ref) {
        this.ref = 0;
      } else {
        this.ref = newRef;
      }
      return this.ref.toString();
    }
    /**
     * Unsubscribe from channels with the specified topic.
     *
     * @internal
     */
    _leaveOpenTopic(topic) {
      let dupChannel = this.channels.find((c) => c.topic === topic && (c._isJoined() || c._isJoining()));
      if (dupChannel) {
        this.log("transport", `leaving duplicate topic "${topic}"`);
        dupChannel.unsubscribe();
      }
    }
    /**
     * Removes a subscription from the socket.
     *
     * @param channel An open subscription.
     *
     * @internal
     */
    _remove(channel) {
      this.channels = this.channels.filter((c) => c.topic !== channel.topic);
    }
    /** @internal */
    _onConnMessage(rawMessage) {
      this.decode(rawMessage.data, (msg) => {
        if (msg.topic === "phoenix" && msg.event === "phx_reply" && msg.ref && msg.ref === this.pendingHeartbeatRef) {
          const latency = this._heartbeatSentAt ? Date.now() - this._heartbeatSentAt : void 0;
          try {
            this.heartbeatCallback(msg.payload.status === "ok" ? "ok" : "error", latency);
          } catch (e) {
            this.log("error", "error in heartbeat callback", e);
          }
          this._heartbeatSentAt = null;
          this.pendingHeartbeatRef = null;
        }
        const { topic, event, payload, ref } = msg;
        const refString = ref ? `(${ref})` : "";
        const status = payload.status || "";
        this.log("receive", `${status} ${topic} ${event} ${refString}`.trim(), payload);
        this.channels.filter((channel) => channel._isMember(topic)).forEach((channel) => channel._trigger(event, payload, ref));
        this._triggerStateCallbacks("message", msg);
      });
    }
    /**
     * Clear specific timer
     * @internal
     */
    _clearTimer(timer) {
      var _a;
      if (timer === "heartbeat" && this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = void 0;
      } else if (timer === "reconnect") {
        (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.reset();
      }
    }
    /**
     * Clear all timers
     * @internal
     */
    _clearAllTimers() {
      this._clearTimer("heartbeat");
      this._clearTimer("reconnect");
    }
    /**
     * Setup connection handlers for WebSocket events
     * @internal
     */
    _setupConnectionHandlers() {
      if (!this.conn)
        return;
      if ("binaryType" in this.conn) {
        ;
        this.conn.binaryType = "arraybuffer";
      }
      this.conn.onopen = () => this._onConnOpen();
      this.conn.onerror = (error) => this._onConnError(error);
      this.conn.onmessage = (event) => this._onConnMessage(event);
      this.conn.onclose = (event) => this._onConnClose(event);
      if (this.conn.readyState === SOCKET_STATES.open) {
        this._onConnOpen();
      }
    }
    /**
     * Teardown connection and cleanup resources
     * @internal
     */
    _teardownConnection() {
      if (this.conn) {
        if (this.conn.readyState === SOCKET_STATES.open || this.conn.readyState === SOCKET_STATES.connecting) {
          try {
            this.conn.close();
          } catch (e) {
            this.log("error", "Error closing connection", e);
          }
        }
        this.conn.onopen = null;
        this.conn.onerror = null;
        this.conn.onmessage = null;
        this.conn.onclose = null;
        this.conn = null;
      }
      this._clearAllTimers();
      this._terminateWorker();
      this.channels.forEach((channel) => channel.teardown());
    }
    /** @internal */
    _onConnOpen() {
      this._setConnectionState("connected");
      this.log("transport", `connected to ${this.endpointURL()}`);
      const authPromise = this._authPromise || (this.accessToken && !this.accessTokenValue ? this.setAuth() : Promise.resolve());
      authPromise.then(() => {
        if (this.accessTokenValue) {
          this.channels.forEach((channel) => {
            channel.updateJoinPayload({ access_token: this.accessTokenValue });
          });
          this.sendBuffer = [];
          this.channels.forEach((channel) => {
            if (channel._isJoining()) {
              channel.joinPush.sent = false;
              channel.joinPush.send();
            }
          });
        }
        this.flushSendBuffer();
      }).catch((e) => {
        this.log("error", "error waiting for auth on connect", e);
        this.flushSendBuffer();
      });
      this._clearTimer("reconnect");
      if (!this.worker) {
        this._startHeartbeat();
      } else {
        if (!this.workerRef) {
          this._startWorkerHeartbeat();
        }
      }
      this._triggerStateCallbacks("open");
    }
    /** @internal */
    _startHeartbeat() {
      this.heartbeatTimer && clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
    }
    /** @internal */
    _startWorkerHeartbeat() {
      if (this.workerUrl) {
        this.log("worker", `starting worker for from ${this.workerUrl}`);
      } else {
        this.log("worker", `starting default worker`);
      }
      const objectUrl = this._workerObjectUrl(this.workerUrl);
      this.workerRef = new Worker(objectUrl);
      this.workerRef.onerror = (error) => {
        this.log("worker", "worker error", error.message);
        this._terminateWorker();
      };
      this.workerRef.onmessage = (event) => {
        if (event.data.event === "keepAlive") {
          this.sendHeartbeat();
        }
      };
      this.workerRef.postMessage({
        event: "start",
        interval: this.heartbeatIntervalMs
      });
    }
    /**
     * Terminate the Web Worker and clear the reference
     * @internal
     */
    _terminateWorker() {
      if (this.workerRef) {
        this.log("worker", "terminating worker");
        this.workerRef.terminate();
        this.workerRef = void 0;
      }
    }
    /** @internal */
    _onConnClose(event) {
      var _a;
      this._setConnectionState("disconnected");
      this.log("transport", "close", event);
      this._triggerChanError();
      this._clearTimer("heartbeat");
      if (!this._wasManualDisconnect) {
        (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.scheduleTimeout();
      }
      this._triggerStateCallbacks("close", event);
    }
    /** @internal */
    _onConnError(error) {
      this._setConnectionState("disconnected");
      this.log("transport", `${error}`);
      this._triggerChanError();
      this._triggerStateCallbacks("error", error);
      try {
        this.heartbeatCallback("error");
      } catch (e) {
        this.log("error", "error in heartbeat callback", e);
      }
    }
    /** @internal */
    _triggerChanError() {
      this.channels.forEach((channel) => channel._trigger(CHANNEL_EVENTS.error));
    }
    /** @internal */
    _appendParams(url, params) {
      if (Object.keys(params).length === 0) {
        return url;
      }
      const prefix = url.match(/\?/) ? "&" : "?";
      const query = new URLSearchParams(params);
      return `${url}${prefix}${query}`;
    }
    _workerObjectUrl(url) {
      let result_url;
      if (url) {
        result_url = url;
      } else {
        const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
        result_url = URL.createObjectURL(blob);
      }
      return result_url;
    }
    /**
     * Set connection state with proper state management
     * @internal
     */
    _setConnectionState(state2, manual = false) {
      this._connectionState = state2;
      if (state2 === "connecting") {
        this._wasManualDisconnect = false;
      } else if (state2 === "disconnecting") {
        this._wasManualDisconnect = manual;
      }
    }
    /**
     * Perform the actual auth operation
     * @internal
     */
    async _performAuth(token = null) {
      let tokenToSend;
      let isManualToken = false;
      if (token) {
        tokenToSend = token;
        isManualToken = true;
      } else if (this.accessToken) {
        try {
          tokenToSend = await this.accessToken();
        } catch (e) {
          this.log("error", "Error fetching access token from callback", e);
          tokenToSend = this.accessTokenValue;
        }
      } else {
        tokenToSend = this.accessTokenValue;
      }
      if (isManualToken) {
        this._manuallySetToken = true;
      } else if (this.accessToken) {
        this._manuallySetToken = false;
      }
      if (this.accessTokenValue != tokenToSend) {
        this.accessTokenValue = tokenToSend;
        this.channels.forEach((channel) => {
          const payload = {
            access_token: tokenToSend,
            version: DEFAULT_VERSION
          };
          tokenToSend && channel.updateJoinPayload(payload);
          if (channel.joinedOnce && channel._isJoined()) {
            channel._push(CHANNEL_EVENTS.access_token, {
              access_token: tokenToSend
            });
          }
        });
      }
    }
    /**
     * Wait for any in-flight auth operations to complete
     * @internal
     */
    async _waitForAuthIfNeeded() {
      if (this._authPromise) {
        await this._authPromise;
      }
    }
    /**
     * Safely call setAuth with standardized error handling
     * @internal
     */
    _setAuthSafely(context = "general") {
      if (!this._isManualToken()) {
        this.setAuth().catch((e) => {
          this.log("error", `Error setting auth in ${context}`, e);
        });
      }
    }
    /**
     * Trigger state change callbacks with proper error handling
     * @internal
     */
    _triggerStateCallbacks(event, data) {
      try {
        this.stateChangeCallbacks[event].forEach((callback) => {
          try {
            callback(data);
          } catch (e) {
            this.log("error", `error in ${event} callback`, e);
          }
        });
      } catch (e) {
        this.log("error", `error triggering ${event} callbacks`, e);
      }
    }
    /**
     * Setup reconnection timer with proper configuration
     * @internal
     */
    _setupReconnectionTimer() {
      this.reconnectTimer = new Timer(async () => {
        setTimeout(async () => {
          await this._waitForAuthIfNeeded();
          if (!this.isConnected()) {
            this.connect();
          }
        }, CONNECTION_TIMEOUTS.RECONNECT_DELAY);
      }, this.reconnectAfterMs);
    }
    /**
     * Initialize client options with defaults
     * @internal
     */
    _initializeOptions(options) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
      this.transport = (_a = options === null || options === void 0 ? void 0 : options.transport) !== null && _a !== void 0 ? _a : null;
      this.timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : DEFAULT_TIMEOUT;
      this.heartbeatIntervalMs = (_c = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _c !== void 0 ? _c : CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
      this.worker = (_d = options === null || options === void 0 ? void 0 : options.worker) !== null && _d !== void 0 ? _d : false;
      this.accessToken = (_e = options === null || options === void 0 ? void 0 : options.accessToken) !== null && _e !== void 0 ? _e : null;
      this.heartbeatCallback = (_f = options === null || options === void 0 ? void 0 : options.heartbeatCallback) !== null && _f !== void 0 ? _f : noop2;
      this.vsn = (_g = options === null || options === void 0 ? void 0 : options.vsn) !== null && _g !== void 0 ? _g : DEFAULT_VSN;
      if (options === null || options === void 0 ? void 0 : options.params)
        this.params = options.params;
      if (options === null || options === void 0 ? void 0 : options.logger)
        this.logger = options.logger;
      if ((options === null || options === void 0 ? void 0 : options.logLevel) || (options === null || options === void 0 ? void 0 : options.log_level)) {
        this.logLevel = options.logLevel || options.log_level;
        this.params = Object.assign(Object.assign({}, this.params), { log_level: this.logLevel });
      }
      this.reconnectAfterMs = (_h = options === null || options === void 0 ? void 0 : options.reconnectAfterMs) !== null && _h !== void 0 ? _h : ((tries) => {
        return RECONNECT_INTERVALS[tries - 1] || DEFAULT_RECONNECT_FALLBACK;
      });
      switch (this.vsn) {
        case VSN_1_0_0:
          this.encode = (_j = options === null || options === void 0 ? void 0 : options.encode) !== null && _j !== void 0 ? _j : ((payload, callback) => {
            return callback(JSON.stringify(payload));
          });
          this.decode = (_k = options === null || options === void 0 ? void 0 : options.decode) !== null && _k !== void 0 ? _k : ((payload, callback) => {
            return callback(JSON.parse(payload));
          });
          break;
        case VSN_2_0_0:
          this.encode = (_l = options === null || options === void 0 ? void 0 : options.encode) !== null && _l !== void 0 ? _l : this.serializer.encode.bind(this.serializer);
          this.decode = (_m = options === null || options === void 0 ? void 0 : options.decode) !== null && _m !== void 0 ? _m : this.serializer.decode.bind(this.serializer);
          break;
        default:
          throw new Error(`Unsupported serializer version: ${this.vsn}`);
      }
      if (this.worker) {
        if (typeof window !== "undefined" && !window.Worker) {
          throw new Error("Web Worker is not supported");
        }
        this.workerUrl = options === null || options === void 0 ? void 0 : options.workerUrl;
      }
    }
  };

  // node_modules/iceberg-js/dist/index.mjs
  var IcebergError = class extends Error {
    constructor(message, opts) {
      super(message);
      this.name = "IcebergError";
      this.status = opts.status;
      this.icebergType = opts.icebergType;
      this.icebergCode = opts.icebergCode;
      this.details = opts.details;
      this.isCommitStateUnknown = opts.icebergType === "CommitStateUnknownException" || [500, 502, 504].includes(opts.status) && opts.icebergType?.includes("CommitState") === true;
    }
    /**
     * Returns true if the error is a 404 Not Found error.
     */
    isNotFound() {
      return this.status === 404;
    }
    /**
     * Returns true if the error is a 409 Conflict error.
     */
    isConflict() {
      return this.status === 409;
    }
    /**
     * Returns true if the error is a 419 Authentication Timeout error.
     */
    isAuthenticationTimeout() {
      return this.status === 419;
    }
  };
  function buildUrl(baseUrl, path, query) {
    const url = new URL(path, baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== void 0) {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }
  async function buildAuthHeaders(auth) {
    if (!auth || auth.type === "none") {
      return {};
    }
    if (auth.type === "bearer") {
      return { Authorization: `Bearer ${auth.token}` };
    }
    if (auth.type === "header") {
      return { [auth.name]: auth.value };
    }
    if (auth.type === "custom") {
      return await auth.getHeaders();
    }
    return {};
  }
  function createFetchClient(options) {
    const fetchFn = options.fetchImpl ?? globalThis.fetch;
    return {
      async request({
        method,
        path,
        query,
        body,
        headers
      }) {
        const url = buildUrl(options.baseUrl, path, query);
        const authHeaders = await buildAuthHeaders(options.auth);
        const res = await fetchFn(url, {
          method,
          headers: {
            ...body ? { "Content-Type": "application/json" } : {},
            ...authHeaders,
            ...headers
          },
          body: body ? JSON.stringify(body) : void 0
        });
        const text = await res.text();
        const isJson = (res.headers.get("content-type") || "").includes("application/json");
        const data = isJson && text ? JSON.parse(text) : text;
        if (!res.ok) {
          const errBody = isJson ? data : void 0;
          const errorDetail = errBody?.error;
          throw new IcebergError(
            errorDetail?.message ?? `Request failed with status ${res.status}`,
            {
              status: res.status,
              icebergType: errorDetail?.type,
              icebergCode: errorDetail?.code,
              details: errBody
            }
          );
        }
        return { status: res.status, headers: res.headers, data };
      }
    };
  }
  function namespaceToPath(namespace) {
    return namespace.join("");
  }
  var NamespaceOperations = class {
    constructor(client, prefix = "") {
      this.client = client;
      this.prefix = prefix;
    }
    async listNamespaces(parent) {
      const query = parent ? { parent: namespaceToPath(parent.namespace) } : void 0;
      const response = await this.client.request({
        method: "GET",
        path: `${this.prefix}/namespaces`,
        query
      });
      return response.data.namespaces.map((ns) => ({ namespace: ns }));
    }
    async createNamespace(id, metadata) {
      const request = {
        namespace: id.namespace,
        properties: metadata?.properties
      };
      const response = await this.client.request({
        method: "POST",
        path: `${this.prefix}/namespaces`,
        body: request
      });
      return response.data;
    }
    async dropNamespace(id) {
      await this.client.request({
        method: "DELETE",
        path: `${this.prefix}/namespaces/${namespaceToPath(id.namespace)}`
      });
    }
    async loadNamespaceMetadata(id) {
      const response = await this.client.request({
        method: "GET",
        path: `${this.prefix}/namespaces/${namespaceToPath(id.namespace)}`
      });
      return {
        properties: response.data.properties
      };
    }
    async namespaceExists(id) {
      try {
        await this.client.request({
          method: "HEAD",
          path: `${this.prefix}/namespaces/${namespaceToPath(id.namespace)}`
        });
        return true;
      } catch (error) {
        if (error instanceof IcebergError && error.status === 404) {
          return false;
        }
        throw error;
      }
    }
    async createNamespaceIfNotExists(id, metadata) {
      try {
        return await this.createNamespace(id, metadata);
      } catch (error) {
        if (error instanceof IcebergError && error.status === 409) {
          return;
        }
        throw error;
      }
    }
  };
  function namespaceToPath2(namespace) {
    return namespace.join("");
  }
  var TableOperations = class {
    constructor(client, prefix = "", accessDelegation) {
      this.client = client;
      this.prefix = prefix;
      this.accessDelegation = accessDelegation;
    }
    async listTables(namespace) {
      const response = await this.client.request({
        method: "GET",
        path: `${this.prefix}/namespaces/${namespaceToPath2(namespace.namespace)}/tables`
      });
      return response.data.identifiers;
    }
    async createTable(namespace, request) {
      const headers = {};
      if (this.accessDelegation) {
        headers["X-Iceberg-Access-Delegation"] = this.accessDelegation;
      }
      const response = await this.client.request({
        method: "POST",
        path: `${this.prefix}/namespaces/${namespaceToPath2(namespace.namespace)}/tables`,
        body: request,
        headers
      });
      return response.data.metadata;
    }
    async updateTable(id, request) {
      const response = await this.client.request({
        method: "POST",
        path: `${this.prefix}/namespaces/${namespaceToPath2(id.namespace)}/tables/${id.name}`,
        body: request
      });
      return {
        "metadata-location": response.data["metadata-location"],
        metadata: response.data.metadata
      };
    }
    async dropTable(id, options) {
      await this.client.request({
        method: "DELETE",
        path: `${this.prefix}/namespaces/${namespaceToPath2(id.namespace)}/tables/${id.name}`,
        query: { purgeRequested: String(options?.purge ?? false) }
      });
    }
    async loadTable(id) {
      const headers = {};
      if (this.accessDelegation) {
        headers["X-Iceberg-Access-Delegation"] = this.accessDelegation;
      }
      const response = await this.client.request({
        method: "GET",
        path: `${this.prefix}/namespaces/${namespaceToPath2(id.namespace)}/tables/${id.name}`,
        headers
      });
      return response.data.metadata;
    }
    async tableExists(id) {
      const headers = {};
      if (this.accessDelegation) {
        headers["X-Iceberg-Access-Delegation"] = this.accessDelegation;
      }
      try {
        await this.client.request({
          method: "HEAD",
          path: `${this.prefix}/namespaces/${namespaceToPath2(id.namespace)}/tables/${id.name}`,
          headers
        });
        return true;
      } catch (error) {
        if (error instanceof IcebergError && error.status === 404) {
          return false;
        }
        throw error;
      }
    }
    async createTableIfNotExists(namespace, request) {
      try {
        return await this.createTable(namespace, request);
      } catch (error) {
        if (error instanceof IcebergError && error.status === 409) {
          return await this.loadTable({ namespace: namespace.namespace, name: request.name });
        }
        throw error;
      }
    }
  };
  var IcebergRestCatalog = class {
    /**
     * Creates a new Iceberg REST Catalog client.
     *
     * @param options - Configuration options for the catalog client
     */
    constructor(options) {
      let prefix = "v1";
      if (options.catalogName) {
        prefix += `/${options.catalogName}`;
      }
      const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;
      this.client = createFetchClient({
        baseUrl,
        auth: options.auth,
        fetchImpl: options.fetch
      });
      this.accessDelegation = options.accessDelegation?.join(",");
      this.namespaceOps = new NamespaceOperations(this.client, prefix);
      this.tableOps = new TableOperations(this.client, prefix, this.accessDelegation);
    }
    /**
     * Lists all namespaces in the catalog.
     *
     * @param parent - Optional parent namespace to list children under
     * @returns Array of namespace identifiers
     *
     * @example
     * ```typescript
     * // List all top-level namespaces
     * const namespaces = await catalog.listNamespaces();
     *
     * // List namespaces under a parent
     * const children = await catalog.listNamespaces({ namespace: ['analytics'] });
     * ```
     */
    async listNamespaces(parent) {
      return this.namespaceOps.listNamespaces(parent);
    }
    /**
     * Creates a new namespace in the catalog.
     *
     * @param id - Namespace identifier to create
     * @param metadata - Optional metadata properties for the namespace
     * @returns Response containing the created namespace and its properties
     *
     * @example
     * ```typescript
     * const response = await catalog.createNamespace(
     *   { namespace: ['analytics'] },
     *   { properties: { owner: 'data-team' } }
     * );
     * console.log(response.namespace); // ['analytics']
     * console.log(response.properties); // { owner: 'data-team', ... }
     * ```
     */
    async createNamespace(id, metadata) {
      return this.namespaceOps.createNamespace(id, metadata);
    }
    /**
     * Drops a namespace from the catalog.
     *
     * The namespace must be empty (contain no tables) before it can be dropped.
     *
     * @param id - Namespace identifier to drop
     *
     * @example
     * ```typescript
     * await catalog.dropNamespace({ namespace: ['analytics'] });
     * ```
     */
    async dropNamespace(id) {
      await this.namespaceOps.dropNamespace(id);
    }
    /**
     * Loads metadata for a namespace.
     *
     * @param id - Namespace identifier to load
     * @returns Namespace metadata including properties
     *
     * @example
     * ```typescript
     * const metadata = await catalog.loadNamespaceMetadata({ namespace: ['analytics'] });
     * console.log(metadata.properties);
     * ```
     */
    async loadNamespaceMetadata(id) {
      return this.namespaceOps.loadNamespaceMetadata(id);
    }
    /**
     * Lists all tables in a namespace.
     *
     * @param namespace - Namespace identifier to list tables from
     * @returns Array of table identifiers
     *
     * @example
     * ```typescript
     * const tables = await catalog.listTables({ namespace: ['analytics'] });
     * console.log(tables); // [{ namespace: ['analytics'], name: 'events' }, ...]
     * ```
     */
    async listTables(namespace) {
      return this.tableOps.listTables(namespace);
    }
    /**
     * Creates a new table in the catalog.
     *
     * @param namespace - Namespace to create the table in
     * @param request - Table creation request including name, schema, partition spec, etc.
     * @returns Table metadata for the created table
     *
     * @example
     * ```typescript
     * const metadata = await catalog.createTable(
     *   { namespace: ['analytics'] },
     *   {
     *     name: 'events',
     *     schema: {
     *       type: 'struct',
     *       fields: [
     *         { id: 1, name: 'id', type: 'long', required: true },
     *         { id: 2, name: 'timestamp', type: 'timestamp', required: true }
     *       ],
     *       'schema-id': 0
     *     },
     *     'partition-spec': {
     *       'spec-id': 0,
     *       fields: [
     *         { source_id: 2, field_id: 1000, name: 'ts_day', transform: 'day' }
     *       ]
     *     }
     *   }
     * );
     * ```
     */
    async createTable(namespace, request) {
      return this.tableOps.createTable(namespace, request);
    }
    /**
     * Updates an existing table's metadata.
     *
     * Can update the schema, partition spec, or properties of a table.
     *
     * @param id - Table identifier to update
     * @param request - Update request with fields to modify
     * @returns Response containing the metadata location and updated table metadata
     *
     * @example
     * ```typescript
     * const response = await catalog.updateTable(
     *   { namespace: ['analytics'], name: 'events' },
     *   {
     *     properties: { 'read.split.target-size': '134217728' }
     *   }
     * );
     * console.log(response['metadata-location']); // s3://...
     * console.log(response.metadata); // TableMetadata object
     * ```
     */
    async updateTable(id, request) {
      return this.tableOps.updateTable(id, request);
    }
    /**
     * Drops a table from the catalog.
     *
     * @param id - Table identifier to drop
     *
     * @example
     * ```typescript
     * await catalog.dropTable({ namespace: ['analytics'], name: 'events' });
     * ```
     */
    async dropTable(id, options) {
      await this.tableOps.dropTable(id, options);
    }
    /**
     * Loads metadata for a table.
     *
     * @param id - Table identifier to load
     * @returns Table metadata including schema, partition spec, location, etc.
     *
     * @example
     * ```typescript
     * const metadata = await catalog.loadTable({ namespace: ['analytics'], name: 'events' });
     * console.log(metadata.schema);
     * console.log(metadata.location);
     * ```
     */
    async loadTable(id) {
      return this.tableOps.loadTable(id);
    }
    /**
     * Checks if a namespace exists in the catalog.
     *
     * @param id - Namespace identifier to check
     * @returns True if the namespace exists, false otherwise
     *
     * @example
     * ```typescript
     * const exists = await catalog.namespaceExists({ namespace: ['analytics'] });
     * console.log(exists); // true or false
     * ```
     */
    async namespaceExists(id) {
      return this.namespaceOps.namespaceExists(id);
    }
    /**
     * Checks if a table exists in the catalog.
     *
     * @param id - Table identifier to check
     * @returns True if the table exists, false otherwise
     *
     * @example
     * ```typescript
     * const exists = await catalog.tableExists({ namespace: ['analytics'], name: 'events' });
     * console.log(exists); // true or false
     * ```
     */
    async tableExists(id) {
      return this.tableOps.tableExists(id);
    }
    /**
     * Creates a namespace if it does not exist.
     *
     * If the namespace already exists, returns void. If created, returns the response.
     *
     * @param id - Namespace identifier to create
     * @param metadata - Optional metadata properties for the namespace
     * @returns Response containing the created namespace and its properties, or void if it already exists
     *
     * @example
     * ```typescript
     * const response = await catalog.createNamespaceIfNotExists(
     *   { namespace: ['analytics'] },
     *   { properties: { owner: 'data-team' } }
     * );
     * if (response) {
     *   console.log('Created:', response.namespace);
     * } else {
     *   console.log('Already exists');
     * }
     * ```
     */
    async createNamespaceIfNotExists(id, metadata) {
      return this.namespaceOps.createNamespaceIfNotExists(id, metadata);
    }
    /**
     * Creates a table if it does not exist.
     *
     * If the table already exists, returns its metadata instead.
     *
     * @param namespace - Namespace to create the table in
     * @param request - Table creation request including name, schema, partition spec, etc.
     * @returns Table metadata for the created or existing table
     *
     * @example
     * ```typescript
     * const metadata = await catalog.createTableIfNotExists(
     *   { namespace: ['analytics'] },
     *   {
     *     name: 'events',
     *     schema: {
     *       type: 'struct',
     *       fields: [
     *         { id: 1, name: 'id', type: 'long', required: true },
     *         { id: 2, name: 'timestamp', type: 'timestamp', required: true }
     *       ],
     *       'schema-id': 0
     *     }
     *   }
     * );
     * ```
     */
    async createTableIfNotExists(namespace, request) {
      return this.tableOps.createTableIfNotExists(namespace, request);
    }
  };

  // node_modules/@supabase/storage-js/dist/index.mjs
  var StorageError = class extends Error {
    constructor(message, namespace = "storage", status, statusCode) {
      super(message);
      this.__isStorageError = true;
      this.namespace = namespace;
      this.name = namespace === "vectors" ? "StorageVectorsError" : "StorageError";
      this.status = status;
      this.statusCode = statusCode;
    }
  };
  function isStorageError(error) {
    return typeof error === "object" && error !== null && "__isStorageError" in error;
  }
  var StorageApiError = class extends StorageError {
    constructor(message, status, statusCode, namespace = "storage") {
      super(message, namespace, status, statusCode);
      this.name = namespace === "vectors" ? "StorageVectorsApiError" : "StorageApiError";
      this.status = status;
      this.statusCode = statusCode;
    }
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        status: this.status,
        statusCode: this.statusCode
      };
    }
  };
  var StorageUnknownError = class extends StorageError {
    constructor(message, originalError, namespace = "storage") {
      super(message, namespace);
      this.name = namespace === "vectors" ? "StorageVectorsUnknownError" : "StorageUnknownError";
      this.originalError = originalError;
    }
  };
  var resolveFetch2 = (customFetch) => {
    if (customFetch) return (...args) => customFetch(...args);
    return (...args) => fetch(...args);
  };
  var isPlainObject = (value) => {
    if (typeof value !== "object" || value === null) return false;
    const prototype = Object.getPrototypeOf(value);
    return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
  };
  var recursiveToCamel = (item) => {
    if (Array.isArray(item)) return item.map((el) => recursiveToCamel(el));
    else if (typeof item === "function" || item !== Object(item)) return item;
    const result = {};
    Object.entries(item).forEach(([key, value]) => {
      const newKey = key.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ""));
      result[newKey] = recursiveToCamel(value);
    });
    return result;
  };
  var isValidBucketName = (bucketName) => {
    if (!bucketName || typeof bucketName !== "string") return false;
    if (bucketName.length === 0 || bucketName.length > 100) return false;
    if (bucketName.trim() !== bucketName) return false;
    if (bucketName.includes("/") || bucketName.includes("\\")) return false;
    return /^[\w!.\*'() &$@=;:+,?-]+$/.test(bucketName);
  };
  function _typeof2(o) {
    "@babel/helpers - typeof";
    return _typeof2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
      return typeof o$1;
    } : function(o$1) {
      return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
    }, _typeof2(o);
  }
  function toPrimitive2(t, r) {
    if ("object" != _typeof2(t) || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != _typeof2(i)) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function toPropertyKey2(t) {
    var i = toPrimitive2(t, "string");
    return "symbol" == _typeof2(i) ? i : i + "";
  }
  function _defineProperty2(e, r, t) {
    return (r = toPropertyKey2(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys2(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r$1) {
        return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread22(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys2(Object(t), true).forEach(function(r$1) {
        _defineProperty2(e, r$1, t[r$1]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys2(Object(t)).forEach(function(r$1) {
        Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
      });
    }
    return e;
  }
  var _getErrorMessage = (err) => {
    var _err$error;
    return err.msg || err.message || err.error_description || (typeof err.error === "string" ? err.error : (_err$error = err.error) === null || _err$error === void 0 ? void 0 : _err$error.message) || JSON.stringify(err);
  };
  var handleError = async (error, reject, options, namespace) => {
    if (error && typeof error === "object" && "status" in error && "ok" in error && typeof error.status === "number" && !(options === null || options === void 0 ? void 0 : options.noResolveJson)) {
      const responseError = error;
      const status = responseError.status || 500;
      if (typeof responseError.json === "function") responseError.json().then((err) => {
        const statusCode = (err === null || err === void 0 ? void 0 : err.statusCode) || (err === null || err === void 0 ? void 0 : err.code) || status + "";
        reject(new StorageApiError(_getErrorMessage(err), status, statusCode, namespace));
      }).catch(() => {
        if (namespace === "vectors") {
          const statusCode = status + "";
          reject(new StorageApiError(responseError.statusText || `HTTP ${status} error`, status, statusCode, namespace));
        } else {
          const statusCode = status + "";
          reject(new StorageApiError(responseError.statusText || `HTTP ${status} error`, status, statusCode, namespace));
        }
      });
      else {
        const statusCode = status + "";
        reject(new StorageApiError(responseError.statusText || `HTTP ${status} error`, status, statusCode, namespace));
      }
    } else reject(new StorageUnknownError(_getErrorMessage(error), error, namespace));
  };
  var _getRequestParams = (method, options, parameters, body) => {
    const params = {
      method,
      headers: (options === null || options === void 0 ? void 0 : options.headers) || {}
    };
    if (method === "GET" || method === "HEAD" || !body) return _objectSpread22(_objectSpread22({}, params), parameters);
    if (isPlainObject(body)) {
      params.headers = _objectSpread22({ "Content-Type": "application/json" }, options === null || options === void 0 ? void 0 : options.headers);
      params.body = JSON.stringify(body);
    } else params.body = body;
    if (options === null || options === void 0 ? void 0 : options.duplex) params.duplex = options.duplex;
    return _objectSpread22(_objectSpread22({}, params), parameters);
  };
  async function _handleRequest(fetcher, method, url, options, parameters, body, namespace) {
    return new Promise((resolve, reject) => {
      fetcher(url, _getRequestParams(method, options, parameters, body)).then((result) => {
        if (!result.ok) throw result;
        if (options === null || options === void 0 ? void 0 : options.noResolveJson) return result;
        if (namespace === "vectors") {
          const contentType = result.headers.get("content-type");
          if (result.headers.get("content-length") === "0" || result.status === 204) return {};
          if (!contentType || !contentType.includes("application/json")) return {};
        }
        return result.json();
      }).then((data) => resolve(data)).catch((error) => handleError(error, reject, options, namespace));
    });
  }
  function createFetchApi(namespace = "storage") {
    return {
      get: async (fetcher, url, options, parameters) => {
        return _handleRequest(fetcher, "GET", url, options, parameters, void 0, namespace);
      },
      post: async (fetcher, url, body, options, parameters) => {
        return _handleRequest(fetcher, "POST", url, options, parameters, body, namespace);
      },
      put: async (fetcher, url, body, options, parameters) => {
        return _handleRequest(fetcher, "PUT", url, options, parameters, body, namespace);
      },
      head: async (fetcher, url, options, parameters) => {
        return _handleRequest(fetcher, "HEAD", url, _objectSpread22(_objectSpread22({}, options), {}, { noResolveJson: true }), parameters, void 0, namespace);
      },
      remove: async (fetcher, url, body, options, parameters) => {
        return _handleRequest(fetcher, "DELETE", url, options, parameters, body, namespace);
      }
    };
  }
  var defaultApi = createFetchApi("storage");
  var { get, post, put, head, remove } = defaultApi;
  var vectorsApi = createFetchApi("vectors");
  var BaseApiClient = class {
    /**
    * Creates a new BaseApiClient instance
    * @param url - Base URL for API requests
    * @param headers - Default headers for API requests
    * @param fetch - Optional custom fetch implementation
    * @param namespace - Error namespace ('storage' or 'vectors')
    */
    constructor(url, headers = {}, fetch$1, namespace = "storage") {
      this.shouldThrowOnError = false;
      this.url = url;
      this.headers = headers;
      this.fetch = resolveFetch2(fetch$1);
      this.namespace = namespace;
    }
    /**
    * Enable throwing errors instead of returning them.
    * When enabled, errors are thrown instead of returned in { data, error } format.
    *
    * @returns this - For method chaining
    */
    throwOnError() {
      this.shouldThrowOnError = true;
      return this;
    }
    /**
    * Set an HTTP header for the request.
    * Creates a shallow copy of headers to avoid mutating shared state.
    *
    * @param name - Header name
    * @param value - Header value
    * @returns this - For method chaining
    */
    setHeader(name, value) {
      this.headers = _objectSpread22(_objectSpread22({}, this.headers), {}, { [name]: value });
      return this;
    }
    /**
    * Handles API operation with standardized error handling
    * Eliminates repetitive try-catch blocks across all API methods
    *
    * This wrapper:
    * 1. Executes the operation
    * 2. Returns { data, error: null } on success
    * 3. Returns { data: null, error } on failure (if shouldThrowOnError is false)
    * 4. Throws error on failure (if shouldThrowOnError is true)
    *
    * @typeParam T - The expected data type from the operation
    * @param operation - Async function that performs the API call
    * @returns Promise with { data, error } tuple
    *
    * @example
    * ```typescript
    * async listBuckets() {
    *   return this.handleOperation(async () => {
    *     return await get(this.fetch, `${this.url}/bucket`, {
    *       headers: this.headers,
    *     })
    *   })
    * }
    * ```
    */
    async handleOperation(operation) {
      var _this = this;
      try {
        return {
          data: await operation(),
          error: null
        };
      } catch (error) {
        if (_this.shouldThrowOnError) throw error;
        if (isStorageError(error)) return {
          data: null,
          error
        };
        throw error;
      }
    }
  };
  var StreamDownloadBuilder = class {
    constructor(downloadFn, shouldThrowOnError) {
      this.downloadFn = downloadFn;
      this.shouldThrowOnError = shouldThrowOnError;
    }
    then(onfulfilled, onrejected) {
      return this.execute().then(onfulfilled, onrejected);
    }
    async execute() {
      var _this = this;
      try {
        return {
          data: (await _this.downloadFn()).body,
          error: null
        };
      } catch (error) {
        if (_this.shouldThrowOnError) throw error;
        if (isStorageError(error)) return {
          data: null,
          error
        };
        throw error;
      }
    }
  };
  var _Symbol$toStringTag;
  _Symbol$toStringTag = Symbol.toStringTag;
  var BlobDownloadBuilder = class {
    constructor(downloadFn, shouldThrowOnError) {
      this.downloadFn = downloadFn;
      this.shouldThrowOnError = shouldThrowOnError;
      this[_Symbol$toStringTag] = "BlobDownloadBuilder";
      this.promise = null;
    }
    asStream() {
      return new StreamDownloadBuilder(this.downloadFn, this.shouldThrowOnError);
    }
    then(onfulfilled, onrejected) {
      return this.getPromise().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
      return this.getPromise().catch(onrejected);
    }
    finally(onfinally) {
      return this.getPromise().finally(onfinally);
    }
    getPromise() {
      if (!this.promise) this.promise = this.execute();
      return this.promise;
    }
    async execute() {
      var _this = this;
      try {
        return {
          data: await (await _this.downloadFn()).blob(),
          error: null
        };
      } catch (error) {
        if (_this.shouldThrowOnError) throw error;
        if (isStorageError(error)) return {
          data: null,
          error
        };
        throw error;
      }
    }
  };
  var DEFAULT_SEARCH_OPTIONS = {
    limit: 100,
    offset: 0,
    sortBy: {
      column: "name",
      order: "asc"
    }
  };
  var DEFAULT_FILE_OPTIONS = {
    cacheControl: "3600",
    contentType: "text/plain;charset=UTF-8",
    upsert: false
  };
  var StorageFileApi = class extends BaseApiClient {
    constructor(url, headers = {}, bucketId, fetch$1) {
      super(url, headers, fetch$1, "storage");
      this.bucketId = bucketId;
    }
    /**
    * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
    *
    * @param method HTTP method.
    * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
    * @param fileBody The body of the file to be stored in the bucket.
    */
    async uploadOrUpdate(method, path, fileBody, fileOptions) {
      var _this = this;
      return _this.handleOperation(async () => {
        let body;
        const options = _objectSpread22(_objectSpread22({}, DEFAULT_FILE_OPTIONS), fileOptions);
        let headers = _objectSpread22(_objectSpread22({}, _this.headers), method === "POST" && { "x-upsert": String(options.upsert) });
        const metadata = options.metadata;
        if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
          body = new FormData();
          body.append("cacheControl", options.cacheControl);
          if (metadata) body.append("metadata", _this.encodeMetadata(metadata));
          body.append("", fileBody);
        } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
          body = fileBody;
          if (!body.has("cacheControl")) body.append("cacheControl", options.cacheControl);
          if (metadata && !body.has("metadata")) body.append("metadata", _this.encodeMetadata(metadata));
        } else {
          body = fileBody;
          headers["cache-control"] = `max-age=${options.cacheControl}`;
          headers["content-type"] = options.contentType;
          if (metadata) headers["x-metadata"] = _this.toBase64(_this.encodeMetadata(metadata));
          if ((typeof ReadableStream !== "undefined" && body instanceof ReadableStream || body && typeof body === "object" && "pipe" in body && typeof body.pipe === "function") && !options.duplex) options.duplex = "half";
        }
        if (fileOptions === null || fileOptions === void 0 ? void 0 : fileOptions.headers) headers = _objectSpread22(_objectSpread22({}, headers), fileOptions.headers);
        const cleanPath = _this._removeEmptyFolders(path);
        const _path = _this._getFinalPath(cleanPath);
        const data = await (method == "PUT" ? put : post)(_this.fetch, `${_this.url}/object/${_path}`, body, _objectSpread22({ headers }, (options === null || options === void 0 ? void 0 : options.duplex) ? { duplex: options.duplex } : {}));
        return {
          path: cleanPath,
          id: data.Id,
          fullPath: data.Key
        };
      });
    }
    /**
    * Uploads a file to an existing bucket.
    *
    * @category File Buckets
    * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
    * @param fileBody The body of the file to be stored in the bucket.
    * @param fileOptions Optional file upload options including cacheControl, contentType, upsert, and metadata.
    * @returns Promise with response containing file path, id, and fullPath or error
    *
    * @example Upload file
    * ```js
    * const avatarFile = event.target.files[0]
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .upload('public/avatar1.png', avatarFile, {
    *     cacheControl: '3600',
    *     upsert: false
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "path": "public/avatar1.png",
    *     "fullPath": "avatars/public/avatar1.png"
    *   },
    *   "error": null
    * }
    * ```
    *
    * @example Upload file using `ArrayBuffer` from base64 file data
    * ```js
    * import { decode } from 'base64-arraybuffer'
    *
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .upload('public/avatar1.png', decode('base64FileData'), {
    *     contentType: 'image/png'
    *   })
    * ```
    */
    async upload(path, fileBody, fileOptions) {
      return this.uploadOrUpdate("POST", path, fileBody, fileOptions);
    }
    /**
    * Upload a file with a token generated from `createSignedUploadUrl`.
    *
    * @category File Buckets
    * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
    * @param token The token generated from `createSignedUploadUrl`
    * @param fileBody The body of the file to be stored in the bucket.
    * @param fileOptions HTTP headers (cacheControl, contentType, etc.).
    * **Note:** The `upsert` option has no effect here. To enable upsert behavior,
    * pass `{ upsert: true }` when calling `createSignedUploadUrl()` instead.
    * @returns Promise with response containing file path and fullPath or error
    *
    * @example Upload to a signed URL
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .uploadToSignedUrl('folder/cat.jpg', 'token-from-createSignedUploadUrl', file)
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "path": "folder/cat.jpg",
    *     "fullPath": "avatars/folder/cat.jpg"
    *   },
    *   "error": null
    * }
    * ```
    */
    async uploadToSignedUrl(path, token, fileBody, fileOptions) {
      var _this3 = this;
      const cleanPath = _this3._removeEmptyFolders(path);
      const _path = _this3._getFinalPath(cleanPath);
      const url = new URL(_this3.url + `/object/upload/sign/${_path}`);
      url.searchParams.set("token", token);
      return _this3.handleOperation(async () => {
        let body;
        const options = _objectSpread22({ upsert: DEFAULT_FILE_OPTIONS.upsert }, fileOptions);
        const headers = _objectSpread22(_objectSpread22({}, _this3.headers), { "x-upsert": String(options.upsert) });
        if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
          body = new FormData();
          body.append("cacheControl", options.cacheControl);
          body.append("", fileBody);
        } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
          body = fileBody;
          body.append("cacheControl", options.cacheControl);
        } else {
          body = fileBody;
          headers["cache-control"] = `max-age=${options.cacheControl}`;
          headers["content-type"] = options.contentType;
        }
        return {
          path: cleanPath,
          fullPath: (await put(_this3.fetch, url.toString(), body, { headers })).Key
        };
      });
    }
    /**
    * Creates a signed upload URL.
    * Signed upload URLs can be used to upload files to the bucket without further authentication.
    * They are valid for 2 hours.
    *
    * @category File Buckets
    * @param path The file path, including the current file name. For example `folder/image.png`.
    * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
    * @returns Promise with response containing signed upload URL, token, and path or error
    *
    * @example Create Signed Upload URL
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .createSignedUploadUrl('folder/cat.jpg')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "signedUrl": "https://example.supabase.co/storage/v1/object/upload/sign/avatars/folder/cat.jpg?token=<TOKEN>",
    *     "path": "folder/cat.jpg",
    *     "token": "<TOKEN>"
    *   },
    *   "error": null
    * }
    * ```
    */
    async createSignedUploadUrl(path, options) {
      var _this4 = this;
      return _this4.handleOperation(async () => {
        let _path = _this4._getFinalPath(path);
        const headers = _objectSpread22({}, _this4.headers);
        if (options === null || options === void 0 ? void 0 : options.upsert) headers["x-upsert"] = "true";
        const data = await post(_this4.fetch, `${_this4.url}/object/upload/sign/${_path}`, {}, { headers });
        const url = new URL(_this4.url + data.url);
        const token = url.searchParams.get("token");
        if (!token) throw new StorageError("No token returned by API");
        return {
          signedUrl: url.toString(),
          path,
          token
        };
      });
    }
    /**
    * Replaces an existing file at the specified path with a new one.
    *
    * @category File Buckets
    * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
    * @param fileBody The body of the file to be stored in the bucket.
    * @param fileOptions Optional file upload options including cacheControl, contentType, upsert, and metadata.
    * @returns Promise with response containing file path, id, and fullPath or error
    *
    * @example Update file
    * ```js
    * const avatarFile = event.target.files[0]
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .update('public/avatar1.png', avatarFile, {
    *     cacheControl: '3600',
    *     upsert: true
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "path": "public/avatar1.png",
    *     "fullPath": "avatars/public/avatar1.png"
    *   },
    *   "error": null
    * }
    * ```
    *
    * @example Update file using `ArrayBuffer` from base64 file data
    * ```js
    * import {decode} from 'base64-arraybuffer'
    *
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .update('public/avatar1.png', decode('base64FileData'), {
    *     contentType: 'image/png'
    *   })
    * ```
    */
    async update(path, fileBody, fileOptions) {
      return this.uploadOrUpdate("PUT", path, fileBody, fileOptions);
    }
    /**
    * Moves an existing file to a new path in the same bucket.
    *
    * @category File Buckets
    * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
    * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
    * @param options The destination options.
    * @returns Promise with response containing success message or error
    *
    * @example Move file
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .move('public/avatar1.png', 'private/avatar2.png')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "message": "Successfully moved"
    *   },
    *   "error": null
    * }
    * ```
    */
    async move(fromPath, toPath, options) {
      var _this6 = this;
      return _this6.handleOperation(async () => {
        return await post(_this6.fetch, `${_this6.url}/object/move`, {
          bucketId: _this6.bucketId,
          sourceKey: fromPath,
          destinationKey: toPath,
          destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
        }, { headers: _this6.headers });
      });
    }
    /**
    * Copies an existing file to a new path in the same bucket.
    *
    * @category File Buckets
    * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
    * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
    * @param options The destination options.
    * @returns Promise with response containing copied file path or error
    *
    * @example Copy file
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .copy('public/avatar1.png', 'private/avatar2.png')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "path": "avatars/private/avatar2.png"
    *   },
    *   "error": null
    * }
    * ```
    */
    async copy(fromPath, toPath, options) {
      var _this7 = this;
      return _this7.handleOperation(async () => {
        return { path: (await post(_this7.fetch, `${_this7.url}/object/copy`, {
          bucketId: _this7.bucketId,
          sourceKey: fromPath,
          destinationKey: toPath,
          destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
        }, { headers: _this7.headers })).Key };
      });
    }
    /**
    * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
    *
    * @category File Buckets
    * @param path The file path, including the current file name. For example `folder/image.png`.
    * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
    * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
    * @param options.transform Transform the asset before serving it to the client.
    * @returns Promise with response containing signed URL or error
    *
    * @example Create Signed URL
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .createSignedUrl('folder/avatar1.png', 60)
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "signedUrl": "https://example.supabase.co/storage/v1/object/sign/avatars/folder/avatar1.png?token=<TOKEN>"
    *   },
    *   "error": null
    * }
    * ```
    *
    * @example Create a signed URL for an asset with transformations
    * ```js
    * const { data } = await supabase
    *   .storage
    *   .from('avatars')
    *   .createSignedUrl('folder/avatar1.png', 60, {
    *     transform: {
    *       width: 100,
    *       height: 100,
    *     }
    *   })
    * ```
    *
    * @example Create a signed URL which triggers the download of the asset
    * ```js
    * const { data } = await supabase
    *   .storage
    *   .from('avatars')
    *   .createSignedUrl('folder/avatar1.png', 60, {
    *     download: true,
    *   })
    * ```
    */
    async createSignedUrl(path, expiresIn, options) {
      var _this8 = this;
      return _this8.handleOperation(async () => {
        let _path = _this8._getFinalPath(path);
        let data = await post(_this8.fetch, `${_this8.url}/object/sign/${_path}`, _objectSpread22({ expiresIn }, (options === null || options === void 0 ? void 0 : options.transform) ? { transform: options.transform } : {}), { headers: _this8.headers });
        const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
        return { signedUrl: encodeURI(`${_this8.url}${data.signedURL}${downloadQueryParam}`) };
      });
    }
    /**
    * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
    *
    * @category File Buckets
    * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
    * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
    * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
    * @returns Promise with response containing array of objects with signedUrl, path, and error or error
    *
    * @example Create Signed URLs
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .createSignedUrls(['folder/avatar1.png', 'folder/avatar2.png'], 60)
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": [
    *     {
    *       "error": null,
    *       "path": "folder/avatar1.png",
    *       "signedURL": "/object/sign/avatars/folder/avatar1.png?token=<TOKEN>",
    *       "signedUrl": "https://example.supabase.co/storage/v1/object/sign/avatars/folder/avatar1.png?token=<TOKEN>"
    *     },
    *     {
    *       "error": null,
    *       "path": "folder/avatar2.png",
    *       "signedURL": "/object/sign/avatars/folder/avatar2.png?token=<TOKEN>",
    *       "signedUrl": "https://example.supabase.co/storage/v1/object/sign/avatars/folder/avatar2.png?token=<TOKEN>"
    *     }
    *   ],
    *   "error": null
    * }
    * ```
    */
    async createSignedUrls(paths, expiresIn, options) {
      var _this9 = this;
      return _this9.handleOperation(async () => {
        const data = await post(_this9.fetch, `${_this9.url}/object/sign/${_this9.bucketId}`, {
          expiresIn,
          paths
        }, { headers: _this9.headers });
        const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
        return data.map((datum) => _objectSpread22(_objectSpread22({}, datum), {}, { signedUrl: datum.signedURL ? encodeURI(`${_this9.url}${datum.signedURL}${downloadQueryParam}`) : null }));
      });
    }
    /**
    * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
    *
    * @category File Buckets
    * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
    * @param options.transform Transform the asset before serving it to the client.
    * @param parameters Additional fetch parameters like signal for cancellation. Supports standard fetch options including cache control.
    * @returns BlobDownloadBuilder instance for downloading the file
    *
    * @example Download file
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .download('folder/avatar1.png')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": <BLOB>,
    *   "error": null
    * }
    * ```
    *
    * @example Download file with transformations
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .download('folder/avatar1.png', {
    *     transform: {
    *       width: 100,
    *       height: 100,
    *       quality: 80
    *     }
    *   })
    * ```
    *
    * @example Download with cache control (useful in Edge Functions)
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .download('folder/avatar1.png', {}, { cache: 'no-store' })
    * ```
    *
    * @example Download with abort signal
    * ```js
    * const controller = new AbortController()
    * setTimeout(() => controller.abort(), 5000)
    *
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .download('folder/avatar1.png', {}, { signal: controller.signal })
    * ```
    */
    download(path, options, parameters) {
      const renderPath = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined" ? "render/image/authenticated" : "object";
      const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
      const queryString = transformationQuery ? `?${transformationQuery}` : "";
      const _path = this._getFinalPath(path);
      const downloadFn = () => get(this.fetch, `${this.url}/${renderPath}/${_path}${queryString}`, {
        headers: this.headers,
        noResolveJson: true
      }, parameters);
      return new BlobDownloadBuilder(downloadFn, this.shouldThrowOnError);
    }
    /**
    * Retrieves the details of an existing file.
    *
    * @category File Buckets
    * @param path The file path, including the file name. For example `folder/image.png`.
    * @returns Promise with response containing file metadata or error
    *
    * @example Get file info
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .info('folder/avatar1.png')
    * ```
    */
    async info(path) {
      var _this10 = this;
      const _path = _this10._getFinalPath(path);
      return _this10.handleOperation(async () => {
        return recursiveToCamel(await get(_this10.fetch, `${_this10.url}/object/info/${_path}`, { headers: _this10.headers }));
      });
    }
    /**
    * Checks the existence of a file.
    *
    * @category File Buckets
    * @param path The file path, including the file name. For example `folder/image.png`.
    * @returns Promise with response containing boolean indicating file existence or error
    *
    * @example Check file existence
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .exists('folder/avatar1.png')
    * ```
    */
    async exists(path) {
      var _this11 = this;
      const _path = _this11._getFinalPath(path);
      try {
        await head(_this11.fetch, `${_this11.url}/object/${_path}`, { headers: _this11.headers });
        return {
          data: true,
          error: null
        };
      } catch (error) {
        if (_this11.shouldThrowOnError) throw error;
        if (isStorageError(error) && error instanceof StorageUnknownError) {
          const originalError = error.originalError;
          if ([400, 404].includes(originalError === null || originalError === void 0 ? void 0 : originalError.status)) return {
            data: false,
            error
          };
        }
        throw error;
      }
    }
    /**
    * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
    * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
    *
    * @category File Buckets
    * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
    * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
    * @param options.transform Transform the asset before serving it to the client.
    * @returns Object with public URL
    *
    * @example Returns the URL for an asset in a public bucket
    * ```js
    * const { data } = supabase
    *   .storage
    *   .from('public-bucket')
    *   .getPublicUrl('folder/avatar1.png')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "publicUrl": "https://example.supabase.co/storage/v1/object/public/public-bucket/folder/avatar1.png"
    *   }
    * }
    * ```
    *
    * @example Returns the URL for an asset in a public bucket with transformations
    * ```js
    * const { data } = supabase
    *   .storage
    *   .from('public-bucket')
    *   .getPublicUrl('folder/avatar1.png', {
    *     transform: {
    *       width: 100,
    *       height: 100,
    *     }
    *   })
    * ```
    *
    * @example Returns the URL which triggers the download of an asset in a public bucket
    * ```js
    * const { data } = supabase
    *   .storage
    *   .from('public-bucket')
    *   .getPublicUrl('folder/avatar1.png', {
    *     download: true,
    *   })
    * ```
    */
    getPublicUrl(path, options) {
      const _path = this._getFinalPath(path);
      const _queryString = [];
      const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `download=${options.download === true ? "" : options.download}` : "";
      if (downloadQueryParam !== "") _queryString.push(downloadQueryParam);
      const renderPath = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined" ? "render/image" : "object";
      const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
      if (transformationQuery !== "") _queryString.push(transformationQuery);
      let queryString = _queryString.join("&");
      if (queryString !== "") queryString = `?${queryString}`;
      return { data: { publicUrl: encodeURI(`${this.url}/${renderPath}/public/${_path}${queryString}`) } };
    }
    /**
    * Deletes files within the same bucket
    *
    * @category File Buckets
    * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
    * @returns Promise with response containing array of deleted file objects or error
    *
    * @example Delete file
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .remove(['folder/avatar1.png'])
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": [],
    *   "error": null
    * }
    * ```
    */
    async remove(paths) {
      var _this12 = this;
      return _this12.handleOperation(async () => {
        return await remove(_this12.fetch, `${_this12.url}/object/${_this12.bucketId}`, { prefixes: paths }, { headers: _this12.headers });
      });
    }
    /**
    * Get file metadata
    * @param id the file id to retrieve metadata
    */
    /**
    * Update file metadata
    * @param id the file id to update metadata
    * @param meta the new file metadata
    */
    /**
    * Lists all the files and folders within a path of the bucket.
    *
    * @category File Buckets
    * @param path The folder path.
    * @param options Search options including limit (defaults to 100), offset, sortBy, and search
    * @param parameters Optional fetch parameters including signal for cancellation
    * @returns Promise with response containing array of files or error
    *
    * @example List files in a bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .list('folder', {
    *     limit: 100,
    *     offset: 0,
    *     sortBy: { column: 'name', order: 'asc' },
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": [
    *     {
    *       "name": "avatar1.png",
    *       "id": "e668cf7f-821b-4a2f-9dce-7dfa5dd1cfd2",
    *       "updated_at": "2024-05-22T23:06:05.580Z",
    *       "created_at": "2024-05-22T23:04:34.443Z",
    *       "last_accessed_at": "2024-05-22T23:04:34.443Z",
    *       "metadata": {
    *         "eTag": "\"c5e8c553235d9af30ef4f6e280790b92\"",
    *         "size": 32175,
    *         "mimetype": "image/png",
    *         "cacheControl": "max-age=3600",
    *         "lastModified": "2024-05-22T23:06:05.574Z",
    *         "contentLength": 32175,
    *         "httpStatusCode": 200
    *       }
    *     }
    *   ],
    *   "error": null
    * }
    * ```
    *
    * @example Search files in a bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .from('avatars')
    *   .list('folder', {
    *     limit: 100,
    *     offset: 0,
    *     sortBy: { column: 'name', order: 'asc' },
    *     search: 'jon'
    *   })
    * ```
    */
    async list(path, options, parameters) {
      var _this13 = this;
      return _this13.handleOperation(async () => {
        const body = _objectSpread22(_objectSpread22(_objectSpread22({}, DEFAULT_SEARCH_OPTIONS), options), {}, { prefix: path || "" });
        return await post(_this13.fetch, `${_this13.url}/object/list/${_this13.bucketId}`, body, { headers: _this13.headers }, parameters);
      });
    }
    /**
    * @experimental this method signature might change in the future
    *
    * @category File Buckets
    * @param options search options
    * @param parameters
    */
    async listV2(options, parameters) {
      var _this14 = this;
      return _this14.handleOperation(async () => {
        const body = _objectSpread22({}, options);
        return await post(_this14.fetch, `${_this14.url}/object/list-v2/${_this14.bucketId}`, body, { headers: _this14.headers }, parameters);
      });
    }
    encodeMetadata(metadata) {
      return JSON.stringify(metadata);
    }
    toBase64(data) {
      if (typeof Buffer !== "undefined") return Buffer.from(data).toString("base64");
      return btoa(data);
    }
    _getFinalPath(path) {
      return `${this.bucketId}/${path.replace(/^\/+/, "")}`;
    }
    _removeEmptyFolders(path) {
      return path.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
    }
    transformOptsToQueryString(transform) {
      const params = [];
      if (transform.width) params.push(`width=${transform.width}`);
      if (transform.height) params.push(`height=${transform.height}`);
      if (transform.resize) params.push(`resize=${transform.resize}`);
      if (transform.format) params.push(`format=${transform.format}`);
      if (transform.quality) params.push(`quality=${transform.quality}`);
      return params.join("&");
    }
  };
  var version2 = "2.98.0";
  var DEFAULT_HEADERS = { "X-Client-Info": `storage-js/${version2}` };
  var StorageBucketApi = class extends BaseApiClient {
    constructor(url, headers = {}, fetch$1, opts) {
      const baseUrl = new URL(url);
      if (opts === null || opts === void 0 ? void 0 : opts.useNewHostname) {
        if (/supabase\.(co|in|red)$/.test(baseUrl.hostname) && !baseUrl.hostname.includes("storage.supabase.")) baseUrl.hostname = baseUrl.hostname.replace("supabase.", "storage.supabase.");
      }
      const finalUrl = baseUrl.href.replace(/\/$/, "");
      const finalHeaders = _objectSpread22(_objectSpread22({}, DEFAULT_HEADERS), headers);
      super(finalUrl, finalHeaders, fetch$1, "storage");
    }
    /**
    * Retrieves the details of all Storage buckets within an existing project.
    *
    * @category File Buckets
    * @param options Query parameters for listing buckets
    * @param options.limit Maximum number of buckets to return
    * @param options.offset Number of buckets to skip
    * @param options.sortColumn Column to sort by ('id', 'name', 'created_at', 'updated_at')
    * @param options.sortOrder Sort order ('asc' or 'desc')
    * @param options.search Search term to filter bucket names
    * @returns Promise with response containing array of buckets or error
    *
    * @example List buckets
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .listBuckets()
    * ```
    *
    * @example List buckets with options
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .listBuckets({
    *     limit: 10,
    *     offset: 0,
    *     sortColumn: 'created_at',
    *     sortOrder: 'desc',
    *     search: 'prod'
    *   })
    * ```
    */
    async listBuckets(options) {
      var _this = this;
      return _this.handleOperation(async () => {
        const queryString = _this.listBucketOptionsToQueryString(options);
        return await get(_this.fetch, `${_this.url}/bucket${queryString}`, { headers: _this.headers });
      });
    }
    /**
    * Retrieves the details of an existing Storage bucket.
    *
    * @category File Buckets
    * @param id The unique identifier of the bucket you would like to retrieve.
    * @returns Promise with response containing bucket details or error
    *
    * @example Get bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .getBucket('avatars')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "id": "avatars",
    *     "name": "avatars",
    *     "owner": "",
    *     "public": false,
    *     "file_size_limit": 1024,
    *     "allowed_mime_types": [
    *       "image/png"
    *     ],
    *     "created_at": "2024-05-22T22:26:05.100Z",
    *     "updated_at": "2024-05-22T22:26:05.100Z"
    *   },
    *   "error": null
    * }
    * ```
    */
    async getBucket(id) {
      var _this2 = this;
      return _this2.handleOperation(async () => {
        return await get(_this2.fetch, `${_this2.url}/bucket/${id}`, { headers: _this2.headers });
      });
    }
    /**
    * Creates a new Storage bucket
    *
    * @category File Buckets
    * @param id A unique identifier for the bucket you are creating.
    * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations. By default, buckets are private.
    * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
    * The global file size limit takes precedence over this value.
    * The default value is null, which doesn't set a per bucket file size limit.
    * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
    * The default value is null, which allows files with all mime types to be uploaded.
    * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
    * @param options.type (private-beta) specifies the bucket type. see `BucketType` for more details.
    *   - default bucket type is `STANDARD`
    * @returns Promise with response containing newly created bucket name or error
    *
    * @example Create bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .createBucket('avatars', {
    *     public: false,
    *     allowedMimeTypes: ['image/png'],
    *     fileSizeLimit: 1024
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "name": "avatars"
    *   },
    *   "error": null
    * }
    * ```
    */
    async createBucket(id, options = { public: false }) {
      var _this3 = this;
      return _this3.handleOperation(async () => {
        return await post(_this3.fetch, `${_this3.url}/bucket`, {
          id,
          name: id,
          type: options.type,
          public: options.public,
          file_size_limit: options.fileSizeLimit,
          allowed_mime_types: options.allowedMimeTypes
        }, { headers: _this3.headers });
      });
    }
    /**
    * Updates a Storage bucket
    *
    * @category File Buckets
    * @param id A unique identifier for the bucket you are updating.
    * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations.
    * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
    * The global file size limit takes precedence over this value.
    * The default value is null, which doesn't set a per bucket file size limit.
    * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
    * The default value is null, which allows files with all mime types to be uploaded.
    * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
    * @returns Promise with response containing success message or error
    *
    * @example Update bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .updateBucket('avatars', {
    *     public: false,
    *     allowedMimeTypes: ['image/png'],
    *     fileSizeLimit: 1024
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "message": "Successfully updated"
    *   },
    *   "error": null
    * }
    * ```
    */
    async updateBucket(id, options) {
      var _this4 = this;
      return _this4.handleOperation(async () => {
        return await put(_this4.fetch, `${_this4.url}/bucket/${id}`, {
          id,
          name: id,
          public: options.public,
          file_size_limit: options.fileSizeLimit,
          allowed_mime_types: options.allowedMimeTypes
        }, { headers: _this4.headers });
      });
    }
    /**
    * Removes all objects inside a single bucket.
    *
    * @category File Buckets
    * @param id The unique identifier of the bucket you would like to empty.
    * @returns Promise with success message or error
    *
    * @example Empty bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .emptyBucket('avatars')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "message": "Successfully emptied"
    *   },
    *   "error": null
    * }
    * ```
    */
    async emptyBucket(id) {
      var _this5 = this;
      return _this5.handleOperation(async () => {
        return await post(_this5.fetch, `${_this5.url}/bucket/${id}/empty`, {}, { headers: _this5.headers });
      });
    }
    /**
    * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
    * You must first `empty()` the bucket.
    *
    * @category File Buckets
    * @param id The unique identifier of the bucket you would like to delete.
    * @returns Promise with success message or error
    *
    * @example Delete bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .deleteBucket('avatars')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "message": "Successfully deleted"
    *   },
    *   "error": null
    * }
    * ```
    */
    async deleteBucket(id) {
      var _this6 = this;
      return _this6.handleOperation(async () => {
        return await remove(_this6.fetch, `${_this6.url}/bucket/${id}`, {}, { headers: _this6.headers });
      });
    }
    listBucketOptionsToQueryString(options) {
      const params = {};
      if (options) {
        if ("limit" in options) params.limit = String(options.limit);
        if ("offset" in options) params.offset = String(options.offset);
        if (options.search) params.search = options.search;
        if (options.sortColumn) params.sortColumn = options.sortColumn;
        if (options.sortOrder) params.sortOrder = options.sortOrder;
      }
      return Object.keys(params).length > 0 ? "?" + new URLSearchParams(params).toString() : "";
    }
  };
  var StorageAnalyticsClient = class extends BaseApiClient {
    /**
    * @alpha
    *
    * Creates a new StorageAnalyticsClient instance
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @param url - The base URL for the storage API
    * @param headers - HTTP headers to include in requests
    * @param fetch - Optional custom fetch implementation
    *
    * @example
    * ```typescript
    * const client = new StorageAnalyticsClient(url, headers)
    * ```
    */
    constructor(url, headers = {}, fetch$1) {
      const finalUrl = url.replace(/\/$/, "");
      const finalHeaders = _objectSpread22(_objectSpread22({}, DEFAULT_HEADERS), headers);
      super(finalUrl, finalHeaders, fetch$1, "storage");
    }
    /**
    * @alpha
    *
    * Creates a new analytics bucket using Iceberg tables
    * Analytics buckets are optimized for analytical queries and data processing
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @param name A unique name for the bucket you are creating
    * @returns Promise with response containing newly created analytics bucket or error
    *
    * @example Create analytics bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .analytics
    *   .createBucket('analytics-data')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "name": "analytics-data",
    *     "type": "ANALYTICS",
    *     "format": "iceberg",
    *     "created_at": "2024-05-22T22:26:05.100Z",
    *     "updated_at": "2024-05-22T22:26:05.100Z"
    *   },
    *   "error": null
    * }
    * ```
    */
    async createBucket(name) {
      var _this = this;
      return _this.handleOperation(async () => {
        return await post(_this.fetch, `${_this.url}/bucket`, { name }, { headers: _this.headers });
      });
    }
    /**
    * @alpha
    *
    * Retrieves the details of all Analytics Storage buckets within an existing project
    * Only returns buckets of type 'ANALYTICS'
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @param options Query parameters for listing buckets
    * @param options.limit Maximum number of buckets to return
    * @param options.offset Number of buckets to skip
    * @param options.sortColumn Column to sort by ('name', 'created_at', 'updated_at')
    * @param options.sortOrder Sort order ('asc' or 'desc')
    * @param options.search Search term to filter bucket names
    * @returns Promise with response containing array of analytics buckets or error
    *
    * @example List analytics buckets
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .analytics
    *   .listBuckets({
    *     limit: 10,
    *     offset: 0,
    *     sortColumn: 'created_at',
    *     sortOrder: 'desc'
    *   })
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": [
    *     {
    *       "name": "analytics-data",
    *       "type": "ANALYTICS",
    *       "format": "iceberg",
    *       "created_at": "2024-05-22T22:26:05.100Z",
    *       "updated_at": "2024-05-22T22:26:05.100Z"
    *     }
    *   ],
    *   "error": null
    * }
    * ```
    */
    async listBuckets(options) {
      var _this2 = this;
      return _this2.handleOperation(async () => {
        const queryParams = new URLSearchParams();
        if ((options === null || options === void 0 ? void 0 : options.limit) !== void 0) queryParams.set("limit", options.limit.toString());
        if ((options === null || options === void 0 ? void 0 : options.offset) !== void 0) queryParams.set("offset", options.offset.toString());
        if (options === null || options === void 0 ? void 0 : options.sortColumn) queryParams.set("sortColumn", options.sortColumn);
        if (options === null || options === void 0 ? void 0 : options.sortOrder) queryParams.set("sortOrder", options.sortOrder);
        if (options === null || options === void 0 ? void 0 : options.search) queryParams.set("search", options.search);
        const queryString = queryParams.toString();
        const url = queryString ? `${_this2.url}/bucket?${queryString}` : `${_this2.url}/bucket`;
        return await get(_this2.fetch, url, { headers: _this2.headers });
      });
    }
    /**
    * @alpha
    *
    * Deletes an existing analytics bucket
    * A bucket can't be deleted with existing objects inside it
    * You must first empty the bucket before deletion
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @param bucketName The unique identifier of the bucket you would like to delete
    * @returns Promise with response containing success message or error
    *
    * @example Delete analytics bucket
    * ```js
    * const { data, error } = await supabase
    *   .storage
    *   .analytics
    *   .deleteBucket('analytics-data')
    * ```
    *
    * Response:
    * ```json
    * {
    *   "data": {
    *     "message": "Successfully deleted"
    *   },
    *   "error": null
    * }
    * ```
    */
    async deleteBucket(bucketName) {
      var _this3 = this;
      return _this3.handleOperation(async () => {
        return await remove(_this3.fetch, `${_this3.url}/bucket/${bucketName}`, {}, { headers: _this3.headers });
      });
    }
    /**
    * @alpha
    *
    * Get an Iceberg REST Catalog client configured for a specific analytics bucket
    * Use this to perform advanced table and namespace operations within the bucket
    * The returned client provides full access to the Apache Iceberg REST Catalog API
    * with the Supabase `{ data, error }` pattern for consistent error handling on all operations.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @param bucketName - The name of the analytics bucket (warehouse) to connect to
    * @returns The wrapped Iceberg catalog client
    * @throws {StorageError} If the bucket name is invalid
    *
    * @example Get catalog and create table
    * ```js
    * // First, create an analytics bucket
    * const { data: bucket, error: bucketError } = await supabase
    *   .storage
    *   .analytics
    *   .createBucket('analytics-data')
    *
    * // Get the Iceberg catalog for that bucket
    * const catalog = supabase.storage.analytics.from('analytics-data')
    *
    * // Create a namespace
    * const { error: nsError } = await catalog.createNamespace({ namespace: ['default'] })
    *
    * // Create a table with schema
    * const { data: tableMetadata, error: tableError } = await catalog.createTable(
    *   { namespace: ['default'] },
    *   {
    *     name: 'events',
    *     schema: {
    *       type: 'struct',
    *       fields: [
    *         { id: 1, name: 'id', type: 'long', required: true },
    *         { id: 2, name: 'timestamp', type: 'timestamp', required: true },
    *         { id: 3, name: 'user_id', type: 'string', required: false }
    *       ],
    *       'schema-id': 0,
    *       'identifier-field-ids': [1]
    *     },
    *     'partition-spec': {
    *       'spec-id': 0,
    *       fields: []
    *     },
    *     'write-order': {
    *       'order-id': 0,
    *       fields: []
    *     },
    *     properties: {
    *       'write.format.default': 'parquet'
    *     }
    *   }
    * )
    * ```
    *
    * @example List tables in namespace
    * ```js
    * const catalog = supabase.storage.analytics.from('analytics-data')
    *
    * // List all tables in the default namespace
    * const { data: tables, error: listError } = await catalog.listTables({ namespace: ['default'] })
    * if (listError) {
    *   if (listError.isNotFound()) {
    *     console.log('Namespace not found')
    *   }
    *   return
    * }
    * console.log(tables) // [{ namespace: ['default'], name: 'events' }]
    * ```
    *
    * @example Working with namespaces
    * ```js
    * const catalog = supabase.storage.analytics.from('analytics-data')
    *
    * // List all namespaces
    * const { data: namespaces } = await catalog.listNamespaces()
    *
    * // Create namespace with properties
    * await catalog.createNamespace(
    *   { namespace: ['production'] },
    *   { properties: { owner: 'data-team', env: 'prod' } }
    * )
    * ```
    *
    * @example Cleanup operations
    * ```js
    * const catalog = supabase.storage.analytics.from('analytics-data')
    *
    * // Drop table with purge option (removes all data)
    * const { error: dropError } = await catalog.dropTable(
    *   { namespace: ['default'], name: 'events' },
    *   { purge: true }
    * )
    *
    * if (dropError?.isNotFound()) {
    *   console.log('Table does not exist')
    * }
    *
    * // Drop namespace (must be empty)
    * await catalog.dropNamespace({ namespace: ['default'] })
    * ```
    *
    * @remarks
    * This method provides a bridge between Supabase's bucket management and the standard
    * Apache Iceberg REST Catalog API. The bucket name maps to the Iceberg warehouse parameter.
    * All authentication and configuration is handled automatically using your Supabase credentials.
    *
    * **Error Handling**: Invalid bucket names throw immediately. All catalog
    * operations return `{ data, error }` where errors are `IcebergError` instances from iceberg-js.
    * Use helper methods like `error.isNotFound()` or check `error.status` for specific error handling.
    * Use `.throwOnError()` on the analytics client if you prefer exceptions for catalog operations.
    *
    * **Cleanup Operations**: When using `dropTable`, the `purge: true` option permanently
    * deletes all table data. Without it, the table is marked as deleted but data remains.
    *
    * **Library Dependency**: The returned catalog wraps `IcebergRestCatalog` from iceberg-js.
    * For complete API documentation and advanced usage, refer to the
    * [iceberg-js documentation](https://supabase.github.io/iceberg-js/).
    */
    from(bucketName) {
      var _this4 = this;
      if (!isValidBucketName(bucketName)) throw new StorageError("Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.");
      const catalog = new IcebergRestCatalog({
        baseUrl: this.url,
        catalogName: bucketName,
        auth: {
          type: "custom",
          getHeaders: async () => _this4.headers
        },
        fetch: this.fetch
      });
      const shouldThrowOnError = this.shouldThrowOnError;
      return new Proxy(catalog, { get(target, prop) {
        const value = target[prop];
        if (typeof value !== "function") return value;
        return async (...args) => {
          try {
            return {
              data: await value.apply(target, args),
              error: null
            };
          } catch (error) {
            if (shouldThrowOnError) throw error;
            return {
              data: null,
              error
            };
          }
        };
      } });
    }
  };
  var VectorIndexApi = class extends BaseApiClient {
    /** Creates a new VectorIndexApi instance */
    constructor(url, headers = {}, fetch$1) {
      const finalUrl = url.replace(/\/$/, "");
      const finalHeaders = _objectSpread22(_objectSpread22({}, DEFAULT_HEADERS), {}, { "Content-Type": "application/json" }, headers);
      super(finalUrl, finalHeaders, fetch$1, "vectors");
    }
    /** Creates a new vector index within a bucket */
    async createIndex(options) {
      var _this = this;
      return _this.handleOperation(async () => {
        return await vectorsApi.post(_this.fetch, `${_this.url}/CreateIndex`, options, { headers: _this.headers }) || {};
      });
    }
    /** Retrieves metadata for a specific vector index */
    async getIndex(vectorBucketName, indexName) {
      var _this2 = this;
      return _this2.handleOperation(async () => {
        return await vectorsApi.post(_this2.fetch, `${_this2.url}/GetIndex`, {
          vectorBucketName,
          indexName
        }, { headers: _this2.headers });
      });
    }
    /** Lists vector indexes within a bucket with optional filtering and pagination */
    async listIndexes(options) {
      var _this3 = this;
      return _this3.handleOperation(async () => {
        return await vectorsApi.post(_this3.fetch, `${_this3.url}/ListIndexes`, options, { headers: _this3.headers });
      });
    }
    /** Deletes a vector index and all its data */
    async deleteIndex(vectorBucketName, indexName) {
      var _this4 = this;
      return _this4.handleOperation(async () => {
        return await vectorsApi.post(_this4.fetch, `${_this4.url}/DeleteIndex`, {
          vectorBucketName,
          indexName
        }, { headers: _this4.headers }) || {};
      });
    }
  };
  var VectorDataApi = class extends BaseApiClient {
    /** Creates a new VectorDataApi instance */
    constructor(url, headers = {}, fetch$1) {
      const finalUrl = url.replace(/\/$/, "");
      const finalHeaders = _objectSpread22(_objectSpread22({}, DEFAULT_HEADERS), {}, { "Content-Type": "application/json" }, headers);
      super(finalUrl, finalHeaders, fetch$1, "vectors");
    }
    /** Inserts or updates vectors in batch (1-500 per request) */
    async putVectors(options) {
      var _this = this;
      if (options.vectors.length < 1 || options.vectors.length > 500) throw new Error("Vector batch size must be between 1 and 500 items");
      return _this.handleOperation(async () => {
        return await vectorsApi.post(_this.fetch, `${_this.url}/PutVectors`, options, { headers: _this.headers }) || {};
      });
    }
    /** Retrieves vectors by their keys in batch */
    async getVectors(options) {
      var _this2 = this;
      return _this2.handleOperation(async () => {
        return await vectorsApi.post(_this2.fetch, `${_this2.url}/GetVectors`, options, { headers: _this2.headers });
      });
    }
    /** Lists vectors in an index with pagination */
    async listVectors(options) {
      var _this3 = this;
      if (options.segmentCount !== void 0) {
        if (options.segmentCount < 1 || options.segmentCount > 16) throw new Error("segmentCount must be between 1 and 16");
        if (options.segmentIndex !== void 0) {
          if (options.segmentIndex < 0 || options.segmentIndex >= options.segmentCount) throw new Error(`segmentIndex must be between 0 and ${options.segmentCount - 1}`);
        }
      }
      return _this3.handleOperation(async () => {
        return await vectorsApi.post(_this3.fetch, `${_this3.url}/ListVectors`, options, { headers: _this3.headers });
      });
    }
    /** Queries for similar vectors using approximate nearest neighbor search */
    async queryVectors(options) {
      var _this4 = this;
      return _this4.handleOperation(async () => {
        return await vectorsApi.post(_this4.fetch, `${_this4.url}/QueryVectors`, options, { headers: _this4.headers });
      });
    }
    /** Deletes vectors by their keys in batch (1-500 per request) */
    async deleteVectors(options) {
      var _this5 = this;
      if (options.keys.length < 1 || options.keys.length > 500) throw new Error("Keys batch size must be between 1 and 500 items");
      return _this5.handleOperation(async () => {
        return await vectorsApi.post(_this5.fetch, `${_this5.url}/DeleteVectors`, options, { headers: _this5.headers }) || {};
      });
    }
  };
  var VectorBucketApi = class extends BaseApiClient {
    /** Creates a new VectorBucketApi instance */
    constructor(url, headers = {}, fetch$1) {
      const finalUrl = url.replace(/\/$/, "");
      const finalHeaders = _objectSpread22(_objectSpread22({}, DEFAULT_HEADERS), {}, { "Content-Type": "application/json" }, headers);
      super(finalUrl, finalHeaders, fetch$1, "vectors");
    }
    /** Creates a new vector bucket */
    async createBucket(vectorBucketName) {
      var _this = this;
      return _this.handleOperation(async () => {
        return await vectorsApi.post(_this.fetch, `${_this.url}/CreateVectorBucket`, { vectorBucketName }, { headers: _this.headers }) || {};
      });
    }
    /** Retrieves metadata for a specific vector bucket */
    async getBucket(vectorBucketName) {
      var _this2 = this;
      return _this2.handleOperation(async () => {
        return await vectorsApi.post(_this2.fetch, `${_this2.url}/GetVectorBucket`, { vectorBucketName }, { headers: _this2.headers });
      });
    }
    /** Lists vector buckets with optional filtering and pagination */
    async listBuckets(options = {}) {
      var _this3 = this;
      return _this3.handleOperation(async () => {
        return await vectorsApi.post(_this3.fetch, `${_this3.url}/ListVectorBuckets`, options, { headers: _this3.headers });
      });
    }
    /** Deletes a vector bucket (must be empty first) */
    async deleteBucket(vectorBucketName) {
      var _this4 = this;
      return _this4.handleOperation(async () => {
        return await vectorsApi.post(_this4.fetch, `${_this4.url}/DeleteVectorBucket`, { vectorBucketName }, { headers: _this4.headers }) || {};
      });
    }
  };
  var StorageVectorsClient = class extends VectorBucketApi {
    /**
    * @alpha
    *
    * Creates a StorageVectorsClient that can manage buckets, indexes, and vectors.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param url - Base URL of the Storage Vectors REST API.
    * @param options.headers - Optional headers (for example `Authorization`) applied to every request.
    * @param options.fetch - Optional custom `fetch` implementation for non-browser runtimes.
    *
    * @example
    * ```typescript
    * const client = new StorageVectorsClient(url, options)
    * ```
    */
    constructor(url, options = {}) {
      super(url, options.headers || {}, options.fetch);
    }
    /**
    *
    * @alpha
    *
    * Access operations for a specific vector bucket
    * Returns a scoped client for index and vector operations within the bucket
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param vectorBucketName - Name of the vector bucket
    * @returns Bucket-scoped client with index and vector operations
    *
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * ```
    */
    from(vectorBucketName) {
      return new VectorBucketScope(this.url, this.headers, vectorBucketName, this.fetch);
    }
    /**
    *
    * @alpha
    *
    * Creates a new vector bucket
    * Vector buckets are containers for vector indexes and their data
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param vectorBucketName - Unique name for the vector bucket
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const { data, error } = await supabase
    *   .storage
    *   .vectors
    *   .createBucket('embeddings-prod')
    * ```
    */
    async createBucket(vectorBucketName) {
      var _superprop_getCreateBucket = () => super.createBucket, _this = this;
      return _superprop_getCreateBucket().call(_this, vectorBucketName);
    }
    /**
    *
    * @alpha
    *
    * Retrieves metadata for a specific vector bucket
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param vectorBucketName - Name of the vector bucket
    * @returns Promise with bucket metadata or error
    *
    * @example
    * ```typescript
    * const { data, error } = await supabase
    *   .storage
    *   .vectors
    *   .getBucket('embeddings-prod')
    *
    * console.log('Bucket created:', data?.vectorBucket.creationTime)
    * ```
    */
    async getBucket(vectorBucketName) {
      var _superprop_getGetBucket = () => super.getBucket, _this2 = this;
      return _superprop_getGetBucket().call(_this2, vectorBucketName);
    }
    /**
    *
    * @alpha
    *
    * Lists all vector buckets with optional filtering and pagination
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Optional filters (prefix, maxResults, nextToken)
    * @returns Promise with list of buckets or error
    *
    * @example
    * ```typescript
    * const { data, error } = await supabase
    *   .storage
    *   .vectors
    *   .listBuckets({ prefix: 'embeddings-' })
    *
    * data?.vectorBuckets.forEach(bucket => {
    *   console.log(bucket.vectorBucketName)
    * })
    * ```
    */
    async listBuckets(options = {}) {
      var _superprop_getListBuckets = () => super.listBuckets, _this3 = this;
      return _superprop_getListBuckets().call(_this3, options);
    }
    /**
    *
    * @alpha
    *
    * Deletes a vector bucket (bucket must be empty)
    * All indexes must be deleted before deleting the bucket
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param vectorBucketName - Name of the vector bucket to delete
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const { data, error } = await supabase
    *   .storage
    *   .vectors
    *   .deleteBucket('embeddings-old')
    * ```
    */
    async deleteBucket(vectorBucketName) {
      var _superprop_getDeleteBucket = () => super.deleteBucket, _this4 = this;
      return _superprop_getDeleteBucket().call(_this4, vectorBucketName);
    }
  };
  var VectorBucketScope = class extends VectorIndexApi {
    /**
    * @alpha
    *
    * Creates a helper that automatically scopes all index operations to the provided bucket.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * ```
    */
    constructor(url, headers, vectorBucketName, fetch$1) {
      super(url, headers, fetch$1);
      this.vectorBucketName = vectorBucketName;
    }
    /**
    *
    * @alpha
    *
    * Creates a new vector index in this bucket
    * Convenience method that automatically includes the bucket name
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Index configuration (vectorBucketName is automatically set)
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * await bucket.createIndex({
    *   indexName: 'documents-openai',
    *   dataType: 'float32',
    *   dimension: 1536,
    *   distanceMetric: 'cosine',
    *   metadataConfiguration: {
    *     nonFilterableMetadataKeys: ['raw_text']
    *   }
    * })
    * ```
    */
    async createIndex(options) {
      var _superprop_getCreateIndex = () => super.createIndex, _this5 = this;
      return _superprop_getCreateIndex().call(_this5, _objectSpread22(_objectSpread22({}, options), {}, { vectorBucketName: _this5.vectorBucketName }));
    }
    /**
    *
    * @alpha
    *
    * Lists indexes in this bucket
    * Convenience method that automatically includes the bucket name
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Listing options (vectorBucketName is automatically set)
    * @returns Promise with response containing indexes array and pagination token or error
    *
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * const { data } = await bucket.listIndexes({ prefix: 'documents-' })
    * ```
    */
    async listIndexes(options = {}) {
      var _superprop_getListIndexes = () => super.listIndexes, _this6 = this;
      return _superprop_getListIndexes().call(_this6, _objectSpread22(_objectSpread22({}, options), {}, { vectorBucketName: _this6.vectorBucketName }));
    }
    /**
    *
    * @alpha
    *
    * Retrieves metadata for a specific index in this bucket
    * Convenience method that automatically includes the bucket name
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param indexName - Name of the index to retrieve
    * @returns Promise with index metadata or error
    *
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * const { data } = await bucket.getIndex('documents-openai')
    * console.log('Dimension:', data?.index.dimension)
    * ```
    */
    async getIndex(indexName) {
      var _superprop_getGetIndex = () => super.getIndex, _this7 = this;
      return _superprop_getGetIndex().call(_this7, _this7.vectorBucketName, indexName);
    }
    /**
    *
    * @alpha
    *
    * Deletes an index from this bucket
    * Convenience method that automatically includes the bucket name
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param indexName - Name of the index to delete
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const bucket = supabase.storage.vectors.from('embeddings-prod')
    * await bucket.deleteIndex('old-index')
    * ```
    */
    async deleteIndex(indexName) {
      var _superprop_getDeleteIndex = () => super.deleteIndex, _this8 = this;
      return _superprop_getDeleteIndex().call(_this8, _this8.vectorBucketName, indexName);
    }
    /**
    *
    * @alpha
    *
    * Access operations for a specific index within this bucket
    * Returns a scoped client for vector data operations
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param indexName - Name of the index
    * @returns Index-scoped client with vector data operations
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    *
    * // Insert vectors
    * await index.putVectors({
    *   vectors: [
    *     { key: 'doc-1', data: { float32: [...] }, metadata: { title: 'Intro' } }
    *   ]
    * })
    *
    * // Query similar vectors
    * const { data } = await index.queryVectors({
    *   queryVector: { float32: [...] },
    *   topK: 5
    * })
    * ```
    */
    index(indexName) {
      return new VectorIndexScope(this.url, this.headers, this.vectorBucketName, indexName, this.fetch);
    }
  };
  var VectorIndexScope = class extends VectorDataApi {
    /**
    *
    * @alpha
    *
    * Creates a helper that automatically scopes all vector operations to the provided bucket/index names.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * ```
    */
    constructor(url, headers, vectorBucketName, indexName, fetch$1) {
      super(url, headers, fetch$1);
      this.vectorBucketName = vectorBucketName;
      this.indexName = indexName;
    }
    /**
    *
    * @alpha
    *
    * Inserts or updates vectors in this index
    * Convenience method that automatically includes bucket and index names
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Vector insertion options (bucket and index names automatically set)
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * await index.putVectors({
    *   vectors: [
    *     {
    *       key: 'doc-1',
    *       data: { float32: [0.1, 0.2, ...] },
    *       metadata: { title: 'Introduction', page: 1 }
    *     }
    *   ]
    * })
    * ```
    */
    async putVectors(options) {
      var _superprop_getPutVectors = () => super.putVectors, _this9 = this;
      return _superprop_getPutVectors().call(_this9, _objectSpread22(_objectSpread22({}, options), {}, {
        vectorBucketName: _this9.vectorBucketName,
        indexName: _this9.indexName
      }));
    }
    /**
    *
    * @alpha
    *
    * Retrieves vectors by keys from this index
    * Convenience method that automatically includes bucket and index names
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Vector retrieval options (bucket and index names automatically set)
    * @returns Promise with response containing vectors array or error
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * const { data } = await index.getVectors({
    *   keys: ['doc-1', 'doc-2'],
    *   returnMetadata: true
    * })
    * ```
    */
    async getVectors(options) {
      var _superprop_getGetVectors = () => super.getVectors, _this10 = this;
      return _superprop_getGetVectors().call(_this10, _objectSpread22(_objectSpread22({}, options), {}, {
        vectorBucketName: _this10.vectorBucketName,
        indexName: _this10.indexName
      }));
    }
    /**
    *
    * @alpha
    *
    * Lists vectors in this index with pagination
    * Convenience method that automatically includes bucket and index names
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Listing options (bucket and index names automatically set)
    * @returns Promise with response containing vectors array and pagination token or error
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * const { data } = await index.listVectors({
    *   maxResults: 500,
    *   returnMetadata: true
    * })
    * ```
    */
    async listVectors(options = {}) {
      var _superprop_getListVectors = () => super.listVectors, _this11 = this;
      return _superprop_getListVectors().call(_this11, _objectSpread22(_objectSpread22({}, options), {}, {
        vectorBucketName: _this11.vectorBucketName,
        indexName: _this11.indexName
      }));
    }
    /**
    *
    * @alpha
    *
    * Queries for similar vectors in this index
    * Convenience method that automatically includes bucket and index names
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Query options (bucket and index names automatically set)
    * @returns Promise with response containing matches array of similar vectors ordered by distance or error
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * const { data } = await index.queryVectors({
    *   queryVector: { float32: [0.1, 0.2, ...] },
    *   topK: 5,
    *   filter: { category: 'technical' },
    *   returnDistance: true,
    *   returnMetadata: true
    * })
    * ```
    */
    async queryVectors(options) {
      var _superprop_getQueryVectors = () => super.queryVectors, _this12 = this;
      return _superprop_getQueryVectors().call(_this12, _objectSpread22(_objectSpread22({}, options), {}, {
        vectorBucketName: _this12.vectorBucketName,
        indexName: _this12.indexName
      }));
    }
    /**
    *
    * @alpha
    *
    * Deletes vectors by keys from this index
    * Convenience method that automatically includes bucket and index names
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @param options - Deletion options (bucket and index names automatically set)
    * @returns Promise with empty response on success or error
    *
    * @example
    * ```typescript
    * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
    * await index.deleteVectors({
    *   keys: ['doc-1', 'doc-2', 'doc-3']
    * })
    * ```
    */
    async deleteVectors(options) {
      var _superprop_getDeleteVectors = () => super.deleteVectors, _this13 = this;
      return _superprop_getDeleteVectors().call(_this13, _objectSpread22(_objectSpread22({}, options), {}, {
        vectorBucketName: _this13.vectorBucketName,
        indexName: _this13.indexName
      }));
    }
  };
  var StorageClient = class extends StorageBucketApi {
    /**
    * Creates a client for Storage buckets, files, analytics, and vectors.
    *
    * @category File Buckets
    * @example
    * ```ts
    * import { StorageClient } from '@supabase/storage-js'
    *
    * const storage = new StorageClient('https://xyzcompany.supabase.co/storage/v1', {
    *   apikey: 'public-anon-key',
    * })
    * const avatars = storage.from('avatars')
    * ```
    */
    constructor(url, headers = {}, fetch$1, opts) {
      super(url, headers, fetch$1, opts);
    }
    /**
    * Perform file operation in a bucket.
    *
    * @category File Buckets
    * @param id The bucket id to operate on.
    *
    * @example
    * ```typescript
    * const avatars = supabase.storage.from('avatars')
    * ```
    */
    from(id) {
      return new StorageFileApi(this.url, this.headers, id, this.fetch);
    }
    /**
    *
    * @alpha
    *
    * Access vector storage operations.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Vector Buckets
    * @returns A StorageVectorsClient instance configured with the current storage settings.
    */
    get vectors() {
      return new StorageVectorsClient(this.url + "/vector", {
        headers: this.headers,
        fetch: this.fetch
      });
    }
    /**
    *
    * @alpha
    *
    * Access analytics storage operations using Iceberg tables.
    *
    * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
    *
    * @category Analytics Buckets
    * @returns A StorageAnalyticsClient instance configured with the current storage settings.
    */
    get analytics() {
      return new StorageAnalyticsClient(this.url + "/iceberg", this.headers, this.fetch);
    }
  };

  // node_modules/@supabase/auth-js/dist/module/lib/version.js
  var version3 = "2.98.0";

  // node_modules/@supabase/auth-js/dist/module/lib/constants.js
  var AUTO_REFRESH_TICK_DURATION_MS = 30 * 1e3;
  var AUTO_REFRESH_TICK_THRESHOLD = 3;
  var EXPIRY_MARGIN_MS = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS;
  var GOTRUE_URL = "http://localhost:9999";
  var STORAGE_KEY = "supabase.auth.token";
  var DEFAULT_HEADERS2 = { "X-Client-Info": `gotrue-js/${version3}` };
  var API_VERSION_HEADER_NAME = "X-Supabase-Api-Version";
  var API_VERSIONS = {
    "2024-01-01": {
      timestamp: Date.parse("2024-01-01T00:00:00.0Z"),
      name: "2024-01-01"
    }
  };
  var BASE64URL_REGEX = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
  var JWKS_TTL = 10 * 60 * 1e3;

  // node_modules/@supabase/auth-js/dist/module/lib/errors.js
  var AuthError = class extends Error {
    constructor(message, status, code) {
      super(message);
      this.__isAuthError = true;
      this.name = "AuthError";
      this.status = status;
      this.code = code;
    }
  };
  function isAuthError(error) {
    return typeof error === "object" && error !== null && "__isAuthError" in error;
  }
  var AuthApiError = class extends AuthError {
    constructor(message, status, code) {
      super(message, status, code);
      this.name = "AuthApiError";
      this.status = status;
      this.code = code;
    }
  };
  function isAuthApiError(error) {
    return isAuthError(error) && error.name === "AuthApiError";
  }
  var AuthUnknownError = class extends AuthError {
    constructor(message, originalError) {
      super(message);
      this.name = "AuthUnknownError";
      this.originalError = originalError;
    }
  };
  var CustomAuthError = class extends AuthError {
    constructor(message, name, status, code) {
      super(message, status, code);
      this.name = name;
      this.status = status;
    }
  };
  var AuthSessionMissingError = class extends CustomAuthError {
    constructor() {
      super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
    }
  };
  function isAuthSessionMissingError(error) {
    return isAuthError(error) && error.name === "AuthSessionMissingError";
  }
  var AuthInvalidTokenResponseError = class extends CustomAuthError {
    constructor() {
      super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
    }
  };
  var AuthInvalidCredentialsError = class extends CustomAuthError {
    constructor(message) {
      super(message, "AuthInvalidCredentialsError", 400, void 0);
    }
  };
  var AuthImplicitGrantRedirectError = class extends CustomAuthError {
    constructor(message, details = null) {
      super(message, "AuthImplicitGrantRedirectError", 500, void 0);
      this.details = null;
      this.details = details;
    }
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        status: this.status,
        details: this.details
      };
    }
  };
  function isAuthImplicitGrantRedirectError(error) {
    return isAuthError(error) && error.name === "AuthImplicitGrantRedirectError";
  }
  var AuthPKCEGrantCodeExchangeError = class extends CustomAuthError {
    constructor(message, details = null) {
      super(message, "AuthPKCEGrantCodeExchangeError", 500, void 0);
      this.details = null;
      this.details = details;
    }
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        status: this.status,
        details: this.details
      };
    }
  };
  var AuthPKCECodeVerifierMissingError = class extends CustomAuthError {
    constructor() {
      super("PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.", "AuthPKCECodeVerifierMissingError", 400, "pkce_code_verifier_not_found");
    }
  };
  var AuthRetryableFetchError = class extends CustomAuthError {
    constructor(message, status) {
      super(message, "AuthRetryableFetchError", status, void 0);
    }
  };
  function isAuthRetryableFetchError(error) {
    return isAuthError(error) && error.name === "AuthRetryableFetchError";
  }
  var AuthWeakPasswordError = class extends CustomAuthError {
    constructor(message, status, reasons) {
      super(message, "AuthWeakPasswordError", status, "weak_password");
      this.reasons = reasons;
    }
  };
  var AuthInvalidJwtError = class extends CustomAuthError {
    constructor(message) {
      super(message, "AuthInvalidJwtError", 400, "invalid_jwt");
    }
  };

  // node_modules/@supabase/auth-js/dist/module/lib/base64url.js
  var TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
  var IGNORE_BASE64URL = " 	\n\r=".split("");
  var FROM_BASE64URL = (() => {
    const charMap = new Array(128);
    for (let i = 0; i < charMap.length; i += 1) {
      charMap[i] = -1;
    }
    for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
      charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
    }
    for (let i = 0; i < TO_BASE64URL.length; i += 1) {
      charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
    }
    return charMap;
  })();
  function byteToBase64URL(byte, state2, emit) {
    if (byte !== null) {
      state2.queue = state2.queue << 8 | byte;
      state2.queuedBits += 8;
      while (state2.queuedBits >= 6) {
        const pos = state2.queue >> state2.queuedBits - 6 & 63;
        emit(TO_BASE64URL[pos]);
        state2.queuedBits -= 6;
      }
    } else if (state2.queuedBits > 0) {
      state2.queue = state2.queue << 6 - state2.queuedBits;
      state2.queuedBits = 6;
      while (state2.queuedBits >= 6) {
        const pos = state2.queue >> state2.queuedBits - 6 & 63;
        emit(TO_BASE64URL[pos]);
        state2.queuedBits -= 6;
      }
    }
  }
  function byteFromBase64URL(charCode, state2, emit) {
    const bits = FROM_BASE64URL[charCode];
    if (bits > -1) {
      state2.queue = state2.queue << 6 | bits;
      state2.queuedBits += 6;
      while (state2.queuedBits >= 8) {
        emit(state2.queue >> state2.queuedBits - 8 & 255);
        state2.queuedBits -= 8;
      }
    } else if (bits === -2) {
      return;
    } else {
      throw new Error(`Invalid Base64-URL character "${String.fromCharCode(charCode)}"`);
    }
  }
  function stringFromBase64URL(str) {
    const conv = [];
    const utf8Emit = (codepoint) => {
      conv.push(String.fromCodePoint(codepoint));
    };
    const utf8State = {
      utf8seq: 0,
      codepoint: 0
    };
    const b64State = { queue: 0, queuedBits: 0 };
    const byteEmit = (byte) => {
      stringFromUTF8(byte, utf8State, utf8Emit);
    };
    for (let i = 0; i < str.length; i += 1) {
      byteFromBase64URL(str.charCodeAt(i), b64State, byteEmit);
    }
    return conv.join("");
  }
  function codepointToUTF8(codepoint, emit) {
    if (codepoint <= 127) {
      emit(codepoint);
      return;
    } else if (codepoint <= 2047) {
      emit(192 | codepoint >> 6);
      emit(128 | codepoint & 63);
      return;
    } else if (codepoint <= 65535) {
      emit(224 | codepoint >> 12);
      emit(128 | codepoint >> 6 & 63);
      emit(128 | codepoint & 63);
      return;
    } else if (codepoint <= 1114111) {
      emit(240 | codepoint >> 18);
      emit(128 | codepoint >> 12 & 63);
      emit(128 | codepoint >> 6 & 63);
      emit(128 | codepoint & 63);
      return;
    }
    throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
  }
  function stringToUTF8(str, emit) {
    for (let i = 0; i < str.length; i += 1) {
      let codepoint = str.charCodeAt(i);
      if (codepoint > 55295 && codepoint <= 56319) {
        const highSurrogate = (codepoint - 55296) * 1024 & 65535;
        const lowSurrogate = str.charCodeAt(i + 1) - 56320 & 65535;
        codepoint = (lowSurrogate | highSurrogate) + 65536;
        i += 1;
      }
      codepointToUTF8(codepoint, emit);
    }
  }
  function stringFromUTF8(byte, state2, emit) {
    if (state2.utf8seq === 0) {
      if (byte <= 127) {
        emit(byte);
        return;
      }
      for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
        if ((byte >> 7 - leadingBit & 1) === 0) {
          state2.utf8seq = leadingBit;
          break;
        }
      }
      if (state2.utf8seq === 2) {
        state2.codepoint = byte & 31;
      } else if (state2.utf8seq === 3) {
        state2.codepoint = byte & 15;
      } else if (state2.utf8seq === 4) {
        state2.codepoint = byte & 7;
      } else {
        throw new Error("Invalid UTF-8 sequence");
      }
      state2.utf8seq -= 1;
    } else if (state2.utf8seq > 0) {
      if (byte <= 127) {
        throw new Error("Invalid UTF-8 sequence");
      }
      state2.codepoint = state2.codepoint << 6 | byte & 63;
      state2.utf8seq -= 1;
      if (state2.utf8seq === 0) {
        emit(state2.codepoint);
      }
    }
  }
  function base64UrlToUint8Array(str) {
    const result = [];
    const state2 = { queue: 0, queuedBits: 0 };
    const onByte = (byte) => {
      result.push(byte);
    };
    for (let i = 0; i < str.length; i += 1) {
      byteFromBase64URL(str.charCodeAt(i), state2, onByte);
    }
    return new Uint8Array(result);
  }
  function stringToUint8Array(str) {
    const result = [];
    stringToUTF8(str, (byte) => result.push(byte));
    return new Uint8Array(result);
  }
  function bytesToBase64URL(bytes) {
    const result = [];
    const state2 = { queue: 0, queuedBits: 0 };
    const onChar = (char) => {
      result.push(char);
    };
    bytes.forEach((byte) => byteToBase64URL(byte, state2, onChar));
    byteToBase64URL(null, state2, onChar);
    return result.join("");
  }

  // node_modules/@supabase/auth-js/dist/module/lib/helpers.js
  function expiresAt(expiresIn) {
    const timeNow = Math.round(Date.now() / 1e3);
    return timeNow + expiresIn;
  }
  function generateCallbackId() {
    return Symbol("auth-callback");
  }
  var isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";
  var localStorageWriteTests = {
    tested: false,
    writable: false
  };
  var supportsLocalStorage = () => {
    if (!isBrowser()) {
      return false;
    }
    try {
      if (typeof globalThis.localStorage !== "object") {
        return false;
      }
    } catch (e) {
      return false;
    }
    if (localStorageWriteTests.tested) {
      return localStorageWriteTests.writable;
    }
    const randomKey = `lswt-${Math.random()}${Math.random()}`;
    try {
      globalThis.localStorage.setItem(randomKey, randomKey);
      globalThis.localStorage.removeItem(randomKey);
      localStorageWriteTests.tested = true;
      localStorageWriteTests.writable = true;
    } catch (e) {
      localStorageWriteTests.tested = true;
      localStorageWriteTests.writable = false;
    }
    return localStorageWriteTests.writable;
  };
  function parseParametersFromURL(href) {
    const result = {};
    const url = new URL(href);
    if (url.hash && url.hash[0] === "#") {
      try {
        const hashSearchParams = new URLSearchParams(url.hash.substring(1));
        hashSearchParams.forEach((value, key) => {
          result[key] = value;
        });
      } catch (e) {
      }
    }
    url.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  var resolveFetch3 = (customFetch) => {
    if (customFetch) {
      return (...args) => customFetch(...args);
    }
    return (...args) => fetch(...args);
  };
  var looksLikeFetchResponse = (maybeResponse) => {
    return typeof maybeResponse === "object" && maybeResponse !== null && "status" in maybeResponse && "ok" in maybeResponse && "json" in maybeResponse && typeof maybeResponse.json === "function";
  };
  var setItemAsync = async (storage, key, data) => {
    await storage.setItem(key, JSON.stringify(data));
  };
  var getItemAsync = async (storage, key) => {
    const value = await storage.getItem(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (_a) {
      return value;
    }
  };
  var removeItemAsync = async (storage, key) => {
    await storage.removeItem(key);
  };
  var Deferred = class _Deferred {
    constructor() {
      ;
      this.promise = new _Deferred.promiseConstructor((res, rej) => {
        ;
        this.resolve = res;
        this.reject = rej;
      });
    }
  };
  Deferred.promiseConstructor = Promise;
  function decodeJWT(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AuthInvalidJwtError("Invalid JWT structure");
    }
    for (let i = 0; i < parts.length; i++) {
      if (!BASE64URL_REGEX.test(parts[i])) {
        throw new AuthInvalidJwtError("JWT not in base64url format");
      }
    }
    const data = {
      // using base64url lib
      header: JSON.parse(stringFromBase64URL(parts[0])),
      payload: JSON.parse(stringFromBase64URL(parts[1])),
      signature: base64UrlToUint8Array(parts[2]),
      raw: {
        header: parts[0],
        payload: parts[1]
      }
    };
    return data;
  }
  async function sleep(time) {
    return await new Promise((accept) => {
      setTimeout(() => accept(null), time);
    });
  }
  function retryable(fn, isRetryable) {
    const promise = new Promise((accept, reject) => {
      ;
      (async () => {
        for (let attempt = 0; attempt < Infinity; attempt++) {
          try {
            const result = await fn(attempt);
            if (!isRetryable(attempt, null, result)) {
              accept(result);
              return;
            }
          } catch (e) {
            if (!isRetryable(attempt, e)) {
              reject(e);
              return;
            }
          }
        }
      })();
    });
    return promise;
  }
  function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
  }
  function generatePKCEVerifier() {
    const verifierLength = 56;
    const array = new Uint32Array(verifierLength);
    if (typeof crypto === "undefined") {
      const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      const charSetLen = charSet.length;
      let verifier = "";
      for (let i = 0; i < verifierLength; i++) {
        verifier += charSet.charAt(Math.floor(Math.random() * charSetLen));
      }
      return verifier;
    }
    crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join("");
  }
  async function sha256(randomString) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(randomString);
    const hash = await crypto.subtle.digest("SHA-256", encodedData);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((c) => String.fromCharCode(c)).join("");
  }
  async function generatePKCEChallenge(verifier) {
    const hasCryptoSupport = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof TextEncoder !== "undefined";
    if (!hasCryptoSupport) {
      console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.");
      return verifier;
    }
    const hashed = await sha256(verifier);
    return btoa(hashed).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function getCodeChallengeAndMethod(storage, storageKey, isPasswordRecovery = false) {
    const codeVerifier = generatePKCEVerifier();
    let storedCodeVerifier = codeVerifier;
    if (isPasswordRecovery) {
      storedCodeVerifier += "/PASSWORD_RECOVERY";
    }
    await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
    const codeChallenge = await generatePKCEChallenge(codeVerifier);
    const codeChallengeMethod = codeVerifier === codeChallenge ? "plain" : "s256";
    return [codeChallenge, codeChallengeMethod];
  }
  var API_VERSION_REGEX = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;
  function parseResponseAPIVersion(response) {
    const apiVersion = response.headers.get(API_VERSION_HEADER_NAME);
    if (!apiVersion) {
      return null;
    }
    if (!apiVersion.match(API_VERSION_REGEX)) {
      return null;
    }
    try {
      const date = /* @__PURE__ */ new Date(`${apiVersion}T00:00:00.0Z`);
      return date;
    } catch (e) {
      return null;
    }
  }
  function validateExp(exp) {
    if (!exp) {
      throw new Error("Missing exp claim");
    }
    const timeNow = Math.floor(Date.now() / 1e3);
    if (exp <= timeNow) {
      throw new Error("JWT has expired");
    }
  }
  function getAlgorithm(alg) {
    switch (alg) {
      case "RS256":
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        };
      case "ES256":
        return {
          name: "ECDSA",
          namedCurve: "P-256",
          hash: { name: "SHA-256" }
        };
      default:
        throw new Error("Invalid alg claim");
    }
  }
  var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  function validateUUID(str) {
    if (!UUID_REGEX.test(str)) {
      throw new Error("@supabase/auth-js: Expected parameter to be UUID but is not");
    }
  }
  function userNotAvailableProxy() {
    const proxyTarget = {};
    return new Proxy(proxyTarget, {
      get: (target, prop) => {
        if (prop === "__isUserNotAvailableProxy") {
          return true;
        }
        if (typeof prop === "symbol") {
          const sProp = prop.toString();
          if (sProp === "Symbol(Symbol.toPrimitive)" || sProp === "Symbol(Symbol.toStringTag)" || sProp === "Symbol(util.inspect.custom)") {
            return void 0;
          }
        }
        throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${prop}" property of the session object is not supported. Please use getUser() instead.`);
      },
      set: (_target, prop) => {
        throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
      },
      deleteProperty: (_target, prop) => {
        throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
      }
    });
  }
  function insecureUserWarningProxy(user, suppressWarningRef) {
    return new Proxy(user, {
      get: (target, prop, receiver) => {
        if (prop === "__isInsecureUserWarningProxy") {
          return true;
        }
        if (typeof prop === "symbol") {
          const sProp = prop.toString();
          if (sProp === "Symbol(Symbol.toPrimitive)" || sProp === "Symbol(Symbol.toStringTag)" || sProp === "Symbol(util.inspect.custom)" || sProp === "Symbol(nodejs.util.inspect.custom)") {
            return Reflect.get(target, prop, receiver);
          }
        }
        if (!suppressWarningRef.value && typeof prop === "string") {
          console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.");
          suppressWarningRef.value = true;
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  }
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // node_modules/@supabase/auth-js/dist/module/lib/fetch.js
  var _getErrorMessage2 = (err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err);
  var NETWORK_ERROR_CODES = [502, 503, 504];
  async function handleError2(error) {
    var _a;
    if (!looksLikeFetchResponse(error)) {
      throw new AuthRetryableFetchError(_getErrorMessage2(error), 0);
    }
    if (NETWORK_ERROR_CODES.includes(error.status)) {
      throw new AuthRetryableFetchError(_getErrorMessage2(error), error.status);
    }
    let data;
    try {
      data = await error.json();
    } catch (e) {
      throw new AuthUnknownError(_getErrorMessage2(e), e);
    }
    let errorCode = void 0;
    const responseAPIVersion = parseResponseAPIVersion(error);
    if (responseAPIVersion && responseAPIVersion.getTime() >= API_VERSIONS["2024-01-01"].timestamp && typeof data === "object" && data && typeof data.code === "string") {
      errorCode = data.code;
    } else if (typeof data === "object" && data && typeof data.error_code === "string") {
      errorCode = data.error_code;
    }
    if (!errorCode) {
      if (typeof data === "object" && data && typeof data.weak_password === "object" && data.weak_password && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
        throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, data.weak_password.reasons);
      }
    } else if (errorCode === "weak_password") {
      throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, ((_a = data.weak_password) === null || _a === void 0 ? void 0 : _a.reasons) || []);
    } else if (errorCode === "session_not_found") {
      throw new AuthSessionMissingError();
    }
    throw new AuthApiError(_getErrorMessage2(data), error.status || 500, errorCode);
  }
  var _getRequestParams2 = (method, options, parameters, body) => {
    const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
    if (method === "GET") {
      return params;
    }
    params.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, options === null || options === void 0 ? void 0 : options.headers);
    params.body = JSON.stringify(body);
    return Object.assign(Object.assign({}, params), parameters);
  };
  async function _request(fetcher, method, url, options) {
    var _a;
    const headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers);
    if (!headers[API_VERSION_HEADER_NAME]) {
      headers[API_VERSION_HEADER_NAME] = API_VERSIONS["2024-01-01"].name;
    }
    if (options === null || options === void 0 ? void 0 : options.jwt) {
      headers["Authorization"] = `Bearer ${options.jwt}`;
    }
    const qs = (_a = options === null || options === void 0 ? void 0 : options.query) !== null && _a !== void 0 ? _a : {};
    if (options === null || options === void 0 ? void 0 : options.redirectTo) {
      qs["redirect_to"] = options.redirectTo;
    }
    const queryString = Object.keys(qs).length ? "?" + new URLSearchParams(qs).toString() : "";
    const data = await _handleRequest2(fetcher, method, url + queryString, {
      headers,
      noResolveJson: options === null || options === void 0 ? void 0 : options.noResolveJson
    }, {}, options === null || options === void 0 ? void 0 : options.body);
    return (options === null || options === void 0 ? void 0 : options.xform) ? options === null || options === void 0 ? void 0 : options.xform(data) : { data: Object.assign({}, data), error: null };
  }
  async function _handleRequest2(fetcher, method, url, options, parameters, body) {
    const requestParams = _getRequestParams2(method, options, parameters, body);
    let result;
    try {
      result = await fetcher(url, Object.assign({}, requestParams));
    } catch (e) {
      console.error(e);
      throw new AuthRetryableFetchError(_getErrorMessage2(e), 0);
    }
    if (!result.ok) {
      await handleError2(result);
    }
    if (options === null || options === void 0 ? void 0 : options.noResolveJson) {
      return result;
    }
    try {
      return await result.json();
    } catch (e) {
      await handleError2(e);
    }
  }
  function _sessionResponse(data) {
    var _a;
    let session = null;
    if (hasSession(data)) {
      session = Object.assign({}, data);
      if (!data.expires_at) {
        session.expires_at = expiresAt(data.expires_in);
      }
    }
    const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
    return { data: { session, user }, error: null };
  }
  function _sessionResponsePassword(data) {
    const response = _sessionResponse(data);
    if (!response.error && data.weak_password && typeof data.weak_password === "object" && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.message && typeof data.weak_password.message === "string" && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
      response.data.weak_password = data.weak_password;
    }
    return response;
  }
  function _userResponse(data) {
    var _a;
    const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
    return { data: { user }, error: null };
  }
  function _ssoResponse(data) {
    return { data, error: null };
  }
  function _generateLinkResponse(data) {
    const { action_link, email_otp, hashed_token, redirect_to, verification_type } = data, rest = __rest(data, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"]);
    const properties = {
      action_link,
      email_otp,
      hashed_token,
      redirect_to,
      verification_type
    };
    const user = Object.assign({}, rest);
    return {
      data: {
        properties,
        user
      },
      error: null
    };
  }
  function _noResolveJsonResponse(data) {
    return data;
  }
  function hasSession(data) {
    return data.access_token && data.refresh_token && data.expires_in;
  }

  // node_modules/@supabase/auth-js/dist/module/lib/types.js
  var SIGN_OUT_SCOPES = ["global", "local", "others"];

  // node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js
  var GoTrueAdminApi = class {
    /**
     * Creates an admin API client that can be used to manage users and OAuth clients.
     *
     * @example
     * ```ts
     * import { GoTrueAdminApi } from '@supabase/auth-js'
     *
     * const admin = new GoTrueAdminApi({
     *   url: 'https://xyzcompany.supabase.co/auth/v1',
     *   headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
     * })
     * ```
     */
    constructor({ url = "", headers = {}, fetch: fetch2 }) {
      this.url = url;
      this.headers = headers;
      this.fetch = resolveFetch3(fetch2);
      this.mfa = {
        listFactors: this._listFactors.bind(this),
        deleteFactor: this._deleteFactor.bind(this)
      };
      this.oauth = {
        listClients: this._listOAuthClients.bind(this),
        createClient: this._createOAuthClient.bind(this),
        getClient: this._getOAuthClient.bind(this),
        updateClient: this._updateOAuthClient.bind(this),
        deleteClient: this._deleteOAuthClient.bind(this),
        regenerateClientSecret: this._regenerateOAuthClientSecret.bind(this)
      };
    }
    /**
     * Removes a logged-in session.
     * @param jwt A valid, logged-in JWT.
     * @param scope The logout sope.
     */
    async signOut(jwt, scope = SIGN_OUT_SCOPES[0]) {
      if (SIGN_OUT_SCOPES.indexOf(scope) < 0) {
        throw new Error(`@supabase/auth-js: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(", ")}`);
      }
      try {
        await _request(this.fetch, "POST", `${this.url}/logout?scope=${scope}`, {
          headers: this.headers,
          jwt,
          noResolveJson: true
        });
        return { data: null, error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Sends an invite link to an email address.
     * @param email The email address of the user.
     * @param options Additional options to be included when inviting.
     */
    async inviteUserByEmail(email, options = {}) {
      try {
        return await _request(this.fetch, "POST", `${this.url}/invite`, {
          body: { email, data: options.data },
          headers: this.headers,
          redirectTo: options.redirectTo,
          xform: _userResponse
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { user: null }, error };
        }
        throw error;
      }
    }
    /**
     * Generates email links and OTPs to be sent via a custom email provider.
     * @param email The user's email.
     * @param options.password User password. For signup only.
     * @param options.data Optional user metadata. For signup only.
     * @param options.redirectTo The redirect url which should be appended to the generated link
     */
    async generateLink(params) {
      try {
        const { options } = params, rest = __rest(params, ["options"]);
        const body = Object.assign(Object.assign({}, rest), options);
        if ("newEmail" in rest) {
          body.new_email = rest === null || rest === void 0 ? void 0 : rest.newEmail;
          delete body["newEmail"];
        }
        return await _request(this.fetch, "POST", `${this.url}/admin/generate_link`, {
          body,
          headers: this.headers,
          xform: _generateLinkResponse,
          redirectTo: options === null || options === void 0 ? void 0 : options.redirectTo
        });
      } catch (error) {
        if (isAuthError(error)) {
          return {
            data: {
              properties: null,
              user: null
            },
            error
          };
        }
        throw error;
      }
    }
    // User Admin API
    /**
     * Creates a new user.
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async createUser(attributes) {
      try {
        return await _request(this.fetch, "POST", `${this.url}/admin/users`, {
          body: attributes,
          headers: this.headers,
          xform: _userResponse
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { user: null }, error };
        }
        throw error;
      }
    }
    /**
     * Get a list of users.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     * @param params An object which supports `page` and `perPage` as numbers, to alter the paginated results.
     */
    async listUsers(params) {
      var _a, _b, _c, _d, _e, _f, _g;
      try {
        const pagination = { nextPage: null, lastPage: 0, total: 0 };
        const response = await _request(this.fetch, "GET", `${this.url}/admin/users`, {
          headers: this.headers,
          noResolveJson: true,
          query: {
            page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
            per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
          },
          xform: _noResolveJsonResponse
        });
        if (response.error)
          throw response.error;
        const users = await response.json();
        const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
        const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
        if (links.length > 0) {
          links.forEach((link) => {
            const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
            const rel = JSON.parse(link.split(";")[1].split("=")[1]);
            pagination[`${rel}Page`] = page;
          });
          pagination.total = parseInt(total);
        }
        return { data: Object.assign(Object.assign({}, users), pagination), error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { users: [] }, error };
        }
        throw error;
      }
    }
    /**
     * Get user by id.
     *
     * @param uid The user's unique identifier
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async getUserById(uid) {
      validateUUID(uid);
      try {
        return await _request(this.fetch, "GET", `${this.url}/admin/users/${uid}`, {
          headers: this.headers,
          xform: _userResponse
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { user: null }, error };
        }
        throw error;
      }
    }
    /**
     * Updates the user data. Changes are applied directly without confirmation flows.
     *
     * @param uid The user's unique identifier
     * @param attributes The data you want to update.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     *
     * @remarks
     * **Important:** This is a server-side operation and does **not** trigger client-side
     * `onAuthStateChange` listeners. The admin API has no connection to client state.
     *
     * To sync changes to the client after calling this method:
     * 1. On the client, call `supabase.auth.refreshSession()` to fetch the updated user data
     * 2. This will trigger the `TOKEN_REFRESHED` event and notify all listeners
     *
     * @example
     * ```typescript
     * // Server-side (Edge Function)
     * const { data, error } = await supabase.auth.admin.updateUserById(
     *   userId,
     *   { user_metadata: { preferences: { theme: 'dark' } } }
     * )
     *
     * // Client-side (to sync the changes)
     * const { data, error } = await supabase.auth.refreshSession()
     * // onAuthStateChange listeners will now be notified with updated user
     * ```
     *
     * @see {@link GoTrueClient.refreshSession} for syncing admin changes to the client
     * @see {@link GoTrueClient.updateUser} for client-side user updates (triggers listeners automatically)
     */
    async updateUserById(uid, attributes) {
      validateUUID(uid);
      try {
        return await _request(this.fetch, "PUT", `${this.url}/admin/users/${uid}`, {
          body: attributes,
          headers: this.headers,
          xform: _userResponse
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { user: null }, error };
        }
        throw error;
      }
    }
    /**
     * Delete a user. Requires a `service_role` key.
     *
     * @param id The user id you want to remove.
     * @param shouldSoftDelete If true, then the user will be soft-deleted from the auth schema. Soft deletion allows user identification from the hashed user ID but is not reversible.
     * Defaults to false for backward compatibility.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async deleteUser(id, shouldSoftDelete = false) {
      validateUUID(id);
      try {
        return await _request(this.fetch, "DELETE", `${this.url}/admin/users/${id}`, {
          headers: this.headers,
          body: {
            should_soft_delete: shouldSoftDelete
          },
          xform: _userResponse
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { user: null }, error };
        }
        throw error;
      }
    }
    async _listFactors(params) {
      validateUUID(params.userId);
      try {
        const { data, error } = await _request(this.fetch, "GET", `${this.url}/admin/users/${params.userId}/factors`, {
          headers: this.headers,
          xform: (factors) => {
            return { data: { factors }, error: null };
          }
        });
        return { data, error };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    async _deleteFactor(params) {
      validateUUID(params.userId);
      validateUUID(params.id);
      try {
        const data = await _request(this.fetch, "DELETE", `${this.url}/admin/users/${params.userId}/factors/${params.id}`, {
          headers: this.headers
        });
        return { data, error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Lists all OAuth clients with optional pagination.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _listOAuthClients(params) {
      var _a, _b, _c, _d, _e, _f, _g;
      try {
        const pagination = { nextPage: null, lastPage: 0, total: 0 };
        const response = await _request(this.fetch, "GET", `${this.url}/admin/oauth/clients`, {
          headers: this.headers,
          noResolveJson: true,
          query: {
            page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
            per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
          },
          xform: _noResolveJsonResponse
        });
        if (response.error)
          throw response.error;
        const clients = await response.json();
        const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
        const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
        if (links.length > 0) {
          links.forEach((link) => {
            const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
            const rel = JSON.parse(link.split(";")[1].split("=")[1]);
            pagination[`${rel}Page`] = page;
          });
          pagination.total = parseInt(total);
        }
        return { data: Object.assign(Object.assign({}, clients), pagination), error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: { clients: [] }, error };
        }
        throw error;
      }
    }
    /**
     * Creates a new OAuth client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _createOAuthClient(params) {
      try {
        return await _request(this.fetch, "POST", `${this.url}/admin/oauth/clients`, {
          body: params,
          headers: this.headers,
          xform: (client) => {
            return { data: client, error: null };
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Gets details of a specific OAuth client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _getOAuthClient(clientId) {
      try {
        return await _request(this.fetch, "GET", `${this.url}/admin/oauth/clients/${clientId}`, {
          headers: this.headers,
          xform: (client) => {
            return { data: client, error: null };
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Updates an existing OAuth client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _updateOAuthClient(clientId, params) {
      try {
        return await _request(this.fetch, "PUT", `${this.url}/admin/oauth/clients/${clientId}`, {
          body: params,
          headers: this.headers,
          xform: (client) => {
            return { data: client, error: null };
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Deletes an OAuth client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _deleteOAuthClient(clientId) {
      try {
        await _request(this.fetch, "DELETE", `${this.url}/admin/oauth/clients/${clientId}`, {
          headers: this.headers,
          noResolveJson: true
        });
        return { data: null, error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
    /**
     * Regenerates the secret for an OAuth client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    async _regenerateOAuthClientSecret(clientId) {
      try {
        return await _request(this.fetch, "POST", `${this.url}/admin/oauth/clients/${clientId}/regenerate_secret`, {
          headers: this.headers,
          xform: (client) => {
            return { data: client, error: null };
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        throw error;
      }
    }
  };

  // node_modules/@supabase/auth-js/dist/module/lib/local-storage.js
  function memoryLocalStorageAdapter(store = {}) {
    return {
      getItem: (key) => {
        return store[key] || null;
      },
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      }
    };
  }

  // node_modules/@supabase/auth-js/dist/module/lib/locks.js
  var internals = {
    /**
     * @experimental
     */
    debug: !!(globalThis && supportsLocalStorage() && globalThis.localStorage && globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug") === "true")
  };
  var LockAcquireTimeoutError = class extends Error {
    constructor(message) {
      super(message);
      this.isAcquireTimeout = true;
    }
  };
  var NavigatorLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
  };
  async function navigatorLock(name, acquireTimeout, fn) {
    if (internals.debug) {
      console.log("@supabase/gotrue-js: navigatorLock: acquire lock", name, acquireTimeout);
    }
    const abortController = new globalThis.AbortController();
    if (acquireTimeout > 0) {
      setTimeout(() => {
        abortController.abort();
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock acquire timed out", name);
        }
      }, acquireTimeout);
    }
    await Promise.resolve();
    try {
      return await globalThis.navigator.locks.request(name, acquireTimeout === 0 ? {
        mode: "exclusive",
        ifAvailable: true
      } : {
        mode: "exclusive",
        signal: abortController.signal
      }, async (lock) => {
        if (lock) {
          if (internals.debug) {
            console.log("@supabase/gotrue-js: navigatorLock: acquired", name, lock.name);
          }
          try {
            return await fn();
          } finally {
            if (internals.debug) {
              console.log("@supabase/gotrue-js: navigatorLock: released", name, lock.name);
            }
          }
        } else {
          if (acquireTimeout === 0) {
            if (internals.debug) {
              console.log("@supabase/gotrue-js: navigatorLock: not immediately available", name);
            }
            throw new NavigatorLockAcquireTimeoutError(`Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`);
          } else {
            if (internals.debug) {
              try {
                const result = await globalThis.navigator.locks.query();
                console.log("@supabase/gotrue-js: Navigator LockManager state", JSON.stringify(result, null, "  "));
              } catch (e) {
                console.warn("@supabase/gotrue-js: Error when querying Navigator LockManager state", e);
              }
            }
            console.warn("@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request");
            return await fn();
          }
        }
      });
    } catch (e) {
      if ((e === null || e === void 0 ? void 0 : e.name) === "AbortError" && acquireTimeout > 0) {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: acquire timeout, recovering by stealing lock", name);
        }
        console.warn(`@supabase/gotrue-js: Lock "${name}" was not released within ${acquireTimeout}ms. This may indicate an orphaned lock from a component unmount (e.g., React Strict Mode). Forcefully acquiring the lock to recover.`);
        return await Promise.resolve().then(() => globalThis.navigator.locks.request(name, {
          mode: "exclusive",
          steal: true
        }, async (lock) => {
          if (lock) {
            if (internals.debug) {
              console.log("@supabase/gotrue-js: navigatorLock: recovered (stolen)", name, lock.name);
            }
            try {
              return await fn();
            } finally {
              if (internals.debug) {
                console.log("@supabase/gotrue-js: navigatorLock: released (stolen)", name, lock.name);
              }
            }
          } else {
            console.warn("@supabase/gotrue-js: Navigator LockManager returned null lock even with steal: true");
            return await fn();
          }
        }));
      }
      throw e;
    }
  }

  // node_modules/@supabase/auth-js/dist/module/lib/polyfills.js
  function polyfillGlobalThis() {
    if (typeof globalThis === "object")
      return;
    try {
      Object.defineProperty(Object.prototype, "__magic__", {
        get: function() {
          return this;
        },
        configurable: true
      });
      __magic__.globalThis = __magic__;
      delete Object.prototype.__magic__;
    } catch (e) {
      if (typeof self !== "undefined") {
        self.globalThis = self;
      }
    }
  }

  // node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js
  function getAddress(address) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`@supabase/auth-js: Address "${address}" is invalid.`);
    }
    return address.toLowerCase();
  }
  function fromHex(hex) {
    return parseInt(hex, 16);
  }
  function toHex(value) {
    const bytes = new TextEncoder().encode(value);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return "0x" + hex;
  }
  function createSiweMessage(parameters) {
    var _a;
    const { chainId, domain, expirationTime, issuedAt = /* @__PURE__ */ new Date(), nonce, notBefore, requestId, resources, scheme, uri, version: version5 } = parameters;
    {
      if (!Number.isInteger(chainId))
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${chainId}`);
      if (!domain)
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.`);
      if (nonce && nonce.length < 8)
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${nonce}`);
      if (!uri)
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.`);
      if (version5 !== "1")
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${version5}`);
      if ((_a = parameters.statement) === null || _a === void 0 ? void 0 : _a.includes("\n"))
        throw new Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${parameters.statement}`);
    }
    const address = getAddress(parameters.address);
    const origin = scheme ? `${scheme}://${domain}` : domain;
    const statement = parameters.statement ? `${parameters.statement}
` : "";
    const prefix = `${origin} wants you to sign in with your Ethereum account:
${address}

${statement}`;
    let suffix = `URI: ${uri}
Version: ${version5}
Chain ID: ${chainId}${nonce ? `
Nonce: ${nonce}` : ""}
Issued At: ${issuedAt.toISOString()}`;
    if (expirationTime)
      suffix += `
Expiration Time: ${expirationTime.toISOString()}`;
    if (notBefore)
      suffix += `
Not Before: ${notBefore.toISOString()}`;
    if (requestId)
      suffix += `
Request ID: ${requestId}`;
    if (resources) {
      let content = "\nResources:";
      for (const resource of resources) {
        if (!resource || typeof resource !== "string")
          throw new Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${resource}`);
        content += `
- ${resource}`;
      }
      suffix += content;
    }
    return `${prefix}
${suffix}`;
  }

  // node_modules/@supabase/auth-js/dist/module/lib/webauthn.errors.js
  var WebAuthnError = class extends Error {
    constructor({ message, code, cause, name }) {
      var _a;
      super(message, { cause });
      this.__isWebAuthnError = true;
      this.name = (_a = name !== null && name !== void 0 ? name : cause instanceof Error ? cause.name : void 0) !== null && _a !== void 0 ? _a : "Unknown Error";
      this.code = code;
    }
  };
  var WebAuthnUnknownError = class extends WebAuthnError {
    constructor(message, originalError) {
      super({
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: originalError,
        message
      });
      this.name = "WebAuthnUnknownError";
      this.originalError = originalError;
    }
  };
  function identifyRegistrationError({ error, options }) {
    var _a, _b, _c;
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Registration ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "ConstraintError") {
      if (((_a = publicKey.authenticatorSelection) === null || _a === void 0 ? void 0 : _a.requireResidentKey) === true) {
        return new WebAuthnError({
          message: "Discoverable credentials were required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
          cause: error
        });
      } else if (
        // @ts-ignore: `mediation` doesn't yet exist on CredentialCreationOptions but it's possible as of Sept 2024
        options.mediation === "conditional" && ((_b = publicKey.authenticatorSelection) === null || _b === void 0 ? void 0 : _b.userVerification) === "required"
      ) {
        return new WebAuthnError({
          message: "User verification was required during automatic registration but it could not be performed",
          code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
          cause: error
        });
      } else if (((_c = publicKey.authenticatorSelection) === null || _c === void 0 ? void 0 : _c.userVerification) === "required") {
        return new WebAuthnError({
          message: "User verification was required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
          cause: error
        });
      }
    } else if (error.name === "InvalidStateError") {
      return new WebAuthnError({
        message: "The authenticator was previously registered",
        code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
        cause: error
      });
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "NotSupportedError") {
      const validPubKeyCredParams = publicKey.pubKeyCredParams.filter((param) => param.type === "public-key");
      if (validPubKeyCredParams.length === 0) {
        return new WebAuthnError({
          message: 'No entry in pubKeyCredParams was of type "public-key"',
          code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
          cause: error
        });
      }
      return new WebAuthnError({
        message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
        code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = window.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${window.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rp.id !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rp.id}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "TypeError") {
      if (publicKey.user.id.byteLength < 1 || publicKey.user.id.byteLength > 64) {
        return new WebAuthnError({
          message: "User ID was not between 1 and 64 characters",
          code: "ERROR_INVALID_USER_ID_LENGTH",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new credential",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return new WebAuthnError({
      message: "a Non-Webauthn related error has occurred",
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: error
    });
  }
  function identifyAuthenticationError({ error, options }) {
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Authentication ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = window.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${window.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rpId !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rpId}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return new WebAuthnError({
      message: "a Non-Webauthn related error has occurred",
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: error
    });
  }

  // node_modules/@supabase/auth-js/dist/module/lib/webauthn.js
  var WebAuthnAbortService = class {
    /**
     * Create an abort signal for a new WebAuthn operation.
     * Automatically cancels any existing operation.
     *
     * @returns {AbortSignal} Signal to pass to navigator.credentials.create() or .get()
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal MDN - AbortSignal}
     */
    createNewAbortSignal() {
      if (this.controller) {
        const abortError = new Error("Cancelling existing WebAuthn API call for new one");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
      }
      const newController = new AbortController();
      this.controller = newController;
      return newController.signal;
    }
    /**
     * Manually cancel the current WebAuthn operation.
     * Useful for cleaning up when user cancels or navigates away.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort MDN - AbortController.abort}
     */
    cancelCeremony() {
      if (this.controller) {
        const abortError = new Error("Manually cancelling existing WebAuthn API call");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
        this.controller = void 0;
      }
    }
  };
  var webAuthnAbortService = new WebAuthnAbortService();
  function deserializeCredentialCreationOptions(options) {
    if (!options) {
      throw new Error("Credential creation options are required");
    }
    if (typeof PublicKeyCredential !== "undefined" && "parseCreationOptionsFromJSON" in PublicKeyCredential && typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function") {
      return PublicKeyCredential.parseCreationOptionsFromJSON(
        /** we assert the options here as typescript still doesn't know about future webauthn types */
        options
      );
    }
    const { challenge: challengeStr, user: userOpts, excludeCredentials } = options, restOptions = __rest(
      options,
      ["challenge", "user", "excludeCredentials"]
    );
    const challenge = base64UrlToUint8Array(challengeStr).buffer;
    const user = Object.assign(Object.assign({}, userOpts), { id: base64UrlToUint8Array(userOpts.id).buffer });
    const result = Object.assign(Object.assign({}, restOptions), {
      challenge,
      user
    });
    if (excludeCredentials && excludeCredentials.length > 0) {
      result.excludeCredentials = new Array(excludeCredentials.length);
      for (let i = 0; i < excludeCredentials.length; i++) {
        const cred = excludeCredentials[i];
        result.excludeCredentials[i] = Object.assign(Object.assign({}, cred), {
          id: base64UrlToUint8Array(cred.id).buffer,
          type: cred.type || "public-key",
          // Cast transports to handle future transport types like "cable"
          transports: cred.transports
        });
      }
    }
    return result;
  }
  function deserializeCredentialRequestOptions(options) {
    if (!options) {
      throw new Error("Credential request options are required");
    }
    if (typeof PublicKeyCredential !== "undefined" && "parseRequestOptionsFromJSON" in PublicKeyCredential && typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function") {
      return PublicKeyCredential.parseRequestOptionsFromJSON(options);
    }
    const { challenge: challengeStr, allowCredentials } = options, restOptions = __rest(
      options,
      ["challenge", "allowCredentials"]
    );
    const challenge = base64UrlToUint8Array(challengeStr).buffer;
    const result = Object.assign(Object.assign({}, restOptions), { challenge });
    if (allowCredentials && allowCredentials.length > 0) {
      result.allowCredentials = new Array(allowCredentials.length);
      for (let i = 0; i < allowCredentials.length; i++) {
        const cred = allowCredentials[i];
        result.allowCredentials[i] = Object.assign(Object.assign({}, cred), {
          id: base64UrlToUint8Array(cred.id).buffer,
          type: cred.type || "public-key",
          // Cast transports to handle future transport types like "cable"
          transports: cred.transports
        });
      }
    }
    return result;
  }
  function serializeCredentialCreationResponse(credential) {
    var _a;
    if ("toJSON" in credential && typeof credential.toJSON === "function") {
      return credential.toJSON();
    }
    const credentialWithAttachment = credential;
    return {
      id: credential.id,
      rawId: credential.id,
      response: {
        attestationObject: bytesToBase64URL(new Uint8Array(credential.response.attestationObject)),
        clientDataJSON: bytesToBase64URL(new Uint8Array(credential.response.clientDataJSON))
      },
      type: "public-key",
      clientExtensionResults: credential.getClientExtensionResults(),
      // Convert null to undefined and cast to AuthenticatorAttachment type
      authenticatorAttachment: (_a = credentialWithAttachment.authenticatorAttachment) !== null && _a !== void 0 ? _a : void 0
    };
  }
  function serializeCredentialRequestResponse(credential) {
    var _a;
    if ("toJSON" in credential && typeof credential.toJSON === "function") {
      return credential.toJSON();
    }
    const credentialWithAttachment = credential;
    const clientExtensionResults = credential.getClientExtensionResults();
    const assertionResponse = credential.response;
    return {
      id: credential.id,
      rawId: credential.id,
      // W3C spec expects rawId to match id for JSON format
      response: {
        authenticatorData: bytesToBase64URL(new Uint8Array(assertionResponse.authenticatorData)),
        clientDataJSON: bytesToBase64URL(new Uint8Array(assertionResponse.clientDataJSON)),
        signature: bytesToBase64URL(new Uint8Array(assertionResponse.signature)),
        userHandle: assertionResponse.userHandle ? bytesToBase64URL(new Uint8Array(assertionResponse.userHandle)) : void 0
      },
      type: "public-key",
      clientExtensionResults,
      // Convert null to undefined and cast to AuthenticatorAttachment type
      authenticatorAttachment: (_a = credentialWithAttachment.authenticatorAttachment) !== null && _a !== void 0 ? _a : void 0
    };
  }
  function isValidDomain(hostname) {
    return (
      // Consider localhost valid as well since it's okay wrt Secure Contexts
      hostname === "localhost" || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(hostname)
    );
  }
  function browserSupportsWebAuthn() {
    var _a, _b;
    return !!(isBrowser() && "PublicKeyCredential" in window && window.PublicKeyCredential && "credentials" in navigator && typeof ((_a = navigator === null || navigator === void 0 ? void 0 : navigator.credentials) === null || _a === void 0 ? void 0 : _a.create) === "function" && typeof ((_b = navigator === null || navigator === void 0 ? void 0 : navigator.credentials) === null || _b === void 0 ? void 0 : _b.get) === "function");
  }
  async function createCredential(options) {
    try {
      const response = await navigator.credentials.create(
        /** we assert the type here until typescript types are updated */
        options
      );
      if (!response) {
        return {
          data: null,
          error: new WebAuthnUnknownError("Empty credential response", response)
        };
      }
      if (!(response instanceof PublicKeyCredential)) {
        return {
          data: null,
          error: new WebAuthnUnknownError("Browser returned unexpected credential type", response)
        };
      }
      return { data: response, error: null };
    } catch (err) {
      return {
        data: null,
        error: identifyRegistrationError({
          error: err,
          options
        })
      };
    }
  }
  async function getCredential(options) {
    try {
      const response = await navigator.credentials.get(
        /** we assert the type here until typescript types are updated */
        options
      );
      if (!response) {
        return {
          data: null,
          error: new WebAuthnUnknownError("Empty credential response", response)
        };
      }
      if (!(response instanceof PublicKeyCredential)) {
        return {
          data: null,
          error: new WebAuthnUnknownError("Browser returned unexpected credential type", response)
        };
      }
      return { data: response, error: null };
    } catch (err) {
      return {
        data: null,
        error: identifyAuthenticationError({
          error: err,
          options
        })
      };
    }
  }
  var DEFAULT_CREATION_OPTIONS = {
    hints: ["security-key"],
    authenticatorSelection: {
      authenticatorAttachment: "cross-platform",
      requireResidentKey: false,
      /** set to preferred because older yubikeys don't have PIN/Biometric */
      userVerification: "preferred",
      residentKey: "discouraged"
    },
    attestation: "direct"
  };
  var DEFAULT_REQUEST_OPTIONS = {
    /** set to preferred because older yubikeys don't have PIN/Biometric */
    userVerification: "preferred",
    hints: ["security-key"],
    attestation: "direct"
  };
  function deepMerge(...sources) {
    const isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    const isArrayBufferLike = (val) => val instanceof ArrayBuffer || ArrayBuffer.isView(val);
    const result = {};
    for (const source of sources) {
      if (!source)
        continue;
      for (const key in source) {
        const value = source[key];
        if (value === void 0)
          continue;
        if (Array.isArray(value)) {
          result[key] = value;
        } else if (isArrayBufferLike(value)) {
          result[key] = value;
        } else if (isObject(value)) {
          const existing = result[key];
          if (isObject(existing)) {
            result[key] = deepMerge(existing, value);
          } else {
            result[key] = deepMerge(value);
          }
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }
  function mergeCredentialCreationOptions(baseOptions, overrides) {
    return deepMerge(DEFAULT_CREATION_OPTIONS, baseOptions, overrides || {});
  }
  function mergeCredentialRequestOptions(baseOptions, overrides) {
    return deepMerge(DEFAULT_REQUEST_OPTIONS, baseOptions, overrides || {});
  }
  var WebAuthnApi = class {
    constructor(client) {
      this.client = client;
      this.enroll = this._enroll.bind(this);
      this.challenge = this._challenge.bind(this);
      this.verify = this._verify.bind(this);
      this.authenticate = this._authenticate.bind(this);
      this.register = this._register.bind(this);
    }
    /**
     * Enroll a new WebAuthn factor.
     * Creates an unverified WebAuthn factor that must be verified with a credential.
     *
     * @experimental This method is experimental and may change in future releases
     * @param {Omit<MFAEnrollWebauthnParams, 'factorType'>} params - Enrollment parameters (friendlyName required)
     * @returns {Promise<AuthMFAEnrollWebauthnResponse>} Enrolled factor details or error
     * @see {@link https://w3c.github.io/webauthn/#sctn-registering-a-new-credential W3C WebAuthn Spec - Registering a New Credential}
     */
    async _enroll(params) {
      return this.client.mfa.enroll(Object.assign(Object.assign({}, params), { factorType: "webauthn" }));
    }
    /**
     * Challenge for WebAuthn credential creation or authentication.
     * Combines server challenge with browser credential operations.
     * Handles both registration (create) and authentication (request) flows.
     *
     * @experimental This method is experimental and may change in future releases
     * @param {MFAChallengeWebauthnParams & { friendlyName?: string; signal?: AbortSignal }} params - Challenge parameters including factorId
     * @param {Object} overrides - Allows you to override the parameters passed to navigator.credentials
     * @param {PublicKeyCredentialCreationOptionsFuture} overrides.create - Override options for credential creation
     * @param {PublicKeyCredentialRequestOptionsFuture} overrides.request - Override options for credential request
     * @returns {Promise<RequestResult>} Challenge response with credential or error
     * @see {@link https://w3c.github.io/webauthn/#sctn-credential-creation W3C WebAuthn Spec - Credential Creation}
     * @see {@link https://w3c.github.io/webauthn/#sctn-verifying-assertion W3C WebAuthn Spec - Verifying Assertion}
     */
    async _challenge({ factorId, webauthn, friendlyName, signal }, overrides) {
      var _a;
      try {
        const { data: challengeResponse, error: challengeError } = await this.client.mfa.challenge({
          factorId,
          webauthn
        });
        if (!challengeResponse) {
          return { data: null, error: challengeError };
        }
        const abortSignal = signal !== null && signal !== void 0 ? signal : webAuthnAbortService.createNewAbortSignal();
        if (challengeResponse.webauthn.type === "create") {
          const { user } = challengeResponse.webauthn.credential_options.publicKey;
          if (!user.name) {
            const nameToUse = friendlyName;
            if (!nameToUse) {
              const currentUser = await this.client.getUser();
              const userData = currentUser.data.user;
              const fallbackName = ((_a = userData === null || userData === void 0 ? void 0 : userData.user_metadata) === null || _a === void 0 ? void 0 : _a.name) || (userData === null || userData === void 0 ? void 0 : userData.email) || (userData === null || userData === void 0 ? void 0 : userData.id) || "User";
              user.name = `${user.id}:${fallbackName}`;
            } else {
              user.name = `${user.id}:${nameToUse}`;
            }
          }
          if (!user.displayName) {
            user.displayName = user.name;
          }
        }
        switch (challengeResponse.webauthn.type) {
          case "create": {
            const options = mergeCredentialCreationOptions(challengeResponse.webauthn.credential_options.publicKey, overrides === null || overrides === void 0 ? void 0 : overrides.create);
            const { data, error } = await createCredential({
              publicKey: options,
              signal: abortSignal
            });
            if (data) {
              return {
                data: {
                  factorId,
                  challengeId: challengeResponse.id,
                  webauthn: {
                    type: challengeResponse.webauthn.type,
                    credential_response: data
                  }
                },
                error: null
              };
            }
            return { data: null, error };
          }
          case "request": {
            const options = mergeCredentialRequestOptions(challengeResponse.webauthn.credential_options.publicKey, overrides === null || overrides === void 0 ? void 0 : overrides.request);
            const { data, error } = await getCredential(Object.assign(Object.assign({}, challengeResponse.webauthn.credential_options), { publicKey: options, signal: abortSignal }));
            if (data) {
              return {
                data: {
                  factorId,
                  challengeId: challengeResponse.id,
                  webauthn: {
                    type: challengeResponse.webauthn.type,
                    credential_response: data
                  }
                },
                error: null
              };
            }
            return { data: null, error };
          }
        }
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        return {
          data: null,
          error: new AuthUnknownError("Unexpected error in challenge", error)
        };
      }
    }
    /**
     * Verify a WebAuthn credential with the server.
     * Completes the WebAuthn ceremony by sending the credential to the server for verification.
     *
     * @experimental This method is experimental and may change in future releases
     * @param {Object} params - Verification parameters
     * @param {string} params.challengeId - ID of the challenge being verified
     * @param {string} params.factorId - ID of the WebAuthn factor
     * @param {MFAVerifyWebauthnParams<T>['webauthn']} params.webauthn - WebAuthn credential response
     * @returns {Promise<AuthMFAVerifyResponse>} Verification result with session or error
     * @see {@link https://w3c.github.io/webauthn/#sctn-verifying-assertion W3C WebAuthn Spec - Verifying an Authentication Assertion}
     * */
    async _verify({ challengeId, factorId, webauthn }) {
      return this.client.mfa.verify({
        factorId,
        challengeId,
        webauthn
      });
    }
    /**
     * Complete WebAuthn authentication flow.
     * Performs challenge and verification in a single operation for existing credentials.
     *
     * @experimental This method is experimental and may change in future releases
     * @param {Object} params - Authentication parameters
     * @param {string} params.factorId - ID of the WebAuthn factor to authenticate with
     * @param {Object} params.webauthn - WebAuthn configuration
     * @param {string} params.webauthn.rpId - Relying Party ID (defaults to current hostname)
     * @param {string[]} params.webauthn.rpOrigins - Allowed origins (defaults to current origin)
     * @param {AbortSignal} params.webauthn.signal - Optional abort signal
     * @param {PublicKeyCredentialRequestOptionsFuture} overrides - Override options for navigator.credentials.get
     * @returns {Promise<RequestResult<AuthMFAVerifyResponseData, WebAuthnError | AuthError>>} Authentication result
     * @see {@link https://w3c.github.io/webauthn/#sctn-authentication W3C WebAuthn Spec - Authentication Ceremony}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialRequestOptions MDN - PublicKeyCredentialRequestOptions}
     */
    async _authenticate({ factorId, webauthn: { rpId = typeof window !== "undefined" ? window.location.hostname : void 0, rpOrigins = typeof window !== "undefined" ? [window.location.origin] : void 0, signal } = {} }, overrides) {
      if (!rpId) {
        return {
          data: null,
          error: new AuthError("rpId is required for WebAuthn authentication")
        };
      }
      try {
        if (!browserSupportsWebAuthn()) {
          return {
            data: null,
            error: new AuthUnknownError("Browser does not support WebAuthn", null)
          };
        }
        const { data: challengeResponse, error: challengeError } = await this.challenge({
          factorId,
          webauthn: { rpId, rpOrigins },
          signal
        }, { request: overrides });
        if (!challengeResponse) {
          return { data: null, error: challengeError };
        }
        const { webauthn } = challengeResponse;
        return this._verify({
          factorId,
          challengeId: challengeResponse.challengeId,
          webauthn: {
            type: webauthn.type,
            rpId,
            rpOrigins,
            credential_response: webauthn.credential_response
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        return {
          data: null,
          error: new AuthUnknownError("Unexpected error in authenticate", error)
        };
      }
    }
    /**
     * Complete WebAuthn registration flow.
     * Performs enrollment, challenge, and verification in a single operation for new credentials.
     *
     * @experimental This method is experimental and may change in future releases
     * @param {Object} params - Registration parameters
     * @param {string} params.friendlyName - User-friendly name for the credential
     * @param {string} params.rpId - Relying Party ID (defaults to current hostname)
     * @param {string[]} params.rpOrigins - Allowed origins (defaults to current origin)
     * @param {AbortSignal} params.signal - Optional abort signal
     * @param {PublicKeyCredentialCreationOptionsFuture} overrides - Override options for navigator.credentials.create
     * @returns {Promise<RequestResult<AuthMFAVerifyResponseData, WebAuthnError | AuthError>>} Registration result
     * @see {@link https://w3c.github.io/webauthn/#sctn-registering-a-new-credential W3C WebAuthn Spec - Registration Ceremony}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions MDN - PublicKeyCredentialCreationOptions}
     */
    async _register({ friendlyName, webauthn: { rpId = typeof window !== "undefined" ? window.location.hostname : void 0, rpOrigins = typeof window !== "undefined" ? [window.location.origin] : void 0, signal } = {} }, overrides) {
      if (!rpId) {
        return {
          data: null,
          error: new AuthError("rpId is required for WebAuthn registration")
        };
      }
      try {
        if (!browserSupportsWebAuthn()) {
          return {
            data: null,
            error: new AuthUnknownError("Browser does not support WebAuthn", null)
          };
        }
        const { data: factor, error: enrollError } = await this._enroll({
          friendlyName
        });
        if (!factor) {
          await this.client.mfa.listFactors().then((factors) => {
            var _a;
            return (_a = factors.data) === null || _a === void 0 ? void 0 : _a.all.find((v) => v.factor_type === "webauthn" && v.friendly_name === friendlyName && v.status !== "unverified");
          }).then((factor2) => factor2 ? this.client.mfa.unenroll({ factorId: factor2 === null || factor2 === void 0 ? void 0 : factor2.id }) : void 0);
          return { data: null, error: enrollError };
        }
        const { data: challengeResponse, error: challengeError } = await this._challenge({
          factorId: factor.id,
          friendlyName: factor.friendly_name,
          webauthn: { rpId, rpOrigins },
          signal
        }, {
          create: overrides
        });
        if (!challengeResponse) {
          return { data: null, error: challengeError };
        }
        return this._verify({
          factorId: factor.id,
          challengeId: challengeResponse.challengeId,
          webauthn: {
            rpId,
            rpOrigins,
            type: challengeResponse.webauthn.type,
            credential_response: challengeResponse.webauthn.credential_response
          }
        });
      } catch (error) {
        if (isAuthError(error)) {
          return { data: null, error };
        }
        return {
          data: null,
          error: new AuthUnknownError("Unexpected error in register", error)
        };
      }
    }
  };

  // node_modules/@supabase/auth-js/dist/module/GoTrueClient.js
  polyfillGlobalThis();
  var DEFAULT_OPTIONS = {
    url: GOTRUE_URL,
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    headers: DEFAULT_HEADERS2,
    flowType: "implicit",
    debug: false,
    hasCustomAuthorizationHeader: false,
    throwOnError: false,
    lockAcquireTimeout: 5e3,
    // 5 seconds
    skipAutoInitialize: false
  };
  async function lockNoOp(name, acquireTimeout, fn) {
    return await fn();
  }
  var GLOBAL_JWKS = {};
  var GoTrueClient = class _GoTrueClient {
    /**
     * The JWKS used for verifying asymmetric JWTs
     */
    get jwks() {
      var _a, _b;
      return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.jwks) !== null && _b !== void 0 ? _b : { keys: [] };
    }
    set jwks(value) {
      GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { jwks: value });
    }
    get jwks_cached_at() {
      var _a, _b;
      return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.cachedAt) !== null && _b !== void 0 ? _b : Number.MIN_SAFE_INTEGER;
    }
    set jwks_cached_at(value) {
      GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { cachedAt: value });
    }
    /**
     * Create a new client for use in the browser.
     *
     * @example
     * ```ts
     * import { GoTrueClient } from '@supabase/auth-js'
     *
     * const auth = new GoTrueClient({
     *   url: 'https://xyzcompany.supabase.co/auth/v1',
     *   headers: { apikey: 'public-anon-key' },
     *   storageKey: 'supabase-auth',
     * })
     * ```
     */
    constructor(options) {
      var _a, _b, _c;
      this.userStorage = null;
      this.memoryStorage = null;
      this.stateChangeEmitters = /* @__PURE__ */ new Map();
      this.autoRefreshTicker = null;
      this.autoRefreshTickTimeout = null;
      this.visibilityChangedCallback = null;
      this.refreshingDeferred = null;
      this.initializePromise = null;
      this.detectSessionInUrl = true;
      this.hasCustomAuthorizationHeader = false;
      this.suppressGetSessionWarning = false;
      this.lockAcquired = false;
      this.pendingInLock = [];
      this.broadcastChannel = null;
      this.logger = console.log;
      const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
      this.storageKey = settings.storageKey;
      this.instanceID = (_a = _GoTrueClient.nextInstanceID[this.storageKey]) !== null && _a !== void 0 ? _a : 0;
      _GoTrueClient.nextInstanceID[this.storageKey] = this.instanceID + 1;
      this.logDebugMessages = !!settings.debug;
      if (typeof settings.debug === "function") {
        this.logger = settings.debug;
      }
      if (this.instanceID > 0 && isBrowser()) {
        const message = `${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;
        console.warn(message);
        if (this.logDebugMessages) {
          console.trace(message);
        }
      }
      this.persistSession = settings.persistSession;
      this.autoRefreshToken = settings.autoRefreshToken;
      this.admin = new GoTrueAdminApi({
        url: settings.url,
        headers: settings.headers,
        fetch: settings.fetch
      });
      this.url = settings.url;
      this.headers = settings.headers;
      this.fetch = resolveFetch3(settings.fetch);
      this.lock = settings.lock || lockNoOp;
      this.detectSessionInUrl = settings.detectSessionInUrl;
      this.flowType = settings.flowType;
      this.hasCustomAuthorizationHeader = settings.hasCustomAuthorizationHeader;
      this.throwOnError = settings.throwOnError;
      this.lockAcquireTimeout = settings.lockAcquireTimeout;
      if (settings.lock) {
        this.lock = settings.lock;
      } else if (this.persistSession && isBrowser() && ((_b = globalThis === null || globalThis === void 0 ? void 0 : globalThis.navigator) === null || _b === void 0 ? void 0 : _b.locks)) {
        this.lock = navigatorLock;
      } else {
        this.lock = lockNoOp;
      }
      if (!this.jwks) {
        this.jwks = { keys: [] };
        this.jwks_cached_at = Number.MIN_SAFE_INTEGER;
      }
      this.mfa = {
        verify: this._verify.bind(this),
        enroll: this._enroll.bind(this),
        unenroll: this._unenroll.bind(this),
        challenge: this._challenge.bind(this),
        listFactors: this._listFactors.bind(this),
        challengeAndVerify: this._challengeAndVerify.bind(this),
        getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this),
        webauthn: new WebAuthnApi(this)
      };
      this.oauth = {
        getAuthorizationDetails: this._getAuthorizationDetails.bind(this),
        approveAuthorization: this._approveAuthorization.bind(this),
        denyAuthorization: this._denyAuthorization.bind(this),
        listGrants: this._listOAuthGrants.bind(this),
        revokeGrant: this._revokeOAuthGrant.bind(this)
      };
      if (this.persistSession) {
        if (settings.storage) {
          this.storage = settings.storage;
        } else {
          if (supportsLocalStorage()) {
            this.storage = globalThis.localStorage;
          } else {
            this.memoryStorage = {};
            this.storage = memoryLocalStorageAdapter(this.memoryStorage);
          }
        }
        if (settings.userStorage) {
          this.userStorage = settings.userStorage;
        }
      } else {
        this.memoryStorage = {};
        this.storage = memoryLocalStorageAdapter(this.memoryStorage);
      }
      if (isBrowser() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
        try {
          this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
        } catch (e) {
          console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", e);
        }
        (_c = this.broadcastChannel) === null || _c === void 0 ? void 0 : _c.addEventListener("message", async (event) => {
          this._debug("received broadcast notification from other tab or client", event);
          try {
            await this._notifyAllSubscribers(event.data.event, event.data.session, false);
          } catch (error) {
            this._debug("#broadcastChannel", "error", error);
          }
        });
      }
      if (!settings.skipAutoInitialize) {
        this.initialize().catch((error) => {
          this._debug("#initialize()", "error", error);
        });
      }
    }
    /**
     * Returns whether error throwing mode is enabled for this client.
     */
    isThrowOnErrorEnabled() {
      return this.throwOnError;
    }
    /**
     * Centralizes return handling with optional error throwing. When `throwOnError` is enabled
     * and the provided result contains a non-nullish error, the error is thrown instead of
     * being returned. This ensures consistent behavior across all public API methods.
     */
    _returnResult(result) {
      if (this.throwOnError && result && result.error) {
        throw result.error;
      }
      return result;
    }
    _logPrefix() {
      return `GoTrueClient@${this.storageKey}:${this.instanceID} (${version3}) ${(/* @__PURE__ */ new Date()).toISOString()}`;
    }
    _debug(...args) {
      if (this.logDebugMessages) {
        this.logger(this._logPrefix(), ...args);
      }
      return this;
    }
    /**
     * Initializes the client session either from the url or from storage.
     * This method is automatically called when instantiating the client, but should also be called
     * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
     */
    async initialize() {
      if (this.initializePromise) {
        return await this.initializePromise;
      }
      this.initializePromise = (async () => {
        return await this._acquireLock(this.lockAcquireTimeout, async () => {
          return await this._initialize();
        });
      })();
      return await this.initializePromise;
    }
    /**
     * IMPORTANT:
     * 1. Never throw in this method, as it is called from the constructor
     * 2. Never return a session from this method as it would be cached over
     *    the whole lifetime of the client
     */
    async _initialize() {
      var _a;
      try {
        let params = {};
        let callbackUrlType = "none";
        if (isBrowser()) {
          params = parseParametersFromURL(window.location.href);
          if (this._isImplicitGrantCallback(params)) {
            callbackUrlType = "implicit";
          } else if (await this._isPKCECallback(params)) {
            callbackUrlType = "pkce";
          }
        }
        if (isBrowser() && this.detectSessionInUrl && callbackUrlType !== "none") {
          const { data, error } = await this._getSessionFromURL(params, callbackUrlType);
          if (error) {
            this._debug("#_initialize()", "error detecting session from URL", error);
            if (isAuthImplicitGrantRedirectError(error)) {
              const errorCode = (_a = error.details) === null || _a === void 0 ? void 0 : _a.code;
              if (errorCode === "identity_already_exists" || errorCode === "identity_not_found" || errorCode === "single_identity_not_deletable") {
                return { error };
              }
            }
            return { error };
          }
          const { session, redirectType } = data;
          this._debug("#_initialize()", "detected session in URL", session, "redirect type", redirectType);
          await this._saveSession(session);
          setTimeout(async () => {
            if (redirectType === "recovery") {
              await this._notifyAllSubscribers("PASSWORD_RECOVERY", session);
            } else {
              await this._notifyAllSubscribers("SIGNED_IN", session);
            }
          }, 0);
          return { error: null };
        }
        await this._recoverAndRefresh();
        return { error: null };
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ error });
        }
        return this._returnResult({
          error: new AuthUnknownError("Unexpected error during initialization", error)
        });
      } finally {
        await this._handleVisibilityChange();
        this._debug("#_initialize()", "end");
      }
    }
    /**
     * Creates a new anonymous user.
     *
     * @returns A session where the is_anonymous claim in the access token JWT set to true
     */
    async signInAnonymously(credentials) {
      var _a, _b, _c;
      try {
        const res = await _request(this.fetch, "POST", `${this.url}/signup`, {
          headers: this.headers,
          body: {
            data: (_b = (_a = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {},
            gotrue_meta_security: { captcha_token: (_c = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _c === void 0 ? void 0 : _c.captchaToken }
          },
          xform: _sessionResponse
        });
        const { data, error } = res;
        if (error || !data) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        const session = data.session;
        const user = data.user;
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", session);
        }
        return this._returnResult({ data: { user, session }, error: null });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Creates a new user.
     *
     * Be aware that if a user account exists in the system you may get back an
     * error message that attempts to hide this information from the user.
     * This method has support for PKCE via email signups. The PKCE flow cannot be used when autoconfirm is enabled.
     *
     * @returns A logged-in session if the server has "autoconfirm" ON
     * @returns A user if the server has "autoconfirm" OFF
     */
    async signUp(credentials) {
      var _a, _b, _c;
      try {
        let res;
        if ("email" in credentials) {
          const { email, password, options } = credentials;
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce") {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          }
          res = await _request(this.fetch, "POST", `${this.url}/signup`, {
            headers: this.headers,
            redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
            body: {
              email,
              password,
              data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod
            },
            xform: _sessionResponse
          });
        } else if ("phone" in credentials) {
          const { phone, password, options } = credentials;
          res = await _request(this.fetch, "POST", `${this.url}/signup`, {
            headers: this.headers,
            body: {
              phone,
              password,
              data: (_b = options === null || options === void 0 ? void 0 : options.data) !== null && _b !== void 0 ? _b : {},
              channel: (_c = options === null || options === void 0 ? void 0 : options.channel) !== null && _c !== void 0 ? _c : "sms",
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponse
          });
        } else {
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
        }
        const { data, error } = res;
        if (error || !data) {
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        const session = data.session;
        const user = data.user;
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", session);
        }
        return this._returnResult({ data: { user, session }, error: null });
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Log in an existing user with an email and password or phone and password.
     *
     * Be aware that you may get back an error message that will not distinguish
     * between the cases where the account does not exist or that the
     * email/phone and password combination is wrong or that the account can only
     * be accessed via social login.
     */
    async signInWithPassword(credentials) {
      try {
        let res;
        if ("email" in credentials) {
          const { email, password, options } = credentials;
          res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
            headers: this.headers,
            body: {
              email,
              password,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponsePassword
          });
        } else if ("phone" in credentials) {
          const { phone, password, options } = credentials;
          res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
            headers: this.headers,
            body: {
              phone,
              password,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponsePassword
          });
        } else {
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
        }
        const { data, error } = res;
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error });
        } else if (!data || !data.session || !data.user) {
          const invalidTokenError = new AuthInvalidTokenResponseError();
          return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError });
        }
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", data.session);
        }
        return this._returnResult({
          data: Object.assign({ user: data.user, session: data.session }, data.weak_password ? { weakPassword: data.weak_password } : null),
          error
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Log in an existing user via a third-party provider.
     * This method supports the PKCE flow.
     */
    async signInWithOAuth(credentials) {
      var _a, _b, _c, _d;
      return await this._handleProviderSignIn(credentials.provider, {
        redirectTo: (_a = credentials.options) === null || _a === void 0 ? void 0 : _a.redirectTo,
        scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
        queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
        skipBrowserRedirect: (_d = credentials.options) === null || _d === void 0 ? void 0 : _d.skipBrowserRedirect
      });
    }
    /**
     * Log in an existing user by exchanging an Auth Code issued during the PKCE flow.
     */
    async exchangeCodeForSession(authCode) {
      await this.initializePromise;
      return this._acquireLock(this.lockAcquireTimeout, async () => {
        return this._exchangeCodeForSession(authCode);
      });
    }
    /**
     * Signs in a user by verifying a message signed by the user's private key.
     * Supports Ethereum (via Sign-In-With-Ethereum) & Solana (Sign-In-With-Solana) standards,
     * both of which derive from the EIP-4361 standard
     * With slight variation on Solana's side.
     * @reference https://eips.ethereum.org/EIPS/eip-4361
     */
    async signInWithWeb3(credentials) {
      const { chain } = credentials;
      switch (chain) {
        case "ethereum":
          return await this.signInWithEthereum(credentials);
        case "solana":
          return await this.signInWithSolana(credentials);
        default:
          throw new Error(`@supabase/auth-js: Unsupported chain "${chain}"`);
      }
    }
    async signInWithEthereum(credentials) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
      let message;
      let signature;
      if ("message" in credentials) {
        message = credentials.message;
        signature = credentials.signature;
      } else {
        const { chain, wallet, statement, options } = credentials;
        let resolvedWallet;
        if (!isBrowser()) {
          if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
            throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
          }
          resolvedWallet = wallet;
        } else if (typeof wallet === "object") {
          resolvedWallet = wallet;
        } else {
          const windowAny = window;
          if ("ethereum" in windowAny && typeof windowAny.ethereum === "object" && "request" in windowAny.ethereum && typeof windowAny.ethereum.request === "function") {
            resolvedWallet = windowAny.ethereum;
          } else {
            throw new Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`);
          }
        }
        const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
        const accounts = await resolvedWallet.request({
          method: "eth_requestAccounts"
        }).then((accs) => accs).catch(() => {
          throw new Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`);
        });
        if (!accounts || accounts.length === 0) {
          throw new Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);
        }
        const address = getAddress(accounts[0]);
        let chainId = (_b = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _b === void 0 ? void 0 : _b.chainId;
        if (!chainId) {
          const chainIdHex = await resolvedWallet.request({
            method: "eth_chainId"
          });
          chainId = fromHex(chainIdHex);
        }
        const siweMessage = {
          domain: url.host,
          address,
          statement,
          uri: url.href,
          version: "1",
          chainId,
          nonce: (_c = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _c === void 0 ? void 0 : _c.nonce,
          issuedAt: (_e = (_d = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _d === void 0 ? void 0 : _d.issuedAt) !== null && _e !== void 0 ? _e : /* @__PURE__ */ new Date(),
          expirationTime: (_f = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _f === void 0 ? void 0 : _f.expirationTime,
          notBefore: (_g = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _g === void 0 ? void 0 : _g.notBefore,
          requestId: (_h = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _h === void 0 ? void 0 : _h.requestId,
          resources: (_j = options === null || options === void 0 ? void 0 : options.signInWithEthereum) === null || _j === void 0 ? void 0 : _j.resources
        };
        message = createSiweMessage(siweMessage);
        signature = await resolvedWallet.request({
          method: "personal_sign",
          params: [toHex(message), address]
        });
      }
      try {
        const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
          headers: this.headers,
          body: Object.assign({
            chain: "ethereum",
            message,
            signature
          }, ((_k = credentials.options) === null || _k === void 0 ? void 0 : _k.captchaToken) ? { gotrue_meta_security: { captcha_token: (_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken } } : null),
          xform: _sessionResponse
        });
        if (error) {
          throw error;
        }
        if (!data || !data.session || !data.user) {
          const invalidTokenError = new AuthInvalidTokenResponseError();
          return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError });
        }
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", data.session);
        }
        return this._returnResult({ data: Object.assign({}, data), error });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    async signInWithSolana(credentials) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
      let message;
      let signature;
      if ("message" in credentials) {
        message = credentials.message;
        signature = credentials.signature;
      } else {
        const { chain, wallet, statement, options } = credentials;
        let resolvedWallet;
        if (!isBrowser()) {
          if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
            throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
          }
          resolvedWallet = wallet;
        } else if (typeof wallet === "object") {
          resolvedWallet = wallet;
        } else {
          const windowAny = window;
          if ("solana" in windowAny && typeof windowAny.solana === "object" && ("signIn" in windowAny.solana && typeof windowAny.solana.signIn === "function" || "signMessage" in windowAny.solana && typeof windowAny.solana.signMessage === "function")) {
            resolvedWallet = windowAny.solana;
          } else {
            throw new Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`);
          }
        }
        const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
        if ("signIn" in resolvedWallet && resolvedWallet.signIn) {
          const output = await resolvedWallet.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, options === null || options === void 0 ? void 0 : options.signInWithSolana), {
            // non-overridable properties
            version: "1",
            domain: url.host,
            uri: url.href
          }), statement ? { statement } : null));
          let outputToProcess;
          if (Array.isArray(output) && output[0] && typeof output[0] === "object") {
            outputToProcess = output[0];
          } else if (output && typeof output === "object" && "signedMessage" in output && "signature" in output) {
            outputToProcess = output;
          } else {
            throw new Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
          }
          if ("signedMessage" in outputToProcess && "signature" in outputToProcess && (typeof outputToProcess.signedMessage === "string" || outputToProcess.signedMessage instanceof Uint8Array) && outputToProcess.signature instanceof Uint8Array) {
            message = typeof outputToProcess.signedMessage === "string" ? outputToProcess.signedMessage : new TextDecoder().decode(outputToProcess.signedMessage);
            signature = outputToProcess.signature;
          } else {
            throw new Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
          }
        } else {
          if (!("signMessage" in resolvedWallet) || typeof resolvedWallet.signMessage !== "function" || !("publicKey" in resolvedWallet) || typeof resolvedWallet !== "object" || !resolvedWallet.publicKey || !("toBase58" in resolvedWallet.publicKey) || typeof resolvedWallet.publicKey.toBase58 !== "function") {
            throw new Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
          }
          message = [
            `${url.host} wants you to sign in with your Solana account:`,
            resolvedWallet.publicKey.toBase58(),
            ...statement ? ["", statement, ""] : [""],
            "Version: 1",
            `URI: ${url.href}`,
            `Issued At: ${(_c = (_b = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _b === void 0 ? void 0 : _b.issuedAt) !== null && _c !== void 0 ? _c : (/* @__PURE__ */ new Date()).toISOString()}`,
            ...((_d = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _d === void 0 ? void 0 : _d.notBefore) ? [`Not Before: ${options.signInWithSolana.notBefore}`] : [],
            ...((_e = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _e === void 0 ? void 0 : _e.expirationTime) ? [`Expiration Time: ${options.signInWithSolana.expirationTime}`] : [],
            ...((_f = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _f === void 0 ? void 0 : _f.chainId) ? [`Chain ID: ${options.signInWithSolana.chainId}`] : [],
            ...((_g = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _g === void 0 ? void 0 : _g.nonce) ? [`Nonce: ${options.signInWithSolana.nonce}`] : [],
            ...((_h = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _h === void 0 ? void 0 : _h.requestId) ? [`Request ID: ${options.signInWithSolana.requestId}`] : [],
            ...((_k = (_j = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _j === void 0 ? void 0 : _j.resources) === null || _k === void 0 ? void 0 : _k.length) ? [
              "Resources",
              ...options.signInWithSolana.resources.map((resource) => `- ${resource}`)
            ] : []
          ].join("\n");
          const maybeSignature = await resolvedWallet.signMessage(new TextEncoder().encode(message), "utf8");
          if (!maybeSignature || !(maybeSignature instanceof Uint8Array)) {
            throw new Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
          }
          signature = maybeSignature;
        }
      }
      try {
        const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
          headers: this.headers,
          body: Object.assign({ chain: "solana", message, signature: bytesToBase64URL(signature) }, ((_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken) ? { gotrue_meta_security: { captcha_token: (_m = credentials.options) === null || _m === void 0 ? void 0 : _m.captchaToken } } : null),
          xform: _sessionResponse
        });
        if (error) {
          throw error;
        }
        if (!data || !data.session || !data.user) {
          const invalidTokenError = new AuthInvalidTokenResponseError();
          return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError });
        }
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", data.session);
        }
        return this._returnResult({ data: Object.assign({}, data), error });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    async _exchangeCodeForSession(authCode) {
      const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
      const [codeVerifier, redirectType] = (storageItem !== null && storageItem !== void 0 ? storageItem : "").split("/");
      try {
        if (!codeVerifier && this.flowType === "pkce") {
          throw new AuthPKCECodeVerifierMissingError();
        }
        const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, {
          headers: this.headers,
          body: {
            auth_code: authCode,
            code_verifier: codeVerifier
          },
          xform: _sessionResponse
        });
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (error) {
          throw error;
        }
        if (!data || !data.session || !data.user) {
          const invalidTokenError = new AuthInvalidTokenResponseError();
          return this._returnResult({
            data: { user: null, session: null, redirectType: null },
            error: invalidTokenError
          });
        }
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", data.session);
        }
        return this._returnResult({ data: Object.assign(Object.assign({}, data), { redirectType: redirectType !== null && redirectType !== void 0 ? redirectType : null }), error });
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({
            data: { user: null, session: null, redirectType: null },
            error
          });
        }
        throw error;
      }
    }
    /**
     * Allows signing in with an OIDC ID token. The authentication provider used
     * should be enabled and configured.
     */
    async signInWithIdToken(credentials) {
      try {
        const { options, provider, token, access_token, nonce } = credentials;
        const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
          headers: this.headers,
          body: {
            provider,
            id_token: token,
            access_token,
            nonce,
            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
          },
          xform: _sessionResponse
        });
        const { data, error } = res;
        if (error) {
          return this._returnResult({ data: { user: null, session: null }, error });
        } else if (!data || !data.session || !data.user) {
          const invalidTokenError = new AuthInvalidTokenResponseError();
          return this._returnResult({ data: { user: null, session: null }, error: invalidTokenError });
        }
        if (data.session) {
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("SIGNED_IN", data.session);
        }
        return this._returnResult({ data, error });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Log in a user using magiclink or a one-time password (OTP).
     *
     * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
     * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
     * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
     *
     * Be aware that you may get back an error message that will not distinguish
     * between the cases where the account does not exist or, that the account
     * can only be accessed via social login.
     *
     * Do note that you will need to configure a Whatsapp sender on Twilio
     * if you are using phone sign in with the 'whatsapp' channel. The whatsapp
     * channel is not supported on other providers
     * at this time.
     * This method supports PKCE when an email is passed.
     */
    async signInWithOtp(credentials) {
      var _a, _b, _c, _d, _e;
      try {
        if ("email" in credentials) {
          const { email, options } = credentials;
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce") {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          }
          const { error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
            headers: this.headers,
            body: {
              email,
              data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
              create_user: (_b = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _b !== void 0 ? _b : true,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod
            },
            redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
          });
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        if ("phone" in credentials) {
          const { phone, options } = credentials;
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
            headers: this.headers,
            body: {
              phone,
              data: (_c = options === null || options === void 0 ? void 0 : options.data) !== null && _c !== void 0 ? _c : {},
              create_user: (_d = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _d !== void 0 ? _d : true,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
              channel: (_e = options === null || options === void 0 ? void 0 : options.channel) !== null && _e !== void 0 ? _e : "sms"
            }
          });
          return this._returnResult({
            data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id },
            error
          });
        }
        throw new AuthInvalidCredentialsError("You must provide either an email or phone number.");
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
     */
    async verifyOtp(params) {
      var _a, _b;
      try {
        let redirectTo = void 0;
        let captchaToken = void 0;
        if ("options" in params) {
          redirectTo = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo;
          captchaToken = (_b = params.options) === null || _b === void 0 ? void 0 : _b.captchaToken;
        }
        const { data, error } = await _request(this.fetch, "POST", `${this.url}/verify`, {
          headers: this.headers,
          body: Object.assign(Object.assign({}, params), { gotrue_meta_security: { captcha_token: captchaToken } }),
          redirectTo,
          xform: _sessionResponse
        });
        if (error) {
          throw error;
        }
        if (!data) {
          const tokenVerificationError = new Error("An error occurred on token verification.");
          throw tokenVerificationError;
        }
        const session = data.session;
        const user = data.user;
        if (session === null || session === void 0 ? void 0 : session.access_token) {
          await this._saveSession(session);
          await this._notifyAllSubscribers(params.type == "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN", session);
        }
        return this._returnResult({ data: { user, session }, error: null });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Attempts a single-sign on using an enterprise Identity Provider. A
     * successful SSO attempt will redirect the current page to the identity
     * provider authorization page. The redirect URL is implementation and SSO
     * protocol specific.
     *
     * You can use it by providing a SSO domain. Typically you can extract this
     * domain by asking users for their email address. If this domain is
     * registered on the Auth instance the redirect will use that organization's
     * currently active SSO Identity Provider for the login.
     *
     * If you have built an organization-specific login page, you can use the
     * organization's SSO Identity Provider UUID directly instead.
     */
    async signInWithSSO(params) {
      var _a, _b, _c, _d, _e;
      try {
        let codeChallenge = null;
        let codeChallengeMethod = null;
        if (this.flowType === "pkce") {
          ;
          [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
        }
        const result = await _request(this.fetch, "POST", `${this.url}/sso`, {
          body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in params ? { provider_id: params.providerId } : null), "domain" in params ? { domain: params.domain } : null), { redirect_to: (_b = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo) !== null && _b !== void 0 ? _b : void 0 }), ((_c = params === null || params === void 0 ? void 0 : params.options) === null || _c === void 0 ? void 0 : _c.captchaToken) ? { gotrue_meta_security: { captcha_token: params.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
          headers: this.headers,
          xform: _ssoResponse
        });
        if (((_d = result.data) === null || _d === void 0 ? void 0 : _d.url) && isBrowser() && !((_e = params.options) === null || _e === void 0 ? void 0 : _e.skipBrowserRedirect)) {
          window.location.assign(result.data.url);
        }
        return this._returnResult(result);
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Sends a reauthentication OTP to the user's email or phone number.
     * Requires the user to be signed-in.
     */
    async reauthenticate() {
      await this.initializePromise;
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._reauthenticate();
      });
    }
    async _reauthenticate() {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError)
            throw sessionError;
          if (!session)
            throw new AuthSessionMissingError();
          const { error } = await _request(this.fetch, "GET", `${this.url}/reauthenticate`, {
            headers: this.headers,
            jwt: session.access_token
          });
          return this._returnResult({ data: { user: null, session: null }, error });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Resends an existing signup confirmation email, email change email, SMS OTP or phone change OTP.
     */
    async resend(credentials) {
      try {
        const endpoint = `${this.url}/resend`;
        if ("email" in credentials) {
          const { email, type, options } = credentials;
          const { error } = await _request(this.fetch, "POST", endpoint, {
            headers: this.headers,
            body: {
              email,
              type,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
          });
          return this._returnResult({ data: { user: null, session: null }, error });
        } else if ("phone" in credentials) {
          const { phone, type, options } = credentials;
          const { data, error } = await _request(this.fetch, "POST", endpoint, {
            headers: this.headers,
            body: {
              phone,
              type,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            }
          });
          return this._returnResult({
            data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id },
            error
          });
        }
        throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a type");
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Returns the session, refreshing it if necessary.
     *
     * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
     *
     * **IMPORTANT:** This method loads values directly from the storage attached
     * to the client. If that storage is based on request cookies for example,
     * the values in it may not be authentic and therefore it's strongly advised
     * against using this method and its results in such circumstances. A warning
     * will be emitted if this is detected. Use {@link #getUser()} instead.
     */
    async getSession() {
      await this.initializePromise;
      const result = await this._acquireLock(this.lockAcquireTimeout, async () => {
        return this._useSession(async (result2) => {
          return result2;
        });
      });
      return result;
    }
    /**
     * Acquires a global lock based on the storage key.
     */
    async _acquireLock(acquireTimeout, fn) {
      this._debug("#_acquireLock", "begin", acquireTimeout);
      try {
        if (this.lockAcquired) {
          const last = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve();
          const result = (async () => {
            await last;
            return await fn();
          })();
          this.pendingInLock.push((async () => {
            try {
              await result;
            } catch (e) {
            }
          })());
          return result;
        }
        return await this.lock(`lock:${this.storageKey}`, acquireTimeout, async () => {
          this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
          try {
            this.lockAcquired = true;
            const result = fn();
            this.pendingInLock.push((async () => {
              try {
                await result;
              } catch (e) {
              }
            })());
            await result;
            while (this.pendingInLock.length) {
              const waitOn = [...this.pendingInLock];
              await Promise.all(waitOn);
              this.pendingInLock.splice(0, waitOn.length);
            }
            return await result;
          } finally {
            this._debug("#_acquireLock", "lock released for storage key", this.storageKey);
            this.lockAcquired = false;
          }
        });
      } finally {
        this._debug("#_acquireLock", "end");
      }
    }
    /**
     * Use instead of {@link #getSession} inside the library. It is
     * semantically usually what you want, as getting a session involves some
     * processing afterwards that requires only one client operating on the
     * session at once across multiple tabs or processes.
     */
    async _useSession(fn) {
      this._debug("#_useSession", "begin");
      try {
        const result = await this.__loadSession();
        return await fn(result);
      } finally {
        this._debug("#_useSession", "end");
      }
    }
    /**
     * NEVER USE DIRECTLY!
     *
     * Always use {@link #_useSession}.
     */
    async __loadSession() {
      this._debug("#__loadSession()", "begin");
      if (!this.lockAcquired) {
        this._debug("#__loadSession()", "used outside of an acquired lock!", new Error().stack);
      }
      try {
        let currentSession = null;
        const maybeSession = await getItemAsync(this.storage, this.storageKey);
        this._debug("#getSession()", "session from storage", maybeSession);
        if (maybeSession !== null) {
          if (this._isValidSession(maybeSession)) {
            currentSession = maybeSession;
          } else {
            this._debug("#getSession()", "session from storage is not valid");
            await this._removeSession();
          }
        }
        if (!currentSession) {
          return { data: { session: null }, error: null };
        }
        const hasExpired = currentSession.expires_at ? currentSession.expires_at * 1e3 - Date.now() < EXPIRY_MARGIN_MS : false;
        this._debug("#__loadSession()", `session has${hasExpired ? "" : " not"} expired`, "expires_at", currentSession.expires_at);
        if (!hasExpired) {
          if (this.userStorage) {
            const maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
            if (maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) {
              currentSession.user = maybeUser.user;
            } else {
              currentSession.user = userNotAvailableProxy();
            }
          }
          if (this.storage.isServer && currentSession.user && !currentSession.user.__isUserNotAvailableProxy) {
            const suppressWarningRef = { value: this.suppressGetSessionWarning };
            currentSession.user = insecureUserWarningProxy(currentSession.user, suppressWarningRef);
            if (suppressWarningRef.value) {
              this.suppressGetSessionWarning = true;
            }
          }
          return { data: { session: currentSession }, error: null };
        }
        const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token);
        if (error) {
          return this._returnResult({ data: { session: null }, error });
        }
        return this._returnResult({ data: { session }, error: null });
      } finally {
        this._debug("#__loadSession()", "end");
      }
    }
    /**
     * Gets the current user details if there is an existing session. This method
     * performs a network request to the Supabase Auth server, so the returned
     * value is authentic and can be used to base authorization rules on.
     *
     * @param jwt Takes in an optional access token JWT. If no JWT is provided, the JWT from the current session is used.
     */
    async getUser(jwt) {
      if (jwt) {
        return await this._getUser(jwt);
      }
      await this.initializePromise;
      const result = await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._getUser();
      });
      if (result.data.user) {
        this.suppressGetSessionWarning = true;
      }
      return result;
    }
    async _getUser(jwt) {
      try {
        if (jwt) {
          return await _request(this.fetch, "GET", `${this.url}/user`, {
            headers: this.headers,
            jwt,
            xform: _userResponse
          });
        }
        return await this._useSession(async (result) => {
          var _a, _b, _c;
          const { data, error } = result;
          if (error) {
            throw error;
          }
          if (!((_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) && !this.hasCustomAuthorizationHeader) {
            return { data: { user: null }, error: new AuthSessionMissingError() };
          }
          return await _request(this.fetch, "GET", `${this.url}/user`, {
            headers: this.headers,
            jwt: (_c = (_b = data.session) === null || _b === void 0 ? void 0 : _b.access_token) !== null && _c !== void 0 ? _c : void 0,
            xform: _userResponse
          });
        });
      } catch (error) {
        if (isAuthError(error)) {
          if (isAuthSessionMissingError(error)) {
            await this._removeSession();
            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          }
          return this._returnResult({ data: { user: null }, error });
        }
        throw error;
      }
    }
    /**
     * Updates user data for a logged in user.
     */
    async updateUser(attributes, options = {}) {
      await this.initializePromise;
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._updateUser(attributes, options);
      });
    }
    async _updateUser(attributes, options = {}) {
      try {
        return await this._useSession(async (result) => {
          const { data: sessionData, error: sessionError } = result;
          if (sessionError) {
            throw sessionError;
          }
          if (!sessionData.session) {
            throw new AuthSessionMissingError();
          }
          const session = sessionData.session;
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce" && attributes.email != null) {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          }
          const { data, error: userError } = await _request(this.fetch, "PUT", `${this.url}/user`, {
            headers: this.headers,
            redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
            body: Object.assign(Object.assign({}, attributes), { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
            jwt: session.access_token,
            xform: _userResponse
          });
          if (userError) {
            throw userError;
          }
          session.user = data.user;
          await this._saveSession(session);
          await this._notifyAllSubscribers("USER_UPDATED", session);
          return this._returnResult({ data: { user: session.user }, error: null });
        });
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null }, error });
        }
        throw error;
      }
    }
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token or access token in the current session is invalid, an error will be thrown.
     * @param currentSession The current session that minimally contains an access token and refresh token.
     */
    async setSession(currentSession) {
      await this.initializePromise;
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._setSession(currentSession);
      });
    }
    async _setSession(currentSession) {
      try {
        if (!currentSession.access_token || !currentSession.refresh_token) {
          throw new AuthSessionMissingError();
        }
        const timeNow = Date.now() / 1e3;
        let expiresAt2 = timeNow;
        let hasExpired = true;
        let session = null;
        const { payload } = decodeJWT(currentSession.access_token);
        if (payload.exp) {
          expiresAt2 = payload.exp;
          hasExpired = expiresAt2 <= timeNow;
        }
        if (hasExpired) {
          const { data: refreshedSession, error } = await this._callRefreshToken(currentSession.refresh_token);
          if (error) {
            return this._returnResult({ data: { user: null, session: null }, error });
          }
          if (!refreshedSession) {
            return { data: { user: null, session: null }, error: null };
          }
          session = refreshedSession;
        } else {
          const { data, error } = await this._getUser(currentSession.access_token);
          if (error) {
            return this._returnResult({ data: { user: null, session: null }, error });
          }
          session = {
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
            user: data.user,
            token_type: "bearer",
            expires_in: expiresAt2 - timeNow,
            expires_at: expiresAt2
          };
          await this._saveSession(session);
          await this._notifyAllSubscribers("SIGNED_IN", session);
        }
        return this._returnResult({ data: { user: session.user, session }, error: null });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { session: null, user: null }, error });
        }
        throw error;
      }
    }
    /**
     * Returns a new session, regardless of expiry status.
     * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
     * If the current session's refresh token is invalid, an error will be thrown.
     * @param currentSession The current session. If passed in, it must contain a refresh token.
     */
    async refreshSession(currentSession) {
      await this.initializePromise;
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._refreshSession(currentSession);
      });
    }
    async _refreshSession(currentSession) {
      try {
        return await this._useSession(async (result) => {
          var _a;
          if (!currentSession) {
            const { data, error: error2 } = result;
            if (error2) {
              throw error2;
            }
            currentSession = (_a = data.session) !== null && _a !== void 0 ? _a : void 0;
          }
          if (!(currentSession === null || currentSession === void 0 ? void 0 : currentSession.refresh_token)) {
            throw new AuthSessionMissingError();
          }
          const { data: session, error } = await this._callRefreshToken(currentSession.refresh_token);
          if (error) {
            return this._returnResult({ data: { user: null, session: null }, error });
          }
          if (!session) {
            return this._returnResult({ data: { user: null, session: null }, error: null });
          }
          return this._returnResult({ data: { user: session.user, session }, error: null });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { user: null, session: null }, error });
        }
        throw error;
      }
    }
    /**
     * Gets the session data from a URL string
     */
    async _getSessionFromURL(params, callbackUrlType) {
      try {
        if (!isBrowser())
          throw new AuthImplicitGrantRedirectError("No browser detected.");
        if (params.error || params.error_description || params.error_code) {
          throw new AuthImplicitGrantRedirectError(params.error_description || "Error in URL with unspecified error_description", {
            error: params.error || "unspecified_error",
            code: params.error_code || "unspecified_code"
          });
        }
        switch (callbackUrlType) {
          case "implicit":
            if (this.flowType === "pkce") {
              throw new AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url.");
            }
            break;
          case "pkce":
            if (this.flowType === "implicit") {
              throw new AuthImplicitGrantRedirectError("Not a valid implicit grant flow url.");
            }
            break;
          default:
        }
        if (callbackUrlType === "pkce") {
          this._debug("#_initialize()", "begin", "is PKCE flow", true);
          if (!params.code)
            throw new AuthPKCEGrantCodeExchangeError("No code detected.");
          const { data: data2, error: error2 } = await this._exchangeCodeForSession(params.code);
          if (error2)
            throw error2;
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          window.history.replaceState(window.history.state, "", url.toString());
          return { data: { session: data2.session, redirectType: null }, error: null };
        }
        const { provider_token, provider_refresh_token, access_token, refresh_token, expires_in, expires_at, token_type } = params;
        if (!access_token || !expires_in || !refresh_token || !token_type) {
          throw new AuthImplicitGrantRedirectError("No session defined in URL");
        }
        const timeNow = Math.round(Date.now() / 1e3);
        const expiresIn = parseInt(expires_in);
        let expiresAt2 = timeNow + expiresIn;
        if (expires_at) {
          expiresAt2 = parseInt(expires_at);
        }
        const actuallyExpiresIn = expiresAt2 - timeNow;
        if (actuallyExpiresIn * 1e3 <= AUTO_REFRESH_TICK_DURATION_MS) {
          console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${actuallyExpiresIn}s, should have been closer to ${expiresIn}s`);
        }
        const issuedAt = expiresAt2 - expiresIn;
        if (timeNow - issuedAt >= 120) {
          console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", issuedAt, expiresAt2, timeNow);
        } else if (timeNow - issuedAt < 0) {
          console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew", issuedAt, expiresAt2, timeNow);
        }
        const { data, error } = await this._getUser(access_token);
        if (error)
          throw error;
        const session = {
          provider_token,
          provider_refresh_token,
          access_token,
          expires_in: expiresIn,
          expires_at: expiresAt2,
          refresh_token,
          token_type,
          user: data.user
        };
        window.location.hash = "";
        this._debug("#_getSessionFromURL()", "clearing window.location.hash");
        return this._returnResult({ data: { session, redirectType: params.type }, error: null });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { session: null, redirectType: null }, error });
        }
        throw error;
      }
    }
    /**
     * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
     *
     * If `detectSessionInUrl` is a function, it will be called with the URL and params to determine
     * if the URL should be processed as a Supabase auth callback. This allows users to exclude
     * URLs from other OAuth providers (e.g., Facebook Login) that also return access_token in the fragment.
     */
    _isImplicitGrantCallback(params) {
      if (typeof this.detectSessionInUrl === "function") {
        return this.detectSessionInUrl(new URL(window.location.href), params);
      }
      return Boolean(params.access_token || params.error_description);
    }
    /**
     * Checks if the current URL and backing storage contain parameters given by a PKCE flow
     */
    async _isPKCECallback(params) {
      const currentStorageContent = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
      return !!(params.code && currentStorageContent);
    }
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
     * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
     *
     * If using `others` scope, no `SIGNED_OUT` event is fired!
     */
    async signOut(options = { scope: "global" }) {
      await this.initializePromise;
      return await this._acquireLock(this.lockAcquireTimeout, async () => {
        return await this._signOut(options);
      });
    }
    async _signOut({ scope } = { scope: "global" }) {
      return await this._useSession(async (result) => {
        var _a;
        const { data, error: sessionError } = result;
        if (sessionError && !isAuthSessionMissingError(sessionError)) {
          return this._returnResult({ error: sessionError });
        }
        const accessToken = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token;
        if (accessToken) {
          const { error } = await this.admin.signOut(accessToken, scope);
          if (error) {
            if (!(isAuthApiError(error) && (error.status === 404 || error.status === 401 || error.status === 403) || isAuthSessionMissingError(error))) {
              return this._returnResult({ error });
            }
          }
        }
        if (scope !== "others") {
          await this._removeSession();
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        }
        return this._returnResult({ error: null });
      });
    }
    onAuthStateChange(callback) {
      const id = generateCallbackId();
      const subscription = {
        id,
        callback,
        unsubscribe: () => {
          this._debug("#unsubscribe()", "state change callback with id removed", id);
          this.stateChangeEmitters.delete(id);
        }
      };
      this._debug("#onAuthStateChange()", "registered callback with id", id);
      this.stateChangeEmitters.set(id, subscription);
      (async () => {
        await this.initializePromise;
        await this._acquireLock(this.lockAcquireTimeout, async () => {
          this._emitInitialSession(id);
        });
      })();
      return { data: { subscription } };
    }
    async _emitInitialSession(id) {
      return await this._useSession(async (result) => {
        var _a, _b;
        try {
          const { data: { session }, error } = result;
          if (error)
            throw error;
          await ((_a = this.stateChangeEmitters.get(id)) === null || _a === void 0 ? void 0 : _a.callback("INITIAL_SESSION", session));
          this._debug("INITIAL_SESSION", "callback id", id, "session", session);
        } catch (err) {
          await ((_b = this.stateChangeEmitters.get(id)) === null || _b === void 0 ? void 0 : _b.callback("INITIAL_SESSION", null));
          this._debug("INITIAL_SESSION", "callback id", id, "error", err);
          console.error(err);
        }
      });
    }
    /**
     * Sends a password reset request to an email address. This method supports the PKCE flow.
     *
     * @param email The email address of the user.
     * @param options.redirectTo The URL to send the user to after they click the password reset link.
     * @param options.captchaToken Verification token received when the user completes the captcha on the site.
     */
    async resetPasswordForEmail(email, options = {}) {
      let codeChallenge = null;
      let codeChallengeMethod = null;
      if (this.flowType === "pkce") {
        ;
        [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
          this.storage,
          this.storageKey,
          true
          // isPasswordRecovery
        );
      }
      try {
        return await _request(this.fetch, "POST", `${this.url}/recover`, {
          body: {
            email,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            gotrue_meta_security: { captcha_token: options.captchaToken }
          },
          headers: this.headers,
          redirectTo: options.redirectTo
        });
      } catch (error) {
        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Gets all the identities linked to a user.
     */
    async getUserIdentities() {
      var _a;
      try {
        const { data, error } = await this.getUser();
        if (error)
          throw error;
        return this._returnResult({ data: { identities: (_a = data.user.identities) !== null && _a !== void 0 ? _a : [] }, error: null });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    async linkIdentity(credentials) {
      if ("token" in credentials) {
        return this.linkIdentityIdToken(credentials);
      }
      return this.linkIdentityOAuth(credentials);
    }
    async linkIdentityOAuth(credentials) {
      var _a;
      try {
        const { data, error } = await this._useSession(async (result) => {
          var _a2, _b, _c, _d, _e;
          const { data: data2, error: error2 } = result;
          if (error2)
            throw error2;
          const url = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, credentials.provider, {
            redirectTo: (_a2 = credentials.options) === null || _a2 === void 0 ? void 0 : _a2.redirectTo,
            scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
            queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
            skipBrowserRedirect: true
          });
          return await _request(this.fetch, "GET", url, {
            headers: this.headers,
            jwt: (_e = (_d = data2.session) === null || _d === void 0 ? void 0 : _d.access_token) !== null && _e !== void 0 ? _e : void 0
          });
        });
        if (error)
          throw error;
        if (isBrowser() && !((_a = credentials.options) === null || _a === void 0 ? void 0 : _a.skipBrowserRedirect)) {
          window.location.assign(data === null || data === void 0 ? void 0 : data.url);
        }
        return this._returnResult({
          data: { provider: credentials.provider, url: data === null || data === void 0 ? void 0 : data.url },
          error: null
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: { provider: credentials.provider, url: null }, error });
        }
        throw error;
      }
    }
    async linkIdentityIdToken(credentials) {
      return await this._useSession(async (result) => {
        var _a;
        try {
          const { error: sessionError, data: { session } } = result;
          if (sessionError)
            throw sessionError;
          const { options, provider, token, access_token, nonce } = credentials;
          const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
            headers: this.headers,
            jwt: (_a = session === null || session === void 0 ? void 0 : session.access_token) !== null && _a !== void 0 ? _a : void 0,
            body: {
              provider,
              id_token: token,
              access_token,
              nonce,
              link_identity: true,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponse
          });
          const { data, error } = res;
          if (error) {
            return this._returnResult({ data: { user: null, session: null }, error });
          } else if (!data || !data.session || !data.user) {
            return this._returnResult({
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            });
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("USER_UPDATED", data.session);
          }
          return this._returnResult({ data, error });
        } catch (error) {
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          if (isAuthError(error)) {
            return this._returnResult({ data: { user: null, session: null }, error });
          }
          throw error;
        }
      });
    }
    /**
     * Unlinks an identity from a user by deleting it. The user will no longer be able to sign in with that identity once it's unlinked.
     */
    async unlinkIdentity(identity) {
      try {
        return await this._useSession(async (result) => {
          var _a, _b;
          const { data, error } = result;
          if (error) {
            throw error;
          }
          return await _request(this.fetch, "DELETE", `${this.url}/user/identities/${identity.identity_id}`, {
            headers: this.headers,
            jwt: (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : void 0
          });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Generates a new JWT.
     * @param refreshToken A valid refresh token that was returned on login.
     */
    async _refreshAccessToken(refreshToken) {
      const debugName = `#_refreshAccessToken(${refreshToken.substring(0, 5)}...)`;
      this._debug(debugName, "begin");
      try {
        const startedAt = Date.now();
        return await retryable(async (attempt) => {
          if (attempt > 0) {
            await sleep(200 * Math.pow(2, attempt - 1));
          }
          this._debug(debugName, "refreshing attempt", attempt);
          return await _request(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, {
            body: { refresh_token: refreshToken },
            headers: this.headers,
            xform: _sessionResponse
          });
        }, (attempt, error) => {
          const nextBackOffInterval = 200 * Math.pow(2, attempt);
          return error && isAuthRetryableFetchError(error) && // retryable only if the request can be sent before the backoff overflows the tick duration
          Date.now() + nextBackOffInterval - startedAt < AUTO_REFRESH_TICK_DURATION_MS;
        });
      } catch (error) {
        this._debug(debugName, "error", error);
        if (isAuthError(error)) {
          return this._returnResult({ data: { session: null, user: null }, error });
        }
        throw error;
      } finally {
        this._debug(debugName, "end");
      }
    }
    _isValidSession(maybeSession) {
      const isValidSession = typeof maybeSession === "object" && maybeSession !== null && "access_token" in maybeSession && "refresh_token" in maybeSession && "expires_at" in maybeSession;
      return isValidSession;
    }
    async _handleProviderSignIn(provider, options) {
      const url = await this._getUrlForProvider(`${this.url}/authorize`, provider, {
        redirectTo: options.redirectTo,
        scopes: options.scopes,
        queryParams: options.queryParams
      });
      this._debug("#_handleProviderSignIn()", "provider", provider, "options", options, "url", url);
      if (isBrowser() && !options.skipBrowserRedirect) {
        window.location.assign(url);
      }
      return { data: { provider, url }, error: null };
    }
    /**
     * Recovers the session from LocalStorage and refreshes the token
     * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
     */
    async _recoverAndRefresh() {
      var _a, _b;
      const debugName = "#_recoverAndRefresh()";
      this._debug(debugName, "begin");
      try {
        const currentSession = await getItemAsync(this.storage, this.storageKey);
        if (currentSession && this.userStorage) {
          let maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
          if (!this.storage.isServer && Object.is(this.storage, this.userStorage) && !maybeUser) {
            maybeUser = { user: currentSession.user };
            await setItemAsync(this.userStorage, this.storageKey + "-user", maybeUser);
          }
          currentSession.user = (_a = maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) !== null && _a !== void 0 ? _a : userNotAvailableProxy();
        } else if (currentSession && !currentSession.user) {
          if (!currentSession.user) {
            const separateUser = await getItemAsync(this.storage, this.storageKey + "-user");
            if (separateUser && (separateUser === null || separateUser === void 0 ? void 0 : separateUser.user)) {
              currentSession.user = separateUser.user;
              await removeItemAsync(this.storage, this.storageKey + "-user");
              await setItemAsync(this.storage, this.storageKey, currentSession);
            } else {
              currentSession.user = userNotAvailableProxy();
            }
          }
        }
        this._debug(debugName, "session from storage", currentSession);
        if (!this._isValidSession(currentSession)) {
          this._debug(debugName, "session is not valid");
          if (currentSession !== null) {
            await this._removeSession();
          }
          return;
        }
        const expiresWithMargin = ((_b = currentSession.expires_at) !== null && _b !== void 0 ? _b : Infinity) * 1e3 - Date.now() < EXPIRY_MARGIN_MS;
        this._debug(debugName, `session has${expiresWithMargin ? "" : " not"} expired with margin of ${EXPIRY_MARGIN_MS}s`);
        if (expiresWithMargin) {
          if (this.autoRefreshToken && currentSession.refresh_token) {
            const { error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              console.error(error);
              if (!isAuthRetryableFetchError(error)) {
                this._debug(debugName, "refresh failed with a non-retryable error, removing the session", error);
                await this._removeSession();
              }
            }
          }
        } else if (currentSession.user && currentSession.user.__isUserNotAvailableProxy === true) {
          try {
            const { data, error: userError } = await this._getUser(currentSession.access_token);
            if (!userError && (data === null || data === void 0 ? void 0 : data.user)) {
              currentSession.user = data.user;
              await this._saveSession(currentSession);
              await this._notifyAllSubscribers("SIGNED_IN", currentSession);
            } else {
              this._debug(debugName, "could not get user data, skipping SIGNED_IN notification");
            }
          } catch (getUserError) {
            console.error("Error getting user data:", getUserError);
            this._debug(debugName, "error getting user data, skipping SIGNED_IN notification", getUserError);
          }
        } else {
          await this._notifyAllSubscribers("SIGNED_IN", currentSession);
        }
      } catch (err) {
        this._debug(debugName, "error", err);
        console.error(err);
        return;
      } finally {
        this._debug(debugName, "end");
      }
    }
    async _callRefreshToken(refreshToken) {
      var _a, _b;
      if (!refreshToken) {
        throw new AuthSessionMissingError();
      }
      if (this.refreshingDeferred) {
        return this.refreshingDeferred.promise;
      }
      const debugName = `#_callRefreshToken(${refreshToken.substring(0, 5)}...)`;
      this._debug(debugName, "begin");
      try {
        this.refreshingDeferred = new Deferred();
        const { data, error } = await this._refreshAccessToken(refreshToken);
        if (error)
          throw error;
        if (!data.session)
          throw new AuthSessionMissingError();
        await this._saveSession(data.session);
        await this._notifyAllSubscribers("TOKEN_REFRESHED", data.session);
        const result = { data: data.session, error: null };
        this.refreshingDeferred.resolve(result);
        return result;
      } catch (error) {
        this._debug(debugName, "error", error);
        if (isAuthError(error)) {
          const result = { data: null, error };
          if (!isAuthRetryableFetchError(error)) {
            await this._removeSession();
          }
          (_a = this.refreshingDeferred) === null || _a === void 0 ? void 0 : _a.resolve(result);
          return result;
        }
        (_b = this.refreshingDeferred) === null || _b === void 0 ? void 0 : _b.reject(error);
        throw error;
      } finally {
        this.refreshingDeferred = null;
        this._debug(debugName, "end");
      }
    }
    async _notifyAllSubscribers(event, session, broadcast = true) {
      const debugName = `#_notifyAllSubscribers(${event})`;
      this._debug(debugName, "begin", session, `broadcast = ${broadcast}`);
      try {
        if (this.broadcastChannel && broadcast) {
          this.broadcastChannel.postMessage({ event, session });
        }
        const errors = [];
        const promises = Array.from(this.stateChangeEmitters.values()).map(async (x) => {
          try {
            await x.callback(event, session);
          } catch (e) {
            errors.push(e);
          }
        });
        await Promise.all(promises);
        if (errors.length > 0) {
          for (let i = 0; i < errors.length; i += 1) {
            console.error(errors[i]);
          }
          throw errors[0];
        }
      } finally {
        this._debug(debugName, "end");
      }
    }
    /**
     * set currentSession and currentUser
     * process to _startAutoRefreshToken if possible
     */
    async _saveSession(session) {
      this._debug("#_saveSession()", session);
      this.suppressGetSessionWarning = true;
      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
      const sessionToProcess = Object.assign({}, session);
      const userIsProxy = sessionToProcess.user && sessionToProcess.user.__isUserNotAvailableProxy === true;
      if (this.userStorage) {
        if (!userIsProxy && sessionToProcess.user) {
          await setItemAsync(this.userStorage, this.storageKey + "-user", {
            user: sessionToProcess.user
          });
        } else if (userIsProxy) {
        }
        const mainSessionData = Object.assign({}, sessionToProcess);
        delete mainSessionData.user;
        const clonedMainSessionData = deepClone(mainSessionData);
        await setItemAsync(this.storage, this.storageKey, clonedMainSessionData);
      } else {
        const clonedSession = deepClone(sessionToProcess);
        await setItemAsync(this.storage, this.storageKey, clonedSession);
      }
    }
    async _removeSession() {
      this._debug("#_removeSession()");
      this.suppressGetSessionWarning = false;
      await removeItemAsync(this.storage, this.storageKey);
      await removeItemAsync(this.storage, this.storageKey + "-code-verifier");
      await removeItemAsync(this.storage, this.storageKey + "-user");
      if (this.userStorage) {
        await removeItemAsync(this.userStorage, this.storageKey + "-user");
      }
      await this._notifyAllSubscribers("SIGNED_OUT", null);
    }
    /**
     * Removes any registered visibilitychange callback.
     *
     * {@see #startAutoRefresh}
     * {@see #stopAutoRefresh}
     */
    _removeVisibilityChangedCallback() {
      this._debug("#_removeVisibilityChangedCallback()");
      const callback = this.visibilityChangedCallback;
      this.visibilityChangedCallback = null;
      try {
        if (callback && isBrowser() && (window === null || window === void 0 ? void 0 : window.removeEventListener)) {
          window.removeEventListener("visibilitychange", callback);
        }
      } catch (e) {
        console.error("removing visibilitychange callback failed", e);
      }
    }
    /**
     * This is the private implementation of {@link #startAutoRefresh}. Use this
     * within the library.
     */
    async _startAutoRefresh() {
      await this._stopAutoRefresh();
      this._debug("#_startAutoRefresh()");
      const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS);
      this.autoRefreshTicker = ticker;
      if (ticker && typeof ticker === "object" && typeof ticker.unref === "function") {
        ticker.unref();
      } else if (typeof Deno !== "undefined" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(ticker);
      }
      const timeout = setTimeout(async () => {
        await this.initializePromise;
        await this._autoRefreshTokenTick();
      }, 0);
      this.autoRefreshTickTimeout = timeout;
      if (timeout && typeof timeout === "object" && typeof timeout.unref === "function") {
        timeout.unref();
      } else if (typeof Deno !== "undefined" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timeout);
      }
    }
    /**
     * This is the private implementation of {@link #stopAutoRefresh}. Use this
     * within the library.
     */
    async _stopAutoRefresh() {
      this._debug("#_stopAutoRefresh()");
      const ticker = this.autoRefreshTicker;
      this.autoRefreshTicker = null;
      if (ticker) {
        clearInterval(ticker);
      }
      const timeout = this.autoRefreshTickTimeout;
      this.autoRefreshTickTimeout = null;
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    /**
     * Starts an auto-refresh process in the background. The session is checked
     * every few seconds. Close to the time of expiration a process is started to
     * refresh the session. If refreshing fails it will be retried for as long as
     * necessary.
     *
     * If you set the {@link GoTrueClientOptions#autoRefreshToken} you don't need
     * to call this function, it will be called for you.
     *
     * On browsers the refresh process works only when the tab/window is in the
     * foreground to conserve resources as well as prevent race conditions and
     * flooding auth with requests. If you call this method any managed
     * visibility change callback will be removed and you must manage visibility
     * changes on your own.
     *
     * On non-browser platforms the refresh process works *continuously* in the
     * background, which may not be desirable. You should hook into your
     * platform's foreground indication mechanism and call these methods
     * appropriately to conserve resources.
     *
     * {@see #stopAutoRefresh}
     */
    async startAutoRefresh() {
      this._removeVisibilityChangedCallback();
      await this._startAutoRefresh();
    }
    /**
     * Stops an active auto refresh process running in the background (if any).
     *
     * If you call this method any managed visibility change callback will be
     * removed and you must manage visibility changes on your own.
     *
     * See {@link #startAutoRefresh} for more details.
     */
    async stopAutoRefresh() {
      this._removeVisibilityChangedCallback();
      await this._stopAutoRefresh();
    }
    /**
     * Runs the auto refresh token tick.
     */
    async _autoRefreshTokenTick() {
      this._debug("#_autoRefreshTokenTick()", "begin");
      try {
        await this._acquireLock(0, async () => {
          try {
            const now = Date.now();
            try {
              return await this._useSession(async (result) => {
                const { data: { session } } = result;
                if (!session || !session.refresh_token || !session.expires_at) {
                  this._debug("#_autoRefreshTokenTick()", "no session");
                  return;
                }
                const expiresInTicks = Math.floor((session.expires_at * 1e3 - now) / AUTO_REFRESH_TICK_DURATION_MS);
                this._debug("#_autoRefreshTokenTick()", `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`);
                if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
                  await this._callRefreshToken(session.refresh_token);
                }
              });
            } catch (e) {
              console.error("Auto refresh tick failed with error. This is likely a transient error.", e);
            }
          } finally {
            this._debug("#_autoRefreshTokenTick()", "end");
          }
        });
      } catch (e) {
        if (e.isAcquireTimeout || e instanceof LockAcquireTimeoutError) {
          this._debug("auto refresh token tick lock not available");
        } else {
          throw e;
        }
      }
    }
    /**
     * Registers callbacks on the browser / platform, which in-turn run
     * algorithms when the browser window/tab are in foreground. On non-browser
     * platforms it assumes always foreground.
     */
    async _handleVisibilityChange() {
      this._debug("#_handleVisibilityChange()");
      if (!isBrowser() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
        if (this.autoRefreshToken) {
          this.startAutoRefresh();
        }
        return false;
      }
      try {
        this.visibilityChangedCallback = async () => {
          try {
            await this._onVisibilityChanged(false);
          } catch (error) {
            this._debug("#visibilityChangedCallback", "error", error);
          }
        };
        window === null || window === void 0 ? void 0 : window.addEventListener("visibilitychange", this.visibilityChangedCallback);
        await this._onVisibilityChanged(true);
      } catch (error) {
        console.error("_handleVisibilityChange", error);
      }
    }
    /**
     * Callback registered with `window.addEventListener('visibilitychange')`.
     */
    async _onVisibilityChanged(calledFromInitialize) {
      const methodName = `#_onVisibilityChanged(${calledFromInitialize})`;
      this._debug(methodName, "visibilityState", document.visibilityState);
      if (document.visibilityState === "visible") {
        if (this.autoRefreshToken) {
          this._startAutoRefresh();
        }
        if (!calledFromInitialize) {
          await this.initializePromise;
          await this._acquireLock(this.lockAcquireTimeout, async () => {
            if (document.visibilityState !== "visible") {
              this._debug(methodName, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting");
              return;
            }
            await this._recoverAndRefresh();
          });
        }
      } else if (document.visibilityState === "hidden") {
        if (this.autoRefreshToken) {
          this._stopAutoRefresh();
        }
      }
    }
    /**
     * Generates the relevant login URL for a third-party provider.
     * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
     * @param options.scopes A space-separated list of scopes granted to the OAuth application.
     * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
     */
    async _getUrlForProvider(url, provider, options) {
      const urlParams = [`provider=${encodeURIComponent(provider)}`];
      if (options === null || options === void 0 ? void 0 : options.redirectTo) {
        urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`);
      }
      if (options === null || options === void 0 ? void 0 : options.scopes) {
        urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`);
      }
      if (this.flowType === "pkce") {
        const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
        const flowParams = new URLSearchParams({
          code_challenge: `${encodeURIComponent(codeChallenge)}`,
          code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`
        });
        urlParams.push(flowParams.toString());
      }
      if (options === null || options === void 0 ? void 0 : options.queryParams) {
        const query = new URLSearchParams(options.queryParams);
        urlParams.push(query.toString());
      }
      if (options === null || options === void 0 ? void 0 : options.skipBrowserRedirect) {
        urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`);
      }
      return `${url}?${urlParams.join("&")}`;
    }
    async _unenroll(params) {
      try {
        return await this._useSession(async (result) => {
          var _a;
          const { data: sessionData, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          return await _request(this.fetch, "DELETE", `${this.url}/factors/${params.factorId}`, {
            headers: this.headers,
            jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
          });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    async _enroll(params) {
      try {
        return await this._useSession(async (result) => {
          var _a, _b;
          const { data: sessionData, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          const body = Object.assign({ friendly_name: params.friendlyName, factor_type: params.factorType }, params.factorType === "phone" ? { phone: params.phone } : params.factorType === "totp" ? { issuer: params.issuer } : {});
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors`, {
            body,
            headers: this.headers,
            jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
          });
          if (error) {
            return this._returnResult({ data: null, error });
          }
          if (params.factorType === "totp" && data.type === "totp" && ((_b = data === null || data === void 0 ? void 0 : data.totp) === null || _b === void 0 ? void 0 : _b.qr_code)) {
            data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`;
          }
          return this._returnResult({ data, error: null });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    async _verify(params) {
      return this._acquireLock(this.lockAcquireTimeout, async () => {
        try {
          return await this._useSession(async (result) => {
            var _a;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return this._returnResult({ data: null, error: sessionError });
            }
            const body = Object.assign({ challenge_id: params.challengeId }, "webauthn" in params ? {
              webauthn: Object.assign(Object.assign({}, params.webauthn), { credential_response: params.webauthn.type === "create" ? serializeCredentialCreationResponse(params.webauthn.credential_response) : serializeCredentialRequestResponse(params.webauthn.credential_response) })
            } : { code: params.code });
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/verify`, {
              body,
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
            if (error) {
              return this._returnResult({ data: null, error });
            }
            await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + data.expires_in }, data));
            await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", data);
            return this._returnResult({ data, error });
          });
        } catch (error) {
          if (isAuthError(error)) {
            return this._returnResult({ data: null, error });
          }
          throw error;
        }
      });
    }
    async _challenge(params) {
      return this._acquireLock(this.lockAcquireTimeout, async () => {
        try {
          return await this._useSession(async (result) => {
            var _a;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return this._returnResult({ data: null, error: sessionError });
            }
            const response = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/challenge`, {
              body: params,
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
            if (response.error) {
              return response;
            }
            const { data } = response;
            if (data.type !== "webauthn") {
              return { data, error: null };
            }
            switch (data.webauthn.type) {
              case "create":
                return {
                  data: Object.assign(Object.assign({}, data), { webauthn: Object.assign(Object.assign({}, data.webauthn), { credential_options: Object.assign(Object.assign({}, data.webauthn.credential_options), { publicKey: deserializeCredentialCreationOptions(data.webauthn.credential_options.publicKey) }) }) }),
                  error: null
                };
              case "request":
                return {
                  data: Object.assign(Object.assign({}, data), { webauthn: Object.assign(Object.assign({}, data.webauthn), { credential_options: Object.assign(Object.assign({}, data.webauthn.credential_options), { publicKey: deserializeCredentialRequestOptions(data.webauthn.credential_options.publicKey) }) }) }),
                  error: null
                };
            }
          });
        } catch (error) {
          if (isAuthError(error)) {
            return this._returnResult({ data: null, error });
          }
          throw error;
        }
      });
    }
    /**
     * {@see GoTrueMFAApi#challengeAndVerify}
     */
    async _challengeAndVerify(params) {
      const { data: challengeData, error: challengeError } = await this._challenge({
        factorId: params.factorId
      });
      if (challengeError) {
        return this._returnResult({ data: null, error: challengeError });
      }
      return await this._verify({
        factorId: params.factorId,
        challengeId: challengeData.id,
        code: params.code
      });
    }
    /**
     * {@see GoTrueMFAApi#listFactors}
     */
    async _listFactors() {
      var _a;
      const { data: { user }, error: userError } = await this.getUser();
      if (userError) {
        return { data: null, error: userError };
      }
      const data = {
        all: [],
        phone: [],
        totp: [],
        webauthn: []
      };
      for (const factor of (_a = user === null || user === void 0 ? void 0 : user.factors) !== null && _a !== void 0 ? _a : []) {
        data.all.push(factor);
        if (factor.status === "verified") {
          ;
          data[factor.factor_type].push(factor);
        }
      }
      return {
        data,
        error: null
      };
    }
    /**
     * {@see GoTrueMFAApi#getAuthenticatorAssuranceLevel}
     */
    async _getAuthenticatorAssuranceLevel(jwt) {
      var _a, _b, _c, _d;
      if (jwt) {
        try {
          const { payload: payload2 } = decodeJWT(jwt);
          let currentLevel2 = null;
          if (payload2.aal) {
            currentLevel2 = payload2.aal;
          }
          let nextLevel2 = currentLevel2;
          const { data: { user }, error: userError } = await this.getUser(jwt);
          if (userError) {
            return this._returnResult({ data: null, error: userError });
          }
          const verifiedFactors2 = (_b = (_a = user === null || user === void 0 ? void 0 : user.factors) === null || _a === void 0 ? void 0 : _a.filter((factor) => factor.status === "verified")) !== null && _b !== void 0 ? _b : [];
          if (verifiedFactors2.length > 0) {
            nextLevel2 = "aal2";
          }
          const currentAuthenticationMethods2 = payload2.amr || [];
          return { data: { currentLevel: currentLevel2, nextLevel: nextLevel2, currentAuthenticationMethods: currentAuthenticationMethods2 }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return this._returnResult({ data: null, error });
          }
          throw error;
        }
      }
      const { data: { session }, error: sessionError } = await this.getSession();
      if (sessionError) {
        return this._returnResult({ data: null, error: sessionError });
      }
      if (!session) {
        return {
          data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
          error: null
        };
      }
      const { payload } = decodeJWT(session.access_token);
      let currentLevel = null;
      if (payload.aal) {
        currentLevel = payload.aal;
      }
      let nextLevel = currentLevel;
      const verifiedFactors = (_d = (_c = session.user.factors) === null || _c === void 0 ? void 0 : _c.filter((factor) => factor.status === "verified")) !== null && _d !== void 0 ? _d : [];
      if (verifiedFactors.length > 0) {
        nextLevel = "aal2";
      }
      const currentAuthenticationMethods = payload.amr || [];
      return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null };
    }
    /**
     * Retrieves details about an OAuth authorization request.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     *
     * Returns authorization details including client info, scopes, and user information.
     * If the response includes only a redirect_url field, it means consent was already given - the caller
     * should handle the redirect manually if needed.
     */
    async _getAuthorizationDetails(authorizationId) {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          if (!session) {
            return this._returnResult({ data: null, error: new AuthSessionMissingError() });
          }
          return await _request(this.fetch, "GET", `${this.url}/oauth/authorizations/${authorizationId}`, {
            headers: this.headers,
            jwt: session.access_token,
            xform: (data) => ({ data, error: null })
          });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Approves an OAuth authorization request.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     */
    async _approveAuthorization(authorizationId, options) {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          if (!session) {
            return this._returnResult({ data: null, error: new AuthSessionMissingError() });
          }
          const response = await _request(this.fetch, "POST", `${this.url}/oauth/authorizations/${authorizationId}/consent`, {
            headers: this.headers,
            jwt: session.access_token,
            body: { action: "approve" },
            xform: (data) => ({ data, error: null })
          });
          if (response.data && response.data.redirect_url) {
            if (isBrowser() && !(options === null || options === void 0 ? void 0 : options.skipBrowserRedirect)) {
              window.location.assign(response.data.redirect_url);
            }
          }
          return response;
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Denies an OAuth authorization request.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     */
    async _denyAuthorization(authorizationId, options) {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          if (!session) {
            return this._returnResult({ data: null, error: new AuthSessionMissingError() });
          }
          const response = await _request(this.fetch, "POST", `${this.url}/oauth/authorizations/${authorizationId}/consent`, {
            headers: this.headers,
            jwt: session.access_token,
            body: { action: "deny" },
            xform: (data) => ({ data, error: null })
          });
          if (response.data && response.data.redirect_url) {
            if (isBrowser() && !(options === null || options === void 0 ? void 0 : options.skipBrowserRedirect)) {
              window.location.assign(response.data.redirect_url);
            }
          }
          return response;
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Lists all OAuth grants that the authenticated user has authorized.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     */
    async _listOAuthGrants() {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          if (!session) {
            return this._returnResult({ data: null, error: new AuthSessionMissingError() });
          }
          return await _request(this.fetch, "GET", `${this.url}/user/oauth/grants`, {
            headers: this.headers,
            jwt: session.access_token,
            xform: (data) => ({ data, error: null })
          });
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    /**
     * Revokes a user's OAuth grant for a specific client.
     * Only relevant when the OAuth 2.1 server is enabled in Supabase Auth.
     */
    async _revokeOAuthGrant(options) {
      try {
        return await this._useSession(async (result) => {
          const { data: { session }, error: sessionError } = result;
          if (sessionError) {
            return this._returnResult({ data: null, error: sessionError });
          }
          if (!session) {
            return this._returnResult({ data: null, error: new AuthSessionMissingError() });
          }
          await _request(this.fetch, "DELETE", `${this.url}/user/oauth/grants`, {
            headers: this.headers,
            jwt: session.access_token,
            query: { client_id: options.clientId },
            noResolveJson: true
          });
          return { data: {}, error: null };
        });
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
    async fetchJwk(kid, jwks = { keys: [] }) {
      let jwk = jwks.keys.find((key) => key.kid === kid);
      if (jwk) {
        return jwk;
      }
      const now = Date.now();
      jwk = this.jwks.keys.find((key) => key.kid === kid);
      if (jwk && this.jwks_cached_at + JWKS_TTL > now) {
        return jwk;
      }
      const { data, error } = await _request(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, {
        headers: this.headers
      });
      if (error) {
        throw error;
      }
      if (!data.keys || data.keys.length === 0) {
        return null;
      }
      this.jwks = data;
      this.jwks_cached_at = now;
      jwk = data.keys.find((key) => key.kid === kid);
      if (!jwk) {
        return null;
      }
      return jwk;
    }
    /**
     * Extracts the JWT claims present in the access token by first verifying the
     * JWT against the server's JSON Web Key Set endpoint
     * `/.well-known/jwks.json` which is often cached, resulting in significantly
     * faster responses. Prefer this method over {@link #getUser} which always
     * sends a request to the Auth server for each JWT.
     *
     * If the project is not using an asymmetric JWT signing key (like ECC or
     * RSA) it always sends a request to the Auth server (similar to {@link
     * #getUser}) to verify the JWT.
     *
     * @param jwt An optional specific JWT you wish to verify, not the one you
     *            can obtain from {@link #getSession}.
     * @param options Various additional options that allow you to customize the
     *                behavior of this method.
     */
    async getClaims(jwt, options = {}) {
      try {
        let token = jwt;
        if (!token) {
          const { data, error } = await this.getSession();
          if (error || !data.session) {
            return this._returnResult({ data: null, error });
          }
          token = data.session.access_token;
        }
        const { header, payload, signature, raw: { header: rawHeader, payload: rawPayload } } = decodeJWT(token);
        if (!(options === null || options === void 0 ? void 0 : options.allowExpired)) {
          validateExp(payload.exp);
        }
        const signingKey = !header.alg || header.alg.startsWith("HS") || !header.kid || !("crypto" in globalThis && "subtle" in globalThis.crypto) ? null : await this.fetchJwk(header.kid, (options === null || options === void 0 ? void 0 : options.keys) ? { keys: options.keys } : options === null || options === void 0 ? void 0 : options.jwks);
        if (!signingKey) {
          const { error } = await this.getUser(token);
          if (error) {
            throw error;
          }
          return {
            data: {
              claims: payload,
              header,
              signature
            },
            error: null
          };
        }
        const algorithm = getAlgorithm(header.alg);
        const publicKey = await crypto.subtle.importKey("jwk", signingKey, algorithm, true, [
          "verify"
        ]);
        const isValid = await crypto.subtle.verify(algorithm, publicKey, signature, stringToUint8Array(`${rawHeader}.${rawPayload}`));
        if (!isValid) {
          throw new AuthInvalidJwtError("Invalid JWT signature");
        }
        return {
          data: {
            claims: payload,
            header,
            signature
          },
          error: null
        };
      } catch (error) {
        if (isAuthError(error)) {
          return this._returnResult({ data: null, error });
        }
        throw error;
      }
    }
  };
  GoTrueClient.nextInstanceID = {};
  var GoTrueClient_default = GoTrueClient;

  // node_modules/@supabase/auth-js/dist/module/AuthClient.js
  var AuthClient = GoTrueClient_default;
  var AuthClient_default = AuthClient;

  // node_modules/@supabase/supabase-js/dist/index.mjs
  var version4 = "2.98.0";
  var JS_ENV = "";
  if (typeof Deno !== "undefined") JS_ENV = "deno";
  else if (typeof document !== "undefined") JS_ENV = "web";
  else if (typeof navigator !== "undefined" && navigator.product === "ReactNative") JS_ENV = "react-native";
  else JS_ENV = "node";
  var DEFAULT_HEADERS3 = { "X-Client-Info": `supabase-js-${JS_ENV}/${version4}` };
  var DEFAULT_GLOBAL_OPTIONS = { headers: DEFAULT_HEADERS3 };
  var DEFAULT_DB_OPTIONS = { schema: "public" };
  var DEFAULT_AUTH_OPTIONS = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "implicit"
  };
  var DEFAULT_REALTIME_OPTIONS = {};
  function _typeof3(o) {
    "@babel/helpers - typeof";
    return _typeof3 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
      return typeof o$1;
    } : function(o$1) {
      return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
    }, _typeof3(o);
  }
  function toPrimitive3(t, r) {
    if ("object" != _typeof3(t) || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != _typeof3(i)) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function toPropertyKey3(t) {
    var i = toPrimitive3(t, "string");
    return "symbol" == _typeof3(i) ? i : i + "";
  }
  function _defineProperty3(e, r, t) {
    return (r = toPropertyKey3(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys3(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r$1) {
        return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread23(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys3(Object(t), true).forEach(function(r$1) {
        _defineProperty3(e, r$1, t[r$1]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys3(Object(t)).forEach(function(r$1) {
        Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
      });
    }
    return e;
  }
  var resolveFetch4 = (customFetch) => {
    if (customFetch) return (...args) => customFetch(...args);
    return (...args) => fetch(...args);
  };
  var resolveHeadersConstructor = () => {
    return Headers;
  };
  var fetchWithAuth = (supabaseKey, getAccessToken, customFetch) => {
    const fetch$1 = resolveFetch4(customFetch);
    const HeadersConstructor = resolveHeadersConstructor();
    return async (input, init) => {
      var _await$getAccessToken;
      const accessToken = (_await$getAccessToken = await getAccessToken()) !== null && _await$getAccessToken !== void 0 ? _await$getAccessToken : supabaseKey;
      let headers = new HeadersConstructor(init === null || init === void 0 ? void 0 : init.headers);
      if (!headers.has("apikey")) headers.set("apikey", supabaseKey);
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch$1(input, _objectSpread23(_objectSpread23({}, init), {}, { headers }));
    };
  };
  function ensureTrailingSlash(url) {
    return url.endsWith("/") ? url : url + "/";
  }
  function applySettingDefaults(options, defaults) {
    var _DEFAULT_GLOBAL_OPTIO, _globalOptions$header;
    const { db: dbOptions, auth: authOptions, realtime: realtimeOptions, global: globalOptions } = options;
    const { db: DEFAULT_DB_OPTIONS$1, auth: DEFAULT_AUTH_OPTIONS$1, realtime: DEFAULT_REALTIME_OPTIONS$1, global: DEFAULT_GLOBAL_OPTIONS$1 } = defaults;
    const result = {
      db: _objectSpread23(_objectSpread23({}, DEFAULT_DB_OPTIONS$1), dbOptions),
      auth: _objectSpread23(_objectSpread23({}, DEFAULT_AUTH_OPTIONS$1), authOptions),
      realtime: _objectSpread23(_objectSpread23({}, DEFAULT_REALTIME_OPTIONS$1), realtimeOptions),
      storage: {},
      global: _objectSpread23(_objectSpread23(_objectSpread23({}, DEFAULT_GLOBAL_OPTIONS$1), globalOptions), {}, { headers: _objectSpread23(_objectSpread23({}, (_DEFAULT_GLOBAL_OPTIO = DEFAULT_GLOBAL_OPTIONS$1 === null || DEFAULT_GLOBAL_OPTIONS$1 === void 0 ? void 0 : DEFAULT_GLOBAL_OPTIONS$1.headers) !== null && _DEFAULT_GLOBAL_OPTIO !== void 0 ? _DEFAULT_GLOBAL_OPTIO : {}), (_globalOptions$header = globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.headers) !== null && _globalOptions$header !== void 0 ? _globalOptions$header : {}) }),
      accessToken: async () => ""
    };
    if (options.accessToken) result.accessToken = options.accessToken;
    else delete result.accessToken;
    return result;
  }
  function validateSupabaseUrl(supabaseUrl) {
    const trimmedUrl = supabaseUrl === null || supabaseUrl === void 0 ? void 0 : supabaseUrl.trim();
    if (!trimmedUrl) throw new Error("supabaseUrl is required.");
    if (!trimmedUrl.match(/^https?:\/\//i)) throw new Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
    try {
      return new URL(ensureTrailingSlash(trimmedUrl));
    } catch (_unused) {
      throw Error("Invalid supabaseUrl: Provided URL is malformed.");
    }
  }
  var SupabaseAuthClient = class extends AuthClient_default {
    constructor(options) {
      super(options);
    }
  };
  var SupabaseClient = class {
    /**
    * Create a new client for use in the browser.
    * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
    * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
    * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
    * @param options.auth.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
    * @param options.auth.persistSession Set to "true" if you want to automatically save the user session into local storage.
    * @param options.auth.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
    * @param options.realtime Options passed along to realtime-js constructor.
    * @param options.storage Options passed along to the storage-js constructor.
    * @param options.global.fetch A custom fetch implementation.
    * @param options.global.headers Any additional headers to send with each network request.
    * @example
    * ```ts
    * import { createClient } from '@supabase/supabase-js'
    *
    * const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')
    * const { data } = await supabase.from('profiles').select('*')
    * ```
    */
    constructor(supabaseUrl, supabaseKey, options) {
      var _settings$auth$storag, _settings$global$head;
      this.supabaseUrl = supabaseUrl;
      this.supabaseKey = supabaseKey;
      const baseUrl = validateSupabaseUrl(supabaseUrl);
      if (!supabaseKey) throw new Error("supabaseKey is required.");
      this.realtimeUrl = new URL("realtime/v1", baseUrl);
      this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws");
      this.authUrl = new URL("auth/v1", baseUrl);
      this.storageUrl = new URL("storage/v1", baseUrl);
      this.functionsUrl = new URL("functions/v1", baseUrl);
      const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
      const DEFAULTS = {
        db: DEFAULT_DB_OPTIONS,
        realtime: DEFAULT_REALTIME_OPTIONS,
        auth: _objectSpread23(_objectSpread23({}, DEFAULT_AUTH_OPTIONS), {}, { storageKey: defaultStorageKey }),
        global: DEFAULT_GLOBAL_OPTIONS
      };
      const settings = applySettingDefaults(options !== null && options !== void 0 ? options : {}, DEFAULTS);
      this.storageKey = (_settings$auth$storag = settings.auth.storageKey) !== null && _settings$auth$storag !== void 0 ? _settings$auth$storag : "";
      this.headers = (_settings$global$head = settings.global.headers) !== null && _settings$global$head !== void 0 ? _settings$global$head : {};
      if (!settings.accessToken) {
        var _settings$auth;
        this.auth = this._initSupabaseAuthClient((_settings$auth = settings.auth) !== null && _settings$auth !== void 0 ? _settings$auth : {}, this.headers, settings.global.fetch);
      } else {
        this.accessToken = settings.accessToken;
        this.auth = new Proxy({}, { get: (_, prop) => {
          throw new Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(prop)} is not possible`);
        } });
      }
      this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch);
      this.realtime = this._initRealtimeClient(_objectSpread23({
        headers: this.headers,
        accessToken: this._getAccessToken.bind(this)
      }, settings.realtime));
      if (this.accessToken) Promise.resolve(this.accessToken()).then((token) => this.realtime.setAuth(token)).catch((e) => console.warn("Failed to set initial Realtime auth token:", e));
      this.rest = new PostgrestClient(new URL("rest/v1", baseUrl).href, {
        headers: this.headers,
        schema: settings.db.schema,
        fetch: this.fetch,
        timeout: settings.db.timeout,
        urlLengthLimit: settings.db.urlLengthLimit
      });
      this.storage = new StorageClient(this.storageUrl.href, this.headers, this.fetch, options === null || options === void 0 ? void 0 : options.storage);
      if (!settings.accessToken) this._listenForAuthEvents();
    }
    /**
    * Supabase Functions allows you to deploy and invoke edge functions.
    */
    get functions() {
      return new FunctionsClient(this.functionsUrl.href, {
        headers: this.headers,
        customFetch: this.fetch
      });
    }
    /**
    * Perform a query on a table or a view.
    *
    * @param relation - The table or view name to query
    */
    from(relation) {
      return this.rest.from(relation);
    }
    /**
    * Select a schema to query or perform an function (rpc) call.
    *
    * The schema needs to be on the list of exposed schemas inside Supabase.
    *
    * @param schema - The schema to query
    */
    schema(schema) {
      return this.rest.schema(schema);
    }
    /**
    * Perform a function call.
    *
    * @param fn - The function name to call
    * @param args - The arguments to pass to the function call
    * @param options - Named parameters
    * @param options.head - When set to `true`, `data` will not be returned.
    * Useful if you only need the count.
    * @param options.get - When set to `true`, the function will be called with
    * read-only access mode.
    * @param options.count - Count algorithm to use to count rows returned by the
    * function. Only applicable for [set-returning
    * functions](https://www.postgresql.org/docs/current/functions-srf.html).
    *
    * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
    * hood.
    *
    * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
    * statistics under the hood.
    *
    * `"estimated"`: Uses exact count for low numbers and planned count for high
    * numbers.
    */
    rpc(fn, args = {}, options = {
      head: false,
      get: false,
      count: void 0
    }) {
      return this.rest.rpc(fn, args, options);
    }
    /**
    * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
    *
    * @param {string} name - The name of the Realtime channel.
    * @param {Object} opts - The options to pass to the Realtime channel.
    *
    */
    channel(name, opts = { config: {} }) {
      return this.realtime.channel(name, opts);
    }
    /**
    * Returns all Realtime channels.
    */
    getChannels() {
      return this.realtime.getChannels();
    }
    /**
    * Unsubscribes and removes Realtime channel from Realtime client.
    *
    * @param {RealtimeChannel} channel - The name of the Realtime channel.
    *
    */
    removeChannel(channel) {
      return this.realtime.removeChannel(channel);
    }
    /**
    * Unsubscribes and removes all Realtime channels from Realtime client.
    */
    removeAllChannels() {
      return this.realtime.removeAllChannels();
    }
    async _getAccessToken() {
      var _this = this;
      var _data$session$access_, _data$session;
      if (_this.accessToken) return await _this.accessToken();
      const { data } = await _this.auth.getSession();
      return (_data$session$access_ = (_data$session = data.session) === null || _data$session === void 0 ? void 0 : _data$session.access_token) !== null && _data$session$access_ !== void 0 ? _data$session$access_ : _this.supabaseKey;
    }
    _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, userStorage, storageKey, flowType, lock, debug, throwOnError }, headers, fetch$1) {
      const authHeaders = {
        Authorization: `Bearer ${this.supabaseKey}`,
        apikey: `${this.supabaseKey}`
      };
      return new SupabaseAuthClient({
        url: this.authUrl.href,
        headers: _objectSpread23(_objectSpread23({}, authHeaders), headers),
        storageKey,
        autoRefreshToken,
        persistSession,
        detectSessionInUrl,
        storage,
        userStorage,
        flowType,
        lock,
        debug,
        throwOnError,
        fetch: fetch$1,
        hasCustomAuthorizationHeader: Object.keys(this.headers).some((key) => key.toLowerCase() === "authorization")
      });
    }
    _initRealtimeClient(options) {
      return new RealtimeClient(this.realtimeUrl.href, _objectSpread23(_objectSpread23({}, options), {}, { params: _objectSpread23(_objectSpread23({}, { apikey: this.supabaseKey }), options === null || options === void 0 ? void 0 : options.params) }));
    }
    _listenForAuthEvents() {
      return this.auth.onAuthStateChange((event, session) => {
        this._handleTokenChanged(event, "CLIENT", session === null || session === void 0 ? void 0 : session.access_token);
      });
    }
    _handleTokenChanged(event, source, token) {
      if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && this.changedAccessToken !== token) {
        this.changedAccessToken = token;
        this.realtime.setAuth(token);
      } else if (event === "SIGNED_OUT") {
        this.realtime.setAuth();
        if (source == "STORAGE") this.auth.signOut();
        this.changedAccessToken = void 0;
      }
    }
  };
  var createClient = (supabaseUrl, supabaseKey, options) => {
    return new SupabaseClient(supabaseUrl, supabaseKey, options);
  };
  function shouldShowDeprecationWarning() {
    if (typeof window !== "undefined") return false;
    const _process = globalThis["process"];
    if (!_process) return false;
    const processVersion = _process["version"];
    if (processVersion === void 0 || processVersion === null) return false;
    const versionMatch = processVersion.match(/^v(\d+)\./);
    if (!versionMatch) return false;
    return parseInt(versionMatch[1], 10) <= 18;
  }
  if (shouldShowDeprecationWarning()) console.warn("\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217");

  // tools/blockhero-creator/default-creator-manifest.json
  var default_creator_manifest_default = {
    version: 0,
    levels: {
      "1": {
        id: "level_1",
        levelId: 1,
        worldId: 1,
        stageNumberInWorld: 1,
        name: "\u{1F33F} \uCD08\uC6D0 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 800,
        enemyTemplateId: "level_stage_1",
        enemyOverrides: {},
        reward: {
          repeatGold: 21,
          firstClearBonusGold: 25,
          characterExp: 168
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "2": {
        id: "level_2",
        levelId: 2,
        worldId: 1,
        stageNumberInWorld: 2,
        name: "\u{1F33F} \uCD08\uC6D0 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 910,
        enemyTemplateId: "level_stage_2",
        enemyOverrides: {},
        reward: {
          repeatGold: 23,
          firstClearBonusGold: 25,
          characterExp: 176
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "3": {
        id: "level_3",
        levelId: 3,
        worldId: 1,
        stageNumberInWorld: 3,
        name: "\u{1F33F} \uCD08\uC6D0 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 1021,
        enemyTemplateId: "level_stage_3",
        enemyOverrides: {},
        reward: {
          repeatGold: 24,
          firstClearBonusGold: 25,
          characterExp: 184
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "4": {
        id: "level_4",
        levelId: 4,
        worldId: 1,
        stageNumberInWorld: 4,
        name: "\u{1F33F} \uCD08\uC6D0 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 1131,
        enemyTemplateId: "level_stage_4",
        enemyOverrides: {},
        reward: {
          repeatGold: 26,
          firstClearBonusGold: 25,
          characterExp: 192
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "5": {
        id: "level_5",
        levelId: 5,
        worldId: 1,
        stageNumberInWorld: 5,
        name: "\u{1F33F} \uCD08\uC6D0 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 1241,
        enemyTemplateId: "level_stage_5",
        enemyOverrides: {},
        reward: {
          repeatGold: 27,
          firstClearBonusGold: 25,
          characterExp: 200
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "6": {
        id: "level_6",
        levelId: 6,
        worldId: 1,
        stageNumberInWorld: 6,
        name: "\u{1F33F} \uCD08\uC6D0 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 1352,
        enemyTemplateId: "level_stage_6",
        enemyOverrides: {},
        reward: {
          repeatGold: 29,
          firstClearBonusGold: 25,
          characterExp: 208
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "7": {
        id: "level_7",
        levelId: 7,
        worldId: 1,
        stageNumberInWorld: 7,
        name: "\u{1F33F} \uCD08\uC6D0 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 1462,
        enemyTemplateId: "level_stage_7",
        enemyOverrides: {},
        reward: {
          repeatGold: 30,
          firstClearBonusGold: 25,
          characterExp: 216
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "8": {
        id: "level_8",
        levelId: 8,
        worldId: 1,
        stageNumberInWorld: 8,
        name: "\u{1F33F} \uCD08\uC6D0 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 1572,
        enemyTemplateId: "level_stage_8",
        enemyOverrides: {},
        reward: {
          repeatGold: 32,
          firstClearBonusGold: 25,
          characterExp: 224
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "9": {
        id: "level_9",
        levelId: 9,
        worldId: 1,
        stageNumberInWorld: 9,
        name: "\u{1F33F} \uCD08\uC6D0 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 1683,
        enemyTemplateId: "level_stage_9",
        enemyOverrides: {},
        reward: {
          repeatGold: 33,
          firstClearBonusGold: 25,
          characterExp: 232
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "10": {
        id: "level_10",
        levelId: 10,
        worldId: 1,
        stageNumberInWorld: 10,
        name: "\u{1F33F} \uCD08\uC6D0 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 1793,
        enemyTemplateId: "level_stage_10",
        enemyOverrides: {},
        reward: {
          repeatGold: 35,
          firstClearBonusGold: 25,
          characterExp: 240
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "11": {
        id: "level_11",
        levelId: 11,
        worldId: 1,
        stageNumberInWorld: 11,
        name: "\u{1F33F} \uCD08\uC6D0 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 1903,
        enemyTemplateId: "level_stage_11",
        enemyOverrides: {},
        reward: {
          repeatGold: 36,
          firstClearBonusGold: 25,
          characterExp: 248
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "12": {
        id: "level_12",
        levelId: 12,
        worldId: 1,
        stageNumberInWorld: 12,
        name: "\u{1F33F} \uCD08\uC6D0 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 2014,
        enemyTemplateId: "level_stage_12",
        enemyOverrides: {},
        reward: {
          repeatGold: 38,
          firstClearBonusGold: 25,
          characterExp: 256
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "13": {
        id: "level_13",
        levelId: 13,
        worldId: 1,
        stageNumberInWorld: 13,
        name: "\u{1F33F} \uCD08\uC6D0 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 2124,
        enemyTemplateId: "level_stage_13",
        enemyOverrides: {},
        reward: {
          repeatGold: 39,
          firstClearBonusGold: 25,
          characterExp: 264
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "14": {
        id: "level_14",
        levelId: 14,
        worldId: 1,
        stageNumberInWorld: 14,
        name: "\u{1F33F} \uCD08\uC6D0 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 2234,
        enemyTemplateId: "level_stage_14",
        enemyOverrides: {},
        reward: {
          repeatGold: 41,
          firstClearBonusGold: 25,
          characterExp: 272
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "15": {
        id: "level_15",
        levelId: 15,
        worldId: 1,
        stageNumberInWorld: 15,
        name: "\u{1F33F} \uCD08\uC6D0 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 2345,
        enemyTemplateId: "level_stage_15",
        enemyOverrides: {},
        reward: {
          repeatGold: 42,
          firstClearBonusGold: 25,
          characterExp: 280
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "16": {
        id: "level_16",
        levelId: 16,
        worldId: 1,
        stageNumberInWorld: 16,
        name: "\u{1F33F} \uCD08\uC6D0 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 2455,
        enemyTemplateId: "level_stage_16",
        enemyOverrides: {},
        reward: {
          repeatGold: 44,
          firstClearBonusGold: 25,
          characterExp: 288
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "17": {
        id: "level_17",
        levelId: 17,
        worldId: 1,
        stageNumberInWorld: 17,
        name: "\u{1F33F} \uCD08\uC6D0 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 2566,
        enemyTemplateId: "level_stage_17",
        enemyOverrides: {},
        reward: {
          repeatGold: 45,
          firstClearBonusGold: 25,
          characterExp: 296
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "18": {
        id: "level_18",
        levelId: 18,
        worldId: 1,
        stageNumberInWorld: 18,
        name: "\u{1F33F} \uCD08\uC6D0 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 2676,
        enemyTemplateId: "level_stage_18",
        enemyOverrides: {},
        reward: {
          repeatGold: 47,
          firstClearBonusGold: 25,
          characterExp: 304
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "19": {
        id: "level_19",
        levelId: 19,
        worldId: 1,
        stageNumberInWorld: 19,
        name: "\u{1F33F} \uCD08\uC6D0 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 2786,
        enemyTemplateId: "level_stage_19",
        enemyOverrides: {},
        reward: {
          repeatGold: 48,
          firstClearBonusGold: 25,
          characterExp: 312
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "20": {
        id: "level_20",
        levelId: 20,
        worldId: 1,
        stageNumberInWorld: 20,
        name: "\u{1F33F} \uCD08\uC6D0 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 2897,
        enemyTemplateId: "level_stage_20",
        enemyOverrides: {},
        reward: {
          repeatGold: 50,
          firstClearBonusGold: 25,
          characterExp: 320
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "21": {
        id: "level_21",
        levelId: 21,
        worldId: 1,
        stageNumberInWorld: 21,
        name: "\u{1F33F} \uCD08\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 3007,
        enemyTemplateId: "level_stage_21",
        enemyOverrides: {},
        reward: {
          repeatGold: 51,
          firstClearBonusGold: 25,
          characterExp: 328
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "22": {
        id: "level_22",
        levelId: 22,
        worldId: 1,
        stageNumberInWorld: 22,
        name: "\u{1F33F} \uCD08\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 3117,
        enemyTemplateId: "level_stage_22",
        enemyOverrides: {},
        reward: {
          repeatGold: 53,
          firstClearBonusGold: 25,
          characterExp: 336
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "23": {
        id: "level_23",
        levelId: 23,
        worldId: 1,
        stageNumberInWorld: 23,
        name: "\u{1F33F} \uCD08\uC6D0 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 3228,
        enemyTemplateId: "level_stage_23",
        enemyOverrides: {},
        reward: {
          repeatGold: 54,
          firstClearBonusGold: 25,
          characterExp: 344
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "24": {
        id: "level_24",
        levelId: 24,
        worldId: 1,
        stageNumberInWorld: 24,
        name: "\u{1F33F} \uCD08\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 3338,
        enemyTemplateId: "level_stage_24",
        enemyOverrides: {},
        reward: {
          repeatGold: 56,
          firstClearBonusGold: 25,
          characterExp: 352
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "25": {
        id: "level_25",
        levelId: 25,
        worldId: 1,
        stageNumberInWorld: 25,
        name: "\u{1F33F} \uCD08\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 3448,
        enemyTemplateId: "level_stage_25",
        enemyOverrides: {},
        reward: {
          repeatGold: 57,
          firstClearBonusGold: 25,
          characterExp: 360
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "26": {
        id: "level_26",
        levelId: 26,
        worldId: 1,
        stageNumberInWorld: 26,
        name: "\u{1F33F} \uCD08\uC6D0 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 3559,
        enemyTemplateId: "level_stage_26",
        enemyOverrides: {},
        reward: {
          repeatGold: 59,
          firstClearBonusGold: 25,
          characterExp: 368
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "27": {
        id: "level_27",
        levelId: 27,
        worldId: 1,
        stageNumberInWorld: 27,
        name: "\u{1F33F} \uCD08\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 3669,
        enemyTemplateId: "level_stage_27",
        enemyOverrides: {},
        reward: {
          repeatGold: 60,
          firstClearBonusGold: 25,
          characterExp: 376
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "28": {
        id: "level_28",
        levelId: 28,
        worldId: 1,
        stageNumberInWorld: 28,
        name: "\u{1F33F} \uCD08\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 3779,
        enemyTemplateId: "level_stage_28",
        enemyOverrides: {},
        reward: {
          repeatGold: 62,
          firstClearBonusGold: 25,
          characterExp: 384
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "29": {
        id: "level_29",
        levelId: 29,
        worldId: 1,
        stageNumberInWorld: 29,
        name: "\u{1F33F} \uCD08\uC6D0 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 3890,
        enemyTemplateId: "level_stage_29",
        enemyOverrides: {},
        reward: {
          repeatGold: 63,
          firstClearBonusGold: 25,
          characterExp: 392
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "30": {
        id: "level_30",
        levelId: 30,
        worldId: 1,
        stageNumberInWorld: 30,
        name: "\u{1F33F} \uCD08\uC6D0 \u2014 \uD0B9\uC2AC\uB77C\uC784",
        goalType: "defeat_enemy",
        goalValue: 4e3,
        enemyTemplateId: "level_stage_30",
        enemyOverrides: {},
        reward: {
          repeatGold: 65,
          firstClearBonusGold: 25,
          characterExp: 400
        },
        unlocksBossRaidStage: 1,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "31": {
        id: "level_31",
        levelId: 31,
        worldId: 2,
        stageNumberInWorld: 1,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 1800,
        enemyTemplateId: "level_stage_31",
        enemyOverrides: {},
        reward: {
          repeatGold: 29,
          firstClearBonusGold: 32,
          characterExp: 568
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "32": {
        id: "level_32",
        levelId: 32,
        worldId: 2,
        stageNumberInWorld: 2,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 2048,
        enemyTemplateId: "level_stage_32",
        enemyOverrides: {},
        reward: {
          repeatGold: 31,
          firstClearBonusGold: 32,
          characterExp: 576
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "33": {
        id: "level_33",
        levelId: 33,
        worldId: 2,
        stageNumberInWorld: 3,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 2297,
        enemyTemplateId: "level_stage_33",
        enemyOverrides: {},
        reward: {
          repeatGold: 32,
          firstClearBonusGold: 32,
          characterExp: 584
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "34": {
        id: "level_34",
        levelId: 34,
        worldId: 2,
        stageNumberInWorld: 4,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 2545,
        enemyTemplateId: "level_stage_34",
        enemyOverrides: {},
        reward: {
          repeatGold: 34,
          firstClearBonusGold: 32,
          characterExp: 592
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "35": {
        id: "level_35",
        levelId: 35,
        worldId: 2,
        stageNumberInWorld: 5,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 2793,
        enemyTemplateId: "level_stage_35",
        enemyOverrides: {},
        reward: {
          repeatGold: 35,
          firstClearBonusGold: 32,
          characterExp: 600
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "36": {
        id: "level_36",
        levelId: 36,
        worldId: 2,
        stageNumberInWorld: 6,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 3041,
        enemyTemplateId: "level_stage_36",
        enemyOverrides: {},
        reward: {
          repeatGold: 37,
          firstClearBonusGold: 32,
          characterExp: 608
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "37": {
        id: "level_37",
        levelId: 37,
        worldId: 2,
        stageNumberInWorld: 7,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 3290,
        enemyTemplateId: "level_stage_37",
        enemyOverrides: {},
        reward: {
          repeatGold: 38,
          firstClearBonusGold: 32,
          characterExp: 616
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "38": {
        id: "level_38",
        levelId: 38,
        worldId: 2,
        stageNumberInWorld: 8,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 3538,
        enemyTemplateId: "level_stage_38",
        enemyOverrides: {},
        reward: {
          repeatGold: 40,
          firstClearBonusGold: 32,
          characterExp: 624
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "39": {
        id: "level_39",
        levelId: 39,
        worldId: 2,
        stageNumberInWorld: 9,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 3786,
        enemyTemplateId: "level_stage_39",
        enemyOverrides: {},
        reward: {
          repeatGold: 41,
          firstClearBonusGold: 32,
          characterExp: 632
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "40": {
        id: "level_40",
        levelId: 40,
        worldId: 2,
        stageNumberInWorld: 10,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 4034,
        enemyTemplateId: "level_stage_40",
        enemyOverrides: {},
        reward: {
          repeatGold: 43,
          firstClearBonusGold: 32,
          characterExp: 640
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "41": {
        id: "level_41",
        levelId: 41,
        worldId: 2,
        stageNumberInWorld: 11,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 4283,
        enemyTemplateId: "level_stage_41",
        enemyOverrides: {},
        reward: {
          repeatGold: 44,
          firstClearBonusGold: 32,
          characterExp: 648
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "42": {
        id: "level_42",
        levelId: 42,
        worldId: 2,
        stageNumberInWorld: 12,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 4531,
        enemyTemplateId: "level_stage_42",
        enemyOverrides: {},
        reward: {
          repeatGold: 46,
          firstClearBonusGold: 32,
          characterExp: 656
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "43": {
        id: "level_43",
        levelId: 43,
        worldId: 2,
        stageNumberInWorld: 13,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 4779,
        enemyTemplateId: "level_stage_43",
        enemyOverrides: {},
        reward: {
          repeatGold: 47,
          firstClearBonusGold: 32,
          characterExp: 664
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "44": {
        id: "level_44",
        levelId: 44,
        worldId: 2,
        stageNumberInWorld: 14,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 5028,
        enemyTemplateId: "level_stage_44",
        enemyOverrides: {},
        reward: {
          repeatGold: 49,
          firstClearBonusGold: 32,
          characterExp: 672
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "45": {
        id: "level_45",
        levelId: 45,
        worldId: 2,
        stageNumberInWorld: 15,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 5276,
        enemyTemplateId: "level_stage_45",
        enemyOverrides: {},
        reward: {
          repeatGold: 50,
          firstClearBonusGold: 32,
          characterExp: 680
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "46": {
        id: "level_46",
        levelId: 46,
        worldId: 2,
        stageNumberInWorld: 16,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 5524,
        enemyTemplateId: "level_stage_46",
        enemyOverrides: {},
        reward: {
          repeatGold: 52,
          firstClearBonusGold: 32,
          characterExp: 688
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "47": {
        id: "level_47",
        levelId: 47,
        worldId: 2,
        stageNumberInWorld: 17,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 5772,
        enemyTemplateId: "level_stage_47",
        enemyOverrides: {},
        reward: {
          repeatGold: 53,
          firstClearBonusGold: 32,
          characterExp: 696
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "48": {
        id: "level_48",
        levelId: 48,
        worldId: 2,
        stageNumberInWorld: 18,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 6021,
        enemyTemplateId: "level_stage_48",
        enemyOverrides: {},
        reward: {
          repeatGold: 55,
          firstClearBonusGold: 32,
          characterExp: 704
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "49": {
        id: "level_49",
        levelId: 49,
        worldId: 2,
        stageNumberInWorld: 19,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 6269,
        enemyTemplateId: "level_stage_49",
        enemyOverrides: {},
        reward: {
          repeatGold: 56,
          firstClearBonusGold: 32,
          characterExp: 712
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "50": {
        id: "level_50",
        levelId: 50,
        worldId: 2,
        stageNumberInWorld: 20,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 6517,
        enemyTemplateId: "level_stage_50",
        enemyOverrides: {},
        reward: {
          repeatGold: 58,
          firstClearBonusGold: 32,
          characterExp: 720
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "51": {
        id: "level_51",
        levelId: 51,
        worldId: 2,
        stageNumberInWorld: 21,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 6766,
        enemyTemplateId: "level_stage_51",
        enemyOverrides: {},
        reward: {
          repeatGold: 59,
          firstClearBonusGold: 32,
          characterExp: 728
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "52": {
        id: "level_52",
        levelId: 52,
        worldId: 2,
        stageNumberInWorld: 22,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 7014,
        enemyTemplateId: "level_stage_52",
        enemyOverrides: {},
        reward: {
          repeatGold: 61,
          firstClearBonusGold: 32,
          characterExp: 736
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "53": {
        id: "level_53",
        levelId: 53,
        worldId: 2,
        stageNumberInWorld: 23,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 7262,
        enemyTemplateId: "level_stage_53",
        enemyOverrides: {},
        reward: {
          repeatGold: 62,
          firstClearBonusGold: 32,
          characterExp: 744
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "54": {
        id: "level_54",
        levelId: 54,
        worldId: 2,
        stageNumberInWorld: 24,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 7510,
        enemyTemplateId: "level_stage_54",
        enemyOverrides: {},
        reward: {
          repeatGold: 64,
          firstClearBonusGold: 32,
          characterExp: 752
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "55": {
        id: "level_55",
        levelId: 55,
        worldId: 2,
        stageNumberInWorld: 25,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 7759,
        enemyTemplateId: "level_stage_55",
        enemyOverrides: {},
        reward: {
          repeatGold: 65,
          firstClearBonusGold: 32,
          characterExp: 760
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "56": {
        id: "level_56",
        levelId: 56,
        worldId: 2,
        stageNumberInWorld: 26,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 8007,
        enemyTemplateId: "level_stage_56",
        enemyOverrides: {},
        reward: {
          repeatGold: 67,
          firstClearBonusGold: 32,
          characterExp: 768
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "57": {
        id: "level_57",
        levelId: 57,
        worldId: 2,
        stageNumberInWorld: 27,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 8255,
        enemyTemplateId: "level_stage_57",
        enemyOverrides: {},
        reward: {
          repeatGold: 68,
          firstClearBonusGold: 32,
          characterExp: 776
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "58": {
        id: "level_58",
        levelId: 58,
        worldId: 2,
        stageNumberInWorld: 28,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 8503,
        enemyTemplateId: "level_stage_58",
        enemyOverrides: {},
        reward: {
          repeatGold: 70,
          firstClearBonusGold: 32,
          characterExp: 784
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "59": {
        id: "level_59",
        levelId: 59,
        worldId: 2,
        stageNumberInWorld: 29,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 8752,
        enemyTemplateId: "level_stage_59",
        enemyOverrides: {},
        reward: {
          repeatGold: 71,
          firstClearBonusGold: 32,
          characterExp: 792
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "60": {
        id: "level_60",
        levelId: 60,
        worldId: 2,
        stageNumberInWorld: 30,
        name: "\u{1F3DC}\uFE0F \uC0AC\uB9C9 \u2014 \uC804\uAC08\uC655",
        goalType: "defeat_enemy",
        goalValue: 9e3,
        enemyTemplateId: "level_stage_60",
        enemyOverrides: {},
        reward: {
          repeatGold: 73,
          firstClearBonusGold: 32,
          characterExp: 800
        },
        unlocksBossRaidStage: 2,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "61": {
        id: "level_61",
        levelId: 61,
        worldId: 3,
        stageNumberInWorld: 1,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 3200,
        enemyTemplateId: "level_stage_61",
        enemyOverrides: {},
        reward: {
          repeatGold: 37,
          firstClearBonusGold: 39,
          characterExp: 968
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "62": {
        id: "level_62",
        levelId: 62,
        worldId: 3,
        stageNumberInWorld: 2,
        name: "\u2744\uFE0F \uC124\uC6D0 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 3641,
        enemyTemplateId: "level_stage_62",
        enemyOverrides: {},
        reward: {
          repeatGold: 39,
          firstClearBonusGold: 39,
          characterExp: 976
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "63": {
        id: "level_63",
        levelId: 63,
        worldId: 3,
        stageNumberInWorld: 3,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 4083,
        enemyTemplateId: "level_stage_63",
        enemyOverrides: {},
        reward: {
          repeatGold: 40,
          firstClearBonusGold: 39,
          characterExp: 984
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "64": {
        id: "level_64",
        levelId: 64,
        worldId: 3,
        stageNumberInWorld: 4,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 4524,
        enemyTemplateId: "level_stage_64",
        enemyOverrides: {},
        reward: {
          repeatGold: 42,
          firstClearBonusGold: 39,
          characterExp: 992
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "65": {
        id: "level_65",
        levelId: 65,
        worldId: 3,
        stageNumberInWorld: 5,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 4966,
        enemyTemplateId: "level_stage_65",
        enemyOverrides: {},
        reward: {
          repeatGold: 43,
          firstClearBonusGold: 39,
          characterExp: 1e3
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "66": {
        id: "level_66",
        levelId: 66,
        worldId: 3,
        stageNumberInWorld: 6,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 5407,
        enemyTemplateId: "level_stage_66",
        enemyOverrides: {},
        reward: {
          repeatGold: 45,
          firstClearBonusGold: 39,
          characterExp: 1008
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "67": {
        id: "level_67",
        levelId: 67,
        worldId: 3,
        stageNumberInWorld: 7,
        name: "\u2744\uFE0F \uC124\uC6D0 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 5848,
        enemyTemplateId: "level_stage_67",
        enemyOverrides: {},
        reward: {
          repeatGold: 46,
          firstClearBonusGold: 39,
          characterExp: 1016
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "68": {
        id: "level_68",
        levelId: 68,
        worldId: 3,
        stageNumberInWorld: 8,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 6290,
        enemyTemplateId: "level_stage_68",
        enemyOverrides: {},
        reward: {
          repeatGold: 48,
          firstClearBonusGold: 39,
          characterExp: 1024
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "69": {
        id: "level_69",
        levelId: 69,
        worldId: 3,
        stageNumberInWorld: 9,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 6731,
        enemyTemplateId: "level_stage_69",
        enemyOverrides: {},
        reward: {
          repeatGold: 49,
          firstClearBonusGold: 39,
          characterExp: 1032
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "70": {
        id: "level_70",
        levelId: 70,
        worldId: 3,
        stageNumberInWorld: 10,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 7172,
        enemyTemplateId: "level_stage_70",
        enemyOverrides: {},
        reward: {
          repeatGold: 51,
          firstClearBonusGold: 39,
          characterExp: 1040
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "71": {
        id: "level_71",
        levelId: 71,
        worldId: 3,
        stageNumberInWorld: 11,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 7614,
        enemyTemplateId: "level_stage_71",
        enemyOverrides: {},
        reward: {
          repeatGold: 52,
          firstClearBonusGold: 39,
          characterExp: 1048
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "72": {
        id: "level_72",
        levelId: 72,
        worldId: 3,
        stageNumberInWorld: 12,
        name: "\u2744\uFE0F \uC124\uC6D0 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 8055,
        enemyTemplateId: "level_stage_72",
        enemyOverrides: {},
        reward: {
          repeatGold: 54,
          firstClearBonusGold: 39,
          characterExp: 1056
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "73": {
        id: "level_73",
        levelId: 73,
        worldId: 3,
        stageNumberInWorld: 13,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 8497,
        enemyTemplateId: "level_stage_73",
        enemyOverrides: {},
        reward: {
          repeatGold: 55,
          firstClearBonusGold: 39,
          characterExp: 1064
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "74": {
        id: "level_74",
        levelId: 74,
        worldId: 3,
        stageNumberInWorld: 14,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 8938,
        enemyTemplateId: "level_stage_74",
        enemyOverrides: {},
        reward: {
          repeatGold: 57,
          firstClearBonusGold: 39,
          characterExp: 1072
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "75": {
        id: "level_75",
        levelId: 75,
        worldId: 3,
        stageNumberInWorld: 15,
        name: "\u2744\uFE0F \uC124\uC6D0 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 9379,
        enemyTemplateId: "level_stage_75",
        enemyOverrides: {},
        reward: {
          repeatGold: 58,
          firstClearBonusGold: 39,
          characterExp: 1080
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "76": {
        id: "level_76",
        levelId: 76,
        worldId: 3,
        stageNumberInWorld: 16,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 9821,
        enemyTemplateId: "level_stage_76",
        enemyOverrides: {},
        reward: {
          repeatGold: 60,
          firstClearBonusGold: 39,
          characterExp: 1088
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "77": {
        id: "level_77",
        levelId: 77,
        worldId: 3,
        stageNumberInWorld: 17,
        name: "\u2744\uFE0F \uC124\uC6D0 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 10262,
        enemyTemplateId: "level_stage_77",
        enemyOverrides: {},
        reward: {
          repeatGold: 61,
          firstClearBonusGold: 39,
          characterExp: 1096
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "78": {
        id: "level_78",
        levelId: 78,
        worldId: 3,
        stageNumberInWorld: 18,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 10703,
        enemyTemplateId: "level_stage_78",
        enemyOverrides: {},
        reward: {
          repeatGold: 63,
          firstClearBonusGold: 39,
          characterExp: 1104
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "79": {
        id: "level_79",
        levelId: 79,
        worldId: 3,
        stageNumberInWorld: 19,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 11145,
        enemyTemplateId: "level_stage_79",
        enemyOverrides: {},
        reward: {
          repeatGold: 64,
          firstClearBonusGold: 39,
          characterExp: 1112
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "80": {
        id: "level_80",
        levelId: 80,
        worldId: 3,
        stageNumberInWorld: 20,
        name: "\u2744\uFE0F \uC124\uC6D0 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 11586,
        enemyTemplateId: "level_stage_80",
        enemyOverrides: {},
        reward: {
          repeatGold: 66,
          firstClearBonusGold: 39,
          characterExp: 1120
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "81": {
        id: "level_81",
        levelId: 81,
        worldId: 3,
        stageNumberInWorld: 21,
        name: "\u2744\uFE0F \uC124\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 12028,
        enemyTemplateId: "level_stage_81",
        enemyOverrides: {},
        reward: {
          repeatGold: 67,
          firstClearBonusGold: 39,
          characterExp: 1128
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "82": {
        id: "level_82",
        levelId: 82,
        worldId: 3,
        stageNumberInWorld: 22,
        name: "\u2744\uFE0F \uC124\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 12469,
        enemyTemplateId: "level_stage_82",
        enemyOverrides: {},
        reward: {
          repeatGold: 69,
          firstClearBonusGold: 39,
          characterExp: 1136
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "83": {
        id: "level_83",
        levelId: 83,
        worldId: 3,
        stageNumberInWorld: 23,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 12910,
        enemyTemplateId: "level_stage_83",
        enemyOverrides: {},
        reward: {
          repeatGold: 70,
          firstClearBonusGold: 39,
          characterExp: 1144
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "84": {
        id: "level_84",
        levelId: 84,
        worldId: 3,
        stageNumberInWorld: 24,
        name: "\u2744\uFE0F \uC124\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 13352,
        enemyTemplateId: "level_stage_84",
        enemyOverrides: {},
        reward: {
          repeatGold: 72,
          firstClearBonusGold: 39,
          characterExp: 1152
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "85": {
        id: "level_85",
        levelId: 85,
        worldId: 3,
        stageNumberInWorld: 25,
        name: "\u2744\uFE0F \uC124\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 13793,
        enemyTemplateId: "level_stage_85",
        enemyOverrides: {},
        reward: {
          repeatGold: 73,
          firstClearBonusGold: 39,
          characterExp: 1160
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "86": {
        id: "level_86",
        levelId: 86,
        worldId: 3,
        stageNumberInWorld: 26,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 14234,
        enemyTemplateId: "level_stage_86",
        enemyOverrides: {},
        reward: {
          repeatGold: 75,
          firstClearBonusGold: 39,
          characterExp: 1168
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "87": {
        id: "level_87",
        levelId: 87,
        worldId: 3,
        stageNumberInWorld: 27,
        name: "\u2744\uFE0F \uC124\uC6D0 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 14676,
        enemyTemplateId: "level_stage_87",
        enemyOverrides: {},
        reward: {
          repeatGold: 76,
          firstClearBonusGold: 39,
          characterExp: 1176
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "88": {
        id: "level_88",
        levelId: 88,
        worldId: 3,
        stageNumberInWorld: 28,
        name: "\u2744\uFE0F \uC124\uC6D0 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 15117,
        enemyTemplateId: "level_stage_88",
        enemyOverrides: {},
        reward: {
          repeatGold: 78,
          firstClearBonusGold: 39,
          characterExp: 1184
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "89": {
        id: "level_89",
        levelId: 89,
        worldId: 3,
        stageNumberInWorld: 29,
        name: "\u2744\uFE0F \uC124\uC6D0 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 15559,
        enemyTemplateId: "level_stage_89",
        enemyOverrides: {},
        reward: {
          repeatGold: 79,
          firstClearBonusGold: 39,
          characterExp: 1192
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "90": {
        id: "level_90",
        levelId: 90,
        worldId: 3,
        stageNumberInWorld: 30,
        name: "\u2744\uFE0F \uC124\uC6D0 \u2014 \uC124\uBE59 \uC5EC\uC655",
        goalType: "defeat_enemy",
        goalValue: 16e3,
        enemyTemplateId: "level_stage_90",
        enemyOverrides: {},
        reward: {
          repeatGold: 81,
          firstClearBonusGold: 39,
          characterExp: 1200
        },
        unlocksBossRaidStage: 3,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "91": {
        id: "level_91",
        levelId: 91,
        worldId: 4,
        stageNumberInWorld: 1,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 5200,
        enemyTemplateId: "level_stage_91",
        enemyOverrides: {},
        reward: {
          repeatGold: 45,
          firstClearBonusGold: 46,
          characterExp: 1368
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "92": {
        id: "level_92",
        levelId: 92,
        worldId: 4,
        stageNumberInWorld: 2,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 5917,
        enemyTemplateId: "level_stage_92",
        enemyOverrides: {},
        reward: {
          repeatGold: 47,
          firstClearBonusGold: 46,
          characterExp: 1376
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "93": {
        id: "level_93",
        levelId: 93,
        worldId: 4,
        stageNumberInWorld: 3,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 6634,
        enemyTemplateId: "level_stage_93",
        enemyOverrides: {},
        reward: {
          repeatGold: 48,
          firstClearBonusGold: 46,
          characterExp: 1384
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "94": {
        id: "level_94",
        levelId: 94,
        worldId: 4,
        stageNumberInWorld: 4,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 7352,
        enemyTemplateId: "level_stage_94",
        enemyOverrides: {},
        reward: {
          repeatGold: 50,
          firstClearBonusGold: 46,
          characterExp: 1392
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "95": {
        id: "level_95",
        levelId: 95,
        worldId: 4,
        stageNumberInWorld: 5,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 8069,
        enemyTemplateId: "level_stage_95",
        enemyOverrides: {},
        reward: {
          repeatGold: 51,
          firstClearBonusGold: 46,
          characterExp: 1400
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "96": {
        id: "level_96",
        levelId: 96,
        worldId: 4,
        stageNumberInWorld: 6,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 8786,
        enemyTemplateId: "level_stage_96",
        enemyOverrides: {},
        reward: {
          repeatGold: 53,
          firstClearBonusGold: 46,
          characterExp: 1408
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "97": {
        id: "level_97",
        levelId: 97,
        worldId: 4,
        stageNumberInWorld: 7,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 9503,
        enemyTemplateId: "level_stage_97",
        enemyOverrides: {},
        reward: {
          repeatGold: 54,
          firstClearBonusGold: 46,
          characterExp: 1416
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "98": {
        id: "level_98",
        levelId: 98,
        worldId: 4,
        stageNumberInWorld: 8,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 10221,
        enemyTemplateId: "level_stage_98",
        enemyOverrides: {},
        reward: {
          repeatGold: 56,
          firstClearBonusGold: 46,
          characterExp: 1424
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "99": {
        id: "level_99",
        levelId: 99,
        worldId: 4,
        stageNumberInWorld: 9,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 10938,
        enemyTemplateId: "level_stage_99",
        enemyOverrides: {},
        reward: {
          repeatGold: 57,
          firstClearBonusGold: 46,
          characterExp: 1432
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "100": {
        id: "level_100",
        levelId: 100,
        worldId: 4,
        stageNumberInWorld: 10,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 11655,
        enemyTemplateId: "level_stage_100",
        enemyOverrides: {},
        reward: {
          repeatGold: 59,
          firstClearBonusGold: 46,
          characterExp: 1440
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "101": {
        id: "level_101",
        levelId: 101,
        worldId: 4,
        stageNumberInWorld: 11,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 12372,
        enemyTemplateId: "level_stage_101",
        enemyOverrides: {},
        reward: {
          repeatGold: 60,
          firstClearBonusGold: 46,
          characterExp: 1448
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "102": {
        id: "level_102",
        levelId: 102,
        worldId: 4,
        stageNumberInWorld: 12,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 13090,
        enemyTemplateId: "level_stage_102",
        enemyOverrides: {},
        reward: {
          repeatGold: 62,
          firstClearBonusGold: 46,
          characterExp: 1456
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "103": {
        id: "level_103",
        levelId: 103,
        worldId: 4,
        stageNumberInWorld: 13,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 13807,
        enemyTemplateId: "level_stage_103",
        enemyOverrides: {},
        reward: {
          repeatGold: 63,
          firstClearBonusGold: 46,
          characterExp: 1464
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "104": {
        id: "level_104",
        levelId: 104,
        worldId: 4,
        stageNumberInWorld: 14,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 14524,
        enemyTemplateId: "level_stage_104",
        enemyOverrides: {},
        reward: {
          repeatGold: 65,
          firstClearBonusGold: 46,
          characterExp: 1472
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "105": {
        id: "level_105",
        levelId: 105,
        worldId: 4,
        stageNumberInWorld: 15,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 15241,
        enemyTemplateId: "level_stage_105",
        enemyOverrides: {},
        reward: {
          repeatGold: 66,
          firstClearBonusGold: 46,
          characterExp: 1480
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "106": {
        id: "level_106",
        levelId: 106,
        worldId: 4,
        stageNumberInWorld: 16,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 15959,
        enemyTemplateId: "level_stage_106",
        enemyOverrides: {},
        reward: {
          repeatGold: 68,
          firstClearBonusGold: 46,
          characterExp: 1488
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "107": {
        id: "level_107",
        levelId: 107,
        worldId: 4,
        stageNumberInWorld: 17,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 16676,
        enemyTemplateId: "level_stage_107",
        enemyOverrides: {},
        reward: {
          repeatGold: 69,
          firstClearBonusGold: 46,
          characterExp: 1496
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "108": {
        id: "level_108",
        levelId: 108,
        worldId: 4,
        stageNumberInWorld: 18,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 17393,
        enemyTemplateId: "level_stage_108",
        enemyOverrides: {},
        reward: {
          repeatGold: 71,
          firstClearBonusGold: 46,
          characterExp: 1504
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "109": {
        id: "level_109",
        levelId: 109,
        worldId: 4,
        stageNumberInWorld: 19,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 18110,
        enemyTemplateId: "level_stage_109",
        enemyOverrides: {},
        reward: {
          repeatGold: 72,
          firstClearBonusGold: 46,
          characterExp: 1512
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "110": {
        id: "level_110",
        levelId: 110,
        worldId: 4,
        stageNumberInWorld: 20,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 18828,
        enemyTemplateId: "level_stage_110",
        enemyOverrides: {},
        reward: {
          repeatGold: 74,
          firstClearBonusGold: 46,
          characterExp: 1520
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "111": {
        id: "level_111",
        levelId: 111,
        worldId: 4,
        stageNumberInWorld: 21,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 19545,
        enemyTemplateId: "level_stage_111",
        enemyOverrides: {},
        reward: {
          repeatGold: 75,
          firstClearBonusGold: 46,
          characterExp: 1528
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "112": {
        id: "level_112",
        levelId: 112,
        worldId: 4,
        stageNumberInWorld: 22,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 20262,
        enemyTemplateId: "level_stage_112",
        enemyOverrides: {},
        reward: {
          repeatGold: 77,
          firstClearBonusGold: 46,
          characterExp: 1536
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "113": {
        id: "level_113",
        levelId: 113,
        worldId: 4,
        stageNumberInWorld: 23,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 20979,
        enemyTemplateId: "level_stage_113",
        enemyOverrides: {},
        reward: {
          repeatGold: 78,
          firstClearBonusGold: 46,
          characterExp: 1544
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "114": {
        id: "level_114",
        levelId: 114,
        worldId: 4,
        stageNumberInWorld: 24,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 21697,
        enemyTemplateId: "level_stage_114",
        enemyOverrides: {},
        reward: {
          repeatGold: 80,
          firstClearBonusGold: 46,
          characterExp: 1552
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "115": {
        id: "level_115",
        levelId: 115,
        worldId: 4,
        stageNumberInWorld: 25,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 22414,
        enemyTemplateId: "level_stage_115",
        enemyOverrides: {},
        reward: {
          repeatGold: 81,
          firstClearBonusGold: 46,
          characterExp: 1560
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "116": {
        id: "level_116",
        levelId: 116,
        worldId: 4,
        stageNumberInWorld: 26,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 23131,
        enemyTemplateId: "level_stage_116",
        enemyOverrides: {},
        reward: {
          repeatGold: 83,
          firstClearBonusGold: 46,
          characterExp: 1568
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "117": {
        id: "level_117",
        levelId: 117,
        worldId: 4,
        stageNumberInWorld: 27,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 23848,
        enemyTemplateId: "level_stage_117",
        enemyOverrides: {},
        reward: {
          repeatGold: 84,
          firstClearBonusGold: 46,
          characterExp: 1576
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "118": {
        id: "level_118",
        levelId: 118,
        worldId: 4,
        stageNumberInWorld: 28,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 24566,
        enemyTemplateId: "level_stage_118",
        enemyOverrides: {},
        reward: {
          repeatGold: 86,
          firstClearBonusGold: 46,
          characterExp: 1584
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "119": {
        id: "level_119",
        levelId: 119,
        worldId: 4,
        stageNumberInWorld: 29,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 25283,
        enemyTemplateId: "level_stage_119",
        enemyOverrides: {},
        reward: {
          repeatGold: 87,
          firstClearBonusGold: 46,
          characterExp: 1592
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "120": {
        id: "level_120",
        levelId: 120,
        worldId: 4,
        stageNumberInWorld: 30,
        name: "\u{1F30A} \uD574\uC800 \uB3D9\uAD74 \u2014 \uD06C\uB77C\uCF04",
        goalType: "defeat_enemy",
        goalValue: 26e3,
        enemyTemplateId: "level_stage_120",
        enemyOverrides: {},
        reward: {
          repeatGold: 89,
          firstClearBonusGold: 46,
          characterExp: 1600
        },
        unlocksBossRaidStage: 4,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "121": {
        id: "level_121",
        levelId: 121,
        worldId: 5,
        stageNumberInWorld: 1,
        name: "\u{1F33F} \uB3C5\uB9BC \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 8e3,
        enemyTemplateId: "level_stage_121",
        enemyOverrides: {},
        reward: {
          repeatGold: 53,
          firstClearBonusGold: 53,
          characterExp: 1768
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "122": {
        id: "level_122",
        levelId: 122,
        worldId: 5,
        stageNumberInWorld: 2,
        name: "\u{1F33F} \uB3C5\uB9BC \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 9103,
        enemyTemplateId: "level_stage_122",
        enemyOverrides: {},
        reward: {
          repeatGold: 55,
          firstClearBonusGold: 53,
          characterExp: 1776
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "123": {
        id: "level_123",
        levelId: 123,
        worldId: 5,
        stageNumberInWorld: 3,
        name: "\u{1F33F} \uB3C5\uB9BC \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 10207,
        enemyTemplateId: "level_stage_123",
        enemyOverrides: {},
        reward: {
          repeatGold: 56,
          firstClearBonusGold: 53,
          characterExp: 1784
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "124": {
        id: "level_124",
        levelId: 124,
        worldId: 5,
        stageNumberInWorld: 4,
        name: "\u{1F33F} \uB3C5\uB9BC \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 11310,
        enemyTemplateId: "level_stage_124",
        enemyOverrides: {},
        reward: {
          repeatGold: 58,
          firstClearBonusGold: 53,
          characterExp: 1792
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "125": {
        id: "level_125",
        levelId: 125,
        worldId: 5,
        stageNumberInWorld: 5,
        name: "\u{1F33F} \uB3C5\uB9BC \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 12414,
        enemyTemplateId: "level_stage_125",
        enemyOverrides: {},
        reward: {
          repeatGold: 59,
          firstClearBonusGold: 53,
          characterExp: 1800
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "126": {
        id: "level_126",
        levelId: 126,
        worldId: 5,
        stageNumberInWorld: 6,
        name: "\u{1F33F} \uB3C5\uB9BC \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 13517,
        enemyTemplateId: "level_stage_126",
        enemyOverrides: {},
        reward: {
          repeatGold: 61,
          firstClearBonusGold: 53,
          characterExp: 1808
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "127": {
        id: "level_127",
        levelId: 127,
        worldId: 5,
        stageNumberInWorld: 7,
        name: "\u{1F33F} \uB3C5\uB9BC \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 14621,
        enemyTemplateId: "level_stage_127",
        enemyOverrides: {},
        reward: {
          repeatGold: 62,
          firstClearBonusGold: 53,
          characterExp: 1816
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "128": {
        id: "level_128",
        levelId: 128,
        worldId: 5,
        stageNumberInWorld: 8,
        name: "\u{1F33F} \uB3C5\uB9BC \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 15724,
        enemyTemplateId: "level_stage_128",
        enemyOverrides: {},
        reward: {
          repeatGold: 64,
          firstClearBonusGold: 53,
          characterExp: 1824
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "129": {
        id: "level_129",
        levelId: 129,
        worldId: 5,
        stageNumberInWorld: 9,
        name: "\u{1F33F} \uB3C5\uB9BC \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 16828,
        enemyTemplateId: "level_stage_129",
        enemyOverrides: {},
        reward: {
          repeatGold: 65,
          firstClearBonusGold: 53,
          characterExp: 1832
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "130": {
        id: "level_130",
        levelId: 130,
        worldId: 5,
        stageNumberInWorld: 10,
        name: "\u{1F33F} \uB3C5\uB9BC \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 17931,
        enemyTemplateId: "level_stage_130",
        enemyOverrides: {},
        reward: {
          repeatGold: 67,
          firstClearBonusGold: 53,
          characterExp: 1840
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "131": {
        id: "level_131",
        levelId: 131,
        worldId: 5,
        stageNumberInWorld: 11,
        name: "\u{1F33F} \uB3C5\uB9BC \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 19034,
        enemyTemplateId: "level_stage_131",
        enemyOverrides: {},
        reward: {
          repeatGold: 68,
          firstClearBonusGold: 53,
          characterExp: 1848
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "132": {
        id: "level_132",
        levelId: 132,
        worldId: 5,
        stageNumberInWorld: 12,
        name: "\u{1F33F} \uB3C5\uB9BC \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 20138,
        enemyTemplateId: "level_stage_132",
        enemyOverrides: {},
        reward: {
          repeatGold: 70,
          firstClearBonusGold: 53,
          characterExp: 1856
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "133": {
        id: "level_133",
        levelId: 133,
        worldId: 5,
        stageNumberInWorld: 13,
        name: "\u{1F33F} \uB3C5\uB9BC \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 21241,
        enemyTemplateId: "level_stage_133",
        enemyOverrides: {},
        reward: {
          repeatGold: 71,
          firstClearBonusGold: 53,
          characterExp: 1864
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "134": {
        id: "level_134",
        levelId: 134,
        worldId: 5,
        stageNumberInWorld: 14,
        name: "\u{1F33F} \uB3C5\uB9BC \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 22345,
        enemyTemplateId: "level_stage_134",
        enemyOverrides: {},
        reward: {
          repeatGold: 73,
          firstClearBonusGold: 53,
          characterExp: 1872
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "135": {
        id: "level_135",
        levelId: 135,
        worldId: 5,
        stageNumberInWorld: 15,
        name: "\u{1F33F} \uB3C5\uB9BC \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 23448,
        enemyTemplateId: "level_stage_135",
        enemyOverrides: {},
        reward: {
          repeatGold: 74,
          firstClearBonusGold: 53,
          characterExp: 1880
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "136": {
        id: "level_136",
        levelId: 136,
        worldId: 5,
        stageNumberInWorld: 16,
        name: "\u{1F33F} \uB3C5\uB9BC \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 24552,
        enemyTemplateId: "level_stage_136",
        enemyOverrides: {},
        reward: {
          repeatGold: 76,
          firstClearBonusGold: 53,
          characterExp: 1888
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "137": {
        id: "level_137",
        levelId: 137,
        worldId: 5,
        stageNumberInWorld: 17,
        name: "\u{1F33F} \uB3C5\uB9BC \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 25655,
        enemyTemplateId: "level_stage_137",
        enemyOverrides: {},
        reward: {
          repeatGold: 77,
          firstClearBonusGold: 53,
          characterExp: 1896
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "138": {
        id: "level_138",
        levelId: 138,
        worldId: 5,
        stageNumberInWorld: 18,
        name: "\u{1F33F} \uB3C5\uB9BC \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 26759,
        enemyTemplateId: "level_stage_138",
        enemyOverrides: {},
        reward: {
          repeatGold: 79,
          firstClearBonusGold: 53,
          characterExp: 1904
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "139": {
        id: "level_139",
        levelId: 139,
        worldId: 5,
        stageNumberInWorld: 19,
        name: "\u{1F33F} \uB3C5\uB9BC \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 27862,
        enemyTemplateId: "level_stage_139",
        enemyOverrides: {},
        reward: {
          repeatGold: 80,
          firstClearBonusGold: 53,
          characterExp: 1912
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "140": {
        id: "level_140",
        levelId: 140,
        worldId: 5,
        stageNumberInWorld: 20,
        name: "\u{1F33F} \uB3C5\uB9BC \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 28966,
        enemyTemplateId: "level_stage_140",
        enemyOverrides: {},
        reward: {
          repeatGold: 82,
          firstClearBonusGold: 53,
          characterExp: 1920
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "141": {
        id: "level_141",
        levelId: 141,
        worldId: 5,
        stageNumberInWorld: 21,
        name: "\u{1F33F} \uB3C5\uB9BC \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 30069,
        enemyTemplateId: "level_stage_141",
        enemyOverrides: {},
        reward: {
          repeatGold: 83,
          firstClearBonusGold: 53,
          characterExp: 1928
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "142": {
        id: "level_142",
        levelId: 142,
        worldId: 5,
        stageNumberInWorld: 22,
        name: "\u{1F33F} \uB3C5\uB9BC \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 31172,
        enemyTemplateId: "level_stage_142",
        enemyOverrides: {},
        reward: {
          repeatGold: 85,
          firstClearBonusGold: 53,
          characterExp: 1936
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "143": {
        id: "level_143",
        levelId: 143,
        worldId: 5,
        stageNumberInWorld: 23,
        name: "\u{1F33F} \uB3C5\uB9BC \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 32276,
        enemyTemplateId: "level_stage_143",
        enemyOverrides: {},
        reward: {
          repeatGold: 86,
          firstClearBonusGold: 53,
          characterExp: 1944
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "144": {
        id: "level_144",
        levelId: 144,
        worldId: 5,
        stageNumberInWorld: 24,
        name: "\u{1F33F} \uB3C5\uB9BC \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 33379,
        enemyTemplateId: "level_stage_144",
        enemyOverrides: {},
        reward: {
          repeatGold: 88,
          firstClearBonusGold: 53,
          characterExp: 1952
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "145": {
        id: "level_145",
        levelId: 145,
        worldId: 5,
        stageNumberInWorld: 25,
        name: "\u{1F33F} \uB3C5\uB9BC \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 34483,
        enemyTemplateId: "level_stage_145",
        enemyOverrides: {},
        reward: {
          repeatGold: 89,
          firstClearBonusGold: 53,
          characterExp: 1960
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "146": {
        id: "level_146",
        levelId: 146,
        worldId: 5,
        stageNumberInWorld: 26,
        name: "\u{1F33F} \uB3C5\uB9BC \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 35586,
        enemyTemplateId: "level_stage_146",
        enemyOverrides: {},
        reward: {
          repeatGold: 91,
          firstClearBonusGold: 53,
          characterExp: 1968
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "147": {
        id: "level_147",
        levelId: 147,
        worldId: 5,
        stageNumberInWorld: 27,
        name: "\u{1F33F} \uB3C5\uB9BC \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 36690,
        enemyTemplateId: "level_stage_147",
        enemyOverrides: {},
        reward: {
          repeatGold: 92,
          firstClearBonusGold: 53,
          characterExp: 1976
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "148": {
        id: "level_148",
        levelId: 148,
        worldId: 5,
        stageNumberInWorld: 28,
        name: "\u{1F33F} \uB3C5\uB9BC \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 37793,
        enemyTemplateId: "level_stage_148",
        enemyOverrides: {},
        reward: {
          repeatGold: 94,
          firstClearBonusGold: 53,
          characterExp: 1984
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "149": {
        id: "level_149",
        levelId: 149,
        worldId: 5,
        stageNumberInWorld: 29,
        name: "\u{1F33F} \uB3C5\uB9BC \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 38897,
        enemyTemplateId: "level_stage_149",
        enemyOverrides: {},
        reward: {
          repeatGold: 95,
          firstClearBonusGold: 53,
          characterExp: 1992
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "150": {
        id: "level_150",
        levelId: 150,
        worldId: 5,
        stageNumberInWorld: 30,
        name: "\u{1F33F} \uB3C5\uB9BC \u2014 \uD788\uB4DC\uB77C",
        goalType: "defeat_enemy",
        goalValue: 4e4,
        enemyTemplateId: "level_stage_150",
        enemyOverrides: {},
        reward: {
          repeatGold: 97,
          firstClearBonusGold: 53,
          characterExp: 2e3
        },
        unlocksBossRaidStage: 5,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "151": {
        id: "level_151",
        levelId: 151,
        worldId: 6,
        stageNumberInWorld: 1,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 12e3,
        enemyTemplateId: "level_stage_151",
        enemyOverrides: {},
        reward: {
          repeatGold: 61,
          firstClearBonusGold: 60,
          characterExp: 2168
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "152": {
        id: "level_152",
        levelId: 152,
        worldId: 6,
        stageNumberInWorld: 2,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 13655,
        enemyTemplateId: "level_stage_152",
        enemyOverrides: {},
        reward: {
          repeatGold: 63,
          firstClearBonusGold: 60,
          characterExp: 2176
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "153": {
        id: "level_153",
        levelId: 153,
        worldId: 6,
        stageNumberInWorld: 3,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 15310,
        enemyTemplateId: "level_stage_153",
        enemyOverrides: {},
        reward: {
          repeatGold: 64,
          firstClearBonusGold: 60,
          characterExp: 2184
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "154": {
        id: "level_154",
        levelId: 154,
        worldId: 6,
        stageNumberInWorld: 4,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 16966,
        enemyTemplateId: "level_stage_154",
        enemyOverrides: {},
        reward: {
          repeatGold: 66,
          firstClearBonusGold: 60,
          characterExp: 2192
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "155": {
        id: "level_155",
        levelId: 155,
        worldId: 6,
        stageNumberInWorld: 5,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 18621,
        enemyTemplateId: "level_stage_155",
        enemyOverrides: {},
        reward: {
          repeatGold: 67,
          firstClearBonusGold: 60,
          characterExp: 2200
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "156": {
        id: "level_156",
        levelId: 156,
        worldId: 6,
        stageNumberInWorld: 6,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 20276,
        enemyTemplateId: "level_stage_156",
        enemyOverrides: {},
        reward: {
          repeatGold: 69,
          firstClearBonusGold: 60,
          characterExp: 2208
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "157": {
        id: "level_157",
        levelId: 157,
        worldId: 6,
        stageNumberInWorld: 7,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 21931,
        enemyTemplateId: "level_stage_157",
        enemyOverrides: {},
        reward: {
          repeatGold: 70,
          firstClearBonusGold: 60,
          characterExp: 2216
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "158": {
        id: "level_158",
        levelId: 158,
        worldId: 6,
        stageNumberInWorld: 8,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 23586,
        enemyTemplateId: "level_stage_158",
        enemyOverrides: {},
        reward: {
          repeatGold: 72,
          firstClearBonusGold: 60,
          characterExp: 2224
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "159": {
        id: "level_159",
        levelId: 159,
        worldId: 6,
        stageNumberInWorld: 9,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 25241,
        enemyTemplateId: "level_stage_159",
        enemyOverrides: {},
        reward: {
          repeatGold: 73,
          firstClearBonusGold: 60,
          characterExp: 2232
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "160": {
        id: "level_160",
        levelId: 160,
        worldId: 6,
        stageNumberInWorld: 10,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 26897,
        enemyTemplateId: "level_stage_160",
        enemyOverrides: {},
        reward: {
          repeatGold: 75,
          firstClearBonusGold: 60,
          characterExp: 2240
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "161": {
        id: "level_161",
        levelId: 161,
        worldId: 6,
        stageNumberInWorld: 11,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 28552,
        enemyTemplateId: "level_stage_161",
        enemyOverrides: {},
        reward: {
          repeatGold: 76,
          firstClearBonusGold: 60,
          characterExp: 2248
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "162": {
        id: "level_162",
        levelId: 162,
        worldId: 6,
        stageNumberInWorld: 12,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 30207,
        enemyTemplateId: "level_stage_162",
        enemyOverrides: {},
        reward: {
          repeatGold: 78,
          firstClearBonusGold: 60,
          characterExp: 2256
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "163": {
        id: "level_163",
        levelId: 163,
        worldId: 6,
        stageNumberInWorld: 13,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 31862,
        enemyTemplateId: "level_stage_163",
        enemyOverrides: {},
        reward: {
          repeatGold: 79,
          firstClearBonusGold: 60,
          characterExp: 2264
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "164": {
        id: "level_164",
        levelId: 164,
        worldId: 6,
        stageNumberInWorld: 14,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 33517,
        enemyTemplateId: "level_stage_164",
        enemyOverrides: {},
        reward: {
          repeatGold: 81,
          firstClearBonusGold: 60,
          characterExp: 2272
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "165": {
        id: "level_165",
        levelId: 165,
        worldId: 6,
        stageNumberInWorld: 15,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 35172,
        enemyTemplateId: "level_stage_165",
        enemyOverrides: {},
        reward: {
          repeatGold: 82,
          firstClearBonusGold: 60,
          characterExp: 2280
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "166": {
        id: "level_166",
        levelId: 166,
        worldId: 6,
        stageNumberInWorld: 16,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 36828,
        enemyTemplateId: "level_stage_166",
        enemyOverrides: {},
        reward: {
          repeatGold: 84,
          firstClearBonusGold: 60,
          characterExp: 2288
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "167": {
        id: "level_167",
        levelId: 167,
        worldId: 6,
        stageNumberInWorld: 17,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 38483,
        enemyTemplateId: "level_stage_167",
        enemyOverrides: {},
        reward: {
          repeatGold: 85,
          firstClearBonusGold: 60,
          characterExp: 2296
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "168": {
        id: "level_168",
        levelId: 168,
        worldId: 6,
        stageNumberInWorld: 18,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 40138,
        enemyTemplateId: "level_stage_168",
        enemyOverrides: {},
        reward: {
          repeatGold: 87,
          firstClearBonusGold: 60,
          characterExp: 2304
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "169": {
        id: "level_169",
        levelId: 169,
        worldId: 6,
        stageNumberInWorld: 19,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 41793,
        enemyTemplateId: "level_stage_169",
        enemyOverrides: {},
        reward: {
          repeatGold: 88,
          firstClearBonusGold: 60,
          characterExp: 2312
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "170": {
        id: "level_170",
        levelId: 170,
        worldId: 6,
        stageNumberInWorld: 20,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 43448,
        enemyTemplateId: "level_stage_170",
        enemyOverrides: {},
        reward: {
          repeatGold: 90,
          firstClearBonusGold: 60,
          characterExp: 2320
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "171": {
        id: "level_171",
        levelId: 171,
        worldId: 6,
        stageNumberInWorld: 21,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 45103,
        enemyTemplateId: "level_stage_171",
        enemyOverrides: {},
        reward: {
          repeatGold: 91,
          firstClearBonusGold: 60,
          characterExp: 2328
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "172": {
        id: "level_172",
        levelId: 172,
        worldId: 6,
        stageNumberInWorld: 22,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 46759,
        enemyTemplateId: "level_stage_172",
        enemyOverrides: {},
        reward: {
          repeatGold: 93,
          firstClearBonusGold: 60,
          characterExp: 2336
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "173": {
        id: "level_173",
        levelId: 173,
        worldId: 6,
        stageNumberInWorld: 23,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 48414,
        enemyTemplateId: "level_stage_173",
        enemyOverrides: {},
        reward: {
          repeatGold: 94,
          firstClearBonusGold: 60,
          characterExp: 2344
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "174": {
        id: "level_174",
        levelId: 174,
        worldId: 6,
        stageNumberInWorld: 24,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 50069,
        enemyTemplateId: "level_stage_174",
        enemyOverrides: {},
        reward: {
          repeatGold: 96,
          firstClearBonusGold: 60,
          characterExp: 2352
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "175": {
        id: "level_175",
        levelId: 175,
        worldId: 6,
        stageNumberInWorld: 25,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 51724,
        enemyTemplateId: "level_stage_175",
        enemyOverrides: {},
        reward: {
          repeatGold: 97,
          firstClearBonusGold: 60,
          characterExp: 2360
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "176": {
        id: "level_176",
        levelId: 176,
        worldId: 6,
        stageNumberInWorld: 26,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 53379,
        enemyTemplateId: "level_stage_176",
        enemyOverrides: {},
        reward: {
          repeatGold: 99,
          firstClearBonusGold: 60,
          characterExp: 2368
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "177": {
        id: "level_177",
        levelId: 177,
        worldId: 6,
        stageNumberInWorld: 27,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 55034,
        enemyTemplateId: "level_stage_177",
        enemyOverrides: {},
        reward: {
          repeatGold: 100,
          firstClearBonusGold: 60,
          characterExp: 2376
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "178": {
        id: "level_178",
        levelId: 178,
        worldId: 6,
        stageNumberInWorld: 28,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 56690,
        enemyTemplateId: "level_stage_178",
        enemyOverrides: {},
        reward: {
          repeatGold: 102,
          firstClearBonusGold: 60,
          characterExp: 2384
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "179": {
        id: "level_179",
        levelId: 179,
        worldId: 6,
        stageNumberInWorld: 29,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 58345,
        enemyTemplateId: "level_stage_179",
        enemyOverrides: {},
        reward: {
          repeatGold: 103,
          firstClearBonusGold: 60,
          characterExp: 2392
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "180": {
        id: "level_180",
        levelId: 180,
        worldId: 6,
        stageNumberInWorld: 30,
        name: "\u{1F3DB}\uFE0F \uACE0\uB300 \uC720\uC801 \u2014 \uBA54\uB450\uC0AC",
        goalType: "defeat_enemy",
        goalValue: 6e4,
        enemyTemplateId: "level_stage_180",
        enemyOverrides: {},
        reward: {
          repeatGold: 105,
          firstClearBonusGold: 60,
          characterExp: 2400
        },
        unlocksBossRaidStage: 6,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "181": {
        id: "level_181",
        levelId: 181,
        worldId: 7,
        stageNumberInWorld: 1,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 17500,
        enemyTemplateId: "level_stage_181",
        enemyOverrides: {},
        reward: {
          repeatGold: 69,
          firstClearBonusGold: 67,
          characterExp: 2568
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "182": {
        id: "level_182",
        levelId: 182,
        worldId: 7,
        stageNumberInWorld: 2,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 19914,
        enemyTemplateId: "level_stage_182",
        enemyOverrides: {},
        reward: {
          repeatGold: 71,
          firstClearBonusGold: 67,
          characterExp: 2576
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "183": {
        id: "level_183",
        levelId: 183,
        worldId: 7,
        stageNumberInWorld: 3,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 22328,
        enemyTemplateId: "level_stage_183",
        enemyOverrides: {},
        reward: {
          repeatGold: 72,
          firstClearBonusGold: 67,
          characterExp: 2584
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "184": {
        id: "level_184",
        levelId: 184,
        worldId: 7,
        stageNumberInWorld: 4,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 24741,
        enemyTemplateId: "level_stage_184",
        enemyOverrides: {},
        reward: {
          repeatGold: 74,
          firstClearBonusGold: 67,
          characterExp: 2592
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "185": {
        id: "level_185",
        levelId: 185,
        worldId: 7,
        stageNumberInWorld: 5,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 27155,
        enemyTemplateId: "level_stage_185",
        enemyOverrides: {},
        reward: {
          repeatGold: 75,
          firstClearBonusGold: 67,
          characterExp: 2600
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "186": {
        id: "level_186",
        levelId: 186,
        worldId: 7,
        stageNumberInWorld: 6,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 29569,
        enemyTemplateId: "level_stage_186",
        enemyOverrides: {},
        reward: {
          repeatGold: 77,
          firstClearBonusGold: 67,
          characterExp: 2608
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "187": {
        id: "level_187",
        levelId: 187,
        worldId: 7,
        stageNumberInWorld: 7,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 31983,
        enemyTemplateId: "level_stage_187",
        enemyOverrides: {},
        reward: {
          repeatGold: 78,
          firstClearBonusGold: 67,
          characterExp: 2616
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "188": {
        id: "level_188",
        levelId: 188,
        worldId: 7,
        stageNumberInWorld: 8,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 34397,
        enemyTemplateId: "level_stage_188",
        enemyOverrides: {},
        reward: {
          repeatGold: 80,
          firstClearBonusGold: 67,
          characterExp: 2624
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "189": {
        id: "level_189",
        levelId: 189,
        worldId: 7,
        stageNumberInWorld: 9,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 36810,
        enemyTemplateId: "level_stage_189",
        enemyOverrides: {},
        reward: {
          repeatGold: 81,
          firstClearBonusGold: 67,
          characterExp: 2632
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "190": {
        id: "level_190",
        levelId: 190,
        worldId: 7,
        stageNumberInWorld: 10,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 39224,
        enemyTemplateId: "level_stage_190",
        enemyOverrides: {},
        reward: {
          repeatGold: 83,
          firstClearBonusGold: 67,
          characterExp: 2640
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "191": {
        id: "level_191",
        levelId: 191,
        worldId: 7,
        stageNumberInWorld: 11,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 41638,
        enemyTemplateId: "level_stage_191",
        enemyOverrides: {},
        reward: {
          repeatGold: 84,
          firstClearBonusGold: 67,
          characterExp: 2648
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "192": {
        id: "level_192",
        levelId: 192,
        worldId: 7,
        stageNumberInWorld: 12,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 44052,
        enemyTemplateId: "level_stage_192",
        enemyOverrides: {},
        reward: {
          repeatGold: 86,
          firstClearBonusGold: 67,
          characterExp: 2656
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "193": {
        id: "level_193",
        levelId: 193,
        worldId: 7,
        stageNumberInWorld: 13,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 46466,
        enemyTemplateId: "level_stage_193",
        enemyOverrides: {},
        reward: {
          repeatGold: 87,
          firstClearBonusGold: 67,
          characterExp: 2664
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "194": {
        id: "level_194",
        levelId: 194,
        worldId: 7,
        stageNumberInWorld: 14,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 48879,
        enemyTemplateId: "level_stage_194",
        enemyOverrides: {},
        reward: {
          repeatGold: 89,
          firstClearBonusGold: 67,
          characterExp: 2672
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "195": {
        id: "level_195",
        levelId: 195,
        worldId: 7,
        stageNumberInWorld: 15,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 51293,
        enemyTemplateId: "level_stage_195",
        enemyOverrides: {},
        reward: {
          repeatGold: 90,
          firstClearBonusGold: 67,
          characterExp: 2680
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "196": {
        id: "level_196",
        levelId: 196,
        worldId: 7,
        stageNumberInWorld: 16,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 53707,
        enemyTemplateId: "level_stage_196",
        enemyOverrides: {},
        reward: {
          repeatGold: 92,
          firstClearBonusGold: 67,
          characterExp: 2688
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "197": {
        id: "level_197",
        levelId: 197,
        worldId: 7,
        stageNumberInWorld: 17,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 56121,
        enemyTemplateId: "level_stage_197",
        enemyOverrides: {},
        reward: {
          repeatGold: 93,
          firstClearBonusGold: 67,
          characterExp: 2696
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "198": {
        id: "level_198",
        levelId: 198,
        worldId: 7,
        stageNumberInWorld: 18,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 58534,
        enemyTemplateId: "level_stage_198",
        enemyOverrides: {},
        reward: {
          repeatGold: 95,
          firstClearBonusGold: 67,
          characterExp: 2704
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "199": {
        id: "level_199",
        levelId: 199,
        worldId: 7,
        stageNumberInWorld: 19,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 60948,
        enemyTemplateId: "level_stage_199",
        enemyOverrides: {},
        reward: {
          repeatGold: 96,
          firstClearBonusGold: 67,
          characterExp: 2712
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "200": {
        id: "level_200",
        levelId: 200,
        worldId: 7,
        stageNumberInWorld: 20,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 63362,
        enemyTemplateId: "level_stage_200",
        enemyOverrides: {},
        reward: {
          repeatGold: 98,
          firstClearBonusGold: 67,
          characterExp: 2720
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "201": {
        id: "level_201",
        levelId: 201,
        worldId: 7,
        stageNumberInWorld: 21,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 65776,
        enemyTemplateId: "level_stage_201",
        enemyOverrides: {},
        reward: {
          repeatGold: 99,
          firstClearBonusGold: 67,
          characterExp: 2728
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "202": {
        id: "level_202",
        levelId: 202,
        worldId: 7,
        stageNumberInWorld: 22,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 68190,
        enemyTemplateId: "level_stage_202",
        enemyOverrides: {},
        reward: {
          repeatGold: 101,
          firstClearBonusGold: 67,
          characterExp: 2736
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "203": {
        id: "level_203",
        levelId: 203,
        worldId: 7,
        stageNumberInWorld: 23,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 70603,
        enemyTemplateId: "level_stage_203",
        enemyOverrides: {},
        reward: {
          repeatGold: 102,
          firstClearBonusGold: 67,
          characterExp: 2744
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "204": {
        id: "level_204",
        levelId: 204,
        worldId: 7,
        stageNumberInWorld: 24,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 73017,
        enemyTemplateId: "level_stage_204",
        enemyOverrides: {},
        reward: {
          repeatGold: 104,
          firstClearBonusGold: 67,
          characterExp: 2752
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "205": {
        id: "level_205",
        levelId: 205,
        worldId: 7,
        stageNumberInWorld: 25,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 75431,
        enemyTemplateId: "level_stage_205",
        enemyOverrides: {},
        reward: {
          repeatGold: 105,
          firstClearBonusGold: 67,
          characterExp: 2760
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "206": {
        id: "level_206",
        levelId: 206,
        worldId: 7,
        stageNumberInWorld: 26,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 77845,
        enemyTemplateId: "level_stage_206",
        enemyOverrides: {},
        reward: {
          repeatGold: 107,
          firstClearBonusGold: 67,
          characterExp: 2768
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "207": {
        id: "level_207",
        levelId: 207,
        worldId: 7,
        stageNumberInWorld: 27,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 80259,
        enemyTemplateId: "level_stage_207",
        enemyOverrides: {},
        reward: {
          repeatGold: 108,
          firstClearBonusGold: 67,
          characterExp: 2776
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "208": {
        id: "level_208",
        levelId: 208,
        worldId: 7,
        stageNumberInWorld: 28,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 82672,
        enemyTemplateId: "level_stage_208",
        enemyOverrides: {},
        reward: {
          repeatGold: 110,
          firstClearBonusGold: 67,
          characterExp: 2784
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "209": {
        id: "level_209",
        levelId: 209,
        worldId: 7,
        stageNumberInWorld: 29,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 85086,
        enemyTemplateId: "level_stage_209",
        enemyOverrides: {},
        reward: {
          repeatGold: 111,
          firstClearBonusGold: 67,
          characterExp: 2792
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "210": {
        id: "level_210",
        levelId: 210,
        worldId: 7,
        stageNumberInWorld: 30,
        name: "\u{1F3F0} \uC554\uD751 \uC131 \u2014 \uB9AC\uCE58 \uD0B9",
        goalType: "defeat_enemy",
        goalValue: 87500,
        enemyTemplateId: "level_stage_210",
        enemyOverrides: {},
        reward: {
          repeatGold: 113,
          firstClearBonusGold: 67,
          characterExp: 2800
        },
        unlocksBossRaidStage: 7,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "211": {
        id: "level_211",
        levelId: 211,
        worldId: 8,
        stageNumberInWorld: 1,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 25e3,
        enemyTemplateId: "level_stage_211",
        enemyOverrides: {},
        reward: {
          repeatGold: 77,
          firstClearBonusGold: 74,
          characterExp: 2968
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "212": {
        id: "level_212",
        levelId: 212,
        worldId: 8,
        stageNumberInWorld: 2,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 28448,
        enemyTemplateId: "level_stage_212",
        enemyOverrides: {},
        reward: {
          repeatGold: 79,
          firstClearBonusGold: 74,
          characterExp: 2976
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "213": {
        id: "level_213",
        levelId: 213,
        worldId: 8,
        stageNumberInWorld: 3,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 31897,
        enemyTemplateId: "level_stage_213",
        enemyOverrides: {},
        reward: {
          repeatGold: 80,
          firstClearBonusGold: 74,
          characterExp: 2984
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "214": {
        id: "level_214",
        levelId: 214,
        worldId: 8,
        stageNumberInWorld: 4,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 35345,
        enemyTemplateId: "level_stage_214",
        enemyOverrides: {},
        reward: {
          repeatGold: 82,
          firstClearBonusGold: 74,
          characterExp: 2992
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "215": {
        id: "level_215",
        levelId: 215,
        worldId: 8,
        stageNumberInWorld: 5,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 38793,
        enemyTemplateId: "level_stage_215",
        enemyOverrides: {},
        reward: {
          repeatGold: 83,
          firstClearBonusGold: 74,
          characterExp: 3e3
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "216": {
        id: "level_216",
        levelId: 216,
        worldId: 8,
        stageNumberInWorld: 6,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 42241,
        enemyTemplateId: "level_stage_216",
        enemyOverrides: {},
        reward: {
          repeatGold: 85,
          firstClearBonusGold: 74,
          characterExp: 3008
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "217": {
        id: "level_217",
        levelId: 217,
        worldId: 8,
        stageNumberInWorld: 7,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 45690,
        enemyTemplateId: "level_stage_217",
        enemyOverrides: {},
        reward: {
          repeatGold: 86,
          firstClearBonusGold: 74,
          characterExp: 3016
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "218": {
        id: "level_218",
        levelId: 218,
        worldId: 8,
        stageNumberInWorld: 8,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 49138,
        enemyTemplateId: "level_stage_218",
        enemyOverrides: {},
        reward: {
          repeatGold: 88,
          firstClearBonusGold: 74,
          characterExp: 3024
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "219": {
        id: "level_219",
        levelId: 219,
        worldId: 8,
        stageNumberInWorld: 9,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 52586,
        enemyTemplateId: "level_stage_219",
        enemyOverrides: {},
        reward: {
          repeatGold: 89,
          firstClearBonusGold: 74,
          characterExp: 3032
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "220": {
        id: "level_220",
        levelId: 220,
        worldId: 8,
        stageNumberInWorld: 10,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 56034,
        enemyTemplateId: "level_stage_220",
        enemyOverrides: {},
        reward: {
          repeatGold: 91,
          firstClearBonusGold: 74,
          characterExp: 3040
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "221": {
        id: "level_221",
        levelId: 221,
        worldId: 8,
        stageNumberInWorld: 11,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 59483,
        enemyTemplateId: "level_stage_221",
        enemyOverrides: {},
        reward: {
          repeatGold: 92,
          firstClearBonusGold: 74,
          characterExp: 3048
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "222": {
        id: "level_222",
        levelId: 222,
        worldId: 8,
        stageNumberInWorld: 12,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 62931,
        enemyTemplateId: "level_stage_222",
        enemyOverrides: {},
        reward: {
          repeatGold: 94,
          firstClearBonusGold: 74,
          characterExp: 3056
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "223": {
        id: "level_223",
        levelId: 223,
        worldId: 8,
        stageNumberInWorld: 13,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 66379,
        enemyTemplateId: "level_stage_223",
        enemyOverrides: {},
        reward: {
          repeatGold: 95,
          firstClearBonusGold: 74,
          characterExp: 3064
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "224": {
        id: "level_224",
        levelId: 224,
        worldId: 8,
        stageNumberInWorld: 14,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 69828,
        enemyTemplateId: "level_stage_224",
        enemyOverrides: {},
        reward: {
          repeatGold: 97,
          firstClearBonusGold: 74,
          characterExp: 3072
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "225": {
        id: "level_225",
        levelId: 225,
        worldId: 8,
        stageNumberInWorld: 15,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 73276,
        enemyTemplateId: "level_stage_225",
        enemyOverrides: {},
        reward: {
          repeatGold: 98,
          firstClearBonusGold: 74,
          characterExp: 3080
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "226": {
        id: "level_226",
        levelId: 226,
        worldId: 8,
        stageNumberInWorld: 16,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 76724,
        enemyTemplateId: "level_stage_226",
        enemyOverrides: {},
        reward: {
          repeatGold: 100,
          firstClearBonusGold: 74,
          characterExp: 3088
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "227": {
        id: "level_227",
        levelId: 227,
        worldId: 8,
        stageNumberInWorld: 17,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 80172,
        enemyTemplateId: "level_stage_227",
        enemyOverrides: {},
        reward: {
          repeatGold: 101,
          firstClearBonusGold: 74,
          characterExp: 3096
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "228": {
        id: "level_228",
        levelId: 228,
        worldId: 8,
        stageNumberInWorld: 18,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 83621,
        enemyTemplateId: "level_stage_228",
        enemyOverrides: {},
        reward: {
          repeatGold: 103,
          firstClearBonusGold: 74,
          characterExp: 3104
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "229": {
        id: "level_229",
        levelId: 229,
        worldId: 8,
        stageNumberInWorld: 19,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 87069,
        enemyTemplateId: "level_stage_229",
        enemyOverrides: {},
        reward: {
          repeatGold: 104,
          firstClearBonusGold: 74,
          characterExp: 3112
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "230": {
        id: "level_230",
        levelId: 230,
        worldId: 8,
        stageNumberInWorld: 20,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 90517,
        enemyTemplateId: "level_stage_230",
        enemyOverrides: {},
        reward: {
          repeatGold: 106,
          firstClearBonusGold: 74,
          characterExp: 3120
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "231": {
        id: "level_231",
        levelId: 231,
        worldId: 8,
        stageNumberInWorld: 21,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 93966,
        enemyTemplateId: "level_stage_231",
        enemyOverrides: {},
        reward: {
          repeatGold: 107,
          firstClearBonusGold: 74,
          characterExp: 3128
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "232": {
        id: "level_232",
        levelId: 232,
        worldId: 8,
        stageNumberInWorld: 22,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 97414,
        enemyTemplateId: "level_stage_232",
        enemyOverrides: {},
        reward: {
          repeatGold: 109,
          firstClearBonusGold: 74,
          characterExp: 3136
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "233": {
        id: "level_233",
        levelId: 233,
        worldId: 8,
        stageNumberInWorld: 23,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 100862,
        enemyTemplateId: "level_stage_233",
        enemyOverrides: {},
        reward: {
          repeatGold: 110,
          firstClearBonusGold: 74,
          characterExp: 3144
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "234": {
        id: "level_234",
        levelId: 234,
        worldId: 8,
        stageNumberInWorld: 24,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 104310,
        enemyTemplateId: "level_stage_234",
        enemyOverrides: {},
        reward: {
          repeatGold: 112,
          firstClearBonusGold: 74,
          characterExp: 3152
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "235": {
        id: "level_235",
        levelId: 235,
        worldId: 8,
        stageNumberInWorld: 25,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 107759,
        enemyTemplateId: "level_stage_235",
        enemyOverrides: {},
        reward: {
          repeatGold: 113,
          firstClearBonusGold: 74,
          characterExp: 3160
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "236": {
        id: "level_236",
        levelId: 236,
        worldId: 8,
        stageNumberInWorld: 26,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 111207,
        enemyTemplateId: "level_stage_236",
        enemyOverrides: {},
        reward: {
          repeatGold: 115,
          firstClearBonusGold: 74,
          characterExp: 3168
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "237": {
        id: "level_237",
        levelId: 237,
        worldId: 8,
        stageNumberInWorld: 27,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 114655,
        enemyTemplateId: "level_stage_237",
        enemyOverrides: {},
        reward: {
          repeatGold: 116,
          firstClearBonusGold: 74,
          characterExp: 3176
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "238": {
        id: "level_238",
        levelId: 238,
        worldId: 8,
        stageNumberInWorld: 28,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 118103,
        enemyTemplateId: "level_stage_238",
        enemyOverrides: {},
        reward: {
          repeatGold: 118,
          firstClearBonusGold: 74,
          characterExp: 3184
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "239": {
        id: "level_239",
        levelId: 239,
        worldId: 8,
        stageNumberInWorld: 29,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 121552,
        enemyTemplateId: "level_stage_239",
        enemyOverrides: {},
        reward: {
          repeatGold: 119,
          firstClearBonusGold: 74,
          characterExp: 3192
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "240": {
        id: "level_240",
        levelId: 240,
        worldId: 8,
        stageNumberInWorld: 30,
        name: "\u2601\uFE0F \uCC9C\uACF5 \uC12C \u2014 \uCC9C\uB465 \uC6A9",
        goalType: "defeat_enemy",
        goalValue: 125e3,
        enemyTemplateId: "level_stage_240",
        enemyOverrides: {},
        reward: {
          repeatGold: 121,
          firstClearBonusGold: 74,
          characterExp: 3200
        },
        unlocksBossRaidStage: 8,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "241": {
        id: "level_241",
        levelId: 241,
        worldId: 9,
        stageNumberInWorld: 1,
        name: "\u{1F311} \uC2EC\uC5F0 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 36e3,
        enemyTemplateId: "level_stage_241",
        enemyOverrides: {},
        reward: {
          repeatGold: 85,
          firstClearBonusGold: 81,
          characterExp: 3368
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "242": {
        id: "level_242",
        levelId: 242,
        worldId: 9,
        stageNumberInWorld: 2,
        name: "\u{1F311} \uC2EC\uC5F0 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 40966,
        enemyTemplateId: "level_stage_242",
        enemyOverrides: {},
        reward: {
          repeatGold: 87,
          firstClearBonusGold: 81,
          characterExp: 3376
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "243": {
        id: "level_243",
        levelId: 243,
        worldId: 9,
        stageNumberInWorld: 3,
        name: "\u{1F311} \uC2EC\uC5F0 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 45931,
        enemyTemplateId: "level_stage_243",
        enemyOverrides: {},
        reward: {
          repeatGold: 88,
          firstClearBonusGold: 81,
          characterExp: 3384
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "244": {
        id: "level_244",
        levelId: 244,
        worldId: 9,
        stageNumberInWorld: 4,
        name: "\u{1F311} \uC2EC\uC5F0 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 50897,
        enemyTemplateId: "level_stage_244",
        enemyOverrides: {},
        reward: {
          repeatGold: 90,
          firstClearBonusGold: 81,
          characterExp: 3392
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "245": {
        id: "level_245",
        levelId: 245,
        worldId: 9,
        stageNumberInWorld: 5,
        name: "\u{1F311} \uC2EC\uC5F0 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 55862,
        enemyTemplateId: "level_stage_245",
        enemyOverrides: {},
        reward: {
          repeatGold: 91,
          firstClearBonusGold: 81,
          characterExp: 3400
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "246": {
        id: "level_246",
        levelId: 246,
        worldId: 9,
        stageNumberInWorld: 6,
        name: "\u{1F311} \uC2EC\uC5F0 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 60828,
        enemyTemplateId: "level_stage_246",
        enemyOverrides: {},
        reward: {
          repeatGold: 93,
          firstClearBonusGold: 81,
          characterExp: 3408
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "247": {
        id: "level_247",
        levelId: 247,
        worldId: 9,
        stageNumberInWorld: 7,
        name: "\u{1F311} \uC2EC\uC5F0 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 65793,
        enemyTemplateId: "level_stage_247",
        enemyOverrides: {},
        reward: {
          repeatGold: 94,
          firstClearBonusGold: 81,
          characterExp: 3416
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "248": {
        id: "level_248",
        levelId: 248,
        worldId: 9,
        stageNumberInWorld: 8,
        name: "\u{1F311} \uC2EC\uC5F0 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 70759,
        enemyTemplateId: "level_stage_248",
        enemyOverrides: {},
        reward: {
          repeatGold: 96,
          firstClearBonusGold: 81,
          characterExp: 3424
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "249": {
        id: "level_249",
        levelId: 249,
        worldId: 9,
        stageNumberInWorld: 9,
        name: "\u{1F311} \uC2EC\uC5F0 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 75724,
        enemyTemplateId: "level_stage_249",
        enemyOverrides: {},
        reward: {
          repeatGold: 97,
          firstClearBonusGold: 81,
          characterExp: 3432
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "250": {
        id: "level_250",
        levelId: 250,
        worldId: 9,
        stageNumberInWorld: 10,
        name: "\u{1F311} \uC2EC\uC5F0 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 80690,
        enemyTemplateId: "level_stage_250",
        enemyOverrides: {},
        reward: {
          repeatGold: 99,
          firstClearBonusGold: 81,
          characterExp: 3440
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "251": {
        id: "level_251",
        levelId: 251,
        worldId: 9,
        stageNumberInWorld: 11,
        name: "\u{1F311} \uC2EC\uC5F0 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 85655,
        enemyTemplateId: "level_stage_251",
        enemyOverrides: {},
        reward: {
          repeatGold: 100,
          firstClearBonusGold: 81,
          characterExp: 3448
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "252": {
        id: "level_252",
        levelId: 252,
        worldId: 9,
        stageNumberInWorld: 12,
        name: "\u{1F311} \uC2EC\uC5F0 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 90621,
        enemyTemplateId: "level_stage_252",
        enemyOverrides: {},
        reward: {
          repeatGold: 102,
          firstClearBonusGold: 81,
          characterExp: 3456
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "253": {
        id: "level_253",
        levelId: 253,
        worldId: 9,
        stageNumberInWorld: 13,
        name: "\u{1F311} \uC2EC\uC5F0 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 95586,
        enemyTemplateId: "level_stage_253",
        enemyOverrides: {},
        reward: {
          repeatGold: 103,
          firstClearBonusGold: 81,
          characterExp: 3464
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "254": {
        id: "level_254",
        levelId: 254,
        worldId: 9,
        stageNumberInWorld: 14,
        name: "\u{1F311} \uC2EC\uC5F0 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 100552,
        enemyTemplateId: "level_stage_254",
        enemyOverrides: {},
        reward: {
          repeatGold: 105,
          firstClearBonusGold: 81,
          characterExp: 3472
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "255": {
        id: "level_255",
        levelId: 255,
        worldId: 9,
        stageNumberInWorld: 15,
        name: "\u{1F311} \uC2EC\uC5F0 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 105517,
        enemyTemplateId: "level_stage_255",
        enemyOverrides: {},
        reward: {
          repeatGold: 106,
          firstClearBonusGold: 81,
          characterExp: 3480
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "256": {
        id: "level_256",
        levelId: 256,
        worldId: 9,
        stageNumberInWorld: 16,
        name: "\u{1F311} \uC2EC\uC5F0 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 110483,
        enemyTemplateId: "level_stage_256",
        enemyOverrides: {},
        reward: {
          repeatGold: 108,
          firstClearBonusGold: 81,
          characterExp: 3488
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "257": {
        id: "level_257",
        levelId: 257,
        worldId: 9,
        stageNumberInWorld: 17,
        name: "\u{1F311} \uC2EC\uC5F0 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 115448,
        enemyTemplateId: "level_stage_257",
        enemyOverrides: {},
        reward: {
          repeatGold: 109,
          firstClearBonusGold: 81,
          characterExp: 3496
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "258": {
        id: "level_258",
        levelId: 258,
        worldId: 9,
        stageNumberInWorld: 18,
        name: "\u{1F311} \uC2EC\uC5F0 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 120414,
        enemyTemplateId: "level_stage_258",
        enemyOverrides: {},
        reward: {
          repeatGold: 111,
          firstClearBonusGold: 81,
          characterExp: 3504
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "259": {
        id: "level_259",
        levelId: 259,
        worldId: 9,
        stageNumberInWorld: 19,
        name: "\u{1F311} \uC2EC\uC5F0 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 125379,
        enemyTemplateId: "level_stage_259",
        enemyOverrides: {},
        reward: {
          repeatGold: 112,
          firstClearBonusGold: 81,
          characterExp: 3512
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "260": {
        id: "level_260",
        levelId: 260,
        worldId: 9,
        stageNumberInWorld: 20,
        name: "\u{1F311} \uC2EC\uC5F0 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 130345,
        enemyTemplateId: "level_stage_260",
        enemyOverrides: {},
        reward: {
          repeatGold: 114,
          firstClearBonusGold: 81,
          characterExp: 3520
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "261": {
        id: "level_261",
        levelId: 261,
        worldId: 9,
        stageNumberInWorld: 21,
        name: "\u{1F311} \uC2EC\uC5F0 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 135310,
        enemyTemplateId: "level_stage_261",
        enemyOverrides: {},
        reward: {
          repeatGold: 115,
          firstClearBonusGold: 81,
          characterExp: 3528
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "262": {
        id: "level_262",
        levelId: 262,
        worldId: 9,
        stageNumberInWorld: 22,
        name: "\u{1F311} \uC2EC\uC5F0 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 140276,
        enemyTemplateId: "level_stage_262",
        enemyOverrides: {},
        reward: {
          repeatGold: 117,
          firstClearBonusGold: 81,
          characterExp: 3536
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "263": {
        id: "level_263",
        levelId: 263,
        worldId: 9,
        stageNumberInWorld: 23,
        name: "\u{1F311} \uC2EC\uC5F0 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 145241,
        enemyTemplateId: "level_stage_263",
        enemyOverrides: {},
        reward: {
          repeatGold: 118,
          firstClearBonusGold: 81,
          characterExp: 3544
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "264": {
        id: "level_264",
        levelId: 264,
        worldId: 9,
        stageNumberInWorld: 24,
        name: "\u{1F311} \uC2EC\uC5F0 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 150207,
        enemyTemplateId: "level_stage_264",
        enemyOverrides: {},
        reward: {
          repeatGold: 120,
          firstClearBonusGold: 81,
          characterExp: 3552
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "265": {
        id: "level_265",
        levelId: 265,
        worldId: 9,
        stageNumberInWorld: 25,
        name: "\u{1F311} \uC2EC\uC5F0 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 155172,
        enemyTemplateId: "level_stage_265",
        enemyOverrides: {},
        reward: {
          repeatGold: 121,
          firstClearBonusGold: 81,
          characterExp: 3560
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "266": {
        id: "level_266",
        levelId: 266,
        worldId: 9,
        stageNumberInWorld: 26,
        name: "\u{1F311} \uC2EC\uC5F0 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 160138,
        enemyTemplateId: "level_stage_266",
        enemyOverrides: {},
        reward: {
          repeatGold: 123,
          firstClearBonusGold: 81,
          characterExp: 3568
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "267": {
        id: "level_267",
        levelId: 267,
        worldId: 9,
        stageNumberInWorld: 27,
        name: "\u{1F311} \uC2EC\uC5F0 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 165103,
        enemyTemplateId: "level_stage_267",
        enemyOverrides: {},
        reward: {
          repeatGold: 124,
          firstClearBonusGold: 81,
          characterExp: 3576
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "268": {
        id: "level_268",
        levelId: 268,
        worldId: 9,
        stageNumberInWorld: 28,
        name: "\u{1F311} \uC2EC\uC5F0 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 170069,
        enemyTemplateId: "level_stage_268",
        enemyOverrides: {},
        reward: {
          repeatGold: 126,
          firstClearBonusGold: 81,
          characterExp: 3584
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "269": {
        id: "level_269",
        levelId: 269,
        worldId: 9,
        stageNumberInWorld: 29,
        name: "\u{1F311} \uC2EC\uC5F0 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 175034,
        enemyTemplateId: "level_stage_269",
        enemyOverrides: {},
        reward: {
          repeatGold: 127,
          firstClearBonusGold: 81,
          characterExp: 3592
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "270": {
        id: "level_270",
        levelId: 270,
        worldId: 9,
        stageNumberInWorld: 30,
        name: "\u{1F311} \uC2EC\uC5F0 \u2014 \uC2EC\uC5F0\uC758 \uAD70\uC8FC",
        goalType: "defeat_enemy",
        goalValue: 18e4,
        enemyTemplateId: "level_stage_270",
        enemyOverrides: {},
        reward: {
          repeatGold: 129,
          firstClearBonusGold: 81,
          characterExp: 3600
        },
        unlocksBossRaidStage: 9,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "271": {
        id: "level_271",
        levelId: 271,
        worldId: 10,
        stageNumberInWorld: 1,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC785\uAD6C 1",
        goalType: "defeat_enemy",
        goalValue: 5e4,
        enemyTemplateId: "level_stage_271",
        enemyOverrides: {},
        reward: {
          repeatGold: 93,
          firstClearBonusGold: 88,
          characterExp: 3768
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "272": {
        id: "level_272",
        levelId: 272,
        worldId: 10,
        stageNumberInWorld: 2,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uCD08\uC785 2",
        goalType: "defeat_enemy",
        goalValue: 56897,
        enemyTemplateId: "level_stage_272",
        enemyOverrides: {},
        reward: {
          repeatGold: 95,
          firstClearBonusGold: 88,
          characterExp: 3776
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "273": {
        id: "level_273",
        levelId: 273,
        worldId: 10,
        stageNumberInWorld: 3,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC804\uCD08 3",
        goalType: "defeat_enemy",
        goalValue: 63793,
        enemyTemplateId: "level_stage_273",
        enemyOverrides: {},
        reward: {
          repeatGold: 96,
          firstClearBonusGold: 88,
          characterExp: 3784
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "274": {
        id: "level_274",
        levelId: 274,
        worldId: 10,
        stageNumberInWorld: 4,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC678\uACFD 4",
        goalType: "defeat_enemy",
        goalValue: 70690,
        enemyTemplateId: "level_stage_274",
        enemyOverrides: {},
        reward: {
          repeatGold: 98,
          firstClearBonusGold: 88,
          characterExp: 3792
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "275": {
        id: "level_275",
        levelId: 275,
        worldId: 10,
        stageNumberInWorld: 5,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC811\uACBD 5",
        goalType: "defeat_enemy",
        goalValue: 77586,
        enemyTemplateId: "level_stage_275",
        enemyOverrides: {},
        reward: {
          repeatGold: 99,
          firstClearBonusGold: 88,
          characterExp: 3800
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "276": {
        id: "level_276",
        levelId: 276,
        worldId: 10,
        stageNumberInWorld: 6,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC785\uAD6C 6",
        goalType: "defeat_enemy",
        goalValue: 84483,
        enemyTemplateId: "level_stage_276",
        enemyOverrides: {},
        reward: {
          repeatGold: 101,
          firstClearBonusGold: 88,
          characterExp: 3808
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "277": {
        id: "level_277",
        levelId: 277,
        worldId: 10,
        stageNumberInWorld: 7,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uCD08\uC785 7",
        goalType: "defeat_enemy",
        goalValue: 91379,
        enemyTemplateId: "level_stage_277",
        enemyOverrides: {},
        reward: {
          repeatGold: 102,
          firstClearBonusGold: 88,
          characterExp: 3816
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "278": {
        id: "level_278",
        levelId: 278,
        worldId: 10,
        stageNumberInWorld: 8,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC804\uCD08 8",
        goalType: "defeat_enemy",
        goalValue: 98276,
        enemyTemplateId: "level_stage_278",
        enemyOverrides: {},
        reward: {
          repeatGold: 104,
          firstClearBonusGold: 88,
          characterExp: 3824
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "279": {
        id: "level_279",
        levelId: 279,
        worldId: 10,
        stageNumberInWorld: 9,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC678\uACFD 9",
        goalType: "defeat_enemy",
        goalValue: 105172,
        enemyTemplateId: "level_stage_279",
        enemyOverrides: {},
        reward: {
          repeatGold: 105,
          firstClearBonusGold: 88,
          characterExp: 3832
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "280": {
        id: "level_280",
        levelId: 280,
        worldId: 10,
        stageNumberInWorld: 10,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC811\uACBD 10",
        goalType: "defeat_enemy",
        goalValue: 112069,
        enemyTemplateId: "level_stage_280",
        enemyOverrides: {},
        reward: {
          repeatGold: 107,
          firstClearBonusGold: 88,
          characterExp: 3840
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "281": {
        id: "level_281",
        levelId: 281,
        worldId: 10,
        stageNumberInWorld: 11,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC911\uC2EC\uBD80 11",
        goalType: "defeat_enemy",
        goalValue: 118966,
        enemyTemplateId: "level_stage_281",
        enemyOverrides: {},
        reward: {
          repeatGold: 108,
          firstClearBonusGold: 88,
          characterExp: 3848
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "282": {
        id: "level_282",
        levelId: 282,
        worldId: 10,
        stageNumberInWorld: 12,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uD575\uC2EC 12",
        goalType: "defeat_enemy",
        goalValue: 125862,
        enemyTemplateId: "level_stage_282",
        enemyOverrides: {},
        reward: {
          repeatGold: 110,
          firstClearBonusGold: 88,
          characterExp: 3856
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "283": {
        id: "level_283",
        levelId: 283,
        worldId: 10,
        stageNumberInWorld: 13,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC2EC\uCE35\uBD80 13",
        goalType: "defeat_enemy",
        goalValue: 132759,
        enemyTemplateId: "level_stage_283",
        enemyOverrides: {},
        reward: {
          repeatGold: 111,
          firstClearBonusGold: 88,
          characterExp: 3864
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "284": {
        id: "level_284",
        levelId: 284,
        worldId: 10,
        stageNumberInWorld: 14,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC694\uC0C8 14",
        goalType: "defeat_enemy",
        goalValue: 139655,
        enemyTemplateId: "level_stage_284",
        enemyOverrides: {},
        reward: {
          repeatGold: 113,
          firstClearBonusGold: 88,
          characterExp: 3872
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "285": {
        id: "level_285",
        levelId: 285,
        worldId: 10,
        stageNumberInWorld: 15,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uBCF8\uAC70\uC9C0 15",
        goalType: "defeat_enemy",
        goalValue: 146552,
        enemyTemplateId: "level_stage_285",
        enemyOverrides: {},
        reward: {
          repeatGold: 114,
          firstClearBonusGold: 88,
          characterExp: 3880
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "286": {
        id: "level_286",
        levelId: 286,
        worldId: 10,
        stageNumberInWorld: 16,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC911\uC2EC\uBD80 16",
        goalType: "defeat_enemy",
        goalValue: 153448,
        enemyTemplateId: "level_stage_286",
        enemyOverrides: {},
        reward: {
          repeatGold: 116,
          firstClearBonusGold: 88,
          characterExp: 3888
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "287": {
        id: "level_287",
        levelId: 287,
        worldId: 10,
        stageNumberInWorld: 17,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uD575\uC2EC 17",
        goalType: "defeat_enemy",
        goalValue: 160345,
        enemyTemplateId: "level_stage_287",
        enemyOverrides: {},
        reward: {
          repeatGold: 117,
          firstClearBonusGold: 88,
          characterExp: 3896
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "288": {
        id: "level_288",
        levelId: 288,
        worldId: 10,
        stageNumberInWorld: 18,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC2EC\uCE35\uBD80 18",
        goalType: "defeat_enemy",
        goalValue: 167241,
        enemyTemplateId: "level_stage_288",
        enemyOverrides: {},
        reward: {
          repeatGold: 119,
          firstClearBonusGold: 88,
          characterExp: 3904
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "289": {
        id: "level_289",
        levelId: 289,
        worldId: 10,
        stageNumberInWorld: 19,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC694\uC0C8 19",
        goalType: "defeat_enemy",
        goalValue: 174138,
        enemyTemplateId: "level_stage_289",
        enemyOverrides: {},
        reward: {
          repeatGold: 120,
          firstClearBonusGold: 88,
          characterExp: 3912
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "290": {
        id: "level_290",
        levelId: 290,
        worldId: 10,
        stageNumberInWorld: 20,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uBCF8\uAC70\uC9C0 20",
        goalType: "defeat_enemy",
        goalValue: 181034,
        enemyTemplateId: "level_stage_290",
        enemyOverrides: {},
        reward: {
          repeatGold: 122,
          firstClearBonusGold: 88,
          characterExp: 3920
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "291": {
        id: "level_291",
        levelId: 291,
        worldId: 10,
        stageNumberInWorld: 21,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uACB0\uC804 \uAD6C\uC5ED 21",
        goalType: "defeat_enemy",
        goalValue: 187931,
        enemyTemplateId: "level_stage_291",
        enemyOverrides: {},
        reward: {
          repeatGold: 123,
          firstClearBonusGold: 88,
          characterExp: 3928
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "292": {
        id: "level_292",
        levelId: 292,
        worldId: 10,
        stageNumberInWorld: 22,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uBCF4\uC2A4 \uC601\uC5ED 22",
        goalType: "defeat_enemy",
        goalValue: 194828,
        enemyTemplateId: "level_stage_292",
        enemyOverrides: {},
        reward: {
          repeatGold: 125,
          firstClearBonusGold: 88,
          characterExp: 3936
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "293": {
        id: "level_293",
        levelId: 293,
        worldId: 10,
        stageNumberInWorld: 23,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC655\uC758 \uAC70\uCC98 23",
        goalType: "defeat_enemy",
        goalValue: 201724,
        enemyTemplateId: "level_stage_293",
        enemyOverrides: {},
        reward: {
          repeatGold: 126,
          firstClearBonusGold: 88,
          characterExp: 3944
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "294": {
        id: "level_294",
        levelId: 294,
        worldId: 10,
        stageNumberInWorld: 24,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uACB0\uC804 \uAD6C\uC5ED 24",
        goalType: "defeat_enemy",
        goalValue: 208621,
        enemyTemplateId: "level_stage_294",
        enemyOverrides: {},
        reward: {
          repeatGold: 128,
          firstClearBonusGold: 88,
          characterExp: 3952
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "295": {
        id: "level_295",
        levelId: 295,
        worldId: 10,
        stageNumberInWorld: 25,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uBCF4\uC2A4 \uC601\uC5ED 25",
        goalType: "defeat_enemy",
        goalValue: 215517,
        enemyTemplateId: "level_stage_295",
        enemyOverrides: {},
        reward: {
          repeatGold: 129,
          firstClearBonusGold: 88,
          characterExp: 3960
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "296": {
        id: "level_296",
        levelId: 296,
        worldId: 10,
        stageNumberInWorld: 26,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC655\uC758 \uAC70\uCC98 26",
        goalType: "defeat_enemy",
        goalValue: 222414,
        enemyTemplateId: "level_stage_296",
        enemyOverrides: {},
        reward: {
          repeatGold: 131,
          firstClearBonusGold: 88,
          characterExp: 3968
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "297": {
        id: "level_297",
        levelId: 297,
        worldId: 10,
        stageNumberInWorld: 27,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uACB0\uC804 \uAD6C\uC5ED 27",
        goalType: "defeat_enemy",
        goalValue: 229310,
        enemyTemplateId: "level_stage_297",
        enemyOverrides: {},
        reward: {
          repeatGold: 132,
          firstClearBonusGold: 88,
          characterExp: 3976
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "298": {
        id: "level_298",
        levelId: 298,
        worldId: 10,
        stageNumberInWorld: 28,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uBCF4\uC2A4 \uC601\uC5ED 28",
        goalType: "defeat_enemy",
        goalValue: 236207,
        enemyTemplateId: "level_stage_298",
        enemyOverrides: {},
        reward: {
          repeatGold: 134,
          firstClearBonusGold: 88,
          characterExp: 3984
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "299": {
        id: "level_299",
        levelId: 299,
        worldId: 10,
        stageNumberInWorld: 29,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \uC655\uC758 \uAC70\uCC98 29",
        goalType: "defeat_enemy",
        goalValue: 243103,
        enemyTemplateId: "level_stage_299",
        enemyOverrides: {},
        reward: {
          repeatGold: 135,
          firstClearBonusGold: 88,
          characterExp: 3992
        },
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      },
      "300": {
        id: "level_300",
        levelId: 300,
        worldId: 10,
        stageNumberInWorld: 30,
        name: "\u{1F30B} \uD654\uC0B0\uC9C0\uB300 \u2014 \uB808\uB4DC \uB4DC\uB798\uACE4",
        goalType: "defeat_enemy",
        goalValue: 25e4,
        enemyTemplateId: "level_stage_300",
        enemyOverrides: {},
        reward: {
          repeatGold: 137,
          firstClearBonusGold: 88,
          characterExp: 4e3
        },
        unlocksBossRaidStage: 10,
        enabled: true,
        background: {
          assetKey: null,
          tintColor: "#000000",
          tintOpacity: 0,
          removeImage: false
        }
      }
    },
    raids: {
      normal: {
        "1": {
          id: "normal_1",
          raidType: "normal",
          stage: 1,
          worldId: null,
          name: "raid.boss1",
          encounterTemplateId: "raid_normal_stage_1",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 15,
            repeatDiamondReward: 1
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "2": {
          id: "normal_2",
          raidType: "normal",
          stage: 2,
          worldId: null,
          name: "raid.boss2",
          encounterTemplateId: "raid_normal_stage_2",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 20,
            repeatDiamondReward: 1
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "3": {
          id: "normal_3",
          raidType: "normal",
          stage: 3,
          worldId: null,
          name: "raid.boss3",
          encounterTemplateId: "raid_normal_stage_3",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 30,
            repeatDiamondReward: 2
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "4": {
          id: "normal_4",
          raidType: "normal",
          stage: 4,
          worldId: null,
          name: "raid.boss4",
          encounterTemplateId: "raid_normal_stage_4",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 45,
            repeatDiamondReward: 2
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "5": {
          id: "normal_5",
          raidType: "normal",
          stage: 5,
          worldId: null,
          name: "raid.boss5",
          encounterTemplateId: "raid_normal_stage_5",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 60,
            repeatDiamondReward: 3
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "6": {
          id: "normal_6",
          raidType: "normal",
          stage: 6,
          worldId: null,
          name: "raid.boss6",
          encounterTemplateId: "raid_normal_stage_6",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 80,
            repeatDiamondReward: 4
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "7": {
          id: "normal_7",
          raidType: "normal",
          stage: 7,
          worldId: null,
          name: "raid.boss7",
          encounterTemplateId: "raid_normal_stage_7",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 100,
            repeatDiamondReward: 5
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "8": {
          id: "normal_8",
          raidType: "normal",
          stage: 8,
          worldId: null,
          name: "raid.boss8",
          encounterTemplateId: "raid_normal_stage_8",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 130,
            repeatDiamondReward: 6
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "9": {
          id: "normal_9",
          raidType: "normal",
          stage: 9,
          worldId: null,
          name: "raid.boss9",
          encounterTemplateId: "raid_normal_stage_9",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 170,
            repeatDiamondReward: 8
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "10": {
          id: "normal_10",
          raidType: "normal",
          stage: 10,
          worldId: null,
          name: "raid.boss10",
          encounterTemplateId: "raid_normal_stage_10",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 220,
            repeatDiamondReward: 10
          },
          timeLimitMs: 9e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        }
      },
      boss: {
        "1": {
          id: "boss_1",
          raidType: "boss",
          stage: 1,
          worldId: 1,
          name: "raid.boss1",
          encounterTemplateId: "raid_boss_stage_1",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 15,
            repeatDiamondReward: 1
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "2": {
          id: "boss_2",
          raidType: "boss",
          stage: 2,
          worldId: 2,
          name: "raid.boss2",
          encounterTemplateId: "raid_boss_stage_2",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 20,
            repeatDiamondReward: 1
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "3": {
          id: "boss_3",
          raidType: "boss",
          stage: 3,
          worldId: 3,
          name: "raid.boss3",
          encounterTemplateId: "raid_boss_stage_3",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 30,
            repeatDiamondReward: 2
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "4": {
          id: "boss_4",
          raidType: "boss",
          stage: 4,
          worldId: 4,
          name: "raid.boss4",
          encounterTemplateId: "raid_boss_stage_4",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 45,
            repeatDiamondReward: 2
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "5": {
          id: "boss_5",
          raidType: "boss",
          stage: 5,
          worldId: 5,
          name: "raid.boss5",
          encounterTemplateId: "raid_boss_stage_5",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 60,
            repeatDiamondReward: 3
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "6": {
          id: "boss_6",
          raidType: "boss",
          stage: 6,
          worldId: 6,
          name: "raid.boss6",
          encounterTemplateId: "raid_boss_stage_6",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 80,
            repeatDiamondReward: 4
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "7": {
          id: "boss_7",
          raidType: "boss",
          stage: 7,
          worldId: 7,
          name: "raid.boss7",
          encounterTemplateId: "raid_boss_stage_7",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 100,
            repeatDiamondReward: 5
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "8": {
          id: "boss_8",
          raidType: "boss",
          stage: 8,
          worldId: 8,
          name: "raid.boss8",
          encounterTemplateId: "raid_boss_stage_8",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 130,
            repeatDiamondReward: 6
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "9": {
          id: "boss_9",
          raidType: "boss",
          stage: 9,
          worldId: 9,
          name: "raid.boss9",
          encounterTemplateId: "raid_boss_stage_9",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 170,
            repeatDiamondReward: 8
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        },
        "10": {
          id: "boss_10",
          raidType: "boss",
          stage: 10,
          worldId: 10,
          name: "raid.boss10",
          encounterTemplateId: "raid_boss_stage_10",
          encounterOverrides: {},
          reward: {
            firstClearDiamondReward: 220,
            repeatDiamondReward: 10
          },
          timeLimitMs: 6e5,
          raidWindowHours: 4,
          joinWindowMinutes: 10,
          maxParticipants: 30,
          enabled: true,
          background: {
            assetKey: null,
            tintColor: "#000000",
            tintOpacity: 0,
            removeImage: false
          }
        }
      }
    },
    encounters: {
      level_stage_1: {
        id: "level_stage_1",
        kind: "level",
        displayName: "\uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 800,
        baseAttack: 24,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_2: {
        id: "level_stage_2",
        kind: "level",
        displayName: "\uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 910,
        baseAttack: 25,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_3: {
        id: "level_stage_3",
        kind: "level",
        displayName: "\uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 1021,
        baseAttack: 26,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_4: {
        id: "level_stage_4",
        kind: "level",
        displayName: "\uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 1131,
        baseAttack: 28,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_5: {
        id: "level_stage_5",
        kind: "level",
        displayName: "\uCD08\uC6D0 \uD1A0\uB07C",
        tier: "elite",
        monsterName: "\uCD08\uC6D0 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#86efac",
        baseHp: 1241,
        baseAttack: 29,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_6: {
        id: "level_stage_6",
        kind: "level",
        displayName: "\uCD08\uC6D0 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uCD08\uC6D0 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#86efac",
        baseHp: 1352,
        baseAttack: 30,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_7: {
        id: "level_stage_7",
        kind: "level",
        displayName: "\uCD08\uC6D0 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uCD08\uC6D0 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#86efac",
        baseHp: 1462,
        baseAttack: 31,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_8: {
        id: "level_stage_8",
        kind: "level",
        displayName: "\uBC84\uC12F \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uBC84\uC12F \uBCD1\uC0AC",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 1572,
        baseAttack: 32,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_9: {
        id: "level_stage_9",
        kind: "level",
        displayName: "\uBC84\uC12F \uBCD1\uC0AC",
        tier: "elite",
        monsterName: "\uBC84\uC12F \uBCD1\uC0AC",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 1683,
        baseAttack: 33,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_10: {
        id: "level_stage_10",
        kind: "level",
        displayName: "\uBC84\uC12F \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uBC84\uC12F \uBCD1\uC0AC",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 1793,
        baseAttack: 34,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_11: {
        id: "level_stage_11",
        kind: "level",
        displayName: "\uC11D\uC0C1 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uC0C1 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#9ca3af",
        baseHp: 1903,
        baseAttack: 29,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_12: {
        id: "level_stage_12",
        kind: "level",
        displayName: "\uC11D\uC0C1 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uC0C1 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#9ca3af",
        baseHp: 2014,
        baseAttack: 30,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_13: {
        id: "level_stage_13",
        kind: "level",
        displayName: "\uC11D\uC0C1 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uC0C1 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#9ca3af",
        baseHp: 2124,
        baseAttack: 31,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_14: {
        id: "level_stage_14",
        kind: "level",
        displayName: "\uC11D\uC0C1 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uC0C1 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#9ca3af",
        baseHp: 2234,
        baseAttack: 32,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_15: {
        id: "level_stage_15",
        kind: "level",
        displayName: "\uB369\uAD74 \uC0DD\uBB3C",
        tier: "elite",
        monsterName: "\uB369\uAD74 \uC0DD\uBB3C",
        monsterEmoji: "\u{1F33F}",
        monsterColor: "#4ade80",
        baseHp: 2345,
        baseAttack: 33,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_16: {
        id: "level_stage_16",
        kind: "level",
        displayName: "\uB369\uAD74 \uC0DD\uBB3C",
        tier: "normal",
        monsterName: "\uB369\uAD74 \uC0DD\uBB3C",
        monsterEmoji: "\u{1F33F}",
        monsterColor: "#4ade80",
        baseHp: 2455,
        baseAttack: 34,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_17: {
        id: "level_stage_17",
        kind: "level",
        displayName: "\uB369\uAD74 \uC0DD\uBB3C",
        tier: "normal",
        monsterName: "\uB369\uAD74 \uC0DD\uBB3C",
        monsterEmoji: "\u{1F33F}",
        monsterColor: "#4ade80",
        baseHp: 2566,
        baseAttack: 35,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_18: {
        id: "level_stage_18",
        kind: "level",
        displayName: "\uC232\uC758 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC232\uC758 \uC815\uB839",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#86efac",
        baseHp: 2676,
        baseAttack: 36,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_19: {
        id: "level_stage_19",
        kind: "level",
        displayName: "\uC232\uC758 \uC815\uB839",
        tier: "elite",
        monsterName: "\uC232\uC758 \uC815\uB839",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#86efac",
        baseHp: 2786,
        baseAttack: 37,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_20: {
        id: "level_stage_20",
        kind: "level",
        displayName: "\uC232\uC758 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC232\uC758 \uC815\uB839",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#86efac",
        baseHp: 2897,
        baseAttack: 39,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_21: {
        id: "level_stage_21",
        kind: "level",
        displayName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#16a34a",
        baseHp: 3007,
        baseAttack: 33,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_22: {
        id: "level_stage_22",
        kind: "level",
        displayName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#16a34a",
        baseHp: 3117,
        baseAttack: 34,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_23: {
        id: "level_stage_23",
        kind: "level",
        displayName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#16a34a",
        baseHp: 3228,
        baseAttack: 35,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_24: {
        id: "level_stage_24",
        kind: "level",
        displayName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#16a34a",
        baseHp: 3338,
        baseAttack: 36,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_25: {
        id: "level_stage_25",
        kind: "level",
        displayName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        tier: "elite",
        monsterName: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#16a34a",
        baseHp: 3448,
        baseAttack: 37,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_26: {
        id: "level_stage_26",
        kind: "level",
        displayName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        tier: "normal",
        monsterName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#4ade80",
        baseHp: 3559,
        baseAttack: 39,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_27: {
        id: "level_stage_27",
        kind: "level",
        displayName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        tier: "normal",
        monsterName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#4ade80",
        baseHp: 3669,
        baseAttack: 40,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_28: {
        id: "level_stage_28",
        kind: "level",
        displayName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        tier: "normal",
        monsterName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#4ade80",
        baseHp: 3779,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_29: {
        id: "level_stage_29",
        kind: "level",
        displayName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        tier: "elite",
        monsterName: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#4ade80",
        baseHp: 3890,
        baseAttack: 42,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_30: {
        id: "level_stage_30",
        kind: "level",
        displayName: "\uD0B9\uC2AC\uB77C\uC784",
        tier: "boss",
        monsterName: "\uD0B9\uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#22c55e",
        baseHp: 4e3,
        baseAttack: 54,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_31: {
        id: "level_stage_31",
        kind: "level",
        displayName: "\uBAA8\uB798 \uAC8C",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#fbbf24",
        baseHp: 1800,
        baseAttack: 30,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_32: {
        id: "level_stage_32",
        kind: "level",
        displayName: "\uBAA8\uB798 \uAC8C",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#fbbf24",
        baseHp: 2048,
        baseAttack: 31,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_33: {
        id: "level_stage_33",
        kind: "level",
        displayName: "\uBAA8\uB798 \uAC8C",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#fbbf24",
        baseHp: 2297,
        baseAttack: 32,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_34: {
        id: "level_stage_34",
        kind: "level",
        displayName: "\uBAA8\uB798 \uAC8C",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#fbbf24",
        baseHp: 2545,
        baseAttack: 33,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_35: {
        id: "level_stage_35",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        tier: "elite",
        monsterName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f59e0b",
        baseHp: 2793,
        baseAttack: 34,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_36: {
        id: "level_stage_36",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f59e0b",
        baseHp: 3041,
        baseAttack: 35,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_37: {
        id: "level_stage_37",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f59e0b",
        baseHp: 3290,
        baseAttack: 36,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_38: {
        id: "level_stage_38",
        kind: "level",
        displayName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F335}",
        monsterColor: "#86efac",
        baseHp: 3538,
        baseAttack: 37,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_39: {
        id: "level_stage_39",
        kind: "level",
        displayName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        tier: "elite",
        monsterName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F335}",
        monsterColor: "#86efac",
        baseHp: 3786,
        baseAttack: 39,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_40: {
        id: "level_stage_40",
        kind: "level",
        displayName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uC120\uC778\uC7A5 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F335}",
        monsterColor: "#86efac",
        baseHp: 4034,
        baseAttack: 40,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_41: {
        id: "level_stage_41",
        kind: "level",
        displayName: "\uBBF8\uB77C",
        tier: "normal",
        monsterName: "\uBBF8\uB77C",
        monsterEmoji: "\u{1F9DF}",
        monsterColor: "#d97706",
        baseHp: 4283,
        baseAttack: 34,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_42: {
        id: "level_stage_42",
        kind: "level",
        displayName: "\uBBF8\uB77C",
        tier: "normal",
        monsterName: "\uBBF8\uB77C",
        monsterEmoji: "\u{1F9DF}",
        monsterColor: "#d97706",
        baseHp: 4531,
        baseAttack: 35,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_43: {
        id: "level_stage_43",
        kind: "level",
        displayName: "\uBBF8\uB77C",
        tier: "normal",
        monsterName: "\uBBF8\uB77C",
        monsterEmoji: "\u{1F9DF}",
        monsterColor: "#d97706",
        baseHp: 4779,
        baseAttack: 36,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_44: {
        id: "level_stage_44",
        kind: "level",
        displayName: "\uBBF8\uB77C",
        tier: "normal",
        monsterName: "\uBBF8\uB77C",
        monsterEmoji: "\u{1F9DF}",
        monsterColor: "#d97706",
        baseHp: 5028,
        baseAttack: 37,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_45: {
        id: "level_stage_45",
        kind: "level",
        displayName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        tier: "elite",
        monsterName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        monsterEmoji: "\u{1F41B}",
        monsterColor: "#fbbf24",
        baseHp: 5276,
        baseAttack: 39,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_46: {
        id: "level_stage_46",
        kind: "level",
        displayName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        monsterEmoji: "\u{1F41B}",
        monsterColor: "#fbbf24",
        baseHp: 5524,
        baseAttack: 40,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_47: {
        id: "level_stage_47",
        kind: "level",
        displayName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        tier: "normal",
        monsterName: "\uBAA8\uB798 \uC9C0\uB801\uC774",
        monsterEmoji: "\u{1F41B}",
        monsterColor: "#fbbf24",
        baseHp: 5772,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_48: {
        id: "level_stage_48",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        monsterEmoji: "\u{1F98A}",
        monsterColor: "#f97316",
        baseHp: 6021,
        baseAttack: 42,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_49: {
        id: "level_stage_49",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        tier: "elite",
        monsterName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        monsterEmoji: "\u{1F98A}",
        monsterColor: "#f97316",
        baseHp: 6269,
        baseAttack: 43,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_50: {
        id: "level_stage_50",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uC5EC\uC6B0",
        monsterEmoji: "\u{1F98A}",
        monsterColor: "#f97316",
        baseHp: 6517,
        baseAttack: 44,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_51: {
        id: "level_stage_51",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 6766,
        baseAttack: 39,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_52: {
        id: "level_stage_52",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 7014,
        baseAttack: 40,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_53: {
        id: "level_stage_53",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 7262,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_54: {
        id: "level_stage_54",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC0AC\uB9C9 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 7510,
        baseAttack: 42,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_55: {
        id: "level_stage_55",
        kind: "level",
        displayName: "\uC0AC\uB9C9 \uACE8\uB818",
        tier: "elite",
        monsterName: "\uC0AC\uB9C9 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 7759,
        baseAttack: 43,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_56: {
        id: "level_stage_56",
        kind: "level",
        displayName: "\uC2A4\uD551\uD06C\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#f59e0b",
        baseHp: 8007,
        baseAttack: 44,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_57: {
        id: "level_stage_57",
        kind: "level",
        displayName: "\uC2A4\uD551\uD06C\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#f59e0b",
        baseHp: 8255,
        baseAttack: 45,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_58: {
        id: "level_stage_58",
        kind: "level",
        displayName: "\uC2A4\uD551\uD06C\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#f59e0b",
        baseHp: 8503,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_59: {
        id: "level_stage_59",
        kind: "level",
        displayName: "\uC2A4\uD551\uD06C\uC2A4",
        tier: "elite",
        monsterName: "\uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#f59e0b",
        baseHp: 8752,
        baseAttack: 47,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_60: {
        id: "level_stage_60",
        kind: "level",
        displayName: "\uC804\uAC08\uC655",
        tier: "boss",
        monsterName: "\uC804\uAC08\uC655",
        monsterEmoji: "\u{1F982}",
        monsterColor: "#ef4444",
        baseHp: 9e3,
        baseAttack: 59,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_61: {
        id: "level_stage_61",
        kind: "level",
        displayName: "\uC5BC\uC74C \uB291\uB300",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uB291\uB300",
        monsterEmoji: "\u{1F43A}",
        monsterColor: "#93c5fd",
        baseHp: 3200,
        baseAttack: 35,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_62: {
        id: "level_stage_62",
        kind: "level",
        displayName: "\uC5BC\uC74C \uB291\uB300",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uB291\uB300",
        monsterEmoji: "\u{1F43A}",
        monsterColor: "#93c5fd",
        baseHp: 3641,
        baseAttack: 36,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_63: {
        id: "level_stage_63",
        kind: "level",
        displayName: "\uC5BC\uC74C \uB291\uB300",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uB291\uB300",
        monsterEmoji: "\u{1F43A}",
        monsterColor: "#93c5fd",
        baseHp: 4083,
        baseAttack: 37,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_64: {
        id: "level_stage_64",
        kind: "level",
        displayName: "\uC5BC\uC74C \uB291\uB300",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uB291\uB300",
        monsterEmoji: "\u{1F43A}",
        monsterColor: "#93c5fd",
        baseHp: 4524,
        baseAttack: 39,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_65: {
        id: "level_stage_65",
        kind: "level",
        displayName: "\uB208 \uD1A0\uB07C",
        tier: "elite",
        monsterName: "\uB208 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 4966,
        baseAttack: 40,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_66: {
        id: "level_stage_66",
        kind: "level",
        displayName: "\uB208 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uB208 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 5407,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_67: {
        id: "level_stage_67",
        kind: "level",
        displayName: "\uB208 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uB208 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 5848,
        baseAttack: 42,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_68: {
        id: "level_stage_68",
        kind: "level",
        displayName: "\uC11C\uB9AC \uC694\uC815",
        tier: "normal",
        monsterName: "\uC11C\uB9AC \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#dbeafe",
        baseHp: 6290,
        baseAttack: 43,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_69: {
        id: "level_stage_69",
        kind: "level",
        displayName: "\uC11C\uB9AC \uC694\uC815",
        tier: "elite",
        monsterName: "\uC11C\uB9AC \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#dbeafe",
        baseHp: 6731,
        baseAttack: 44,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_70: {
        id: "level_stage_70",
        kind: "level",
        displayName: "\uC11C\uB9AC \uC694\uC815",
        tier: "normal",
        monsterName: "\uC11C\uB9AC \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#dbeafe",
        baseHp: 7172,
        baseAttack: 45,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_71: {
        id: "level_stage_71",
        kind: "level",
        displayName: "\uC5BC\uC74C \uAC70\uC778",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uAC70\uC778",
        monsterEmoji: "\u{1F9CA}",
        monsterColor: "#60a5fa",
        baseHp: 7614,
        baseAttack: 40,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_72: {
        id: "level_stage_72",
        kind: "level",
        displayName: "\uC5BC\uC74C \uAC70\uC778",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uAC70\uC778",
        monsterEmoji: "\u{1F9CA}",
        monsterColor: "#60a5fa",
        baseHp: 8055,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_73: {
        id: "level_stage_73",
        kind: "level",
        displayName: "\uC5BC\uC74C \uAC70\uC778",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uAC70\uC778",
        monsterEmoji: "\u{1F9CA}",
        monsterColor: "#60a5fa",
        baseHp: 8497,
        baseAttack: 42,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_74: {
        id: "level_stage_74",
        kind: "level",
        displayName: "\uC5BC\uC74C \uAC70\uC778",
        tier: "normal",
        monsterName: "\uC5BC\uC74C \uAC70\uC778",
        monsterEmoji: "\u{1F9CA}",
        monsterColor: "#60a5fa",
        baseHp: 8938,
        baseAttack: 43,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_75: {
        id: "level_stage_75",
        kind: "level",
        displayName: "\uC124\uC6D0 \uB9E4",
        tier: "elite",
        monsterName: "\uC124\uC6D0 \uB9E4",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#93c5fd",
        baseHp: 9379,
        baseAttack: 44,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_76: {
        id: "level_stage_76",
        kind: "level",
        displayName: "\uC124\uC6D0 \uB9E4",
        tier: "normal",
        monsterName: "\uC124\uC6D0 \uB9E4",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#93c5fd",
        baseHp: 9821,
        baseAttack: 45,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_77: {
        id: "level_stage_77",
        kind: "level",
        displayName: "\uC124\uC6D0 \uB9E4",
        tier: "normal",
        monsterName: "\uC124\uC6D0 \uB9E4",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#93c5fd",
        baseHp: 10262,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_78: {
        id: "level_stage_78",
        kind: "level",
        displayName: "\uB3D9\uACB0 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3D9\uACB0 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#bfdbfe",
        baseHp: 10703,
        baseAttack: 47,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_79: {
        id: "level_stage_79",
        kind: "level",
        displayName: "\uB3D9\uACB0 \uACE8\uB818",
        tier: "elite",
        monsterName: "\uB3D9\uACB0 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#bfdbfe",
        baseHp: 11145,
        baseAttack: 48,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_80: {
        id: "level_stage_80",
        kind: "level",
        displayName: "\uB3D9\uACB0 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3D9\uACB0 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#bfdbfe",
        baseHp: 11586,
        baseAttack: 50,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_81: {
        id: "level_stage_81",
        kind: "level",
        displayName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#60a5fa",
        baseHp: 12028,
        baseAttack: 44,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_82: {
        id: "level_stage_82",
        kind: "level",
        displayName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#60a5fa",
        baseHp: 12469,
        baseAttack: 45,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_83: {
        id: "level_stage_83",
        kind: "level",
        displayName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#60a5fa",
        baseHp: 12910,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_84: {
        id: "level_stage_84",
        kind: "level",
        displayName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#60a5fa",
        baseHp: 13352,
        baseAttack: 47,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_85: {
        id: "level_stage_85",
        kind: "level",
        displayName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        tier: "elite",
        monsterName: "\uBE59\uD558 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#60a5fa",
        baseHp: 13793,
        baseAttack: 48,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_86: {
        id: "level_stage_86",
        kind: "level",
        displayName: "\uB208\uBCF4\uB77C \uC815\uB839",
        tier: "normal",
        monsterName: "\uB208\uBCF4\uB77C \uC815\uB839",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 14234,
        baseAttack: 50,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_87: {
        id: "level_stage_87",
        kind: "level",
        displayName: "\uB208\uBCF4\uB77C \uC815\uB839",
        tier: "normal",
        monsterName: "\uB208\uBCF4\uB77C \uC815\uB839",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 14676,
        baseAttack: 51,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_88: {
        id: "level_stage_88",
        kind: "level",
        displayName: "\uB208\uBCF4\uB77C \uC815\uB839",
        tier: "normal",
        monsterName: "\uB208\uBCF4\uB77C \uC815\uB839",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 15117,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_89: {
        id: "level_stage_89",
        kind: "level",
        displayName: "\uB208\uBCF4\uB77C \uC815\uB839",
        tier: "elite",
        monsterName: "\uB208\uBCF4\uB77C \uC815\uB839",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 15559,
        baseAttack: 53,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_90: {
        id: "level_stage_90",
        kind: "level",
        displayName: "\uC124\uBE59 \uC5EC\uC655",
        tier: "boss",
        monsterName: "\uC124\uBE59 \uC5EC\uC655",
        monsterEmoji: "\u{1F478}",
        monsterColor: "#38bdf8",
        baseHp: 16e3,
        baseAttack: 65,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_91: {
        id: "level_stage_91",
        kind: "level",
        displayName: "\uD574\uD30C\uB9AC",
        tier: "normal",
        monsterName: "\uD574\uD30C\uB9AC",
        monsterEmoji: "\u{1FABC}",
        monsterColor: "#22d3ee",
        baseHp: 5200,
        baseAttack: 41,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_92: {
        id: "level_stage_92",
        kind: "level",
        displayName: "\uD574\uD30C\uB9AC",
        tier: "normal",
        monsterName: "\uD574\uD30C\uB9AC",
        monsterEmoji: "\u{1FABC}",
        monsterColor: "#22d3ee",
        baseHp: 5917,
        baseAttack: 42,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_93: {
        id: "level_stage_93",
        kind: "level",
        displayName: "\uD574\uD30C\uB9AC",
        tier: "normal",
        monsterName: "\uD574\uD30C\uB9AC",
        monsterEmoji: "\u{1FABC}",
        monsterColor: "#22d3ee",
        baseHp: 6634,
        baseAttack: 43,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_94: {
        id: "level_stage_94",
        kind: "level",
        displayName: "\uD574\uD30C\uB9AC",
        tier: "normal",
        monsterName: "\uD574\uD30C\uB9AC",
        monsterEmoji: "\u{1FABC}",
        monsterColor: "#22d3ee",
        baseHp: 7352,
        baseAttack: 44,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_95: {
        id: "level_stage_95",
        kind: "level",
        displayName: "\uC870\uAC1C \uAE30\uC0AC",
        tier: "elite",
        monsterName: "\uC870\uAC1C \uAE30\uC0AC",
        monsterEmoji: "\u{1F41A}",
        monsterColor: "#06b6d4",
        baseHp: 8069,
        baseAttack: 45,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_96: {
        id: "level_stage_96",
        kind: "level",
        displayName: "\uC870\uAC1C \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uC870\uAC1C \uAE30\uC0AC",
        monsterEmoji: "\u{1F41A}",
        monsterColor: "#06b6d4",
        baseHp: 8786,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_97: {
        id: "level_stage_97",
        kind: "level",
        displayName: "\uC870\uAC1C \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uC870\uAC1C \uAE30\uC0AC",
        monsterEmoji: "\u{1F41A}",
        monsterColor: "#06b6d4",
        baseHp: 9503,
        baseAttack: 47,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_98: {
        id: "level_stage_98",
        kind: "level",
        displayName: "\uC0B0\uD638 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC0B0\uD638 \uC815\uB839",
        monsterEmoji: "\u{1F33A}",
        monsterColor: "#f0abfc",
        baseHp: 10221,
        baseAttack: 48,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_99: {
        id: "level_stage_99",
        kind: "level",
        displayName: "\uC0B0\uD638 \uC815\uB839",
        tier: "elite",
        monsterName: "\uC0B0\uD638 \uC815\uB839",
        monsterEmoji: "\u{1F33A}",
        monsterColor: "#f0abfc",
        baseHp: 10938,
        baseAttack: 50,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_100: {
        id: "level_stage_100",
        kind: "level",
        displayName: "\uC0B0\uD638 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC0B0\uD638 \uC815\uB839",
        monsterEmoji: "\u{1F33A}",
        monsterColor: "#f0abfc",
        baseHp: 11655,
        baseAttack: 51,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_101: {
        id: "level_stage_101",
        kind: "level",
        displayName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        tier: "normal",
        monsterName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        monsterEmoji: "\u26A1",
        monsterColor: "#facc15",
        baseHp: 12372,
        baseAttack: 45,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_102: {
        id: "level_stage_102",
        kind: "level",
        displayName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        tier: "normal",
        monsterName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        monsterEmoji: "\u26A1",
        monsterColor: "#facc15",
        baseHp: 13090,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_103: {
        id: "level_stage_103",
        kind: "level",
        displayName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        tier: "normal",
        monsterName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        monsterEmoji: "\u26A1",
        monsterColor: "#facc15",
        baseHp: 13807,
        baseAttack: 47,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_104: {
        id: "level_stage_104",
        kind: "level",
        displayName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        tier: "normal",
        monsterName: "\uC804\uAE30\uBC40\uC7A5\uC5B4",
        monsterEmoji: "\u26A1",
        monsterColor: "#facc15",
        baseHp: 14524,
        baseAttack: 48,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_105: {
        id: "level_stage_105",
        kind: "level",
        displayName: "\uC0C1\uC5B4 \uC804\uC0AC",
        tier: "elite",
        monsterName: "\uC0C1\uC5B4 \uC804\uC0AC",
        monsterEmoji: "\u{1F988}",
        monsterColor: "#0284c7",
        baseHp: 15241,
        baseAttack: 50,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_106: {
        id: "level_stage_106",
        kind: "level",
        displayName: "\uC0C1\uC5B4 \uC804\uC0AC",
        tier: "normal",
        monsterName: "\uC0C1\uC5B4 \uC804\uC0AC",
        monsterEmoji: "\u{1F988}",
        monsterColor: "#0284c7",
        baseHp: 15959,
        baseAttack: 51,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_107: {
        id: "level_stage_107",
        kind: "level",
        displayName: "\uC0C1\uC5B4 \uC804\uC0AC",
        tier: "normal",
        monsterName: "\uC0C1\uC5B4 \uC804\uC0AC",
        monsterEmoji: "\u{1F988}",
        monsterColor: "#0284c7",
        baseHp: 16676,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_108: {
        id: "level_stage_108",
        kind: "level",
        displayName: "\uC2EC\uD574 \uC6A9",
        tier: "normal",
        monsterName: "\uC2EC\uD574 \uC6A9",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0e7490",
        baseHp: 17393,
        baseAttack: 53,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_109: {
        id: "level_stage_109",
        kind: "level",
        displayName: "\uC2EC\uD574 \uC6A9",
        tier: "elite",
        monsterName: "\uC2EC\uD574 \uC6A9",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0e7490",
        baseHp: 18110,
        baseAttack: 54,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_110: {
        id: "level_stage_110",
        kind: "level",
        displayName: "\uC2EC\uD574 \uC6A9",
        tier: "normal",
        monsterName: "\uC2EC\uD574 \uC6A9",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0e7490",
        baseHp: 18828,
        baseAttack: 55,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_111: {
        id: "level_stage_111",
        kind: "level",
        displayName: "\uAC70\uB300 \uAC70\uBD81",
        tier: "normal",
        monsterName: "\uAC70\uB300 \uAC70\uBD81",
        monsterEmoji: "\u{1F422}",
        monsterColor: "#06b6d4",
        baseHp: 19545,
        baseAttack: 50,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_112: {
        id: "level_stage_112",
        kind: "level",
        displayName: "\uAC70\uB300 \uAC70\uBD81",
        tier: "normal",
        monsterName: "\uAC70\uB300 \uAC70\uBD81",
        monsterEmoji: "\u{1F422}",
        monsterColor: "#06b6d4",
        baseHp: 20262,
        baseAttack: 51,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_113: {
        id: "level_stage_113",
        kind: "level",
        displayName: "\uAC70\uB300 \uAC70\uBD81",
        tier: "normal",
        monsterName: "\uAC70\uB300 \uAC70\uBD81",
        monsterEmoji: "\u{1F422}",
        monsterColor: "#06b6d4",
        baseHp: 20979,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_114: {
        id: "level_stage_114",
        kind: "level",
        displayName: "\uAC70\uB300 \uAC70\uBD81",
        tier: "normal",
        monsterName: "\uAC70\uB300 \uAC70\uBD81",
        monsterEmoji: "\u{1F422}",
        monsterColor: "#06b6d4",
        baseHp: 21697,
        baseAttack: 53,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_115: {
        id: "level_stage_115",
        kind: "level",
        displayName: "\uAC70\uB300 \uAC70\uBD81",
        tier: "elite",
        monsterName: "\uAC70\uB300 \uAC70\uBD81",
        monsterEmoji: "\u{1F422}",
        monsterColor: "#06b6d4",
        baseHp: 22414,
        baseAttack: 54,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_116: {
        id: "level_stage_116",
        kind: "level",
        displayName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        tier: "normal",
        monsterName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        monsterEmoji: "\u{1F40B}",
        monsterColor: "#0369a1",
        baseHp: 23131,
        baseAttack: 55,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_117: {
        id: "level_stage_117",
        kind: "level",
        displayName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        tier: "normal",
        monsterName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        monsterEmoji: "\u{1F40B}",
        monsterColor: "#0369a1",
        baseHp: 23848,
        baseAttack: 56,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_118: {
        id: "level_stage_118",
        kind: "level",
        displayName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        tier: "normal",
        monsterName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        monsterEmoji: "\u{1F40B}",
        monsterColor: "#0369a1",
        baseHp: 24566,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_119: {
        id: "level_stage_119",
        kind: "level",
        displayName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        tier: "elite",
        monsterName: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4",
        monsterEmoji: "\u{1F40B}",
        monsterColor: "#0369a1",
        baseHp: 25283,
        baseAttack: 58,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_120: {
        id: "level_stage_120",
        kind: "level",
        displayName: "\uD06C\uB77C\uCF04",
        tier: "boss",
        monsterName: "\uD06C\uB77C\uCF04",
        monsterEmoji: "\u{1F991}",
        monsterColor: "#0c4a6e",
        baseHp: 26e3,
        baseAttack: 70,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_121: {
        id: "level_stage_121",
        kind: "level",
        displayName: "\uB3C5\uBC84\uC12F",
        tier: "normal",
        monsterName: "\uB3C5\uBC84\uC12F",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 8e3,
        baseAttack: 46,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_122: {
        id: "level_stage_122",
        kind: "level",
        displayName: "\uB3C5\uBC84\uC12F",
        tier: "normal",
        monsterName: "\uB3C5\uBC84\uC12F",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 9103,
        baseAttack: 47,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_123: {
        id: "level_stage_123",
        kind: "level",
        displayName: "\uB3C5\uBC84\uC12F",
        tier: "normal",
        monsterName: "\uB3C5\uBC84\uC12F",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 10207,
        baseAttack: 48,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_124: {
        id: "level_stage_124",
        kind: "level",
        displayName: "\uB3C5\uBC84\uC12F",
        tier: "normal",
        monsterName: "\uB3C5\uBC84\uC12F",
        monsterEmoji: "\u{1F344}",
        monsterColor: "#a3e635",
        baseHp: 11310,
        baseAttack: 50,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_125: {
        id: "level_stage_125",
        kind: "level",
        displayName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        tier: "elite",
        monsterName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        monsterEmoji: "\u{1F438}",
        monsterColor: "#84cc16",
        baseHp: 12414,
        baseAttack: 51,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_126: {
        id: "level_stage_126",
        kind: "level",
        displayName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        tier: "normal",
        monsterName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        monsterEmoji: "\u{1F438}",
        monsterColor: "#84cc16",
        baseHp: 13517,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_127: {
        id: "level_stage_127",
        kind: "level",
        displayName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        tier: "normal",
        monsterName: "\uB3C5 \uAC1C\uAD6C\uB9AC",
        monsterEmoji: "\u{1F438}",
        monsterColor: "#84cc16",
        baseHp: 14621,
        baseAttack: 53,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_128: {
        id: "level_stage_128",
        kind: "level",
        displayName: "\uB369\uAD74 \uAC70\uBBF8",
        tier: "normal",
        monsterName: "\uB369\uAD74 \uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#65a30d",
        baseHp: 15724,
        baseAttack: 54,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_129: {
        id: "level_stage_129",
        kind: "level",
        displayName: "\uB369\uAD74 \uAC70\uBBF8",
        tier: "elite",
        monsterName: "\uB369\uAD74 \uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#65a30d",
        baseHp: 16828,
        baseAttack: 55,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_130: {
        id: "level_stage_130",
        kind: "level",
        displayName: "\uB369\uAD74 \uAC70\uBBF8",
        tier: "normal",
        monsterName: "\uB369\uAD74 \uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#65a30d",
        baseHp: 17931,
        baseAttack: 56,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_131: {
        id: "level_stage_131",
        kind: "level",
        displayName: "\uC5ED\uBCD1 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uC5ED\uBCD1 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#7c3aed",
        baseHp: 19034,
        baseAttack: 51,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_132: {
        id: "level_stage_132",
        kind: "level",
        displayName: "\uC5ED\uBCD1 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uC5ED\uBCD1 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#7c3aed",
        baseHp: 20138,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_133: {
        id: "level_stage_133",
        kind: "level",
        displayName: "\uC5ED\uBCD1 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uC5ED\uBCD1 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#7c3aed",
        baseHp: 21241,
        baseAttack: 53,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_134: {
        id: "level_stage_134",
        kind: "level",
        displayName: "\uC5ED\uBCD1 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uC5ED\uBCD1 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#7c3aed",
        baseHp: 22345,
        baseAttack: 54,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_135: {
        id: "level_stage_135",
        kind: "level",
        displayName: "\uB3C5\uC0AC",
        tier: "elite",
        monsterName: "\uB3C5\uC0AC",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#16a34a",
        baseHp: 23448,
        baseAttack: 55,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_136: {
        id: "level_stage_136",
        kind: "level",
        displayName: "\uB3C5\uC0AC",
        tier: "normal",
        monsterName: "\uB3C5\uC0AC",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#16a34a",
        baseHp: 24552,
        baseAttack: 56,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_137: {
        id: "level_stage_137",
        kind: "level",
        displayName: "\uB3C5\uC0AC",
        tier: "normal",
        monsterName: "\uB3C5\uC0AC",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#16a34a",
        baseHp: 25655,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_138: {
        id: "level_stage_138",
        kind: "level",
        displayName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        tier: "normal",
        monsterName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#4d7c0f",
        baseHp: 26759,
        baseAttack: 58,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_139: {
        id: "level_stage_139",
        kind: "level",
        displayName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        tier: "elite",
        monsterName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#4d7c0f",
        baseHp: 27862,
        baseAttack: 59,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_140: {
        id: "level_stage_140",
        kind: "level",
        displayName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        tier: "normal",
        monsterName: "\uB3C5 \uD2B8\uB808\uC778\uD2B8",
        monsterEmoji: "\u{1F333}",
        monsterColor: "#4d7c0f",
        baseHp: 28966,
        baseAttack: 61,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_141: {
        id: "level_stage_141",
        kind: "level",
        displayName: "\uB3C5 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3C5 \uACE8\uB818",
        monsterEmoji: "\u{1F7E3}",
        monsterColor: "#8b5cf6",
        baseHp: 30069,
        baseAttack: 55,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_142: {
        id: "level_stage_142",
        kind: "level",
        displayName: "\uB3C5 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3C5 \uACE8\uB818",
        monsterEmoji: "\u{1F7E3}",
        monsterColor: "#8b5cf6",
        baseHp: 31172,
        baseAttack: 56,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_143: {
        id: "level_stage_143",
        kind: "level",
        displayName: "\uB3C5 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3C5 \uACE8\uB818",
        monsterEmoji: "\u{1F7E3}",
        monsterColor: "#8b5cf6",
        baseHp: 32276,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_144: {
        id: "level_stage_144",
        kind: "level",
        displayName: "\uB3C5 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uB3C5 \uACE8\uB818",
        monsterEmoji: "\u{1F7E3}",
        monsterColor: "#8b5cf6",
        baseHp: 33379,
        baseAttack: 58,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_145: {
        id: "level_stage_145",
        kind: "level",
        displayName: "\uB3C5 \uACE8\uB818",
        tier: "elite",
        monsterName: "\uB3C5 \uACE8\uB818",
        monsterEmoji: "\u{1F7E3}",
        monsterColor: "#8b5cf6",
        baseHp: 34483,
        baseAttack: 59,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_146: {
        id: "level_stage_146",
        kind: "level",
        displayName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        tier: "normal",
        monsterName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 35586,
        baseAttack: 61,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_147: {
        id: "level_stage_147",
        kind: "level",
        displayName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        tier: "normal",
        monsterName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 36690,
        baseAttack: 62,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_148: {
        id: "level_stage_148",
        kind: "level",
        displayName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        tier: "normal",
        monsterName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 37793,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_149: {
        id: "level_stage_149",
        kind: "level",
        displayName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        tier: "elite",
        monsterName: "\uD0B9 \uB3C5\uAC70\uBBF8",
        monsterEmoji: "\u{1F577}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 38897,
        baseAttack: 64,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_150: {
        id: "level_stage_150",
        kind: "level",
        displayName: "\uD788\uB4DC\uB77C",
        tier: "boss",
        monsterName: "\uD788\uB4DC\uB77C",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#6d28d9",
        baseHp: 4e4,
        baseAttack: 76,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_151: {
        id: "level_stage_151",
        kind: "level",
        displayName: "\uC11D\uC0C1",
        tier: "normal",
        monsterName: "\uC11D\uC0C1",
        monsterEmoji: "\u{1F5FF}",
        monsterColor: "#92400e",
        baseHp: 12e3,
        baseAttack: 52,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_152: {
        id: "level_stage_152",
        kind: "level",
        displayName: "\uC11D\uC0C1",
        tier: "normal",
        monsterName: "\uC11D\uC0C1",
        monsterEmoji: "\u{1F5FF}",
        monsterColor: "#92400e",
        baseHp: 13655,
        baseAttack: 53,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_153: {
        id: "level_stage_153",
        kind: "level",
        displayName: "\uC11D\uC0C1",
        tier: "normal",
        monsterName: "\uC11D\uC0C1",
        monsterEmoji: "\u{1F5FF}",
        monsterColor: "#92400e",
        baseHp: 15310,
        baseAttack: 54,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_154: {
        id: "level_stage_154",
        kind: "level",
        displayName: "\uC11D\uC0C1",
        tier: "normal",
        monsterName: "\uC11D\uC0C1",
        monsterEmoji: "\u{1F5FF}",
        monsterColor: "#92400e",
        baseHp: 16966,
        baseAttack: 55,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_155: {
        id: "level_stage_155",
        kind: "level",
        displayName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        tier: "elite",
        monsterName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        monsterEmoji: "\u{1F41E}",
        monsterColor: "#d97706",
        baseHp: 18621,
        baseAttack: 56,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_156: {
        id: "level_stage_156",
        kind: "level",
        displayName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        tier: "normal",
        monsterName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        monsterEmoji: "\u{1F41E}",
        monsterColor: "#d97706",
        baseHp: 20276,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_157: {
        id: "level_stage_157",
        kind: "level",
        displayName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        tier: "normal",
        monsterName: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774",
        monsterEmoji: "\u{1F41E}",
        monsterColor: "#d97706",
        baseHp: 21931,
        baseAttack: 58,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_158: {
        id: "level_stage_158",
        kind: "level",
        displayName: "\uC720\uC801 \uC720\uB839",
        tier: "normal",
        monsterName: "\uC720\uC801 \uC720\uB839",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#fbbf24",
        baseHp: 23586,
        baseAttack: 59,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_159: {
        id: "level_stage_159",
        kind: "level",
        displayName: "\uC720\uC801 \uC720\uB839",
        tier: "elite",
        monsterName: "\uC720\uC801 \uC720\uB839",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#fbbf24",
        baseHp: 25241,
        baseAttack: 61,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_160: {
        id: "level_stage_160",
        kind: "level",
        displayName: "\uC720\uC801 \uC720\uB839",
        tier: "normal",
        monsterName: "\uC720\uC801 \uC720\uB839",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#fbbf24",
        baseHp: 26897,
        baseAttack: 62,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_161: {
        id: "level_stage_161",
        kind: "level",
        displayName: "\uACE8\uB818 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uACE8\uB818 \uAE30\uC0AC",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#78716c",
        baseHp: 28552,
        baseAttack: 56,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_162: {
        id: "level_stage_162",
        kind: "level",
        displayName: "\uACE8\uB818 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uACE8\uB818 \uAE30\uC0AC",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#78716c",
        baseHp: 30207,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_163: {
        id: "level_stage_163",
        kind: "level",
        displayName: "\uACE8\uB818 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uACE8\uB818 \uAE30\uC0AC",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#78716c",
        baseHp: 31862,
        baseAttack: 58,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_164: {
        id: "level_stage_164",
        kind: "level",
        displayName: "\uACE8\uB818 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uACE8\uB818 \uAE30\uC0AC",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#78716c",
        baseHp: 33517,
        baseAttack: 59,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_165: {
        id: "level_stage_165",
        kind: "level",
        displayName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        tier: "elite",
        monsterName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#d97706",
        baseHp: 35172,
        baseAttack: 61,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_166: {
        id: "level_stage_166",
        kind: "level",
        displayName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#d97706",
        baseHp: 36828,
        baseAttack: 62,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_167: {
        id: "level_stage_167",
        kind: "level",
        displayName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4",
        monsterEmoji: "\u{1F981}",
        monsterColor: "#d97706",
        baseHp: 38483,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_168: {
        id: "level_stage_168",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC815\uB839",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 40138,
        baseAttack: 64,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_169: {
        id: "level_stage_169",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC815\uB839",
        tier: "elite",
        monsterName: "\uC6A9\uC554 \uC815\uB839",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 41793,
        baseAttack: 65,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_170: {
        id: "level_stage_170",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC815\uB839",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC815\uB839",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 43448,
        baseAttack: 66,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_171: {
        id: "level_stage_171",
        kind: "level",
        displayName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#d97706",
        baseHp: 45103,
        baseAttack: 61,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_172: {
        id: "level_stage_172",
        kind: "level",
        displayName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#d97706",
        baseHp: 46759,
        baseAttack: 62,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_173: {
        id: "level_stage_173",
        kind: "level",
        displayName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#d97706",
        baseHp: 48414,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_174: {
        id: "level_stage_174",
        kind: "level",
        displayName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#d97706",
        baseHp: 50069,
        baseAttack: 64,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_175: {
        id: "level_stage_175",
        kind: "level",
        displayName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        tier: "elite",
        monsterName: "\uACE0\uB300 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#d97706",
        baseHp: 51724,
        baseAttack: 65,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_176: {
        id: "level_stage_176",
        kind: "level",
        displayName: "\uC11D\uD310 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uD310 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#92400e",
        baseHp: 53379,
        baseAttack: 66,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_177: {
        id: "level_stage_177",
        kind: "level",
        displayName: "\uC11D\uD310 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uD310 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#92400e",
        baseHp: 55034,
        baseAttack: 67,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_178: {
        id: "level_stage_178",
        kind: "level",
        displayName: "\uC11D\uD310 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC11D\uD310 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#92400e",
        baseHp: 56690,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_179: {
        id: "level_stage_179",
        kind: "level",
        displayName: "\uC11D\uD310 \uACE8\uB818",
        tier: "elite",
        monsterName: "\uC11D\uD310 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#92400e",
        baseHp: 58345,
        baseAttack: 69,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_180: {
        id: "level_stage_180",
        kind: "level",
        displayName: "\uBA54\uB450\uC0AC",
        tier: "boss",
        monsterName: "\uBA54\uB450\uC0AC",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#dc2626",
        baseHp: 6e4,
        baseAttack: 81,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_181: {
        id: "level_stage_181",
        kind: "level",
        displayName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#6d28d9",
        baseHp: 17500,
        baseAttack: 57,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_182: {
        id: "level_stage_182",
        kind: "level",
        displayName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#6d28d9",
        baseHp: 19914,
        baseAttack: 58,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_183: {
        id: "level_stage_183",
        kind: "level",
        displayName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#6d28d9",
        baseHp: 22328,
        baseAttack: 59,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_184: {
        id: "level_stage_184",
        kind: "level",
        displayName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uADF8\uB9BC\uC790 \uBC15\uC950",
        monsterEmoji: "\u{1F987}",
        monsterColor: "#6d28d9",
        baseHp: 24741,
        baseAttack: 61,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_185: {
        id: "level_stage_185",
        kind: "level",
        displayName: "\uD574\uACE8 \uBCD1\uC0AC",
        tier: "elite",
        monsterName: "\uD574\uACE8 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#9ca3af",
        baseHp: 27155,
        baseAttack: 62,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_186: {
        id: "level_stage_186",
        kind: "level",
        displayName: "\uD574\uACE8 \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uD574\uACE8 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#9ca3af",
        baseHp: 29569,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_187: {
        id: "level_stage_187",
        kind: "level",
        displayName: "\uD574\uACE8 \uBCD1\uC0AC",
        tier: "normal",
        monsterName: "\uD574\uACE8 \uBCD1\uC0AC",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#9ca3af",
        baseHp: 31983,
        baseAttack: 64,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_188: {
        id: "level_stage_188",
        kind: "level",
        displayName: "\uC720\uB839 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uC720\uB839 \uAE30\uC0AC",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#7c3aed",
        baseHp: 34397,
        baseAttack: 65,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_189: {
        id: "level_stage_189",
        kind: "level",
        displayName: "\uC720\uB839 \uAE30\uC0AC",
        tier: "elite",
        monsterName: "\uC720\uB839 \uAE30\uC0AC",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#7c3aed",
        baseHp: 36810,
        baseAttack: 66,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_190: {
        id: "level_stage_190",
        kind: "level",
        displayName: "\uC720\uB839 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uC720\uB839 \uAE30\uC0AC",
        monsterEmoji: "\u{1F47B}",
        monsterColor: "#7c3aed",
        baseHp: 39224,
        baseAttack: 67,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_191: {
        id: "level_stage_191",
        kind: "level",
        displayName: "\uD761\uD608 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uD761\uD608 \uBC15\uC950",
        monsterEmoji: "\u{1F9DB}",
        monsterColor: "#7f1d1d",
        baseHp: 41638,
        baseAttack: 62,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_192: {
        id: "level_stage_192",
        kind: "level",
        displayName: "\uD761\uD608 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uD761\uD608 \uBC15\uC950",
        monsterEmoji: "\u{1F9DB}",
        monsterColor: "#7f1d1d",
        baseHp: 44052,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_193: {
        id: "level_stage_193",
        kind: "level",
        displayName: "\uD761\uD608 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uD761\uD608 \uBC15\uC950",
        monsterEmoji: "\u{1F9DB}",
        monsterColor: "#7f1d1d",
        baseHp: 46466,
        baseAttack: 64,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_194: {
        id: "level_stage_194",
        kind: "level",
        displayName: "\uD761\uD608 \uBC15\uC950",
        tier: "normal",
        monsterName: "\uD761\uD608 \uBC15\uC950",
        monsterEmoji: "\u{1F9DB}",
        monsterColor: "#7f1d1d",
        baseHp: 48879,
        baseAttack: 65,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_195: {
        id: "level_stage_195",
        kind: "level",
        displayName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        tier: "elite",
        monsterName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        monsterEmoji: "\u{1F9D9}",
        monsterColor: "#4c1d95",
        baseHp: 51293,
        baseAttack: 66,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_196: {
        id: "level_stage_196",
        kind: "level",
        displayName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        tier: "normal",
        monsterName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        monsterEmoji: "\u{1F9D9}",
        monsterColor: "#4c1d95",
        baseHp: 53707,
        baseAttack: 67,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_197: {
        id: "level_stage_197",
        kind: "level",
        displayName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        tier: "normal",
        monsterName: "\uC554\uD751 \uB9C8\uBC95\uC0AC",
        monsterEmoji: "\u{1F9D9}",
        monsterColor: "#4c1d95",
        baseHp: 56121,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_198: {
        id: "level_stage_198",
        kind: "level",
        displayName: "\uC8FD\uC74C \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC8FD\uC74C \uACE8\uB818",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#1e1b4b",
        baseHp: 58534,
        baseAttack: 69,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_199: {
        id: "level_stage_199",
        kind: "level",
        displayName: "\uC8FD\uC74C \uACE8\uB818",
        tier: "elite",
        monsterName: "\uC8FD\uC74C \uACE8\uB818",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#1e1b4b",
        baseHp: 60948,
        baseAttack: 70,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_200: {
        id: "level_stage_200",
        kind: "level",
        displayName: "\uC8FD\uC74C \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC8FD\uC74C \uACE8\uB818",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#1e1b4b",
        baseHp: 63362,
        baseAttack: 72,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_201: {
        id: "level_stage_201",
        kind: "level",
        displayName: "\uBC34\uC2DC",
        tier: "normal",
        monsterName: "\uBC34\uC2DC",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 65776,
        baseAttack: 66,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_202: {
        id: "level_stage_202",
        kind: "level",
        displayName: "\uBC34\uC2DC",
        tier: "normal",
        monsterName: "\uBC34\uC2DC",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 68190,
        baseAttack: 67,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_203: {
        id: "level_stage_203",
        kind: "level",
        displayName: "\uBC34\uC2DC",
        tier: "normal",
        monsterName: "\uBC34\uC2DC",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 70603,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_204: {
        id: "level_stage_204",
        kind: "level",
        displayName: "\uBC34\uC2DC",
        tier: "normal",
        monsterName: "\uBC34\uC2DC",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 73017,
        baseAttack: 69,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_205: {
        id: "level_stage_205",
        kind: "level",
        displayName: "\uBC34\uC2DC",
        tier: "elite",
        monsterName: "\uBC34\uC2DC",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#7c3aed",
        baseHp: 75431,
        baseAttack: 70,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_206: {
        id: "level_stage_206",
        kind: "level",
        displayName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        tier: "normal",
        monsterName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#4c1d95",
        baseHp: 77845,
        baseAttack: 72,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_207: {
        id: "level_stage_207",
        kind: "level",
        displayName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        tier: "normal",
        monsterName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#4c1d95",
        baseHp: 80259,
        baseAttack: 73,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_208: {
        id: "level_stage_208",
        kind: "level",
        displayName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        tier: "normal",
        monsterName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#4c1d95",
        baseHp: 82672,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_209: {
        id: "level_stage_209",
        kind: "level",
        displayName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        tier: "elite",
        monsterName: "\uB2E4\uD06C \uB098\uC774\uD2B8",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#4c1d95",
        baseHp: 85086,
        baseAttack: 75,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_210: {
        id: "level_stage_210",
        kind: "level",
        displayName: "\uB9AC\uCE58 \uD0B9",
        tier: "boss",
        monsterName: "\uB9AC\uCE58 \uD0B9",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#1e1b4b",
        baseHp: 87500,
        baseAttack: 87,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_211: {
        id: "level_stage_211",
        kind: "level",
        displayName: "\uBC14\uB78C \uC694\uC815",
        tier: "normal",
        monsterName: "\uBC14\uB78C \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#7dd3fc",
        baseHp: 25e3,
        baseAttack: 63,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_212: {
        id: "level_stage_212",
        kind: "level",
        displayName: "\uBC14\uB78C \uC694\uC815",
        tier: "normal",
        monsterName: "\uBC14\uB78C \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#7dd3fc",
        baseHp: 28448,
        baseAttack: 64,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_213: {
        id: "level_stage_213",
        kind: "level",
        displayName: "\uBC14\uB78C \uC694\uC815",
        tier: "normal",
        monsterName: "\uBC14\uB78C \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#7dd3fc",
        baseHp: 31897,
        baseAttack: 65,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_214: {
        id: "level_stage_214",
        kind: "level",
        displayName: "\uBC14\uB78C \uC694\uC815",
        tier: "normal",
        monsterName: "\uBC14\uB78C \uC694\uC815",
        monsterEmoji: "\u{1F9DA}",
        monsterColor: "#7dd3fc",
        baseHp: 35345,
        baseAttack: 66,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_215: {
        id: "level_stage_215",
        kind: "level",
        displayName: "\uAD6C\uB984 \uD1A0\uB07C",
        tier: "elite",
        monsterName: "\uAD6C\uB984 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 38793,
        baseAttack: 67,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_216: {
        id: "level_stage_216",
        kind: "level",
        displayName: "\uAD6C\uB984 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uAD6C\uB984 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 42241,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_217: {
        id: "level_stage_217",
        kind: "level",
        displayName: "\uAD6C\uB984 \uD1A0\uB07C",
        tier: "normal",
        monsterName: "\uAD6C\uB984 \uD1A0\uB07C",
        monsterEmoji: "\u{1F430}",
        monsterColor: "#bfdbfe",
        baseHp: 45690,
        baseAttack: 69,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_218: {
        id: "level_stage_218",
        kind: "level",
        displayName: "\uCC9C\uB465\uC0C8",
        tier: "normal",
        monsterName: "\uCC9C\uB465\uC0C8",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#38bdf8",
        baseHp: 49138,
        baseAttack: 70,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_219: {
        id: "level_stage_219",
        kind: "level",
        displayName: "\uCC9C\uB465\uC0C8",
        tier: "elite",
        monsterName: "\uCC9C\uB465\uC0C8",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#38bdf8",
        baseHp: 52586,
        baseAttack: 72,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_220: {
        id: "level_stage_220",
        kind: "level",
        displayName: "\uCC9C\uB465\uC0C8",
        tier: "normal",
        monsterName: "\uCC9C\uB465\uC0C8",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#38bdf8",
        baseHp: 56034,
        baseAttack: 73,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_221: {
        id: "level_stage_221",
        kind: "level",
        displayName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        tier: "normal",
        monsterName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#0ea5e9",
        baseHp: 59483,
        baseAttack: 67,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_222: {
        id: "level_stage_222",
        kind: "level",
        displayName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        tier: "normal",
        monsterName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#0ea5e9",
        baseHp: 62931,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_223: {
        id: "level_stage_223",
        kind: "level",
        displayName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        tier: "normal",
        monsterName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#0ea5e9",
        baseHp: 66379,
        baseAttack: 69,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_224: {
        id: "level_stage_224",
        kind: "level",
        displayName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        tier: "normal",
        monsterName: "\uD3ED\uD48D \uB3C5\uC218\uB9AC",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#0ea5e9",
        baseHp: 69828,
        baseAttack: 70,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_225: {
        id: "level_stage_225",
        kind: "level",
        displayName: "\uD558\uB298 \uC218\uD638\uC790",
        tier: "elite",
        monsterName: "\uD558\uB298 \uC218\uD638\uC790",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#38bdf8",
        baseHp: 73276,
        baseAttack: 72,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_226: {
        id: "level_stage_226",
        kind: "level",
        displayName: "\uD558\uB298 \uC218\uD638\uC790",
        tier: "normal",
        monsterName: "\uD558\uB298 \uC218\uD638\uC790",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#38bdf8",
        baseHp: 76724,
        baseAttack: 73,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_227: {
        id: "level_stage_227",
        kind: "level",
        displayName: "\uD558\uB298 \uC218\uD638\uC790",
        tier: "normal",
        monsterName: "\uD558\uB298 \uC218\uD638\uC790",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#38bdf8",
        baseHp: 80172,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_228: {
        id: "level_stage_228",
        kind: "level",
        displayName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        monsterEmoji: "\u{1F6E1}\uFE0F",
        monsterColor: "#bae6fd",
        baseHp: 83621,
        baseAttack: 75,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_229: {
        id: "level_stage_229",
        kind: "level",
        displayName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        tier: "elite",
        monsterName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        monsterEmoji: "\u{1F6E1}\uFE0F",
        monsterColor: "#bae6fd",
        baseHp: 87069,
        baseAttack: 76,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_230: {
        id: "level_stage_230",
        kind: "level",
        displayName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uCC9C\uC0C1 \uAE30\uC0AC",
        monsterEmoji: "\u{1F6E1}\uFE0F",
        monsterColor: "#bae6fd",
        baseHp: 90517,
        baseAttack: 77,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_231: {
        id: "level_stage_231",
        kind: "level",
        displayName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#f97316",
        baseHp: 93966,
        baseAttack: 72,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_232: {
        id: "level_stage_232",
        kind: "level",
        displayName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#f97316",
        baseHp: 97414,
        baseAttack: 73,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_233: {
        id: "level_stage_233",
        kind: "level",
        displayName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#f97316",
        baseHp: 100862,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_234: {
        id: "level_stage_234",
        kind: "level",
        displayName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        tier: "normal",
        monsterName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#f97316",
        baseHp: 104310,
        baseAttack: 75,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_235: {
        id: "level_stage_235",
        kind: "level",
        displayName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        tier: "elite",
        monsterName: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#f97316",
        baseHp: 107759,
        baseAttack: 76,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_236: {
        id: "level_stage_236",
        kind: "level",
        displayName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u2601\uFE0F",
        monsterColor: "#7dd3fc",
        baseHp: 111207,
        baseAttack: 77,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_237: {
        id: "level_stage_237",
        kind: "level",
        displayName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u2601\uFE0F",
        monsterColor: "#7dd3fc",
        baseHp: 114655,
        baseAttack: 78,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_238: {
        id: "level_stage_238",
        kind: "level",
        displayName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        tier: "normal",
        monsterName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u2601\uFE0F",
        monsterColor: "#7dd3fc",
        baseHp: 118103,
        baseAttack: 79,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_239: {
        id: "level_stage_239",
        kind: "level",
        displayName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        tier: "elite",
        monsterName: "\uCC9C\uACF5 \uAC00\uB514\uC5B8",
        monsterEmoji: "\u2601\uFE0F",
        monsterColor: "#7dd3fc",
        baseHp: 121552,
        baseAttack: 80,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_240: {
        id: "level_stage_240",
        kind: "level",
        displayName: "\uCC9C\uB465 \uC6A9",
        tier: "boss",
        monsterName: "\uCC9C\uB465 \uC6A9",
        monsterEmoji: "\u26A1",
        monsterColor: "#facc15",
        baseHp: 125e3,
        baseAttack: 92,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_241: {
        id: "level_stage_241",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#334155",
        baseHp: 36e3,
        baseAttack: 68,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_242: {
        id: "level_stage_242",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#334155",
        baseHp: 40966,
        baseAttack: 69,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_243: {
        id: "level_stage_243",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#334155",
        baseHp: 45931,
        baseAttack: 70,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_244: {
        id: "level_stage_244",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#334155",
        baseHp: 50897,
        baseAttack: 72,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_245: {
        id: "level_stage_245",
        kind: "level",
        displayName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        tier: "elite",
        monsterName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        monsterEmoji: "\u{1F5A4}",
        monsterColor: "#1e293b",
        baseHp: 55862,
        baseAttack: 73,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_246: {
        id: "level_stage_246",
        kind: "level",
        displayName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        tier: "normal",
        monsterName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        monsterEmoji: "\u{1F5A4}",
        monsterColor: "#1e293b",
        baseHp: 60828,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_247: {
        id: "level_stage_247",
        kind: "level",
        displayName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        tier: "normal",
        monsterName: "\uC554\uD751 \uAC70\uBA38\uB9AC",
        monsterEmoji: "\u{1F5A4}",
        monsterColor: "#1e293b",
        baseHp: 65793,
        baseAttack: 75,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_248: {
        id: "level_stage_248",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#475569",
        baseHp: 70759,
        baseAttack: 76,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_249: {
        id: "level_stage_249",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        tier: "elite",
        monsterName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#475569",
        baseHp: 75724,
        baseAttack: 77,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_250: {
        id: "level_stage_250",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790",
        monsterEmoji: "\u{1F441}\uFE0F",
        monsterColor: "#475569",
        baseHp: 80690,
        baseAttack: 78,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_251: {
        id: "level_stage_251",
        kind: "level",
        displayName: "\uD63C\uB3C8 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uD63C\uB3C8 \uAE30\uC0AC",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#312e81",
        baseHp: 85655,
        baseAttack: 73,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_252: {
        id: "level_stage_252",
        kind: "level",
        displayName: "\uD63C\uB3C8 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uD63C\uB3C8 \uAE30\uC0AC",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#312e81",
        baseHp: 90621,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_253: {
        id: "level_stage_253",
        kind: "level",
        displayName: "\uD63C\uB3C8 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uD63C\uB3C8 \uAE30\uC0AC",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#312e81",
        baseHp: 95586,
        baseAttack: 75,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_254: {
        id: "level_stage_254",
        kind: "level",
        displayName: "\uD63C\uB3C8 \uAE30\uC0AC",
        tier: "normal",
        monsterName: "\uD63C\uB3C8 \uAE30\uC0AC",
        monsterEmoji: "\u2694\uFE0F",
        monsterColor: "#312e81",
        baseHp: 100552,
        baseAttack: 76,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_255: {
        id: "level_stage_255",
        kind: "level",
        displayName: "\uC545\uBABD \uC9D0\uC2B9",
        tier: "elite",
        monsterName: "\uC545\uBABD \uC9D0\uC2B9",
        monsterEmoji: "\u{1F479}",
        monsterColor: "#1e1b4b",
        baseHp: 105517,
        baseAttack: 77,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_256: {
        id: "level_stage_256",
        kind: "level",
        displayName: "\uC545\uBABD \uC9D0\uC2B9",
        tier: "normal",
        monsterName: "\uC545\uBABD \uC9D0\uC2B9",
        monsterEmoji: "\u{1F479}",
        monsterColor: "#1e1b4b",
        baseHp: 110483,
        baseAttack: 78,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_257: {
        id: "level_stage_257",
        kind: "level",
        displayName: "\uC545\uBABD \uC9D0\uC2B9",
        tier: "normal",
        monsterName: "\uC545\uBABD \uC9D0\uC2B9",
        monsterEmoji: "\u{1F479}",
        monsterColor: "#1e1b4b",
        baseHp: 115448,
        baseAttack: 79,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_258: {
        id: "level_stage_258",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0f172a",
        baseHp: 120414,
        baseAttack: 80,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_259: {
        id: "level_stage_259",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        tier: "elite",
        monsterName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0f172a",
        baseHp: 125379,
        baseAttack: 81,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_260: {
        id: "level_stage_260",
        kind: "level",
        displayName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        tier: "normal",
        monsterName: "\uD5C8\uACF5 \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#0f172a",
        baseHp: 130345,
        baseAttack: 83,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_261: {
        id: "level_stage_261",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uC655",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uC655",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#1e293b",
        baseHp: 135310,
        baseAttack: 77,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_262: {
        id: "level_stage_262",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uC655",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uC655",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#1e293b",
        baseHp: 140276,
        baseAttack: 78,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_263: {
        id: "level_stage_263",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uC655",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uC655",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#1e293b",
        baseHp: 145241,
        baseAttack: 79,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_264: {
        id: "level_stage_264",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uC655",
        tier: "normal",
        monsterName: "\uC2EC\uC5F0 \uC655",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#1e293b",
        baseHp: 150207,
        baseAttack: 80,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_265: {
        id: "level_stage_265",
        kind: "level",
        displayName: "\uC2EC\uC5F0 \uC655",
        tier: "elite",
        monsterName: "\uC2EC\uC5F0 \uC655",
        monsterEmoji: "\u{1F451}",
        monsterColor: "#1e293b",
        baseHp: 155172,
        baseAttack: 81,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_266: {
        id: "level_stage_266",
        kind: "level",
        displayName: "\uACF5\uD5C8\uC758 \uC2E0",
        tier: "normal",
        monsterName: "\uACF5\uD5C8\uC758 \uC2E0",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#0f172a",
        baseHp: 160138,
        baseAttack: 83,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_267: {
        id: "level_stage_267",
        kind: "level",
        displayName: "\uACF5\uD5C8\uC758 \uC2E0",
        tier: "normal",
        monsterName: "\uACF5\uD5C8\uC758 \uC2E0",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#0f172a",
        baseHp: 165103,
        baseAttack: 84,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_268: {
        id: "level_stage_268",
        kind: "level",
        displayName: "\uACF5\uD5C8\uC758 \uC2E0",
        tier: "normal",
        monsterName: "\uACF5\uD5C8\uC758 \uC2E0",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#0f172a",
        baseHp: 170069,
        baseAttack: 85,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_269: {
        id: "level_stage_269",
        kind: "level",
        displayName: "\uACF5\uD5C8\uC758 \uC2E0",
        tier: "elite",
        monsterName: "\uACF5\uD5C8\uC758 \uC2E0",
        monsterEmoji: "\u{1F311}",
        monsterColor: "#0f172a",
        baseHp: 175034,
        baseAttack: 86,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_270: {
        id: "level_stage_270",
        kind: "level",
        displayName: "\uC2EC\uC5F0\uC758 \uAD70\uC8FC",
        tier: "boss",
        monsterName: "\uC2EC\uC5F0\uC758 \uAD70\uC8FC",
        monsterEmoji: "\u{1F47F}",
        monsterColor: "#020617",
        baseHp: 18e4,
        baseAttack: 98,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_271: {
        id: "level_stage_271",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E0}",
        monsterColor: "#f97316",
        baseHp: 5e4,
        baseAttack: 74,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_272: {
        id: "level_stage_272",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E0}",
        monsterColor: "#f97316",
        baseHp: 56897,
        baseAttack: 75,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_273: {
        id: "level_stage_273",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E0}",
        monsterColor: "#f97316",
        baseHp: 63793,
        baseAttack: 76,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_274: {
        id: "level_stage_274",
        kind: "level",
        displayName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        tier: "normal",
        monsterName: "\uC6A9\uC554 \uC2AC\uB77C\uC784",
        monsterEmoji: "\u{1F7E0}",
        monsterColor: "#f97316",
        baseHp: 70690,
        baseAttack: 77,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_275: {
        id: "level_stage_275",
        kind: "level",
        displayName: "\uBD88 \uB3C4\uB9C8\uBC40",
        tier: "elite",
        monsterName: "\uBD88 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#ef4444",
        baseHp: 77586,
        baseAttack: 78,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_276: {
        id: "level_stage_276",
        kind: "level",
        displayName: "\uBD88 \uB3C4\uB9C8\uBC40",
        tier: "normal",
        monsterName: "\uBD88 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#ef4444",
        baseHp: 84483,
        baseAttack: 79,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_277: {
        id: "level_stage_277",
        kind: "level",
        displayName: "\uBD88 \uB3C4\uB9C8\uBC40",
        tier: "normal",
        monsterName: "\uBD88 \uB3C4\uB9C8\uBC40",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#ef4444",
        baseHp: 91379,
        baseAttack: 80,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_278: {
        id: "level_stage_278",
        kind: "level",
        displayName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        tier: "normal",
        monsterName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#dc2626",
        baseHp: 98276,
        baseAttack: 81,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_279: {
        id: "level_stage_279",
        kind: "level",
        displayName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        tier: "elite",
        monsterName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#dc2626",
        baseHp: 105172,
        baseAttack: 83,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_280: {
        id: "level_stage_280",
        kind: "level",
        displayName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        tier: "normal",
        monsterName: "\uB9C8\uADF8\uB9C8 \uAC8C",
        monsterEmoji: "\u{1F980}",
        monsterColor: "#dc2626",
        baseHp: 112069,
        baseAttack: 84,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_281: {
        id: "level_stage_281",
        kind: "level",
        displayName: "\uD654\uC5FC \uAC70\uC778",
        tier: "normal",
        monsterName: "\uD654\uC5FC \uAC70\uC778",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 118966,
        baseAttack: 78,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_282: {
        id: "level_stage_282",
        kind: "level",
        displayName: "\uD654\uC5FC \uAC70\uC778",
        tier: "normal",
        monsterName: "\uD654\uC5FC \uAC70\uC778",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 125862,
        baseAttack: 79,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_283: {
        id: "level_stage_283",
        kind: "level",
        displayName: "\uD654\uC5FC \uAC70\uC778",
        tier: "normal",
        monsterName: "\uD654\uC5FC \uAC70\uC778",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 132759,
        baseAttack: 80,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_284: {
        id: "level_stage_284",
        kind: "level",
        displayName: "\uD654\uC5FC \uAC70\uC778",
        tier: "normal",
        monsterName: "\uD654\uC5FC \uAC70\uC778",
        monsterEmoji: "\u{1F525}",
        monsterColor: "#ef4444",
        baseHp: 139655,
        baseAttack: 81,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_285: {
        id: "level_stage_285",
        kind: "level",
        displayName: "\uC6A9\uC735 \uACE8\uB818",
        tier: "elite",
        monsterName: "\uC6A9\uC735 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#b91c1c",
        baseHp: 146552,
        baseAttack: 83,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_286: {
        id: "level_stage_286",
        kind: "level",
        displayName: "\uC6A9\uC735 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC6A9\uC735 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#b91c1c",
        baseHp: 153448,
        baseAttack: 84,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_287: {
        id: "level_stage_287",
        kind: "level",
        displayName: "\uC6A9\uC735 \uACE8\uB818",
        tier: "normal",
        monsterName: "\uC6A9\uC735 \uACE8\uB818",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#b91c1c",
        baseHp: 160345,
        baseAttack: 85,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_288: {
        id: "level_stage_288",
        kind: "level",
        displayName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        tier: "normal",
        monsterName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f97316",
        baseHp: 167241,
        baseAttack: 86,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_289: {
        id: "level_stage_289",
        kind: "level",
        displayName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        tier: "elite",
        monsterName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f97316",
        baseHp: 174138,
        baseAttack: 87,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_290: {
        id: "level_stage_290",
        kind: "level",
        displayName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        tier: "normal",
        monsterName: "\uBD88\uAF43 \uC640\uC774\uBC88",
        monsterEmoji: "\u{1F98E}",
        monsterColor: "#f97316",
        baseHp: 181034,
        baseAttack: 88,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_291: {
        id: "level_stage_291",
        kind: "level",
        displayName: "\uD654\uC0B0 \uAD70\uC8FC",
        tier: "normal",
        monsterName: "\uD654\uC0B0 \uAD70\uC8FC",
        monsterEmoji: "\u{1F30B}",
        monsterColor: "#dc2626",
        baseHp: 187931,
        baseAttack: 83,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_292: {
        id: "level_stage_292",
        kind: "level",
        displayName: "\uD654\uC0B0 \uAD70\uC8FC",
        tier: "normal",
        monsterName: "\uD654\uC0B0 \uAD70\uC8FC",
        monsterEmoji: "\u{1F30B}",
        monsterColor: "#dc2626",
        baseHp: 194828,
        baseAttack: 84,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_293: {
        id: "level_stage_293",
        kind: "level",
        displayName: "\uD654\uC0B0 \uAD70\uC8FC",
        tier: "normal",
        monsterName: "\uD654\uC0B0 \uAD70\uC8FC",
        monsterEmoji: "\u{1F30B}",
        monsterColor: "#dc2626",
        baseHp: 201724,
        baseAttack: 85,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_294: {
        id: "level_stage_294",
        kind: "level",
        displayName: "\uD654\uC0B0 \uAD70\uC8FC",
        tier: "normal",
        monsterName: "\uD654\uC0B0 \uAD70\uC8FC",
        monsterEmoji: "\u{1F30B}",
        monsterColor: "#dc2626",
        baseHp: 208621,
        baseAttack: 86,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_295: {
        id: "level_stage_295",
        kind: "level",
        displayName: "\uD654\uC0B0 \uAD70\uC8FC",
        tier: "elite",
        monsterName: "\uD654\uC0B0 \uAD70\uC8FC",
        monsterEmoji: "\u{1F30B}",
        monsterColor: "#dc2626",
        baseHp: 215517,
        baseAttack: 87,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_296: {
        id: "level_stage_296",
        kind: "level",
        displayName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        tier: "normal",
        monsterName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#b91c1c",
        baseHp: 222414,
        baseAttack: 88,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_297: {
        id: "level_stage_297",
        kind: "level",
        displayName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        tier: "normal",
        monsterName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#b91c1c",
        baseHp: 229310,
        baseAttack: 89,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_298: {
        id: "level_stage_298",
        kind: "level",
        displayName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        tier: "normal",
        monsterName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#b91c1c",
        baseHp: 236207,
        baseAttack: 90,
        attackIntervalMs: 5e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_299: {
        id: "level_stage_299",
        kind: "level",
        displayName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        tier: "elite",
        monsterName: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#b91c1c",
        baseHp: 243103,
        baseAttack: 91,
        attackIntervalMs: 4e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      level_stage_300: {
        id: "level_stage_300",
        kind: "level",
        displayName: "\uB808\uB4DC \uB4DC\uB798\uACE4",
        tier: "boss",
        monsterName: "\uB808\uB4DC \uB4DC\uB798\uACE4",
        monsterEmoji: "\u{1F432}",
        monsterColor: "#991b1b",
        baseHp: 25e4,
        baseAttack: 103,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_1: {
        id: "raid_normal_stage_1",
        kind: "raid",
        displayName: "raid.boss1",
        tier: "boss",
        monsterName: "raid.boss1",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 1e5,
        baseAttack: 16,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_1: {
        id: "raid_boss_stage_1",
        kind: "raid",
        displayName: "raid.boss1",
        tier: "boss",
        monsterName: "raid.boss1",
        monsterEmoji: "\u{1F7E2}",
        monsterColor: "#4ade80",
        baseHp: 1e5,
        baseAttack: 16,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_2: {
        id: "raid_normal_stage_2",
        kind: "raid",
        displayName: "raid.boss2",
        tier: "boss",
        monsterName: "raid.boss2",
        monsterEmoji: "\u{1F982}",
        monsterColor: "#f59e0b",
        baseHp: 2e5,
        baseAttack: 19,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_2: {
        id: "raid_boss_stage_2",
        kind: "raid",
        displayName: "raid.boss2",
        tier: "boss",
        monsterName: "raid.boss2",
        monsterEmoji: "\u{1F982}",
        monsterColor: "#f59e0b",
        baseHp: 2e5,
        baseAttack: 19,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_3: {
        id: "raid_normal_stage_3",
        kind: "raid",
        displayName: "raid.boss3",
        tier: "boss",
        monsterName: "raid.boss3",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 3e5,
        baseAttack: 21,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_3: {
        id: "raid_boss_stage_3",
        kind: "raid",
        displayName: "raid.boss3",
        tier: "boss",
        monsterName: "raid.boss3",
        monsterEmoji: "\u2744\uFE0F",
        monsterColor: "#93c5fd",
        baseHp: 3e5,
        baseAttack: 21,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_4: {
        id: "raid_normal_stage_4",
        kind: "raid",
        displayName: "raid.boss4",
        tier: "boss",
        monsterName: "raid.boss4",
        monsterEmoji: "\u{1F419}",
        monsterColor: "#06b6d4",
        baseHp: 4e5,
        baseAttack: 24,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_4: {
        id: "raid_boss_stage_4",
        kind: "raid",
        displayName: "raid.boss4",
        tier: "boss",
        monsterName: "raid.boss4",
        monsterEmoji: "\u{1F419}",
        monsterColor: "#06b6d4",
        baseHp: 4e5,
        baseAttack: 24,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_5: {
        id: "raid_normal_stage_5",
        kind: "raid",
        displayName: "raid.boss5",
        tier: "boss",
        monsterName: "raid.boss5",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#84cc16",
        baseHp: 5e5,
        baseAttack: 27,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_5: {
        id: "raid_boss_stage_5",
        kind: "raid",
        displayName: "raid.boss5",
        tier: "boss",
        monsterName: "raid.boss5",
        monsterEmoji: "\u{1F40D}",
        monsterColor: "#84cc16",
        baseHp: 5e5,
        baseAttack: 27,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_6: {
        id: "raid_normal_stage_6",
        kind: "raid",
        displayName: "raid.boss6",
        tier: "boss",
        monsterName: "raid.boss6",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 6e5,
        baseAttack: 30,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_6: {
        id: "raid_boss_stage_6",
        kind: "raid",
        displayName: "raid.boss6",
        tier: "boss",
        monsterName: "raid.boss6",
        monsterEmoji: "\u{1FAA8}",
        monsterColor: "#d97706",
        baseHp: 6e5,
        baseAttack: 30,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_7: {
        id: "raid_normal_stage_7",
        kind: "raid",
        displayName: "raid.boss7",
        tier: "boss",
        monsterName: "raid.boss7",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#7c3aed",
        baseHp: 7e5,
        baseAttack: 32,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_7: {
        id: "raid_boss_stage_7",
        kind: "raid",
        displayName: "raid.boss7",
        tier: "boss",
        monsterName: "raid.boss7",
        monsterEmoji: "\u{1F480}",
        monsterColor: "#7c3aed",
        baseHp: 7e5,
        baseAttack: 32,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_8: {
        id: "raid_normal_stage_8",
        kind: "raid",
        displayName: "raid.boss8",
        tier: "boss",
        monsterName: "raid.boss8",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#38bdf8",
        baseHp: 8e5,
        baseAttack: 35,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_8: {
        id: "raid_boss_stage_8",
        kind: "raid",
        displayName: "raid.boss8",
        tier: "boss",
        monsterName: "raid.boss8",
        monsterEmoji: "\u{1F985}",
        monsterColor: "#38bdf8",
        baseHp: 8e5,
        baseAttack: 35,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_9: {
        id: "raid_normal_stage_9",
        kind: "raid",
        displayName: "raid.boss9",
        tier: "boss",
        monsterName: "raid.boss9",
        monsterEmoji: "\u{1F573}\uFE0F",
        monsterColor: "#334155",
        baseHp: 9e5,
        baseAttack: 38,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_9: {
        id: "raid_boss_stage_9",
        kind: "raid",
        displayName: "raid.boss9",
        tier: "boss",
        monsterName: "raid.boss9",
        monsterEmoji: "\u{1F573}\uFE0F",
        monsterColor: "#334155",
        baseHp: 9e5,
        baseAttack: 38,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_normal_stage_10: {
        id: "raid_normal_stage_10",
        kind: "raid",
        displayName: "raid.boss10",
        tier: "boss",
        monsterName: "raid.boss10",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#ef4444",
        baseHp: 1e6,
        baseAttack: 41,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      },
      raid_boss_stage_10: {
        id: "raid_boss_stage_10",
        kind: "raid",
        displayName: "raid.boss10",
        tier: "boss",
        monsterName: "raid.boss10",
        monsterEmoji: "\u{1F409}",
        monsterColor: "#ef4444",
        baseHp: 1e6,
        baseAttack: 41,
        attackIntervalMs: 3e3,
        attackPattern: "basic_auto",
        enabled: true
      }
    },
    meta: {
      generatedAt: "1970-01-01T00:00:00.000Z",
      seededFromCode: true,
      notes: "Seeded from current runtime defaults."
    }
  };

  // src/game/visualConfig.ts
  var DEFAULT_VISUAL_REFERENCE_VIEWPORT = {
    width: 412,
    height: 915,
    safeTop: 34,
    safeBottom: 34
  };
  var DEFAULT_VISUAL_ELEMENT_RULE = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    widthScale: 1,
    heightScale: 1,
    opacity: 1,
    visible: true,
    zIndex: 0,
    safeAreaAware: false
  };
  function cloneRule() {
    return { ...DEFAULT_VISUAL_ELEMENT_RULE };
  }
  function createRules(ids) {
    return ids.reduce((acc, id) => {
      acc[id] = cloneRule();
      return acc;
    }, {});
  }
  var DEFAULT_VISUAL_CONFIG_MANIFEST = {
    version: 0,
    referenceViewport: DEFAULT_VISUAL_REFERENCE_VIEWPORT,
    screens: {
      level: {
        elements: createRules([
          "header",
          "battle_lane",
          "board",
          "skill_effect",
          "piece_tray",
          "item_bar",
          "combo_gauge"
        ]),
        backgrounds: {
          byWorld: {},
          byLevel: {}
        }
      },
      endless: {
        elements: createRules([
          "header",
          "status_bar",
          "summon_panel",
          "next_preview",
          "board",
          "skill_effect",
          "piece_tray",
          "item_bar",
          "combo_gauge"
        ])
      },
      battle: {
        elements: createRules([
          "back_button",
          "opponent_panel",
          "attack_bar",
          "board",
          "skill_effect",
          "piece_tray"
        ])
      },
      raidNormal: {
        elements: createRules([
          "top_panel",
          "skill_bar",
          "info_bar",
          "board",
          "skill_effect",
          "piece_tray",
          "combo_gauge"
        ]),
        backgrounds: {
          byBossStage: {}
        }
      },
      raidBoss: {
        elements: createRules([
          "top_panel",
          "skill_bar",
          "info_bar",
          "board",
          "skill_effect",
          "piece_tray",
          "combo_gauge"
        ]),
        backgrounds: {
          byBossStage: {}
        }
      }
    }
  };

  // src/game/layoutScale.ts
  function normalizeGameplayViewport(viewport) {
    return {
      ...DEFAULT_VISUAL_REFERENCE_VIEWPORT,
      ...viewport ?? {}
    };
  }
  function getGameplayLayoutScale(viewport) {
    const currentViewport = normalizeGameplayViewport(viewport);
    const currentUsableHeight = Math.max(
      1,
      currentViewport.height - currentViewport.safeTop - currentViewport.safeBottom
    );
    const referenceUsableHeight = Math.max(
      1,
      DEFAULT_VISUAL_REFERENCE_VIEWPORT.height - DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeTop - DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeBottom
    );
    return Math.min(
      currentViewport.width / DEFAULT_VISUAL_REFERENCE_VIEWPORT.width,
      currentUsableHeight / referenceUsableHeight
    );
  }
  function scaleGameplayUnit(baseSize, viewport, minimum = 0) {
    return Math.max(
      minimum,
      Math.round(baseSize * getGameplayLayoutScale(viewport))
    );
  }

  // src/constants/index.ts
  var COLS = 8;
  var HEART_REGEN_MS = 5 * 60 * 1e3;
  var WORLDS = [
    { id: 1, name: "\uCD08\uC6D0", color: "#22c55e", emoji: "\u{1F33F}", bossName: "\uD0B9\uC2AC\uB77C\uC784", bossEmoji: "\u{1F451}", bossColor: "#4ade80" },
    { id: 2, name: "\uC0AC\uB9C9", color: "#f59e0b", emoji: "\u{1F3DC}\uFE0F", bossName: "\uC804\uAC08\uC655", bossEmoji: "\u{1F982}", bossColor: "#fbbf24" },
    { id: 3, name: "\uC124\uC6D0", color: "#93c5fd", emoji: "\u2744\uFE0F", bossName: "\uC124\uBE59 \uC5EC\uC655", bossEmoji: "\u{1F478}", bossColor: "#bfdbfe" },
    { id: 4, name: "\uD574\uC800 \uB3D9\uAD74", color: "#06b6d4", emoji: "\u{1F30A}", bossName: "\uD06C\uB77C\uCF04", bossEmoji: "\u{1F991}", bossColor: "#22d3ee" },
    { id: 5, name: "\uB3C5\uB9BC", color: "#84cc16", emoji: "\u{1F33F}", bossName: "\uD788\uB4DC\uB77C", bossEmoji: "\u{1F40D}", bossColor: "#a3e635" },
    { id: 6, name: "\uACE0\uB300 \uC720\uC801", color: "#d97706", emoji: "\u{1F3DB}\uFE0F", bossName: "\uBA54\uB450\uC0AC", bossEmoji: "\u{1F409}", bossColor: "#f59e0b" },
    { id: 7, name: "\uC554\uD751 \uC131", color: "#7c3aed", emoji: "\u{1F3F0}", bossName: "\uB9AC\uCE58 \uD0B9", bossEmoji: "\u{1F480}", bossColor: "#a78bfa" },
    { id: 8, name: "\uCC9C\uACF5 \uC12C", color: "#38bdf8", emoji: "\u2601\uFE0F", bossName: "\uCC9C\uB465 \uC6A9", bossEmoji: "\u26A1", bossColor: "#7dd3fc" },
    { id: 9, name: "\uC2EC\uC5F0", color: "#1e3a5f", emoji: "\u{1F311}", bossName: "\uC2EC\uC5F0\uC758 \uAD70\uC8FC", bossEmoji: "\u{1F47F}", bossColor: "#334155" },
    { id: 10, name: "\uD654\uC0B0\uC9C0\uB300", color: "#dc2626", emoji: "\u{1F30B}", bossName: "\uB808\uB4DC \uB4DC\uB798\uACE4", bossEmoji: "\u{1F432}", bossColor: "#ef4444" }
  ];
  var WORLD_MONSTERS = [
    // World 1 ??珥덉썝
    {
      entrance: [
        { name: "\uC2AC\uB77C\uC784", emoji: "\u{1F7E2}", color: "#4ade80" },
        { name: "\uCD08\uC6D0 \uD1A0\uB07C", emoji: "\u{1F430}", color: "#86efac" },
        { name: "\uBC84\uC12F \uBCD1\uC0AC", emoji: "\u{1F344}", color: "#a3e635" }
      ],
      center: [
        { name: "\uC11D\uC0C1 \uACE8\uB818", emoji: "\u{1FAA8}", color: "#9ca3af" },
        { name: "\uB369\uAD74 \uC0DD\uBB3C", emoji: "\u{1F33F}", color: "#4ade80" },
        { name: "\uC232\uC758 \uC815\uB839", emoji: "\u{1F9DA}", color: "#86efac" }
      ],
      boss: [
        { name: "\uD3EC\uB808\uC2A4\uD2B8 \uAC00\uB514\uC5B8", emoji: "\u{1F333}", color: "#16a34a" },
        { name: "\uADF8\uB9B0 \uBC14\uC2E4\uB9AC\uC2A4\uD06C", emoji: "\u{1F98E}", color: "#4ade80" },
        { name: "\uD0B9\uC2AC\uB77C\uC784", emoji: "\u{1F451}", color: "#22c55e" }
      ]
    },
    // World 2 ???щ쭑
    {
      entrance: [
        { name: "\uBAA8\uB798 \uAC8C", emoji: "\u{1F980}", color: "#fbbf24" },
        { name: "\uC0AC\uB9C9 \uB3C4\uB9C8\uBC40", emoji: "\u{1F98E}", color: "#f59e0b" },
        { name: "\uC120\uC778\uC7A5 \uBCD1\uC0AC", emoji: "\u{1F335}", color: "#86efac" }
      ],
      center: [
        { name: "\uBBF8\uB77C", emoji: "\u{1F9DF}", color: "#d97706" },
        { name: "\uBAA8\uB798 \uC9C0\uB801\uC774", emoji: "\u{1F41B}", color: "#fbbf24" },
        { name: "\uC0AC\uB9C9 \uC5EC\uC6B0", emoji: "\u{1F98A}", color: "#f97316" }
      ],
      boss: [
        { name: "\uC0AC\uB9C9 \uACE8\uB818", emoji: "\u{1FAA8}", color: "#d97706" },
        { name: "\uC2A4\uD551\uD06C\uC2A4", emoji: "\u{1F981}", color: "#f59e0b" },
        { name: "\uC804\uAC08\uC655", emoji: "\u{1F982}", color: "#ef4444" }
      ]
    },
    // World 3 ???ㅼ썝
    {
      entrance: [
        { name: "\uC5BC\uC74C \uB291\uB300", emoji: "\u{1F43A}", color: "#93c5fd" },
        { name: "\uB208 \uD1A0\uB07C", emoji: "\u{1F430}", color: "#bfdbfe" },
        { name: "\uC11C\uB9AC \uC694\uC815", emoji: "\u{1F9DA}", color: "#dbeafe" }
      ],
      center: [
        { name: "\uC5BC\uC74C \uAC70\uC778", emoji: "\u{1F9CA}", color: "#60a5fa" },
        { name: "\uC124\uC6D0 \uB9E4", emoji: "\u{1F985}", color: "#93c5fd" },
        { name: "\uB3D9\uACB0 \uACE8\uB818", emoji: "\u{1FAA8}", color: "#bfdbfe" }
      ],
      boss: [
        { name: "\uBE59\uD558 \uB4DC\uB798\uACE4", emoji: "\u{1F409}", color: "#60a5fa" },
        { name: "\uB208\uBCF4\uB77C \uC815\uB839", emoji: "\u2744\uFE0F", color: "#93c5fd" },
        { name: "\uC124\uBE59 \uC5EC\uC655", emoji: "\u{1F478}", color: "#38bdf8" }
      ]
    },
    // World 4 ???댁? ?숆뎬
    {
      entrance: [
        { name: "\uD574\uD30C\uB9AC", emoji: "\u{1FABC}", color: "#22d3ee" },
        { name: "\uC870\uAC1C \uAE30\uC0AC", emoji: "\u{1F41A}", color: "#06b6d4" },
        { name: "\uC0B0\uD638 \uC815\uB839", emoji: "\u{1F33A}", color: "#f0abfc" }
      ],
      center: [
        { name: "\uC804\uAE30\uBC40\uC7A5\uC5B4", emoji: "\u26A1", color: "#facc15" },
        { name: "\uC0C1\uC5B4 \uC804\uC0AC", emoji: "\u{1F988}", color: "#0284c7" },
        { name: "\uC2EC\uD574 \uC6A9", emoji: "\u{1F409}", color: "#0e7490" }
      ],
      boss: [
        { name: "\uAC70\uB300 \uAC70\uBD81", emoji: "\u{1F422}", color: "#06b6d4" },
        { name: "\uC2EC\uD574 \uB808\uBE44\uC544\uD0C4", emoji: "\u{1F40B}", color: "#0369a1" },
        { name: "\uD06C\uB77C\uCF04", emoji: "\u{1F991}", color: "#0c4a6e" }
      ]
    },
    // World 5 ???낅┝
    {
      entrance: [
        { name: "\uB3C5\uBC84\uC12F", emoji: "\u{1F344}", color: "#a3e635" },
        { name: "\uB3C5 \uAC1C\uAD6C\uB9AC", emoji: "\u{1F438}", color: "#84cc16" },
        { name: "\uB369\uAD74 \uAC70\uBBF8", emoji: "\u{1F577}\uFE0F", color: "#65a30d" }
      ],
      center: [
        { name: "\uC5ED\uBCD1 \uBC15\uC950", emoji: "\u{1F987}", color: "#7c3aed" },
        { name: "\uB3C5\uC0AC", emoji: "\u{1F40D}", color: "#16a34a" },
        { name: "\uB3C5 \uD2B8\uB808\uC778\uD2B8", emoji: "\u{1F333}", color: "#4d7c0f" }
      ],
      boss: [
        { name: "\uB3C5 \uACE8\uB818", emoji: "\u{1F7E3}", color: "#8b5cf6" },
        { name: "\uD0B9 \uB3C5\uAC70\uBBF8", emoji: "\u{1F577}\uFE0F", color: "#7c3aed" },
        { name: "\uD788\uB4DC\uB77C", emoji: "\u{1F40D}", color: "#6d28d9" }
      ]
    },
    // World 6 ??怨좊? ?좎쟻
    {
      entrance: [
        { name: "\uC11D\uC0C1", emoji: "\u{1F5FF}", color: "#92400e" },
        { name: "\uC800\uC8FC\uBC1B\uC740 \uD48D\uB385\uC774", emoji: "\u{1F41E}", color: "#d97706" },
        { name: "\uC720\uC801 \uC720\uB839", emoji: "\u{1F47B}", color: "#fbbf24" }
      ],
      center: [
        { name: "\uACE8\uB818 \uAE30\uC0AC", emoji: "\u{1FAA8}", color: "#78716c" },
        { name: "\uACE0\uB300 \uC2A4\uD551\uD06C\uC2A4", emoji: "\u{1F981}", color: "#d97706" },
        { name: "\uC6A9\uC554 \uC815\uB839", emoji: "\u{1F525}", color: "#ef4444" }
      ],
      boss: [
        { name: "\uACE0\uB300 \uAC10\uC2DC\uC790", emoji: "\u{1F441}\uFE0F", color: "#d97706" },
        { name: "\uC11D\uD310 \uACE8\uB818", emoji: "\u{1FAA8}", color: "#92400e" },
        { name: "\uBA54\uB450\uC0AC", emoji: "\u{1F409}", color: "#dc2626" }
      ]
    },
    // World 7 ???뷀쓳 ??
    {
      entrance: [
        { name: "\uADF8\uB9BC\uC790 \uBC15\uC950", emoji: "\u{1F987}", color: "#6d28d9" },
        { name: "\uD574\uACE8 \uBCD1\uC0AC", emoji: "\u{1F480}", color: "#9ca3af" },
        { name: "\uC720\uB839 \uAE30\uC0AC", emoji: "\u{1F47B}", color: "#7c3aed" }
      ],
      center: [
        { name: "\uD761\uD608 \uBC15\uC950", emoji: "\u{1F9DB}", color: "#7f1d1d" },
        { name: "\uC554\uD751 \uB9C8\uBC95\uC0AC", emoji: "\u{1F9D9}", color: "#4c1d95" },
        { name: "\uC8FD\uC74C \uACE8\uB818", emoji: "\u{1F480}", color: "#1e1b4b" }
      ],
      boss: [
        { name: "\uBC34\uC2DC", emoji: "\u{1F441}\uFE0F", color: "#7c3aed" },
        { name: "\uB2E4\uD06C \uB098\uC774\uD2B8", emoji: "\u2694\uFE0F", color: "#4c1d95" },
        { name: "\uB9AC\uCE58 \uD0B9", emoji: "\u{1F480}", color: "#1e1b4b" }
      ]
    },
    // World 8 ??泥쒓났 ??
    {
      entrance: [
        { name: "\uBC14\uB78C \uC694\uC815", emoji: "\u{1F9DA}", color: "#7dd3fc" },
        { name: "\uAD6C\uB984 \uD1A0\uB07C", emoji: "\u{1F430}", color: "#bfdbfe" },
        { name: "\uCC9C\uB465\uC0C8", emoji: "\u{1F985}", color: "#38bdf8" }
      ],
      center: [
        { name: "\uD3ED\uD48D \uB3C5\uC218\uB9AC", emoji: "\u{1F985}", color: "#0ea5e9" },
        { name: "\uD558\uB298 \uC218\uD638\uC790", emoji: "\u2694\uFE0F", color: "#38bdf8" },
        { name: "\uCC9C\uC0C1 \uAE30\uC0AC", emoji: "\u{1F6E1}\uFE0F", color: "#bae6fd" }
      ],
      boss: [
        { name: "\uC2A4\uD1B0 \uD53C\uB2C9\uC2A4", emoji: "\u{1F525}", color: "#f97316" },
        { name: "\uCC9C\uACF5 \uAC00\uB514\uC5B8", emoji: "\u2601\uFE0F", color: "#7dd3fc" },
        { name: "\uCC9C\uB465 \uC6A9", emoji: "\u26A1", color: "#facc15" }
      ]
    },
    // World 9 ???ъ뿰
    {
      entrance: [
        { name: "\uD5C8\uACF5 \uC2AC\uB77C\uC784", emoji: "\u{1F311}", color: "#334155" },
        { name: "\uC554\uD751 \uAC70\uBA38\uB9AC", emoji: "\u{1F5A4}", color: "#1e293b" },
        { name: "\uC2EC\uC5F0 \uAC10\uC2DC\uC790", emoji: "\u{1F441}\uFE0F", color: "#475569" }
      ],
      center: [
        { name: "\uD63C\uB3C8 \uAE30\uC0AC", emoji: "\u2694\uFE0F", color: "#312e81" },
        { name: "\uC545\uBABD \uC9D0\uC2B9", emoji: "\u{1F479}", color: "#1e1b4b" },
        { name: "\uD5C8\uACF5 \uB4DC\uB798\uACE4", emoji: "\u{1F409}", color: "#0f172a" }
      ],
      boss: [
        { name: "\uC2EC\uC5F0 \uC655", emoji: "\u{1F451}", color: "#1e293b" },
        { name: "\uACF5\uD5C8\uC758 \uC2E0", emoji: "\u{1F311}", color: "#0f172a" },
        { name: "\uC2EC\uC5F0\uC758 \uAD70\uC8FC", emoji: "\u{1F47F}", color: "#020617" }
      ]
    },
    // World 10 ???붿궛吏?
    {
      entrance: [
        { name: "\uC6A9\uC554 \uC2AC\uB77C\uC784", emoji: "\u{1F7E0}", color: "#f97316" },
        { name: "\uBD88 \uB3C4\uB9C8\uBC40", emoji: "\u{1F98E}", color: "#ef4444" },
        { name: "\uB9C8\uADF8\uB9C8 \uAC8C", emoji: "\u{1F980}", color: "#dc2626" }
      ],
      center: [
        { name: "\uD654\uC5FC \uAC70\uC778", emoji: "\u{1F525}", color: "#ef4444" },
        { name: "\uC6A9\uC735 \uACE8\uB818", emoji: "\u{1FAA8}", color: "#b91c1c" },
        { name: "\uBD88\uAF43 \uC640\uC774\uBC88", emoji: "\u{1F98E}", color: "#f97316" }
      ],
      boss: [
        { name: "\uD654\uC0B0 \uAD70\uC8FC", emoji: "\u{1F30B}", color: "#dc2626" },
        { name: "\uC778\uD398\uB974\uB178 \uB4DC\uB808\uC774\uD06C", emoji: "\u{1F409}", color: "#b91c1c" },
        { name: "\uB808\uB4DC \uB4DC\uB798\uACE4", emoji: "\u{1F432}", color: "#991b1b" }
      ]
    }
  ];
  function getMonsterForStage(worldIdx, stage) {
    const monsters = WORLD_MONSTERS[worldIdx];
    if (stage <= 10) {
      return monsters.entrance[Math.floor((stage - 1) / 10 * monsters.entrance.length) % monsters.entrance.length];
    } else if (stage <= 20) {
      return monsters.center[Math.floor((stage - 11) / 10 * monsters.center.length) % monsters.center.length];
    } else {
      if (stage === 30) return monsters.boss[monsters.boss.length - 1];
      const idx = Math.min(Math.floor((stage - 21) / 9 * (monsters.boss.length - 1)), monsters.boss.length - 2);
      return monsters.boss[idx];
    }
  }
  var STAGE_NAME_PREFIXES = ["\uC785\uAD6C", "\uCD08\uC785", "\uC804\uCD08", "\uC678\uACFD", "\uC811\uACBD"];
  var STAGE_NAME_CENTER = ["\uC911\uC2EC\uBD80", "\uD575\uC2EC", "\uC2EC\uCE35\uBD80", "\uC694\uC0C8", "\uBCF8\uAC70\uC9C0"];
  var STAGE_NAME_BOSS = ["\uACB0\uC804 \uAD6C\uC5ED", "\uBCF4\uC2A4 \uC601\uC5ED", "\uC655\uC758 \uAC70\uCC98"];
  function getStageName(world, stage) {
    const w = WORLDS[world - 1];
    if (stage <= 10) {
      const prefix = STAGE_NAME_PREFIXES[(stage - 1) % STAGE_NAME_PREFIXES.length];
      return `${w.emoji} ${w.name} ${prefix} ${stage}`;
    } else if (stage <= 20) {
      const prefix = STAGE_NAME_CENTER[(stage - 11) % STAGE_NAME_CENTER.length];
      return `${w.emoji} ${w.name} ${prefix} ${stage}`;
    } else if (stage < 30) {
      const prefix = STAGE_NAME_BOSS[(stage - 21) % STAGE_NAME_BOSS.length];
      return `${w.emoji} ${w.name} ${prefix} ${stage}`;
    } else {
      return `${w.emoji} ${w.name} \u2014 ${w.bossName}`;
    }
  }
  var WORLD_BASE_HP = [800, 1800, 3200, 5200, 8e3, 12e3, 17500, 25e3, 36e3, 5e4];
  function getMonsterHp(world, stage) {
    const base = WORLD_BASE_HP[world - 1];
    const multiplier = 1 + (stage - 1) / 29 * 4;
    return Math.round(base * multiplier);
  }
  function getObstacles(world, stage) {
    if (world <= 2 && stage <= 10) return void 0;
    if (world <= 2) {
      return [{ type: "stone", count: 1 }];
    }
    if (world <= 4) {
      if (stage <= 10) return [{ type: "stone", count: 1 }];
      if (stage <= 20) return [{ type: "ice", count: 2 }];
      return [{ type: "ice", count: 2 }, { type: "stone", count: 1 }];
    }
    if (world <= 6) {
      if (stage <= 10) return [{ type: "ice", count: 2 }];
      if (stage <= 20) return [{ type: "ice", count: 2 }, { type: "stone", count: 2 }];
      return [{ type: "hard", count: 2, hits: 2 }, { type: "stone", count: 1 }];
    }
    if (world <= 8) {
      if (stage <= 10) return [{ type: "hard", count: 2, hits: 2 }];
      if (stage <= 20) return [{ type: "hard", count: 3, hits: 3 }];
      return [{ type: "hard", count: 3, hits: 3 }, { type: "stone", count: 2 }];
    }
    if (stage <= 10) return [{ type: "hard", count: 3, hits: 3 }];
    if (stage <= 20) return [{ type: "hard", count: 4, hits: 4 }];
    return [{ type: "hard", count: 4, hits: 5 }, { type: "stone", count: 2 }];
  }
  function generateLevels() {
    const levels = [];
    for (let world = 1; world <= 10; world++) {
      for (let stage = 1; stage <= 30; stage++) {
        const id = (world - 1) * 30 + stage;
        const monster = getMonsterForStage(world - 1, stage);
        levels.push({
          id,
          world,
          name: getStageName(world, stage),
          goal: {
            type: "monster",
            monsterHp: getMonsterHp(world, stage),
            monsterName: monster.name,
            monsterEmoji: monster.emoji,
            monsterColor: monster.color
          },
          obstacles: getObstacles(world, stage)
        });
      }
    }
    return levels;
  }
  var LEVELS = generateLevels();
  var BOSS_RAID_INTERVAL_MS = 4 * 60 * 60 * 1e3;
  var BOSS_RAID_WINDOW_MS = 10 * 60 * 1e3;
  var BOSS_RAID_HP = Array.from({ length: 10 }, (_, i) => (i + 1) * 1e5);

  // src/game/gameplayMetrics.ts
  var SCREEN_WIDTH = DEFAULT_VISUAL_REFERENCE_VIEWPORT.width;
  var BOARD_PADDING = 8;
  var CELL_GAP = 2;
  var BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 388);
  var COMPACT_SCALE = 0.82;
  var PIECE_TRAY_HEIGHT = 124;
  var PIECE_TRAY_HEIGHT_COMPACT = 108;
  var CELL_SIZE = (BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS;
  function getBoardMetrics(viewport = DEFAULT_VISUAL_REFERENCE_VIEWPORT, options) {
    const resolvedViewport = typeof viewport === "number" ? normalizeGameplayViewport({
      width: viewport,
      height: DEFAULT_VISUAL_REFERENCE_VIEWPORT.height
    }) : normalizeGameplayViewport(viewport);
    const layoutScale = getGameplayLayoutScale(resolvedViewport);
    const modeScale = options?.small ? 0.4 : options?.compact ? COMPACT_SCALE : 1;
    const combinedScale = layoutScale * modeScale;
    const cellSize = CELL_SIZE * combinedScale;
    const gap = CELL_GAP * combinedScale;
    const padding = BOARD_PADDING * combinedScale;
    const boardSize = cellSize * COLS + gap * (COLS - 1) + padding * 2;
    return {
      scale: combinedScale,
      layoutScale,
      modeScale,
      cellSize,
      gap,
      padding,
      boardSize
    };
  }
  function getPieceTrayHeight(viewport, compact = false) {
    const layoutScale = getGameplayLayoutScale(viewport);
    return Math.max(
      88,
      Math.round(
        (compact ? PIECE_TRAY_HEIGHT_COMPACT : PIECE_TRAY_HEIGHT) * layoutScale
      )
    );
  }
  function getComboGaugeMetrics(viewport, compact = false) {
    const currentViewport = normalizeGameplayViewport(viewport);
    const widthRatio = compact ? 0.46 : 0.48;
    const minWidth = compact ? 120 : 136;
    const maxWidth = compact ? 172 : 196;
    return {
      top: compact ? 6 : 8,
      width: Math.round(
        Math.max(
          minWidth,
          Math.min(maxWidth, currentViewport.width * widthRatio)
        )
      ),
      height: compact ? 24 : 27
    };
  }

  // src/game/visualRuntimeLayout.ts
  function clampSize(value, minimum = 0) {
    return Math.max(minimum, Math.round(value));
  }
  function makeRect(left, top, width, height) {
    return {
      left: clampSize(left),
      top: clampSize(top),
      width: clampSize(width),
      height: clampSize(height)
    };
  }
  function getCenteredBoardRect(boardRect, boardSize) {
    return makeRect(
      boardRect.left + Math.max(0, (boardRect.width - boardSize) / 2),
      boardRect.top + Math.max(0, (boardRect.height - boardSize) / 2),
      boardSize,
      boardSize
    );
  }
  function getContentBounds(viewport) {
    const gutter = scaleGameplayUnit(46, viewport, 16);
    return {
      left: 0,
      top: viewport.safeTop + gutter,
      width: viewport.width,
      height: Math.max(
        0,
        viewport.height - viewport.safeTop - viewport.safeBottom - gutter * 2
      ),
      bottom: viewport.height - viewport.safeBottom - gutter
    };
  }
  function getHeaderHeight(screenId) {
    switch (screenId) {
      case "level":
        return 48;
      case "endless":
        return 126;
      default:
        return 0;
    }
  }
  function getLevelBattleLaneHeight() {
    return 130;
  }
  function getStatusBarHeight() {
    return 34;
  }
  function getNextPreviewHeight() {
    return 80;
  }
  function getSummonPanelHeight() {
    return 78;
  }
  function getItemBarHeight() {
    return 66;
  }
  function getBattleOpponentPanelHeight(viewport) {
    return clampSize(getBoardMetrics(viewport, { small: true }).boardSize + 22);
  }
  function getBattleAttackBarHeight() {
    return 44;
  }
  function getRaidTopPanelHeight(screenId) {
    return screenId === "raidNormal" ? 186 : 176;
  }
  function getRaidSkillBarHeight() {
    return 38;
  }
  function getRaidInfoBarHeight() {
    return 20;
  }
  function buildLevelLayout(viewport) {
    const content = getContentBounds(viewport);
    const headerHeight = getHeaderHeight("level");
    const battleLaneHeight = getLevelBattleLaneHeight();
    const itemBarHeight = getItemBarHeight();
    const pieceTrayHeight = getPieceTrayHeight(viewport, true);
    const bottomRowHeight = pieceTrayHeight + 2;
    const boardTop = content.top + headerHeight + battleLaneHeight;
    const pieceTrayTop = content.bottom - itemBarHeight - bottomRowHeight;
    const boardHeight = Math.max(0, pieceTrayTop - boardTop);
    const trayWidth = Math.max(0, viewport.width - 24);
    const gauge = getComboGaugeMetrics(viewport, false);
    const boardMetrics = getBoardMetrics(viewport);
    const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
    const boardRect = getCenteredBoardRect(
      boardStageRect,
      boardMetrics.boardSize
    );
    const skillEffectRect = boardRect;
    return {
      header: makeRect(0, content.top, viewport.width, headerHeight),
      battle_lane: makeRect(
        0,
        content.top + headerHeight,
        viewport.width,
        battleLaneHeight
      ),
      board: boardRect,
      skill_effect: skillEffectRect,
      piece_tray: makeRect(12, pieceTrayTop, trayWidth, pieceTrayHeight),
      item_bar: makeRect(
        0,
        content.bottom - itemBarHeight,
        viewport.width,
        itemBarHeight
      ),
      combo_gauge: makeRect(
        (viewport.width - gauge.width) / 2,
        boardRect.top + gauge.top,
        gauge.width,
        gauge.height
      )
    };
  }
  function buildEndlessLayout(viewport) {
    const content = getContentBounds(viewport);
    const headerHeight = getHeaderHeight("endless");
    const statusBarHeight = getStatusBarHeight();
    const nextPreviewHeight = getNextPreviewHeight();
    const summonPanelHeight = getSummonPanelHeight();
    const itemBarHeight = getItemBarHeight();
    const pieceTrayHeight = getPieceTrayHeight(viewport, false);
    const boardTop = content.top + headerHeight + statusBarHeight + nextPreviewHeight + summonPanelHeight;
    const pieceTrayTop = content.bottom - itemBarHeight - pieceTrayHeight;
    const boardHeight = Math.max(0, pieceTrayTop - boardTop);
    const boardMetrics = getBoardMetrics(viewport, { compact: true });
    const gauge = getComboGaugeMetrics(viewport, true);
    const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
    const boardRect = getCenteredBoardRect(
      boardStageRect,
      boardMetrics.boardSize
    );
    const skillEffectRect = boardRect;
    return {
      header: makeRect(0, content.top, viewport.width, headerHeight),
      status_bar: makeRect(
        0,
        content.top + headerHeight,
        viewport.width,
        statusBarHeight
      ),
      next_preview: makeRect(
        0,
        content.top + headerHeight + statusBarHeight,
        viewport.width,
        nextPreviewHeight
      ),
      summon_panel: makeRect(
        0,
        content.top + headerHeight + statusBarHeight + nextPreviewHeight,
        viewport.width,
        summonPanelHeight
      ),
      board: boardRect,
      skill_effect: skillEffectRect,
      piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight),
      item_bar: makeRect(
        0,
        content.bottom - itemBarHeight,
        viewport.width,
        itemBarHeight
      ),
      combo_gauge: makeRect(
        (viewport.width - gauge.width) / 2,
        boardRect.top + gauge.top,
        gauge.width,
        gauge.height
      )
    };
  }
  function buildBattleLayout(viewport) {
    const content = getContentBounds(viewport);
    const backSize = 42;
    const opponentPanelHeight = getBattleOpponentPanelHeight(viewport);
    const attackBarHeight = getBattleAttackBarHeight();
    const pieceTrayHeight = getPieceTrayHeight(viewport, true);
    const boardTop = content.top + opponentPanelHeight + attackBarHeight;
    const pieceTrayTop = content.bottom - pieceTrayHeight;
    const boardStageRect = makeRect(
      0,
      boardTop,
      viewport.width,
      Math.max(0, pieceTrayTop - boardTop)
    );
    const boardMetrics = getBoardMetrics(viewport, { compact: true });
    const boardRect = getCenteredBoardRect(
      boardStageRect,
      boardMetrics.boardSize
    );
    const skillEffectRect = boardRect;
    return {
      back_button: makeRect(12, content.top + 10, backSize, backSize),
      opponent_panel: makeRect(
        0,
        content.top,
        viewport.width,
        opponentPanelHeight
      ),
      attack_bar: makeRect(
        0,
        content.top + opponentPanelHeight,
        viewport.width,
        attackBarHeight
      ),
      board: boardRect,
      skill_effect: skillEffectRect,
      piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight)
    };
  }
  function buildRaidLayout(screenId, viewport) {
    const content = getContentBounds(viewport);
    const topPanelHeight = getRaidTopPanelHeight(screenId);
    const skillBarHeight = getRaidSkillBarHeight();
    const infoBarHeight = getRaidInfoBarHeight();
    const pieceTrayHeight = getPieceTrayHeight(viewport, true);
    const boardMetrics = getBoardMetrics(viewport, { compact: true });
    const boardTop = content.top + topPanelHeight + skillBarHeight + infoBarHeight;
    const pieceTrayTop = content.bottom - pieceTrayHeight;
    const boardHeight = Math.max(
      boardMetrics.boardSize + 18,
      pieceTrayTop - boardTop
    );
    const gauge = getComboGaugeMetrics(viewport, true);
    const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
    const boardRect = getCenteredBoardRect(
      boardStageRect,
      boardMetrics.boardSize
    );
    const skillEffectRect = boardRect;
    return {
      top_panel: makeRect(0, content.top, viewport.width, topPanelHeight),
      skill_bar: makeRect(
        0,
        content.top + topPanelHeight,
        viewport.width,
        skillBarHeight
      ),
      info_bar: makeRect(
        0,
        content.top + topPanelHeight + skillBarHeight,
        viewport.width,
        infoBarHeight
      ),
      board: boardRect,
      skill_effect: skillEffectRect,
      piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight),
      combo_gauge: makeRect(
        (viewport.width - gauge.width) / 2,
        boardRect.top + gauge.top,
        gauge.width,
        gauge.height
      )
    };
  }
  function getVisualRuntimeLayout(screenId, viewport) {
    switch (screenId) {
      case "level":
        return buildLevelLayout(viewport);
      case "endless":
        return buildEndlessLayout(viewport);
      case "battle":
        return buildBattleLayout(viewport);
      case "raidNormal":
      case "raidBoss":
        return buildRaidLayout(screenId, viewport);
      default:
        return {};
    }
  }

  // tools/blockhero-creator/visual-editor-core.js
  var DEFAULT_REFERENCE_VIEWPORT = {
    width: 412,
    height: 915,
    safeTop: 34,
    safeBottom: 34
  };
  var DEVICE_PROFILES = [
    {
      id: "galaxy-s23-ultra",
      label: "\uAC24\uB7ED\uC2DC S23 \uC6B8\uD2B8\uB77C",
      viewport: { width: 412, height: 915, safeTop: 34, safeBottom: 34 }
    },
    {
      id: "galaxy-a54",
      label: "\uAC24\uB7ED\uC2DC A54",
      viewport: { width: 411, height: 891, safeTop: 32, safeBottom: 24 }
    },
    {
      id: "galaxy-fold-cover",
      label: "\uAC24\uB7ED\uC2DC \uD3F4\uB4DC \uCEE4\uBC84",
      viewport: { width: 360, height: 780, safeTop: 30, safeBottom: 24 }
    },
    {
      id: "iphone-15-pro",
      label: "\uC544\uC774\uD3F0 15 \uD504\uB85C",
      viewport: { width: 393, height: 852, safeTop: 59, safeBottom: 34 }
    },
    {
      id: "iphone-15-pro-max",
      label: "\uC544\uC774\uD3F0 15 \uD504\uB85C \uB9E5\uC2A4",
      viewport: { width: 430, height: 932, safeTop: 59, safeBottom: 34 }
    },
    {
      id: "small-android",
      label: "\uC18C\uD615 \uC548\uB4DC\uB85C\uC774\uB4DC",
      viewport: { width: 360, height: 800, safeTop: 28, safeBottom: 24 }
    },
    {
      id: "tablet-portrait",
      label: "\uD0DC\uBE14\uB9BF \uC138\uB85C",
      viewport: { width: 800, height: 1280, safeTop: 24, safeBottom: 20 }
    }
  ];
  var SCREEN_LABELS = {
    level: "\uB808\uBCA8 \uBAA8\uB4DC",
    endless: "\uBB34\uD55C \uBAA8\uB4DC",
    battle: "\uB300\uC804 \uBAA8\uB4DC",
    raidNormal: "\uC77C\uBC18 \uB808\uC774\uB4DC",
    raidBoss: "\uBCF4\uC2A4 \uB808\uC774\uB4DC"
  };
  var ELEMENT_DEFS = {
    level: [
      { id: "header", label: "\uC0C1\uB2E8 \uD5E4\uB354" },
      { id: "battle_lane", label: "\uC804\uD22C HUD" },
      { id: "board", label: "\uBE14\uB85D \uBCF4\uB4DC" },
      { id: "skill_effect", label: "\uC2A4\uD0AC \uC774\uD399\uD2B8" },
      { id: "piece_tray", label: "\uBE14\uB85D \uD2B8\uB808\uC774" },
      { id: "item_bar", label: "\uC544\uC774\uD15C \uBC14" },
      { id: "combo_gauge", label: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0" }
    ],
    endless: [
      { id: "header", label: "\uC0C1\uB2E8 \uD5E4\uB354" },
      { id: "status_bar", label: "\uC0C1\uD0DC \uBC14" },
      { id: "summon_panel", label: "\uD53C\uBC84 \uD328\uB110" },
      { id: "next_preview", label: "\uB2E4\uC74C \uBE14\uB85D" },
      { id: "board", label: "\uBE14\uB85D \uBCF4\uB4DC" },
      { id: "skill_effect", label: "\uC2A4\uD0AC \uC774\uD399\uD2B8" },
      { id: "piece_tray", label: "\uBE14\uB85D \uD2B8\uB808\uC774" },
      { id: "item_bar", label: "\uC544\uC774\uD15C \uBC14" },
      { id: "combo_gauge", label: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0" }
    ],
    battle: [
      { id: "back_button", label: "\uB4A4\uB85C \uBC84\uD2BC" },
      { id: "opponent_panel", label: "\uC0C1\uB300 \uD328\uB110" },
      { id: "attack_bar", label: "\uACF5\uACA9 \uBC14" },
      { id: "board", label: "\uBE14\uB85D \uBCF4\uB4DC" },
      { id: "skill_effect", label: "\uC2A4\uD0AC \uC774\uD399\uD2B8" },
      { id: "piece_tray", label: "\uBE14\uB85D \uD2B8\uB808\uC774" }
    ],
    raidNormal: [
      { id: "top_panel", label: "\uC0C1\uB2E8 \uD328\uB110" },
      { id: "skill_bar", label: "\uC2A4\uD0AC \uBC14" },
      { id: "info_bar", label: "\uC815\uBCF4 \uBC14" },
      { id: "board", label: "\uBE14\uB85D \uBCF4\uB4DC" },
      { id: "skill_effect", label: "\uC2A4\uD0AC \uC774\uD399\uD2B8" },
      { id: "piece_tray", label: "\uBE14\uB85D \uD2B8\uB808\uC774" },
      { id: "combo_gauge", label: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0" }
    ],
    raidBoss: [
      { id: "top_panel", label: "\uC0C1\uB2E8 \uD328\uB110" },
      { id: "skill_bar", label: "\uC2A4\uD0AC \uBC14" },
      { id: "info_bar", label: "\uC815\uBCF4 \uBC14" },
      { id: "board", label: "\uBE14\uB85D \uBCF4\uB4DC" },
      { id: "skill_effect", label: "\uC2A4\uD0AC \uC774\uD399\uD2B8" },
      { id: "piece_tray", label: "\uBE14\uB85D \uD2B8\uB808\uC774" },
      { id: "combo_gauge", label: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0" }
    ]
  };
  var ELEMENT_HELP = {
    level: {
      header: "\uC0C1\uB2E8 \uD5E4\uB354\uB294 \uD55C \uC190\uC73C\uB85C \uB204\uB974\uAE30 \uC26C\uC6B4 \uC704\uCE58\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      battle_lane: "\uC804\uD22C HUD\uB294 \uBCF4\uB4DC\uC640 \uCDA9\uB3CC\uD558\uC9C0 \uC54A\uAC8C \uC5EC\uBC31\uC744 \uB450\uB294 \uD3B8\uC774 \uC548\uC804\uD569\uB2C8\uB2E4.",
      board: "\uBCF4\uB4DC\uB294 \uAE30\uC900 \uC694\uC18C\uC785\uB2C8\uB2E4. \uB2E4\uB978 UI\uB294 \uBCF4\uB4DC\uC5D0 \uB9DE\uCDB0 \uC815\uB82C\uD558\uC138\uC694.",
      skill_effect: "\uC2A4\uD0AC \uC774\uD399\uD2B8\uB294 \uBCF4\uB4DC \uC704\uC5D0 \uBD99\uB294 \uBC1C\uB3D9 \uB808\uC774\uC5B4\uC785\uB2C8\uB2E4. \uBCF4\uB4DC \uAE30\uC900 \uC704\uCE58\uB97C \uD06C\uAC8C \uBC97\uC5B4\uB098\uC9C0 \uC54A\uAC8C \uB9DE\uCD94\uC138\uC694.",
      piece_tray: "\uBE14\uB85D \uD2B8\uB808\uC774\uB294 \uD558\uB2E8 \uC870\uC791 \uC601\uC5ED\uACFC \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uB9DE\uCD94\uC138\uC694.",
      item_bar: "\uC544\uC774\uD15C \uBC14\uB294 \uD2B8\uB808\uC774\uC640 \uB108\uBB34 \uAC00\uAE4C\uC6B0\uBA74 \uD130\uCE58\uAC00 \uACB9\uCE69\uB2C8\uB2E4.",
      combo_gauge: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0\uB294 \uBCF4\uB4DC \uC704\uB97C \uAC00\uB9AC\uC9C0 \uC54A\uAC8C \uB450\uB294 \uD3B8\uC774 \uC548\uC815\uC801\uC785\uB2C8\uB2E4."
    },
    endless: {
      header: "\uC0C1\uB2E8 \uD5E4\uB354\uB294 \uC810\uC218\uC640 \uC9C4\uD589 \uC815\uBCF4\uAC00 \uC798 \uBCF4\uC774\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      status_bar: "\uC0C1\uD0DC \uBC14\uB294 \uBCF4\uB4DC\uC640 \uCDA9\uB3CC\uD558\uC9C0 \uC54A\uB3C4\uB85D \uC5EC\uBC31\uC744 \uC720\uC9C0\uD558\uC138\uC694.",
      summon_panel: "\uD53C\uBC84 \uD328\uB110\uC740 \uC0C1\uB2E8 \uC815\uBCF4\uBCF4\uB2E4 \uC544\uB798\uC5D0 \uB450\uB294 \uD3B8\uC774 \uC77D\uAE30 \uC27D\uC2B5\uB2C8\uB2E4.",
      next_preview: "\uB2E4\uC74C \uBE14\uB85D \uC601\uC5ED\uC740 \uBCF4\uB4DC\uC640 \uB108\uBB34 \uAC00\uAE4C\uC6B0\uBA74 \uB2F5\uB2F5\uD558\uAC8C \uBCF4\uC785\uB2C8\uB2E4.",
      board: "\uBB34\uD55C \uBAA8\uB4DC\uC758 \uC911\uC2EC \uC870\uC791 \uC601\uC5ED\uC785\uB2C8\uB2E4.",
      skill_effect: "\uC2A4\uD0AC \uC774\uD399\uD2B8\uB294 \uBCF4\uB4DC \uC911\uC2EC \uC5F0\uCD9C \uB808\uC774\uC5B4\uC785\uB2C8\uB2E4. \uCF64\uBCF4 \uAC8C\uC774\uC9C0\uC640 \uC2DC\uC120 \uCDA9\uB3CC\uC774 \uC5C6\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      piece_tray: "\uD558\uB2E8 \uC870\uC791 \uC601\uC5ED\uACFC \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uC5EC\uC720\uB97C \uB450\uC138\uC694.",
      item_bar: "\uC544\uC774\uD15C \uBC14\uB294 \uD2B8\uB808\uC774\uC640 \uCDA9\uB3CC\uD558\uC9C0 \uC54A\uAC8C \uB9DE\uCD94\uC138\uC694.",
      combo_gauge: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0\uB294 \uBCF4\uB4DC\uB97C \uAC00\uB9AC\uC9C0 \uC54A\uAC8C \uBC30\uCE58\uD558\uC138\uC694."
    },
    battle: {
      back_button: "\uB4A4\uB85C \uBC84\uD2BC\uC740 \uD55C \uC190\uC73C\uB85C\uB3C4 \uB204\uB974\uAE30 \uC26C\uC6B4\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      opponent_panel: "\uC0C1\uB300 \uD328\uB110\uC740 \uC0C1\uB2E8 \uC815\uBCF4\uB97C \uB108\uBB34 \uAC00\uB9AC\uC9C0 \uC54A\uAC8C \uB450\uC138\uC694.",
      attack_bar: "\uACF5\uACA9 \uBC14\uB294 \uBCF4\uB4DC\uC640 \uC801\uB2F9\uD55C \uAC04\uACA9\uC744 \uC720\uC9C0\uD558\uC138\uC694.",
      board: "\uB300\uC804 \uBAA8\uB4DC\uC758 \uC911\uC2EC \uC870\uC791 \uC601\uC5ED\uC785\uB2C8\uB2E4.",
      skill_effect: "\uC2A4\uD0AC \uC774\uD399\uD2B8\uB294 \uB300\uC804 \uBCF4\uB4DC \uC704\uC5D0\uC11C \uBC1C\uB3D9\uD569\uB2C8\uB2E4. \uACF5\uACA9 \uBC14\uBCF4\uB2E4 \uC544\uB798, \uBCF4\uB4DC \uC911\uC2EC\uC5D0 \uB9DE\uCD94\uB294 \uD3B8\uC774 \uC548\uC815\uC801\uC785\uB2C8\uB2E4.",
      piece_tray: "\uD558\uB2E8 \uC870\uC791 \uC601\uC5ED\uACFC \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uC870\uC815\uD558\uC138\uC694."
    },
    raidNormal: {
      top_panel: "\uC0C1\uB2E8 \uD328\uB110\uC740 \uBCF4\uC2A4 \uC815\uBCF4\uAC00 \uC77D\uAE30 \uC26C\uC6B4\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      skill_bar: "\uC2A4\uD0AC \uBC14\uB294 \uBCF4\uB4DC \uC0C1\uB2E8 \uC5EC\uBC31\uC744 \uB108\uBB34 \uBA39\uC9C0 \uC54A\uAC8C \uBC30\uCE58\uD558\uC138\uC694.",
      info_bar: "\uC815\uBCF4 \uBC14\uB294 \uC911\uC694\uD55C \uC9C4\uD589 \uC815\uBCF4\uAC00 \uC798 \uBCF4\uC774\uB3C4\uB85D \uB450\uC138\uC694.",
      board: "\uB808\uC774\uB4DC \uC870\uC791\uC758 \uC911\uC2EC \uC601\uC5ED\uC785\uB2C8\uB2E4.",
      skill_effect: "\uC2A4\uD0AC \uC774\uD399\uD2B8\uB294 \uB808\uC774\uB4DC \uBCF4\uB4DC \uC704 \uBC1C\uB3D9 \uB808\uC774\uC5B4\uC785\uB2C8\uB2E4. \uC0C1\uD0DC \uCE74\uB4DC\uC640 \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uBCF4\uB4DC \uC911\uC2EC\uC5D0 \uB450\uC138\uC694.",
      piece_tray: "\uBE14\uB85D \uD2B8\uB808\uC774\uAC00 \uCF64\uBCF4 \uAC8C\uC774\uC9C0\uC640 \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uC870\uC815\uD558\uC138\uC694.",
      combo_gauge: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0\uB294 \uBCF4\uB4DC \uC0C1\uB2E8\uC758 \uC2DC\uC57C\uB97C \uAC00\uB9AC\uC9C0 \uC54A\uAC8C \uB450\uC138\uC694."
    },
    raidBoss: {
      top_panel: "\uC0C1\uB2E8 \uD328\uB110\uC740 \uBCF4\uC2A4 \uC815\uBCF4\uAC00 \uC77D\uAE30 \uC26C\uC6B4\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
      skill_bar: "\uC2A4\uD0AC \uBC14\uB294 \uBCF4\uB4DC \uC0C1\uB2E8 \uC5EC\uBC31\uC744 \uB108\uBB34 \uBA39\uC9C0 \uC54A\uAC8C \uBC30\uCE58\uD558\uC138\uC694.",
      info_bar: "\uC815\uBCF4 \uBC14\uB294 \uC911\uC694\uD55C \uC9C4\uD589 \uC815\uBCF4\uAC00 \uC798 \uBCF4\uC774\uB3C4\uB85D \uB450\uC138\uC694.",
      board: "\uB808\uC774\uB4DC \uC870\uC791\uC758 \uC911\uC2EC \uC601\uC5ED\uC785\uB2C8\uB2E4.",
      skill_effect: "\uC2A4\uD0AC \uC774\uD399\uD2B8\uB294 \uB808\uC774\uB4DC \uBCF4\uB4DC \uC704 \uBC1C\uB3D9 \uB808\uC774\uC5B4\uC785\uB2C8\uB2E4. \uC0C1\uD0DC \uCE74\uB4DC\uC640 \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uBCF4\uB4DC \uC911\uC2EC\uC5D0 \uB450\uC138\uC694.",
      piece_tray: "\uBE14\uB85D \uD2B8\uB808\uC774\uAC00 \uCF64\uBCF4 \uAC8C\uC774\uC9C0\uC640 \uACB9\uCE58\uC9C0 \uC54A\uAC8C \uC870\uC815\uD558\uC138\uC694.",
      combo_gauge: "\uCF64\uBCF4 \uAC8C\uC774\uC9C0\uB294 \uBCF4\uB4DC \uC0C1\uB2E8\uC758 \uC2DC\uC57C\uB97C \uAC00\uB9AC\uC9C0 \uC54A\uAC8C \uB450\uC138\uC694."
    }
  };
  var DEFAULT_RULE = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    widthScale: 1,
    heightScale: 1,
    opacity: 1,
    visible: true,
    zIndex: 0,
    safeAreaAware: false
  };
  var DEFAULT_GAMEPLAY_DRAG_TUNING = {
    liftOffsetCells: 2.5,
    centerOffsetXCells: 0,
    centerOffsetYCells: 0,
    dragDistanceScaleX: 1,
    dragDistanceScaleY: 1,
    snapMaxDistanceCells: 0.42,
    stickyThresholdCells: 0,
    snapSearchRadius: 1
  };
  var GAMEPLAY_SFX_EVENT_IDS = [
    "blockPlace",
    "blockPlaceFail",
    "lineClear",
    "combo",
    "levelUp",
    "skillUse",
    "reward",
    "button",
    "battleStart",
    "victory",
    "defeat",
    "raidEnter",
    "raidBossAppear",
    "matchingSuccess",
    "notice"
  ];
  var GAMEPLAY_BGM_TRACK_IDS = [
    "home",
    "level",
    "endless",
    "battle",
    "raidNormal",
    "raidBoss",
    "shop",
    "heroes",
    "lobby"
  ];
  var GAMEPLAY_SFX_LABELS = {
    blockPlace: "\uBE14\uB85D \uB193\uAE30",
    blockPlaceFail: "\uBE14\uB85D \uB193\uAE30 \uC2E4\uD328",
    lineClear: "\uC904 \uD074\uB9AC\uC5B4",
    combo: "\uCF64\uBCF4",
    levelUp: "\uB808\uBCA8\uC5C5",
    skillUse: "\uC2A4\uD0AC \uC0AC\uC6A9",
    reward: "\uBCF4\uC0C1 \uD68D\uB4DD",
    button: "\uBC84\uD2BC \uD074\uB9AD",
    battleStart: "\uC804\uD22C \uC2DC\uC791",
    victory: "\uC2B9\uB9AC",
    defeat: "\uD328\uBC30",
    raidEnter: "\uB808\uC774\uB4DC \uC785\uC7A5",
    raidBossAppear: "\uB808\uC774\uB4DC \uBCF4\uC2A4 \uB4F1\uC7A5",
    matchingSuccess: "\uB9E4\uCE6D \uC131\uACF5",
    notice: "\uC54C\uB9BC/\uD31D\uC5C5"
  };
  var GAMEPLAY_BGM_LABELS = {
    home: "\uD648",
    level: "\uB808\uBCA8 \uBAA8\uB4DC",
    endless: "\uBB34\uD55C \uBAA8\uB4DC",
    battle: "\uB300\uC804 \uBAA8\uB4DC",
    raidNormal: "\uC77C\uBC18 \uB808\uC774\uB4DC",
    raidBoss: "\uBCF4\uC2A4 \uB808\uC774\uB4DC",
    shop: "\uC0C1\uC810",
    heroes: "\uC601\uC6C5",
    lobby: "\uB85C\uBE44/\uB9E4\uCE6D"
  };
  var DEFAULT_GAMEPLAY_SFX_RULE = {
    assetKey: null,
    volume: 3,
    cooldownMs: 40,
    allowOverlap: true,
    enabled: true
  };
  var DEFAULT_GAMEPLAY_BGM_RULE = {
    assetKey: null,
    volume: 1.5,
    loop: true,
    fadeInMs: 800,
    fadeOutMs: 500,
    enabled: true
  };
  var DEFAULT_GAMEPLAY_AUDIO_CONFIG = {
    masterVolume: 1,
    sfxVolume: 1,
    bgmVolume: 1,
    muted: false,
    sfx: Object.fromEntries(GAMEPLAY_SFX_EVENT_IDS.map((id) => [id, { ...DEFAULT_GAMEPLAY_SFX_RULE }])),
    bgm: Object.fromEntries(GAMEPLAY_BGM_TRACK_IDS.map((id) => [id, { ...DEFAULT_GAMEPLAY_BGM_RULE }]))
  };
  var VISUAL_DRAG_PRESETS = {
    precise: {
      liftOffsetCells: 2.5,
      centerOffsetXCells: 0,
      centerOffsetYCells: 0,
      dragDistanceScaleX: 1,
      dragDistanceScaleY: 1,
      snapMaxDistanceCells: 0.42,
      stickyThresholdCells: 0,
      snapSearchRadius: 1
    },
    assist: {
      liftOffsetCells: 2.5,
      centerOffsetXCells: 0,
      centerOffsetYCells: 0,
      dragDistanceScaleX: 1.02,
      dragDistanceScaleY: 1.08,
      snapMaxDistanceCells: 0.5,
      stickyThresholdCells: 0.12,
      snapSearchRadius: 1
    },
    legacy: {
      liftOffsetCells: 2.5,
      centerOffsetXCells: 0,
      centerOffsetYCells: 0,
      dragDistanceScaleX: 1,
      dragDistanceScaleY: 1,
      snapMaxDistanceCells: 0.62,
      stickyThresholdCells: 0.28,
      snapSearchRadius: 1
    }
  };
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function numberOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function sanitizeRule(rule) {
    const merged = { ...DEFAULT_RULE, ...rule ?? {} };
    return {
      offsetX: Math.round(clamp(numberOr(merged.offsetX, 0), -800, 800)),
      offsetY: Math.round(clamp(numberOr(merged.offsetY, 0), -1200, 1200)),
      scale: clamp(numberOr(merged.scale, 1), 0.3, 3),
      widthScale: clamp(numberOr(merged.widthScale, 1), 0.3, 3),
      heightScale: clamp(numberOr(merged.heightScale, 1), 0.3, 3),
      opacity: clamp(numberOr(merged.opacity, 1), 0, 1),
      visible: merged.visible !== false,
      zIndex: Math.round(clamp(numberOr(merged.zIndex, 0), -50, 100)),
      safeAreaAware: merged.safeAreaAware === true
    };
  }
  function sanitizeViewport(viewport) {
    const merged = { ...DEFAULT_REFERENCE_VIEWPORT, ...viewport ?? {} };
    return {
      width: Math.round(
        clamp(
          numberOr(merged.width, DEFAULT_REFERENCE_VIEWPORT.width),
          280,
          1600
        )
      ),
      height: Math.round(
        clamp(
          numberOr(merged.height, DEFAULT_REFERENCE_VIEWPORT.height),
          480,
          3200
        )
      ),
      safeTop: Math.round(clamp(numberOr(merged.safeTop, 0), 0, 240)),
      safeBottom: Math.round(clamp(numberOr(merged.safeBottom, 0), 0, 240))
    };
  }
  function createDefaultVisualManifest() {
    return {
      version: 0,
      referenceViewport: clone(DEFAULT_REFERENCE_VIEWPORT),
      gameplay: {
        dragTuning: clone(DEFAULT_GAMEPLAY_DRAG_TUNING),
        audio: clone(DEFAULT_GAMEPLAY_AUDIO_CONFIG)
      },
      studioSnapshots: {},
      screens: {
        level: {
          elements: Object.fromEntries(
            ELEMENT_DEFS.level.map(({ id }) => [id, clone(DEFAULT_RULE)])
          ),
          backgrounds: { byWorld: {}, byLevel: {} }
        },
        endless: {
          elements: Object.fromEntries(
            ELEMENT_DEFS.endless.map(({ id }) => [id, clone(DEFAULT_RULE)])
          )
        },
        battle: {
          elements: Object.fromEntries(
            ELEMENT_DEFS.battle.map(({ id }) => [id, clone(DEFAULT_RULE)])
          )
        },
        raidNormal: {
          elements: Object.fromEntries(
            ELEMENT_DEFS.raidNormal.map(({ id }) => [id, clone(DEFAULT_RULE)])
          ),
          backgrounds: { byBossStage: {} }
        },
        raidBoss: {
          elements: Object.fromEntries(
            ELEMENT_DEFS.raidBoss.map(({ id }) => [id, clone(DEFAULT_RULE)])
          ),
          backgrounds: { byBossStage: {} }
        }
      }
    };
  }
  function sanitizeElementFrame(frame) {
    const merged = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      ...frame ?? {}
    };
    return {
      x: Math.round(clamp(numberOr(merged.x, 0), -2e3, 4e3)),
      y: Math.round(clamp(numberOr(merged.y, 0), -2e3, 4e3)),
      width: Math.round(clamp(numberOr(merged.width, 0), 0, 4e3)),
      height: Math.round(clamp(numberOr(merged.height, 0), 0, 4e3))
    };
  }
  function sanitizeBackgroundOverride(value) {
    const merged = {
      assetKey: null,
      tintColor: "#000000",
      tintOpacity: 0,
      removeImage: false,
      ...value ?? {}
    };
    return {
      assetKey: typeof merged.assetKey === "string" && merged.assetKey.trim().length > 0 ? merged.assetKey.trim() : null,
      tintColor: typeof merged.tintColor === "string" && merged.tintColor.trim().length > 0 ? merged.tintColor.trim() : "#000000",
      tintOpacity: clamp(numberOr(merged.tintOpacity, 0), 0, 1),
      removeImage: merged.removeImage === true
    };
  }
  function sanitizeBackgroundMap(values) {
    const result = {};
    Object.entries(values ?? {}).forEach(([key, value]) => {
      if (!key) {
        return;
      }
      result[key] = sanitizeBackgroundOverride(value);
    });
    return result;
  }
  function sanitizeGameplayDragTuning(value) {
    const merged = { ...DEFAULT_GAMEPLAY_DRAG_TUNING, ...value ?? {} };
    return {
      liftOffsetCells: clamp(
        numberOr(merged.liftOffsetCells, DEFAULT_GAMEPLAY_DRAG_TUNING.liftOffsetCells),
        0.5,
        8
      ),
      centerOffsetXCells: clamp(
        numberOr(
          merged.centerOffsetXCells,
          DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetXCells
        ),
        -3,
        3
      ),
      centerOffsetYCells: clamp(
        numberOr(
          merged.centerOffsetYCells,
          DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetYCells
        ),
        -3,
        3
      ),
      dragDistanceScaleX: clamp(
        numberOr(
          merged.dragDistanceScaleX,
          DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleX
        ),
        0.5,
        2
      ),
      dragDistanceScaleY: clamp(
        numberOr(
          merged.dragDistanceScaleY,
          DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleY
        ),
        0.5,
        2
      ),
      snapMaxDistanceCells: clamp(
        numberOr(
          merged.snapMaxDistanceCells,
          DEFAULT_GAMEPLAY_DRAG_TUNING.snapMaxDistanceCells
        ),
        0,
        2.4
      ),
      stickyThresholdCells: clamp(
        numberOr(
          merged.stickyThresholdCells,
          DEFAULT_GAMEPLAY_DRAG_TUNING.stickyThresholdCells
        ),
        0,
        1.6
      ),
      snapSearchRadius: Math.round(
        clamp(
          numberOr(merged.snapSearchRadius, DEFAULT_GAMEPLAY_DRAG_TUNING.snapSearchRadius),
          0,
          4
        )
      )
    };
  }
  function sanitizeAssetKey(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }
  function sanitizeGameplayAudioConfig(value) {
    const merged = { ...DEFAULT_GAMEPLAY_AUDIO_CONFIG, ...value ?? {} };
    return {
      masterVolume: clamp(
        numberOr(merged.masterVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.masterVolume),
        0,
        3
      ),
      sfxVolume: clamp(
        numberOr(merged.sfxVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.sfxVolume),
        0,
        3
      ),
      bgmVolume: clamp(
        numberOr(merged.bgmVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.bgmVolume),
        0,
        3
      ),
      muted: merged.muted === true,
      sfx: Object.fromEntries(GAMEPLAY_SFX_EVENT_IDS.map((id) => {
        const rule = { ...DEFAULT_GAMEPLAY_SFX_RULE, ...(merged.sfx?.[id] ?? {}) };
        return [
          id,
          {
            assetKey: sanitizeAssetKey(rule.assetKey),
            volume: clamp(numberOr(rule.volume, DEFAULT_GAMEPLAY_SFX_RULE.volume), 0, 3),
            cooldownMs: Math.round(clamp(numberOr(rule.cooldownMs, DEFAULT_GAMEPLAY_SFX_RULE.cooldownMs), 0, 2e3)),
            allowOverlap: rule.allowOverlap !== false,
            enabled: rule.enabled !== false
          }
        ];
      })),
      bgm: Object.fromEntries(GAMEPLAY_BGM_TRACK_IDS.map((id) => {
        const rule = { ...DEFAULT_GAMEPLAY_BGM_RULE, ...(merged.bgm?.[id] ?? {}) };
        return [
          id,
          {
            assetKey: sanitizeAssetKey(rule.assetKey),
            volume: clamp(numberOr(rule.volume, DEFAULT_GAMEPLAY_BGM_RULE.volume), 0, 3),
            loop: rule.loop !== false,
            fadeInMs: Math.round(clamp(numberOr(rule.fadeInMs, DEFAULT_GAMEPLAY_BGM_RULE.fadeInMs), 0, 1e4)),
            fadeOutMs: Math.round(clamp(numberOr(rule.fadeOutMs, DEFAULT_GAMEPLAY_BGM_RULE.fadeOutMs), 0, 1e4)),
            enabled: rule.enabled !== false
          }
        ];
      }))
    };
  }
  function sanitizeGameplayVisualConfig(value) {
    return {
      dragTuning: sanitizeGameplayDragTuning(value?.dragTuning),
      audio: sanitizeGameplayAudioConfig(value?.audio)
    };
  }
  function sanitizeStudioSnapshot(snapshot) {
    if (!snapshot) {
      return null;
    }
    const elementFrames = {};
    Object.entries(snapshot.elementFrames ?? {}).forEach(([elementId, frame]) => {
      elementFrames[elementId] = sanitizeElementFrame(frame);
    });
    const elementRules = {};
    Object.entries(snapshot.elementRules ?? {}).forEach(([elementId, rule]) => {
      elementRules[elementId] = sanitizeRule(rule);
    });
    return {
      assetKey: typeof snapshot.assetKey === "string" && snapshot.assetKey.trim().length > 0 ? snapshot.assetKey.trim() : null,
      capturedAt: typeof snapshot.capturedAt === "string" && snapshot.capturedAt.trim().length > 0 ? snapshot.capturedAt.trim() : "",
      viewport: sanitizeViewport(snapshot.viewport),
      referenceViewport: sanitizeViewport(snapshot.referenceViewport),
      elementFrames,
      elementRules
    };
  }
  function sanitizeStudioSnapshots(raw) {
    const result = {};
    const legacyRaidSnapshot = raw?.raid;
    Object.keys(SCREEN_LABELS).forEach((screenId) => {
      const snapshot = sanitizeStudioSnapshot(raw?.[screenId]);
      if (snapshot) {
        result[screenId] = snapshot;
      }
    });
    const raidSnapshot = sanitizeStudioSnapshot(legacyRaidSnapshot);
    if (raidSnapshot) {
      result.raidNormal = result.raidNormal ?? raidSnapshot;
      result.raidBoss = result.raidBoss ?? raidSnapshot;
    }
    return result;
  }
  function ensureVisualManifest(raw) {
    const next = createDefaultVisualManifest();
    const value = raw ?? {};
    const legacyRaidScreen = value?.screens?.raid;
    next.version = Math.max(0, Math.round(numberOr(value.version, 0)));
    next.referenceViewport = sanitizeViewport(value.referenceViewport);
    next.gameplay = sanitizeGameplayVisualConfig(value.gameplay);
    next.studioSnapshots = sanitizeStudioSnapshots(value.studioSnapshots);
    Object.keys(ELEMENT_DEFS).forEach((screenId) => {
      const sourceElements = screenId === "raidNormal" || screenId === "raidBoss" ? value?.screens?.[screenId]?.elements ?? legacyRaidScreen?.elements : value?.screens?.[screenId]?.elements;
      ELEMENT_DEFS[screenId].forEach(({ id }) => {
        next.screens[screenId].elements[id] = sanitizeRule(sourceElements?.[id]);
      });
    });
    next.screens.level.backgrounds.byWorld = sanitizeBackgroundMap(
      value?.screens?.level?.backgrounds?.byWorld
    );
    next.screens.level.backgrounds.byLevel = sanitizeBackgroundMap(
      value?.screens?.level?.backgrounds?.byLevel
    );
    const legacyRaidBackgrounds = legacyRaidScreen?.backgrounds?.byBossStage;
    next.screens.raidNormal.backgrounds.byBossStage = sanitizeBackgroundMap(
      value?.screens?.raidNormal?.backgrounds?.byBossStage ?? legacyRaidBackgrounds
    );
    next.screens.raidBoss.backgrounds.byBossStage = sanitizeBackgroundMap(
      value?.screens?.raidBoss?.backgrounds?.byBossStage ?? legacyRaidBackgrounds
    );
    return next;
  }
  function scaleRectBetweenViewports(rect, sourceViewport, targetViewport) {
    const widthRatio = targetViewport.width / Math.max(1, sourceViewport.width);
    const heightRatio = targetViewport.height / Math.max(1, sourceViewport.height);
    return {
      left: rect.left * widthRatio,
      top: rect.top * heightRatio,
      width: rect.width * widthRatio,
      height: rect.height * heightRatio
    };
  }
  function resolveVisualOffset(offsetX, offsetY, currentViewport, referenceViewport, safeAreaAware) {
    const safeWidthCurrent = Math.max(1, currentViewport.width);
    const safeWidthReference = Math.max(1, referenceViewport.width);
    const safeHeightCurrent = Math.max(
      1,
      currentViewport.height - (safeAreaAware ? currentViewport.safeTop + currentViewport.safeBottom : 0)
    );
    const safeHeightReference = Math.max(
      1,
      referenceViewport.height - (safeAreaAware ? referenceViewport.safeTop + referenceViewport.safeBottom : 0)
    );
    return {
      x: Math.round(offsetX * (safeWidthCurrent / safeWidthReference)),
      y: Math.round(offsetY * (safeHeightCurrent / safeHeightReference))
    };
  }
  function convertViewportDeltaToReference(dx, dy, currentViewport, referenceViewport, safeAreaAware) {
    const currentWidth = Math.max(1, currentViewport.width);
    const referenceWidth = Math.max(1, referenceViewport.width);
    const currentHeight = Math.max(
      1,
      currentViewport.height - (safeAreaAware ? currentViewport.safeTop + currentViewport.safeBottom : 0)
    );
    const referenceHeight = Math.max(
      1,
      referenceViewport.height - (safeAreaAware ? referenceViewport.safeTop + referenceViewport.safeBottom : 0)
    );
    return {
      x: dx * (referenceWidth / currentWidth),
      y: dy * (referenceHeight / currentHeight)
    };
  }
  function getRule(manifest, screenId, elementId) {
    return manifest?.screens?.[screenId]?.elements?.[elementId] ?? DEFAULT_RULE;
  }
  function getStudioSnapshot(manifest, screenId) {
    return manifest?.studioSnapshots?.[screenId] ?? null;
  }
  function deriveBaseRectFromMeasuredFrame(frame, rule, currentViewport, referenceViewport) {
    const safeRule = sanitizeRule(rule);
    const offset = resolveVisualOffset(
      safeRule.offsetX,
      safeRule.offsetY,
      currentViewport,
      referenceViewport,
      safeRule.safeAreaAware
    );
    const scaleX = Math.max(1e-3, safeRule.scale * safeRule.widthScale);
    const scaleY = Math.max(1e-3, safeRule.scale * safeRule.heightScale);
    const width = frame.width / scaleX;
    const height = frame.height / scaleY;
    return {
      left: frame.x - offset.x + (frame.width - width) / 2,
      top: frame.y - offset.y + (frame.height - height) / 2,
      width,
      height
    };
  }
  function getMeasuredBaseRect(manifest, screenId, elementId, targetViewport) {
    const snapshot = getStudioSnapshot(manifest, screenId);
    const frame = snapshot?.elementFrames?.[elementId];
    if (!snapshot || !frame) {
      return null;
    }
    const snapshotViewport = sanitizeViewport(snapshot.viewport);
    const snapshotReferenceViewport = sanitizeViewport(
      snapshot.referenceViewport ?? manifest?.referenceViewport
    );
    const snapshotRule = snapshot.elementRules?.[elementId] ?? DEFAULT_RULE;
    const baseRect = deriveBaseRectFromMeasuredFrame(
      sanitizeElementFrame(frame),
      snapshotRule,
      snapshotViewport,
      snapshotReferenceViewport
    );
    return scaleRectBetweenViewports(baseRect, snapshotViewport, targetViewport);
  }
  function applyRuleToRect(rect, rule, currentViewport, referenceViewport) {
    const safeRule = sanitizeRule(rule);
    const offset = resolveVisualOffset(
      safeRule.offsetX,
      safeRule.offsetY,
      currentViewport,
      referenceViewport,
      safeRule.safeAreaAware
    );
    const width = rect.width * safeRule.scale * safeRule.widthScale;
    const height = rect.height * safeRule.scale * safeRule.heightScale;
    return {
      left: rect.left + offset.x - (width - rect.width) / 2,
      top: rect.top + offset.y - (height - rect.height) / 2,
      width,
      height
    };
  }
  function getPreviewLayout(screenId, viewport = DEFAULT_REFERENCE_VIEWPORT) {
    return getVisualRuntimeLayout(screenId, sanitizeViewport(viewport));
  }
  function formatElementLabel(screenId, elementId) {
    const meta = ELEMENT_DEFS[screenId]?.find((item) => item.id === elementId);
    return meta ? meta.label : elementId;
  }

  // tools/blockhero-creator/creator.js
  var DEFAULT_SUPABASE_URL = "https://alhlmdhixmlmsdvgzhdu.supabase.co";
  var DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8";
  var STORAGE_KEY2 = "blockhero-creator-auth-v1";
  var DEFAULT_DRAFT_ID = 1;
  var PATTERN_OPTIONS = [
    "basic_auto",
    "burst_every_n",
    "phase_hp_threshold",
    "rage_after_time"
  ];
  var HELP_TEXT = {
    level: {
      title: "\uB808\uBCA8 \uC2A4\uD14C\uC774\uC9C0",
      description: "\uB808\uBCA8 \uBAA8\uB4DC\uC758 \uBAA9\uD45C, \uC801 \uC5F0\uACB0, \uACE8\uB4DC/\uACBD\uD5D8\uCE58 \uBCF4\uC0C1, \uBC30\uACBD\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.",
      tips: [
        "\uC801 \uD15C\uD50C\uB9BF\uC740 \uC544\uB798 \uD654\uBA74\uC5D0 \uB098\uC624\uB294 \uC801 \uC6D0\uBCF8 \uBAA9\uB85D\uACFC \uC5F0\uACB0\uB429\uB2C8\uB2E4.",
        "\uCCAB \uD074\uB9AC\uC5B4 \uBCF4\uC0C1\uACFC \uBC18\uBCF5 \uBCF4\uC0C1\uC744 \uBD84\uB9AC\uD574\uC11C \uC6B4\uC601\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
        "\uBC30\uACBD \uC790\uC0B0\uC740 \uC6B0\uCE21 \uC790\uC0B0 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uC5D0 \uC62C\uB9B0 \uC774\uBBF8\uC9C0\uB97C \uADF8\uB300\uB85C \uC5F0\uACB0\uD558\uBA74 \uB429\uB2C8\uB2E4."
      ]
    },
    raidNormal: {
      title: "\uC77C\uBC18 \uB808\uC774\uB4DC",
      description: "\uC0C1\uC2DC \uB3C4\uC804 \uAC00\uB2A5\uD55C \uC77C\uBC18 \uB808\uC774\uB4DC\uC758 \uC774\uB984, \uBCF4\uC0C1, \uC2DC\uAC04 \uC81C\uD55C, \uBC30\uACBD\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.",
      tips: [
        "\uC81C\uD55C \uC2DC\uAC04\uC740 \uC2E4\uC81C \uB808\uC774\uB4DC \uC2DC\uC791 \uD6C4 \uC885\uB8CC \uC2DC\uC810 \uACC4\uC0B0\uC5D0 \uC0AC\uC6A9\uB429\uB2C8\uB2E4.",
        "\uBC18\uBCF5 \uBCF4\uC0C1\uC740 \uCCAB \uD074\uB9AC\uC5B4 \uBCF4\uC0C1\uACFC \uBCC4\uB3C4\uB85C \uC6B4\uC601\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
        "\uC2A4\uD14C\uC774\uC9C0\uBCC4 \uC624\uBC84\uB77C\uC774\uB4DC\uB85C \uD2B9\uC815 \uB2E8\uACC4\uB9CC \uCCB4\uB825, \uACF5\uACA9\uB825, \uACF5\uACA9 \uAC04\uACA9\uC744 \uB530\uB85C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
      ]
    },
    raidBoss: {
      title: "\uBCF4\uC2A4 \uB808\uC774\uB4DC",
      description: "\uBCF4\uC2A4 \uB808\uC774\uB4DC \uB2E8\uACC4\uBCC4 \uBCF4\uC2A4 \uC774\uB984, \uCC38\uAC00 \uC778\uC6D0, \uC785\uC7A5 \uCC3D, \uC2DC\uAC04 \uC81C\uD55C\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.",
      tips: [
        "\uC785\uC7A5 \uAC00\uB2A5 \uC2DC\uAC04\uC740 \uBCF4\uC2A4 \uB808\uC774\uB4DC\uAC00 \uC5F4\uB9B0 \uB4A4 \uCC38\uAC00\uD560 \uC218 \uC788\uB294 \uC2DC\uAC04\uC785\uB2C8\uB2E4.",
        "\uCD5C\uB300 \uCC38\uAC00 \uC778\uC6D0\uC740 \uC2E4\uC81C \uBCF4\uC2A4 \uB808\uC774\uB4DC \uC778\uC6D0 \uC81C\uD55C\uC5D0 \uC5F0\uACB0\uB429\uB2C8\uB2E4.",
        "\uAC1C\uBC29 \uC2DC\uAC04\uC740 \uD654\uBA74 \uC548\uB0B4\uC640 \uC6B4\uC601 \uAE30\uC900\uC5D0 \uD568\uAED8 \uC0AC\uC6A9\uB429\uB2C8\uB2E4."
      ]
    },
    encounter: {
      title: "\uC801 \uD15C\uD50C\uB9BF",
      description: "\uB808\uBCA8\uACFC \uB808\uC774\uB4DC\uAC00 \uACF5\uD1B5\uC73C\uB85C \uCC38\uC870\uD558\uB294 \uC801 \uC6D0\uBCF8 \uB370\uC774\uD130\uC785\uB2C8\uB2E4.",
      tips: [
        "\uC2A4\uD14C\uC774\uC9C0\uBCC4 override\uBCF4\uB2E4 \uBA3C\uC800 \uC801\uC6A9\uB418\uB294 \uAE30\uBCF8\uAC12\uC785\uB2C8\uB2E4.",
        "\uACF5\uACA9 \uD328\uD134\uC740 \uD604\uC7AC \uC900\uBE44\uB41C \uD328\uD134\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
        "id\uB97C \uB36E\uC5B4\uC4F0\uAE30\uBCF4\uB2E4 \uC0C8 \uD15C\uD50C\uB9BF\uC744 \uB9CC\uB4E4\uACE0 \uC5F0\uACB0\uB9CC \uBC14\uAFB8\uB294 \uD3B8\uC774 \uC548\uC804\uD569\uB2C8\uB2E4."
      ]
    }
  };
  var ATTACK_PATTERN_LABELS = {
    basic_auto: "\uAE30\uBCF8 \uC790\uB3D9",
    burst_every_n: "\uC8FC\uAE30 \uD3ED\uBC1C",
    phase_hp_threshold: "\uCCB4\uB825 \uAD6C\uAC04 \uC804\uD658",
    rage_after_time: "\uC2DC\uAC04 \uACBD\uACFC \uBD84\uB178"
  };
  var ENCOUNTER_TIER_LABELS = {
    normal: "\uC77C\uBC18",
    elite: "\uC815\uC608",
    boss: "\uBCF4\uC2A4"
  };
  var ENCOUNTER_KIND_LABELS = {
    level: "\uB808\uBCA8",
    raid: "\uB808\uC774\uB4DC"
  };
  var $ = (selector) => document.querySelector(selector);
  var elements = {
    activeViewStatus: $("#activeViewStatus"),
    loginCard: $("#loginCard"),
    workspace: $("#workspace"),
    supabaseUrl: $("#supabaseUrl"),
    supabaseAnonKey: $("#supabaseAnonKey"),
    adminEmail: $("#adminEmail"),
    adminPassword: $("#adminPassword"),
    loginButton: $("#loginButton"),
    restoreButton: $("#restoreButton"),
    logoutButton: $("#logoutButton"),
    refreshButton: $("#refreshButton"),
    saveDraftButton: $("#saveDraftButton"),
    publishButton: $("#publishButton"),
    publishNotes: $("#publishNotes"),
    connectionStatus: $("#connectionStatus"),
    deviceConnectionStatus: $("#deviceConnectionStatus"),
    manifestStatus: $("#manifestStatus"),
    globalStatusLine: $("#globalStatusLine"),
    uiEditorStatusLine: $("#uiEditorStatusLine"),
    viewUiButton: $("#viewUiButton"),
    viewAdminButton: $("#viewAdminButton"),
    viewHistoryButton: $("#viewHistoryButton"),
    viewSettingsButton: $("#viewSettingsButton"),
    uiEditorView: $("#uiEditorView"),
    adminDataView: $("#adminDataView"),
    historyView: $("#historyView"),
    settingsView: $("#settingsView"),
    userEmail: $("#userEmail"),
    visualDraftVersion: $("#visualDraftVersion"),
    visualPublishedVersion: $("#visualPublishedVersion"),
    draftVersion: $("#draftVersion"),
    publishedVersion: $("#publishedVersion"),
    assetCount: $("#assetCount"),
    settingsSupabaseUrl: $("#settingsSupabaseUrl"),
    settingsAdminEmail: $("#settingsAdminEmail"),
    settingsDeviceList: $("#settingsDeviceList"),
    settingsDeviceMeta: $("#settingsDeviceMeta"),
    settingsRefreshDevicesButton: $("#settingsRefreshDevicesButton"),
    settingsRefreshFrameButton: $("#settingsRefreshFrameButton"),
    visualScreenId: $("#visualScreenId"),
    visualDeviceSource: $("#visualDeviceSource"),
    visualDeviceSelect: $("#visualDeviceSelect"),
    visualDeviceProfile: $("#visualDeviceProfile"),
    visualViewportWidth: $("#visualViewportWidth"),
    visualViewportHeight: $("#visualViewportHeight"),
    visualSafeTop: $("#visualSafeTop"),
    visualSafeBottom: $("#visualSafeBottom"),
    visualReferenceViewportButton: $("#visualReferenceViewportButton"),
    visualReferenceViewportValue: $("#visualReferenceViewportValue"),
    visualReferenceViewportNote: $("#visualReferenceViewportNote"),
    visualRefreshDeviceButton: $("#visualRefreshDeviceButton"),
    visualRefreshFrameButton: $("#visualRefreshFrameButton"),
    visualDeviceMeta: $("#visualDeviceMeta"),
    visualShowGrid: $("#visualShowGrid"),
    visualSnapGrid: $("#visualSnapGrid"),
    visualGridSize: $("#visualGridSize"),
    visualDragLiftOffset: $("#visualDragLiftOffset"),
    visualDragCenterOffsetX: $("#visualDragCenterOffsetX"),
    visualDragCenterOffsetY: $("#visualDragCenterOffsetY"),
    visualDragDistanceScaleX: $("#visualDragDistanceScaleX"),
    visualDragDistanceScaleY: $("#visualDragDistanceScaleY"),
    visualDragSnapDistance: $("#visualDragSnapDistance"),
    visualDragStickyThreshold: $("#visualDragStickyThreshold"),
    visualDragSearchRadius: $("#visualDragSearchRadius"),
    visualDragPresetPrecise: $("#visualDragPresetPrecise"),
    visualDragPresetAssist: $("#visualDragPresetAssist"),
    visualDragPresetLegacy: $("#visualDragPresetLegacy"),
    visualAudioMasterVolume: $("#visualAudioMasterVolume"),
    visualAudioMasterVolumeSlider: $("#visualAudioMasterVolumeSlider"),
    visualAudioMasterVolumeReadout: $("#visualAudioMasterVolumeReadout"),
    visualAudioSfxVolume: $("#visualAudioSfxVolume"),
    visualAudioSfxVolumeSlider: $("#visualAudioSfxVolumeSlider"),
    visualAudioSfxVolumeReadout: $("#visualAudioSfxVolumeReadout"),
    visualAudioBgmVolume: $("#visualAudioBgmVolume"),
    visualAudioBgmVolumeSlider: $("#visualAudioBgmVolumeSlider"),
    visualAudioBgmVolumeReadout: $("#visualAudioBgmVolumeReadout"),
    visualAudioMuted: $("#visualAudioMuted"),
    audioAssetKeyInput: $("#audioAssetKeyInput"),
    audioAssetFileInput: $("#audioAssetFileInput"),
    uploadAudioAssetButton: $("#uploadAudioAssetButton"),
    visualAudioSfxEvent: $("#visualAudioSfxEvent"),
    visualAudioSfxAsset: $("#visualAudioSfxAsset"),
    visualAudioSfxRuleVolume: $("#visualAudioSfxRuleVolume"),
    visualAudioSfxRuleVolumeSlider: $("#visualAudioSfxRuleVolumeSlider"),
    visualAudioSfxRuleVolumeReadout: $("#visualAudioSfxRuleVolumeReadout"),
    visualAudioSfxCooldown: $("#visualAudioSfxCooldown"),
    visualAudioSfxOverlap: $("#visualAudioSfxOverlap"),
    visualAudioSfxEnabled: $("#visualAudioSfxEnabled"),
    visualAudioSfxPreview: $("#visualAudioSfxPreview"),
    visualAudioBgmTrack: $("#visualAudioBgmTrack"),
    visualAudioBgmAsset: $("#visualAudioBgmAsset"),
    visualAudioBgmRuleVolume: $("#visualAudioBgmRuleVolume"),
    visualAudioBgmRuleVolumeSlider: $("#visualAudioBgmRuleVolumeSlider"),
    visualAudioBgmRuleVolumeReadout: $("#visualAudioBgmRuleVolumeReadout"),
    visualAudioBgmLoop: $("#visualAudioBgmLoop"),
    visualAudioBgmFadeIn: $("#visualAudioBgmFadeIn"),
    visualAudioBgmFadeOut: $("#visualAudioBgmFadeOut"),
    visualAudioBgmEnabled: $("#visualAudioBgmEnabled"),
    visualAudioBgmPreview: $("#visualAudioBgmPreview"),
    visualAudioBgmStop: $("#visualAudioBgmStop"),
    audioAssetLibrary: $("#audioAssetLibrary"),
    visualElementList: $("#visualElementList"),
    visualCurrentScreen: $("#visualCurrentScreen"),
    visualCurrentElement: $("#visualCurrentElement"),
    visualCurrentViewport: $("#visualCurrentViewport"),
    visualFitButton: $("#visualFitButton"),
    visualActualButton: $("#visualActualButton"),
    visualZoomSlider: $("#visualZoomSlider"),
    visualZoomReadout: $("#visualZoomReadout"),
    visualStageOffsetX: $("#visualStageOffsetX"),
    visualStageOffsetXReadout: $("#visualStageOffsetXReadout"),
    visualStageOffsetY: $("#visualStageOffsetY"),
    visualStageOffsetYReadout: $("#visualStageOffsetYReadout"),
    visualStageResetButton: $("#visualStageResetButton"),
    visualStageHost: $("#visualStageHost"),
    visualPhoneFrame: $("#visualPhoneFrame"),
    visualLiveImage: $("#visualLiveImage"),
    visualFrameFallback: $("#visualFrameFallback"),
    visualSafeTopOverlay: $("#visualSafeTopOverlay"),
    visualSafeBottomOverlay: $("#visualSafeBottomOverlay"),
    visualGridOverlay: $("#visualGridOverlay"),
    visualOverlay: $("#visualOverlay"),
    visualStageStatus: $("#visualStageStatus"),
    visualRuntimeApplyNote: $("#visualRuntimeApplyNote"),
    visualInspectorTitle: $("#visualInspectorTitle"),
    visualInspectorHelp: $("#visualInspectorHelp"),
    visualOffsetX: $("#visualOffsetX"),
    visualOffsetY: $("#visualOffsetY"),
    visualScale: $("#visualScale"),
    visualWidthScale: $("#visualWidthScale"),
    visualHeightScale: $("#visualHeightScale"),
    visualOpacity: $("#visualOpacity"),
    visualZIndex: $("#visualZIndex"),
    visualVisible: $("#visualVisible"),
    visualSafeAware: $("#visualSafeAware"),
    visualNudgeUp: $("#visualNudgeUp"),
    visualNudgeDown: $("#visualNudgeDown"),
    visualNudgeLeft: $("#visualNudgeLeft"),
    visualNudgeRight: $("#visualNudgeRight"),
    visualNudgeUpLarge: $("#visualNudgeUpLarge"),
    visualNudgeDownLarge: $("#visualNudgeDownLarge"),
    visualNudgeLeftLarge: $("#visualNudgeLeftLarge"),
    visualNudgeRightLarge: $("#visualNudgeRightLarge"),
    visualUndoButton: $("#visualUndoButton"),
    visualRedoButton: $("#visualRedoButton"),
    visualResetButton: $("#visualResetButton"),
    visualPublishNotes: $("#visualPublishNotes"),
    visualSaveDraftButton: $("#visualSaveDraftButton"),
    visualPublishButton: $("#visualPublishButton"),
    visualReleaseHistory: $("#visualReleaseHistory"),
    visualHistoryViewList: $("#visualHistoryViewList"),
    adminHistoryViewList: $("#adminHistoryViewList"),
    contentTree: $("#contentTree"),
    editorTitle: $("#editorTitle"),
    editorSubtitle: $("#editorSubtitle"),
    selectionSummary: $("#selectionSummary"),
    editorForm: $("#editorForm"),
    manifestJson: $("#manifestJson"),
    copyJsonButton: $("#copyJsonButton"),
    applyJsonButton: $("#applyJsonButton"),
    helpPanel: $("#helpPanel"),
    assetLibrary: $("#assetLibrary"),
    assetKeyInput: $("#assetKeyInput"),
    assetFileInput: $("#assetFileInput"),
    uploadAssetButton: $("#uploadAssetButton"),
    releaseHistory: $("#releaseHistory"),
    addLevelButton: $("#addLevelButton"),
    addNormalRaidButton: $("#addNormalRaidButton"),
    addBossRaidButton: $("#addBossRaidButton"),
    addEncounterButton: $("#addEncounterButton"),
    cloneButton: $("#cloneButton"),
    deleteButton: $("#deleteButton")
  };
  var state = {
    activeView: "ui",
    supabase: null,
    supabaseUrl: "",
    supabaseKey: "",
    session: null,
    profile: null,
    visualManifest: null,
    visualPublishedVersion: null,
    visualPublishedManifest: null,
    visualReleaseHistory: [],
    visualSelectedScreenId: "level",
    visualSelectedElementId: "header",
    visualDeviceSource: "phone",
    visualDeviceProfileId: "galaxy-s23-ultra",
    visualCustomViewport: clone(DEFAULT_REFERENCE_VIEWPORT),
    visualConnectedDevices: [],
    visualActiveDeviceSerial: "",
    visualDeviceViewport: null,
    visualFrameDataUrl: "",
    visualFrameBusy: false,
    visualFrameTimer: null,
    visualZoomMode: "fit",
    visualZoomValue: 1,
    visualFitScale: 1,
    visualDisplayScale: 1,
    visualStageOffsetX: 0,
    visualStageOffsetY: 0,
    visualShowGrid: false,
    visualSnapGrid: false,
    visualGridSize: 16,
    visualSelectedSfxEventId: "blockPlace",
    visualSelectedBgmTrackId: "level",
    visualPreviewAudio: null,
    visualDirty: false,
    visualHistoryPast: [],
    visualHistoryFuture: [],
    visualDrag: null,
    visualWorkspaceLoaded: false,
    adminWorkspaceLoaded: false,
    manifest: null,
    publishedVersion: null,
    releaseHistory: [],
    assets: [],
    selected: null
  };
  var localDesktopConfig = typeof window !== "undefined" ? window.__BLOCKHERO_CREATOR_LOCAL_CONFIG__ ?? null : null;
  var VISUAL_RUNTIME_APPLY_SUPPORT = {
    level: true,
    endless: true,
    battle: true,
    raidNormal: true,
    raidBoss: true
  };
  var desktopBridge = typeof window !== "undefined" ? window.__BLOCKHERO_CREATOR_DESKTOP__ ?? null : null;
  function deepClone2(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function showToast(message) {
    window.alert(message);
  }
  function getRawErrorMessage(error) {
    if (!error) {
      return "";
    }
    if (typeof error === "string") {
      return error;
    }
    const parts = [
      error.message,
      error.error_description,
      error.details,
      error.hint,
      error.code ? `code=${error.code}` : ""
    ].filter((part) => typeof part === "string" && part.trim().length > 0);
    if (parts.length > 0) {
      return parts.join(" / ");
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  function getErrorMessage(error, fallback = "\uC694\uCCAD \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.") {
    const rawMessage = getRawErrorMessage(error);
    if (!rawMessage) {
      return fallback;
    }
    const message = rawMessage.trim();
    const tableMatch = message.match(
      /Could not find the table 'public\.([a-zA-Z0-9_]+)' in the schema cache/i
    );
    if (tableMatch) {
      return `DB \uD14C\uC774\uBE14 public.${tableMatch[1]}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. Supabase SQL \uC124\uC815\uC744 \uBA3C\uC800 \uC801\uC6A9\uD558\uC138\uC694.`;
    }
    if (/Invalid login credentials/i.test(message)) {
      return "\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
    }
    if (/Invalid API key/i.test(message)) {
      return "Supabase \uC775\uBA85 \uD0A4\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC124\uC815 \uD30C\uC77C\uC758 \uD0A4\uB97C \uD655\uC778\uD558\uC138\uC694.";
    }
    if (/Failed to fetch/i.test(message) || /NetworkError/i.test(message)) {
      return "\uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC778\uD130\uB137 \uC5F0\uACB0\uACFC Supabase URL\uC744 \uD655\uC778\uD558\uC138\uC694.";
    }
    if (/new row violates row-level security policy/i.test(message)) {
      return "\uAD8C\uD55C\uC774 \uC5C6\uC5B4 \uC694\uCCAD\uC744 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790 \uAD8C\uD55C \uACC4\uC815\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694.";
    }
    if (/permission denied/i.test(message)) {
      return "\uAD8C\uD55C\uC774 \uC5C6\uC5B4 \uC694\uCCAD\uC744 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    }
    if (/relation .* does not exist/i.test(message)) {
      return "\uD544\uC694\uD55C DB \uD14C\uC774\uBE14\uC774 \uC544\uC9C1 \uC0DD\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. SQL \uC124\uC815\uC744 \uBA3C\uC800 \uC2E4\uD589\uD558\uC138\uC694.";
    }
    if (/duplicate key value violates unique constraint/i.test(message)) {
      return "\uC911\uBCF5\uB41C \uAC12\uC774 \uC788\uC5B4 \uC800\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    }
    if (/[\uAC00-\uD7A3]/.test(message)) {
      return message;
    }
    return `${fallback} (${message})`;
  }
  function setStatus(target, message) {
    target.textContent = message;
  }
  function setInlineStatus(target, message, tone = "muted") {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.className = `inline-note${tone === "muted" ? "" : ` ${tone}`}`;
  }
  function clampVisualPreviewPercent(value) {
    return Math.round(clamp(numberOr(value, 0), -100, 100));
  }
  function getVisualStageHostMetrics() {
    const computed = window.getComputedStyle(elements.visualStageHost);
    const paddingX = (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
    const paddingY = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
    return {
      width: Math.max(1, elements.visualStageHost.clientWidth - paddingX),
      height: Math.max(1, elements.visualStageHost.clientHeight - paddingY)
    };
  }
  function isVisualRuntimeApplySupported(screenId = state.visualSelectedScreenId) {
    return VISUAL_RUNTIME_APPLY_SUPPORT[screenId] === true;
  }
  function getVisualRuntimeApplyMessage(screenId = state.visualSelectedScreenId) {
    if (isVisualRuntimeApplySupported(screenId)) {
      return `${SCREEN_LABELS[screenId]} ?몄쭛媛믪? 諛고룷 ??寃뚯엫???곸슜?⑸땲?? ?대? 耳쒖쭊 ?깆? ?ㅼ떆 ?닿굅???깆쑝濡??ㅼ떆 ?뚯븘? 理쒖떊 諛고룷蹂몄쓣 諛쏆븘???⑸땲??`;
    }
    return `${SCREEN_LABELS[screenId]} ?몄쭛媛믪? ?꾩옱 寃뚯엫 ?고??꾩뿉 吏곸젒 ?곸슜?섏? ?딆뒿?덈떎. ???붾㈃? 怨좎젙 ?덉씠?꾩썐?쇰줈 遺꾨━?섏뼱 ?덉뼱 ?먮뵒??誘몃━蹂닿린 ?꾩슜?낅땲??`;
  }
  function getVisualRuntimeApplyMessage(screenId = state.visualSelectedScreenId) {
    return `${SCREEN_LABELS[screenId]} ?몄쭛媛믪? 諛고룷 ???ㅼ젣 寃뚯엫???곸슜?⑸땲?? ?대? 耳쒖쭊 寃뚯엫? UI ?덈줈怨좎묠 ?먮뒗 ???ъ쭊?낆씠 ?꾩슂?⑸땲??`;
  }
  function persistDesktopSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY2) || "null") || {};
    } catch {
      saved = {};
    }
    localStorage.setItem(
      STORAGE_KEY2,
      JSON.stringify({
        ...saved,
        url: elements.supabaseUrl.value.trim() || saved.url || "",
        key: elements.supabaseAnonKey.value.trim() || saved.key || "",
        email: state.session?.user?.email || elements.adminEmail.value.trim() || saved.email || "",
        visualPreview: {
          zoomMode: state.visualZoomMode,
          zoomValue: Number(state.visualZoomValue.toFixed(2)),
          offsetX: state.visualStageOffsetX,
          offsetY: state.visualStageOffsetY
        }
      })
    );
  }
  function syncVisualPreviewControls() {
    elements.visualZoomSlider.value = String(Math.round(state.visualZoomValue * 100));
    elements.visualZoomReadout.textContent = `${Math.round(state.visualZoomValue * 100)}%`;
    elements.visualStageOffsetX.value = String(state.visualStageOffsetX);
    elements.visualStageOffsetXReadout.textContent = `${state.visualStageOffsetX}%`;
    elements.visualStageOffsetY.value = String(state.visualStageOffsetY);
    elements.visualStageOffsetYReadout.textContent = `${state.visualStageOffsetY}%`;
    const runtimeMessage = getVisualRuntimeApplyMessage();
    elements.visualRuntimeApplyNote.textContent = runtimeMessage;
    elements.visualRuntimeApplyNote.className = "inline-note success";
  }
  function canUseDeviceBridge() {
    return !!desktopBridge && typeof desktopBridge.listDevices === "function" && typeof desktopBridge.getDeviceViewport === "function" && typeof desktopBridge.getDeviceFrame === "function";
  }
  function canUseDeviceLayoutBridge() {
    return !!desktopBridge && typeof desktopBridge.getDeviceLayout === "function";
  }
  function setGlobalStatus(message, tone = "muted") {
    setInlineStatus(elements.globalStatusLine, message, tone);
  }
  function isAdminAuthenticated() {
    return Boolean(state.session?.user && state.profile?.is_admin);
  }
  function requireAdminAccess(featureLabel = "\uC774 \uAE30\uB2A5") {
    if (isAdminAuthenticated()) {
      return true;
    }
    showToast(`${featureLabel}\uC740 \uAD00\uB9AC\uC790 \uB85C\uADF8\uC778 \uD6C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
    return false;
  }
  function slugify(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }
  function hashString(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
      hash = hash * 33 ^ value.charCodeAt(index);
    }
    return Math.abs(hash >>> 0).toString(16);
  }
  function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function getManifestVersion(manifest) {
    return Number(manifest?.version || 0);
  }
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function isValidCreatorManifest(manifest) {
    return isPlainObject(manifest) && isPlainObject(manifest.levels) && isPlainObject(manifest.encounters) && isPlainObject(manifest.raids) && isPlainObject(manifest.raids.normal) && isPlainObject(manifest.raids.boss);
  }
  function getSelectedRecord() {
    if (!state.manifest || !state.selected) {
      return null;
    }
    if (state.selected.kind === "level") {
      return state.manifest.levels?.[state.selected.id] ?? null;
    }
    if (state.selected.kind === "raidNormal") {
      return state.manifest.raids?.normal?.[state.selected.id] ?? null;
    }
    if (state.selected.kind === "raidBoss") {
      return state.manifest.raids?.boss?.[state.selected.id] ?? null;
    }
    if (state.selected.kind === "encounter") {
      return state.manifest.encounters?.[state.selected.id] ?? null;
    }
    return null;
  }
  function formatEncounterReference(encounterId) {
    const encounter = state.manifest?.encounters?.[encounterId];
    if (!encounter) {
      return encounterId || "-";
    }
    return `${encounter.displayName} (${encounter.id})`;
  }
  function writePath(target, path, value) {
    const segments = path.split(".");
    let cursor = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!Object.prototype.hasOwnProperty.call(cursor, segment) || cursor[segment] == null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    cursor[segments[segments.length - 1]] = value;
  }
  function getAssetOptions(selectedKey = "") {
    const items = ['<option value="">\uC5C6\uC74C</option>'];
    state.assets.slice().sort((a, b) => a.asset_key.localeCompare(b.asset_key)).forEach((asset) => {
      items.push(
        `<option value="${asset.asset_key}" ${selectedKey === asset.asset_key ? "selected" : ""}>${asset.asset_key}</option>`
      );
    });
    return items.join("");
  }
  function renderPatternOptions(selectedValue = "", allowDefault = false) {
    const options = [];
    if (allowDefault) {
      options.push(
        `<option value="" ${selectedValue === "" ? "selected" : ""}>\uAE30\uBCF8\uAC12 \uC0AC\uC6A9</option>`
      );
    }
    PATTERN_OPTIONS.forEach((option) => {
      const label = ATTACK_PATTERN_LABELS[option] || "\uAE30\uBCF8 \uD328\uD134";
      options.push(
        `<option value="${option}" ${selectedValue === option ? "selected" : ""}>${label}</option>`
      );
    });
    return options.join("");
  }
  function renderTierOptions(selectedValue = "normal") {
    return Object.entries(ENCOUNTER_TIER_LABELS).map(
      ([value, label]) => `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`
    ).join("");
  }
  function renderEncounterKindOptions(selectedValue = "level") {
    return Object.entries(ENCOUNTER_KIND_LABELS).map(
      ([value, label]) => `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`
    ).join("");
  }
  function renderHelpPanel() {
    const help = state.selected ? HELP_TEXT[state.selected.kind] ?? null : null;
    if (!help) {
      elements.helpPanel.innerHTML = `<div class="help-card"><strong>\uBA54\uB274 \uC124\uBA85 \uB300\uAE30 \uC911</strong><p>\uC67C\uCABD \uD2B8\uB9AC\uC5D0\uC11C \uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uBA74 \uD574\uB2F9 \uBA54\uB274\uC758 \uC5ED\uD560\uACFC \uC218\uC815 \uD301\uC774 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.</p></div>`;
      return;
    }
    elements.helpPanel.innerHTML = `<div class="help-card"><strong>${help.title}</strong><p>${help.description}</p><ul>${help.tips.map((item) => `<li>${item}</li>`).join("")}</ul></div>`;
  }
  function renderSummary(record) {
    if (!record || !state.selected) {
      elements.selectionSummary.innerHTML = `<div class="summary-card"><span>\uC120\uD0DD \uC5C6\uC74C</span><strong>\uD3B8\uC9D1 \uB300\uC0C1 \uBBF8\uC120\uD0DD</strong></div>`;
      return;
    }
    if (state.selected.kind === "level") {
      elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>\uB808\uBCA8 ID</span><strong>${record.levelId}</strong></div>
      <div class="summary-card"><span>\uC6D4\uB4DC / \uC2A4\uD14C\uC774\uC9C0</span><strong>${record.worldId}-${record.stageNumberInWorld}</strong></div>
      <div class="summary-card"><span>\uC801 \uD15C\uD50C\uB9BF</span><strong>${formatEncounterReference(
        record.enemyTemplateId
      )}</strong></div>
      <div class="summary-card"><span>\uC0AC\uC6A9 \uC0C1\uD0DC</span><strong>${record.enabled ? "\uD65C\uC131" : "\uBE44\uD65C\uC131"}</strong></div>`;
      return;
    }
    if (state.selected.kind === "raidNormal" || state.selected.kind === "raidBoss") {
      elements.selectionSummary.innerHTML = `
      <div class="summary-card"><span>\uB808\uC774\uB4DC \uC885\uB958</span><strong>${state.selected.kind === "raidNormal" ? "\uC77C\uBC18" : "\uBCF4\uC2A4"}</strong></div>
      <div class="summary-card"><span>\uB2E8\uACC4</span><strong>${record.stage}</strong></div>
      <div class="summary-card"><span>\uD15C\uD50C\uB9BF</span><strong>${formatEncounterReference(
        record.encounterTemplateId
      )}</strong></div>
      <div class="summary-card"><span>\uC2DC\uAC04 \uC81C\uD55C</span><strong>${Math.round(
        record.timeLimitMs / 1e3
      )}\uCD08</strong></div>`;
      return;
    }
    elements.selectionSummary.innerHTML = `
    <div class="summary-card"><span>\uD15C\uD50C\uB9BF ID</span><strong>${record.id}</strong></div>
    <div class="summary-card"><span>\uC885\uB958</span><strong>${record.kind === "level" ? "\uB808\uBCA8 \uC801" : "\uB808\uC774\uB4DC \uC801"}</strong></div>
    <div class="summary-card"><span>\uACF5\uACA9 \uC8FC\uAE30</span><strong>${record.attackIntervalMs}\uBC00\uB9AC\uCD08</strong></div>
    <div class="summary-card"><span>\uC0AC\uC6A9 \uC0C1\uD0DC</span><strong>${record.enabled ? "\uD65C\uC131" : "\uBE44\uD65C\uC131"}</strong></div>`;
  }
  function backgroundFields(path, value = {}) {
    return `
    <div class="section-card">
      <div><h3>\uBC30\uACBD</h3><p>\uC5C5\uB85C\uB4DC\uD55C \uBC30\uACBD \uC790\uC0B0\uC744 \uC5F0\uACB0\uD558\uACE0, \uC0C9\uC0C1 \uB36E\uAC1C\uC640 \uC774\uBBF8\uC9C0 \uC81C\uAC70 \uC5EC\uBD80\uB97C \uC870\uC815\uD569\uB2C8\uB2E4.</p></div>
      <div class="field-grid">
        <label><span>\uBC30\uACBD \uC790\uC0B0</span><select data-path="${path}.background.assetKey">${getAssetOptions(
      value.assetKey ?? ""
    )}</select></label>
        <label><span>\uB36E\uAC1C \uC0C9\uC0C1</span><input data-path="${path}.background.tintColor" type="text" value="${value.tintColor ?? "#000000"}" /></label>
        <label><span>\uB36E\uAC1C \uD22C\uBA85\uB3C4</span><input data-path="${path}.background.tintOpacity" type="number" step="0.05" min="0" max="1" value="${value.tintOpacity ?? 0}" /></label>
        <label><span>\uC774\uBBF8\uC9C0 \uC81C\uAC70</span><select data-path="${path}.background.removeImage"><option value="false" ${value.removeImage ? "" : "selected"}>\uC544\uB2C8\uC624</option><option value="true" ${value.removeImage ? "selected" : ""}>\uC608</option></select></label>
      </div>
    </div>`;
  }
  function overrideFields(path, value = {}) {
    return `
    <div class="section-card">
      <div><h3>\uC2A4\uD14C\uC774\uC9C0\uBCC4 \uC624\uBC84\uB77C\uC774\uB4DC</h3><p>\uD15C\uD50C\uB9BF\uC744 \uAC74\uB4DC\uB9AC\uC9C0 \uC54A\uACE0 \uC774 \uC2A4\uD14C\uC774\uC9C0\uC5D0\uC11C\uB9CC \uB2E4\uB974\uAC8C \uC801\uC6A9\uD560 \uAC12\uC744 \uB123\uC2B5\uB2C8\uB2E4. \uBE48 \uAC12\uC740 \uAE30\uBCF8 \uD15C\uD50C\uB9BF\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.</p></div>
      <div class="field-grid three">
        <label><span>\uD45C\uC2DC \uC774\uB984</span><input data-path="${path}.encounterOverrides.displayName" type="text" value="${value.displayName ?? ""}" /></label>
        <label><span>\uBAAC\uC2A4\uD130 \uC774\uB984</span><input data-path="${path}.encounterOverrides.monsterName" type="text" value="${value.monsterName ?? ""}" /></label>
        <label><span>\uC774\uBAA8\uC9C0</span><input data-path="${path}.encounterOverrides.monsterEmoji" type="text" value="${value.monsterEmoji ?? ""}" /></label>
        <label><span>\uC0C9\uC0C1</span><input data-path="${path}.encounterOverrides.monsterColor" type="text" value="${value.monsterColor ?? ""}" /></label>
        <label><span>HP</span><input data-path="${path}.encounterOverrides.baseHp" type="number" value="${value.baseHp ?? ""}" /></label>
        <label><span>\uACF5\uACA9\uB825</span><input data-path="${path}.encounterOverrides.baseAttack" type="number" value="${value.baseAttack ?? ""}" /></label>
        <label><span>\uACF5\uACA9 \uC8FC\uAE30(ms)</span><input data-path="${path}.encounterOverrides.attackIntervalMs" type="number" value="${value.attackIntervalMs ?? ""}" /></label>
        <label><span>\uACF5\uACA9 \uD328\uD134</span><select data-path="${path}.encounterOverrides.attackPattern">${renderPatternOptions(
      value.attackPattern ?? "",
      true
    )}</select></label>
      </div>
    </div>`;
  }
  function renderLevelEditor(level) {
    const path = `levels.${level.id}`;
    return `
    <div class="section-card">
      <div><h3>\uAE30\uBCF8 \uC815\uBCF4</h3><p>\uB808\uBCA8 \uC774\uB984, \uC6D4\uB4DC, \uC2A4\uD14C\uC774\uC9C0 \uBC88\uD638, \uBAA9\uD45C \uC218\uCE58, \uC5F0\uACB0\uB41C \uC801 \uD15C\uD50C\uB9BF\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.</p></div>
      <div class="field-grid three">
        <label><span>\uB0B4\uBD80 ID</span><input type="text" value="${level.id}" disabled /></label>
        <label><span>\uB808\uBCA8 \uBC88\uD638</span><input data-path="${path}.levelId" type="number" value="${level.levelId}" /></label>
        <label><span>\uC774\uB984</span><input data-path="${path}.name" type="text" value="${level.name}" /></label>
        <label><span>\uC6D4\uB4DC \uBC88\uD638</span><input data-path="${path}.worldId" type="number" value="${level.worldId}" /></label>
        <label><span>\uC6D4\uB4DC \uB0B4 \uBC88\uD638</span><input data-path="${path}.stageNumberInWorld" type="number" value="${level.stageNumberInWorld}" /></label>
        <label><span>\uBAA9\uD45C \uC218\uCE58</span><input data-path="${path}.goalValue" type="number" value="${level.goalValue}" /></label>
        <label><span>\uC801 \uD15C\uD50C\uB9BF</span><select data-path="${path}.enemyTemplateId">${Object.values(
      state.manifest.encounters
    ).sort((a, b) => a.id.localeCompare(b.id)).map(
      (encounter) => `<option value="${encounter.id}" ${encounter.id === level.enemyTemplateId ? "selected" : ""}>${encounter.displayName} (${encounter.id})</option>`
    ).join("")}</select></label>
        <label><span>\uBCF4\uC2A4 \uB808\uC774\uB4DC \uD574\uAE08 \uB2E8\uACC4</span><input data-path="${path}.unlocksBossRaidStage" type="number" value="${level.unlocksBossRaidStage ?? ""}" /></label>
        <label><span>\uD65C\uC131\uD654</span><select data-path="${path}.enabled"><option value="true" ${level.enabled ? "selected" : ""}>\uD65C\uC131</option><option value="false" ${level.enabled ? "" : "selected"}>\uBE44\uD65C\uC131</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>\uBCF4\uC0C1</h3><p>\uCCAB \uD074\uB9AC\uC5B4 \uBCF4\uB108\uC2A4\uC640 \uBC18\uBCF5 \uBCF4\uC0C1\uC744 \uB098\uB220\uC11C \uC870\uC815\uD569\uB2C8\uB2E4.</p></div><div class="field-grid three"><label><span>\uBC18\uBCF5 \uACE8\uB4DC</span><input data-path="${path}.reward.repeatGold" type="number" value="${level.reward.repeatGold}" /></label><label><span>\uCCAB \uD074\uB9AC\uC5B4 \uBCF4\uB108\uC2A4 \uACE8\uB4DC</span><input data-path="${path}.reward.firstClearBonusGold" type="number" value="${level.reward.firstClearBonusGold}" /></label><label><span>\uCE90\uB9AD\uD130 \uACBD\uD5D8\uCE58</span><input data-path="${path}.reward.characterExp" type="number" value="${level.reward.characterExp}" /></label></div></div>
    ${overrideFields(path, level.enemyOverrides)}
    ${backgroundFields(path, level.background)}
    <div class="section-card"><div><h3>\uC6B4\uC601 \uBA54\uBAA8</h3><p>\uC774 \uB808\uBCA8\uC5D0 \uB300\uD55C \uB0B4\uBD80 \uBA54\uBAA8\uB97C \uB0A8\uAE41\uB2C8\uB2E4.</p></div><label><span>\uBA54\uBAA8</span><textarea data-path="${path}.notes" rows="4">${level.notes ?? ""}</textarea></label></div>`;
  }
  function renderRaidEditor(raid, scope) {
    const path = `raids.${scope}.${raid.id}`;
    return `
    <div class="section-card">
      <div><h3>\uAE30\uBCF8 \uC815\uBCF4</h3><p>\uB808\uC774\uB4DC \uC774\uB984, \uB2E8\uACC4, \uC5F0\uACB0 \uD15C\uD50C\uB9BF, \uC2DC\uAC04 \uC81C\uD55C\uACFC \uCC38\uAC00 \uADDC\uCE59\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.</p></div>
      <div class="field-grid three">
        <label><span>\uB0B4\uBD80 ID</span><input type="text" value="${raid.id}" disabled /></label>
        <label><span>\uC774\uB984</span><input data-path="${path}.name" type="text" value="${raid.name}" /></label>
        <label><span>\uB2E8\uACC4</span><input data-path="${path}.stage" type="number" value="${raid.stage}" /></label>
        <label><span>\uC6D4\uB4DC \uBC88\uD638</span><input data-path="${path}.worldId" type="number" value="${raid.worldId ?? ""}" /></label>
        <label><span>\uC81C\uD55C \uC2DC\uAC04(\uBC00\uB9AC\uCD08)</span><input data-path="${path}.timeLimitMs" type="number" value="${raid.timeLimitMs}" /></label>
        <label><span>\uAC1C\uBC29 \uC2DC\uAC04(\uC2DC\uAC04)</span><input data-path="${path}.raidWindowHours" type="number" value="${raid.raidWindowHours}" /></label>
        <label><span>\uC785\uC7A5 \uAC00\uB2A5 \uC2DC\uAC04(\uBD84)</span><input data-path="${path}.joinWindowMinutes" type="number" value="${raid.joinWindowMinutes}" /></label>
        <label><span>\uCD5C\uB300 \uCC38\uAC00 \uC778\uC6D0</span><input data-path="${path}.maxParticipants" type="number" value="${raid.maxParticipants}" /></label>
        <label><span>\uC801 \uD15C\uD50C\uB9BF</span><select data-path="${path}.encounterTemplateId">${Object.values(
      state.manifest.encounters
    ).sort((a, b) => a.id.localeCompare(b.id)).map(
      (encounter) => `<option value="${encounter.id}" ${encounter.id === raid.encounterTemplateId ? "selected" : ""}>${encounter.displayName} (${encounter.id})</option>`
    ).join("")}</select></label>
        <label><span>\uD65C\uC131\uD654</span><select data-path="${path}.enabled"><option value="true" ${raid.enabled ? "selected" : ""}>\uD65C\uC131</option><option value="false" ${raid.enabled ? "" : "selected"}>\uBE44\uD65C\uC131</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>\uBCF4\uC0C1</h3><p>\uCCAB \uD074\uB9AC\uC5B4\uC640 \uBC18\uBCF5 \uBCF4\uC0C1\uC744 \uBD84\uB9AC\uD574 \uC870\uC815\uD569\uB2C8\uB2E4.</p></div><div class="field-grid"><label><span>\uCCAB \uD074\uB9AC\uC5B4 \uB2E4\uC774\uC544</span><input data-path="${path}.reward.firstClearDiamondReward" type="number" value="${raid.reward.firstClearDiamondReward}" /></label><label><span>\uBC18\uBCF5 \uB2E4\uC774\uC544</span><input data-path="${path}.reward.repeatDiamondReward" type="number" value="${raid.reward.repeatDiamondReward}" /></label></div></div>
    ${overrideFields(path, raid.encounterOverrides)}
    ${backgroundFields(path, raid.background)}
    <div class="section-card"><div><h3>\uC6B4\uC601 \uBA54\uBAA8</h3><p>\uB808\uC774\uB4DC \uAE30\uD68D \uBA54\uBAA8\uB97C \uC815\uB9AC\uD569\uB2C8\uB2E4.</p></div><label><span>\uBA54\uBAA8</span><textarea data-path="${path}.notes" rows="4">${raid.notes ?? ""}</textarea></label></div>`;
  }
  function renderEncounterEditor(encounter) {
    const path = `encounters.${encounter.id}`;
    return `
    <div class="section-card">
      <div><h3>\uD15C\uD50C\uB9BF \uC815\uBCF4</h3><p>\uB808\uBCA8\uACFC \uB808\uC774\uB4DC\uAC00 \uACF5\uD1B5\uC73C\uB85C \uCC38\uC870\uD558\uB294 \uC801 \uAE30\uBCF8 \uD15C\uD50C\uB9BF\uC785\uB2C8\uB2E4.</p></div>
      <div class="field-grid three">
        <label><span>\uB0B4\uBD80 ID</span><input type="text" value="${encounter.id}" disabled /></label>
        <label><span>\uD45C\uC2DC \uC774\uB984</span><input data-path="${path}.displayName" type="text" value="${encounter.displayName}" /></label>
        <label><span>\uBAAC\uC2A4\uD130 \uC774\uB984</span><input data-path="${path}.monsterName" type="text" value="${encounter.monsterName}" /></label>
        <label><span>\uC774\uBAA8\uC9C0</span><input data-path="${path}.monsterEmoji" type="text" value="${encounter.monsterEmoji}" /></label>
        <label><span>\uC0C9\uC0C1</span><input data-path="${path}.monsterColor" type="text" value="${encounter.monsterColor}" /></label>
        <label><span>\uB4F1\uAE09</span><select data-path="${path}.tier">${renderTierOptions(
      encounter.tier
    )}</select></label>
        <label><span>\uAE30\uBCF8 \uCCB4\uB825</span><input data-path="${path}.baseHp" type="number" value="${encounter.baseHp}" /></label>
        <label><span>\uAE30\uBCF8 \uACF5\uACA9\uB825</span><input data-path="${path}.baseAttack" type="number" value="${encounter.baseAttack}" /></label>
        <label><span>\uACF5\uACA9 \uC8FC\uAE30(\uBC00\uB9AC\uCD08)</span><input data-path="${path}.attackIntervalMs" type="number" value="${encounter.attackIntervalMs}" /></label>
        <label><span>\uACF5\uACA9 \uD328\uD134</span><select data-path="${path}.attackPattern">${renderPatternOptions(
      encounter.attackPattern
    )}</select></label>
        <label><span>\uC0AC\uC6A9 \uBC94\uC704</span><select data-path="${path}.kind">${renderEncounterKindOptions(
      encounter.kind
    )}</select></label>
        <label><span>\uD65C\uC131\uD654</span><select data-path="${path}.enabled"><option value="true" ${encounter.enabled ? "selected" : ""}>\uD65C\uC131</option><option value="false" ${encounter.enabled ? "" : "selected"}>\uBE44\uD65C\uC131</option></select></label>
      </div>
    </div>
    <div class="section-card"><div><h3>\uC6B4\uC601 \uBA54\uBAA8</h3><p>\uC801 \uBC38\uB7F0\uC2A4\uB098 \uAE30\uD68D \uC758\uB3C4\uB97C \uB0B4\uBD80 \uBA54\uBAA8\uB85C \uB0A8\uAE41\uB2C8\uB2E4.</p></div><label><span>\uBA54\uBAA8</span><textarea data-path="${path}.notes" rows="4">${encounter.notes ?? ""}</textarea></label></div>`;
  }
  function renderTree() {
    if (!state.manifest) {
      elements.contentTree.innerHTML = "";
      return;
    }
    if (!isValidCreatorManifest(state.manifest)) {
      elements.contentTree.innerHTML = `<div class="release-card"><strong>\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uAD6C\uC870 \uC624\uB958</strong><p>\uCD08\uC548 \uB370\uC774\uD130\uAC00 \uBE44\uC5B4 \uC788\uC5B4 \uAE30\uBCF8 manifest\uB85C \uBCF5\uAD6C\uD574\uC57C \uD569\uB2C8\uB2E4.</p></div>`;
      return;
    }
    const buildGroup = (title, items, kind) => `
    <section class="tree-group">
      <button type="button">${title}</button>
      <div class="tree-items">
        ${items.map((item) => {
      const active = state.selected?.kind === kind && state.selected?.id === item.id ? "active" : "";
      const label = kind === "level" ? `${item.levelId}. ${item.name}` : kind === "encounter" ? `${item.displayName} (${item.id})` : `${item.stage}\uB2E8\uACC4 ${item.name}`;
      return `<button class="tree-item ${active}" data-kind="${kind}" data-id="${item.id}">${label}</button>`;
    }).join("")}
      </div>
    </section>`;
    elements.contentTree.innerHTML = [
      buildGroup(
        "\uB808\uBCA8 \uC2A4\uD14C\uC774\uC9C0",
        Object.values(state.manifest.levels).sort(
          (a, b) => a.levelId - b.levelId
        ),
        "level"
      ),
      buildGroup(
        "\uC77C\uBC18 \uB808\uC774\uB4DC",
        Object.values(state.manifest.raids.normal).sort(
          (a, b) => a.stage - b.stage
        ),
        "raidNormal"
      ),
      buildGroup(
        "\uBCF4\uC2A4 \uB808\uC774\uB4DC",
        Object.values(state.manifest.raids.boss).sort(
          (a, b) => a.stage - b.stage
        ),
        "raidBoss"
      ),
      buildGroup(
        "\uC801 \uD15C\uD50C\uB9BF",
        Object.values(state.manifest.encounters).sort(
          (a, b) => a.id.localeCompare(b.id)
        ),
        "encounter"
      )
    ].join("");
  }
  function renderAssets() {
    elements.assetCount.textContent = String(state.assets.length);
    if (!state.assets.length) {
      elements.assetLibrary.innerHTML = `<div class="asset-card"><strong>\uB4F1\uB85D\uB41C \uC790\uC0B0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong><p>\uBC30\uACBD \uC774\uBBF8\uC9C0\uB97C \uC62C\uB9AC\uBA74 \uC5EC\uAE30\uC11C \uC790\uC0B0 \uD0A4\uB97C \uD655\uC778\uD558\uACE0 \uB808\uBCA8\uC774\uB098 \uB808\uC774\uB4DC \uBC30\uACBD\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p></div>`;
      return;
    }
    elements.assetLibrary.innerHTML = state.assets.slice().sort((a, b) => a.asset_key.localeCompare(b.asset_key)).map(
      (asset) => {
        const audio = isAudioAsset(asset);
        return `
    <div class="asset-card">
      <strong class="mono">${asset.asset_key}</strong>
      ${audio ? `<audio controls src="${asset.data_url}" class="asset-audio-preview"></audio>` : `<img class="asset-preview" src="${asset.data_url}" alt="${asset.asset_key}" />`}
      <div class="asset-meta"><span>${asset.mime_type || "\uC774\uBBF8\uC9C0"}</span><span>${asset.content_hash || "-"}</span></div>
    </div>`;
      }
    ).join("");
  }
  function renderReleaseHistory() {
    if (!state.releaseHistory.length) {
      elements.releaseHistory.innerHTML = `<div class="release-card"><strong>\uBC30\uD3EC \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong><p>\uC544\uC9C1 \uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC\uB97C \uD55C \uC801\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p></div>`;
      return;
    }
    elements.releaseHistory.innerHTML = state.releaseHistory.map(
      (release) => `
    <div class="release-card">
      <strong>v${release.version}</strong>
      <p>${release.notes || "\uBA54\uBAA8 \uC5C6\uC74C"}</p>
      <div class="release-meta"><span>${new Date(
        release.created_at
      ).toLocaleString(
        "ko-KR"
      )}</span><button class="ghost small rollback-button" data-version="${release.version}">\uC774 \uBC84\uC804\uC73C\uB85C \uB864\uBC31</button></div>
    </div>`
    ).join("");
  }
  function updateManifestTextarea() {
    elements.manifestJson.value = state.manifest ? JSON.stringify(state.manifest, null, 2) : "";
  }
  function renderEditor() {
    const record = getSelectedRecord();
    renderSummary(record);
    renderHelpPanel();
    if (!record || !state.selected) {
      elements.editorTitle.textContent = "\uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694";
      elements.editorSubtitle.textContent = "\uC67C\uCABD \uD2B8\uB9AC\uC5D0\uC11C \uB808\uBCA8, \uB808\uC774\uB4DC, \uC801 \uD15C\uD50C\uB9BF \uC911 \uD558\uB098\uB97C \uC120\uD0DD\uD558\uBA74 \uC0C1\uC138 \uD3B8\uC9D1\uAE30\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4.";
      elements.editorForm.className = "editor-form empty-state";
      elements.editorForm.innerHTML = "<p>\uC67C\uCABD\uC5D0\uC11C \uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uBA74 \uC5EC\uAE30\uC5D0\uC11C \uD604\uC7AC \uAC12\uC744 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>";
      return;
    }
    elements.editorForm.className = "editor-form";
    if (state.selected.kind === "level") {
      elements.editorTitle.textContent = `\uB808\uBCA8 ${record.levelId} \uD3B8\uC9D1`;
      elements.editorSubtitle.textContent = "\uB808\uBCA8 \uBAA8\uB4DC\uC5D0 \uC2E4\uC81C\uB85C \uBC18\uC601\uB420 \uBAA9\uD45C, \uBCF4\uC0C1, \uC801 \uC5F0\uACB0, \uBC30\uACBD\uC744 \uC870\uC815\uD569\uB2C8\uB2E4.";
      elements.editorForm.innerHTML = renderLevelEditor(record);
    } else if (state.selected.kind === "raidNormal" || state.selected.kind === "raidBoss") {
      elements.editorTitle.textContent = `${state.selected.kind === "raidNormal" ? "\uC77C\uBC18" : "\uBCF4\uC2A4"} \uB808\uC774\uB4DC ${record.stage}\uB2E8\uACC4 \uD3B8\uC9D1`;
      elements.editorSubtitle.textContent = "\uB808\uC774\uB4DC \uC885\uB958\uBCC4 \uB2E8\uACC4 \uC815\uBCF4\uC640 \uBCF4\uC0C1, \uC2DC\uAC04 \uC81C\uD55C, \uCC38\uAC00 \uADDC\uCE59\uC744 \uC218\uC815\uD569\uB2C8\uB2E4.";
      elements.editorForm.innerHTML = renderRaidEditor(
        record,
        state.selected.kind === "raidNormal" ? "normal" : "boss"
      );
    } else {
      elements.editorTitle.textContent = `\uC801 \uD15C\uD50C\uB9BF ${record.id}`;
      elements.editorSubtitle.textContent = "\uC5EC\uAE30\uC11C \uBC14\uAFBC \uAC12\uC740 \uB808\uBCA8/\uB808\uC774\uB4DC\uAC00 \uACF5\uD1B5\uC73C\uB85C \uCC38\uC870\uD558\uBA70, \uC2A4\uD14C\uC774\uC9C0\uBCC4 override\uBCF4\uB2E4 \uBA3C\uC800 \uC801\uC6A9\uB429\uB2C8\uB2E4.";
      elements.editorForm.innerHTML = renderEncounterEditor(record);
    }
  }
  function renderAdminWorkspace() {
    elements.userEmail.textContent = state.profile?.email || state.session?.user?.email || "-";
    elements.draftVersion.textContent = state.manifest ? `v${getManifestVersion(state.manifest)}` : "-";
    elements.publishedVersion.textContent = state.publishedVersion ? `v${state.publishedVersion}` : "-";
    renderTree();
    renderEditor();
    renderAssets();
    renderReleaseHistory();
    updateManifestTextarea();
  }
  function renderAll() {
    if (state.visualManifest) {
      renderVisualEditor();
    } else {
      elements.visualDraftVersion.textContent = "-";
      elements.visualPublishedVersion.textContent = "-";
      if (elements.audioAssetLibrary) {
        elements.audioAssetLibrary.innerHTML = "";
      }
    }
    if (state.adminWorkspaceLoaded && isValidCreatorManifest(state.manifest)) {
      renderAdminWorkspace();
    } else {
      elements.draftVersion.textContent = "-";
      elements.publishedVersion.textContent = "-";
    }
    renderHistoryViews();
    renderSettingsView();
    updateAccessControls();
    updateViewVisibility();
    updateChromeSummary();
  }
  function parseInputValue(input) {
    if (input.tagName === "SELECT") {
      if (input.value === "true") return true;
      if (input.value === "false") return false;
    }
    if (input.type === "number") {
      return normalizeNumber(input.value, 0);
    }
    return input.value;
  }
  function bindDynamicEvents() {
    elements.contentTree.querySelectorAll(".tree-item").forEach((button) => {
      button.addEventListener("click", () => {
        state.selected = { kind: button.dataset.kind, id: button.dataset.id };
        renderAll();
        bindDynamicEvents();
      });
    });
    elements.editorForm.querySelectorAll("[data-path]").forEach((input) => {
      input.addEventListener("change", () => {
        writePath(state.manifest, input.dataset.path, parseInputValue(input));
        renderAll();
        bindDynamicEvents();
      });
    });
    elements.releaseHistory.querySelectorAll(".rollback-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const version5 = Number(button.dataset.version);
        if (!window.confirm(
          `v${version5} \uB9B4\uB9AC\uC988\uB97C \uAE30\uC900\uC73C\uB85C \uC0C8 \uB864\uBC31 \uB9B4\uB9AC\uC988\uB97C \uB9CC\uB4E4\uAE4C\uC694?`
        )) {
          return;
        }
        try {
          await rollbackRelease(version5);
        } catch (error) {
          showToast(getErrorMessage(error, "\uB864\uBC31\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
        }
      });
    });
  }
  function getViewLabel(view) {
    if (view === "admin") {
      return "\uAD00\uB9AC\uC790 \uB370\uC774\uD130";
    }
    if (view === "history") {
      return "\uBC30\uD3EC \uC774\uB825";
    }
    if (view === "settings") {
      return "\uD658\uACBD \uC124\uC815";
    }
    return "\uD654\uBA74 \uD3B8\uC9D1\uAE30";
  }
  function updateViewVisibility() {
    const viewMap = {
      ui: elements.uiEditorView,
      admin: elements.adminDataView,
      history: elements.historyView,
      settings: elements.settingsView
    };
    Object.entries(viewMap).forEach(([key, node]) => {
      if (!node) {
        return;
      }
      node.classList.toggle("active", key === state.activeView);
    });
    [
      elements.viewUiButton,
      elements.viewAdminButton,
      elements.viewHistoryButton,
      elements.viewSettingsButton
    ].filter(Boolean).forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === state.activeView
      );
    });
  }
  function updateChromeSummary() {
    if (elements.activeViewStatus) {
      elements.activeViewStatus.textContent = getViewLabel(state.activeView);
    }
    if (elements.userEmail) {
      elements.userEmail.textContent = state.profile?.email || state.session?.user?.email || elements.adminEmail.value.trim() || "-";
    }
    const connectedPhone = state.visualConnectedDevices.find(
      (device) => device.serial === state.visualActiveDeviceSerial
    );
    const deviceLabel = connectedPhone?.rawState === "device" ? "\uAE30\uAE30 \uC5F0\uACB0\uB428" : "\uAE30\uAE30 \uBBF8\uC5F0\uACB0";
    setStatus(elements.deviceConnectionStatus, deviceLabel);
    const uiVersion = state.visualManifest ? `\uD654\uBA74 \uCD08\uC548 v${state.visualManifest.version || 0}` : "\uD654\uBA74 \uCD08\uC548 \uB300\uAE30";
    const adminVersion = state.manifest ? `\uAD00\uB9AC\uC790 \uCD08\uC548 v${getManifestVersion(state.manifest)}` : "\uAD00\uB9AC\uC790 \uCD08\uC548 \uB300\uAE30";
    setStatus(
      elements.manifestStatus,
      state.activeView === "admin" ? adminVersion : uiVersion
    );
    if (elements.logoutButton) {
      elements.logoutButton.textContent = isAdminAuthenticated() ? "\uB85C\uADF8\uC544\uC6C3" : "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778";
    }
    if (elements.settingsSupabaseUrl) {
      elements.settingsSupabaseUrl.textContent = state.supabaseUrl || elements.supabaseUrl.value.trim() || "-";
    }
    if (elements.settingsAdminEmail) {
      elements.settingsAdminEmail.textContent = state.profile?.email || state.session?.user?.email || elements.adminEmail.value.trim() || "-";
    }
  }
  function updateAccessControls() {
    const loggedIn = isAdminAuthenticated();
    [
      elements.visualSaveDraftButton,
      elements.visualPublishButton,
      elements.refreshButton,
      elements.saveDraftButton,
      elements.publishButton,
      elements.copyJsonButton,
      elements.applyJsonButton,
      elements.uploadAssetButton,
      elements.uploadAudioAssetButton,
      elements.addLevelButton,
      elements.addNormalRaidButton,
      elements.addBossRaidButton,
      elements.addEncounterButton,
      elements.cloneButton,
      elements.deleteButton
    ].filter(Boolean).forEach((button) => {
      button.disabled = !loggedIn;
    });
    if (elements.viewAdminButton) {
      elements.viewAdminButton.disabled = !loggedIn;
    }
  }
  function toggleLoginCard(forceVisible) {
    if (!elements.loginCard) {
      return;
    }
    const nextVisible = typeof forceVisible === "boolean" ? forceVisible : elements.loginCard.classList.contains("hidden");
    elements.loginCard.classList.toggle("hidden", !nextVisible);
  }
  function getVisualSelectedRule() {
    return getRule(
      state.visualManifest,
      state.visualSelectedScreenId,
      state.visualSelectedElementId
    );
  }
  function getVisualDeviceProfile() {
    return DEVICE_PROFILES.find(
      (profile) => profile.id === state.visualDeviceProfileId
    ) || DEVICE_PROFILES[0];
  }
  function getVisualViewport() {
    if (state.visualDeviceSource === "phone" && state.visualDeviceViewport) {
      return sanitizeViewport({
        width: state.visualDeviceViewport.widthDp,
        height: state.visualDeviceViewport.heightDp,
        safeTop: state.visualDeviceViewport.safeTopDp,
        safeBottom: state.visualDeviceViewport.safeBottomDp
      });
    }
    if (state.visualDeviceSource === "preset") {
      return clone(getVisualDeviceProfile().viewport);
    }
    return sanitizeViewport(state.visualCustomViewport);
  }
  function getVisualReferenceViewport() {
    return sanitizeViewport(
      state.visualManifest?.referenceViewport || DEFAULT_REFERENCE_VIEWPORT
    );
  }
  function formatViewportSummary(viewport) {
    return `${viewport.width} x ${viewport.height} \xB7 \uC548\uC804\uC601\uC5ED ${viewport.safeTop} / ${viewport.safeBottom}`;
  }
  function syncVisualViewportInputs() {
    const viewport = getVisualViewport();
    const referenceViewport = getVisualReferenceViewport();
    elements.visualViewportWidth.value = String(viewport.width);
    elements.visualViewportHeight.value = String(viewport.height);
    elements.visualSafeTop.value = String(viewport.safeTop);
    elements.visualSafeBottom.value = String(viewport.safeBottom);
    elements.visualCurrentViewport.textContent = formatViewportSummary(viewport);
    if (elements.visualReferenceViewportValue) {
      elements.visualReferenceViewportValue.textContent = formatViewportSummary(referenceViewport);
    }
    if (elements.visualReferenceViewportNote) {
      elements.visualReferenceViewportNote.textContent = referenceViewport.width === viewport.width && referenceViewport.height === viewport.height && referenceViewport.safeTop === viewport.safeTop && referenceViewport.safeBottom === viewport.safeBottom ? "\uD604\uC7AC \uBCF4\uB294 \uAE30\uAE30 \uAE30\uC900\uACFC \uBC30\uD3EC \uC88C\uD45C \uAE30\uC900 viewport\uAC00 \uAC19\uC2B5\uB2C8\uB2E4." : `\uBC30\uD3EC \uC88C\uD45C\uB294 v${state.visualManifest?.version || 0} \uCD08\uC548\uC758 \uAE30\uC900 viewport\uB97C \uC720\uC9C0\uD569\uB2C8\uB2E4. \uC9C0\uAE08 \uBCF4\uB294 \uAE30\uAE30\uB294 \uBBF8\uB9AC\uBCF4\uAE30\uC6A9\uC73C\uB85C\uB9CC \uC4F0\uC785\uB2C8\uB2E4.`;
    }
  }
  function retargetVisualRuleOffsets(rule, sourceViewport, targetViewport) {
    const safeRule = sanitizeRule(rule);
    const converted = convertViewportDeltaToReference(
      safeRule.offsetX,
      safeRule.offsetY,
      sourceViewport,
      targetViewport,
      safeRule.safeAreaAware
    );
    return {
      ...safeRule,
      offsetX: Math.round(converted.x),
      offsetY: Math.round(converted.y)
    };
  }
  function replaceVisualReferenceViewport(nextViewport) {
    if (!state.visualManifest) {
      return;
    }
    const sourceViewport = getVisualReferenceViewport();
    const targetViewport = sanitizeViewport(nextViewport);
    if (sourceViewport.width === targetViewport.width && sourceViewport.height === targetViewport.height && sourceViewport.safeTop === targetViewport.safeTop && sourceViewport.safeBottom === targetViewport.safeBottom) {
      setInlineStatus(
        elements.uiEditorStatusLine,
        "\uC774\uBBF8 \uD604\uC7AC \uAE30\uAE30\uAC00 \uBC30\uD3EC \uAE30\uC900 viewport\uB85C \uC800\uC7A5\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
        "success"
      );
      return;
    }
    pushVisualHistory();
    Object.values(state.visualManifest.screens).forEach((screen) => {
      Object.keys(screen.elements || {}).forEach((elementId) => {
        screen.elements[elementId] = retargetVisualRuleOffsets(
          screen.elements[elementId],
          sourceViewport,
          targetViewport
        );
      });
    });
    Object.values(state.visualManifest.studioSnapshots || {}).forEach((snapshot) => {
      if (!snapshot) {
        return;
      }
      Object.keys(snapshot.elementRules || {}).forEach((elementId) => {
        snapshot.elementRules[elementId] = retargetVisualRuleOffsets(
          snapshot.elementRules[elementId],
          sourceViewport,
          targetViewport
        );
      });
      snapshot.referenceViewport = clone(targetViewport);
    });
    state.visualManifest.referenceViewport = clone(targetViewport);
    markVisualDirty();
    setInlineStatus(
      elements.uiEditorStatusLine,
      `\uBC30\uD3EC \uAE30\uC900 viewport\uB97C ${formatViewportSummary(targetViewport)}\uB85C \uBCC0\uD658\uD588\uC2B5\uB2C8\uB2E4.`,
      "success"
    );
  }
  function pushVisualHistory() {
    if (!state.visualManifest) {
      return;
    }
    state.visualHistoryPast.push(JSON.stringify(state.visualManifest));
    if (state.visualHistoryPast.length > 80) {
      state.visualHistoryPast.shift();
    }
    state.visualHistoryFuture = [];
  }
  function applyVisualHistorySnapshot(raw) {
    state.visualManifest = ensureVisualManifest(JSON.parse(raw));
    state.visualDirty = true;
  }
  function markVisualDirty() {
    state.visualDirty = true;
    setInlineStatus(
      elements.uiEditorStatusLine,
      "\uD654\uBA74 \uCD08\uC548\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      "success"
    );
  }
  function getVisualSnapshot(screenId = state.visualSelectedScreenId) {
    if (!state.visualManifest) {
      return null;
    }
    return getStudioSnapshot(state.visualManifest, screenId);
  }
  function getVisualSnapshotAsset(screenId = state.visualSelectedScreenId) {
    const assetKey = getVisualSnapshot(screenId)?.assetKey;
    if (!assetKey) {
      return null;
    }
    return state.assets.find((asset) => asset.asset_key === assetKey) ?? null;
  }
  function getVisualLayoutCoverage(screenId = state.visualSelectedScreenId) {
    const snapshot = getVisualSnapshot(screenId);
    const items = ELEMENT_DEFS[screenId] ?? [];
    const measuredCount = items.filter(
      (item) => snapshot?.elementFrames?.[item.id]
    ).length;
    return {
      snapshot,
      totalCount: items.length,
      measuredCount,
      hasMeasuredLayout: measuredCount > 0,
      isFullLayout: items.length > 0 && measuredCount === items.length
    };
  }
  function getVisualStageBaseRects(screenId = state.visualSelectedScreenId, viewport = getVisualViewport()) {
    const items = ELEMENT_DEFS[screenId] ?? [];
    const coverage = getVisualLayoutCoverage(screenId);
    const runtimeLayout = getPreviewLayout(screenId, viewport) ?? {};
    return {
      coverage,
      source: "runtime",
      rects: runtimeLayout
    };
  }
  function getVisualStageBackgroundSource(screenId = state.visualSelectedScreenId) {
    if (state.visualDeviceSource === "phone" && state.visualFrameDataUrl) {
      return {
        kind: "phone",
        src: state.visualFrameDataUrl
      };
    }
    const snapshotAsset = getVisualSnapshotAsset(screenId);
    if (snapshotAsset?.data_url) {
      return {
        kind: "snapshot",
        src: snapshotAsset.data_url
      };
    }
    return null;
  }
  function getVisualStatusMessage() {
    const { measuredCount, totalCount, hasMeasuredLayout } = getVisualLayoutCoverage();
    const background = getVisualStageBackgroundSource();
    const layoutSuffix = hasMeasuredLayout ? ` \uC2E4\uAE30 \uD0DC\uADF8\uB294 ${measuredCount}/${totalCount}\uAC1C\uB97C \uAC10\uC9C0\uD588\uC9C0\uB9CC, \uD3B8\uC9D1 \uC88C\uD45C\uB294 \uD63C\uD569 \uC624\uCC28 \uBC29\uC9C0\uB97C \uC704\uD574 \uD56D\uC0C1 \uB7F0\uD0C0\uC784 \uACC4\uC0B0\uC2DD\uC744 \uAE30\uC900\uC73C\uB85C \uC4F0\uACE0 \uC788\uC2B5\uB2C8\uB2E4.` : " \uC800\uC7A5\uB41C \uC2E4\uCE21 \uD0DC\uADF8\uAC00 \uC5C6\uC5B4 \uD654\uBA74 \uC804\uCCB4\uB97C \uB7F0\uD0C0\uC784 \uACC4\uC0B0\uC2DD\uC73C\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.";
    const runtimeSuffix = " \uBC30\uD3EC \uC88C\uD45C\uB294 \uAE30\uC900 viewport\uC5D0 \uC800\uC7A5\uB418\uACE0, \uBBF8\uB9AC\uBCF4\uAE30 \uD655\uB300\uC640 \uC774\uB3D9\uC740 \uC800\uC7A5 \uAC12\uC5D0 \uC601\uD5A5\uC744 \uC8FC\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
    if (background?.kind === "phone") {
      return `\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uAE30\uC900\uC73C\uB85C \uD3B8\uC9D1 \uC911\uC785\uB2C8\uB2E4.${layoutSuffix}${runtimeSuffix}`;
    }
    if (background?.kind === "snapshot") {
      return `\uC800\uC7A5\uB41C \uB7F0\uD0C0\uC784 \uC2A4\uB0C5\uC0F7\uC744 \uAE30\uC900\uC73C\uB85C \uD3B8\uC9D1 \uC911\uC785\uB2C8\uB2E4.${layoutSuffix}${runtimeSuffix}`;
    }
    if (state.visualDeviceSource === "phone") {
      return `\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uC544\uC9C1 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uC138\uC694.${layoutSuffix}${runtimeSuffix}`;
    }
    return `\uC2E4\uC81C \uD3F0 \uBBF8\uC5F0\uACB0 \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uD604\uC7AC\uB294 \uAE30\uAE30 \uD06C\uAE30 \uAE30\uC900 \uBBF8\uB9AC\uBCF4\uAE30\uB85C \uD3B8\uC9D1\uD569\uB2C8\uB2E4.${layoutSuffix}${runtimeSuffix}`;
  }
  async function fetchVisualDraft() {
    const { data, error } = await state.supabase.from("ui_config_draft").select("id, config_json, updated_at").eq("id", DEFAULT_DRAFT_ID).maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  }
  async function fetchLatestVisualRelease() {
    const { data, error } = await state.supabase.from("ui_config_releases").select("version, config_json, notes, created_at").order("version", { ascending: false }).limit(1).maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  }
  async function fetchVisualReleaseHistory() {
    const { data, error } = await state.supabase.from("ui_config_releases").select("version, config_json, notes, created_at").order("version", { ascending: false }).limit(12);
    if (error) {
      throw error;
    }
    return data ?? [];
  }
  async function saveVisualDraft() {
    if (!state.visualManifest) {
      return;
    }
    const { error } = await state.supabase.from("ui_config_draft").upsert(
      {
        id: DEFAULT_DRAFT_ID,
        config_json: clone(state.visualManifest),
        updated_by: state.session.user.id
      },
      { onConflict: "id" }
    );
    if (error) {
      throw error;
    }
    state.visualDirty = false;
    setInlineStatus(
      elements.uiEditorStatusLine,
      "\uD654\uBA74 \uCD08\uC548\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.",
      "success"
    );
  }
  async function publishVisualDraft() {
    if (!state.visualManifest) {
      return;
    }
    const latest = await fetchLatestVisualRelease();
    const nextVersion = Number(latest?.version || 0) + 1;
    const nextDraft = clone(state.visualManifest);
    nextDraft.version = nextVersion;
    const payload = clone(nextDraft);
    payload.studioSnapshots = {};
    const notes = elements.visualPublishNotes.value.trim();
    const { error } = await state.supabase.from("ui_config_releases").insert({
      version: nextVersion,
      config_json: payload,
      notes: notes || null,
      created_by: state.session.user.id
    });
    if (error) {
      throw error;
    }
    state.visualManifest = nextDraft;
    state.visualPublishedVersion = nextVersion;
    state.visualPublishedManifest = ensureVisualManifest(payload);
    let draftSyncFailed = false;
    try {
      await saveVisualDraft();
    } catch (draftError) {
      draftSyncFailed = true;
      console.warn("Visual release was created, but draft sync failed.", draftError);
      state.visualDirty = true;
      setInlineStatus(
        elements.uiEditorStatusLine,
        `\uD654\uBA74 \uBC30\uD3EC\uBCF8 v${nextVersion}\uC740 \uC0DD\uC131\uB410\uC9C0\uB9CC, \uCD08\uC548 \uC800\uC7A5\uC740 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. ${getErrorMessage(draftError, "")}`,
        "error"
      );
    }
    try {
      state.visualReleaseHistory = await fetchVisualReleaseHistory();
    } catch (historyError) {
      console.warn("Visual release was created, but release history refresh failed.", historyError);
    }
    elements.visualPublishNotes.value = "";
    if (!draftSyncFailed) {
      setInlineStatus(
        elements.uiEditorStatusLine,
        `\uD654\uBA74 \uBC30\uD3EC\uBCF8 v${nextVersion}\uC744 \uBC30\uD3EC\uD588\uC2B5\uB2C8\uB2E4. \uC774\uBBF8 \uCF1C\uC9C4 \uAC8C\uC784\uC740 UI \uC0C8\uB85C\uACE0\uCE68\uC744 \uB204\uB974\uAC70\uB098, \uC571\uC744 \uB2E4\uC2DC \uC5F4\uC5B4 \uCD5C\uC2E0 \uBC30\uD3EC\uBCF8\uC744 \uBC1B\uC544\uC57C \uD569\uB2C8\uB2E4.`,
        "success"
      );
    }
  }
  async function loadVisualReleaseIntoEditor(version5) {
    const release = state.visualReleaseHistory.find(
      (item) => item.version === version5
    );
    if (!release?.config_json) {
      throw new Error(`\uD654\uBA74 \uBC30\uD3EC\uBCF8 v${version5}\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.`);
    }
    pushVisualHistory();
    state.visualManifest = ensureVisualManifest(release.config_json);
    state.visualDirty = true;
    renderAll();
  }
  async function loadVisualWorkspace() {
    const [draft, latestRelease, releaseHistory, assets] = await Promise.all([
      fetchVisualDraft(),
      fetchLatestVisualRelease(),
      fetchVisualReleaseHistory(),
      fetchAssets().catch((error) => {
        console.error(error);
        return [];
      })
    ]);
    state.assets = assets ?? [];
    state.visualReleaseHistory = releaseHistory;
    state.visualPublishedVersion = latestRelease?.version ?? null;
    state.visualPublishedManifest = latestRelease?.config_json ? ensureVisualManifest(latestRelease.config_json) : null;
    if (draft?.config_json) {
      state.visualManifest = ensureVisualManifest(draft.config_json);
    } else if (latestRelease?.config_json) {
      state.visualManifest = ensureVisualManifest(latestRelease.config_json);
    } else {
      state.visualManifest = createDefaultVisualManifest();
      await saveVisualDraft();
    }
    state.visualWorkspaceLoaded = true;
    state.visualDirty = false;
    state.visualHistoryPast = [];
    state.visualHistoryFuture = [];
    state.visualSelectedScreenId = SCREEN_LABELS[state.visualSelectedScreenId] ? state.visualSelectedScreenId : "level";
    if (!ELEMENT_DEFS[state.visualSelectedScreenId].some(
      (item) => item.id === state.visualSelectedElementId
    )) {
      state.visualSelectedElementId = ELEMENT_DEFS[state.visualSelectedScreenId][0].id;
    }
    await refreshConnectedDevices(false);
    renderAll();
  }
  async function refreshConnectedDevices(showFeedback = true) {
    if (!canUseDeviceBridge()) {
      state.visualConnectedDevices = [];
      state.visualDeviceViewport = null;
      setInlineStatus(
        elements.visualDeviceMeta,
        "\uB370\uC2A4\uD06C\uD1B1 \uAE30\uAE30 \uC5F0\uACB0 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
        "error"
      );
      renderVisualEditor();
      return;
    }
    const result = await desktopBridge.listDevices();
    if (!result?.ok) {
      throw new Error(result?.message || "\uAE30\uAE30 \uBAA9\uB85D\uC744 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
    state.visualConnectedDevices = result.devices ?? [];
    const activeDevices = state.visualConnectedDevices.filter(
      (device) => device.rawState === "device"
    );
    if (!activeDevices.length) {
      state.visualActiveDeviceSerial = "";
      state.visualDeviceViewport = null;
      state.visualFrameDataUrl = "";
      if (showFeedback) {
        setInlineStatus(
          elements.visualDeviceMeta,
          "\uC5F0\uACB0\uB41C \uC548\uB4DC\uB85C\uC774\uB4DC \uAE30\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
          "error"
        );
      }
      stopVisualFrameLoop();
      renderVisualEditor();
      return;
    }
    if (!activeDevices.some(
      (device) => device.serial === state.visualActiveDeviceSerial
    )) {
      state.visualActiveDeviceSerial = activeDevices[0].serial;
    }
    await refreshDeviceViewport(false);
    await refreshVisualLiveLayout(false);
    if (showFeedback) {
      setInlineStatus(
        elements.visualDeviceMeta,
        "\uAE30\uAE30 \uBAA9\uB85D\uC744 \uC0C8\uB85C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.",
        "success"
      );
    }
    if (state.activeView === "ui" && state.visualDeviceSource === "phone") {
      startVisualFrameLoop();
    }
    renderVisualEditor();
  }
  async function refreshDeviceViewport(showFeedback = true) {
    if (!canUseDeviceBridge() || !state.visualActiveDeviceSerial) {
      return;
    }
    const result = await desktopBridge.getDeviceViewport(
      state.visualActiveDeviceSerial
    );
    if (!result?.ok) {
      throw new Error(result?.message || "\uAE30\uAE30 \uD654\uBA74 \uC815\uBCF4\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
    state.visualDeviceViewport = result.viewport ?? null;
    if (showFeedback) {
      setInlineStatus(
        elements.visualDeviceMeta,
        "\uAE30\uAE30 \uD654\uBA74 \uC815\uBCF4\uB97C \uC5C5\uB370\uC774\uD2B8\uD588\uC2B5\uB2C8\uB2E4.",
        "success"
      );
    }
  }
  function syncSelectedVisualScreen(screenId) {
    if (!SCREEN_LABELS[screenId]) {
      return;
    }
    state.visualSelectedScreenId = screenId;
    if (!ELEMENT_DEFS[screenId]?.some(
      (item) => item.id === state.visualSelectedElementId
    )) {
      state.visualSelectedElementId = ELEMENT_DEFS[screenId]?.[0]?.id || "header";
    }
  }
  function applyMeasuredDeviceLayout(layout) {
    if (!state.visualManifest || !layout?.screens) {
      return { matchedCount: 0, syncedScreenIds: [] };
    }
    const nextManifest = clone(state.visualManifest);
    nextManifest.studioSnapshots = { ...nextManifest.studioSnapshots ?? {} };
    let matchedCount = 0;
    const syncedScreenIds = [];
    Object.entries(layout.screens).forEach(([screenId, snapshot]) => {
      if (!SCREEN_LABELS[screenId]) {
        return;
      }
      const elementFrames = snapshot?.elementFrames ?? {};
      const elementIds = Object.keys(elementFrames);
      if (!elementIds.length) {
        return;
      }
      matchedCount += elementIds.length;
      syncedScreenIds.push(screenId);
      const previousSnapshot = nextManifest.studioSnapshots[screenId] ?? {};
      const measuredElementRules = Object.fromEntries(
        elementIds.map((elementId) => [
          elementId,
          clone(getRule(nextManifest, screenId, elementId))
        ])
      );
      nextManifest.studioSnapshots[screenId] = {
        assetKey: previousSnapshot.assetKey ?? null,
        capturedAt: layout.capturedAt || (/* @__PURE__ */ new Date()).toISOString(),
        viewport: sanitizeViewport(layout.viewport),
        referenceViewport: sanitizeViewport(
          previousSnapshot.referenceViewport ?? nextManifest.referenceViewport
        ),
        elementFrames: clone(elementFrames),
        elementRules: measuredElementRules
      };
    });
    if (!matchedCount) {
      return { matchedCount: 0, syncedScreenIds: [] };
    }
    state.visualManifest = ensureVisualManifest(nextManifest);
    if (layout.detectedScreenId && syncedScreenIds.includes(layout.detectedScreenId)) {
      syncSelectedVisualScreen(layout.detectedScreenId);
    }
    return { matchedCount, syncedScreenIds };
  }
  async function refreshVisualLiveLayout(showFeedback = true) {
    if (!canUseDeviceLayoutBridge() || !state.visualActiveDeviceSerial || !state.visualManifest) {
      return { matchedCount: 0, syncedScreenIds: [] };
    }
    const result = await desktopBridge.getDeviceLayout(
      state.visualActiveDeviceSerial
    );
    if (!result?.ok) {
      if (!showFeedback) {
        return { matchedCount: 0, syncedScreenIds: [] };
      }
      throw new Error(
        result?.message || "\uC2E4\uC81C \uAE30\uAE30 UI \uB808\uC774\uC544\uC6C3\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
      );
    }
    const layout = result.layout ?? null;
    const applied = applyMeasuredDeviceLayout(layout);
    if (showFeedback) {
      if (applied.matchedCount > 0) {
        const screenLabel = layout?.detectedScreenId ? SCREEN_LABELS[layout.detectedScreenId] : "";
        const screenSuffix = screenLabel ? ` (${screenLabel})` : "";
        setInlineStatus(
          elements.visualDeviceMeta,
          `\uC2E4\uC81C \uAE30\uAE30 \uB808\uC774\uC544\uC6C3 ${applied.matchedCount}\uAC1C\uB97C \uB3D9\uAE30\uD654\uD588\uC2B5\uB2C8\uB2E4.${screenSuffix}`,
          "success"
        );
      } else {
        setInlineStatus(
          elements.visualDeviceMeta,
          "\uD604\uC7AC \uD654\uBA74\uC5D0\uC11C \uD3B8\uC9D1\uC6A9 UI \uC88C\uD45C \uD0DC\uADF8\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC2E4\uC81C \uD50C\uB808\uC774 \uD654\uBA74\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694."
        );
      }
    }
    return applied;
  }
  async function refreshVisualFrame(showFeedback = true) {
    if (!canUseDeviceBridge() || !state.visualActiveDeviceSerial) {
      throw new Error("\uC5F0\uACB0\uB41C \uC548\uB4DC\uB85C\uC774\uB4DC \uAE30\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    if (state.visualFrameBusy) {
      return;
    }
    state.visualFrameBusy = true;
    try {
      const result = await desktopBridge.getDeviceFrame(
        state.visualActiveDeviceSerial
      );
      if (!result?.ok) {
        throw new Error(result?.message || "\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }
      state.visualFrameDataUrl = result.frame?.dataUrl || "";
      if (showFeedback) {
        setInlineStatus(
          elements.visualStageStatus,
          "\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uC0C8\uB85C \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4.",
          "success"
        );
      }
      renderVisualEditor();
    } finally {
      state.visualFrameBusy = false;
    }
  }
  function stopVisualFrameLoop() {
    if (state.visualFrameTimer) {
      clearTimeout(state.visualFrameTimer);
      state.visualFrameTimer = null;
    }
  }
  function startVisualFrameLoop() {
    stopVisualFrameLoop();
    if (state.activeView !== "ui" || state.visualDeviceSource !== "phone" || !state.visualActiveDeviceSerial || !canUseDeviceBridge()) {
      return;
    }
    const loop = async () => {
      try {
        await refreshVisualFrame(false);
      } catch (error) {
        setInlineStatus(
          elements.visualStageStatus,
          getErrorMessage(error, "\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."),
          "error"
        );
        stopVisualFrameLoop();
        return;
      }
      state.visualFrameTimer = setTimeout(loop, 450);
    };
    void loop();
  }
  function renderVisualDeviceOptions() {
    elements.visualDeviceProfile.innerHTML = DEVICE_PROFILES.map(
      (profile) => `<option value="${profile.id}" ${profile.id === state.visualDeviceProfileId ? "selected" : ""}>${profile.label}</option>`
    ).join("");
    const deviceOptions = ['<option value="">\uC5F0\uACB0\uB41C \uAE30\uAE30 \uC5C6\uC74C</option>'];
    state.visualConnectedDevices.forEach((device) => {
      const label = `${device.model || device.product || device.serial} \xB7 ${device.stateLabel}`;
      deviceOptions.push(
        `<option value="${device.serial}" ${device.serial === state.visualActiveDeviceSerial ? "selected" : ""}>${label}</option>`
      );
    });
    elements.visualDeviceSelect.innerHTML = deviceOptions.join("");
    elements.visualDeviceSource.value = state.visualDeviceSource;
    elements.visualDeviceSelect.disabled = state.visualDeviceSource !== "phone";
    elements.visualDeviceProfile.disabled = state.visualDeviceSource !== "preset";
    [
      elements.visualViewportWidth,
      elements.visualViewportHeight,
      elements.visualSafeTop,
      elements.visualSafeBottom
    ].filter(Boolean).forEach((input) => {
      input.disabled = state.visualDeviceSource !== "custom";
    });
  }
  function renderVisualInspector() {
    const rule = getVisualSelectedRule();
    elements.visualCurrentScreen.textContent = SCREEN_LABELS[state.visualSelectedScreenId];
    elements.visualCurrentElement.textContent = formatElementLabel(
      state.visualSelectedScreenId,
      state.visualSelectedElementId
    );
    elements.visualInspectorTitle.textContent = formatElementLabel(
      state.visualSelectedScreenId,
      state.visualSelectedElementId
    );
    elements.visualInspectorHelp.textContent = ELEMENT_HELP[state.visualSelectedScreenId]?.[state.visualSelectedElementId] || "\uC88C\uC6B0 \uD328\uB110\uACFC \uB4DC\uB798\uADF8\uB97C \uD568\uAED8 \uC0AC\uC6A9\uD574 1\uD53D\uC140 \uB2E8\uC704\uB85C \uB9DE\uCD94\uC138\uC694.";
    elements.visualOffsetX.value = String(rule.offsetX);
    elements.visualOffsetY.value = String(rule.offsetY);
    elements.visualScale.value = String(rule.scale);
    elements.visualWidthScale.value = String(rule.widthScale ?? 1);
    elements.visualHeightScale.value = String(rule.heightScale ?? 1);
    elements.visualOpacity.value = String(rule.opacity);
    elements.visualZIndex.value = String(rule.zIndex);
    elements.visualVisible.value = rule.visible ? "true" : "false";
    elements.visualSafeAware.checked = rule.safeAreaAware;
    syncVisualViewportInputs();
    syncVisualDragTuningInputs();
    syncVisualAudioInputs();
  }
  function getVisualDragTuning() {
    if (!state.visualManifest) {
      return clone(DEFAULT_GAMEPLAY_DRAG_TUNING);
    }
    state.visualManifest.gameplay = sanitizeGameplayVisualConfig(
      state.visualManifest.gameplay
    );
    return state.visualManifest.gameplay.dragTuning;
  }
  function syncVisualDragTuningInputs() {
    const tuning = getVisualDragTuning();
    elements.visualDragLiftOffset.value = String(tuning.liftOffsetCells);
    elements.visualDragCenterOffsetX.value = String(tuning.centerOffsetXCells);
    elements.visualDragCenterOffsetY.value = String(tuning.centerOffsetYCells);
    elements.visualDragDistanceScaleX.value = String(tuning.dragDistanceScaleX);
    elements.visualDragDistanceScaleY.value = String(tuning.dragDistanceScaleY);
    elements.visualDragSnapDistance.value = String(tuning.snapMaxDistanceCells);
    elements.visualDragStickyThreshold.value = String(
      tuning.stickyThresholdCells
    );
    elements.visualDragSearchRadius.value = String(tuning.snapSearchRadius);
  }
  function isAudioAsset(asset) {
    const mime = String(asset?.mime_type || "").toLowerCase();
    const dataUrl = String(asset?.data_url || "").toLowerCase();
    return mime.startsWith("audio/") || dataUrl.startsWith("data:audio/");
  }
  function getAudioAssetOptions(selectedKey) {
    const audioAssets = state.assets.filter(isAudioAsset).sort((a, b) => a.asset_key.localeCompare(b.asset_key));
    return [
      `<option value="" ${selectedKey ? "" : "selected"}>사용 안 함 / 기본값</option>`,
      ...audioAssets.map((asset) => `<option value="${asset.asset_key}" ${asset.asset_key === selectedKey ? "selected" : ""}>${asset.asset_key}</option>`)
    ].join("");
  }
  function getAudioAssetDataUrl(assetKey) {
    if (!assetKey) {
      return "";
    }
    return state.assets.find((asset) => asset.asset_key === assetKey)?.data_url || "";
  }
  function formatAudioVolumeValue(value) {
    return numberOr(value, 0).toFixed(2);
  }
  function normalizeSfxPlaybackVolume(value) {
    return clamp(numberOr(value, 0) / 3, 0, 1);
  }
  function syncAudioVolumeControl(input, slider, readout, value) {
    const normalized = clamp(numberOr(value, 0), 0, 3);
    if (input) input.value = String(normalized);
    if (slider) slider.value = String(normalized);
    if (readout) readout.textContent = formatAudioVolumeValue(normalized);
  }
  function copyAudioVolumeValue(source, target, readout) {
    const normalized = clamp(numberOr(source?.value, 0), 0, 3);
    if (target) target.value = String(normalized);
    if (readout) readout.textContent = formatAudioVolumeValue(normalized);
  }
  function collectAudioUsageFromManifest(manifest, bucket, usageMap) {
    if (!manifest?.gameplay) {
      return;
    }
    const audio = sanitizeGameplayVisualConfig(manifest.gameplay).audio;
    GAMEPLAY_SFX_EVENT_IDS.forEach((id) => {
      const assetKey = audio.sfx[id]?.assetKey;
      if (!assetKey) {
        return;
      }
      const current = usageMap.get(assetKey) || { draft: [], published: [] };
      current[bucket].push(`효과음 ${GAMEPLAY_SFX_LABELS[id]}`);
      usageMap.set(assetKey, current);
    });
    GAMEPLAY_BGM_TRACK_IDS.forEach((id) => {
      const assetKey = audio.bgm[id]?.assetKey;
      if (!assetKey) {
        return;
      }
      const current = usageMap.get(assetKey) || { draft: [], published: [] };
      current[bucket].push(`배경음 ${GAMEPLAY_BGM_LABELS[id]}`);
      usageMap.set(assetKey, current);
    });
  }
  function getAudioAssetUsageMap() {
    const usageMap = /* @__PURE__ */ new Map();
    collectAudioUsageFromManifest(state.visualManifest, "draft", usageMap);
    collectAudioUsageFromManifest(state.visualPublishedManifest, "published", usageMap);
    return usageMap;
  }
  function renderAudioAssetLibrary() {
    if (!elements.audioAssetLibrary) {
      return;
    }
    const usageMap = getAudioAssetUsageMap();
    const audioAssets = state.assets.filter(isAudioAsset).sort((a, b) => a.asset_key.localeCompare(b.asset_key));
    if (!audioAssets.length) {
      elements.audioAssetLibrary.innerHTML = `<div class="asset-card"><strong>등록된 오디오가 없습니다.</strong><p>효과음이나 배경음을 올리면 여기서 사용 상태와 삭제 가능 여부를 확인할 수 있습니다.</p></div>`;
      return;
    }
    elements.audioAssetLibrary.innerHTML = audioAssets.map((asset) => {
      const usage = usageMap.get(asset.asset_key) || { draft: [], published: [] };
      const inUse = usage.draft.length > 0 || usage.published.length > 0;
      const usageLines = [
        usage.draft.length ? `<div class="asset-usage-item"><strong>초안</strong> ${usage.draft.join(", ")}</div>` : "",
        usage.published.length ? `<div class="asset-usage-item"><strong>배포</strong> ${usage.published.join(", ")}</div>` : "",
        !inUse ? `<div class="asset-usage-item">어느 효과음/BGM에도 연결되지 않았습니다.</div>` : ""
      ].filter(Boolean).join("");
      return `
        <div class="asset-card">
          <div class="asset-card-header">
            <strong class="mono">${asset.asset_key}</strong>
            <span class="asset-status-badge ${inUse ? "in-use" : "unused"}">${inUse ? "사용 중" : "미사용"}</span>
          </div>
          <audio controls src="${asset.data_url}" class="asset-audio-preview"></audio>
          <div class="asset-usage-list">${usageLines}</div>
          <div class="asset-meta"><span>${asset.mime_type || "audio/*"}</span><span>${asset.content_hash || "-"}</span></div>
          <div class="asset-actions">
            <small class="inline-note">${inUse ? "초안 또는 최신 배포본에서 사용 중이라 삭제를 막습니다." : "현재 초안과 최신 배포본 어디에도 연결되지 않아 삭제할 수 있습니다."}</small>
            <button class="ghost small asset-delete-button" data-asset-key="${asset.asset_key}" ${inUse ? "disabled" : ""}>삭제</button>
          </div>
        </div>`;
    }).join("");
  }
  function getVisualAudioConfig() {
    if (!state.visualManifest) {
      return clone(DEFAULT_GAMEPLAY_AUDIO_CONFIG);
    }
    state.visualManifest.gameplay = sanitizeGameplayVisualConfig(
      state.visualManifest.gameplay
    );
    return state.visualManifest.gameplay.audio;
  }
  function stopAudioPreview() {
    if (state.visualPreviewAudio) {
      state.visualPreviewAudio.pause();
      state.visualPreviewAudio.currentTime = 0;
      state.visualPreviewAudio = null;
    }
  }
  function playAudioPreview(dataUrl, volume = 1, loop = false) {
    if (!dataUrl) {
      showToast("\uBBF8\uB9AC\uB4E3\uAE30\uD560 \uC624\uB514\uC624 \uC790\uC0B0\uC744 \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.");
      return;
    }
    stopAudioPreview();
    const audio = new Audio(dataUrl);
    audio.volume = clamp(numberOr(volume, 1), 0, 1);
    audio.loop = loop === true;
    state.visualPreviewAudio = audio;
    audio.play().catch((error) => {
      console.warn("Audio preview failed.", error);
      showToast("\uC624\uB514\uC624 \uBBF8\uB9AC\uB4E3\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    });
  }
  function syncVisualAudioInputs() {
    const audio = getVisualAudioConfig();
    state.visualSelectedSfxEventId = GAMEPLAY_SFX_EVENT_IDS.includes(state.visualSelectedSfxEventId) ? state.visualSelectedSfxEventId : "blockPlace";
    state.visualSelectedBgmTrackId = GAMEPLAY_BGM_TRACK_IDS.includes(state.visualSelectedBgmTrackId) ? state.visualSelectedBgmTrackId : "level";
    const sfxRule = audio.sfx[state.visualSelectedSfxEventId];
    const bgmRule = audio.bgm[state.visualSelectedBgmTrackId];
    syncAudioVolumeControl(
      elements.visualAudioMasterVolume,
      elements.visualAudioMasterVolumeSlider,
      elements.visualAudioMasterVolumeReadout,
      audio.masterVolume
    );
    syncAudioVolumeControl(
      elements.visualAudioSfxVolume,
      elements.visualAudioSfxVolumeSlider,
      elements.visualAudioSfxVolumeReadout,
      audio.sfxVolume
    );
    syncAudioVolumeControl(
      elements.visualAudioBgmVolume,
      elements.visualAudioBgmVolumeSlider,
      elements.visualAudioBgmVolumeReadout,
      audio.bgmVolume
    );
    elements.visualAudioMuted.value = String(audio.muted);
    elements.visualAudioSfxEvent.innerHTML = GAMEPLAY_SFX_EVENT_IDS.map((id) => `<option value="${id}" ${id === state.visualSelectedSfxEventId ? "selected" : ""}>${GAMEPLAY_SFX_LABELS[id]}</option>`).join("");
    elements.visualAudioSfxAsset.innerHTML = getAudioAssetOptions(sfxRule.assetKey);
    syncAudioVolumeControl(
      elements.visualAudioSfxRuleVolume,
      elements.visualAudioSfxRuleVolumeSlider,
      elements.visualAudioSfxRuleVolumeReadout,
      sfxRule.volume
    );
    elements.visualAudioSfxCooldown.value = String(sfxRule.cooldownMs);
    elements.visualAudioSfxOverlap.value = String(sfxRule.allowOverlap);
    elements.visualAudioSfxEnabled.value = String(sfxRule.enabled);
    elements.visualAudioBgmTrack.innerHTML = GAMEPLAY_BGM_TRACK_IDS.map((id) => `<option value="${id}" ${id === state.visualSelectedBgmTrackId ? "selected" : ""}>${GAMEPLAY_BGM_LABELS[id]}</option>`).join("");
    elements.visualAudioBgmAsset.innerHTML = getAudioAssetOptions(bgmRule.assetKey);
    syncAudioVolumeControl(
      elements.visualAudioBgmRuleVolume,
      elements.visualAudioBgmRuleVolumeSlider,
      elements.visualAudioBgmRuleVolumeReadout,
      bgmRule.volume
    );
    elements.visualAudioBgmLoop.value = String(bgmRule.loop);
    elements.visualAudioBgmFadeIn.value = String(bgmRule.fadeInMs);
    elements.visualAudioBgmFadeOut.value = String(bgmRule.fadeOutMs);
    elements.visualAudioBgmEnabled.value = String(bgmRule.enabled);
  }
  function updateVisualAudioFromInputs() {
    if (!state.visualManifest) {
      return;
    }
    const current = getVisualAudioConfig();
    const sfxEventId = state.visualSelectedSfxEventId;
    const bgmTrackId = state.visualSelectedBgmTrackId;
    state.visualManifest.gameplay = sanitizeGameplayVisualConfig({
      ...state.visualManifest.gameplay,
      audio: {
        ...current,
        masterVolume: elements.visualAudioMasterVolume.value,
        sfxVolume: elements.visualAudioSfxVolume.value,
        bgmVolume: elements.visualAudioBgmVolume.value,
        muted: elements.visualAudioMuted.value === "true",
        sfx: {
          ...current.sfx,
          [sfxEventId]: {
            assetKey: elements.visualAudioSfxAsset.value || null,
            volume: elements.visualAudioSfxRuleVolume.value,
            cooldownMs: elements.visualAudioSfxCooldown.value,
            allowOverlap: elements.visualAudioSfxOverlap.value === "true",
            enabled: elements.visualAudioSfxEnabled.value === "true"
          }
        },
        bgm: {
          ...current.bgm,
          [bgmTrackId]: {
            assetKey: elements.visualAudioBgmAsset.value || null,
            volume: elements.visualAudioBgmRuleVolume.value,
            loop: elements.visualAudioBgmLoop.value === "true",
            fadeInMs: elements.visualAudioBgmFadeIn.value,
            fadeOutMs: elements.visualAudioBgmFadeOut.value,
            enabled: elements.visualAudioBgmEnabled.value === "true"
          }
        }
      }
    });
    syncVisualAudioInputs();
  }
  function commitVisualAudioChange() {
    if (!state.visualManifest) {
      return;
    }
    pushVisualHistory();
    updateVisualAudioFromInputs();
    markVisualDirty();
    renderAll();
  }
  function updateVisualDragTuningFromInputs() {
    if (!state.visualManifest) {
      return;
    }
    const current = sanitizeGameplayVisualConfig(state.visualManifest.gameplay);
    state.visualManifest.gameplay = sanitizeGameplayVisualConfig({
      ...current,
      dragTuning: {
        liftOffsetCells: elements.visualDragLiftOffset.value,
        centerOffsetXCells: elements.visualDragCenterOffsetX.value,
        centerOffsetYCells: elements.visualDragCenterOffsetY.value,
        dragDistanceScaleX: elements.visualDragDistanceScaleX.value,
        dragDistanceScaleY: elements.visualDragDistanceScaleY.value,
        snapMaxDistanceCells: elements.visualDragSnapDistance.value,
        stickyThresholdCells: elements.visualDragStickyThreshold.value,
        snapSearchRadius: elements.visualDragSearchRadius.value
      }
    });
    syncVisualDragTuningInputs();
  }
  function commitVisualDragTuningChange() {
    if (!state.visualManifest) {
      return;
    }
    pushVisualHistory();
    updateVisualDragTuningFromInputs();
    markVisualDirty();
    renderAll();
  }
  function applyVisualDragPreset(preset) {
    if (!state.visualManifest) {
      return;
    }
    pushVisualHistory();
    const current = sanitizeGameplayVisualConfig(state.visualManifest.gameplay);
    state.visualManifest.gameplay = sanitizeGameplayVisualConfig({
      ...current,
      dragTuning: preset
    });
    markVisualDirty();
    renderAll();
  }
  function getVisualDisplayScale(viewport) {
    const hostMetrics = getVisualStageHostMetrics();
    const hostWidth = Math.max(220, hostMetrics.width - 72);
    const hostHeight = Math.max(420, hostMetrics.height - 72);
    state.visualFitScale = Math.min(
      hostWidth / viewport.width,
      hostHeight / viewport.height
    );
    const baseScale = state.visualZoomMode === "actual" ? 1 : state.visualFitScale;
    state.visualDisplayScale = clamp(baseScale * state.visualZoomValue, 0.25, 3);
    return state.visualDisplayScale;
  }
  function renderVisualStage() {
    if (!state.visualManifest) {
      return;
    }
    const viewport = getVisualViewport();
    const displayScale = getVisualDisplayScale(viewport);
    const referenceViewport = state.visualManifest.referenceViewport || viewport;
    const stageBaseLayout = getVisualStageBaseRects(
      state.visualSelectedScreenId,
      viewport
    );
    const stageBackground = getVisualStageBackgroundSource();
    const frameWidth = Math.round(viewport.width * displayScale);
    const frameHeight = Math.round(viewport.height * displayScale);
    const hostMetrics = getVisualStageHostMetrics();
    const maxPanX = Math.max(0, Math.abs(hostMetrics.width - frameWidth) / 2);
    const maxPanY = Math.max(0, Math.abs(hostMetrics.height - frameHeight) / 2);
    const panX = Math.round(maxPanX * (state.visualStageOffsetX / 100));
    const panY = Math.round(maxPanY * (state.visualStageOffsetY / 100));
    elements.visualPhoneFrame.style.width = `${frameWidth}px`;
    elements.visualPhoneFrame.style.height = `${frameHeight}px`;
    elements.visualPhoneFrame.style.transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px)`;
    elements.visualSafeTopOverlay.style.height = `${Math.round(
      viewport.safeTop * displayScale
    )}px`;
    elements.visualSafeBottomOverlay.style.height = `${Math.round(
      viewport.safeBottom * displayScale
    )}px`;
    elements.visualGridOverlay.style.display = state.visualShowGrid ? "block" : "none";
    elements.visualGridOverlay.style.backgroundImage = state.visualShowGrid ? "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)" : "none";
    elements.visualGridOverlay.style.backgroundSize = `${state.visualGridSize * displayScale}px ${state.visualGridSize * displayScale}px`;
    if (stageBackground?.src) {
      elements.visualLiveImage.src = stageBackground.src;
      elements.visualLiveImage.classList.remove("hidden");
      elements.visualFrameFallback.classList.add("hidden");
    } else {
      elements.visualLiveImage.removeAttribute("src");
      elements.visualLiveImage.classList.add("hidden");
      elements.visualFrameFallback.classList.remove("hidden");
      elements.visualFrameFallback.textContent = getVisualStatusMessage();
    }
    elements.visualOverlay.innerHTML = "";
    ELEMENT_DEFS[state.visualSelectedScreenId].forEach(({ id, label }) => {
      const rule = getRule(
        state.visualManifest,
        state.visualSelectedScreenId,
        id
      );
      if (!rule.visible) {
        return;
      }
      let baseRect = stageBaseLayout.rects?.[id];
      if (id === "skill_effect") {
        const boardRect = stageBaseLayout.rects?.board;
        if (boardRect) {
          baseRect = applyRuleToRect(
            boardRect,
            getRule(
              state.visualManifest,
              state.visualSelectedScreenId,
              "board"
            ),
            viewport,
            referenceViewport
          );
        }
      }
      if (!baseRect) {
        return;
      }
      const finalRect = applyRuleToRect(
        baseRect,
        rule,
        viewport,
        referenceViewport
      );
      const box = document.createElement("div");
      box.className = `visual-box${state.visualSelectedElementId === id ? " active" : ""}${state.visualDrag?.elementId === id ? " dragging" : ""}`;
      box.dataset.elementId = id;
      box.style.left = `${Math.round(finalRect.left * displayScale)}px`;
      box.style.top = `${Math.round(finalRect.top * displayScale)}px`;
      box.style.width = `${Math.round(finalRect.width * displayScale)}px`;
      box.style.height = `${Math.round(finalRect.height * displayScale)}px`;
      box.style.opacity = String(rule.opacity);
      box.style.zIndex = String(20 + rule.zIndex);
      const header = document.createElement("div");
      header.className = "visual-box-header";
      header.innerHTML = `<span>${label}</span><span>${rule.offsetX}, ${rule.offsetY}</span>`;
      box.appendChild(header);
      box.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }
        state.visualSelectedElementId = id;
        const currentRule = getVisualSelectedRule();
        pushVisualHistory();
        state.visualDrag = {
          elementId: id,
          startClientX: event.clientX,
          startClientY: event.clientY,
          originalOffsetX: currentRule.offsetX,
          originalOffsetY: currentRule.offsetY
        };
        document.body.classList.add("dragging-visual");
        box.setPointerCapture(event.pointerId);
        renderVisualEditor();
      });
      elements.visualOverlay.appendChild(box);
    });
    setInlineStatus(
      elements.visualStageStatus,
      getVisualStatusMessage(),
      stageBackground?.kind === "phone" || stageBaseLayout.source === "measured" ? "success" : "muted"
    );
  }
  function renderVisualReleaseHistory(host = elements.visualReleaseHistory) {
    if (!host) {
      return;
    }
    if (!state.visualReleaseHistory.length) {
      host.innerHTML = '<div class="release-card"><strong>\uD654\uBA74 \uBC30\uD3EC \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong><p>\uC544\uC9C1 \uD654\uBA74 \uBC30\uD3EC\uB97C \uD55C \uC801\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p></div>';
      return;
    }
    host.innerHTML = state.visualReleaseHistory.map(
      (release) => `
        <div class="release-card">
          <strong>\uD654\uBA74 v${release.version}</strong>
          <p>${release.notes || "\uBA54\uBAA8 \uC5C6\uC74C"}</p>
          <div class="release-meta">
            <span>${new Date(release.created_at).toLocaleString("ko-KR")}</span>
            <button class="ghost small visual-release-load" data-version="${release.version}">\uC774 \uBC84\uC804 \uC5F4\uAE30</button>
          </div>
        </div>`
    ).join("");
    host.querySelectorAll(".visual-release-load").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await loadVisualReleaseIntoEditor(Number(button.dataset.version));
        } catch (error) {
          showToast(getErrorMessage(error, "\uD654\uBA74 \uBC30\uD3EC\uBCF8\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
        }
      });
    });
  }
  function renderHistoryViews() {
    renderVisualReleaseHistory(elements.visualHistoryViewList);
    if (!state.adminWorkspaceLoaded) {
      elements.adminHistoryViewList.innerHTML = '<div class="release-card"><strong>\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uB300\uAE30 \uC911</strong><p>\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uD0ED\uC744 \uC5F4\uBA74 \uBC30\uD3EC \uC774\uB825\uC744 \uD568\uAED8 \uBD88\uB7EC\uC635\uB2C8\uB2E4.</p></div>';
    } else if (!state.releaseHistory.length) {
      elements.adminHistoryViewList.innerHTML = '<div class="release-card"><strong>\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</strong><p>\uC544\uC9C1 \uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC\uB97C \uD55C \uC801\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p></div>';
    } else {
      elements.adminHistoryViewList.innerHTML = state.releaseHistory.map(
        (release) => `
          <div class="release-card">
            <strong>\uAD00\uB9AC\uC790 v${release.version}</strong>
            <p>${release.notes || "\uBA54\uBAA8 \uC5C6\uC74C"}</p>
            <div class="release-meta"><span>${new Date(
          release.created_at
        ).toLocaleString("ko-KR")}</span></div>
          </div>`
      ).join("");
    }
  }
  function renderSettingsView() {
    if (!elements.settingsDeviceList) {
      return;
    }
    if (!state.visualConnectedDevices.length) {
      elements.settingsDeviceList.innerHTML = '<div class="device-card"><strong>\uC5F0\uACB0\uB41C \uAE30\uAE30 \uC5C6\uC74C</strong><p>USB \uB514\uBC84\uAE45\uC774 \uCF1C\uC9C4 \uC548\uB4DC\uB85C\uC774\uB4DC \uD3F0\uC744 \uC5F0\uACB0\uD558\uC138\uC694.</p></div>';
    } else {
      elements.settingsDeviceList.innerHTML = state.visualConnectedDevices.map((device) => {
        const active = device.serial === state.visualActiveDeviceSerial ? "\uD604\uC7AC \uC0AC\uC6A9 \uC911" : device.stateLabel;
        return `
          <div class="device-card">
            <strong>${device.model || device.product || "\uAE30\uAE30 \uC774\uB984 \uC5C6\uC74C"}</strong>
            <p>${device.serial}</p>
            <small class="inline-note">${active}</small>
          </div>`;
      }).join("");
    }
    if (state.visualDeviceViewport) {
      elements.settingsDeviceMeta.textContent = `${state.visualDeviceViewport.model || "\uC5F0\uACB0 \uAE30\uAE30"} \xB7 ${state.visualDeviceViewport.widthDp} x ${state.visualDeviceViewport.heightDp} \xB7 \uC548\uC804\uC601\uC5ED ${state.visualDeviceViewport.safeTopDp} / ${state.visualDeviceViewport.safeBottomDp}`;
      elements.settingsDeviceMeta.className = "inline-note success";
    } else {
      elements.settingsDeviceMeta.textContent = "\uAE30\uAE30 \uD654\uBA74 \uC815\uBCF4\uB97C \uC544\uC9C1 \uC77D\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
      elements.settingsDeviceMeta.className = "inline-note";
    }
  }
  function renderVisualEditor() {
    elements.visualScreenId.value = state.visualSelectedScreenId;
    elements.visualShowGrid.checked = state.visualShowGrid;
    elements.visualSnapGrid.checked = state.visualSnapGrid;
    elements.visualGridSize.value = String(state.visualGridSize);
    syncVisualPreviewControls();
    renderVisualDeviceOptions();
    renderVisualInspector();
    renderVisualStage();
    renderVisualReleaseHistory();
    renderAudioAssetLibrary();
    elements.visualDraftVersion.textContent = state.visualManifest ? `v${state.visualManifest.version || 0}` : "-";
    elements.visualPublishedVersion.textContent = state.visualPublishedVersion ? `v${state.visualPublishedVersion}` : "-";
    elements.visualUndoButton.disabled = state.visualHistoryPast.length === 0;
    elements.visualRedoButton.disabled = state.visualHistoryFuture.length === 0;
  }
  function updateVisualRuleFromInputs() {
    const rule = getVisualSelectedRule();
    const next = sanitizeRule({
      offsetX: elements.visualOffsetX.value,
      offsetY: elements.visualOffsetY.value,
      scale: elements.visualScale.value,
      widthScale: elements.visualWidthScale.value,
      heightScale: elements.visualHeightScale.value,
      opacity: elements.visualOpacity.value,
      zIndex: elements.visualZIndex.value,
      visible: elements.visualVisible.value === "true",
      safeAreaAware: elements.visualSafeAware.checked
    });
    Object.assign(rule, next);
  }
  function nudgeVisual(dx, dy) {
    pushVisualHistory();
    const rule = getVisualSelectedRule();
    rule.offsetX += dx;
    rule.offsetY += dy;
    markVisualDirty();
    renderVisualEditor();
  }
  function bindVisualPointerEvents() {
    window.addEventListener("pointermove", (event) => {
      if (!state.visualDrag || !state.visualManifest) {
        return;
      }
      const viewport = getVisualViewport();
      const displayScale = Math.max(state.visualDisplayScale, 0.01);
      const delta = convertViewportDeltaToReference(
        (event.clientX - state.visualDrag.startClientX) / displayScale,
        (event.clientY - state.visualDrag.startClientY) / displayScale,
        viewport,
        state.visualManifest.referenceViewport || viewport,
        getVisualSelectedRule().safeAreaAware
      );
      const rule = getVisualSelectedRule();
      let nextX = Math.round(state.visualDrag.originalOffsetX + delta.x);
      let nextY = Math.round(state.visualDrag.originalOffsetY + delta.y);
      if (state.visualSnapGrid) {
        nextX = Math.round(nextX / state.visualGridSize) * state.visualGridSize;
        nextY = Math.round(nextY / state.visualGridSize) * state.visualGridSize;
      }
      rule.offsetX = nextX;
      rule.offsetY = nextY;
      markVisualDirty();
      renderVisualEditor();
    });
    window.addEventListener("pointerup", () => {
      if (!state.visualDrag) {
        return;
      }
      state.visualDrag = null;
      document.body.classList.remove("dragging-visual");
      renderVisualEditor();
    });
  }
  async function setActiveView(view) {
    if (view === "admin" && !isAdminAuthenticated()) {
      showToast("\uAD00\uB9AC\uC790 \uB370\uC774\uD130\uB294 \uB85C\uADF8\uC778 \uD6C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
      state.activeView = "ui";
      renderAll();
      return;
    }
    state.activeView = view;
    if (view === "admin" && !state.adminWorkspaceLoaded) {
      await loadWorkspace();
    }
    if (view === "ui" && state.visualDeviceSource === "phone") {
      startVisualFrameLoop();
    } else {
      stopVisualFrameLoop();
    }
    renderAll();
  }
  async function ensureClient() {
    const url = elements.supabaseUrl.value.trim() || DEFAULT_SUPABASE_URL;
    const key = elements.supabaseAnonKey.value.trim() || DEFAULT_SUPABASE_ANON_KEY;
    if (state.supabase && state.supabaseUrl === url && state.supabaseKey === key) {
      return state.supabase;
    }
    state.supabase = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    state.supabaseUrl = url;
    state.supabaseKey = key;
    return state.supabase;
  }
  async function fetchProfile(userId) {
    const { data, error } = await state.supabase.from("profiles").select("id, nickname, is_admin").eq("id", userId).maybeSingle();
    if (error) throw error;
    return { email: state.session?.user?.email, ...data };
  }
  async function loadDefaultManifest() {
    return deepClone2(default_creator_manifest_default);
  }
  async function fetchDraft() {
    const { data, error } = await state.supabase.from("creator_draft").select("id, manifest_json, updated_at").eq("id", DEFAULT_DRAFT_ID).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function fetchLatestRelease() {
    const { data, error } = await state.supabase.from("creator_releases").select("version, manifest_json, notes, created_at").order("version", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function fetchReleaseHistory() {
    const { data, error } = await state.supabase.from("creator_releases").select("version, notes, created_at").order("version", { ascending: false }).limit(12);
    if (error) throw error;
    return data ?? [];
  }
  async function fetchAssets() {
    const { data, error } = await state.supabase.from("ui_assets").select("asset_key, data_url, mime_type, content_hash").order("asset_key", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async function saveDraft() {
    const { error } = await state.supabase.from("creator_draft").upsert(
      {
        id: DEFAULT_DRAFT_ID,
        manifest_json: deepClone2(state.manifest),
        updated_by: state.session.user.id
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
  async function publishDraft() {
    const latest = await fetchLatestRelease();
    const nextVersion = Number(latest?.version || 0) + 1;
    const payload = deepClone2(state.manifest);
    payload.version = nextVersion;
    payload.meta = {
      ...payload.meta || {},
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      seededFromCode: false,
      notes: elements.publishNotes.value.trim() || ""
    };
    const { error } = await state.supabase.from("creator_releases").insert({
      version: nextVersion,
      manifest_json: payload,
      notes: elements.publishNotes.value.trim() || null,
      created_by: state.session.user.id
    });
    if (error) throw error;
    state.manifest = payload;
    try {
      await saveDraft();
    } catch (draftError) {
      console.warn("Admin release was created, but draft sync failed.", draftError);
      setGlobalStatus(
        `\uAD00\uB9AC\uC790 \uB370\uC774\uD130 v${nextVersion}\uC740 \uBC30\uD3EC\uB410\uC9C0\uB9CC, \uCD08\uC548 \uC800\uC7A5\uC740 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. ${getErrorMessage(draftError, "")}`,
        "error"
      );
    }
    elements.publishNotes.value = "";
  }
  async function rollbackRelease(version5) {
    const { data, error } = await state.supabase.from("creator_releases").select("version, manifest_json").eq("version", version5).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`v${version5} \uB9B4\uB9AC\uC988\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.`);
    state.manifest = deepClone2(data.manifest_json);
    await saveDraft();
    elements.publishNotes.value = `v${version5} \uAE30\uC900 \uB864\uBC31`;
    await publishDraft();
    await loadWorkspace();
  }
  function createLevelEntry() {
    const nextLevelId = Math.max(
      0,
      ...Object.values(state.manifest.levels).map((level) => level.levelId)
    ) + 1;
    const id = `level_${nextLevelId}`;
    state.manifest.levels[id] = {
      id,
      levelId: nextLevelId,
      worldId: Math.max(1, Math.ceil(nextLevelId / 30)),
      stageNumberInWorld: (nextLevelId - 1) % 30 + 1,
      name: `\uC0C8 \uB808\uBCA8 ${nextLevelId}`,
      goalType: "defeat_enemy",
      goalValue: 1e3,
      enemyTemplateId: Object.keys(state.manifest.encounters)[0],
      enemyOverrides: {},
      reward: { repeatGold: 100, firstClearBonusGold: 200, characterExp: 300 },
      enabled: true,
      background: {
        assetKey: null,
        tintColor: "#000000",
        tintOpacity: 0,
        removeImage: false
      }
    };
    state.selected = { kind: "level", id };
  }
  function createRaidEntry(kind) {
    const scope = kind === "raidNormal" ? state.manifest.raids.normal : state.manifest.raids.boss;
    const nextStage = Math.max(0, ...Object.values(scope).map((raid) => raid.stage)) + 1;
    const id = `${kind === "raidNormal" ? "normal" : "boss"}_${nextStage}`;
    scope[id] = {
      id,
      raidType: kind === "raidNormal" ? "normal" : "boss",
      stage: nextStage,
      worldId: kind === "raidBoss" ? nextStage : null,
      name: `${kind === "raidNormal" ? "\uC77C\uBC18 \uB808\uC774\uB4DC" : "\uBCF4\uC2A4 \uB808\uC774\uB4DC"} ${nextStage}`,
      encounterTemplateId: Object.keys(state.manifest.encounters)[0],
      encounterOverrides: {},
      reward: { firstClearDiamondReward: 20, repeatDiamondReward: 2 },
      timeLimitMs: kind === "raidNormal" ? 9e5 : 6e5,
      raidWindowHours: 4,
      joinWindowMinutes: 10,
      maxParticipants: 4,
      enabled: true,
      background: {
        assetKey: null,
        tintColor: "#000000",
        tintOpacity: 0,
        removeImage: false
      }
    };
    state.selected = { kind, id };
  }
  function createEncounterEntry() {
    const nextId = slugify(
      window.prompt("\uC0C8 \uC801 \uD15C\uD50C\uB9BF id\uB97C \uC785\uB825\uD558\uC138\uC694.", "encounter_new") || ""
    );
    if (!nextId) return;
    if (state.manifest.encounters[nextId]) {
      showToast("\uC774\uBBF8 \uAC19\uC740 id\uC758 \uD15C\uD50C\uB9BF\uC774 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    state.manifest.encounters[nextId] = {
      id: nextId,
      kind: "level",
      displayName: "\uC0C8 \uC801",
      tier: "normal",
      monsterName: "\uC0C8 \uC801",
      monsterEmoji: "\u{1F47E}",
      monsterColor: "#60a5fa",
      baseHp: 1e3,
      baseAttack: 20,
      attackIntervalMs: 5e3,
      attackPattern: "basic_auto",
      enabled: true
    };
    state.selected = { kind: "encounter", id: nextId };
  }
  function cloneSelected() {
    const record = getSelectedRecord();
    if (!record || !state.selected) return;
    if (state.selected.kind === "level") {
      const nextLevelId = Math.max(
        0,
        ...Object.values(state.manifest.levels).map((level) => level.levelId)
      ) + 1;
      const id = `level_${nextLevelId}`;
      state.manifest.levels[id] = {
        ...deepClone2(record),
        id,
        levelId: nextLevelId,
        name: `${record.name} \uBCF5\uC0AC\uBCF8`
      };
      state.selected = { kind: "level", id };
      return;
    }
    if (state.selected.kind === "raidNormal" || state.selected.kind === "raidBoss") {
      const scope = state.selected.kind === "raidNormal" ? state.manifest.raids.normal : state.manifest.raids.boss;
      const nextStage = Math.max(0, ...Object.values(scope).map((raid) => raid.stage)) + 1;
      const id = `${state.selected.kind === "raidNormal" ? "normal" : "boss"}_${nextStage}`;
      scope[id] = {
        ...deepClone2(record),
        id,
        stage: nextStage,
        name: `${record.name} \uBCF5\uC0AC\uBCF8`
      };
      state.selected = { kind: state.selected.kind, id };
      return;
    }
    const nextId = `${record.id}_copy`;
    state.manifest.encounters[nextId] = {
      ...deepClone2(record),
      id: nextId,
      displayName: `${record.displayName} \uBCF5\uC0AC\uBCF8`
    };
    state.selected = { kind: "encounter", id: nextId };
  }
  function deleteSelected() {
    if (!state.selected || !window.confirm("\uC120\uD0DD\uD55C \uD56D\uBAA9\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?")) return;
    if (state.selected.kind === "level")
      delete state.manifest.levels[state.selected.id];
    else if (state.selected.kind === "raidNormal")
      delete state.manifest.raids.normal[state.selected.id];
    else if (state.selected.kind === "raidBoss")
      delete state.manifest.raids.boss[state.selected.id];
    else delete state.manifest.encounters[state.selected.id];
    state.selected = null;
  }
  async function uploadAsset() {
    const file = elements.assetFileInput.files?.[0];
    if (!file) {
      showToast("\uC5C5\uB85C\uB4DC\uD560 \uC774\uBBF8\uC9C0\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("\uC774\uBBF8\uC9C0\uB97C \uC77D\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."));
      reader.readAsDataURL(file);
    });
    const assetKey = elements.assetKeyInput.value.trim() || slugify(file.name.replace(/\.[^.]+$/, "")) || `asset_${Date.now()}`;
    const { error } = await state.supabase.from("ui_assets").upsert(
      {
        asset_key: assetKey,
        data_url: dataUrl,
        mime_type: file.type || null,
        content_hash: hashString(dataUrl),
        updated_by: state.session.user.id
      },
      { onConflict: "asset_key" }
    );
    if (error) throw error;
    elements.assetKeyInput.value = assetKey;
    elements.assetFileInput.value = "";
    state.assets = await fetchAssets();
    renderAssets();
  }
  async function uploadAudioAsset() {
    const file = elements.audioAssetFileInput.files?.[0];
    if (!file) {
      showToast("\uC5C5\uB85C\uB4DC\uD560 \uC624\uB514\uC624 \uD30C\uC77C\uC744 \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.");
      return;
    }
    if (!file.type.startsWith("audio/")) {
      showToast("\uC624\uB514\uC624 \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("\uC624\uB514\uC624\uB97C \uC77D\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."));
      reader.readAsDataURL(file);
    });
    const assetKey = elements.audioAssetKeyInput.value.trim() || slugify(file.name.replace(/\.[^.]+$/, "")) || `audio_${Date.now()}`;
    const { error } = await state.supabase.from("ui_assets").upsert(
      {
        asset_key: assetKey,
        data_url: dataUrl,
        mime_type: file.type || "audio/mpeg",
        content_hash: hashString(dataUrl),
        updated_by: state.session.user.id
      },
      { onConflict: "asset_key" }
    );
    if (error) throw error;
    elements.audioAssetKeyInput.value = assetKey;
    elements.audioAssetFileInput.value = "";
    state.assets = await fetchAssets();
    if (state.visualManifest) {
      pushVisualHistory();
      const audio = getVisualAudioConfig();
      const sfxEventId = GAMEPLAY_SFX_EVENT_IDS.includes(state.visualSelectedSfxEventId) ? state.visualSelectedSfxEventId : "blockPlace";
      state.visualSelectedSfxEventId = sfxEventId;
      state.visualManifest.gameplay = sanitizeGameplayVisualConfig({
        ...state.visualManifest.gameplay,
        audio: {
          ...audio,
          sfx: {
            ...audio.sfx,
            [sfxEventId]: {
              ...audio.sfx[sfxEventId],
              assetKey
            }
          }
        }
      });
      markVisualDirty();
      await saveVisualDraft();
    }
    renderAll();
    setInlineStatus(
      elements.uiEditorStatusLine,
      `${assetKey}\uB97C ${GAMEPLAY_SFX_LABELS[state.visualSelectedSfxEventId]}\uC5D0 \uC5F0\uACB0\uD558\uACE0 \uCD08\uC548\uC5D0 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4. \uBC30\uD3EC\uB97C \uB20C\uB7EC\uC57C \uC571\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.`,
      "success"
    );
  }
  async function deleteAudioAsset(assetKey) {
    const usage = getAudioAssetUsageMap().get(assetKey);
    if (usage?.draft?.length || usage?.published?.length) {
      throw new Error("\uD604\uC7AC \uCD08\uC548 \uB610\uB294 \uCD5C\uC2E0 \uBC30\uD3EC\uBCF8\uC5D0 \uC5F0\uACB0\uB41C \uC624\uB514\uC624\uB294 \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    stopAudioPreview();
    const { error } = await state.supabase.from("ui_assets").delete().eq("asset_key", assetKey);
    if (error) {
      throw error;
    }
    state.assets = await fetchAssets();
    renderAll();
  }
  async function loadWorkspace() {
    const [draft, latestRelease, releaseHistory, assets] = await Promise.all([
      fetchDraft(),
      fetchLatestRelease(),
      fetchReleaseHistory(),
      fetchAssets()
    ]);
    state.assets = assets;
    state.releaseHistory = releaseHistory;
    state.publishedVersion = latestRelease?.version ?? null;
    const draftManifest = isValidCreatorManifest(draft?.manifest_json) ? deepClone2(draft.manifest_json) : null;
    const releaseManifest = isValidCreatorManifest(latestRelease?.manifest_json) ? deepClone2(latestRelease.manifest_json) : null;
    state.manifest = draftManifest ?? releaseManifest;
    if (!state.manifest) {
      state.manifest = await loadDefaultManifest();
    }
    if (!draftManifest) {
      await saveDraft();
    }
    state.adminWorkspaceLoaded = true;
    if (!state.selected || !getSelectedRecord()) {
      const firstLevel = Object.values(state.manifest.levels).sort(
        (a, b) => a.levelId - b.levelId
      )[0];
      if (firstLevel) state.selected = { kind: "level", id: firstLevel.id };
    }
    renderAll();
    bindDynamicEvents();
  }
  async function login(mode) {
    await ensureClient();
    if (mode === "restore") {
      const { data } = await state.supabase.auth.getSession();
      if (!data.session) throw new Error("\uC800\uC7A5\uB41C \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      state.session = data.session;
    } else {
      const { data, error } = await state.supabase.auth.signInWithPassword({
        email: elements.adminEmail.value.trim(),
        password: elements.adminPassword.value
      });
      if (error) throw error;
      state.session = data.session;
    }
    if (state.session?.user?.email) {
      elements.adminEmail.value = state.session.user.email;
    }
    state.profile = await fetchProfile(state.session.user.id);
    if (!state.profile?.is_admin)
      throw new Error("\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uC788\uB294 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD574\uC57C \uD569\uB2C8\uB2E4.");
    localStorage.setItem(
      STORAGE_KEY2,
      JSON.stringify({
        url: elements.supabaseUrl.value.trim(),
        key: elements.supabaseAnonKey.value.trim(),
        email: state.session.user.email || elements.adminEmail.value.trim()
      })
    );
  }
  function resetWorkspaceState() {
    stopVisualFrameLoop();
    state.activeView = "ui";
    state.visualManifest = null;
    state.visualPublishedVersion = null;
    state.visualPublishedManifest = null;
    state.visualReleaseHistory = [];
    state.visualSelectedScreenId = "level";
    state.visualSelectedElementId = "header";
    state.visualConnectedDevices = [];
    state.visualActiveDeviceSerial = "";
    state.visualDeviceViewport = null;
    state.visualFrameDataUrl = "";
    state.visualHistoryPast = [];
    state.visualHistoryFuture = [];
    state.visualSelectedSfxEventId = "blockPlace";
    state.visualSelectedBgmTrackId = "level";
    stopAudioPreview();
    state.visualDirty = false;
    state.visualWorkspaceLoaded = false;
    state.adminWorkspaceLoaded = false;
    state.manifest = null;
    state.publishedVersion = null;
    state.releaseHistory = [];
    state.assets = [];
    state.selected = null;
  }
  async function enterWorkspace() {
    resetWorkspaceState();
    toggleLoginCard(false);
    elements.workspace.classList.remove("hidden");
    updateViewVisibility();
    setInlineStatus(
      elements.uiEditorStatusLine,
      "\uD654\uBA74 \uCD08\uC548\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."
    );
    setGlobalStatus("\uD654\uBA74 \uD3B8\uC9D1\uAE30\uB97C \uC900\uBE44\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.");
    renderAll();
    await loadVisualWorkspace();
    await setActiveView("ui");
    setStatus(elements.connectionStatus, "\uB85C\uADF8\uC778\uB428");
    setGlobalStatus("\uD654\uBA74 \uD3B8\uC9D1\uAE30\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.", "success");
  }
  async function initializeWorkspace(mode) {
    try {
      setStatus(elements.connectionStatus, "\uB85C\uADF8\uC778 \uC911...");
      await login(mode);
      await enterWorkspace();
    } catch (error) {
      console.error(error);
      setStatus(
        elements.connectionStatus,
        state.session?.user && state.profile?.is_admin ? "\uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328" : "\uB85C\uADF8\uC778 \uC2E4\uD328"
      );
      showToast(
        getErrorMessage(error, "\uB85C\uADF8\uC778 \uB610\uB294 \uCD08\uAE30 \uBD88\uB7EC\uC624\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.")
      );
    }
  }
  async function restoreWorkspaceIfPossible(showFeedback = false) {
    try {
      await login("restore");
      await enterWorkspace();
      setStatus(elements.connectionStatus, "\uC138\uC158 \uBCF5\uC6D0\uB428");
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "\uC138\uC158 \uBCF5\uC6D0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      if (message === "\uC800\uC7A5\uB41C \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.") {
        setStatus(elements.connectionStatus, "\uBBF8\uB9AC\uBCF4\uAE30 \uBAA8\uB4DC");
        if (showFeedback) {
          showToast("\uBCF5\uC6D0\uD560 \uB85C\uADF8\uC778 \uC138\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
        return false;
      }
      console.error(error);
      setStatus(
        elements.connectionStatus,
        state.session?.user && state.profile?.is_admin ? "\uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328" : "\uC138\uC158 \uBCF5\uC6D0 \uC2E4\uD328"
      );
      if (showFeedback) {
        showToast(message);
      }
      return false;
    }
  }
  function applyManifestJson() {
    try {
      state.manifest = JSON.parse(elements.manifestJson.value);
      state.adminWorkspaceLoaded = true;
      renderAll();
      bindDynamicEvents();
    } catch (_error) {
      showToast("JSON \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    }
  }
  function syncCustomViewportFromInputs() {
    state.visualCustomViewport = sanitizeViewport({
      width: elements.visualViewportWidth.value,
      height: elements.visualViewportHeight.value,
      safeTop: elements.visualSafeTop.value,
      safeBottom: elements.visualSafeBottom.value
    });
  }
  function commitVisualInspectorChange() {
    if (!state.visualManifest) {
      return;
    }
    pushVisualHistory();
    updateVisualRuleFromInputs();
    markVisualDirty();
    renderAll();
  }
  async function refreshPhoneFrameWithFeedback() {
    if (state.visualDeviceSource !== "phone") {
      setInlineStatus(
        elements.visualStageStatus,
        "\uC2E4\uC81C \uD3F0 \uD654\uBA74 \uBAA8\uB4DC\uC5D0\uC11C\uB9CC \uC0C8\uB85C \uAC00\uC838\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4."
      );
      return;
    }
    await refreshDeviceViewport(false);
    await refreshVisualLiveLayout(false);
    await refreshVisualFrame(true);
    renderAll();
  }
  async function initializePreviewWorkspace() {
    toggleLoginCard(false);
    elements.workspace.classList.remove("hidden");
    state.activeView = "ui";
    state.visualManifest = createDefaultVisualManifest();
    state.visualPublishedVersion = null;
    state.visualPublishedManifest = null;
    state.visualReleaseHistory = [];
    state.visualSelectedScreenId = "level";
    state.visualSelectedElementId = "header";
    state.visualHistoryPast = [];
    state.visualHistoryFuture = [];
    state.visualDirty = false;
    state.visualWorkspaceLoaded = false;
    state.adminWorkspaceLoaded = false;
    state.manifest = null;
    state.publishedVersion = null;
    state.releaseHistory = [];
    state.assets = [];
    state.selected = null;
    setStatus(elements.connectionStatus, "\uBBF8\uB9AC\uBCF4\uAE30 \uBAA8\uB4DC");
    setGlobalStatus(
      "\uB85C\uADF8\uC778 \uC5C6\uC774 \uD3F0 \uD654\uBA74 \uBBF8\uB9AC\uBCF4\uAE30\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC800\uC7A5\uACFC \uBC30\uD3EC\uB294 \uB85C\uADF8\uC778 \uD6C4 \uAC00\uB2A5\uD569\uB2C8\uB2E4."
    );
    setInlineStatus(
      elements.uiEditorStatusLine,
      "\uBBF8\uB9AC\uBCF4\uAE30 \uC804\uC6A9 \uBAA8\uB4DC\uC785\uB2C8\uB2E4. \uD654\uBA74 \uD655\uC778\uACFC \uC704\uCE58 \uC870\uC815\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4."
    );
    renderAll();
    try {
      await refreshConnectedDevices(false);
      if (state.visualDeviceSource === "phone" && state.visualActiveDeviceSerial) {
        await refreshVisualFrame(false);
      }
    } catch (error) {
      setInlineStatus(
        elements.visualDeviceMeta,
        getErrorMessage(error, "\uAE30\uAE30 \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."),
        "error"
      );
    }
    renderAll();
  }
  function bindNavigationEvents() {
    elements.viewUiButton.addEventListener(
      "click",
      () => void setActiveView("ui")
    );
    elements.viewAdminButton.addEventListener(
      "click",
      () => void setActiveView("admin")
    );
    elements.viewHistoryButton.addEventListener(
      "click",
      () => void setActiveView("history")
    );
    elements.viewSettingsButton.addEventListener(
      "click",
      () => void setActiveView("settings")
    );
  }
  function bindVisualEvents() {
    elements.visualScreenId.addEventListener("change", async () => {
      state.visualSelectedScreenId = elements.visualScreenId.value;
      const screenElements = ELEMENT_DEFS[state.visualSelectedScreenId] ?? [];
      if (!screenElements.some((item) => item.id === state.visualSelectedElementId)) {
        state.visualSelectedElementId = screenElements[0]?.id || "header";
      }
      if (state.visualDeviceSource === "phone" && state.visualActiveDeviceSerial) {
        try {
          await refreshDeviceViewport(false);
          await refreshVisualLiveLayout(false);
          await refreshVisualFrame(false);
        } catch (error) {
          setInlineStatus(
            elements.visualDeviceMeta,
            getErrorMessage(
              error,
              "\uC2E4\uC81C \uAE30\uAE30 \uD654\uBA74\uC744 \uB2E4\uC2DC \uB3D9\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
            ),
            "error"
          );
        }
      }
      renderAll();
    });
    elements.visualDeviceSource.addEventListener("change", async () => {
      state.visualDeviceSource = elements.visualDeviceSource.value;
      if (state.visualDeviceSource === "phone") {
        try {
          await refreshConnectedDevices(false);
          if (state.visualActiveDeviceSerial) {
            await refreshVisualFrame(false);
          }
        } catch (error) {
          setInlineStatus(
            elements.visualDeviceMeta,
            getErrorMessage(error, "\uC2E4\uC81C \uD3F0 \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."),
            "error"
          );
        }
      } else {
        stopVisualFrameLoop();
      }
      renderAll();
    });
    elements.visualDeviceSelect.addEventListener("change", async () => {
      state.visualActiveDeviceSerial = elements.visualDeviceSelect.value;
      state.visualFrameDataUrl = "";
      try {
        await refreshDeviceViewport(false);
        await refreshVisualLiveLayout(false);
        if (state.visualDeviceSource === "phone" && state.visualActiveDeviceSerial) {
          await refreshVisualFrame(false);
        }
      } catch (error) {
        setInlineStatus(
          elements.visualDeviceMeta,
          getErrorMessage(error, "\uAE30\uAE30 \uD654\uBA74 \uC815\uBCF4\uB97C \uC5C5\uB370\uC774\uD2B8\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."),
          "error"
        );
      }
      renderAll();
    });
    elements.visualDeviceProfile.addEventListener("change", () => {
      state.visualDeviceProfileId = elements.visualDeviceProfile.value;
      renderAll();
    });
    [
      elements.visualViewportWidth,
      elements.visualViewportHeight,
      elements.visualSafeTop,
      elements.visualSafeBottom
    ].forEach((input) => {
      input.addEventListener("change", () => {
        syncCustomViewportFromInputs();
        renderAll();
      });
    });
    elements.visualRefreshDeviceButton.addEventListener("click", async () => {
      try {
        await refreshConnectedDevices(true);
        renderAll();
      } catch (error) {
        showToast(getErrorMessage(error, "\uAE30\uAE30 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.visualRefreshFrameButton.addEventListener("click", async () => {
      try {
        await refreshPhoneFrameWithFeedback();
      } catch (error) {
        showToast(getErrorMessage(error, "\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.visualShowGrid.addEventListener("change", () => {
      state.visualShowGrid = elements.visualShowGrid.checked;
      renderAll();
    });
    elements.visualSnapGrid.addEventListener("change", () => {
      state.visualSnapGrid = elements.visualSnapGrid.checked;
      renderAll();
    });
    elements.visualGridSize.addEventListener("change", () => {
      state.visualGridSize = Math.max(
        1,
        Number(elements.visualGridSize.value) || 16
      );
      renderAll();
    });
    [
      elements.visualDragLiftOffset,
      elements.visualDragCenterOffsetX,
      elements.visualDragCenterOffsetY,
      elements.visualDragDistanceScaleX,
      elements.visualDragDistanceScaleY,
      elements.visualDragSnapDistance,
      elements.visualDragStickyThreshold,
      elements.visualDragSearchRadius
    ].forEach((input) => {
      input.addEventListener("change", commitVisualDragTuningChange);
    });
    elements.visualDragPresetPrecise.addEventListener("click", () => {
      applyVisualDragPreset(VISUAL_DRAG_PRESETS.precise);
    });
    elements.visualDragPresetAssist.addEventListener("click", () => {
      applyVisualDragPreset(VISUAL_DRAG_PRESETS.assist);
    });
    elements.visualDragPresetLegacy.addEventListener("click", () => {
      applyVisualDragPreset(VISUAL_DRAG_PRESETS.legacy);
    });
    [
      [
        elements.visualAudioMasterVolume,
        elements.visualAudioMasterVolumeSlider,
        elements.visualAudioMasterVolumeReadout
      ],
      [
        elements.visualAudioSfxVolume,
        elements.visualAudioSfxVolumeSlider,
        elements.visualAudioSfxVolumeReadout
      ],
      [
        elements.visualAudioBgmVolume,
        elements.visualAudioBgmVolumeSlider,
        elements.visualAudioBgmVolumeReadout
      ],
      [
        elements.visualAudioSfxRuleVolume,
        elements.visualAudioSfxRuleVolumeSlider,
        elements.visualAudioSfxRuleVolumeReadout
      ],
      [
        elements.visualAudioBgmRuleVolume,
        elements.visualAudioBgmRuleVolumeSlider,
        elements.visualAudioBgmRuleVolumeReadout
      ]
    ].forEach(([input, slider, readout]) => {
      input.addEventListener("input", () => {
        copyAudioVolumeValue(input, slider, readout);
      });
      slider.addEventListener("input", () => {
        copyAudioVolumeValue(slider, input, readout);
      });
      input.addEventListener("change", commitVisualAudioChange);
      slider.addEventListener("change", () => {
        copyAudioVolumeValue(slider, input, readout);
        commitVisualAudioChange();
      });
    });
    [
      elements.visualAudioMuted,
      elements.visualAudioSfxAsset,
      elements.visualAudioSfxCooldown,
      elements.visualAudioSfxOverlap,
      elements.visualAudioSfxEnabled,
      elements.visualAudioBgmAsset,
      elements.visualAudioBgmLoop,
      elements.visualAudioBgmFadeIn,
      elements.visualAudioBgmFadeOut,
      elements.visualAudioBgmEnabled
    ].forEach((input) => {
      input.addEventListener("change", commitVisualAudioChange);
    });
    elements.visualAudioSfxEvent.addEventListener("change", () => {
      state.visualSelectedSfxEventId = elements.visualAudioSfxEvent.value;
      syncVisualAudioInputs();
    });
    elements.visualAudioBgmTrack.addEventListener("change", () => {
      state.visualSelectedBgmTrackId = elements.visualAudioBgmTrack.value;
      syncVisualAudioInputs();
    });
    elements.visualAudioSfxPreview.addEventListener("click", () => {
      updateVisualAudioFromInputs();
      const audio = getVisualAudioConfig();
      const rule = audio.sfx[state.visualSelectedSfxEventId];
      const volume = audio.muted ? 0 : normalizeSfxPlaybackVolume(getVolume(audio.masterVolume, audio.sfxVolume, rule.volume));
      playAudioPreview(getAudioAssetDataUrl(rule.assetKey), volume, false);
    });
    elements.visualAudioBgmPreview.addEventListener("click", () => {
      updateVisualAudioFromInputs();
      const audio = getVisualAudioConfig();
      const rule = audio.bgm[state.visualSelectedBgmTrackId];
      const volume = audio.muted ? 0 : audio.masterVolume * audio.bgmVolume * rule.volume;
      playAudioPreview(getAudioAssetDataUrl(rule.assetKey), volume, rule.loop);
    });
    elements.visualAudioBgmStop.addEventListener("click", stopAudioPreview);
    elements.uploadAudioAssetButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uC624\uB514\uC624 \uC5C5\uB85C\uB4DC")) {
        return;
      }
      try {
        await uploadAudioAsset();
        showToast("\uC624\uB514\uC624\uB97C \uC5C5\uB85C\uB4DC\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uC624\uB514\uC624 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.audioAssetLibrary?.addEventListener("click", async (event) => {
      const button = event.target.closest(".asset-delete-button");
      if (!button || button.disabled) {
        return;
      }
      if (!requireAdminAccess("\uC624\uB514\uC624 \uC0AD\uC81C")) {
        return;
      }
      const assetKey = button.dataset.assetKey;
      if (!assetKey) {
        return;
      }
      if (!window.confirm(`\uC624\uB514\uC624 ${assetKey}\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694? \uBBF8\uC0AC\uC6A9 \uC790\uC0B0\uB9CC \uC0AD\uC81C\uB429\uB2C8\uB2E4.`)) {
        return;
      }
      try {
        await deleteAudioAsset(assetKey);
        showToast(`\uC624\uB514\uC624 ${assetKey}\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.`);
      } catch (error) {
        showToast(getErrorMessage(error, "\uC624\uB514\uC624 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.visualReferenceViewportButton?.addEventListener("click", () => {
      if (!state.visualManifest) {
        return;
      }
      replaceVisualReferenceViewport(getVisualViewport());
      renderAll();
    });
    elements.visualFitButton.addEventListener("click", () => {
      state.visualZoomMode = "fit";
      state.visualZoomValue = 1;
      state.visualStageOffsetX = 0;
      state.visualStageOffsetY = 0;
      persistDesktopSettings();
      renderAll();
    });
    elements.visualActualButton.addEventListener("click", () => {
      state.visualZoomMode = "actual";
      state.visualZoomValue = 1;
      state.visualStageOffsetX = 0;
      state.visualStageOffsetY = 0;
      persistDesktopSettings();
      renderAll();
    });
    elements.visualZoomSlider.addEventListener("input", () => {
      state.visualZoomValue = clamp((Number(elements.visualZoomSlider.value) || 100) / 100, 0.6, 1.4);
      persistDesktopSettings();
      renderAll();
    });
    elements.visualStageOffsetX.addEventListener("input", () => {
      state.visualStageOffsetX = clampVisualPreviewPercent(elements.visualStageOffsetX.value);
      persistDesktopSettings();
      renderAll();
    });
    elements.visualStageOffsetY.addEventListener("input", () => {
      state.visualStageOffsetY = clampVisualPreviewPercent(elements.visualStageOffsetY.value);
      persistDesktopSettings();
      renderAll();
    });
    elements.visualStageResetButton.addEventListener("click", () => {
      state.visualZoomValue = 1;
      state.visualStageOffsetX = 0;
      state.visualStageOffsetY = 0;
      persistDesktopSettings();
      renderAll();
    });
    window.addEventListener("focus", async () => {
      if (state.activeView !== "ui" || state.visualDeviceSource !== "phone" || !state.visualActiveDeviceSerial) {
        return;
      }
      try {
        await refreshDeviceViewport(false);
        await refreshVisualLiveLayout(false);
        await refreshVisualFrame(false);
        renderVisualEditor();
      } catch {
      }
    });
    [
      elements.visualOffsetX,
      elements.visualOffsetY,
      elements.visualScale,
      elements.visualWidthScale,
      elements.visualHeightScale,
      elements.visualOpacity,
      elements.visualZIndex,
      elements.visualVisible
    ].forEach((input) => {
      input.addEventListener("change", commitVisualInspectorChange);
    });
    elements.visualSafeAware.addEventListener(
      "change",
      commitVisualInspectorChange
    );
    elements.visualNudgeUp.addEventListener("click", () => nudgeVisual(0, -1));
    elements.visualNudgeDown.addEventListener("click", () => nudgeVisual(0, 1));
    elements.visualNudgeLeft.addEventListener("click", () => nudgeVisual(-1, 0));
    elements.visualNudgeRight.addEventListener("click", () => nudgeVisual(1, 0));
    elements.visualNudgeUpLarge.addEventListener(
      "click",
      () => nudgeVisual(0, -10)
    );
    elements.visualNudgeDownLarge.addEventListener(
      "click",
      () => nudgeVisual(0, 10)
    );
    elements.visualNudgeLeftLarge.addEventListener(
      "click",
      () => nudgeVisual(-10, 0)
    );
    elements.visualNudgeRightLarge.addEventListener(
      "click",
      () => nudgeVisual(10, 0)
    );
    elements.visualUndoButton.addEventListener("click", () => {
      const previous = state.visualHistoryPast.pop();
      if (!previous || !state.visualManifest) {
        return;
      }
      state.visualHistoryFuture.push(JSON.stringify(state.visualManifest));
      applyVisualHistorySnapshot(previous);
      renderAll();
    });
    elements.visualRedoButton.addEventListener("click", () => {
      const next = state.visualHistoryFuture.pop();
      if (!next || !state.visualManifest) {
        return;
      }
      state.visualHistoryPast.push(JSON.stringify(state.visualManifest));
      applyVisualHistorySnapshot(next);
      renderAll();
    });
    elements.visualResetButton.addEventListener("click", () => {
      if (!state.visualManifest) {
        return;
      }
      pushVisualHistory();
      const rule = getVisualSelectedRule();
      Object.assign(rule, clone(DEFAULT_RULE));
      markVisualDirty();
      renderAll();
    });
    elements.visualSaveDraftButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uD654\uBA74 \uCD08\uC548 \uC800\uC7A5")) {
        return;
      }
      try {
        await saveVisualDraft();
        renderAll();
        showToast("\uD654\uBA74 \uCD08\uC548\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uD654\uBA74 \uCD08\uC548 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.visualPublishButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uD654\uBA74 \uBC30\uD3EC")) {
        return;
      }
      try {
        await publishVisualDraft();
        renderAll();
        showToast("\uD654\uBA74 \uBC30\uD3EC\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uD654\uBA74 \uBC30\uD3EC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
  }
  function bindAdminEvents() {
    elements.refreshButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uC0C8\uB85C\uACE0\uCE68")) {
        return;
      }
      try {
        await loadWorkspace();
        setGlobalStatus("\uAD00\uB9AC\uC790 \uB370\uC774\uD130\uB97C \uC0C8\uB85C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.", "success");
      } catch (error) {
        showToast(getErrorMessage(error, "\uAD00\uB9AC\uC790 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.saveDraftButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uAD00\uB9AC\uC790 \uCD08\uC548 \uC800\uC7A5")) {
        return;
      }
      try {
        await saveDraft();
        await loadWorkspace();
        showToast("\uAD00\uB9AC\uC790 \uCD08\uC548\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uAD00\uB9AC\uC790 \uCD08\uC548 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.publishButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC")) {
        return;
      }
      try {
        await publishDraft();
        await loadWorkspace();
        showToast("\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uAD00\uB9AC\uC790 \uB370\uC774\uD130 \uBC30\uD3EC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.copyJsonButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uC124\uC815 JSON \uBCF5\uC0AC")) {
        return;
      }
      await navigator.clipboard.writeText(elements.manifestJson.value);
      showToast("\uC124\uC815 JSON\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.");
    });
    elements.applyJsonButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uC124\uC815 JSON \uC801\uC6A9")) {
        return;
      }
      applyManifestJson();
    });
    elements.uploadAssetButton.addEventListener("click", async () => {
      if (!requireAdminAccess("\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC")) {
        return;
      }
      try {
        await uploadAsset();
        renderAll();
        bindDynamicEvents();
        showToast("\uC774\uBBF8\uC9C0\uB97C \uC5C5\uB85C\uB4DC\uD588\uC2B5\uB2C8\uB2E4.");
      } catch (error) {
        showToast(getErrorMessage(error, "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.addLevelButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uB808\uBCA8 \uCD94\uAC00")) {
        return;
      }
      createLevelEntry();
      renderAll();
      bindDynamicEvents();
    });
    elements.addNormalRaidButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uC77C\uBC18 \uB808\uC774\uB4DC \uCD94\uAC00")) {
        return;
      }
      createRaidEntry("raidNormal");
      renderAll();
      bindDynamicEvents();
    });
    elements.addBossRaidButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uBCF4\uC2A4 \uB808\uC774\uB4DC \uCD94\uAC00")) {
        return;
      }
      createRaidEntry("raidBoss");
      renderAll();
      bindDynamicEvents();
    });
    elements.addEncounterButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uC801 \uD15C\uD50C\uB9BF \uCD94\uAC00")) {
        return;
      }
      createEncounterEntry();
      renderAll();
      bindDynamicEvents();
    });
    elements.cloneButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uD56D\uBAA9 \uBCF5\uC81C")) {
        return;
      }
      cloneSelected();
      renderAll();
      bindDynamicEvents();
    });
    elements.deleteButton.addEventListener("click", () => {
      if (!requireAdminAccess("\uD56D\uBAA9 \uC0AD\uC81C")) {
        return;
      }
      deleteSelected();
      renderAll();
      bindDynamicEvents();
    });
  }
  function bindSharedEvents() {
    elements.logoutButton.addEventListener("click", async () => {
      if (!state.session?.user) {
        toggleLoginCard();
        return;
      }
      try {
        if (state.supabase) {
          await state.supabase.auth.signOut();
        }
      } finally {
        state.session = null;
        state.profile = null;
        resetWorkspaceState();
        void initializePreviewWorkspace();
      }
    });
    elements.settingsRefreshDevicesButton.addEventListener("click", async () => {
      try {
        await refreshConnectedDevices(true);
        renderAll();
      } catch (error) {
        showToast(getErrorMessage(error, "\uAE30\uAE30 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    elements.settingsRefreshFrameButton.addEventListener("click", async () => {
      try {
        await refreshPhoneFrameWithFeedback();
      } catch (error) {
        showToast(getErrorMessage(error, "\uC2E4\uC81C \uD3F0 \uD654\uBA74\uC744 \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
      }
    });
    window.addEventListener("keydown", (event) => {
      if (!state.visualManifest || state.activeView !== "ui") {
        return;
      }
      const tagName = document.activeElement?.tagName || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) {
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeVisual(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeVisual(0, step);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeVisual(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeVisual(step, 0);
      }
    });
    window.addEventListener("resize", () => {
      if (state.visualManifest) {
        renderAll();
      }
    });
  }
  async function bootstrap() {
    elements.supabaseUrl.value = DEFAULT_SUPABASE_URL;
    elements.supabaseAnonKey.value = DEFAULT_SUPABASE_ANON_KEY;
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY2) || "null");
    if (saved?.url) elements.supabaseUrl.value = saved.url;
    if (saved?.key) elements.supabaseAnonKey.value = saved.key;
    if (saved?.email) elements.adminEmail.value = saved.email;
    if (saved?.visualPreview) {
      state.visualZoomMode = saved.visualPreview.zoomMode === "actual" ? "actual" : "fit";
      state.visualZoomValue = clamp(numberOr(saved.visualPreview.zoomValue, 1), 0.6, 1.4);
      state.visualStageOffsetX = clampVisualPreviewPercent(saved.visualPreview.offsetX);
      state.visualStageOffsetY = clampVisualPreviewPercent(saved.visualPreview.offsetY);
    }
    if (localDesktopConfig?.supabaseUrl)
      elements.supabaseUrl.value = localDesktopConfig.supabaseUrl;
    if (localDesktopConfig?.supabaseAnonKey)
      elements.supabaseAnonKey.value = localDesktopConfig.supabaseAnonKey;
    if (localDesktopConfig?.email)
      elements.adminEmail.value = localDesktopConfig.email;
    if (localDesktopConfig?.password)
      elements.adminPassword.value = localDesktopConfig.password;
    elements.visualScreenId.innerHTML = Object.entries(SCREEN_LABELS).map(
      ([value, label]) => `<option value="${value}" ${value === state.visualSelectedScreenId ? "selected" : ""}>${label}</option>`
    ).join("");
    elements.visualGridSize.value = String(state.visualGridSize);
    elements.visualShowGrid.checked = state.visualShowGrid;
    elements.visualSnapGrid.checked = state.visualSnapGrid;
    elements.visualDeviceSource.value = state.visualDeviceSource;
    syncCustomViewportFromInputs();
    updateViewVisibility();
    renderAll();
    bindVisualPointerEvents();
    bindNavigationEvents();
    bindVisualEvents();
    bindAdminEvents();
    bindSharedEvents();
    await initializePreviewWorkspace();
    elements.loginButton.addEventListener(
      "click",
      () => void initializeWorkspace("login")
    );
    elements.restoreButton.addEventListener(
      "click",
      () => void restoreWorkspaceIfPossible(true)
    );
    const restored = await restoreWorkspaceIfPossible(false);
    if (!restored && localDesktopConfig?.autoLogin !== false && elements.adminEmail.value && elements.adminPassword.value) {
      await initializeWorkspace("login");
    }
  }
  void bootstrap();
})();

