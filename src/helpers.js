/**
 * @Author: Sian Croser
 * @Date:   2020-04-23T02:41:27+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: helpers.js
 * @Last modified by:   Sian Croser <Sian-Lee-SA>
 * @Last modified time: 2020-04-29T05:08:15+09:30
 * @License: GPL-3
 */

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

export function evalTemplate(hass, state, func)
{
    try {
        return new Function('states', 'entity', 'user', 'hass', `'use strict'; ${func}`).call(
            this,
            hass.states,
            state,
            hass.user,
            hass
        );
    } catch (e) {
        const funcTrimmed = func.length <= 100 ? func.trim() : `${func.trim().substring(0, 98)}...`;
        e.message = `${e.name}: ${e.message} in '${funcTrimmed}'`;
        e.name = 'ButtonCardJSTemplateError';
        throw e;
    }
};

export function objectEvalTemplate(hass, state, obj, _callback)
{
    const objClone = Object.assign({}, obj);
    return getTemplateOrValue(hass, state, objClone, _callback);
};

export default function getTemplateOrValue(hass, state, value, _callback)
{
    if (['number', 'boolean'].includes(typeof value)) return value;
    if (!value) return value;
    if (['object'].includes(typeof value)) {
        Object.keys(value).forEach(key => {
            value[key] = getTemplateOrValue(hass, state, value[key], _callback);
        });
        return value;
    }

    if( _callback )
        value = _callback( value );

    const trimmed = value.trim();
    if (trimmed.substring(0, 3) === '[[[' && trimmed.slice(-3) === ']]]') {
        return evalTemplate(hass, state, trimmed.slice(3, -3));
    } else {
        return value;
    }
};
