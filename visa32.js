'use strict';

/*!
 * Visa32 SCPI interface for node.js
 *
 * @author   Juergen Skrotzky <JorgenVikingGod@gmail.com>
 * @license  MIT
 */
 
// modules
var ref             = require('ref');
var ffi             = require('ffi-napi');
var ArrayType       = require('ref-array');
var assert          = require('assert');
// typedef
var ViStatus        = ref.types.int;
var ViSession       = ref.types.int;
var intPtr          = ref.refType('int');
var CharArray       = ArrayType('char');
var refCharArray    = ref.refType(CharArray);
var ViFindList      = ref.refType(ref.types.long);

// library

var visadll         = [__dirname, "\\lib\\visa", process.arch.replace("x",""),".dll"].join("");
var visa32          = ffi.DynamicLibrary(visadll);
var resourceManager = 0;
var sessionDevice   = 0;
var viStatus        = 0;
// exported methods  
module.exports = {
  openDefaultRM:  function(callback){                           return visaOpenDefaultRM(callback);                   },
  open:           function(visaSession, visaAddress, callback){ return visaOpen(visaSession, visaAddress, callback);  },
  close:          function(visaSession, callback){              return visaClose(visaSession, callback);              },
  write:          function(visaSession, queryString, callback){ return visaWrite(visaSession, queryString, callback); },
  read:           function(visaSession, callback){              return visaRead(visaSession, callback);               },
  query:          function(visaAddress, queryString, callback){ return visaQuery(visaAddress, queryString, callback); },
  exec:           function(visaSession, queryString, callback){ return visaExec(visaSession, queryString, callback);  },
  visaFindRsrc:   function(callback){ return visaFindRsrc(callback); },
}

// implementation
function visaOpenDefaultRM(callback){
  assert.equal(typeof (callback), 'function');
  // exported methods
  var viOpenDefaultRMPointer = visa32.get('viOpenDefaultRM');
  // method definition
  var viOpenDefaultRM = ffi.VariadicForeignFunction(viOpenDefaultRMPointer, ViStatus, [intPtr]);
  // open default resource manager
  var outNumberMaster = ref.alloc('int');
  viStatus = viOpenDefaultRM()(outNumberMaster);
  resourceManager = outNumberMaster.deref();
  if (viStatus) return callback(viStatus);
  // return session
  callback(null, resourceManager);
}



// implementation
function visaFindRsrc(callback){
  assert.equal(typeof (callback), 'function');
  // exported methods
  var viFindRsrcPointer = visa32.get('viFindRsrc');
  var viOpenDefaultRMPointer  = visa32.get('viOpenDefaultRM');

  // method definition
  var viFindRsrc = ffi.VariadicForeignFunction(viFindRsrcPointer, ViStatus, [ViSession, 'string', ViFindList, 'int', 'string']);
  var viOpenDefaultRM = ffi.VariadicForeignFunction(viOpenDefaultRMPointer, ViStatus, [intPtr]);


  // open session to device
  var findList = ref.alloc('long');
  var counts   = ref.alloc('int')
  var desc     = ref.alloc('char')
  var outNumberMaster = ref.alloc('int');
  viStatus = viOpenDefaultRM()(outNumberMaster);
  var visaSession = outNumberMaster.deref();

  viStatus = viFindRsrc()(visaSession,'0', findList, counts, desc);
  console.log("visaFindRsrc", findList, counts, desc)
  var _counts = desc.deref();
  if (viStatus) return callback(viStatus);
  // return session
  callback(null, _counts);
}



function visaOpen(visaSession, visaAddress, callback){
  //assert.equal(typeof (visaSession), 'int',    'argument "visaSession" must be a int');
  assert.equal(typeof (visaAddress), 'string', 'argument "visaAddress" must be a string');
  assert.equal(typeof (callback), 'function');
  // exported methods
  var viOpenPointer = visa32.get('viOpen');
  // method definition
  var viOpen = ffi.VariadicForeignFunction(viOpenPointer, ViStatus, [ViSession, 'string', 'int', 'int', intPtr]);
  // open session to device
  var outNumberSession = ref.alloc('int');
  viStatus = viOpen()(visaSession, visaAddress, '0', '2000', outNumberSession);
  sessionDevice = outNumberSession.deref();
  if (viStatus) return callback(viStatus);
  // return session
  callback(null, sessionDevice);
}

function visaWrite(visaSession, queryString, callback){
  //assert.equal(typeof (visaSession), 'int',    'argument "visaSession" must be a int');
  assert.equal(typeof (queryString), 'string', 'argument "queryString" must be a string');
  assert.equal(typeof (callback), 'function');
  var queryStr = queryString + '\n';
  // exported methods
  var viWritePointer = visa32.get('viWrite');
  // method definition
  var viWrite = ffi.VariadicForeignFunction(viWritePointer, ViStatus, [ViSession, 'string', 'int', intPtr]);
  // write query to device
  var outNumberBuffLen = ref.alloc('int');
  viStatus = viWrite()(visaSession, queryStr, queryStr.length, outNumberBuffLen);
  var buffLen = outNumberBuffLen.deref();
  if (viStatus) return callback(viStatus);
  // return true
  callback(null, true);
}

function visaRead(visaSession, callback){
  //assert.equal(typeof (visaSession), 'int', 'argument "visaSession" must be a int');
  assert.equal(typeof (callback), 'function');
  // exported methods
  var viReadPointer = visa32.get('viRead');
  // method definition
  var viRead = ffi.VariadicForeignFunction(viReadPointer, ViStatus, [ViSession, refCharArray, 'int', intPtr]);
  // read back query result
  var outNumberReadBuffLen = ref.alloc('int');  
  var outReadBuffer = Buffer.alloc(512);
  outReadBuffer.type = ref.types.char;
  viStatus = viRead()(visaSession, outReadBuffer, outReadBuffer.length, outNumberReadBuffLen);
  var readBuffLen = outNumberReadBuffLen.deref();
  var returnBuffer = ref.reinterpret(outReadBuffer, readBuffLen, 0);
  if (viStatus) return callback(viStatus);
  // return query result
  callback(null, returnBuffer.toString());
}

