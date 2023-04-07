export function fireEvent( _node, _event, _detail = {}, _options = {})
{
    const event = new Event( _event, Object.assign({
        bubbles: true,
        cancelable: false,
        composed: true
    }, _options));

    event.detail = _detail;

    _node.dispatchEvent(event);

    return event;
};

export function evalTemplate(hass, state, custom_variables, func)
{
    try {
        return new Function('states', 'entity', 'variables', 'user', 'hass', `'use strict'; ${func}`).call(
            this,
            hass.states,
            state,
            custom_variables,
            hass.user,
            hass
        );
    } catch (e) {
        const funcTrimmed = func.length <= 100 ? func.trim() : `${func.trim().substring(0, 98)}...`;
        e.message = `${e.name}: ${e.message} in '${funcTrimmed}'`;
        e.name = 'HoneyCombJSTemplateError';
        throw e;
    }
};

export function objectEvalTemplate(hass, state, custom_variables, obj, _callback)
{
    const objClone = Object.assign({}, obj);
    return getTemplateOrValue(hass, state, custom_variables, objClone, _callback);
};

export function getTemplateOrValue(hass, state, custom_variables, value, _callback)
{
    if (['number', 'boolean'].includes(typeof value)) return value;
    if (!value) return value;
    if (['object'].includes(typeof value)) {
        Object.keys(value).forEach(key => {
            value[key] = getTemplateOrValue(hass, state, custom_variables, value[key], _callback);
        });
        return value;
    }

    if( _callback )
        value = _callback( value );

    const trimmed = value.trim();
    if (trimmed.substring(0, 3) === '[[[' && trimmed.slice(-3) === ']]]') {
        return evalTemplate(hass, state, custom_variables, trimmed.slice(3, -3));
    } else {
        return value;
    }
};

export function lovelace_view() {
    var root = document.querySelector("hc-main");
    if(root) {
      root = root && root.shadowRoot;
      root = root && root.querySelector("hc-lovelace");
      root = root && root.shadowRoot;
      root = root && root.querySelector("hui-view") || root.querySelector("hui-panel-view");
      return root;
    }
  
    root = document.querySelector("home-assistant");
    root = root && root.shadowRoot;
    root = root && root.querySelector("home-assistant-main");
    root = root && root.shadowRoot;
    root = root && root.querySelector("app-drawer-layout partial-panel-resolver") || root.querySelector("ha-drawer partial-panel-resolver");
    root = root && root.shadowRoot || root;
    root = root && root.querySelector("ha-panel-lovelace");
    root = root && root.shadowRoot;
    root = root && root.querySelector("hui-root");
    root = root && root.shadowRoot;
    root = root && root.querySelector("ha-app-layout") || root;
    root = root && root.querySelector("#view");
    root = root && root.firstElementChild;
    return root;
  }
