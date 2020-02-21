/* Licensed under the Apache License, Version 2.0 (the "License") http://www.apache.org/licenses/LICENSE-2.0 */
var PRESENTER = 'presenter';
var WHITEBOARD = 'whiteBoard';
var NONE = 'none';
var UUID = (function() {
	var self = {};
	var lut = [];
	for (var i = 0; i < 256; i++) {
		lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
	}
	self.generate = function() {
		var d0 = Math.random() * 0xffffffff | 0;
		var d1 = Math.random() * 0xffffffff | 0;
		var d2 = Math.random() * 0xffffffff | 0;
		var d3 = Math.random() * 0xffffffff | 0;
		return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
			lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
			lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
			lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
	}
	return self;
})();


var Base = function() {
	var base = {};
	base.objectCreated = function(o, canvas) {
		o.uid = UUID.generate();
		o.slide = canvas.slide;
		canvas.trigger("wb:object:created", o);
		return o.uid;
	}
	return base;
}
var Pointer = function(wb, s) {
	return {
		activate: function() {
			wb.eachCanvas(function(canvas) {
				canvas.selection = true;
				canvas.forEachObject(function(o) {
					o.selectable = true;
				});
			});
		}
		, deactivate: function() {
			wb.eachCanvas(function(canvas) {
				canvas.selection = false;
				canvas.forEachObject(function(o) {
					o.selectable = false;
				});
			});
		}
	};
}
var APointer = function(wb) {
	var pointer = Base();
	pointer.user = '';
	pointer.create = function(canvas, o) {
		fabric.Image.fromURL('./css/images/pointer.png', function(img) {
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
	pointer.mouseUp = function(o) {
		var canvas = this;
		var ptr = canvas.getPointer(o.e);
		var obj = {
			type: 'pointer'
			, x: ptr.x
			, y: ptr.y
			, user: pointer.user
		};
		obj.uid = uid = pointer.objectCreated(obj, canvas);
		pointer.create(canvas, obj);
	}
	pointer.activate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.selection = false;
			canvas.on('mouse:up', pointer.mouseUp);
		});
		pointer.user = "unknown";//todo get user name
	}
	pointer.deactivate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.off('mouse:up', pointer.mouseUp);
		});
	};
	return pointer;
}
var ShapeBase = function() {
	var base = Base();
	base.fill = {enabled: true, color: '#FFFF33'};
	base.stroke = {enabled: true, color: '#FF6600', width: 5};
	base.opacity = 1;
	base.enableLineProps = function(s) {

	};
	base.enableAllProps = function(s) {

	};
	return base;
}
var Text = function(wb, s) {
	var text = ShapeBase();
	text.obj = null;
	text.fill.color = '#000000';
	text.stroke.width = 1;
	text.stroke.color = '#000000';
	text.style = {bold: false, italic: false};
	//TODO font size, background color

	text.mouseDown = function(o) {
		var canvas = this;
		var pointer = canvas.getPointer(o.e);
		var ao = canvas.getActiveObject();
		if (!!ao && ao.type == 'i-text') {
			text.obj = ao;
		} else {
			text.obj = new fabric.IText('', {
				left: pointer.x
				, top: pointer.y
				, padding: 7
				, fill: text.fill.enabled ? text.fill.color : 'rgba(0,0,0,0)'
				, stroke: text.stroke.enabled ? text.stroke.color : 'rgba(0,0,0,0)'
				, strokeWidth: text.stroke.width
				, opacity: text.opacity
			});
			if (text.style.bold) {
				text.obj.fontWeight = 'bold'
			}
			if (text.style.italic) {
				text.obj.fontStyle = 'italic'
			}
			canvas.add(text.obj).setActiveObject(text.obj);
		}
		text.obj.enterEditing();
	};
	text.activate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.on('mouse:down', text.mouseDown);
			canvas.selection = true;
			canvas.forEachObject(function(o) {
				if (o.type == 'i-text') {
					o.selectable = true;
				}
			});
		});
		text.enableAllProps(s);
	};
	text.deactivate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.off('mouse:down', text.mouseDown);
			canvas.selection = false;
			canvas.forEachObject(function(o) {
				if (o.type == 'i-text') {
					o.selectable = false;
				}
			});
		});
	};
	return text;
}
var Paint = function(wb, s) {
	var paint = ShapeBase(wb);
	paint.activate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.isDrawingMode = true;
			canvas.freeDrawingBrush.width = paint.stroke.width;
			canvas.freeDrawingBrush.color = paint.stroke.color;
			canvas.freeDrawingBrush.opacity = paint.opacity; //TODO not working
		});
		//paint.enableLineProps(s).o.prop('disabled', true); //TODO not working
	};
	paint.deactivate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.isDrawingMode = false;
		});
	};
	return paint;
}
var Shape = function(wb) {
	var shape = ShapeBase(wb);
	shape.obj = null;
	shape.isDown = false;
	shape.orig = {x: 0, y: 0};

	shape.add2Canvas = function(canvas) {
		canvas.add(shape.obj);
	}
	shape.mouseDown = function(o) {
		var canvas = this;
		shape.isDown = true;
		var pointer = canvas.getPointer(o.e);
		shape.orig = {x: pointer.x, y: pointer.y};
		shape.createShape(canvas);
		shape.add2Canvas(canvas);
	};
	shape.mouseMove = function(o) {
		var canvas = this;
		if (!shape.isDown) return;
		var pointer = canvas.getPointer(o.e);
		shape.updateShape(pointer);
		canvas.renderAll();
	};
	shape.updateCreated = function(o) {
		return o;
	};
	shape.mouseUp = function(o) {
		var canvas = this;
		shape.isDown = false;
		shape.obj.setCoords();
		shape.obj.selectable = false;
		canvas.renderAll();
		shape.objectCreated(shape.obj, canvas);
	};
	shape.internalActivate = function() {};
	shape.activate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.on({
				'mouse:down': shape.mouseDown
				, 'mouse:move': shape.mouseMove
				, 'mouse:up': shape.mouseUp
			});
		});
		shape.internalActivate();
	};
	shape.deactivate = function() {
		wb.eachCanvas(function(canvas) {
			canvas.off({
				'mouse:down': shape.mouseDown
				, 'mouse:move': shape.mouseMove
				, 'mouse:up': shape.mouseUp
			});
		});
	};
	return shape;
};
var Line = function(wb, s) {
	var line = Shape(wb);
	line.createShape = function(canvas) {
		line.obj = new fabric.Line([line.orig.x, line.orig.y, line.orig.x, line.orig.y], {
			strokeWidth: line.stroke.width
			, fill: line.stroke.color
			, stroke: line.stroke.color
			, opacity: line.opacity
		});
		return line.obj;
	};
	line.internalActivate = function() {
		line.enableLineProps(s);
	};
	line.updateShape = function(pointer) {
		line.obj.set({ x2: pointer.x, y2: pointer.y });
	};
	return line;
}
var ULine = function(wb, s) {
	var uline = Line(wb, s);
	uline.stroke.width = 20;
	uline.opacity = .5;
	return uline;
}
var Rect = function(wb, s) {
	var rect = Shape(wb);
	rect.createShape = function(canvas) {
		rect.obj = new fabric.Rect({
			strokeWidth: rect.stroke.width
			, fill: rect.fill.enabled ? rect.fill.color : 'rgba(0,0,0,0)'
			, stroke: rect.stroke.enabled ? rect.stroke.color : 'rgba(0,0,0,0)'
			, left: rect.orig.x
			, top: rect.orig.y
			, width: 0
			, height: 0
		});
		return rect.obj;
	};
	rect.internalActivate = function() {
		rect.enableAllProps(s);
	};
	rect.updateShape = function(pointer) {
		if (rect.orig.x > pointer.x) {
			rect.obj.set({ left: pointer.x });
		}
		if (rect.orig.y > pointer.y) {
			rect.obj.set({ top: pointer.y });
		}
		rect.obj.set({
			width: Math.abs(rect.orig.x - pointer.x)
			, height: Math.abs(rect.orig.y - pointer.y)
		});
	};
	return rect;
}
var Ellipse = function(wb, s) {
	var ellipse = Rect(wb, s);
	ellipse.createShape = function(canvas) {
		ellipse.obj = new fabric.Ellipse({
			strokeWidth: ellipse.stroke.width
			, fill: ellipse.fill.enabled ? ellipse.fill.color : 'rgba(0,0,0,0)'
			, stroke: ellipse.stroke.enabled ? ellipse.stroke.color : 'rgba(0,0,0,0)'
			, left: ellipse.orig.x
			, top: ellipse.orig.y
			, rx: 0
			, ry: 0
			, originX: 'center'
			, originY: 'center'
		});
		return ellipse.obj;
	};
	ellipse.updateShape = function(pointer) {
		ellipse.obj.set({
			rx: Math.abs(ellipse.orig.x - pointer.x)
			, ry: Math.abs(ellipse.orig.y - pointer.y)
		});
	};
	return ellipse;
}
var Arrow = function(wb, s) {
	var arrow = Line(wb, s);
	arrow.createShape = function(canvas) {
		arrow.obj = new fabric.Polygon([
			{x: 0, y: 0},
			{x: 0, y: 0},
			{x: 0, y: 0},
			{x: 0, y: 0},
			{x: 0, y: 0},
			{x: 0, y: 0},
			{x: 0, y: 0}]
			, {
				left: arrow.orig.x
				, top: arrow.orig.y
				, angle: 0
				, strokeWidth: 2
				, fill: arrow.fill.enabled ? arrow.fill.color : 'rgba(0,0,0,0)'
				, stroke: arrow.stroke.enabled ? arrow.stroke.color : 'rgba(0,0,0,0)'
			});

		return arrow.obj;
	};
	arrow.updateShape = function(pointer) {
		var dx = pointer.x - arrow.orig.x
		, dy = pointer.y - arrow.orig.y
		, d = Math.sqrt(dx * dx + dy * dy)
		, sw = arrow.stroke.width
		, hl = sw * 3
		, h = 1.5 * sw
		, points = [
			{x: 0, y: sw},
			{x: Math.max(0, d - hl), y: sw},
			{x: Math.max(0, d - hl), y: h},
			{x: d, y: 3 * sw / 4},
			{x: Math.max(0, d - hl), y: 0},
			{x: Math.max(0, d - hl), y: sw / 2},
			{x: 0, y: sw / 2}];
		arrow.obj.set({
			points: points
			, angle: Math.atan2(dy, dx) * 180 / Math.PI
			, width: d
			, height: h
			, maxX: d
			, maxY: h
			, pathOffset: {
				x: d / 2,
				y: h / 2
			}
		});
	};
	arrow.internalActivate = function() {
		arrow.enableAllProps(s);
	};
	return arrow;
}
var Clipart = function(wb, btn) {
	var art = Shape(wb);
	art.add2Canvas = function(canvas) {}
	art.createShape = function(canvas) {
		fabric.Image.fromURL(btn.data('image'), function(img) {
			art.orig.width = img.width;
			art.orig.height = img.height;
			art.obj = img.set({
				left: art.orig.x
				, top: art.orig.y
				, width: 0
				, height: 0
			});
			canvas.add(art.obj);
		});
	}
	art.updateShape = function(pointer) {
		if (!art.obj) {
			return; // not ready
		}
		var dx = pointer.x - art.orig.x, dy = pointer.y - art.orig.y;
		var d = Math.sqrt(dx * dx + dy * dy);
		art.obj.set({
			width: d
			, height: art.orig.height * d / art.orig.width
			, angle: Math.atan2(dy, dx) * 180 / Math.PI
		});
	}
	return art;
}


