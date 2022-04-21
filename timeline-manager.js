import { EventManager } from './event-manager.js';
import * as global from './global.js';

class TimeLineManager extends EventManager {
  constructor(canvasID) {
    super();
    this.canvas = document.getElementById(canvasID);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.canvas.clientWidth - parseInt(this.canvas.style.paddingLeft) -
      parseInt(this.canvas.style.paddingRight);
    this.midY = this.canvas.height / 2 - 10

    this.firstFrame = '';
    this.lastFrame = '';

    window.addEventListener('resize', () => this.reDraw());
  }

  setParams(firstFrame, lastFrame) {
    this.firstFrame = firstFrame;
    this.lastFrame = lastFrame;
    this.frameHeight = 30;
    this.reDraw();
  }

  reDraw() {
    throw new Error("Method 'reDraw()' must be implemented.");
  }

  getXCoord(e) {
    var left = (e.clientX - parseInt(this.canvas.style.paddingLeft) - this.canvas.offsetLeft);
    return left;
  }

  drawRect(from, to = false, fill = true) {
    var fromX = this.frameWidth * from;
    var fromY = this.midY - this.frameHeight / 2;
    var width;
    if (to != false) {
      width = this.frameWidth * (to - from + 1);
    } else {
      width = this.frameWidth;
    }

    if (fill) {
      this.ctx.fillRect(fromX, fromY, width, this.frameHeight);
    } else {
      this.ctx.strokeRect(fromX, fromY, width, this.frameHeight);
    }
  }

  resetCanvas() {
    this.canvas.width = this.canvas.clientWidth - parseInt(this.canvas.style.paddingLeft) -
      parseInt(this.canvas.style.paddingRight);

    this.frameWidth = this.canvas.width / (this.lastFrame - this.firstFrame + 1);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawLine() {
    this.ctx.lineWidth = 5;
    this.ctx.fillStyle = 'black';
    this.ctx.strokeStyle = 'black';
    this.ctx.moveTo(0, this.midY);
    this.ctx.lineTo(this.canvas.width, this.midY);
    this.ctx.stroke();
    this.drawText(this.firstFrame, true);
    this.drawText(this.lastFrame, false);
  }

  drawText(text, begin = true) {
    this.ctx.font = "20px Arial";
    var bottomMargin = 5;
    if (begin) {
      this.ctx.fillText(text, 0, this.canvas.height - bottomMargin);
    } else {
      var width = this.ctx.measureText(text).width;
      this.ctx.fillText(text, this.canvas.width - width, this.canvas.height - bottomMargin);
    }
  }

}

export class GlobalTimelineManager extends TimeLineManager {
  constructor() {
    super(global.GLOBAL_TIMELINE_CANVAS);
    this.actualSegmentColor = 'green';
    this.interactedPartColor = 'blue';
    this.highlightedSegmentColor = 'red';
    this.interactedParts = new Array();
    this.actualSegment = { 'from': 0, 'to': 0 };
    this.segmentSize = 200;
    this.segmentSwitching = false;
    this.actualHighlightedSegment = { 'from': 0, 'to': 0 };
    this.disabledSwitching = false;

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.disabledSwitching) {
        this.setActualSegmentHighlighter(e);
      }
    });
    this.canvas.addEventListener("mousedown", (e) =>
      this.startHighlighting(e));
    this.canvas.addEventListener("mouseup", () =>
      this.switchSegment());
    this.canvas.addEventListener("mouseout", () =>
      this.switchSegment());

    this.reDraw();
  }

  resetTimeLine() {
    this.firstFrame = '';
    this.lastFrame = '';
    this.interactedParts = new Array();
    this.actualSegment = { 'from': 0, 'to': 0 };
    this.reDraw();
  }

  setDisabledSwitching(value, msg = '') {
    this.disabledSwitching = value;
    this.disabledMsg = msg;
  }

  updateInteractedParts(parts) {
    this.interactedParts = parts;
    this.reDraw();
  }

  setActualSegment(from, to) {
    this.actualSegment = { 'from': from, 'to': to };
    this.reDraw();
  }

  startHighlighting(e) {
    if (this.disabledSwitching) {
      alert(this.disabledMsg);
    } else {
      this.segmentSwitching = true;
      this.setActualSegmentHighlighter(e);
    }
  }

  setActualSegmentHighlighter(e) {
    var x = this.getXCoord(e);
    var idx = parseInt(x / this.frameWidth);
    var left, right;
    if (this.segmentSize % 2 == 0) {
      left = this.segmentSize / 2 - 1;
      right = this.segmentSize / 2;
    } else {
      left = (this.segmentSize - 1) / 2;
      right = (this.segmentSize - 1) / 2;
    }

    if (idx - left < this.firstFrame) {
      right += this.firstFrame - (idx - left);
      left = this.firstFrame;
    } else {
      left = idx - left;
    }

    if (idx + right > this.lastFrame) {
      left -= (idx + right) - this.lastFrame;
      right = this.lastFrame;
    } else {
      right = idx + right;
    }
    left = Math.max(left, this.firstFrame);
    right = Math.min(right, this.lastFrame);

    this.actualHighlightedSegment = { 'from': left, 'to': right };
    this.reDraw();
  }

  drawSegmentHighlighter() {
    this.ctx.strokeStyle = this.highlightedSegmentColor;
    this.drawRect(this.actualHighlightedSegment.from,
      this.actualHighlightedSegment.to, false);
  }

  switchSegment() {
    if (!this.segmentSwitching) { return; }

    this.segmentSwitching = false;
    this.reDraw();
    var from = this.actualHighlightedSegment.from;
    var to = this.actualHighlightedSegment.to;
    var retval = confirm('Do you want to load this segment? (' +
      from + '-' + to + ')' + '\n Any unsaved modification will be lost!');
    if (retval) {
      this.callEvent(global.SWITCH_SEGMENT_E, { 'from': from, 'to': to });
    }
  }

  reDraw() {
    this.resetCanvas();
    this.drawInteractedParts();
    if (this.segmentSwitching) {
      this.drawSegmentHighlighter();
    }
    this.drawLine();
  }

  drawInteractedParts() {
    this.ctx.fillStyle = this.interactedPartColor;
    this.interactedParts.forEach((x) => this.drawRect(x[0], x[1]));
    this.ctx.fillStyle = this.actualSegmentColor;
    if (this.actualSegment.to != 0) {
      this.drawRect(this.actualSegment.from, this.actualSegment.to);
    }
  }
}

