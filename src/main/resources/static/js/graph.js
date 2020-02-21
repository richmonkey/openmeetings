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

