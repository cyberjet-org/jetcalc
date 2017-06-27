var mongoose = require('mongoose');
var _ = require('lodash');
var DocFolder = require(__base+'/classes/calculator/helpers/DocFolder.js');
var router   = require('express').Router();
var api            = require(__base+'/lib/helper.js');
var HP = require(__base+'lib/helpers/lib.js').Permits;


var FilterHelper = (new function(){
	var self = this;

	self.TreeEachFilter = function(Tree,filter_function){
		var Result = {};
		for (var K1 in Tree){
			for (var K2 in Tree[K1]){
				var Filtered  = filter_function(Tree[K1][K2]);
				if (Filtered.length){
					if (!Result[K1]) Result[K1] = {};
					Result[K1][K2] = Filtered;
				}
			}
		}
		return Result;
	}

	self.Filter = function(req, Data, done){
		var AvDocs = HP.AvDoc(req.session.permissions);
		Data.Tree = self.TreeEachFilter(Data.Tree,function(AllDocs){
			return  _.filter(AllDocs,function(O){
				return O && AvDocs.indexOf(O.CodeDoc)!=-1;
			})
		})
		self.FilterDesignTest(req, Data, done);
	}

	self.FilterDesignTest = function(req, Tree, done){
		return done(null,Tree);

		var FilteredTree = self.TreeEachFilter(Tree,function(AllDocs){
			return  _.filter(AllDocs,function(O){
				return !(O.IsTester || O.IsDesigner) 
				|| (O.IsTester && permit.CheckTask("IsTester",{CodeDoc:O.CodeDoc}))
				|| (O.IsDesigner && permit.CheckTask("IsDesigner",{CodeDoc:O.CodeDoc}))
			})
		})
		return done(null,FilteredTree);
	}


	return self;
})






router.get('/tree', api.requireAuth, function(req, res, next){
	var Helper = new DocFolder({UseCache:true});
	Helper.get(function(err,Data){
		FilterHelper.Filter(req, Data, function(err,Filtered){
			if (err) return next(err);
			return res.json(Filtered);
		})
	})
})

module.exports = router;