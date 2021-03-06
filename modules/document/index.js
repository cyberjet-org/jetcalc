var MDocument = (new function() {

  var self = new Module("document");


  self.IsAvailable = function() {
    return PermChecker.CheckPrivelege("IsDocumentCreator");
  }


  self.BeforeHide = function() {
    self.UnSubscribe()
  }

  self.BeforeShow = function() {
    self.Subscribe();
    self.Show();
  }

  self.ModelIsLoaded = function() {

  }

  self.ModelIsSaved = function() {
    if (self.Mode() == "Folders") {
      self.LoadFolders();
    }
  }

  self.ModelIsCreated = function() {

  }

  self.ModelIsDeleted = function() {
    if (self.Mode() == "Folders") {
      self.LoadFolders();
    }
  }


  self.FolderStructure = ko.observable(null);

  self.LoadFolders = function(done) {
    console.log("reload folders");
    self.rGet("folders", {}, function(List) {
      var Tree = {};
      var FirstLevel = _.filter(List, {
        CodeParentDocFolder: ""
      });
      FirstLevel.forEach(function(FL) {
        Tree[FL.CodeDocFolder] = {
          text: "<i class='ace-icon fa " + FL.Icon + " orange'></i> " + FL.NameDocFolder + "." + FL.CodeDocFolder,
          model: "docfolder",
          code: FL.CodeDocFolder,
          type: 'folder',
          'icon-class': 'red',
          additionalParameters: {
            children: {}
          }
        };
      })
      List.forEach(function(F) {
        if (F.CodeParentDocFolder != "") {
          Tree[F.CodeParentDocFolder]['additionalParameters'].children[F.CodeDocFolder] = {
            text: "<i class='ace-icon fa " + F.Icon + " green'></i> " + F.NameDocFolder + "." + F.CodeDocFolder,
            type: 'item',
            'icon-class': 'green',
            model: "docfolder",
            code: F.CodeDocFolder,
            additionalParameters: {
              children: {}
            }
          };
        }
      })
      self.FolderStructure(Tree);
      return done && done();
    })
  }

  self.SaveChanges = function() {
    self.IsLoading(true);
    self.IsLoading(false);
  }

  self.Show = function(done) {
    if (!self.Mode()) return self.InitSetMode("Docs");
    switch (self.Mode()) {
      case "Roles":
        ModelTableEdit.InitModel("role", {
          IsExtended: 1,
          CodeRole: 1
        });
        break;
      case "Root":
        ModelTableEdit.InitModel("row", {
          CodeRow: 1
        }, {
          CodeParentRow: {
            $in: [null, ""]
          }
        });
        break;
      case "Folders":
        self.LoadFolders(function() {
          ModelTreeEdit.Init({
            model: "docfolder",
            parent_code_field: "CodeParentDocFolder",
            Tree: self.FolderStructure(),
            wrapper: function(el) {
              if (el.CodeParentDocFolder != '') {
                return "<i class='ace-icon fa " + el.Icon + " green'></i> " + el.NameDocFolder + "." + el.CodeDocFolder
              } else {
                return "<i class='ace-icon fa " + el.Icon + " orange'></i> " + el.NameDocFolder + "." + el.CodeDocFolder
              }
            }
          });
        })
        break;
      case "Labels":
        ModelTableEdit.InitModel("label");
        break;
      case "DocTypes":
        ModelTableEdit.InitModel("doctype");
        break;
      case "Docs":
        ModelTableEdit.InitModel("doc", {
          IndexDoc: 1
        });
        break;
    }
    return done && done()
  }


  return self;
})





ModuleManager.Modules.Document = MDocument;
