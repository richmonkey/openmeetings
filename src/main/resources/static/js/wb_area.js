
var WbArea = (function() {
	var container, area, tabs, role = PRESENTER, self = {}, _inited = false;


	function getActive() {
		var idx = tabs.tabs("option", 'active');
		if (idx > -1) {
			var href = tabs.find('a')[idx];
			if (!!href) {
				return $($(href).attr('href'));
			}
		}
		return null;
	}
	function deleteHandler(e) {
		switch (e.which) {
			case 8:  // backspace
			case 46: // delete
				{
					var wb = getActive().data();
					var canvas = wb.getCanvas();
					if (!!canvas) {
						var arr = [];
						if (!!canvas.getActiveGroup()) {
							canvas.getActiveGroup().forEachObject(function(o) {
								arr.push({
									uid: o.uid
									, slide: o.slide
								});
							});
						} else {
							var o = canvas.getActiveObject();
							if (!!o) {
								arr.push({
									uid: o.uid
									, slide: o.slide
								});
							}
						}
						wbAction('deleteObj', JSON.stringify({
							wbId: wb.id
							, obj: arr
						}));
						return false;
					}
				}
				break;
		}
	}
	function _activateTab(wbId) {
		container.find('.wb-tabbar li').each(function(idx) {
			if (wbId == 1 * $(this).data('wb-id')) {
				tabs.tabs("option", "active", idx);
				$(this)[0].scrollIntoView();
				return false;
			}
		});
	}
	function _resizeWbs() {
		var w = area.width(), hh = area.height();
		var wbTabs = area.find(".tabs.ui-tabs");
		var tabPanels = wbTabs.find(".ui-tabs-panel");
		var wbah = hh - 5 - wbTabs.find("ul.ui-tabs-nav").height();
		tabPanels.height(wbah);
		tabPanels.each(function(idx) {
			$(this).data().resize(w - 25, wbah - 20);
		});
		wbTabs.find(".ui-tabs-panel .scroll-container").height(wbah);
	}

	function _getImage(cnv, fmt) {
		//TODO zoom ???
		return cnv.toDataURL({
			format: fmt
			, width: cnv.width
			, height: cnv.height
			, multiplier: 1. / cnv.getZoom()
			, left: 0
			, top: 0
		});
	}

	self.getWbTabId = function(id) {
		return "wb-tab-" + id;
	};
	self.getWb = function(id) {
		return $('#' + self.getWbTabId(id)).data();
	};
	self.getCanvas = function(id) {
		return self.getWb(id).getCanvas();
	};
	self.setRole = function(_role) {
		if (!_inited) return;
		role = _role;
		var tabsNav = tabs.find(".ui-tabs-nav");
		tabsNav.sortable(role === PRESENTER ? "enable" : "disable");
		tabs.find(".ui-tabs-panel").each(function(idx) {
			$(this).data().setRole(role);
		});
	}
	self.init = function() {
		container = $(".room.wb.area");
		tabs = container.find('.tabs');
		area = container.find(".wb-area");
		$(window).keyup(deleteHandler);
		_inited = true;
		self.setRole(role);
	};
	self.destroy = function() {
		$(window).off('keyup', deleteHandler);
	};
	self.create = function(obj) {
		if (!_inited) return;

		console.log("create wb:", obj);

		var tid = self.getWbTabId(obj.wbId)
				, wb = $('#wb-area').clone().attr('id', tid);
	
		tabs.append(wb);

		var wbo = Wb();
		wbo.init(obj, tid, role);
        wb.data(wbo);


        var w = area.width(), hh = area.height();
        var wbah = hh - 5;
        
                
        area.find(".scroll-container").height(wbah);
        
        wbo.resize(w-25, wbah - 20);


    }
	self.createWb = function(obj) {
		if (!_inited) return;
		console.log("create wb:", obj);
		self.create(obj);
		self.setRole(role);
		_activateTab(obj.wbId);
	};
	self.activateWb = function(obj) {
		if (!_inited) return;
		_activateTab(obj.wbId);
	}
	self.load = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).load(json.obj);
	};
	self.setSlide = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).setSlide(json.slide);
	};
	self.createObj = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).createObj(json.obj);
	};
	self.modifyObj = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).modifyObj(json.obj);
	};
	self.deleteObj = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).removeObj(json.obj);
	};
	self.clearAll = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).clearAll();
	};
	self.clearSlide = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).clearSlide(json.slide);
	};

	self.resize = function(posX, w, h) {
		if (!container || !_inited) return;
		var hh = h - 5;
		container.width(w).height(h).css('left', posX + "px");
		area.width(w).height(hh);

		var wbTabs = area.find(".tabs.ui-tabs");
		wbTabs.height(hh);
		_resizeWbs();
	}
	self.setSize = function(json) {
		if (!_inited) return;
		self.getWb(json.wbId).setSize(json);
	}
	self.download = function(fmt) {
		var wb = getActive().data();
		if ('pdf' === fmt) {
			var arr = [];
			wb.eachCanvas(function(cnv) {
				arr.push(_getImage(cnv, 'image/png'));
			});
			wbAction('downloadPdf', JSON.stringify({
				slides: arr
			}));
		} else {
			var cnv = wb.getCanvas()
				, a = document.createElement('a');
			a.setAttribute('target', '_blank')
			a.setAttribute('download', wb.name + '.' + fmt);
			a.setAttribute('href', _getImage(cnv, fmt));
			a.dispatchEvent(new MouseEvent('click', {view: window, bubbles: false, cancelable: true}));
		}
	}
	return self;
})();
