var _ = require("lodash");
var async = require("async");

// Простая таблица

var AggregateStructure = function(Context,Data){

	var self = this;
	self.Context = _.clone(Context);
	self.Data = _.clone(Data);


	self.get = function(ccb){
		var CodeGrp = self.Context.CodeGrp;
		var Rows = self.Data.Row, Cols = self.Data.Col;
        var Valuta = null;
        if (self.Data.Valuta){
            var VV = _.find(self.Data.Valuta,{CodeValuta:self.Context.CodeValuta});
            if (VV){
                Valuta = VV.SignValuta;    
            }
        }
        var FL = 2;
		var Answer = {Header:['Код','Название'],Tree:{},Cells:[]}
        if (self.Data.Doc.IsShowMeasure){
            Answer.Header.push('Ед/из'); FL = 3;
        }
        Cols && Cols.forEach(function(C){
            Answer.Header.push(C.NameColsetCol);
        })
 		Rows && Rows.forEach(function(R,I){
            Answer.Tree[I] = _.pick(R,['lft','rgt','level', 'CodeRow']);
        })
        Rows && Rows.forEach(function(Row){
            var EmptRow = [Row.NumRow,Row.NameRow];        	
            if (self.Data.Doc.IsShowMeasure){
                var M = Row.Measure||"";
                if (M.indexOf("[")!=-1){
                    if (Valuta) M = M.replace(/\[.*?\]/g,Valuta);
                    else M = M.replace("[","").replace("]","");                    
                }
                EmptRow.push(M);
            }
        	Cols && Cols.forEach(function(Col){
            	var CellName = [
            		"$"+Row.CodeRow,
            		"@"+Col.CodeCol,
            		".P"+Col.ContextPeriod,
            		".Y"+Col.Year,
            		"#"+self.Context.CodeObj+"?"
            	].join("");
                var CellInfo = {
                    Cell:CellName,
                    IsControlPoint:(Col.IsControlPoint && Row.IsControlPoint),
                    IsPrimary:(!Col.IsFormula && !Row.IsFormula && !Row.IsSum && (Row.rgt-Row.lft)==1),
                    IsSum:Row.IsSum
                };
                CellInfo.IsEditablePrimary = (CellInfo.IsPrimary && !Col.IsFixed && self.Context.IsInput);
                EmptRow.push(CellInfo);
            })
            Answer.Cells.push(EmptRow)            
        })
        return ccb(null,Answer);
	}

	return self;
}




module.exports = SimpleStructure;