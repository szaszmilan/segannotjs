import { EventManager } from './event-manager.js';
import * as global from './global.js';

export class Video {
  constructor() {
    this.name = false;
    this.segmentLen = false;
    this.imgArray = false;
    this.maskArray = false;
    this.segmentLoaded = false;
    this.actualShownIdx = 0;
    this.from = false;
    this.to = false;
  }

  setVideoData(name, len) {
    this.name = name;
    this.fullVideoLen = len;
    this.actualShownIdx = 0;
  }

  setSegmentData(from, to) {
    this.from = from;
    this.to = to;
    this.segmentLen = to - from + 1;
    this.segmentLoaded = false;
    this.imgArray = new Array();
    this.maskArray = new Array(this.segmentLen);
    this.maskArray.fill(false);
  }

  addImg(img) {
    this.imgArray.push(img);
    if (this.segmentLen == this.imgArray.length) {
      this.segmentLoaded = true;
    }
  }
}

class LoadBarManager extends EventManager {
  constructor() {
    super();

    this.maxValue = false;
    this.status = '';
    this.seekBar = document.getElementById(global.BAR);
    this.innerSeekBar = document.getElementById(global.INNER_BAR);
    this.seekBarLabel = document.getElementById(global.BAR_LABEL);
    this.loadingValue = 0;
  }

  displayMsg(msg) {
    this.innerSeekBar.style.width = 0 + '%';
    this.seekBarLabel.innerHTML = msg;
  }

  initBar(status, maxValue) {
    this.status = status;
    this.maxValue = maxValue;
    this.loadingValue = 0;
    this.changeBar(0);
  }

  clearBar() {
    this.seekBarLabel.innerHTML = '';
    this.innerSeekBar.style.width = 0 + '%';
  }

  changeBar(idx) {
    this.innerSeekBar.style.width = idx / this.maxValue * 100 + '%';
    this.seekBarLabel.innerHTML = this.status + ': ' + idx + '/' + this.maxValue;
    if (this.loadingValue >= this.maxValue) {
      this.seekBarLabel.innerHTML = 'Finished ' + this.status;
    }
  }

  progressLoad() {
    this.loadingValue += 1;
    this.changeBar(this.loadingValue);
  }
}

class Interaction {
  static SCRIBBLE = new Interaction('Scribble');
  static CLICK = new Interaction('Click');

  constructor(name) {
    this.name = name;
  }
  toString() {
    return `Interaction.${this.name}`;
  }
}

class CanvasManager extends EventManager {
  constructor() {
    super();

    this.imgCanvas = document.getElementById(global.IMG_CANVAS);
    this.imgCtx = this.imgCanvas.getContext("2d");
    this.maskCanvas = document.getElementById(global.MASK_CANVAS);
    this.maskCtx = this.maskCanvas.getContext("2d");
    this.drawCanvas = document.getElementById(global.DRAW_CANVAS);
    this.drawCtx = this.drawCanvas.getContext("2d");
    this.canvDiv = document.getElementById(global.CANVAS_DIV);
    this.canvCatDiv = document.getElementById(global.CANVAS_CATEGORY_DIV);
    this.flag = false;
    this.prevX = 0;
    this.currX = 0;
    this.prevY = 0;
    this.currY = 0;
    this.dot_flag = false;
    this.y = 2;
    this.video = false;
    this.objectIdx = 1;
    this.fullscreen = false;
    this.interactionMode = Interaction.SCRIBBLE;

    this.colorMap = []

    document.body.addEventListener("keydown", (e) => this.keyPress(e));

    this.registerEvent(global.IMG_CANVAS, global.DRAW_IMG_E, (e) => this.drawImg(e.detail.imgIdx));
    this.registerEvent(global.IMG_CANVAS, global.SWITCH_OBJECT_E, (e) => { this.objectIdx = e.detail.idx });

    window.addEventListener('resize', () => this.updateCanvDivSize());
    this.drawCanvas.addEventListener("mousemove", (e) =>
      this.findxy('move', e), false);
    this.drawCanvas.addEventListener("mousedown", (e) =>
      this.findxy('down', e), false);
    this.drawCanvas.addEventListener("mouseup", (e) =>
      this.findxy('up', e), false);
    this.drawCanvas.addEventListener("mouseout", (e) =>
      this.findxy('out', e), false);
  }

