import { EventManager } from './event-manager.js';
import * as global from './global.js';

export class Settings extends EventManager {
  constructor() {
    super();

    var offCanvasElement = document.getElementById(global.PROPAGATION_OFFCANVAS);

    this.offCanvas = new bootstrap.Offcanvas(offCanvasElement);
    this.segmentRange = document.getElementById(global.SEGMENT_SIZE_RANGE);
    this.segmentRangeText = document.getElementById(global.SEGMENT_SIZE_LABEL);
    //this.queryRange = document.getElementById(global.QUERY_BUFFER_SIZE_RANGE);
    //this.queryRangeText = document.getElementById(global.QUERY_BUFFER_SIZE_LABEL);
    this.propagationRange = document.getElementById(global.PROPAGATION_LENGTH_RANGE);
    this.propagationRangeText = document.getElementById(global.PROPAGATION_LENGTH_LABEL);
    this.borderCheck = document.getElementById(global.BORDER_CHECK_BOX);

    this.createChart();
    this.segmentRangeChange();
    //this.queryRangeChange();
    this.propagationRangeChange();
    this.sendSegmentSize();
    this.sendQueryBuffSize();
    this.sendPropagationLength();

    this.segmentRange.addEventListener('input', () => this.segmentRangeChange());
    this.segmentRange.addEventListener('change', () => this.sendSegmentSize());
    //this.queryRange.addEventListener('input', () => this.queryRangeChange());
    //this.queryRange.addEventListener('change', () => this.sendQueryBuffSize());
    this.propagationRange.addEventListener('input', () => this.propagationRangeChange());
    this.propagationRange.addEventListener('change', () => this.sendPropagationLength());
    this.borderCheck.addEventListener('change', () => this.sendBorderCheckChange());

    this.sendBorderCheckChange();
  }

  changePropagationRange(maxVal) {
    this.propagationRange.max = maxVal;
    this.propagationRange.value = maxVal;
    this.propagationRangeText.innerHTML = maxVal;
    this.sendPropagationLength();
  }

  sendBorderCheckChange() {
    var data = {
      'param': 'borderPropagation',
      'on': this.borderCheck.checked
    };
    this.sendPropModeChange(data);
  }

  sendPropModeChange(data) {
    this.callEvent(global.CHANGE_MODEL_PARAM_E, data);
  }

  createChart() {
    Chart.register(ChartDataLabels);
    var xValues = ["free", "initial GPU", "query buffer", "computation"];
    var yValues = [50, 50, 50, 50];
    var barColors = ["green", "red", "blue", "orange"];

    this.memoryPie = new Chart("myChart", {
      type: "pie",
      data: {
        labels: xValues,
        datasets: [{
          backgroundColor: barColors,
          data: yValues
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'GPU Memory Composition (MB)'
          },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'start',
            backgroundColor: '#ccc',
            borderRadius: 3,
            font: {
              size: 18,
            }
          },
          tooltip: {
            enabled: false
          },
          legend: {
            position: 'bottom',
            onClick: false
          }
        }
      }
    });
  }

  sendSegmentSize() {
    this.callEvent(global.SEND_SEGMENT_SIZE_E, { 'segmentSize': parseInt(this.segmentRange.value) });
  }

  setSegmentSize(segmentSize) {
    this.segmentRange.value = segmentSize;
    this.sendSegmentSize();
    this.segmentRangeChange();
  }

  toggleOffCanvas() {
    this.offCanvas.toggle();
  }

  segmentRangeChange() {
    this.segmentRangeText.innerHTML = this.segmentRange.value;
  }

  queryRangeChange() {
    this.queryRangeText.innerHTML = this.queryRange.value;
  }

  propagationRangeChange() {
    this.propagationRangeText.innerHTML = this.propagationRange.value;
  }

  sendPropagationLength() {
    this.callEvent(global.SEND_PROPAGATION_LENGTH_E, { 'length': parseInt(this.propagationRange.value) });
  }

  sendQueryBuffSize() {
    var data = {
      'param': 'queryBufferSize',
      //'size': parseInt(this.queryRange.value)
      'size': 1
    };
    this.callEvent(global.CHANGE_MODEL_PARAM_E, data);
  }

  updateMemoryPie(memoryData) {
    console.log(memoryData);
    function toMB(x) {
      x = x / (1000 * 1000);
      x = Math.ceil(x);
      if (x < 0) {
        x = 0;
      }
      return x;
    }
    memoryData = memoryData.map(toMB);
    this.memoryPie.data.datasets[0].data = memoryData;
    this.memoryPie.update();
  }

}
