import { EventManager } from './event-manager.js';
import * as global from './global.js';
import { Video, InteractiveCanvas } from './canvas-interactor.js';
import { GlobalTimelineManager, LocalTimelineManager } from './timeline-manager.js';
import { CategoryManager } from './category-manager.js';
import { Settings } from './settings.js';
import { FileManager } from './file_manager.js';
import { StatusBar } from './status-bar.js';

class State {
  static NO_SESSION = new State('NoSession');
  static LOADED_SESSION = new State('LoadedSession');
  static LOADED_VIDEO_SESSION = new State('VideoLoadedSession');
  static LOADING_DATA = new State('LoadingData');
  static SEGMENT_LOADED = new State('SegmentLoaded');
  static NO_MEMORY = new State('NoMemory');
  static PROPAGATING = new State('Propagating');

  constructor(name) {
    this.name = name;
  }
  toString() {
    return `State.${this.name}`;
  }
}

export class App extends EventManager {
  constructor() {
    super();

    this.socket = io({ transports: ['websocket'], upgrade: false, timeout: 600000, pingInterval: 600000, pingTimeout: 600000 });

    document.body.addEventListener('keydown', (e) => this.keyPress(e));
    this.registerEvent(global.BODY, global.ADD_OBJECT_E, (e) => this.sendCategory(e.detail.name));
    this.registerEvent(global.BODY, global.SWITCH_SEGMENT_E, (e) => this.changeSegment(e.detail.from, e.detail.to));
    this.registerEvent(global.BODY, global.SEND_POINT_E, (e) => this.sendPoint(e.detail));
    this.registerEvent(global.BODY, global.SEND_END_PATH_E, (e) => this.endPath(e.detail));
    this.registerEvent(global.BODY, global.SEND_SEGMENT_SIZE_E, (e) => this.sendSegmentSize(e.detail));
    this.registerEvent(global.BODY, global.SEND_PROPAGATION_LENGTH_E, (e) => this.sendPropagationLength(e.detail));
    this.registerEvent(global.BODY, global.CHANGE_MODEL_PARAM_E, (e) => this.sendModelParamChange(e.detail));
    this.registerEvent(global.BODY, global.REQUEST_VIDEO_E, (e) => this.requestVideo(e.detail.path));
    this.registerEvent(global.BODY, global.GET_WORKING_DIRECTORY_TREE_E, (e) => this.getWorkingDirectoryTree(e.detail.workingDir));
    this.registerEvent(global.BODY, global.LOAD_SESSION_E, (e) => this.loadSession(e.detail.path));

    this.video = new Video();
    this.interactiveCanvas = new InteractiveCanvas();
    this.localTimelineManager = new LocalTimelineManager();
    this.globalTimelineManager = new GlobalTimelineManager();
    this.categoryManager = new CategoryManager();
    this.settings = new Settings();
    this.fileManager = new FileManager();
    this.statusBar = new StatusBar(this.connected);

    var offCanvasElement = document.getElementById(global.HELP_OFFCANVAS);
    this.helpOffcanvas = new bootstrap.Offcanvas(offCanvasElement);

    this.addSocketEvents();
    this.addButtonsAndEvents();

    this.changeState(State.NO_SESSION);
    this.socket.emit('getVersion');
  }

  changeState(new_state) {
    this.actualState = new_state;

    if (new_state === State.NO_SESSION) {
      this.categoryButton.disabled = true;
      this.propButton.disabled = true;
      this.saveButton.disabled = true;
      this.saveOverlayedButton.disabled = true;
      this.undoInteractionButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(true, 'No session/video loaded.');
      this.statusBar.stopUpdateCheking();
    } else if (new_state === State.LOADED_VIDEO_SESSION) {
      this.categoryButton.disabled = false;
      this.propButton.disabled = true;
      this.saveButton.disabled = true;
      this.saveOverlayedButton.disabled = true;
      this.undoInteractionButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(false);
      this.statusBar.stopUpdateCheking();
    } else if (new_state === State.LOADED_SESSION) {
      this.categoryButton.disabled = true;
      this.propButton.disabled = true;
      this.saveButton.disabled = true;
      this.saveOverlayedButton.disabled = true;
      this.undoInteractionButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(false);
      this.statusBar.stopUpdateCheking();
    } else if (new_state === State.SEGMENT_LOADED) {
      this.categoryButton.disabled = true;
      this.propButton.disabled = false;
      this.saveButton.disabled = false;
      this.saveOverlayedButton.disabled = false;
      this.undoInteractionButton.disabled = false;
      this.globalTimelineManager.setDisabledSwitching(false);
    } else if (new_state === State.NO_MEMORY) {
      this.propButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(true, "Memory is zero!");
    } else if (new_state === State.PROPAGATING) {
      this.propButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(true, "Can't switch segment during propagation!");
    } else if (new_state === State.LOADING_DATA) {
      this.categoryButton.disabled = true;
      this.propButton.disabled = true;
      this.saveButton.disabled = true;
      this.saveOverlayedButton.disabled = true;
      this.undoInteractionButton.disabled = true;
      this.globalTimelineManager.setDisabledSwitching(true, "Can't swith segment during loading!");
    }
  }

