var MBreadCrumbs = (new function(){
	var self = this;

	self.Pages = ko.observableArray();

	self.Css = ko.observable();
	self.PreLabels = ko.observableArray();
	self.PostLabels = ko.observableArray();

	self.RemoveLabels = function(ModuleName,Type){
		var P = (Type=="Pre") ? self.PreLabels:self.PostLabels;
		var ToRemove = [];
		_.filter(P(),{ModuleName:ModuleName}).forEach(function(Label){
			P.remove(Label);
		})
	}

	self.AddLabel = function(ModuleName, Type, Label){
		var P = (Type=="Pre") ? self.PreLabels:self.PostLabels; 
		P.push(_.merge(Label,{ModuleName:ModuleName}));
	}

	self.Events = new EventEmitter();

	self.Init = function(done){
		MSite.Events.on("initialnavigate",self.BreadcrumbsCompute);
		MSite.Events.on("navigate",self.BreadcrumbsCompute);
		MSite.Events.on("initialload",self.BreadcrumbsCompute);
		Bus.On("documentloaded", self._pages);
		return done();
	}

	self.Params = ko.observable();

	self.BreadcrumbsCompute = function () {
		self.CurrentPath(window.location.pathname.substring(1));
		self.CurrentRoute(self.CurrentPath().split('/'));
		if (!_.isEmpty(window.location.search)){
			self.Params(window.location.search.queryObj());
		} else {
			self.Params(null);
		}		
		var test = self.CurrentRoute();
		setTimeout(self._breadcrumbsFromPages,0);
	}
	
	self.CurrentPath = ko.observable("");
	self.CurrentRoute = ko.observableArray();


	self.CheckPath = function(path){
		return self.CurrentRoute().indexOf(path)!=-1;
	}
	
	self._pages = function(){
		var pages = [];
		var page = pager.activePage$();
		var maxStack = 20;
		while(page){
			if (page.valueAccessor && page.valueAccessor().breadcrumbs){
				var r = page.valueAccessor().breadcrumbs;
				pages.unshift(r);
			}
			page = page.parentPage;
			if (--maxStack<0)  break;
		}
		console.log("_breadcrumbsFromPages",pages);
		self.Pages(pages);
		self.Events.emit("pagechanged");
	}

	self._breadcrumbsFromPages = function(){
		self.Css(null); self.PreLabels([]); self.PostLabels([]);
		self._pages();
	}

	
	return self;
})

ModuleManager.Modules.BreadCrumbs = MBreadCrumbs;