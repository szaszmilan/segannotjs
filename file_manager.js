import { EventManager } from './event-manager.js';
import * as global from './global.js';
import { JSONTree } from './tree.js';

export class FileManager extends EventManager {
  constructor() {
    super();

    this.selected = false;
    this.type = false;

    var offCanvasElement = document.getElementById(global.FILE_MANAGER_OFFCANVAS);
    this.offCanvas = new bootstrap.Offcanvas(offCanvasElement);

    var loadButton = document.getElementById(global.LOAD_BUTTON);
    loadButton.addEventListener('click', () => this.load());

    this.treeDiv = document.getElementById(global.FILE_TREE);
  }

  load() {
    if (this.selected != false) {
      if (this.type == 'video') {
        this.callEvent(global.REQUEST_VIDEO_E, { 'path': this.selected });
      } else {
        this.callEvent(global.LOAD_SESSION_E, { 'path': this.selected });
      }
    }
  }

  onSelect(e) {
    if (e.attributes['data-type'] != undefined) {
      this.type = 'video';
    } else {
      this.type = 'session';
    }
    this.selected = e.name;
  }

  toggleOffCanvas() {
    this.callEvent(global.GET_WORKING_DIRECTORY_TREE_E, { 'workingDir': './working_dir' });
    this.offCanvas.toggle();
  }

  drawTree(json) {
    this.treeDiv.innerHTML = "";
    this.tree = new JSONTree(this.treeDiv);
    this.tree.on('select', e => this.onSelect(e));
    this.tree.json(json[0].children);
  }
}
