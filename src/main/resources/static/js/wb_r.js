var APointer = function() {
    var pointer = {};
    pointer.user = '';
    pointer.create = function(canvas, o) {
	fabric.Image.fromURL('./images/pointer.png', function(img) {
	    img.set({
		left:15
		, originX: 'right'
		, originY: 'top'
	    });
	    let circle1 = new fabric.Circle({
		radius: 20
		, stroke: '#ff6600'
		, strokeWidth: 2
		, fill: 'rgba(0,0,0,0)'
		, originX: 'center'
		, originY: 'center'
	    });
	    let circle2 = new fabric.Circle({
		radius: 6
		, stroke: '#ff6600'
		, strokeWidth: 2
		, fill: 'rgba(0,0,0,0)'
		, originX: 'center'
		, originY: 'center'
	    });
	    let text = new fabric.Text(o.user, {
		fontSize: 12
		, left: 10
		, originX: 'left'
		, originY: 'bottom'
	    });
	    let group = new fabric.Group([circle1, circle2, img, text], {
		left: o.x - 20
		, top: o.y - 20
	    });
	    
	    canvas.add(group);
	    group.uid = o.uid;
	    group.loaded = !!o.loaded;

	    let count = 3;
	    function go(_cnt) {
		if (_cnt < 0) {
		    canvas.remove(group);
		    return;
		}
		circle1.set({radius: 3});
		circle2.set({radius: 6});
		circle1.animate(
		    'radius', '20'
		    , {
			onChange: canvas.renderAll.bind(canvas)
			, duration: 1000
			, onComplete: function() {go(_cnt - 1);}
		    });
		circle2.animate(
		    'radius', '20'
		    , {
			onChange: canvas.renderAll.bind(canvas)
			, duration: 1000
		    });
	    }
	    go(count);
	});
    }

    return pointer;
}


var WbArea = (function() {
    var canvases = [];
    
    function __setSize(_cnv, zoom, width, height) {
	_cnv.setWidth(zoom*width).setHeight(zoom*height).setZoom(zoom);
    }
    

    function addCanvas(id) {
	var cid = 'can-wb-tab-0-slide-0';
        var c = $('#' + cid);
	var canvas = new fabric.Canvas(c.attr('id'), {
	    preserveObjectStacking: true
	});
	canvas.wbId = id;
	canvas.slide = 0;
	canvases.push(canvas);
	//var cc = $('#' + cid).closest('.canvas-container');
	//cc.show();
    }

    function _createHandler(_o) {
	switch (_o.fileType) {
	    case 'Video':
	    case 'Recording':
		//no-op
		break;
	    case 'Presentation':
		break;
	    default:
		{
		    let canvas = canvases[_o.slide];
		    if (!!canvas) {
			_o.selectable = canvas.selection;
			canvas.add(_o);
		    }
		}
		break;
	}
    }

    function _createObject(arr, handler) {
	fabric.util.enlivenObjects(arr, function(objects) {
	    canvases.forEach(function(canvas) {
		canvas.renderOnAddRemove = false;
	    });
	    for (var i = 0; i < objects.length; ++i) {
		var _o = objects[i];
		_o.loaded = true;
		handler(_o);
	    }
            
            canvases.forEach(function(canvas) {
		canvas.renderOnAddRemove = true;
		canvas.renderAll();
	    });
	});
    };

    function _findObject(o) {
	var _o = null;
	canvases[o.slide].forEachObject(function(__o) {
	    if (!!__o && o.uid === __o.uid) {
		_o = __o;
		return false;
	    }
	});
	return _o;
    }

    function _removeHandler(o) {
	var __o = _findObject(o);
	if (!!__o) {
	    var cnvs = canvases[o.slide];
	    if (!!cnvs) {
		cnvs.discardActiveGroup();
		if ('Video' === __o.omType) {
		    $('#wb-video-' + __o.uid).remove();
		}
		cnvs.remove(__o);
	    }
	}
    }
    
    function _modifyHandler(_o) {
	_removeHandler(_o);
	_createHandler(_o);
    }
    
    self.init = function() {
	_inited = true;
    };
    
    self.destroy = function() {

    };
    
    self.create = function(obj) {
	if (!_inited) return;
	var id = obj.wbId;
	var name = obj.name;
	var width = obj.width;
	var height = obj.height;
	var zoom = obj.zoom;
        zoom = 0.5;
	var zoomMode = obj.zoomMode;

        self.id = id;
        self.name = name;
        self.width = width;
        self.height = height;
        self.zoom = zoom;
        
        addCanvas(id);        
        __setSize(canvases[0], zoom, width, height);        
    }
    
    self.createWb = function(obj) {
	if (!_inited) return;
	
    };
    self.activateWb = function(obj) {
	if (!_inited) return;
    }
  
    
    self.setSlide = function(json) {
	if (!_inited) return;

    };
    self.createObj = function(json) {
	if (!_inited) return;
        
        var obj = json.obj;
	let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
	for (let i = 0; i < _arr.length; ++i) {
	    let o = _arr[i];
	    switch(o.type) {
		case 'pointer':
		    APointer().create(canvases[o.slide], o);
		    break;
		case 'video':
		    Player.create(canvases[o.slide], o, role);
		    break;
		default:
		    var __o = _findObject(o);
		    if (!__o) {
			arr.push(o);
		    }
		    break;
	    }
	}
	if (arr.length > 0) {
	    _createObject(arr, _createHandler);
	}
        
    };

    self.load = self.createObj;
    
    self.modifyObj = function(json) {
	if (!_inited) return;

        var obj = json.obj;
	let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
	for (let i = 0; i < _arr.length; ++i) {
	    let o = _arr[i];
	    switch(o.type) {
		case 'pointer':
		    _modifyHandler(APointer().create(canvases[o.slide], o))
		    break;
		case 'video':
		    {
			let g = _findObject(o);
			if (!!g) {
			    Player.modify(g, o);
			}
		    }
		    break;
		default:
		    arr.push(o);
		    break;
	    }
	}
	if (arr.length > 0) {
	    _createObject(arr, _modifyHandler);
	}
        

    };
    self.deleteObj = function(json) {
	if (!_inited) return;

        var arr = json.obj;
	for (var i = 0; i < arr.length; ++i) {
	    _removeHandler(arr[i]);
	}
        

    };
    self.clearAll = function(json) {
	if (!_inited) return;
	canvases[0].clear();
    };
    
    self.clearSlide = function(json) {
	if (!_inited) return;

        var _sl = json.slide;
	if (canvases.length > _sl) {
	    let canvas = canvases[_sl];
	    canvas.renderOnAddRemove = false;
	    let arr = canvas.getObjects();
	    while (arr.length > 0) {
		canvas.remove(arr[arr.length - 1]);
		arr = canvas.getObjects();
	    }
	    canvas.renderOnAddRemove = true;
	    canvas.renderAll();
	}
        
    };
    self.removeWb = function(obj) {
	if (!_inited) return;
    };
    self.resize = function(posX, w, h) {
    }
    self.setSize = function(json) {
	if (!_inited) return;

    };

    self.setRole = function() {
    };
 
    return self;
})();
