/*globals require, console, module */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    _ = require('lodash');

var NestedSetPlugin = function(schema, options) {
  options = options || {};
  schema.add({ lft     : {type: Number, min: 0} });
  schema.add({ rgt     : {type: Number, min: 0} });
  schema.add({ rowpath : {type : String  , default : null}});  
  schema.add({ treeroot : {type : String  , default : null, index: true}});  
  schema.index({lft: 1, rgt: 1});
  schema.index({rgt: 1});

  var updateConditions = function (conditions, item) {
    if (options.groupingKey) {
      conditions[options.groupingKey] = item[options.groupingKey];
    }
    return conditions;
  };

  schema.pre('save', function(next) {
    var self = this;
    if (self.IdParentRow) {
      self.parent(function(err, parentNode) {
        if (!err && parentNode && parentNode.lft && parentNode.rgt) {
          // find siblings and check if they have lft and rgt values set
          self.siblings(function(err, nodes) {
            if (nodes.every(function(node) { return node.lft && node.rgt;})) {
              var maxRgt = 0;
              nodes.forEach(function(node) {
                if (node.rgt > maxRgt) {
                  maxRgt = node.rgt;
                }
              });
              if (nodes.length === 0) {
                // if it is a leaf node, the maxRgt should be the lft value of the parent
                maxRgt = parentNode.lft;
              }
              var conditions = updateConditions({lft: { $gt: maxRgt}}, self);
              self.constructor.update(conditions, {$inc: {lft: 2}}, {multi: true}, function(err, updatedCount) {
                conditions = updateConditions({rgt: { $gt: maxRgt}}, self);
                self.constructor.update(conditions, {$inc: {rgt: 2}}, {multi: true}, function(err, updatedCount2) {
                  self.lft = maxRgt + 1;
                  self.rgt = maxRgt + 2;
                  next();
                });
              });
            } else {
              // the siblings do not have lft and rgt set. This means tree was not build.
              // warn on console and move on.
               //console.log('WARNING: tree is not built for ' + modelName + ' nodes. Siblings does not have lft/rgt');
              next();
            }
          });
        } else {
          // parent node does not have lft and rgt set. This means tree was not built.
          // warn on console and move on.
           //console.log('WARNING: tree is not built for ' + modelName + ' nodes. Parent does not have lft/rgt');
          next();
        }
      });
    } else {
      // no IdParentRow is set, so ignore
      next();
    }
  });

  schema.pre('remove', function(next) {
    var self = this;
    if (self.IdParentRow) {
      self.parent(function(err, parentNode) {
        if (!err && parentNode && parentNode.lft && parentNode.rgt) {

          // find siblings and check if they have lft and rgt values set
          self.siblings(function(err, nodes) {
            if (nodes.every(function(node) { return node.lft && node.rgt;})) {
              var maxRgt = 0;
              nodes.forEach(function(node) {
                if (node.rgt > maxRgt) {
                  maxRgt = node.rgt;
                }
              });
              if (nodes.length === 0) {
                // if it is a leaf node, the maxRgt should be the lft value of the parent
                maxRgt = parentNode.lft;
              }
              var conditions = updateConditions({lft: { $gt: maxRgt}}, self);
              self.constructor.update(conditions, {$inc: {lft: -2}}, {multi: true}, function(err, updatedCount) {
                conditions = updateConditions({rgt: { $gt: maxRgt}}, self);
                self.constructor.update(conditions, {$inc: {rgt: -2}}, {multi: true}, function(err, updatedCount2) {
                  next();
                });
              });
            } else {
              // the siblings do not have lft and rgt set. This means tree was not build.
              // warn on console and move on.
              // console.log('WARNING: tree is not built for ' + modelName + ' nodes. Siblings does not have lft/rgt');
              next();
            }
          });
        } else {
          // parent node does not have lft and rgt set. This means tree was not built.
          // warn on console and move on.
          // console.log('WARNING: tree is not built for ' + modelName + ' nodes. Parent does not have lft/rgt');
          next();
        }
      });
    } else {
      // no IdParentRow is set, so ignore
      next();
    }
  });

  var counterToShow = 0;
  
  // Builds the tree by populating lft and rgt using the IdParentRows
  schema.static('rebuildTree', function(parent, left, callback) {
    var self = this;
    parent.lft = left;
    parent.rgt = left + 1;

    /*function initProgressBar(done){
      if (Bar) {
        Bar.tick();
        if (Bar.complete) {
          console.log('\ncomplete\n');
        }
        return done(); 
      }
      self.count().exec(function(err,cC){
        var ProgressBar = require('progress');
        Bar = new ProgressBar('Building Tree [:bar] :percent :etas', { total: cC });
        return done();
      })
    }*/
    
  // initProgressBar(function(){    
        self.find({IdParentRow: parent.IdRow}).sort('IndexRow NumRow').exec(function(err, children) {
          if (err) return callback(err);
          //console.log(++counterToShow);
          if (!children) return callback(new Error(self.constructor.modelName + ' not found'));
          self.find({lft:{$lt:parent.lft},rgt:{$gt:parent.rgt}},'-_id CodeRow').sort({lft:1}).lean().exec(function(err,cRs){
            var chain = _.map(cRs,"CodeRow"); chain.push(self.CodeRow);
            var rowPath = '/'+chain.join('/')+'/';
            //console.log(rowPath);
            self.update({IdRow: parent.IdRow}, {rowpath:rowPath}, function(){
              if (children.length > 0) {
                async.forEachSeries(children, function(item, cb) {
                  self.rebuildTree(item, parent.rgt, function() {
                    parent.rgt = item.rgt + 1;
                    self.update({IdRow: parent.IdRow}, {lft: parent.lft, rgt: parent.rgt}, cb);
                  });
                }, function(err) {
                  callback();
                });
              } else {
                self.update({IdRow: parent.IdRow}, {lft: parent.lft, rgt: parent.rgt}, callback);
              }
            });
          })
        });
  //  });
  });

  // Returns true if the node is a leaf node (i.e. has no children)
  schema.method('isLeaf', function() {
    return this.lft && this.rgt && (this.rgt - this.lft === 1);
  });

  // Returns true if the node is a child node (i.e. has a parent)
  schema.method('isChild', function() {
    return !!this.IdParentRow;
  });

  // Returns true if other is a descendant of self
  schema.method('isDescendantOf', function(other) {
    var self = this;
    return other.lft < self.lft && self.lft < other.rgt;
  });

  // Returns true if other is an ancestor of self
  schema.method('isAncestorOf', function(other) {
    var self = this;
    return self.lft < other.lft && other.lft < self.rgt;
  });

  // returns the parent node
  schema.method('parent', function(callback) {
    var self = this;
    self.constructor.findOne({ IdRow: self.IdParentRow }, callback);
  });

  // Returns the list of ancestors + current node
  schema.method('selfAndAncestors', function(filters, fields, options, callback) {
    var self = this;
    if ('function' === typeof filters) {
        callback = filters;
        filters = {};
    }
    else if ('function' === typeof fields) {
        callback = fields;
        fields = null;
    }
    else if ('function' === typeof options) {
        callback = options;
        options = {};
    }

    filters = filters || {};
    fields = fields || null;
    options = options || {};

    if(filters['$query']){
        filters['$query']['lft'] = { $lte: self.lft };
        filters['$query']['rgt'] = { $gte: self.rgt };
    } else {
        filters['lft'] = { $lte: self.lft };
        filters['rgt'] = { $gte: self.rgt };
    }
    self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of ancestors
  schema.method('ancestors', function(filters, fields, options, callback) {
    var self = this;
    if ('function' === typeof filters) {
        callback = filters;
        filters = {};
    }
    else if ('function' === typeof fields) {
        callback = fields;
        fields = null;
    }
    else if ('function' === typeof options) {
        callback = options;
        options = {};
    }

    filters = filters || {};
    fields = fields || null;
    options = options || {};

    if(filters['$query']){
        filters['$query']['lft'] = { $lt: self.lft };
        filters['$query']['rgt'] = { $gt: self.rgt };
    } else {
        filters['lft'] = { $lt: self.lft };
        filters['rgt'] = { $gt: self.rgt };
    }
    self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of children
  schema.method('children', function(filters, fields, options, callback) {
      var self = this;
      if ('function' === typeof filters) {
          callback = filters;
          filters = {};
      }
      else if ('function' === typeof fields) {
          callback = fields;
          fields = null;
      }
      else if ('function' === typeof options) {
          callback = options;
          options = {};
      }

      filters = filters || {};
      fields = fields || null;
      options = options || {};

      if(filters['$query']){
          filters['$query']['IdParentRow'] = self.IdRow;
      } else {
          filters['IdParentRow'] = self.IdRow;
      }
      self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of children + current node
  schema.method('selfAndChildren',function(filters, fields, options, callback) {
      var self = this;
      if ('function' === typeof filters) {
          callback = filters;
          filters = {};
      }
      else if ('function' === typeof fields) {
          callback = fields;
          fields = null;
      }
      else if ('function' === typeof options) {
          callback = options;
          options = {};
      }

      filters = filters || {};
      fields = fields || null;
      options = options || {};

      if(filters['$query']){
          filters['$query']['$or'] = [{ IdParentRow: self.IdRow }, {IdRow: self.IdRow }] ;
      } else {
          filters['$or'] = [{ IdParentRow: self.IdRow }, {IdRow: self.IdRow }];
      }
      self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of descendants + current node
  schema.method('selfAndDescendants', function(filters, fields, options, callback) {
    var self = this;
    if ('function' === typeof filters) {
        callback = filters;
        filters = {};
    }
    else if ('function' === typeof fields) {
        callback = fields;
        fields = null;
    }
    else if ('function' === typeof options) {
        callback = options;
        options = {};
    }

    filters = filters || {};
    fields = fields || null;
    options = options || {};

    if(filters['$query']){
        filters['$query']['lft'] = { $gte: self.lft };
        filters['$query']['rgt'] = { $lte: self.rgt };
    } else {
        filters['lft'] = { $gte: self.lft };
        filters['rgt'] = { $lte: self.rgt };
    }
    self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of descendants
  schema.method('descendants', function(filters, fields, options, callback) {
    var self = this;
    if ('function' === typeof filters) {
        callback = filters;
        filters = {};
    }
    else if ('function' === typeof fields) {
        callback = fields;
        fields = null;
    }
    else if ('function' === typeof options) {
        callback = options;
        options = {};
    }

    filters = filters || {};
    fields = fields || null;
    options = options || {};

    if(filters['$query']){
        filters['$query']['lft'] = { $gt: self.lft };
        filters['$query']['rgt'] = { $lt: self.rgt };
    } else {
        filters['lft'] = { $gt: self.lft };
        filters['rgt'] = { $lt: self.rgt };
    }
    self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of all nodes with the same parent + current node
  schema.method('selfAndSiblings', function(filters, fields, options, callback) {
      var self = this;
      if ('function' === typeof filters) {
          callback = filters;
          filters = {};
      }
      else if ('function' === typeof fields) {
          callback = fields;
          fields = null;
      }
      else if ('function' === typeof options) {
          callback = options;
          options = {};
      }

      filters = filters || {};
      fields = fields || null;
      options = options || {};

      if(filters['$query']){
          filters['$query']['IdParentRow'] = self.IdParentRow;
      } else {
          filters['IdParentRow'] = self.IdParentRow;
      }
      self.constructor.find(filters, fields, options, callback);
  });

  // Returns the list of all nodes with the same parent
  schema.method('siblings', function(filters, fields, options, callback) {
    var self = this;
    if ('function' === typeof filters) {
        callback = filters;
        filters = {};
    }
    else if ('function' === typeof fields) {
        callback = fields;
        fields = null;
    }
    else if ('function' === typeof options) {
        callback = options;
        options = {};
    }

    filters = filters || {};
    fields = fields || null;
    options = options || {};

    if(filters['$query']){
        filters['$query']['IdParentRow'] = self.IdParentRow;
        filters['$query']['IdRow'] = { $ne: self.IdRow } ;
    } else {
        filters['IdParentRow'] = self.IdParentRow;
        filters['IdRow'] = { $ne: self.IdRow } ;
    }
    self.constructor.find(filters, fields, options, callback);
  });

  // Returns the level of this object in the tree. Root level is 0
  schema.method('level', function(callback) {
    var self = this;
    self.ancestors(function(err, nodes) {
      callback(err, nodes.length);
    });
  });
};

module.exports = exports = NestedSetPlugin;