  resetBeforeLoad() {
    this.localTimelineManager.resetTimeLine();
    this.globalTimelineManager.resetTimeLine();
    this.categoryManager.reset();
    this.interactiveCanvas.clearBar();
  }

  loadSession(path) {
    this.resetBeforeLoad();
    this.socket.emit('loadSession', { 'path': path });
  }

  loadInteractedFrames(interactedFrames, last) {
    this.localTimelineManager.loadInteractedFrames(interactedFrames, last);
  }

  setColormap(colormap) {
    var rgba_colormap = new Array();
    colormap.forEach(color => {
      const r = color[0];
      const g = color[1];
      const b = color[2];
      var rgba = `rgba(${r},${g},${b},100)`;
      rgba_colormap.push(rgba);
    });

    this.categoryManager.colorMap = rgba_colormap;
    this.interactiveCanvas.setColormap(rgba_colormap);
  }

  getWorkingDirectoryTree(workingDir) {
    this.socket.emit('getWorkingDirectoryTree', { 'path': workingDir });
  }

  requestVideo(path) {
    this.resetBeforeLoad();
    this.changeState(State.LOADING_DATA);
    this.socket.emit('requestVideo', { 'path': path });
  }

  sendCategory(name) {
    var data = {
      'param': 'category',
      'name': name
    };
    this.sendModelParamChange(data);
  }

  sendSegmentSize(data) {
    data.param = 'segmentSize';
    this.sendModelParamChange(data);
    this.globalTimelineManager.segmentSize = data.segmentSize;
  }

  sendPropagationLength(data) {
    data.param = 'propagationLength';
    this.sendModelParamChange(data);
  }

  sendModelParamChange(data) {
    this.socket.emit('changeModelParam', data);
  }

  keyPress(event) {
    switch (event.key) {
      case 's':
        this.settings.toggleOffCanvas();
        break;
      case 'f':
        this.fileManager.toggleOffCanvas();
        break;
      case 'u':
        this.undoInteraction();
        break;
      case 'h':
        this.helpOffcanvas.toggle();
        break;
    }
  }

  changeSegment(from, to) {
    if (this.categoryManager.hasCategory()) {
      this.localTimelineManager.resetTimeLine();
      this.socket.emit('loadSegment', { 'from': from, 'to': to });
      this.changeState(State.LOADING_DATA);
    } else {
      alert("Please add a category!");
    }
  }

  addButtonsAndEvents() {
    this.propButton = document.getElementById('propagateButton');
    this.saveButton = document.getElementById('saveButton');
    this.saveOverlayedButton = document.getElementById('saveOverlayedButton');
    this.categoryButton = document.getElementById('categoryButton');
    this.undoInteractionButton = document.getElementById('undoInteractionButton');
    this.propButton.onclick = () => { this.doPropagation(); };
    this.saveButton.onclick = () => {
      this.socket.emit('saveSession');
      this.statusBar.updateLastSave();
    };
    this.saveOverlayedButton.onclick = () => {
      this.socket.emit('saveOverlayedSession');
      this.statusBar.updateLastSave();
    };
    this.categoryButton.onclick = () => { this.addCategory(); };
    this.undoInteractionButton.onclick = () => { this.undoInteraction(); };
  }

  doPropagation() {
    this.socket.emit('propagate');
    this.prevState = this.actualState;
    this.changeState(State.PROPAGATING);
  }

  addCategory() {
    var retVal = prompt("Enter category name : ", "category");
    if (retVal !== null) {
      this.categoryManager.createCategory(retVal);
    }
  }

  sendPoint(data) {
    this.socket.emit('point', data);
  }

  undoInteraction() {
    var data = {
      'interactedIdx': this.video.actualShownIdx
    };
    this.socket.emit('undoInteraction', data);
  }

  endPath(data) {
    this.socket.emit('endPath', data);
  }

