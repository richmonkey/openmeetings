import React from 'react';
import ReactDOM from "react-dom";
import {WhiteBoard} from './whiteboard.js';
import styles from './whiteboard.less';

function getURLParameter(name, search) {
    search = search || location.search
    var param = search.match(
        RegExp(name + '=' + '(.+?)(&|$)'))
    return param ? decodeURIComponent(param[1]) : null
}

class Room extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
    
        };
    }

    componentDidMount() {
        console.log("Room did mount:" + this.props.id);
        if (window.nativeApp) {
            var s = window.nativeApp.loadWb(this.props.id);
            var json = JSON.parse(s);
            this.load(json);
        }
    }

    componentWillUnmount() {
 
    }

    load(json) {
        if (json.wbId != this.props.id) {
            console.log("invalid wb id:", json.wbId, " ", this.props.id);
            return;
        }
        console.log("load whiteboard:", json);
        this.whiteboard.load(json);
    }

    createObj(json) {
        if (json.wbId != this.props.id) {
            console.log("invalid wb id:", json.wbId, " ", this.props.id);
            return;
        }
        this.whiteboard.createObj(json.obj);
    }

    clearAll(json) {
        if (json.wbId != this.props.id) {
            console.log("invalid wb id:", json.wbId, " ", this.props.id);
            return;
        }
        this.whiteboard.clearAll();
    }

    deleteObj(json) {
        if (json.wbId != this.props.id) {
            console.log("invalid wb id:", json.wbId, " ", this.props.id);
            return;
        }
        this.whiteboard.removeObj(json.obj);
    }

    modifyObj(json) {
        if (json.wbId != this.props.id) {
            console.log("invalid wb id:", json.wbId, " ", this.props.id);
            return;
        }
        this.whiteboard.modifyObj(json.obj);
    }

    setSize(json) {
        //not support
        console.log("setSize:", json);
    }

    render() {
        var board = this.props;
        return (
            <div id={styles["room"]}>
                <WhiteBoard id={board.id} width={board.width} height={board.height} 
                                name={board.name} backgroundImage={board.background} 
                                ref={(e) => this.whiteboard=e}/>
            </div>

        );
    }
}


function getWhiteboardOptions() {
    var options = {};
    var wbId = getURLParameter("id");
    var width = getURLParameter("width");
    var height = getURLParameter("height");
    options.background = getURLParameter("background");
    options.name = getURLParameter("name");
    
    console.log("location:" + window.location);
    console.log("location search:", window.location.search);
    console.log("url parameter:" + wbId + " width:" + width);
    if (wbId) {
        wbId = parseInt(wbId);
    } else {
        wbId = 0;
    }
    if (width && height) {
        width = parseInt(width);
        height = parseInt(height);
    } else {
        width = 1920;
        height = 1080;
    }

    options.id = wbId;
    options.width = width;
    options.height = height;

    return options;
}

window.whiteboardOptions = getWhiteboardOptions();

var room;

ReactDOM.render(
    <Room id={whiteboardOptions.id} ref={a => room=a} name={whiteboardOptions.name}
           width={whiteboardOptions.width} height={whiteboardOptions.height} 
           background={whiteboardOptions.background} />,
    document.getElementById('root')
);

window.WbArea = room;
