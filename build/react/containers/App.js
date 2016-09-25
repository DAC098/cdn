var React = require('react');
var socket = require('../../socket.js');
var store = require('../../Store.js');

var DirContents = require('../components/DirContents.js');
var FileContents = require('../components/FileContents.js');
var Header = require('../components/Header.js');

var App = React.createClass({
    getInitialState: function() {
        return {
            dir: {
                path: [],
                contents: [],
                request: '',
                go_back: false,
            },
            file: {
                data: {}
            },
            viewing: {
                file: false,
                dir: true,
            }
        }
    },
    componentDidMount: function() {
        var self = this;
        let {dir} = this.state;
        let session_dir = store.get('saved_dir');
        socket.on('dir-update',self.checkCurrentDir);

        socket.on('dir-list',self.handleList);
        socket.on('file-data',self.handleFile);

        socket.on('upload-complete',() => console.log('upload complete'));
        socket.on('upload-failed',() => console.log('upload failed'));
        socket.on('upload-exists',() => console.log('upload exists'));

        socket.on('remove-complete',() => {
            console.log('remove complete');
            self.requestFolder(dir.path[dir.path.length - 2]);
        });
        socket.on('remove-failed',() => console.log('remove failed'));

        self.requestFolder((session_dir) ? session_dir : '/');
    },
    componentWillUnmount: function() {
        var self = this;
        socket.removeAllListeners();
        store.clear();
    },
    // ------------------------------------------------------------------------
    // checks
    // ------------------------------------------------------------------------
    checkCurrentDir: function(location) {
        let {dir} = this.state;
        if(dir.path[dir.path.length - 1] === location) {
            socket.emit('dir-request',location);
        }
    },
    // ------------------------------------------------------------------------
    // navigation
    // ------------------------------------------------------------------------
    handleList: function(data) {
        var {dir,viewing} = this.state;
        if(data.list) {
            dir.contents = (Array.isArray(data.list)) ? data.list : dir.contents;
            if(dir.go_back) {
                dir.path.pop();
            } else {
                dir.path.push(dir.request);
            }
            viewing.dir = true;
            viewing.file = false;
            this.setState({dir,viewing});
            store.set('saved_dir',dir.path[dir.path.length - 1]);
        } else {
            console.log('directory list is empty');
        }
    },
    handleFile: function(info) {
        var {dir,file,viewing} = this.state;
        if(info.data) {
            dir.path.push(dir.request);
            file.data = info.data;
            viewing.dir = false;
            viewing.file = true;
            this.setState({dir,file,viewing});
            store.set('saved_dir',dir.path[dir.path.length - 1]);
        } else {
            console.log('file data is empty');
        }
    },
    requestFile: function(path) {
        var {dir} = this.state;
        dir.request = path;
        socket.emit('file-request',path);
        this.setState({dir});
    },
    requestFolder: function(path) {
        var {dir} = this.state;
        dir.go_back = path === dir.path[dir.path.length - 2];
        dir.request = path;
        this.setState({dir});
        if(this.state.viewing.file && dir.go_back) {
            this.handleList({list: true})
        } else {
            socket.emit('dir-request',path);
        }
    },
    // ------------------------------------------------------------------------
    // file uploading
    // ------------------------------------------------------------------------
    uploadFiles: function(files) {
        let {dir} = this.state;
        for(let item of files) {
            console.log('file:',item);
            let fr = new FileReader();
            fr.addEventListener('loadend',() => {
                socket.emit('upload-file',({
                    data: fr.result,
                    location: dir.path[dir.path.length - 1],
                    name: item.name,
                }));
            });
            fr.readAsArrayBuffer(item);
        }
    },
    // ------------------------------------------------------------------------
    // file removing
    // ------------------------------------------------------------------------
    removeFile: function() {
        let {dir,file} = this.state;
        socket.emit('remove-file',{location:dir.path[dir.path.length - 2],name:file.data.base});
    },
    // ------------------------------------------------------------------------
    // render
    // ------------------------------------------------------------------------
    render: function() {
        var {state} = this;
        var view = undefined;
        if(this.state.viewing.file) {
            view = <FileContents dir={state.dir} file={state.file.data} requestFolder={this.requestFolder} removeFile={this.removeFile}/>
        } else {
            view = <DirContents dir={state.dir} requestFile={this.requestFile} requestFolder={this.requestFolder} />
        }
        return (
            <main className="grid">
                <Header dir={state.dir} viewing={state.viewing} requestFolder={this.requestFolder} uploadFiles={this.uploadFiles} />
                {view}
            </main>
        )
    }
});

module.exports = App;