  addSocketEvents() {
    this.socket.on('disconnect', (reason) => {
      this.callEvent(global.CONNECT_E, { 'isConnected': false });
      console.log('User 1 disconnected because ' + reason);
    });

    this.socket.on('connect', () => {
      this.callEvent(global.CONNECT_E, { 'isConnected': true });
    });

    this.socket.on('restoreRequest', () => {
      var retval = confirm('Do you want to reload the client?');
      if (retval) {
        this.resetBeforeLoad();
        this.socket.emit('restore');
      }
    });

    this.socket.on('memoryChange', (data) => {
      // if free memory is 0 or less
      if (data.memory[0] <= 0) {
        if (this.actualState !== State.NO_MEMORY) {
          this.prevState = this.actualState;
        }
        this.changeState(State.NO_MEMORY);
      } else if (this.actualState === State.NO_MEMORY) {
        this.changeState(this.prevState);
        this.globalTimelineManager.setDisabledSwitching(false);
      }
      this.settings.updateMemoryPie(data.memory);
    });

    this.socket.on('workingDirectoryTree', (data) => {
      this.fileManager.drawTree(data.json);
    });

    this.socket.on("videoInfo", (data) => {
      this.video = new Video();
      this.video.setVideoData(data.name, data.length);
      this.globalTimelineManager.setParams(0, data.length - 1);
      this.interactiveCanvas.addVideo(this.video);
      this.interactiveCanvas.resizeCanvas(data.height, data.width);

      var state;
      if (data.loadedSession) {
        state = State.LOADED_SESSION;
      } else {
        state = State.LOADED_VIDEO_SESSION;
      }
      this.changeState(state);
    });

    this.socket.on("segmentInfo", (data) => {
      this.video.setSegmentData(data.from, data.to);
      this.interactiveCanvas.initLoadBar('Loading', this.video.segmentLen);
      this.settings.changePropagationRange(this.video.segmentLen)
      this.localTimelineManager.setParams(data.from, data.to);
      this.globalTimelineManager.setActualSegment(data.from, data.to);
    });

    this.socket.on('versionInfo', (data) => {
      this.statusBar.setVersionStatus(data.version);
    });

    this.socket.on('segmentSize', (data) => {
      this.settings.setSegmentSize(data.segmentSize);
    });

    this.socket.on('propagationDone', () => {
      this.changeState(this.prevState);
      this.globalTimelineManager.setDisabledSwitching(false);
    });

    this.socket.on('loadingSegmentDone', () => {
      this.changeState(State.SEGMENT_LOADED);
      this.statusBar.updateLastSave();
      this.statusBar.startUnsavedCheking();
    });

    this.socket.on('sessionInfo', (data) => {
      this.globalTimelineManager.updateInteractedParts(data.parts);
    });

    this.socket.on('categoryInfo', (data) => {
      this.categoryManager.loadCategories(data.categories);
    });

    this.socket.on('propagationInfo', (data) => {
      this.localTimelineManager.updatePropagatedParts(data.parts, data.lastPart);
    });

    this.socket.on('nextPropagationInfo', (data) => {
      this.localTimelineManager.updateNextPropagation(data.nextPropagation);
    });

    this.socket.on('maskInfo', (data) => {
      this.interactiveCanvas.initLoadBar('Receiving masks', data.num);
    });

    this.socket.on('saveInfo', (data) => {
      if (data.overlayed) {
        this.interactiveCanvas.initLoadBar('Saving overlayed masks', data.num);
      } else {
        this.interactiveCanvas.initLoadBar('Saving masks', data.num);
      }
    });

    this.socket.on('progressSave', () => {
      this.interactiveCanvas.progressLoad();
    });

    this.socket.on('totalPropCallback', (data) => {
      this.interactiveCanvas.initLoadBar(data.prefix + ' Propagating', data.num);
    });

    this.socket.on('stepPropCallback', () => {
      this.interactiveCanvas.progressLoad();
    });

    this.socket.on('interactedFrames', (data) => {
      this.loadInteractedFrames(data.interactedFrames, data.last);
    });

    this.socket.on('imagesSent', () => {
      this.localTimelineManager.initialized = true;
      this.interactiveCanvas.canvasManager.drawImg(this.video.actualShownIdx);
    });

    this.socket.on('colormap', (data) => {
      this.setColormap(data.colormap);
    });

    this.socket.on('masksSent', () => {
      this.interactiveCanvas.canvasManager.drawImg(this.video.actualShownIdx);
    });

    this.socket.on('barMessage', (data) => {
      this.interactiveCanvas.displayMsg(data.message);
    })

    this.socket.on("transferMask", (data) => {
      var img = new Image();
      img.onload = () => {
        this.video.maskArray[data.idx] = img;
        if (data.progress) {
          this.interactiveCanvas.progressLoad();
        } else {
          this.interactiveCanvas.canvasManager.drawImg(this.video.actualShownIdx);
        }
      }
      img.src = 'data:image/png;base64,' + data.mask;
    });

    this.socket.on("transferImage", (image) => {
      var img = new Image();
      img.onload = () => {
        this.video.addImg(img);
        this.interactiveCanvas.progressLoad();
      };
      img.src = 'data:image/jpeg;base64,' + image.image_data;
    });
  }
}
