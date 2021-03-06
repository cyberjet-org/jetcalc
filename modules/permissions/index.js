var MPermissions = (new function() {

    var self = new Module("permissions");

    self.LoadUserPermissions = function(done) {
        self.rGet("current", {},function(data) {
            PermChecker.P = data;
            return done && done();
        })
    }

    self.RefreshPermissions = function() {
        self.rPost("refresh",{},function(){
            self.LoadUserPermissions(function() {
                Bus.Emit("permissions_refresh");
            })
        })
    }

    self.Events = new EventEmitter();



    self.Init = function(done) {
        self.LoadUserPermissions(function() {
            self.Events.emit("permissionsloaded");
            MSocket.RegisterEvent('permissions_refresh', self.RefreshPermissions);
            MSocket.Start('permissions_refresh');
            return done && done();
        });
    }

    return self;
});

ModuleManager.Modules.Permissions = MPermissions;

ko.bindingHandlers.Permit = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var Allow = false,
            cx = CxCtrl.CxPermDoc();
        if (value.Type == "Model") {
            Allow = PermChecker.ModelAccess(value.Id);
        } else if (value.Type == "Task") {
            Allow = PermChecker.CheckPrivelege(value.Id, cx);
        } else if (value.Type == "UserTask") {
            var Check = [];
            if (value.CodeOrg) Check.push(value.CodeOrg);
            if (value.CodeUser) {
                var Info = PermChecker.P.Tr.UsrOrgs;
                for (var CodeOrg in Info) {
                    if (Info[CodeOrg].indexOf(value.CodeUser) != -1) {
                        Check.push(CodeOrg);
                    }
                }
            }
            if (Check.length) {
                Check.forEach(function(CodeOrg) {
                    Allow = Allow || PermChecker.CheckPrivelege(value.Id, _.merge(_.clone(cx), {
                        CodeOrg: CodeOrg
                    }));
                })
            } else {
                Allow = PermChecker.CheckPrivelege(value.Id, cx);
            }
        } else {
            Allow = PermChecker.CheckDocAccess(value.Id, cx);
        }
        if (!Allow) $(element).css("display", "none");
    }
};