function visaClose(visaSession, callback){
  //assert.equal(typeof (visaSession), 'int', 'argument "visaSession" must be a int');
  assert.equal(typeof (callback), 'function');
  // exported methods
  var viClosePointer = visa32.get('viClose');
  // method definition
  var viClose = ffi.VariadicForeignFunction(viClosePointer, ViStatus, [ViSession]);
  // close session
  viClose()(visaSession);
  // return true
  callback(null, true);
}

function visaQuery(visaAddress, queryString, callback){
  assert.equal(typeof (visaAddress), 'string', 'argument "visaAddress" must be a string');
  assert.equal(typeof (queryString), 'string', 'argument "queryString" must be a string');
  assert.equal(typeof (callback), 'function');
  var queryStr = queryString + '\n';
  // exported methods
  var viOpenDefaultRMPointer  = visa32.get('viOpenDefaultRM');
  var viOpenPointer           = visa32.get('viOpen');
  var viWritePointer          = visa32.get('viWrite');
  var viReadPointer           = visa32.get('viRead');
  var viClosePointer          = visa32.get('viClose');
  // method definition
  var viOpenDefaultRM = ffi.VariadicForeignFunction(viOpenDefaultRMPointer, ViStatus, [intPtr]);
  var viOpen          = ffi.VariadicForeignFunction(viOpenPointer,          ViStatus, [ViSession, 'string', 'int', 'int', intPtr]);
  var viWrite         = ffi.VariadicForeignFunction(viWritePointer,         ViStatus, [ViSession, 'string', 'int', intPtr]);
  var viRead          = ffi.VariadicForeignFunction(viReadPointer,          ViStatus, [ViSession, refCharArray, 'int', intPtr]);
  var viClose         = ffi.VariadicForeignFunction(viClosePointer,         ViStatus, [ViSession]);
  // open default resource manager
  var outNumberMaster = ref.alloc('int');
  viStatus = viOpenDefaultRM()(outNumberMaster);
  resourceManager = outNumberMaster.deref();
  if (viStatus) return callback(viStatus);
  // open session to device
  var outNumberSession = ref.alloc('int');
  viStatus = viOpen()(resourceManager, visaAddress, '0', '2000', outNumberSession);
  sessionDevice = outNumberSession.deref();
  if (viStatus) return callback(viStatus);
  // write query to device
  var outNumberBuffLen = ref.alloc('int');
  viStatus = viWrite()(sessionDevice, queryStr, queryStr.length, outNumberBuffLen);
  var buffLen = outNumberBuffLen.deref();
  if (viStatus) return callback(viStatus);
  // read back query result
  var outNumberReadBuffLen = ref.alloc('int');  
  var outReadBuffer = Buffer.alloc(512);
  outReadBuffer.type = ref.types.char;
  viStatus = viRead()(sessionDevice, outReadBuffer, outReadBuffer.length, outNumberReadBuffLen);
  var readBuffLen = outNumberReadBuffLen.deref();
  var returnBuffer = ref.reinterpret(outReadBuffer, readBuffLen, 0);
  if (viStatus) return callback(viStatus);
  // close session of device and resource manager
  viClose()(sessionDevice);
  viClose()(resourceManager);
  // return query result
  callback(null, returnBuffer.toString());
}

function visaExec(visaAddress, queryString, callback){
  assert.equal(typeof (visaAddress), 'string', 'argument "visaAddress" must be a string');
  assert.equal(typeof (queryString), 'string', 'argument "queryString" must be a string');
  assert.equal(typeof (callback), 'function');
  var queryStr = queryString + '\n';
  // exported methods
  var viOpenDefaultRMPointer  = visa32.get('viOpenDefaultRM');
  var viOpenPointer           = visa32.get('viOpen');
  var viWritePointer          = visa32.get('viWrite');
  var viClosePointer          = visa32.get('viClose');
  // method definition
  var viOpenDefaultRM = ffi.VariadicForeignFunction(viOpenDefaultRMPointer, ViStatus, [intPtr]);
  var viOpen          = ffi.VariadicForeignFunction(viOpenPointer,          ViStatus, [ViSession, 'string', 'int', 'int', intPtr]);
  var viWrite         = ffi.VariadicForeignFunction(viWritePointer,         ViStatus, [ViSession, 'string', 'int', intPtr]);
  var viClose         = ffi.VariadicForeignFunction(viClosePointer,         ViStatus, [ViSession]);
  // open default resource manager
  var outNumberMaster = ref.alloc('int');
  viStatus = viOpenDefaultRM()(outNumberMaster);
  resourceManager = outNumberMaster.deref();
  if (viStatus) return callback(viStatus);
  // open session to device
  var outNumberSession = ref.alloc('int');
  viStatus = viOpen()(resourceManager, visaAddress, '0', '2000', outNumberSession);
  sessionDevice = outNumberSession.deref();
  if (viStatus) return callback(viStatus);
  // write query to device
  var outNumberBuffLen = ref.alloc('int');
  viStatus = viWrite()(sessionDevice, queryStr, queryStr.length, outNumberBuffLen);
  var buffLen = outNumberBuffLen.deref();
  if (viStatus) return callback(viStatus);
  // close session of device and resource manager
  viClose()(sessionDevice);
  viClose()(resourceManager);
  // return true on success
  callback(null, true);
}
