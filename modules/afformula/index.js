var MAFFormula = (new function(){

	var self = new Module("afformula");

	self.IsSaveAvailableFlag = ko.observable(false);

	self.IsAFAvailable = function(){
		return PermChecker.CheckPrivelege("IsAFSaveAllow") && MInput.CheckValuta();
	}

	self.IsSaveAvailable = function(){
		return self.IsSaveAvailableFlag() && self.IsAFAvailable();
	}

	self.Path = ko.observableArray();

	self.ShowPath = function(){
		self.rGet("afpath",{Context:CxCtrl.CxPermDoc()},function(Route){
			var ArrToFill = [], Used = [];
			var start = Route[CxCtrl.CodeDoc()];
			var breakCounter = 10;
			while(!_.isEmpty(start) && (--breakCounter)>0){
				var col = _.first(_.keys(start));
				var doc = _.first(_.values(start));
				if (Used.indexOf(_.first(doc))==-1){
					ArrToFill.push({CodeDoc:doc,CodeCol:col});
					start = Route[doc];
					Used.push(_.first(doc));
				}				
			}
			self.Path(ArrToFill);
			$('#showAFPath').modal('show');
		})		
	}

	self.Init = function(done){
	    MInput.Events.addListener("rendercells",function(){
	        setTimeout(self.CheckAF,0);
	    })
		CxCtrl.Events.addListener("documentchanged",function(){
			self.IsSaveAvailable(false);
		})
		BlankDocument.Events.addListener("LastCellUpdate",function(){
			self.UpdateLastCell();
		})
		Bus.On("save",function(){
			if (self.IsSaveAvailable()){
				self.Update();
			}
		})
		return done();
	}


	self.CheckAF = function(){
		self.rGet("calculate",{Context:CxCtrl.Context()},function(dataRaw){
			var data = dataRaw.Values;
			var formulas = dataRaw.Explain;


			var Meta = MInput.table.getCellsMeta(), RealValues = data||{};
			var IsSaveAvailable = false;
			Meta.forEach(function(M){
				if (!_.isEmpty(M) && !_.isEmpty(M.Cell) && M.IsAFFormula && M.IsPrimary){
					if (!_.isEmpty(formulas[M.Cell])){
						M.AfFormula = formulas[M.Cell];
					}
					if (!RealValues[M.Cell]) RealValues[M.Cell] = 0;
					if (!M.Value) {
						M.Value = 0;					
						M.IsRealNull = true;
					}
					var Val2Compare = M.Value;
					if (M.Formatter){
						RealValues[M.Cell] = numeral(RealValues[M.Cell]).format(M.Formatter);
						Val2Compare = numeral(Val2Compare).format(M.Formatter);
					}
					if(Val2Compare!=RealValues[M.Cell]){
						M.IsCorrect = false;
						M.CorrectValue = RealValues[M.Cell];
						IsSaveAvailable = true;
					} else {
						M.IsCorrect = true;
						M.CorrectValue = M.Value;
					}
				}
			})
			self.IsSaveAvailableFlag(IsSaveAvailable);
			try{
				MInput.HandsonRenders.RegisterRender("AFCell",[/[0-9]*?,(?![0,1]$)[0-9]*/],self.AFCellRender);
				MInput.table.render()
			} catch(e){
				console.error("AF Render Failed",e);
			}
		})
	}

	self.UpdateLastCell = function(){
		var Cx = BlankDocument.table.getSelected();
		var M = BlankDocument.table.getCellMeta(Cx[0],Cx[1]);
		if (M.IsAFFormula && M.IsPrimary){
			BlankDocument.LastCellFormula(M.AfFormula+" = "+M.CorrectValue);
			BlankDocument.LastCellType("AF");
		}
	}

	self.AFCellRender = function(instance, td, row, col, prop, value, CellInfo){
		if (CellInfo.IsAFFormula && CellInfo.IsPrimary && MInput.CheckValuta()){
			CellInfo.IsEditablePrimary = false;
			if (CellInfo.IsCorrect){
				$(td).addClass("IsAFCorrect");
			} else {
				$(td).addClass("IsAFWrong");
			}
		}
	}

	self.Update = function(){
		self.rPut("save",CxCtrl.Context(),function(data){
			BlankDocument.Refresh();
		})
	}

  	
	return self;
})

ModuleManager.Modules.AFFormula = MAFFormula; 
