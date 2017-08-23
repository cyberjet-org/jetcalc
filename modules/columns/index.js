var MColumns = (new function () {

    var self = new Module("columns");

    self.IsAvailable = function () {
        return PermChecker.CheckPrivelegeAny(["IsColumnEditor", "IsColsetEditor", "IsHeaderEditor"]);
    }

    self.ColsetCols = ko.observableArray();

    self.LoadColset = function () {
        self.ColsetCols([]);
        var CodeColset = ModelTableEdit.LoadedModel().CodeColset();
        self.rGet("colsetcol", {
            CodeColset: CodeColset
        }, function (data) {
            self.ColsetCols(_.map(data, function (d) {
                return MModels.Create("colsetcol", d);
            }));
        })
    }

    self.RemoveColset = function (data) {
        self.ColsetCols.remove(data);
    }

    self.AddColsetCol = function () {
        var CodeColset = ModelTableEdit.LoadedModel().CodeColset();
        self.ColsetCols.push(MModels.Create("colsetcol", {
            CodeColset: CodeColset,
            IsEdit: true
        }));
    }

    self.SaveColsetCols = function () {
        var Code = ModelTableEdit.LoadedModel().CodeColset();
        var ColsetCols = [];
        var Data = {
            CodeColset: Code,
            Cols: _.map(self.ColsetCols(), function (Model) {
                return _.merge(_.pick(Model.toJS(), Model.EditFields), {
                    CodeColset: Code
                });
            })
        };
        self.rPut("colsetcol", Data, function () {
            self.LoadColset();
        })
    }


    self.Tree = ko.observable(null);

    self.LoadHeadersTree = function (done) {
        self.rGet("headerstree", {}, function (data) {
            self.Tree(data);
            return done && done();
        })
    }

    self.BeforeShow = function () {
        self.Subscribe();
        self.Show();
    }

    self.BeforeHide = function () {
        self.UnSubscribe();
    }

    self.ModelIsLoaded = function () {
        switch (self.Mode()) {
            case "ColSet":
                self.ColsetCols([]);
                self.LoadColset();
                break;
        }
    }

    self.ModelIsCreated = function () {
        switch (self.Mode()) {
            case "ColSet":
                self.ColsetCols([]);
                break;
        }
    }

    self.ModelIsSaved = function () {
        switch (self.Mode()) {
            case 'ColSet':
                self.SaveColsetCols();
                break;
            case 'Header':
                self.LoadHeadersTree();
                break;
        }
    }

    self.Show = function (done) {
        if (!self.Mode()) return self.InitSetMode("Cols");
        switch (self.Mode()) {
            case "Cols":
                ModelTableEdit.InitModel("col");
                break;
            case "Header":
                self.LoadHeadersTree(function () {
                    ModelTreeEdit.Init({
                        model: "header",
                        Tree: self.Tree()
                    });
                })
                break;
            case "ColSet":
                ModelTableEdit.InitModel("colset");
                ModelTableEdit.IsExtendEditor(true);
                break;
        }
        return done && done()
    }

    return self;
})

ModuleManager.Modules.Columns = MColumns;