  keyPress(event) {
    switch (event.key) {
      case 'a':
        this.previousImg();
        break;
      case 'd':
        this.nextImg();
        break;
      case 't':
        this.toggleFullscreen();
        break;
      case 'm':
        this.toggleMaskOverlay();
        break;
      case 'c':
        //this.toggleClicInteraction();
        break;
    }
  }

  toggleClicInteraction() {
    if (this.interactionMode == Interaction.CLICK) {
      this.interactionMode = Interaction.SCRIBBLE;
    } else if (this.interactionMode == Interaction.SCRIBBLE) {
      this.interactionMode = Interaction.CLICK;
    }
  }

  toggleFullscreen() {
    if (!this.fullscreen) {
      this.fullscreen = true;
      if (this.canvDiv.requestFullscreen) {
        this.canvDiv.requestFullscreen();
      } else if (this.canvDiv.webkitRequestFullscreen) { /* Safari */
        this.canvDiv.webkitRequestFullscreen();
      } else if (this.canvDiv.msRequestFullscreen) { /* IE11 */
        this.canvDiv.msRequestFullscreen();
      }
      this.updateCanvDivSize();
    } else {
      this.fullscreen = false;
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      this.updateCanvDivSize();
    }
  }

  nextImg() {
    var idx = this.video.actualShownIdx + 1;
    if (idx < this.video.segmentLen) {
      this.drawImg(idx);
      this.callEvent(global.SWITCH_IMG_E, { idx: idx, });
    }
  }

  previousImg() {
    var idx = this.video.actualShownIdx - 1;
    if (idx >= 0) {
      this.drawImg(idx);
      this.callEvent(global.SWITCH_IMG_E, { idx: idx, });
    }
  }

  resizeCanvas(height, width) {
    this.imgCanvas.width = width;
    this.imgCanvas.height = height;
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    this.drawCanvas.width = width;
    this.drawCanvas.height = height;
    this.width_per_height = width / height;
    this.updateCanvDivSize();
  }

  drawImg(idx) {
    this.video.actualShownIdx = idx;
    this.imgCtx.drawImage(this.video.imgArray[idx], 0, 0, this.imgCanvas.width, this.imgCanvas.height);
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    if (this.video.maskArray[idx] != false) {
      this.maskCtx.drawImage(this.video.maskArray[idx], 0, 0, this.maskCanvas.width, this.maskCanvas.height);
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    }
    this.callEvent(global.ACTUAL_IMAGE_E, { 'idx': idx });
  }

  toggleMaskOverlay() {
    if (this.maskCanvas.style.visibility == 'hidden') {
      this.maskCanvas.style.visibility = 'visible';
      this.callEvent(global.MASK_OVERLAY_E, { 'isOverlayOn': true });
    } else {
      this.maskCanvas.style.visibility = 'hidden';
      this.callEvent(global.MASK_OVERLAY_E, { 'isOverlayOn': false });
    }

  }

  updateCoords(e) {
    this.prevX = this.currX;
    this.prevY = this.currY;
    var margin = window.getComputedStyle(this.canvDiv).getPropertyValue('margin');
    margin = parseInt(margin);
    var padding = 0;
    if (!this.fullscreen) {
      var padding = window.getComputedStyle(this.canvCatDiv).getPropertyValue('padding');
      padding = parseInt(padding);
    }
    this.currX = (e.clientX - this.drawCanvas.offsetLeft - padding - margin) * (this.drawCanvas.width / this.drawCanvas.clientWidth);
    this.currY = (e.clientY - this.canvDiv.offsetTop + document.documentElement.scrollTop) * (this.drawCanvas.height / this.drawCanvas.clientHeight);
  }

