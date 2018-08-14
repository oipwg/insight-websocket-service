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

WebsocketAPI.prototype.transactionEventHandler = function(tx) {
  var only_output_tx = {vout: []}, input_as_output_tx = {vout: []}

  var tx_txid

  for(var serve in this.node.services){
    if (this.node.services[serve].txController){
      // Get correct addresses for outputs
      only_output_tx = this.node.services[serve].txController.transformInvTransaction(tx)

      tx_txid = only_output_tx.txid

      input_as_output_tx = tx

      input_as_output_tx.outputs = []

      var inputs = tx.inputs

      for (var input of inputs)
        input_as_output_tx.outputs.push(input)

      // Get correct addresses for inputs
      input_as_output_tx = this.node.services[serve].txController.transformInvTransaction(input_as_output_tx);
    }
  }
  
  // Grab the correct addresses to broadcast to from the tx's 
  // created by the two `transformInvTransaction` methods above
  var output_addresses = only_output_tx.vout
  var input_addresses = input_as_output_tx.vout

  // Track events that we have emitted this round so that we don't emit them twice confusingly.
  var emitted = [];

  // Emit events to output addresses
  for (var out of output_addresses){
    for (var out_addr in out){
      try {
        this.node.services.address.getAddressSummary(out_addr, { noTxList: 1 }, (err, data) => {
          // If for some reason there is an error, or some issue, don't try to progress.
          if (err || !data)
            return

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
      } catch (e) {
        // Likely an error where the address is BECH32 and not a regular Base58
        // Emit that there was an update, but without address data
        var new_data = {
          type: "seen_in_tx_output",
          txid: tx_txid,
          address: out_addr
        }
        
        if (emitted.indexOf(new_data) === -1){
          emitted.push(new_data)
          this.node.services.web.io.emit(out_addr, new_data)
        }
      }
    }
  }

  // Emit events to input addresses
  for (var inp in input_addresses){
    for (var in_addr in inp){
      try {
        this.node.services.address.getAddressSummary(in_addr, { noTxList: 1 }, (err, data) => {
          // If for some reason there is an error, or some issue, don't try to progress.
          if (err || !data)
            return

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
      } catch (e) {
        // Likely an error where the address is BECH32 and not a regular Base58
        // Emit that there was an update, but without address data
        var new_data = {
          type: "seen_in_tx_input",
          txid: tx_txid,
          address: out_addr
        }
        
        if (emitted.indexOf(new_data) === -1){
          emitted.push(new_data)
          this.node.services.web.io.emit(in_addr, new_data)
        }
      }
    }
  }
};

module.exports = WebsocketAPI;