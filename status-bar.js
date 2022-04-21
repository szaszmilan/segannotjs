import { EventManager } from './event-manager.js';
import * as global from './global.js';

export class StatusBar extends EventManager {
  constructor() {
    super();

    this.connectionStatus = document.getElementById(global.CONNECTION_STATUS);
    this.maskOverlayStatus = document.getElementById(global.MAKS_OVERLAY_STATUS);
    this.actualImageStatus = document.getElementById(global.ACTUAL_IMAGE_STATUS);
    this.versionStatus = document.getElementById(global.VERSION_STATUS);
    this.unsavedStatus = document.getElementById(global.UNSAVED_STATUS);
    this.check_intervall = 60100;
    this.unsavedIntervallRunning = false;

    this.registerEvent(global.CONNECTION_STATUS, global.CONNECT_E, (e) => this.changeConnectionStatus(e.detail.isConnected));
    this.registerEvent(global.MAKS_OVERLAY_STATUS, global.MASK_OVERLAY_E, (e) => this.changeMaskOverlayStatus(e.detail.isOverlayOn));
    this.registerEvent(global.ACTUAL_IMAGE_STATUS, global.ACTUAL_IMAGE_E, (e) => this.changeActualImageStatus(e.detail.idx));
  }

  startUnsavedCheking() {
    this.last_save = Date.now();
    if (!this.unsavedIntervallRunning) {
      this.interval = setInterval(() => { this.changeUnsavedStatus(); }, this.check_intervall);
      this.unsavedIntervallRunning = true;
    }
  }

  stopUpdateCheking() {
    clearInterval(this.interval);
    this.unsavedStatus.innerHTML = '';
    this.unsavedIntervallRunning = false;
  }

  updateLastSave() {
    this.unsavedStatus.innerHTML = '';
    this.last_save = Date.now();
  }

  changeUnsavedStatus() {
    var delta = Date.now() - this.last_save;
    var delta_seconds = Math.round(delta / 60000);
    this.unsavedStatus.innerHTML = 'Unsaved for ' + delta_seconds + ' minutes';
  }

  setVersionStatus(version) {
    this.versionStatus.innerText = 'Version: ' + version;
  }

  changeMaskOverlayStatus(isOverlayOn) {
    if (isOverlayOn) {
      this.maskOverlayStatus.innerText = 'Mask overlay: ON';
    } else {
      this.maskOverlayStatus.innerText = 'Mask overlay: OFF';
    }
  }

  changeActualImageStatus(idx) {
    this.actualImageStatus.innerText = 'Img idx: ' + idx;
  }

  changeConnectionStatus(isConnected) {
    if (isConnected) {
      this.connectionStatus.innerText = 'Connected';
      this.connectionStatus.style.color = 'green';
    } else {
      this.connectionStatus.innerText = 'Disconnected';
      this.connectionStatus.style.color = 'red';
    }
  }
}
