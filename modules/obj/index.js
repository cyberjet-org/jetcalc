var MObj = (new function() {
    
    var self = new Module("obj"); 

    self.IsAvailable = function(){
        return PermChecker.CheckPrivelege("IsObjTunner");
    }

    self.BeforeShow = function(){
        self.Subscribe();
        self.Show();
    }

    self.BeforeHide = function(){
        self.UnSubscribe();
    } 

    self.ModelIsCreated = function(){

    }

    self.ModelIsLoaded = function(){

    }

    self.ModelIsSaved = function(){

    }
    
    self.ObjGrps = ko.observableArray();

    self.LoadObjGrp = function(){
        self.ColsetCols([]); 
        var CodeGrp = ModelTableEdit.LoadedModel().CodeGrp(); 
        self.rGet("objgrps",{CodeGrp:CodeGrp},function(data){
            self.ColsetCols(data);
        })
    } 


    self.Mode.subscribe(function(){
        self.Show();
    })

    self.SaveChanges = function(){
        self.IsLoading(true);
        self.IsLoading(false);
    }


    self.Show = function(done){ 
        if (!self.Mode()) return self.InitSetMode("Objs");
        switch (self.Mode()){
            case "ObjTypes":
                ModelTableEdit.InitModel("objtype");
            break;                 
            case "ObjClasses":
                ModelTableEdit.InitModel("objclass");
            break;            
            case "Objs":
                ModelTableEdit.InitModel("obj",["CodeObj","NameObj","CodeObjType","CodeValuta"],{IndexObj:1});
                ModelTableEdit.ForceEditFields = [
                    "CodeObj","NameObj","IndexObj","Comment","CodeParentObj","CodeOrg","CodeObjType","CodeValuta","DateBegin","DateEnd"
                ];
                ModelTableEdit.EditLinks(["objgrp","objtag"]); 
            break;
            case "Grps":
                ModelTableEdit.InitModel("grp");
                ModelTableEdit.ForceEditFields = [
                    "CodeGrp", "NameGrp", "IsAgGroup", "Idx"
                ]
                ModelTableEdit.EditLinks(["objgrp"]); 
            break;
        }
        return done && done()
    }  


    
    return self;
})







ModuleManager.Modules.Obj = MObj;