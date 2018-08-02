'use strict';

var BaseService = require('./service');
var inherits = require('util').inherits;

var EventEmitter = require('events').EventEmitter;

/**
 * A service for Flocore to enable websocket address updationg.
 *
 * @param {Object} options
 */
var WebsocketAPI = function(options) {
  BaseService.call(this, options);

  this.subscriptions = {
    addresses: {}
  };
};

WebsocketAPI.dependencies = ['mempool', 'address', 'web'];

inherits(WebsocketAPI, BaseService);

WebsocketAPI.prototype.start = function(callback) {
  if (this._subscribed) {
    return;
  }

  this._subscribed = true;

  if (!this._bus) {
    this._bus = this.node.openBus({remoteAddress: 'localhost-websocket-api'});
  }

  this._bus.on('mempool/transaction', this.transactionEventHandler.bind(this));
  this._bus.subscribe('mempool/transaction');

  callback();
};

WebsocketAPI.prototype.getPublishEvents = function() {
  return [
    {
      name: 'addressUpdater',
      scope: this,
      subscribe: this.subscribe.bind(this),
      unsubscribe: this.unsubscribe.bind(this)
    }
  ];
};


WebsocketAPI.prototype.transactionEventHandler = function(tx) {
  var only_output_tx, input_as_output_tx

  var tx_txid

  for(var serve in this.node.services){
    if (this.node.services[serve].txController){
      only_output_tx = this.node.services[serve].txController.transformInvTransaction(tx)

      tx_txid = only_output_tx.txid

      input_as_output_tx = tx

      input_as_output_tx.outputs = []

      var inputs = tx.inputs

      for (var input of inputs)
        input_as_output_tx.outputs.push(input)

      input_as_output_tx = this.node.services[serve].txController.transformInvTransaction(input_as_output_tx);
    }
  }
  
  var output_addresses = only_output_tx.vout
  var input_addresses = input_as_output_tx.vout

  var emitted = [];

  for (var out of output_addresses){
    for (var out_addr in out){
      this.node.services.address.getAddressSummary(out_addr, { noTxList: 1 }, (err, data) => {
        var new_data = {
          type: "seen_in_tx_output",
          txid: tx_txid,
          updated_data: data
        }
        
        if (emitted.indexOf(new_data) === -1){
          emitted.push(new_data)
          this.node.services.web.io.emit(data.addrStr, new_data)
        }
      })
    }
  }

  for (var inp in input_addresses){
    for (var in_addr in inp){
      this.node.services.address.getAddressSummary(in_addr, { noTxList: 1 }, (err, data) => {
        var new_data = {
          type: "seen_in_tx_input",
          txid: tx_txid,
          updated_data: data
        }
        
        if (emitted.indexOf(new_data) === -1){
          emitted.push(new_data)
          this.node.services.web.io.emit(data.addrStr, new_data)
        }
      })
    }
  }
};

WebsocketAPI.prototype.subscribe = function(emitter, subscribe_to_address) {
  if (!(emitter instanceof EventEmitter))
    throw new Error('First argument is expected to be an EventEmitter');

  if (typeof subscribe_to_address !== "string") 
    throw new Error('Second argument is expected to be a String! (address)');

  if (!this.subscriptions.addresses[subscribe_to_address])
    this.subscriptions.addresses[subscribe_to_address] = []

  var index = this.subscriptions.addresses[subscribe_to_address].indexOf(emitter);
  if(index === -1) {
    this.subscriptions.addresses[subscribe_to_address].push(emitter);
  }
};

WebsocketAPI.prototype.unsubscribe = function(emitter) {
  // var emitters = this.subscriptions.inv;
  // var index = emitters.indexOf(emitter);

  // for (var sub_address in this.subscriptions.addresses)
  // if(index > -1) {
  //   emitters.splice(index, 1);
  // }
};

module.exports = WebsocketAPI;