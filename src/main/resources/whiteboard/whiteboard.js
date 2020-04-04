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
	
const QUESTION_CHOICE = "choice";
const QUESTION_JUDGEMENT = "judgement";

export class WhiteBoard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };

		console.log("wb props:", this.props);
		this.canvasId = "canvas-" + this.props.id;
		this.slide = 0;
		this.slides = [{}];

		this.handleWindowResize = this.handleWindowResize.bind(this);

        this._modifyHandler = this._modifyHandler.bind(this);
		this._createHandler = this._createHandler.bind(this);
		
        console.log("wbid:", this.props.id);
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
		this.fabric = canvas;
		this._setSize(this.props.width, this.props.height);
		window.addEventListener('resize', this.handleWindowResize)
	}
	
    componentWillUnmount() {
        console.log("message component will unmount");
		window.removeEventListener('resize', this.handleWindowResize)
    }

    toJSON() {
		return this.toOmJson(this.fabric);
    }

    getSize() {
        var zoom = this.fabric.getZoom();
        return {w:this.fabric.getWidth()/zoom, h:this.fabric.getHeight()/zoom}
    }
    
    setSize(size) {
        this._setSize(size.w, size.h);
    }

    load(obj) {
		console.log("load obj:", JSON.stringify(obj));

		//initialize
		this.slide = obj.slide;
		if (obj.exercise) {
			this.slides = obj.exercise.questions.map(() => {
				return {};
			});
		} else if (obj.slides) {
			this.slides = obj.slides.map((url) => {
				return {background:url};
			})
		} else {
			this.slides = [{}];
		}

		if (obj.obj && obj.obj.length > 0) {
			for (var i = 0; i < obj.obj.length; i++) {
				let elem = obj.obj[i];
				if (elem.slide >= 0 && elem.slide < this.slides.length) {
					//其他页的对象暂时保存
					let s = this.slides[elem.slide];
					if (!s.obj) {
						s.obj = [];
					}
					s.obj.push(elem);
				}
			}
		}

		var slide = this.slides[this.slide];
		if (slide.obj) {
			this.createObj(slide.obj);
			delete(slide.obj);
			this.setBackground(slide);
		} else {
			this.setBackground(slide);
		}

		this._setSize(obj.width, obj.height);
		if (obj.exercise) {
			this.setState({exercise:obj.exercise});
		}
    }
    
    clearAll() {
        this.clearSlide(this.slide);
    }

    clearSlide(_sl) {
		if (_sl != this.slide) {
			//只能清除当前页
			return;
		}
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
	
	setSlide(_sl) {
		if (this.slide == _sl) {
			return;
		}

		if (_sl < 0 || _sl >= this.slides.length) {
			return;
		}

		console.log("set slide:", _sl);
		var slide = this.slides[this.slide];
		slide.json = this.toOmJson(this.fabric);

		this.slide = _sl;
		slide = this.slides[this.slide];
		var canvas = this.fabric;
		canvas.slide = this.slide;
		canvas.clear();

		if (slide.obj && slide.obj.length > 0) {
			this.createObj(slide.obj);
			delete(slide.obj);
			this.setBackground(slide);
		} else if (slide.json) {
			canvas.loadFromJSON(slide.json, () => {
				this.fabric.renderAll();
				this.setBackground(slide);
			});
		} else {
			this.setBackground(slide);
		}

		if (this.state.exercise) {
			//render question
			this.setState({});
		}
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
	
	setBackground(slide) {
		if (slide.backgroundImage) {
			this.setBackgroundPosition(this.props.width, this.props.height, slide.backgroundImage);
			this.fabric.setBackgroundImage(slide.backgroundImage,
					() => {
						console.log("set background image success");
						this.fabric.renderAll();
					},
					{
						originX: 'left',
						originY: 'top'
					});
		} else if (slide.background) {
			fabric.Image.fromURL(slide.background, (img) => {
				console.log("load background image success:", img.width, img.height);
				slide.backgroundImage = img;
				this.setBackgroundPosition(this.props.width, this.props.height, slide.backgroundImage);
				this.fabric.setBackgroundImage(slide.backgroundImage,
						() => {
							console.log("set background image success");
							this.fabric.renderAll();
						},
						{
							originX: 'left',
							originY: 'top'
						});
			});
		} else {
			this.fabric.backgroundImage = undefined;
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
		
		
	setBackgroundPosition(width, height, img) {
		img = img || this.fabric.backgroundImage;
		if (img) {
			console.log("before set canvas background size:", img.width, img.height);
			let scale = Math.min(width/img.width, height/img.height);
			img.scaleToWidth(scale*img.width, true);
			img.scaleToHeight(scale*img.height, true);
			let x = (width - scale*img.width)/2;
			let y = (height - scale*img.height)/2
			let point = new fabric.Point(x, y);
			img.setPositionByOrigin(point, "left", "top");
			console.log("set canvas background size:", this.props.name, width, height, x, y, img.width, img.height, scale);
		}
	}
	
	_setSize(width, height) {
		let w = this.area.clientWidth;
		let h = this.area.clientHeight;

        //fullFit
        var zoom = Math.min(w/width, h/height);
		this.fabric.setWidth(zoom * width).setHeight(zoom * height).setZoom(zoom);
		this.setBackgroundPosition(width, height);

		//居中
		var x = (w - (zoom*width))/2;
		var y = (h - (zoom*height))/2;


		var canvasBackground = this.area.children[0];
		canvasBackground.style.left = x;
		canvasBackground.style.top = y;
		canvasBackground.style.width = zoom*width;
		canvasBackground.style.height = zoom*height;

		var canvasContainer = this.area.children[1];
		canvasContainer.style.left = x;
		canvasContainer.style.top = y;

		console.log("set canvas size:", this.props.name, width, height, x, y, zoom * width, zoom * height, zoom, this.area.clientWidth, this.area.clientHeight);
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

	renderQuestion() {
		if (!this.state.exercise) {
			return null;
		}

		if (this.slide < 0 || this.slide > this.state.exercise.questions.length) {
			console.log("invalid slide:", this.slide);
			return null;
		}
		var question = this.state.exercise.questions[this.slide];
		if (question.type == QUESTION_CHOICE) {
			var options = question.options.map((opt, index) => {
				var prefix = String.fromCodePoint('A'.codePointAt(0) + index);
				return (<div key={prefix} className={styles["option"]}>{prefix + ":" + opt}</div>);
			});
			var answer = String.fromCodePoint('A'.codePointAt(0) + question.answer);
			return (
				<div className={styles["question"]}>
					<div className={styles["ask"]}>{question.ask}</div>
					{options}
					<div className={styles["answer"]}>{"答案:" + answer}</div>
				</div>
			);
		} else if (question.type == QUESTION_JUDGEMENT) {
			var answer = question.answer ? "正确" : "错误";
			return (
				<div className={styles["question"]}>
					<div className={styles["ask"]}>{question.ask}</div>
					<div className={styles["answer"]}>{"答案:" + answer}</div>
				</div>
			);
		}
	}


    render() {
        return (
            <div className={styles["wb-area"]} ref={e => this.area=e}>
				<div className={styles["wb-background"]}>
					{this.renderQuestion()}
				</div>
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