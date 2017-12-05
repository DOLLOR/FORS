(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }else{
        var moduleName = 'fors';
        var oldModule = window[moduleName];
        var exports = window[moduleName] = {
            noConflict:function(){
                window[moduleName] = oldModule;
                oldModule = null;
                return exports;
            }
        };
        factory(null,exports);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    /**
     * for in
     * @param {*} obj
     * @param {(key:String,value)=>*} iterator
     * @param {*} self
     */
    var forIn = function (obj, iterator, self) {
        if (self == null)
            self = true;
        if (obj != null) {
            for (var key in obj) {
                if (!self || Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (iterator(key, obj[key]) === false) {
                        break;
                    }
                }
            }
        }
    };
    /**
     * for each
     * @param {Array} arr
     * @param {(value,key:Number)=>*} iterator
     */
    var forEach = function (arr, iterator) {
        if (arr) {
            var length = arr.length;
            var key;
            for (key = 0; key < length; key++) {
                if (iterator(arr[key], key) === false) {
                    break;
                }
            }
        }
    };
    //----------------------------------------------------------
    /**
     * XHR factory
     * @param {String} url
     * @param {'GET'|'POST'} method
     * @param {Boolean} isAsync
     * @param {*} data
     * @param {*} xhrProp
     * @param {*} headers
     * @param {(ev:event)=>void} cb
     */
    var xhrmaker = function (url, method, isAsync, data, xhrProp, headers, cb) {
        var xhr = new XMLHttpRequest();
        if (method == null)
            method = 'GET';
        if (isAsync == null)
            isAsync = true;
        xhr.open(method, url, isAsync);
        if (typeof cb === typeof parseInt) {
            xhr.onreadystatechange = function (ev) {
                if (this.DONE == null)
                    this.DONE = 4;
                if (this.readyState === this.DONE) {
                    cb.call(this, ev);
                }
            };
        }
        forIn(xhrProp, function (key, val) {
            xhr[key] = val;
        });
        forIn(headers, function (key, val) {
            xhr.setRequestHeader(key, val);
        });
        if (data == null)
            data = null;
        xhr.send(data);
    };
    exports.xhrmaker = xhrmaker;
    /**
     * add event listener
     * @param {String} event
     * @param {(ev:Event)=>void} callback
     * @param {EventTarget} target
     * @return {()=>void}
     */
    var onEvent = function (event, callback, target) {
        if (typeof addEventListener !== typeof undefined) {
            //modern
            exports.onEvent = onEvent = function (event, callback, target) {
                if (target) {
                    target.addEventListener(event, callback, false);
                    return function () { return target.removeEventListener(event, callback, false); };
                }
                else {
                    addEventListener(event, callback, false);
                    return function () { return removeEventListener(event, callback, false); };
                }
            };
        }
        else {
            //legacy ie
            exports.onEvent = onEvent = function (event, callback, target) {
                if (target) {
                    target.attachEvent("on" + event, callback);
                    return function () { return target.detachEvent("on" + event, callback); };
                }
                else {
                    attachEvent("on" + event, callback);
                    return function () { return detachEvent("on" + event, callback); };
                }
            };
        }
        return onEvent(event, callback, target);
    };
    exports.onEvent = onEvent;
    //-------------------------------------------------------------------
    /**
     * @see {@link https://stackoverflow.com/questions/13761968/detect-whether-postmessage-can-send-objects}
     */
    var onlyStrings = false;
    try {
        postMessage({
            toString: function () {
                onlyStrings = true;
                throw new Error('test onlyStrings');
            }
        }, "*");
    }
    catch (er) { }
    var objmsg;
    if (onlyStrings) {
        objmsg = function (input) {
            if (input.constructor === String) {
                return JSON.parse(input);
            }
            else {
                return JSON.stringify(input);
            }
        };
    }
    else {
        objmsg = function (obj) { return obj; };
    }
    /**
     * post message
     * @param {Window} target
     * @param {*} data
     * @param {String} domain
     */
    var postMsg = function (target, data, domain) {
        target.postMessage(objmsg(data), domain);
    };
    /**
     * message listener
     * @param {(source:Window,origin:String,data)=>void} cb
     */
    var listenMsg = function (cb) {
        return onEvent('message', function (_a) {
            var source = _a.source, origin = _a.origin, data = _a.data;
            cb(source, origin, objmsg(data));
        });
    };
    //------------------------------------------------------------------------------
    /**
     * create session
     * @param {Window} target
     * @param {*} data
     * @param {String} domain
     * @param {(data)=>void} callback
     */
    var messageSession = function (target, data, domain, callback) {
        var messageTicket = +new Date() + "-" + Math.random();
        postMsg(target, { data: data, messageTicket: messageTicket }, domain);
        var removeListener = listenMsg(function (source, origin, _a) {
            var data = _a.data, callbackTicket = _a.messageTicket;
            if (messageTicket === callbackTicket) {
                removeListener();
                removeListener = null;
                callback(data);
            }
        });
    };
    /**
     * listen session
     * @param {(source,origin,data,reply:(data)=>void)=>void} cb
     */
    var listenSession = function (cb) {
        return listenMsg(function (source, origin, _a) {
            var messageTicket = _a.messageTicket, data = _a.data;
            cb(source, origin, data, function reply(data) {
                postMsg(source, { data: data, messageTicket: messageTicket }, origin);
            });
        });
    };
    //our site----------------------------------------------------------------------
    var fRequest = function (_a, callback) {
        var proxy = _a.proxy, once = _a.once, url = _a.url, method = _a.method, isAsync = _a.isAsync, data = _a.data, xhrProp = _a.xhrProp, headers = _a.headers;
        var makeRequest = function () {
            messageSession(proxyIf.contentWindow, { url: url, method: method, isAsync: isAsync, data: data, xhrProp: xhrProp, headers: headers }, proxy, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (once)
                    document.body.removeChild(proxyIf);
                proxyIf = null;
                callback.apply(void 0, args);
            });
        };
        /**@type {HTMLIFrameElement} */
        var proxyIf = document.querySelector("iframe[data-proxy-page=\"" + proxy + "\"]");
        if (!proxyIf) {
            proxyIf = document.createElement('iframe');
            proxyIf.src = proxy;
            proxyIf.style.display = 'none';
            proxyIf.style.visibility = 'hidden';
            proxyIf.onload = makeRequest;
            proxyIf.setAttribute('data-proxy-page', proxy);
            document.body.appendChild(proxyIf);
        }
        else {
            makeRequest();
        }
    };
    exports.fRequest = fRequest;
    //their site----------------------------------------------------------------------
    /**@type {String[]} */
    var whiteList;
    /**
     * @param {String[]} list
     */
    var fProxy = function (list) {
        whiteList = list;
        listenSession(function (source, origin, data, reply) {
            var inList = false;
            forEach(whiteList, function (val) {
                if (val === origin) {
                    inList = true;
                    return false;
                }
            });
            if (!inList) {
                console.log(origin + " was blocked.");
                return;
            }
            console.log({ source: source, origin: origin, data: data });
            xhrmaker(data.url, data.method, data.isAsync, data.data, data.xhrProp, data.headers, function () {
                console.log(this);
                var headerArr = this.getAllResponseHeaders().match(/[^\r\n]+/g);
                var headers = {};
                forEach(headerArr, function (header) {
                    var _a = header.match(/([^\:]+)\:\s(.+)/), key = _a[1], val = _a[2];
                    headers[key] = val;
                });
                reply({
                    headers: headers,
                    response: this.response,
                    responseText: this.responseText,
                    responseType: this.responseType,
                    responseURL: this.responseURL,
                    status: this.status,
                    statusText: this.statusText
                });
            });
        });
    };
    exports.fProxy = fProxy;
});