  findxy(res, e) {
    if (!this.video.segmentLoaded) { return; }
    if (res == 'down') {

      this.updateCoords(e);
      this.callEvent(global.SEND_POINT_E, { 'interactionMode': this.interactionMode.name, 'x': this.currX, 'y': this.currY, 'objectIdx': this.objectIdx, 'interactedIdx': this.video.actualShownIdx });

      this.flag = true;
      this.dot_flag = true;
      if (this.interactionMode == Interaction.SCRIBBLE) {
        if (this.dot_flag) {
          this.drawCtx.beginPath();
          this.drawCtx.fillStyle = this.colorMap[this.objectIdx];
          this.drawCtx.fillRect(this.currX, this.currY, 2, 2);
          this.drawCtx.closePath();
          this.dot_flag = false;
        }
      } else if (this.interactionMode == Interaction.CLICK) {
        this.draw();
      }
    }
    if (res == 'up' || res == "out") {
      if (this.flag) {
        this.callEvent(global.SEND_END_PATH_E, { 'interactedIdx': this.video.actualShownIdx });
        this.callEvent(global.INTERACT_IMG_E, { idx: this.video.actualShownIdx, });
      }
      this.flag = false;
    }
    if (res == 'move' && this.interactionMode == Interaction.SCRIBBLE) {
      if (this.flag) {
        this.updateCoords(e);
        this.callEvent(global.SEND_POINT_E, { 'interactionMode': this.interactionMode.name, 'x': this.currX, 'y': this.currY, 'objectIdx': this.objectIdx, 'interactedIdx': this.video.actualShownIdx });
        this.draw();
      }
    }
  }

  draw() {
    if (this.interactionMode == Interaction.SCRIBBLE) {
      this.drawCtx.beginPath();
      this.drawCtx.moveTo(this.prevX, this.prevY);
      this.drawCtx.lineTo(this.currX, this.currY);
      this.drawCtx.strokeStyle = this.colorMap[this.objectIdx];
      this.drawCtx.lineWidth = this.y;
      this.drawCtx.stroke();
      this.drawCtx.closePath();
    } else if (this.interactionMode == Interaction.CLICK) {
      this.drawCtx.beginPath();
      this.drawCtx.fillStyle = this.colorMap[this.objectIdx];
      this.drawCtx.arc(this.currX, this.currY, 2, 0, 2 * Math.PI);
      this.drawCtx.fill();
      this.drawCtx.closePath();
    }
  }


  updateCanvDivSize() {
    var height;
    if (this.fullscreen) {
      height = window.innerHeight;
    } else {
      height = window.innerHeight - 260;
    }
    var h = height + "px";
    this.canvDiv.style.height = h;
    this.drawCanvas.style.height = h;
    this.maskCanvas.style.height = h;
    this.imgCanvas.style.height = h;
    this.callEvent(global.CAT_DIV_HEIGHT, { height: h, });

    var width = height * this.width_per_height;
    var w = width + "px";
    this.canvDiv.style.width = w;
    this.drawCanvas.style.width = w;
    this.maskCanvas.style.width = w;
    this.imgCanvas.style.width = w;

    if (this.fullscreen) {
      var left = (window.innerWidth - width) / 2 + 'px';
      this.drawCanvas.style.left = left;
      this.maskCanvas.style.left = left;
      this.imgCanvas.style.left = left;
    } else {
      var left = '0px';
      this.drawCanvas.style.left = left;
      this.maskCanvas.style.left = left;
      this.imgCanvas.style.left = left;
    }
  }
}

export class InteractiveCanvas {
  constructor() {
    this.canvasManager = new CanvasManager();
    this.loadBarManager = new LoadBarManager();
    this.currentIdx = false;
    this.video = false;
  }

  storeMask(mask, idx) {
    this.canvasManager.storeMask(mask, idx);
  }

  resizeCanvas(height, width) {
    this.canvasManager.resizeCanvas(height, width);
  }

  progressLoad() {
    this.loadBarManager.progressLoad();
  }

  initLoadBar(status, maxValue) {
    this.loadBarManager.initBar(status, maxValue);
  }

  addVideo(video) {
    this.video = video;
    this.canvasManager.video = video;
  }

  displayMsg(msg) {
    this.loadBarManager.displayMsg(msg);
  }

  clearBar() {
    this.loadBarManager.clearBar();
  }

  setColormap(colormap) {
    this.canvasManager.colorMap = colormap;
  }
}