export class LocalTimelineManager extends TimeLineManager {
  constructor() {
    super(global.LOCAL_TIMELINE_CANVAS);
    this.initialized = false;
    this.actualFrameColor = 'red';
    this.interactedColor = 'orange';
    this.lastInteractedColor = 'purple';
    this.actualPropagatedColor = 'green';
    this.propagatedColor = 'blue';
    this.nextPropagationColor = 'rgba(255, 255, 0, 0.8)';
    this.interactedFrames = new Set();
    this.propagatedParts = new Array();
    this.lastPart = new Array();
    this.nextPropagation = new Array();
    this.actualFrame = 0;
    this.lastInteracted = -1;

    this.registerEvent(global.LOCAL_TIMELINE_CANVAS, global.SWITCH_IMG_E, (e) => this.setActualFrame(e.detail.idx));
    this.registerEvent(global.LOCAL_TIMELINE_CANVAS, global.INTERACT_IMG_E, (e) => this.addInteraction(e.detail.idx));
    this.canvas.onclick = (e) => this.onClick(e);

    this.reDraw();
  }

  resetTimeLine() {
    this.initialized = false;
    this.firstFrame = '';
    this.lastFrame = '';
    this.interactedFrames = new Set();
    this.propagatedParts = new Array();
    this.lastPart = new Array();
    this.nextPropagation = new Array();
    this.actualFrame = 0;
    this.reDraw();
  }

  updateNextPropagation(nextPropagation) {
    this.nextPropagation = nextPropagation;
    this.reDraw();
  }

  updatePropagatedParts(newParts, lastPart) {
    this.lastPart = lastPart;
    this.propagatedParts = newParts;
    this.nextPropagation = new Array();
    this.reDraw();
  }

  onClick(e) {
    if (this.initialized) {
      var x = this.getXCoord(e);
      var idx = parseInt(x / this.frameWidth);
      this.setActualFrame(idx);
      this.callEvent(global.DRAW_IMG_E, { imgIdx: idx, })
    }
  }

  reDraw() {
    this.resetCanvas();
    this.drawPropagations();
    this.drawNextPropagation();
    this.drawFrames();
    this.drawLine();
  }

  drawNextPropagation() {
    if (this.nextPropagation.length > 0) {
      this.ctx.fillStyle = this.nextPropagationColor;
      this.drawRect(this.nextPropagation[0], this.nextPropagation[1]);
    }
  }

  drawFrames() {
    this.ctx.fillStyle = this.interactedColor;
    this.interactedFrames.forEach((x) => this.drawRect(x));
    if (this.lastInteracted != -1) {
      this.ctx.fillStyle = this.lastInteractedColor;
      this.drawRect(this.lastInteracted);
    }
    if (this.firstFrame !== '') {
      this.ctx.fillStyle = this.actualFrameColor;
      this.drawRect(this.actualFrame);
    }
  }

  drawPropagations() {
    this.ctx.fillStyle = this.propagatedColor;
    this.propagatedParts.forEach((x) => this.drawRect(x[0], x[1]));
    if (this.lastPart[1] > 0) {
      this.ctx.fillStyle = this.actualPropagatedColor;
      this.drawRect(this.lastPart[0], this.lastPart[1]);
    }
  }

  setActualFrame(frame) {
    this.actualFrame = frame;
    this.reDraw();
  }

  loadInteractedFrames(interactedFrames, last) {
    this.interactedFrames = new Set(interactedFrames);
    this.lastInteracted = last;
    this.reDraw();
  }

  addInteraction(frame) {
    this.lastInteracted = frame;
    this.interactedFrames.add(frame);
    this.reDraw();
  }
}