var Wb = function() {
	const ACTIVE = 'active';
	const BUMPER = 100;
	var wb = {id: -1, name: ''}, a, t, z, s, canvases = [], mode, slide = 0, width = 0, height = 0
			, zoom = 1., zoomMode = 'fullFit', role = null, extraProps = ['uid', 'fileId', 'fileType', 'count', 'slide'];

	function getBtn(m) {
		return !!t ? t.find(".om-icon." + (m || mode)) : null;
	}
	function initToolBtn(m, def, obj) {
		var btn = getBtn(m);
		btn.data({
			obj: obj
			, activate: function() {
				if (!btn.hasClass(ACTIVE)) {
					mode = m;
					btn.addClass(ACTIVE);
					obj.activate();
				}
			}
			, deactivate: function() {
				btn.removeClass(ACTIVE);
				obj.deactivate();
			}
		}).click(function() {
			var b = getBtn();
			if (b.length && b.hasClass(ACTIVE)) {
				b.data().deactivate();
			}
			btn.data().activate();
		});
		if (def) {
			btn.data().activate();
		}
	}
	function initCliparts() {
		var c = $('#wb-area-cliparts').clone().attr('id', '');
		getBtn('arrow').after(c);
		c.find('a').prepend(c.find('div.om-icon.big:first'));
		c.find('.om-icon.clipart').each(function(idx) {
			var cur = $(this);
			cur.css('background-image', 'url(' + cur.data('image') + ')')
				.click(function() {
					var old = c.find('a .om-icon.clipart');
					c.find('ul li').prepend(old);
					c.find('a').prepend(cur);
				});
			initToolBtn(cur.data('mode'), false, Clipart(wb, cur));
		});
	}

	function internalInit() {
		var _firstToolItem = true;
		var clearAll = t.find('.om-icon.clear-all');
		switch (role) {
			case PRESENTER:
		        clearAll.click(function() {
		            wbAction('clearAll', JSON.stringify({
		                wbId: wb.id
		            }));
		        });
				initToolBtn('pointer', _firstToolItem, Pointer(wb, s));
				_firstToolItem = false;
				initToolBtn('text', _firstToolItem, Text(wb, s));
				initToolBtn('paint', _firstToolItem, Paint(wb, s));
				initToolBtn('line', _firstToolItem, Line(wb, s));
				initToolBtn('uline', _firstToolItem, ULine(wb, s));
				initToolBtn('rect', _firstToolItem, Rect(wb, s));
				initToolBtn('ellipse', _firstToolItem, Ellipse(wb, s));
				initToolBtn('arrow', _firstToolItem, Arrow(wb, s));
//				initCliparts();
				// t.find(".om-icon.settings").click(function() {
				// 	s.show();
				// });
		        // t.find('.om-icon.clear-slide').click(function() {
                //     wbAction('clearSlide', JSON.stringify({wbId: wb.id, slide: slide}));
				// });
				t.find('.om-icon.save').click(function() {
					wbAction('save', JSON.stringify({wbId: wb.id}));
				});
				t.find('.om-icon.undo').click(function() {
					wbAction('undo', JSON.stringify({wbId: wb.id}));
				});
			case NONE:
				z.find('.zoom-out').click(function() {
					zoom -= .2;
					if (zoom < .1) {
						zoom = .1;
					}
					zoomMode = 'zoom';
					_setSize();
				});
				z.find('.zoom-in').click(function() {
					zoom += .2;
					zoomMode = 'zoom';
					_setSize();
				});
				z.find('.zoom').change(function() {
					var zzz = $(this).val();
					zoomMode = 'zoom';
					if (isNaN(zzz)) {
						switch (zzz) {
							case 'fullFit':
							case 'pageWidth':
								zoomMode = zzz;
								break;
							case 'custom':
								zoom = 1. * $(this).data('custom-val');
								break;
						}
					} else {
						zoom = 1. * zzz;
					}
					_setSize();
				});
				_setSize();
				initToolBtn('apointer', _firstToolItem, APointer(wb));
		}
	}
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
				cnvs.remove(__o);
			}
		}
	}
	function _modifyHandler(_o) {
		_removeHandler(_o);
		_createHandler(_o);
	}
	function _createHandler(_o) {
		switch (_o.fileType) {
			case 'Video':
			case 'Recording':
			case 'Presentation':
				//no-op
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
			wb.eachCanvas(function(canvas) {
				canvas.renderOnAddRemove = false;
			});

			for (var i = 0; i < objects.length; ++i) {
				var _o = objects[i];
				_o.loaded = true;
				handler(_o);
			}

			wb.eachCanvas(function(canvas) {
				canvas.renderOnAddRemove = true;
				canvas.renderAll();
			});
		});
	};

	function toOmJson(o) {
		let r = o.toJSON(extraProps);
		if (o.omType === 'Video') {
			r.type = 'video';
			delete r.objects;
			return r;
		}
		return r;
	}
	//events
	function wbObjCreatedHandler(o) {
		if (role === NONE && o.type != 'pointer') return;

		var json = {};
		switch(o.type) {
			case 'pointer':
				json = o;
				break;
			default:
				o.includeDefaultValues = false;
				json = toOmJson(o);
				break;
		}
		wbAction('createObj', JSON.stringify({
			wbId: wb.id
			, obj: json
		}));
	};
	function objAddedHandler(e) {
		var o = e.target;
		if (!!o.loaded) return;
		switch(o.type) {
			case 'i-text':
				o.uid = UUID.generate();
				o.slide = this.slide;
				wbObjCreatedHandler(o);
				break;
			default:
				o.selectable = this.selection;
				break;
		}
	};
	function objModifiedHandler(e) {
		var o = e.target;
		if (role === NONE && o.type != 'pointer') return;

		o.includeDefaultValues = false;
		var items = [];
		if ("group" === o.type && o.omType !== 'Video') {
			o.clone(function(_o) {
				// ungrouping
				_o.includeDefaultValues = false;
				var _items = _o.destroy().getObjects();
				for (var i = 0; i < _items.length; ++i) {
					items.push(toOmJson(_items[i]));
				}
			}, extraProps);
		} else {
			items.push(toOmJson(o));
		}
		wbAction('modifyObj', JSON.stringify({
			wbId: wb.id
			, obj: items
		}));
	};
	function objSelectedHandler(e) {
		var o = e.target;
	}
	function pathCreatedHandler(o) {
		o.path.uid = UUID.generate();
    	o.path.slide = this.slide;
        o.path.fill = 'transparent';
		wbObjCreatedHandler(o.path);
	};


	/*TODO interactive text change
	var textEditedHandler = function (e) {
		var obj = e.target;
		console.log('Text Edit Exit', obj);
	};
	var textChangedHandler = function (e) {
		var obj = e.target;
		console.log('Text Changed', obj);
	};*/
	function setHandlers(canvas) {
		// off everything first to prevent duplicates
		canvas.off({
			'wb:object:created': wbObjCreatedHandler
			, 'object:modified': objModifiedHandler
			, 'object:added': objAddedHandler
			, 'object:selected': objSelectedHandler
			, 'path:created': pathCreatedHandler
			//, 'text:editing:exited': textEditedHandler
			//, 'text:changed': textChangedHandler
		});
		canvas.on({
			'wb:object:created': wbObjCreatedHandler
			, 'object:modified': objModifiedHandler
		});
		if (role !== NONE) {
			canvas.on({
				'object:added': objAddedHandler
				, 'object:selected': objSelectedHandler
				, 'path:created': pathCreatedHandler
				//, 'text:editing:exited': textEditedHandler
				//, 'text:changed': textChangedHandler
			});
		}
	}
	function addCanvas() {
		var sl = canvases.length;
		var cid = 'can-' + a.attr('id') + '-slide-' + sl;
		var c = $('<canvas></canvas>').attr('id', cid);
		a.find('.canvases').append(c);
		var canvas = new fabric.Canvas(c.attr('id'), {
			preserveObjectStacking: true
		});
		canvas.wbId = wb.id;
		canvas.slide = sl;
		canvases.push(canvas);
		var cc = $('#' + cid).closest('.canvas-container');
		if (role === NONE) {
			if (sl == slide) {
				cc.show();
			} else {
				cc.hide();
			}
		}
		__setSize(canvas);
		setHandlers(canvas);
	}
	function __setSize(_cnv) {
		_cnv.setWidth(zoom * width).setHeight(zoom * height).setZoom(zoom);
	}
	function _setSize() {
		switch (zoomMode) {
			case 'fullFit':
				zoom = Math.min((a.width() - 10) / width, (a.height() - 10) / height);
				z.find('.zoom').val(zoomMode);
				break;
			case 'pageWidth':
				zoom = (a.width() - 10) / width;
				z.find('.zoom').val(zoomMode);
				break;
			default:
			{
				var oo = z.find('.zoom').find('option[value="' + zoom.toFixed(2) + '"]');
				if (oo.length == 1) {
					oo.prop('selected', true);
				} else {
					z.find('.zoom').data('custom-val', zoom).find('option[value=custom]')
						.text((100. * zoom).toFixed(0) + '%')
						.prop('selected', true);
				}
			}
				break;
		}
		wb.eachCanvas(function(canvas) {
			__setSize(canvas);
		});
	}

	wb.setRole = function(_role) {
		if (role != _role) {
			var btn = getBtn();
			if (!!btn && btn.length == 1) {
				btn.data().deactivate();
			}
			a.find('.tools').remove();
			a.find('.wb-zoom').remove();
			role = _role;
			z = $('#wb-zoom').clone().attr('id', '');
			t = $('#wb-tools').clone().attr('id', '');
			a.append(t).append(z);
			t = a.find('.tools');
			wb.eachCanvas(function(canvas) {
				setHandlers(canvas);
			});
			internalInit();
		}
	};
	wb.init = function(wbo, tid, _role) {
		wb.id = wbo.wbId;
		wb.name = wbo.name;
		width = wbo.width;
		height = wbo.height;
		zoom = wbo.zoom;
		zoomMode = wbo.zoomMode;
		a = $('#' + tid);
		addCanvas();
		wb.setRole(_role);
	};
	wb.setSize = function(wbo) {
		width = wbo.width;
		height = wbo.height;
		zoom = wbo.zoom;
		zoomMode = wbo.zoomMode;
		_setSize();
	}
	wb.resize = function(w, h) {
		if (t.position().left + t.width() > a.width()) {
			t.position({
				my: "right"
				, at: "right-20"
				, of: '#' + a[0].id
				, collision: "fit"
			});
		}
		if (z.position().left + z.width() > a.width()) {
			z.position({
				my: "left top"
				, at: "center top"
				, of: '#' + a[0].id
				, collision: "fit"
			});
		}
		if (zoomMode !== 'zoom') {
			_setSize();
		}
	};

	wb.setSlide = function(_sl) {
		slide = _sl;
	};
	wb.createObj = function(obj) {
		let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
		for (let i = 0; i < _arr.length; ++i) {
			let o = _arr[i];
			switch(o.type) {
				case 'pointer':
					APointer().create(canvases[o.slide], o);
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
	wb.load = wb.createObj;
	wb.modifyObj = function(obj) { //TODO need to be unified
		let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
		for (let i = 0; i < _arr.length; ++i) {
			let o = _arr[i];
			switch(o.type) {
				case 'pointer':
					_modifyHandler(APointer().create(canvases[o.slide], o))
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
	wb.removeObj = function(arr) {
		for (var i = 0; i < arr.length; ++i) {
			_removeHandler(arr[i]);
		}
	};

	wb.clearSlide = function(_sl) {
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

	wb.clearAll = function() {
		wb.clearSlide(slide);
	};
	wb.getCanvas = function() {
		return canvases[slide];
	};
	wb.eachCanvas = function(func) {
		for (var i = 0; i < canvases.length; ++i) {
			func(canvases[i]);
		}
	}
	return wb;
};
