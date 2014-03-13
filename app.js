/**
 * Module dependencies.
 */

var _ = require('underscore');
var express = require('express');
var http = require('http');
var redis = require('redis');
var app = express();
var server = app.listen(3000);
var path = require('path');
var redisClient = redis.createClient();
var io = require('socket.io').listen(server);

var connections = [];

// serve static index.html that connects to our server via web sockets
app.get('/', function (req, res) {
  res.sendfile(path.join(__dirname, 'public', 'index.html'));
});


// track list of connected clients and keep state data for the 'filter' criteria on each socket
io.on('connection', function(socket){
  connections.push(socket);
  socket.on('filter', function(data) {
    socket.set('filter', data);
  });
});


// Redis pub/sub, subscribe to channel called transactions
redisClient.subscribe('transactions');

// listen for messages and broadcast to each connected client, checking filter criteria
redisClient.on('message', function (channel, message) {
  var messageAsJSON;
  _.each(connections, function(socket) {
    socket.get('filter', function(err, filter) {
      messageAsJSON = JSON.parse(message);
      if (isMatch(filter, messageAsJSON)) {
        socket.emit(channel, message);
      } else {
        console.log('Message filtered out.');
      }
    });
  });
});

// assumes
function isMatch(filter, jsonMsg) {
  if (_.findWhere(jsonMsg.inputs, filter)) {
    return true;
  }

  if (_.findWhere(jsonMsg.outputs, filter)) {
    return true;
  }

  return false;
}


