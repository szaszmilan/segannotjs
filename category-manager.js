import * as global from './global.js';
import { EventManager } from './event-manager.js';

export class CategoryManager extends EventManager {
  constructor() {
    super();
    this.catDiv = document.getElementById(global.CAT_DIV);
    this.categoryList = document.getElementById(global.CATEGORY_LIST);
    this.categoryItems = new Array();
    this.actualItemIdx = 0;

    this.colorMap = [];

    this.createCategory('background');
    document.body.addEventListener("keydown", (e) => this.keyPress(e));
    this.registerEvent(global.CAT_DIV, global.CAT_DIV_HEIGHT, (e) => {
      console.log(e.detail.height);
      this.catDiv.style.maxHeight = e.detail.height;
    });
  }

  reset() {
    this.categoryList.innerHTML = ''
    this.categoryItems = new Array();
    this.actualItemIdx = 0;
    this.createCategory('background');
  }

  hasCategory() {
    return this.categoryItems.length >= 2;
  }

  keyPress(event) {
    var number = parseInt(event.key)
    if (!isNaN(number)) {
      if (number < this.categoryItems.length) {
        this.changeActualElement(number);
      }
    }
  }

  changeActualElement(idx) {
    this.categoryItems[this.actualItemIdx].listElement.style.background = 'white';
    this.actualItemIdx = idx;
    this.categoryItems[idx].listElement.style.background = 'lightgrey';
    this.callEvent(global.SWITCH_OBJECT_E, { idx: idx, });
  }

  loadCategories(categories) {
    console.log(categories);
    this.categoryList.innerHTML = "";
    this.categoryItems = new Array();
    categories.forEach((category) => { this.createCategory(category[0], category[1], true) });
  }

  createCategory(name, color = false, loading = false) {
    if (name == "background") {
      color = "rgba(0,0,0,100)";
    } else if (color == false) {
      color = this.colorMap[this.categoryItems.length];
    } else {
      color = this.colorMap[color];
    }
    var category = {
      'name': name,
      'color': color
    };

    if (name != 'background' && !loading) {
      this.callEvent(global.ADD_OBJECT_E, category);
    }

    var listElement = this.createListItem(category);
    category.listElement = listElement;
    this.categoryItems.push(category);

    if (this.categoryItems.length == 2) {
      this.changeActualElement(1);
    }
  }

  createListItem(category) {
    var listElement = document.createElement('li');
    var coloredSquare = document.createElement('div');
    var nameElement = document.createElement('div');
    const number = this.categoryItems.length;

    listElement.addEventListener("click", () => {
      const num = number;
      this.changeActualElement(num);
    });

    listElement.className = "list-group-item";
    coloredSquare.className = "colored-square";
    coloredSquare.style.background = category.color;
    nameElement.className = "cat-name-div";
    nameElement.textContent = category.name;

    listElement.appendChild(coloredSquare);
    listElement.appendChild(nameElement);
    this.categoryList.appendChild(listElement);

    return listElement;
  }

}
