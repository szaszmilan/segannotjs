class RegisteredEvent {
  constructor(elementName, eventName, dispatchFunc) {
    this.eventName = eventName;
    this.elements = new Array();
    this.addElement(elementName, dispatchFunc);
  }

  addElement(elementName, dispatchFunc) {
    this.elements.push({
      'elementName': elementName,
      'dispatchFunc': dispatchFunc,
    })
  }
}

// Base class for managing events between classes
export class EventManager {
  static registeredEvents = {};

  registerEvent(elementName, eventName, func) {
    var element = document.getElementById(elementName);
    element.addEventListener(eventName, func);
    var dispatchFunc = (data) => {
      element.dispatchEvent(
        new CustomEvent(eventName, {
          detail: data,
        })
      );
    }

    var registeredEvent = EventManager.registeredEvents[eventName];
    if (registeredEvent) {
      registeredEvent.addElement(elementName, dispatchFunc);
    } else {
      registeredEvent = new RegisteredEvent(elementName, eventName, dispatchFunc);
      EventManager.registeredEvents[eventName] = registeredEvent;
    }
  }

  callEvent(eventName, data = NaN) {
    var registeredEvent = EventManager.registeredEvents[eventName];
    if (registeredEvent) {
      for (let i = 0; i < registeredEvent.elements.length; i++) {
        registeredEvent.elements[i].dispatchFunc(data);
      }
    } else {
      throw new Error('Event: ' + eventName + ' is not registered');
    }
  }
}
