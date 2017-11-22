"use strict";

/**
 * for in
 * @param {*} obj 
 * @param {(key:String,value)=>*} iterator 
 * @param {*} self 
 */
const forIn = function(obj,iterator,self){
	if(self==null) self = true;
	if(obj!=null){
		for(var key in obj){
			if(!self||Object.prototype.hasOwnProperty.call(obj,key)){
				if(iterator(key,obj[key])===false){
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
const forEach = function(arr,iterator){
	if(arr){
		var length = arr.length;
		var key;
		for(key=0;key<length;key++){
			if(iterator(arr[key],key)===false){
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
const xhrmaker = function(url,method,isAsync,data,xhrProp,headers,cb){
	let xhr = new XMLHttpRequest();
	if(method==null) method = 'GET';
	if(isAsync==null) isAsync = true;
	xhr.open(method,url,isAsync);

	if(typeof cb === typeof parseInt){
		xhr.onreadystatechange = function(ev){
			if(this.DONE==null) this.DONE = 4;
			if(this.readyState===this.DONE){
				cb.call(this,ev);
			}
		}
	}

	forIn(xhrProp,(key,val)=>{
		xhr[key] = val;
	});

	forIn(headers,(key,val)=>{
		xhr.setRequestHeader(key,val);
	});

	if(data==null) data = null;
	xhr.send(data);
};

/**
 * add event listener
 * @param {String} event 
 * @param {(ev:Event)=>void} callback 
 * @param {EventTarget} target 
 * @return {()=>void}
 */
let onEvent = function(event,callback,target){
	if(typeof addEventListener !== typeof undefined){
		//modern
		onEvent = function(event,callback,target){
			if(target){
				target.addEventListener(event,callback,false);
				return ()=>target.removeEventListener(event,callback,false);
			}else{
				addEventListener(event,callback,false);
				return ()=>removeEventListener(event,callback,false);
			}
		};
	}else{
		//legacy ie
		onEvent = function(event,callback,target){
			if(target){
				target.attachEvent(`on${event}`,callback);
				return ()=>target.detachEvent(`on${event}`,callback);
			}else{
				attachEvent(`on${event}`,callback);
				return ()=>detachEvent(`on${event}`,callback);
			}
		};
	}
	return onEvent(event,callback,target);
};
//-------------------------------------------------------------------
let objmsg = obj => obj;
let strobj = input => {
	if(input.constructor === String){
		return JSON.parse(input);
	}else{
		return JSON.stringify(input);
	}
};

/**
 * @see {@link https://stackoverflow.com/questions/13761968/detect-whether-postmessage-can-send-objects}
 */
let onlyStrings = false;

try {
	postMessage({
		toString() {
			onlyStrings = true;
			throw new Error('test onlyStrings');
		}
	}, "*");
} catch (er) {}

if(onlyStrings){
	objmsg = strobj;
}

/**
 * post message
 * @param {Window} target 
 * @param {*} data 
 * @param {String} domain 
 */
let postMsg = function(target,data,domain){
	target.postMessage(objmsg(data),domain);
};

/**
 * message listener
 * @param {(source:Window,origin:String,data)=>void} cb 
 */
let listenMsg = function(cb){
	return onEvent('message',function({source,origin,data}){
		cb(source,origin,objmsg(data));
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
const messageSession = function(target,data,domain,callback){
	let messageTicket = `${+new Date()}-${Math.random()}`;
	postMsg(target,{data,messageTicket},domain);
	let removeListener = listenMsg(function(source,origin,{data,messageTicket:callbackTicket}){
		if(messageTicket===callbackTicket){
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
const listenSession = function(cb){
	return listenMsg(function(source,origin,{messageTicket,data}){
		cb(source,origin,data,function reply(data){
			postMsg(source,{data,messageTicket},origin);
		});
	});
};
//our site----------------------------------------------------------------------
const fRequest = function({proxy,once,url,method,isAsync,data,xhrProp,headers},callback){
	let makeRequest = function(){
		messageSession(proxyIf.contentWindow,{url,method,isAsync,data,xhrProp,headers},proxy,(...args)=>{
			if(once) document.body.removeChild(proxyIf);
			proxyIf = null;
			callback(...args);
		});
	};
	/**@type {HTMLIFrameElement} */
	let proxyIf = document.querySelector(`iframe[data-proxy-page="${proxy}"]`);
	if(!proxyIf){
		proxyIf = document.createElement('iframe');
		proxyIf.src = proxy;
		proxyIf.style.display = 'none';
		proxyIf.style.visibility = 'hidden';
		proxyIf.onload = makeRequest;
		proxyIf.setAttribute('data-proxy-page',proxy);
		document.body.appendChild(proxyIf);
	}else{
		makeRequest();
	}
};
//their site----------------------------------------------------------------------
/**@type {String[]} */
let whiteList;
/**
 * @param {String[]} list 
 */
const fProxy = function(list){
	whiteList = list;
	listenSession(function(source,origin,data,reply){
		let inList = false;
		forEach(whiteList,(val)=>{
			if(val===origin){
				inList = true;
				return false;
			}
		});
		if(!inList){
			console.log(`${origin} was blocked.`);
			return;
		}
		console.log({source,origin,data});
		xhrmaker(data.url,data.method,data.isAsync,data.data,data.xhrProp,data.headers,function(){
			console.log(this);
			let headerArr = this.getAllResponseHeaders().match(/[^\r\n]+/g);
			let headers = {};
			forEach(headerArr,header=>{
				let [,key,val] = header.match(/([^\:]+)\:\s(.+)/);
				headers[key] = val;
			});
			reply({
				headers,
				response:this.response,
				responseText:this.responseText,
				responseType:this.responseType,
				responseURL:this.responseURL,
				status:this.status,
				statusText:this.statusText,
			});
		});
	});
};

export {xhrmaker,fProxy,fRequest,onEvent};
