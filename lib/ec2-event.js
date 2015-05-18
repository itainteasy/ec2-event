var AWS = require('aws-sdk');
var Q = require('q');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

function EC2(params, AWSOptions) {
  this.params = params;
  this.instances = new AWS.EC2(AWSOptions || {});
  this.instanceIds = [];
}

inherits(EC2, EventEmitter);

EC2.prototype.start = function() {
  if (this.instanceIds.length) {
    this._start();
  } else {
    this._run();
  }
}

EC2.prototype._start = function() {
  var self = this;
  var params = { InstanceIds: this.instanceIds };
  this.instances.startInstances(params, function(err, data) {
    if (err) {
      self.emit('error', err);
    } else {
      self.data = data;
      self.emit('starting', data);
    }
  });

}

EC2.prototype._run = function() {
  var self = this;
  this.instances.runInstances(this.params, function(err, data) {
    if (err) {
      self.emit('error', err);
    } else {
      self.data = data;
      _.each(data.Instances, function(instance) {
        self.instanceIds.push(instance.InstanceId)
      });
      self.emit('starting', data);
      self._waitForState('running', function() {
        self.emit('running', self.data);
      });
    }
  });
  return this;
};

EC2.prototype.stop = function() {
  var self = this;
  var params = { InstanceIds: this.instanceIds };
  this.instances.stopInstances(params, function(err, data) {
    if (err) {
      self.emit('error', err);
    } else {
      self.data = data;
      self.emit('stopping', data);
      self._waitForState('stopped', function() {
        self.emit('stopped', self.data);
      });
    }
  });
};

EC2.prototype.terminate = function(remove) {
  var self = this;
  var deferred = Q.defer();
  var params = { InstanceIds: this.instanceIds };
  this.instances.terminateInstances(params, function(err, data) {
    if (err) {
      self.emit('error', err);
      deferred.reject(new Error(err));
    } else {
      self.data = data;
      self.emit('terminating', data);
      self._waitForState('terminated', function() {
        if (remove) {
          self.instanceIds = [];
        }
        self.emit('terminated', self.data);
        deferred.resolve(self.data);
      });
    }
  });
  return deferred.promise;
};

EC2.prototype.describe = function() {
  var deferred = Q.defer();
  var self = this;
  var params = { InstanceIds: this.instanceIds };
  this.instances.describeInstances(params, function(err, data) {
    if (err) {
      self.emit('error', err);
      deferred.reject(new Error(err));
    } else {
      self.data = data;
      deferred.resolve(data);
    }
  });
  return deferred.promise;
};

EC2.prototype._waitForState = function(state, cb) {
  var self = this;
  this.state()
    .then(function(states) {
      if (_.all(states, function(s) { return s === state.toLowerCase(); })) {
        return cb();
      } else {
        setTimeout(self._waitForState.bind(self, state, cb), 1500);
      }
    });
};

EC2.prototype.state = function() {
  var deferred = Q.defer();
  this.describe()
    .then(function(data) {
      var states = _.map(data.Reservations[0].Instances, function(instance, i) {
        return instance.State.Name.toLowerCase();
      });
      deferred.resolve(states);
    })
  return deferred.promise;
};

EC2.prototype._waitForStateChange = function(cb, prev) {
  var self = this;
  this.state()
    .then(function(states) {
      if (prev && JSON.stringify(prev) !== JSON.stringify(states)) {
          return cb(states);
      } else {
        setTimeout(self._waitForStateChange.bind(self, cb, states), 1500);
      }
    });
};

module.exports = EC2;
