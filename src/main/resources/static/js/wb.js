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
var Player = (function() {
	let player = {}, mainColor = '#ff6600', rad = 20;
	function _filter(_o, props) {
		return props.reduce((result, key) => { result[key] = _o[key]; return result; }, {});
	}
	function _sendStatus(g, _paused, _pos) {
		g.status.paused = _paused;
		g.status.pos = _pos;
		wbAction('videoStatus', JSON.stringify({
			wbId: g.canvas.wbId
			, uid: g.uid
			, status: {
				paused: _paused
				, pos: _pos
			}
		}));
	}

	player.create = function(canvas, _o, _role) {
		let vid = $('<video>').hide().attr('class', 'wb-video slide-' + canvas.slide).attr('id', 'wb-video-' + _o.uid)
			.attr("width", _o.width).attr("height", _o.height)
			.append($('<source>').attr('type', 'video/mp4').attr('src', _o._src));
		$('#wb-tab-' + canvas.wbId).append(vid);
		new fabric.Image.fromURL(_o._poster, function(poster) {
			new fabric.Image(vid[0], {}, function (video) {
				video.visible = false;
				poster.width = _o.width;
				poster.height = _o.height;
				let playable = false;
				let trg = new fabric.Triangle({
					left: 2.7 * rad
					, top: _o.height - 2.5 * rad
					, visible: _o.status.paused
					, angle: 90
					, width: rad
					, height: rad
					, stroke: mainColor
					, fill: mainColor
				});
				let rectPause1 = new fabric.Rect({
					left: 1.6 * rad
					, top: _o.height - 2.5 * rad
					, visible: !_o.status.paused
					, width: rad / 3
					, height: rad
					, stroke: mainColor
					, fill: mainColor
				});
				let rectPause2 = new fabric.Rect({
					left: 2.1 * rad
					, top: _o.height - 2.5 * rad
					, visible: !_o.status.paused
					, width: rad / 3
					, height: rad
					, stroke: mainColor
					, fill: mainColor
				});
				let play = new fabric.Group([
						new fabric.Circle({
							left: rad
							, top: _o.height - 3 * rad
							, radius: rad
							, stroke: mainColor
							, strokeWidth: 2
							, fill: null
						})
						, trg, rectPause1, rectPause2]
					, {
						objectCaching: false
						, visible: false
					});
				let cProgress = new fabric.Rect({
					left: 3.5 * rad
					, top: _o.height - 1.5 * rad
					, visible: false
					, width: _o.width - 5 * rad
					, height: rad / 2
					, stroke: mainColor
					, fill: null
					, rx: 5
					, ry: 5
				});
				let isDone = function() {
					return video.getElement().currentTime == video.getElement().duration;
				};
				let updateProgress = function() {
					progress.set('width', (video.getElement().currentTime * cProgress.width) / video.getElement().duration);
					canvas.renderAll();
				};
				let progress = new fabric.Rect({
					left: 3.5 * rad
					, top: _o.height - 1.5 * rad
					, visible: false
					, width: 0
					, height: rad / 2
					, stroke: mainColor
					, fill: mainColor
					, rx: 5
					, ry: 5
				});
				let request;

				let opts = $.extend({
					subTargetCheck: true
					, objectCaching: false
					, omType: 'Video'
					, selectable: canvas.selection
				}, _filter(_o, ['fileId', 'fileType', 'slide', 'uid', '_poster', '_src', 'width', 'height', 'status']));
				let group = new fabric.Group([video, poster, play, progress, cProgress], opts);

				let updateControls = function() {
					video.visible = true;
					poster.visible = false;

					trg.visible = group.status.paused;
					rectPause1.visible = !group.status.paused;
					rectPause2.visible = !group.status.paused;
					canvas.renderAll();
				};
				let render = function () {
					if (isDone()) {
						_sendStatus(group, true, video.getElement().duration);
						updateControls();
					}
					updateProgress();
					if (group.status.paused) {
						cancelAnimationFrame(request);
						canvas.renderAll();
					} else {
						request = fabric.util.requestAnimFrame(render);
					}
				};
				cProgress.on({
					'mousedown': function (evt) {
						let _ptr = canvas.getPointer(evt.e)
							, ptr = canvas._normalizePointer(group, _ptr)
							, l = (group.width / 2 + ptr.x) * canvas.getZoom() - cProgress.aCoords.bl.x;
						_sendStatus(group, group.status.paused, l * video.getElement().duration / cProgress.width)
					}
				});
				play.on({
					/*
					 * https://github.com/kangax/fabric.js/issues/4115
					 *
					'mouseover': function() {
						circle1.set({strokeWidth: 4});
						canvas.renderAll();
					}
					, 'mouseout': function() {
						circle1.set({
							left: pos.left
							, top: pos.top
							, strokeWidth: 2
						});
						canvas.renderAll();
					}
					, */'mousedown': function () {
						play.set({
							left: pos.left + 3
							, top: pos.top + 3
						});
						canvas.renderAll();
					}
					, 'mouseup': function () {
						play.set({
							left: pos.left
							, top: pos.top
						});
						if (!group.status.paused && isDone()) {
							video.getElement().currentTime = 0;
						}
						_sendStatus(group, !group.status.paused, video.getElement().currentTime)
						updateControls();
					}
				});
				group.on({
					'mouseover': function() {
						play.visible = playable;
						cProgress.visible = playable;
						progress.visible = playable;
						canvas.renderAll();
					}
					, 'mouseout': function() {
						play.visible = false;
						cProgress.visible = false;
						progress.visible = false;
						canvas.renderAll();
					}
				});
				group.setPlayable = function(_r) {
					playable = _r !== NONE;
				};
				group.videoStatus = function(_status) {
					group.status = _status;
					updateControls();
					video.getElement().currentTime = group.status.pos;
					updateProgress();
					if (group.status.paused) {
						video.getElement().pause();
					} else {
						video.getElement().play();
						fabric.util.requestAnimFrame(render);
					}
				}
				group.setPlayable(_role);
				canvas.add(group);
				canvas.renderAll();
				player.modify(group, _o);

				let pos = {left: play.left, top: play.top};
			});
		});
	};
	player.modify = function(g, _o) {
		let opts = $.extend({
			angle: 0
			, left: 10
			, scaleX: 1
			, scaleY: 1
			, top: 10
		}, _filter(_o, ['angle', 'left', 'scaleX', 'scaleY', 'top']));
		g.set(opts);
		g.canvas.renderAll();
	};
	return player;
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
			s.find('[class^="wb-prop"]').prop('disabled', true);
			if (!!s.find('.wb-prop-b').button("instance")) {
				s.find('.wb-prop-b, .wb-prop-i, .wb-prop-lock-color, .wb-prop-lock-fill').button("disable");
			}
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
		var c = s.find('.wb-prop-color'), w = s.find('.wb-prop-width'), o = s.find('.wb-prop-opacity');
		s.find('.wb-prop-fill').prop('disabled', true);
		s.find('.wb-prop-b, .wb-prop-i, .wb-prop-lock-color, .wb-prop-lock-fill').button("disable");
		c.val(base.stroke.color).prop('disabled', false);
		w.val(base.stroke.width).prop('disabled', false);
		o.val(100 * base.opacity).prop('disabled', false);
		return {c: c, w: w, o: o};
	};
	base.enableAllProps = function(s) {
		var c = s.find('.wb-prop-color'), w = s.find('.wb-prop-width')
			, o = s.find('.wb-prop-opacity'), f = s.find('.wb-prop-fill')
			, lc = s.find('.wb-prop-lock-color'), lf = s.find('.wb-prop-lock-fill');
		s.find('.wb-prop-b, .wb-prop-i').button("disable");
		lc.button("enable").button('option', 'icon', base.stroke.enabled ? 'ui-icon-unlocked' : 'ui-icon-locked');
		lf.button("enable").button('option', 'icon', base.fill.enabled ? 'ui-icon-unlocked' : 'ui-icon-locked');
		c.val(base.stroke.color).prop('disabled', !base.stroke.enabled);
		w.val(base.stroke.width).prop('disabled', false);
		o.val(100 * base.opacity).prop('disabled', false);
		f.val(base.fill.color).prop('disabled', !base.fill.enabled);
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
		var b = s.find('.wb-prop-b').button("enable");
		if (text.style.bold) {
			b.addClass('ui-state-active selected');
		} else {
			b.removeClass('ui-state-active selected');
		}
		var i = s.find('.wb-prop-i').button("enable");
		if (text.style.italic) {
			i.addClass('ui-state-active selected');
		} else {
			i.removeClass('ui-state-active selected');
		}
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
		paint.enableLineProps(s).o.prop('disabled', true); //TODO not working
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
        function confirmDlg(_id, okHandler) {
		var confirm = $('#' + _id);
		confirm.dialog({
			modal: true
			, buttons: [
				{
					text: confirm.data('btn-ok')
					, click: function() {
						okHandler();
						$(this).dialog("close");
					}
				}
				, {
					text: confirm.data('btn-cancel')
					, click: function() {
						$(this).dialog("close");
					}
				}
			]
		});
		return confirm;
	}
	function _updateZoomPanel() {
		var ccount = canvases.length;
		if (ccount > 1 && role === PRESENTER) {
			z.find('.doc-group').show();
			var ns = 1 * slide;
			z.find('.doc-group .curr-slide').val(ns + 1).attr('max', ccount);
			z.find('.doc-group .up').prop('disabled', ns < 1);
			z.find('.doc-group .down').prop('disabled', ns > ccount - 2);
			z.find('.doc-group .last-page').text(ccount);
		} else {
			z.find('.doc-group').hide();
		}
	}
	function _setSlide(_sld) {
		slide = _sld;
		wbAction('setSlide', JSON.stringify({
			wbId: wb.id
			, slide: _sld
		}));
		_updateZoomPanel();
	}
	function internalInit() {
		// t.draggable({
		// 	snap: "parent"
		// 	, containment: "parent"
		// 	, scroll: false
		// 	, stop: function(event, ui) {
		// 		var pos = ui.helper.position();
		// 		if (pos.left == 0 || pos.left + ui.helper.width() == ui.helper.parent().width()) {
		// 			ui.helper.removeClass('horisontal').addClass('vertical');
		// 		} else if (pos.top == 0 || pos.top + ui.helper.height() == ui.helper.parent().height()) {
		// 			ui.helper.removeClass('vertical').addClass('horisontal');
		// 		}
		// 	}
		// });
		// z.draggable({
		// 	snap: "parent"
		// 	, containment: "parent"
		// 	, scroll: false
		// });

		var _firstToolItem = true;
		var clearAll = t.find('.om-icon.clear-all');
		switch (role) {
			case PRESENTER:
			        clearAll.click(function() {
                                    wbAction('clearAll', JSON.stringify({wbId: wb.id}));
                                });
				z.find('.curr-slide').change(function() {
					_setSlide($(this).val() - 1);
					showCurrentSlide();
				});
				z.find('.doc-group .up').click(function () {
					_setSlide(1 * slide - 1);
					showCurrentSlide();
				});
				z.find('.doc-group .down').click(function () {
					_setSlide(1 * slide + 1);
					showCurrentSlide();
				});
			case WHITEBOARD:
				if (role === WHITEBOARD) {
					clearAll.addClass('disabled');
				}
				initToolBtn('pointer', _firstToolItem, Pointer(wb, s));
				_firstToolItem = false;
				initToolBtn('text', _firstToolItem, Text(wb, s));
				initToolBtn('paint', _firstToolItem, Paint(wb, s));
				initToolBtn('line', _firstToolItem, Line(wb, s));
				initToolBtn('uline', _firstToolItem, ULine(wb, s));
				initToolBtn('rect', _firstToolItem, Rect(wb, s));
				initToolBtn('ellipse', _firstToolItem, Ellipse(wb, s));
				initToolBtn('arrow', _firstToolItem, Arrow(wb, s));
				initCliparts();
				t.find(".om-icon.settings").click(function() {
					s.show();
				});
		         	t.find('.om-icon.clear-slide').click(function() {
                                   wbAction('clearSlide', JSON.stringify({wbId: wb.id, slide: slide}));
				});
				t.find('.om-icon.save').click(function() {
					wbAction('save', JSON.stringify({wbId: wb.id}));
				});
				t.find('.om-icon.undo').click(function() {
					wbAction('undo', JSON.stringify({wbId: wb.id}));
				});
				s.find('.wb-prop-b, .wb-prop-i')
					.button()
					.click(function() {
						$(this).toggleClass('ui-state-active selected');
						var btn = getBtn();
						var isB = $(this).hasClass('wb-prop-b');
						btn.data().obj.style[isB ? 'bold' : 'italic'] = $(this).hasClass('selected');
					});
				s.find('.wb-prop-lock-color, .wb-prop-lock-fill')
					.button({icon: 'ui-icon-locked', showLabel: false})
					.click(function() {
						var btn = getBtn();
						var isColor = $(this).hasClass('wb-prop-lock-color');
						var c = s.find(isColor ? '.wb-prop-color' : '.wb-prop-fill');
						var enabled = $(this).button('option', 'icon') == 'ui-icon-locked';
						$(this).button('option', 'icon', enabled ? 'ui-icon-unlocked' : 'ui-icon-locked');
						c.prop('disabled', !enabled);
						btn.data().obj[isColor ? 'stroke' : 'fill'].enabled = enabled;
					});
				s.find('.wb-prop-color').change(function() {
					var btn = getBtn();
					if (btn.length == 1) {
						var v = $(this).val();
						btn.data().obj.stroke.color = v;
						if ('paint' == mode) {
							wb.eachCanvas(function(canvas) {
								canvas.freeDrawingBrush.color = v;
							});
						}
					}
				});
				s.find('.wb-prop-width').change(function() {
					var btn = getBtn();
					if (btn.length == 1) {
						var v = 1 * $(this).val();
						btn.data().obj.stroke.width = v;
						if ('paint' == mode) {
							wb.eachCanvas(function(canvas) {
								canvas.freeDrawingBrush.width = v;
							});
						}
					}
				});
				s.find('.wb-prop-fill').change(function() {
					var btn = getBtn();
					if (btn.length == 1) {
						var v = $(this).val();
						btn.data().obj.fill.color = v;
					}
				});
				s.find('.wb-prop-opacity').change(function() {
					var btn = getBtn();
					if (btn.length == 1) {
						var v = (1 * $(this).val()) / 100;
						btn.data().obj.opacity = v;
						if ('paint' == mode) {
							wb.eachCanvas(function(canvas) {
								canvas.freeDrawingBrush.opacity = v;
							});
						}
					}
				});
				s.find('.ui-dialog-titlebar-close').click(function() {
					s.hide();
				});

				// s.draggable({
				// 	scroll: false
				// 	, containment: "body"
				// 	, start: function(event, ui) {
				// 		if (!!s.css("bottom")) {
				// 			s.css("bottom", "").css("right", "");
				// 		}
				// 	}
				// 	, drag: function(event, ui) {
				// 		if (s.position().x + s.width() >= s.parent().width()) {
				// 			return false;
				// 		}
				// 	}
				// });
			case NONE:
				_updateZoomPanel();
				z.find('.zoom-out').click(function() {
					zoom -= .2;
					if (zoom < .1) {
						zoom = .1;
					}
					zoomMode = 'zoom';
					_setSize();
					wbAction('setSize', JSON.stringify({
						wbId: wb.id
						, zoom: zoom
						, zoomMode: zoomMode
					}));
				});
				z.find('.zoom-in').click(function() {
					zoom += .2;
					zoomMode = 'zoom';
					_setSize();
					wbAction('setSize', JSON.stringify({
						wbId: wb.id
						, zoom: zoom
						, zoomMode: zoomMode
					}));
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
					wbAction('setSize', JSON.stringify({
						wbId: wb.id
						, zoom: zoom
						, zoomMode: zoomMode
					}));
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
	function _createHandler(_o) {
		switch (_o.fileType) {
			case 'Video':
			case 'Recording':
				//no-op
				break;
			case 'Presentation':
			{
				let ccount = canvases.length;
				let count = _o.deleted ? 1 : _o.count;
				for (let i = 0; i < count; ++i) {
					if (canvases.length < i + 1) {
						addCanvas();
					}
					let canvas = canvases[i];
					canvas.setBackgroundImage(_o._src + "&slide=" + i, canvas.renderAll.bind(canvas), {});
				}
				_updateZoomPanel();
				if (ccount != canvases.length) {
					let b = getBtn();
					if (b.length && b.hasClass(ACTIVE)) {
						b.data().deactivate();
						b.data().activate();
					}
				}
			}
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
		s.find('.wb-dim-x').val(o.left);
		s.find('.wb-dim-y').val(o.top);
		s.find('.wb-dim-w').val(o.width);
		s.find('.wb-dim-h').val(o.height);
	}
	function pathCreatedHandler(o) {
		o.path.uid = UUID.generate();
    	        o.path.slide = this.slide;
                o.path.fill = 'transparent';
		wbObjCreatedHandler(o.path);
	};
	function scrollHandler(e) {
		$(this).find('.canvas-container').each(function(idx) {
			var h = $(this).height(), pos = $(this).position();
			if (slide != idx && pos.top > BUMPER - h && pos.top < BUMPER) {
				//TODO FIXME might be done without iterating
				//console.log("Found:", idx);
				_setSlide(idx);
				return false;
			}
		});
	}
	function showCurrentSlide() {
		a.find('.scroll-container .canvas-container').each(function(idx) {
			if (role === PRESENTER) {
				$(this).show();
				a.find('.scroll-container .canvas-container')[slide].scrollIntoView();
			} else {
				if (idx == slide) {
					$(this).show();
				} else {
					$(this).hide();
				}
			}
		});
	}
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
	function _videoStatus(json) {
		let g = _findObject(json);
		if (!!g) {
			g.videoStatus(json.status);
		}
	}
	wb.setRole = function(_role) {
		if (role != _role) {
			var btn = getBtn();
			if (!!btn && btn.length == 1) {
				btn.data().deactivate();
			}
			a.find('.tools').remove();
			a.find('.wb-settings').remove();
			a.find('.wb-zoom').remove();
			role = _role;
			var sc = a.find('.scroll-container');
			z = $('#wb-zoom').clone().attr('id', '');
			if (role === NONE) {
				t = $('#wb-tools-readonly').clone().attr('id', '');
				sc.off('scroll', scrollHandler);
			} else {
				t = $('#wb-tools').clone().attr('id', '');
				s = $("#wb-settings").clone().attr('id', '');
				a.append(s);
				sc.on('scroll', scrollHandler);
			}
			a.append(t).append(z);
			showCurrentSlide();
			t = a.find('.tools'), s = a.find(".wb-settings");
			wb.eachCanvas(function(canvas) {
				setHandlers(canvas);
				canvas.forEachObject(function(__o) { //TODO reduce iterations
					if (!!__o && __o.omType === 'Video') {
						__o.setPlayable(role);
					}
				});
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
		showCurrentSlide();
	};
	wb.createObj = function(obj) {
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
	wb.load = wb.createObj;
	wb.modifyObj = function(obj) { //TODO need to be unified
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
	wb.removeObj = function(arr) {
		for (var i = 0; i < arr.length; ++i) {
			_removeHandler(arr[i]);
		}
	};
	wb.clearAll = function() {
		for (var i = 1; i < canvases.length; ++i) {
			let cc = $('#can-wb-tab-0-slide-' + i).closest('.canvas-container');
			cc.remove();
			canvases[i].dispose();
		}
		$('.room.wb.area .wb-video').remove();
		canvases.splice(1);
		canvases[0].clear();
		_updateZoomPanel();
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
			$('.room.wb.area .wb-video.slide-' + _sl).remove();
			canvas.renderOnAddRemove = true;
			canvas.renderAll();
		}
	};
	wb.getCanvas = function() {
		return canvases[slide];
	};
	wb.eachCanvas = function(func) {
		for (var i = 0; i < canvases.length; ++i) {
			func(canvases[i]);
		}
	}
	wb.videoStatus = _videoStatus;
	return wb;
};
var WbArea = (function() {
	var container, area, tabs, scroll, role = PRESENTER, self = {}, _inited = false;

	function refreshTabs() {
		tabs.tabs("refresh").find('ul').removeClass('ui-corner-all').removeClass('ui-widget-header');
	}
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
	function _addCloseBtn(li) {
		if (role != PRESENTER) {
			return;
		}
		li.append($('#wb-tab-close').clone().attr('id', ''));
		li.find('button').click(function() {
			wbAction('removeWb', JSON.stringify({wbId: li.data().wbId}));
		});
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
	function _videoStatus(json) {
		self.getWb(json.wbId).videoStatus(json);
	}
	function _initVideos(arr) {
		for (let i = 0; i < arr.length; ++i) {
			 _videoStatus(arr[i]);
		}
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
		var prev = tabs.find('.prev.om-icon'), next = tabs.find('.next.om-icon');
		if (role === PRESENTER) {
			if (prev.length == 0) {
				var cc = tabs.find('.wb-tabbar .scroll-container')
					, left = $('#wb-tabbar-ctrls-left').clone().attr('id', '');
				cc.before(left);
				tabs.find('.add.om-icon').click(function() {
					wbAction('createWb');
				});
				tabsNav.find('li').each(function(idx) {
					var li = $(this);
					_addCloseBtn(li);
				});
				$(window).keyup(deleteHandler);
			}
		} else {
			if (prev.length > 0) {
				prev.parent().remove();
				next.parent().remove();
				tabsNav.find('li button').remove();
			}
			$(window).off('keyup', deleteHandler);
		}
		tabs.find(".ui-tabs-panel").each(function(idx) {
			$(this).data().setRole(role);
		});
	}
	self.init = function() {
		container = $(".room.wb.area");
		tabs = container.find('.tabs').tabs({
			beforeActivate: function(e, ui) {
				var res = true;
				if (e.originalEvent && e.originalEvent.type === 'click') {
					res = role === PRESENTER;
				}
				return res;
			}
			, activate: function(e, ui) {
				wbAction('activateWb', JSON.stringify({wbId: ui.newTab.data('wb-id')}));
			}
		});
		scroll = tabs.find('.scroll-container');
		area = container.find(".wb-area");
		tabs.find(".ui-tabs-nav").sortable({
			axis: "x"
			, stop: function() {
				refreshTabs();
			}
		});
		_inited = true;
		self.setRole(role);
	};
	self.destroy = function() {
		$(window).off('keyup', deleteHandler);
	};
	self.create = function(obj) {
		if (!_inited) return;
		var tid = self.getWbTabId(obj.wbId)
			, li = $('#wb-area-tab').clone().attr('id', '').data('wb-id', obj.wbId)
			, wb = $('#wb-area').clone().attr('id', tid);
		li.find('a').text(obj.name).attr('title', obj.name).attr('href', "#" + tid);

		tabs.find(".ui-tabs-nav").append(li);
		tabs.append(wb);
		refreshTabs();
		_addCloseBtn(li);

		var wbo = Wb();
		wbo.init(obj, tid, role);
		wb.data(wbo);
		_resizeWbs();
	}
	self.createWb = function(obj) {
		if (!_inited) return;
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
	self.removeWb = function(obj) {
		if (!_inited) return;
		var tabId = self.getWbTabId(obj.wbId);
		tabs.find('li[aria-controls="' + tabId + '"]').remove();
		$("#" + tabId).remove();
		refreshTabs();
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
	self.videoStatus = _videoStatus;
	self.loadVideos = function() { wbAction('loadVideos'); };
	self.initVideos = _initVideos;
	return self;
})();
