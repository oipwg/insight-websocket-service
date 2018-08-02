# insight-websocket-service
Add more WebSocket functionality to Insight servers!

## How to Install
On the `bitcore`/`litecore`/`flocore` server that you wish to install it on, go into the directory of your node that you created.

1. Inside of your created `node` directory, install this service by running the following command
```
npm install --save https://github.com/oipwg/insight-websocket-service
```
2. Modify your `(bit/lite/flo)core-node.json` config to add the service to both the services array, and add a service config.

*Sample Modified Config*
```json
{
  "version": "5.0.0-beta.69",
  "network": "testnet",
  "port": 3001,
  "services": [
    "header",
    "block",
    "db",
    "fee",
    "address",
    "mempool",
    "p2p",
    "timestamp",
    "transaction",
    "insight-api",
    "insight-ui",
    "web",
    "insight-websocket-service"
  ],
  "datadir": "/home/bitc/bitcore/testnet/data",
  "servicesConfig": {
    "insight-websocket-service": {
      "cwdRequirePath": "node_modules/insight-websocket-service/src"
    },
    "insight-api": {
      "routePrefix": "api",
      "cwdRequirePath": "node_modules/insight-api"
    },
    "insight-ui": {
      "routePrefix": "",
      "cwdRequirePath": "node_modules/insight-ui"
    }
  }
}
```

3. Now that you have downloaded the service and modified your config, go ahead and start your node back up.

## Websocket API

The web socket API is served using socket.io.

### Listen to Address Updates
Whenever a transaction comes in, we emit updated address data for each address involved in the transaction on the `<address>` event. Just listen on the address you want to hear updates for.
#### Example
```javascript
var socketio = require('socket.io-client')

var socket = socketio("https://insight-server-url")

socket.on('connect', function(){
	socket.on("odqpABssS7twQfwqNhQdb58c8RiG6awnCh", function(data){
		console.log("odqpABssS7twQfwqNhQdb58c8RiG6awnCh: ", data)
	})
});
```

