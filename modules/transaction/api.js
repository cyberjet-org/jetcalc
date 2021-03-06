var mongoose = require('mongoose');
var router = require('express').Router();
var _ = require('lodash');
var async = require('async');
var moment = require('moment');
var LIB = require(__base + 'lib/helpers/lib.js');
var HP = LIB.Permits;

router.get('/docrelations', function(req, res, next) {
    var Fields = ['CodeDocRelation', 'CodeDocSourse', 'CodeDocTarget', 'Link_colrelation'];
    mongoose.model('docrelation').find({}, Fields.join(" ")).isactive().lean().exec(function(err, Data) {
        if (err) return next(err);
        return res.json(Data);
    })
})

router.get('/colrelations', function(req, res, next) {
    var Fields = ['CodeColRelation', 'CodeColSource', 'CodeColTarget', 'CodeDocRelation'];
    mongoose.model('colrelation').find({}, Fields.join(" ")).isactive().lean().exec(function(err, Data) {
        if (err) return next(err);
        return res.json(Data);
    })
})


module.exports = router;
