var React = require('react');
import styles from './whiteboard.less';

var extraProps = ['uid', 'fileId', 'fileType', 'count', 'slide']

var APointer = function() {
	var pointer = {};
	pointer.create = function(canvas, o) {
		var imgElement = document.getElementById("pointer");
		var img = new fabric.Image(imgElement, {
			left:15
			, originX: 'right'
			, originY: 'top'
		});

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
	
	}
	
	return pointer;
}
	
export class WhiteBoard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };

		console.log("wb props:", this.props);
		this.canvasId = "canvas-" + this.props.id;
        this.slide = 0;

		this.handleWindowResize = this.handleWindowResize.bind(this);

        this._modifyHandler = this._modifyHandler.bind(this);
		this._createHandler = this._createHandler.bind(this);
		
        console.log("wbid:", this.props.id)
    }

    componentDidMount() {
        var canvas;
     
		canvas = new fabric.StaticCanvas(this.canvasId, {
			width: this.canvas.clientWidth,
			height: this.canvas.clientHeight
		});
      

		console.log("canvas client size:", this.canvas.clientWidth, this.canvas.clientHeight, 
				this.props.width, this.props.height);

        canvas.wbId = this.props.id;
        canvas.slide = this.slide;
		canvas.selection = false;
		
		if (this.props.backgroundImage) {
   		    canvas.setBackgroundImage(this.props.backgroundImage, 
					function() {
						canvas.renderAll();
					}, 
					{
						width:this.props.width, 
						height:this.props.height, 
						originX: 'left',
						originY: 'top'
					});
		}

		this.fabric = canvas;

		this._setSize(this.props.width, this.props.height);
		window.addEventListener('resize', this.handleWindowResize)
	}
	
    componentWillUnmount() {
        console.log("message component will unmount");
		window.removeEventListener('resize', this.handleWindowResize)
    }

    toJSON() {
        return JSON.stringify(this.fabric);
    }

    loadJSON(json) {
        this.fabric.loadFromJSON(json, () => {
            this.fabric.renderAll();
        });
    }

    getSize() {
        var zoom = this.fabric.getZoom();
        return {w:this.fabric.getWidth()/zoom, h:this.fabric.getHeight()/zoom}
    }
    
    setSize(size) {
        this._setSize(size.w, size.h);
    }

    load(obj) {
        console.log("obj:", obj.wbId, obj.name, obj.width, obj.height, obj.zoom, obj.zoomMode, obj.obj);

        this._setSize(obj.width, obj.height);

        if (obj.obj && obj.obj.length > 0) {
            this.createObj(obj.obj);
        }
    }
    
    clearAll() {
        this.clearSlide(this.slide);
    }

    clearSlide(_sl) {
        let canvas = this.fabric;
        canvas.renderOnAddRemove = false;
        let arr = canvas.getObjects();
        while (arr.length > 0) {
            canvas.remove(arr[arr.length - 1]);
            arr = canvas.getObjects();
        }
        canvas.renderOnAddRemove = true;
        canvas.renderAll();
    }
    createObj(obj) {
		let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
		for (let i = 0; i < _arr.length; ++i) {
			let o = _arr[i];
			switch(o.type) {
				case 'pointer':
					APointer().create(this.fabric, o);
					break;
				default:
					var __o = this._findObject(o);
					if (!__o) {
						arr.push(o);
					}
					break;
			}
		}
		if (arr.length > 0) {
			this._createObject(arr, this._createHandler);
		}
    };

    removeObj(arr) {
		for (var i = 0; i < arr.length; ++i) {
			this._removeHandler(arr[i]);
		}
    }
    
    modifyObj(obj) { //TODO need to be unified
		let arr = [], _arr = Array.isArray(obj) ? obj : [obj];
		for (let i = 0; i < _arr.length; ++i) {
			let o = _arr[i];
			switch(o.type) {
				case 'pointer':
					this._modifyHandler(APointer().create(canvases[o.slide], o))
					break;
				default:
					arr.push(o);
					break;
			}
		}
		if (arr.length > 0) {
			this._createObject(arr, this._modifyHandler);
		}
    }
    
    _findObject(o) {
		var _o = null;
		this.fabric.forEachObject(function(__o) {
			if (!!__o && o.uid === __o.uid) {
				_o = __o;
				return false;
			}
		});
		return _o;
    }

    _removeHandler(o) {
		var __o = this._findObject(o);
		if (!!__o) {
			var cnvs = this.fabric;
			if (!!cnvs) {
				cnvs.remove(__o);
			}
		}
    }
    
    _modifyHandler(_o) {
		this._removeHandler(_o);
		this._createHandler(_o);
    }
    
	_createHandler(_o) {
		switch (_o.fileType) {
			case 'Video':
			case 'Recording':
			case 'Presentation':
				//no-op
				break;
			default:
			{
				let canvas = this.fabric;
				if (!!canvas) {
					_o.selectable = canvas.selection;
					canvas.add(_o);
				}
			}
				break;
		}
    }
    
    _createObject(arr, handler) {
        var self = this;
		fabric.util.enlivenObjects(arr, function(objects) {
        	self.fabric.renderOnAddRemove = false;
			for (var i = 0; i < objects.length; ++i) {
				var _o = objects[i];
				_o.loaded = true;
				handler(_o);
			}
    		self.fabric.renderOnAddRemove = true;
			self.fabric.renderAll();
		});
    };
        
	_setSize(width, height) {
		//center in the document, fullFit margin:8
		var windowWidth = document.body.clientWidth - 16;
		var windowHeight = document.body.clientHeight - 16;
		var zoom = Math.min(windowWidth/width, windowHeight/height);
		var w = zoom*width;
		var h = zoom*height;
		this.fabric.setWidth(zoom * width).setHeight(zoom * height).setZoom(zoom);
		if (this.fabric.backgroundImage) {
			var backgroundImage = this.fabric.backgroundImage;
			backgroundImage.setWidth(width);
			backgroundImage.setHeight(height);
		}

		this.area.style.width = w;
		this.area.style.height = h;
		this.area.style.top = 8;
		this.area.style.left = 8;
    }

	handleWindowResize(e) {
		console.log("window resize event:", e);
		//center in the document, fullFit margin:8
		var width = this.props.width;
		var height = this.props.height;
		var windowWidth = document.body.clientWidth - 16;
		var windowHeight = document.body.clientHeight - 16;
		var zoom = Math.min(windowWidth/width, windowHeight/height);
		var w = zoom*width;
		var h = zoom*height;
		this.fabric.setWidth(zoom * width).setHeight(zoom * height).setZoom(zoom);

		this.area.style.width = w;
		this.area.style.height = h;
		this.area.style.top = 8;
		this.area.style.left = 8;
	}

    render() {
        return (
            <div className={styles["wb-area"]} ref={e => this.area=e}>
                <canvas id={this.canvasId} className={styles["wb-canvas"]} ref={(e) => this.canvas = e} />
            </div>
        );
    }

    toOmJson(o) {
		let r = o.toJSON(extraProps);
		if (o.omType === 'Video') {
			r.type = 'video';
			delete r.objects;
			return r;
		}
		return r;
    }

	getCanvas() {
		return this.fabric;
    }
    
    eachCanvas(func) {
        func(this.fabric);
    }
}