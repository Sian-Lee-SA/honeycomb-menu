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
    } else if(trimmed.substring(0, 5) === 'HCJS:') {
        return evalTemplate(hass, state, custom_variables, trimmed.slice(5));
    } else {
        return value;
    }
};

export function provideHass(element) 
{
    if(document.querySelector('home-assistant'))
        return document.querySelector("home-assistant").provideHass(element);
  
    return undefined;
}

export function lovelace_view() 
{
    let root = document.querySelector("home-assistant");
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

export function lovelace_config() 
{
    let root = document.querySelector("home-assistant");
    root = root && root.shadowRoot;
    root = root && root.querySelector("home-assistant-main");
    root = root && root.shadowRoot;
    root = root && root.querySelector("app-drawer-layout partial-panel-resolver") || root.querySelector("ha-drawer partial-panel-resolver");
    root = root && root.shadowRoot || root;
    root = root && root.querySelector("ha-panel-lovelace")
    root = root && root.shadowRoot;
    root = root && root.querySelector("hui-root")
    if (root) {
        return root.lovelace.config || null;
    }
  
    return null;
}

export function honeycomb_menu_templates()
{
    // Store to a gloval variable to skip dom traversion
    if( window.honeycomb_menu_templates )
        return window.honeycomb_menu_templates;
    
    let lconfig = lovelace_config();

    if( ! lconfig )
        return null;

    window.honeycomb_menu_templates = lconfig.honeycomb_menu_templates || {};
    
    if( ! lconfig.honeycomb_menu_templates )
        return null;
        
    return lconfig.honeycomb_menu_templates;
}

function _errorElement(error, origConfig) 
{
    const cfg = {
        type: "error",
        error,
        origConfig
    };

    const el = document.createElement("hui-error-card");
    customElements.whenDefined("hui-error-card").then(() => {
        const newel = document.createElement("hui-error-card");
        newel.setConfig(cfg);
        if(el.parentElement)
            el.parentElement.replaceChild(newel, el);
    });
    return el;
}

function _createElement(tag, config) 
{
    let el = document.createElement(tag);
    try {
        el.setConfig(JSON.parse(JSON.stringify(config)));
    } catch (err) {
        el = _errorElement(err, config);
    }
    return el;
}

export function createCard(config) 
{
    if( ! config || typeof config !== "object" || ! config.type )
        return _errorElement(`No card type configured`, config);

    let tag = config.type;
    if(tag.startsWith('custom:'))
        tag = tag.substr('custom:'.length);
    else
        tag = `hui-${tag}-card`;

    if( customElements.get(tag) )
        return _createElement(tag, config);

    const el = _errorElement(`Custom element doesn't exist: ${tag}.`, config);
    el.style.display = "None";

    const timer = setTimeout(() => {
        el.style.display = "";
    }, 2000);

    customElements.whenDefined(tag).then(() => {
        clearTimeout(timer);
        fireEvent("ll-rebuild", {}, el);
    });

    return el;
}