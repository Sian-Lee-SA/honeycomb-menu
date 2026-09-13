import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, stringToBool, fireEvent, lovelace_view, provideHass, honeycomb_menu_templates } from "./helpers.js";

const hass = document.querySelector('home-assistant').hass;

const merge = require('lodash/merge');
const omit = require('lodash/omit');
const split = require('lodash/split');
const clamp = require('lodash/clamp');
const _template = require('lodash/template');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');
const _defaults = require('lodash/defaults');

const manager = new function() {
    this.honeycomb = null;
    this.stack = [];
    this.currentConfig = null;
    this.pointerDown = false;
    this.pointerId = null;
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);

    this.handlePointerDown = function(e) {
        this.pointerDown = true;
        this.pointerId = e.pointerId;
        this.position.x = e.clientX;
        this.position.y = e.clientY;
    }.bind(this);

    this.handlePointerUp = function(e) {
        if( this.pointerId === null || e.pointerId === this.pointerId )
        {
            this.pointerDown = false;
            this.pointerId = null;
        }
    }.bind(this);
};

window.honeycomb_menu = (config) => {
    var honeycombConfig = traverseConfigs( config );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    // If a menu is already open, treat a newly opened menu as a nested menu.
    // The previous config is kept so honeycomb-back can restore it.
    const nested = !! manager.honeycomb && !! manager.currentConfig;
    showHoneycombMenu( honeycombConfig, { nested } );
};

document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);
document.addEventListener('pointerdown', manager.handlePointerDown, true);
document.addEventListener('pointerup', manager.handlePointerUp, true);
document.addEventListener('pointercancel', manager.handlePointerUp, true);

document.body.addEventListener("ll-custom", e => {
    if(e.detail.honeycomb_menu)
    {
        window.honeycomb_menu( e.detail.honeycomb_menu );
    }
});

function showHoneycombMenu( _config, options = {} )
{
    const previous = manager.honeycomb;

    if( options.resetStack )
        manager.stack = [];

    if( options.nested && manager.currentConfig )
        manager.stack.push(manager.currentConfig);

    if( previous )
        previous.close();

    const menu = document.createElement('honeycomb-menu');
    manager.honeycomb = menu;
    manager.currentConfig = merge({}, _config);

    menu.setConfig( _config );
    menu.display( lovelace_view(), manager.position.x, manager.position.y );
    menu.addEventListener('closing', e => {
        if( manager.honeycomb === menu )
            manager.honeycomb = null;
    });
}

function honeycombBack()
{
    if( manager.stack.length === 0 )
        return false;

    const previousConfig = manager.stack.pop();
    showHoneycombMenu(previousConfig, { nested: false });
    return true;
}

function honeycombClose()
{
    manager.stack = [];
    manager.currentConfig = null;

    if( manager.honeycomb )
        manager.honeycomb.close();
}

window.honeycomb_menu_back = honeycombBack;
window.honeycomb_menu_close = honeycombClose;

function traverseConfigs( _config, _buttons )
{
    if( ! _buttons )
    {
        _buttons = [];
    }

    function bindButtons( _cfg )
    {
        if( _cfg.buttons )
        {
            _cfg.buttons.forEach( (b, i) => {
                let storageIndex;

                // Legacy position keeps its original physical/index semantics
                // for backwards compatibility. New slot is resolved later by
                // the v0.4 soft/hard allocator, so keep it at list position here.
                if( b.position !== undefined )
                    storageIndex = Number(b.position);
                else
                    storageIndex = i;

                if( ! Number.isInteger(storageIndex) || storageIndex < 0 || storageIndex > 17 )
                    return;

                if( ! _buttons[storageIndex] )
                    _buttons[storageIndex] = [];

                _buttons[storageIndex].unshift(b);
            });
        }

        return { buttons: _buttons };
    }

    _config = merge({}, _config );

    const honeycomb_templates = honeycomb_menu_templates();
    if( ! _config.template || ! honeycomb_templates || ! honeycomb_templates[_config.template] )
        return Object.assign({}, _config, bindButtons( _config ));

    let parentConfig = traverseConfigs( honeycomb_templates[_config.template], _buttons );

    delete _config.template;

    return Object.assign({}, parentConfig, _config, bindButtons( _config ));
}

class HoneycombMenu extends LitElement
{
    static get is()
    {
        return 'honeycomb-menu';
    }

    static get properties()
    {
        return {
            hass: {
                type: Object
            },
            config: {
                type: Object
            },
            sizes: {
                type: Object,
                readonly: true
            },
            variables: {
                type: Object
            },
            closing: {
                type: Boolean,
                attribute: true,
                reflect: true
            },
            view: {},
            buttons: {
                type: Array
            },
            _service: {
                type: Object
            },
            _dragHoverSlot: {
                type: Number
            }
        }
    }

    constructor()
    {
        super();

        this.closing = false;
        this.buttons = [];
        this._rings = {
            inner: true,
            outer: false
        };
        this._service = {
            x: false,
            y: false
        };
        this._dragHoverSlot = -1;
        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._idleTimer = null;
        this._boundPointerMove = this._handleGlobalPointerMove.bind(this);
        this._boundPointerUp = this._handleGlobalPointerUp.bind(this);
    }

    static get styles()
    {
        return css`
            @keyframes fadeIn { from {opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes zoomIn {
            from {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }
            50% {
                opacity: 1;
            }
            }
            @keyframes zoomOut {
            from {
                opacity: 1;
            }

            50% {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }

            to {
                opacity: 0;
            }
            }

            @keyframes bounceOut {
            20% {
                -webkit-transform: scale3d(0.9, 0.9, 0.9);
                transform: scale3d(0.9, 0.9, 0.9);
            }

            50%,
            55% {
                opacity: 1;
                -webkit-transform: scale3d(1.1, 1.1, 1.1);
                transform: scale3d(1.1, 1.1, 1.1);
            }

            to {
                opacity: 0;
                -webkit-transform: scale3d(0.3, 0.3, 0.3);
                transform: scale3d(0.3, 0.3, 0.3);
            }
            }

            :host {
                position: absolute;
                z-index: 8;
            }
            :host([closing]), :host([closing]) * {
                pointer-events: none !important;
            }
            .shade {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.47);

                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: fadeIn;
            }
            :host([closing]) .shade {
                animation-name: fadeOut;
                animation-duration: 500ms;
            }
            .honeycombs {
                --filter-color: rgba(0, 0, 0, 0.76);
                filter: drop-shadow(2px 4px 3px var(--filter-color) );
                width: var(--container-width);
                height: var(--container-height);
                pointer-events: none;
            }
            honeycomb-menu-item {
                position: absolute;
                pointer-events: all;
                box-sizing: border-box;
                width: var(--item-size);
                padding: var(--spacing);
            }
            honeycomb-menu-item.center-item {
                z-index: 2;
            }
            honeycomb-menu-item.center-item.center-auto-style {
                filter: brightness(var(--honeycomb-center-brightness, 1.25));
            }
            honeycomb-menu-item.drag-hover {
                filter: brightness(1.18);
                transform: scale3d(1.08, 1.08, 1.08);
                z-index: 3;
            }
            honeycomb-menu-item.center-item.center-auto-style.drag-hover {
                filter: brightness(calc(var(--honeycomb-center-brightness, 1.25) * 1.18));
            }
            honeycomb-menu-item, xy-pad {
                animation-duration: 0.5s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item, :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-duration: 0.75s;
                animation-name: bounceOut;
            }
            xy-pad {
                width: var(--container-width);
                height: var(--container-height);
            }`;
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();
        const centerPos = this._computeCenterPosition();

        return html`
            <div id="shade" class="shade" @click=${this._handleShadeClick}></div>

            ${(this.config.xy_pad) ? html`
                <xy-pad
                    style="animation-delay: ${this._computeAnimateDelay(1)};"
                    .hass=${this.hass}
                    .config=${this.config.xy_pad}
                    .size=${this._computeXYPadSize()}
                    .clampX=${this._computeXYPadClamp()}
                    .clampY=${this._computeXYPadClamp()}
                    @drag=${this._handleXYPad}
                    @drag-interval=${this._handleXYPad}
                    @drag-end=${this._handleXYPad}>
                </xy-pad>`:''}

            <div id="honeycombs" class="honeycombs">
                ${centerConfig ? html`
                    <honeycomb-menu-item
                        class="center-item ${this._centerUseFilterFallback ? 'center-auto-style' : ''} ${this._dragHoverSlot === 18 ? 'drag-hover' : ''}"
                        data-honeycomb-slot="center"
                        @pointerenter=${() => this._setDragHoverSlot(18)}
                        @pointerleave=${() => this._clearDragHoverSlot(18)}
                        style="
                            animation-delay: ${this._computeAnimateDelay(0)};
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                        "
                        .hass=${this.hass}
                        .config=${centerConfig}
                        @action=${this._handleItemAction}>
                    </honeycomb-menu-item>
                ` : ''}

                ${this.buttons.map((v, i) => {
                    if( v === undefined )
                        return '';

                    const pos = this._computeButtonPosition(i);

                    if( ! pos )
                        return '';

                    return html`
                        <honeycomb-menu-item
                            class="${this._dragHoverSlot === i ? 'drag-hover' : ''}"
                            data-honeycomb-slot="${i}"
                            @pointerenter=${() => this._setDragHoverSlot(i)}
                            @pointerleave=${() => this._clearDragHoverSlot(i)}
                            style="
                                animation-delay: ${this._computeButtonAnimateDelay(i)};
                                left: calc(var(--item-size) * ${pos.x});
                                top: calc(var(--item-size) * ${pos.y});
                            "
                            .hass=${this.hass}
                            .config=${this._computeItemConfig(v)}
                            @action=${this._handleItemAction}>
                        </honeycomb-menu-item>
                    `;
                })}
            </div>`;
    }

    setConfig( config )
    {
        provideHass(this);

        _defaults(config, {
            action: 'hold',
            entity: null,
            active: false,
            autoclose: true,
            audio: false,
            variables: {},
            size: 225,
            spacing: 2,
            animation_speed: 80,
            animation_mode: 'paired',
            drag_select: true,
            hover_highlight: true,
            nested_center_back: true,
            button_defaults: {},
            empty_slots: 'visible',
            center_button: {},
            center_brightness: 25,
            idle_timeout: 0
        });
        this.config = config;

        // Resolve the buttons first because the active ring(s) determine size.
        this._assignButtons();

        let itemSize = this.config.size / 3.586;
        let outerRing = this._hasOuterRing();

        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * (outerRing ? 5 : 3),
            containerHeight: itemSize * (outerRing ? 4.63 : 2.9)
        };

        if( this.config.xy_pad )
        {
            if( this.config.xy_pad["x"] ) {
                this.config.xy_pad["x"].data = this.config.xy_pad["x"].data || this.config.xy_pad["x"].service_data;
            }
            if( this.config.xy_pad["y"] ) {
                this.config.xy_pad["y"].data = this.config.xy_pad["y"].data || this.config.xy_pad["y"].service_data;
            }
        }
    }

    display(_view, _x, _y)
    {
        this.view = _view;
        this.view.style.position = 'relative';

        this.view.append( this );

        this._setPosition( _x, _y );

        // If the menu was opened from button-card press_action, the pointer is
        // still physically held down. Adopt that pointer so the same gesture
        // can continue directly into drag-select.
        if( this.config.drag_select && manager.pointerDown )
            this._dragPointerId = manager.pointerId;

        // Global pointer listeners make press-and-drag selection work even when
        // the pointer/touch started on the card that opened the menu.
        document.addEventListener('pointermove', this._boundPointerMove, true);
        document.addEventListener('pointerup', this._boundPointerUp, true);
        document.addEventListener('pointercancel', this._boundPointerUp, true);

        this._resetIdleTimeout();
    }

    firstUpdated()
    {
        this._setCssVars();
    }

    close( _item = null )
    {
        if( this.closing )
            return;

        this.closing = true;

        this._clearIdleTimeout();

        document.removeEventListener('pointermove', this._boundPointerMove, true);
        document.removeEventListener('pointerup', this._boundPointerUp, true);
        document.removeEventListener('pointercancel', this._boundPointerUp, true);

        const items = this.shadowRoot.querySelectorAll('honeycomb-menu-item');
        let ele = _item || items[items.length - 1];

        if( _item )
        {
            _item.setAttribute('selected', '');
            _item.style.animationDelay = this._computeAnimateDelay(3);
        }

        fireEvent(this, 'closing', { item: _item });

        const shade = this.shadowRoot.querySelector('#shade');
        if( shade )
        {
            shade.addEventListener('animationend', function(e) {
                this.remove();
            });
        }

        if( ele )
        {
            ele.addEventListener('animationend', e => {
                this.remove();
                fireEvent(this, 'closed', { item: _item });
            });
        }
        else
        {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
        }
    }

    _assignButtons()
    {
        const resolved = [];

        for( let i = 0; i < this.config.buttons.length; i++ )
        {
            const stack = this.config.buttons[i];

            if( ! stack )
                continue;

            let button = {};

            for( let b of stack )
            {
                if( b.show !== undefined )
                {
                    b.show = stringToBool(
                        getTemplateOrValue(
                            this.hass,
                            this.hass.states[this.config.entity],
                            this.config.variables,
                            b.show
                        )
                    );
                }
                else if( b != 'break' && b != 'skip' )
                {
                    b.show = true;
                }

                if( b != 'break' && (! b.show || b == 'skip') )
                    continue;

                button = b;
                break;
            }

            if( button == 'break' )
                button = {};

            if( ! isEmpty(button) )
                resolved.push({ button: merge({}, button), sourceIndex: i });
        }

        const assigned = new Array(18);
        const hard = [];
        const soft = [];
        const automatic = [];

        resolved.forEach(entry => {
            const button = entry.button;

            // Legacy position remains an absolute physical position.
            if( button.position !== undefined )
            {
                const target = Number(button.position);

                if( Number.isInteger(target) && target >= 0 && target <= 17 )
                    hard.push({ ...entry, target, legacy: true });

                return;
            }

            if( button.slot !== undefined )
            {
                const requestedSlot = Number(button.slot);

                if( Number.isInteger(requestedSlot) && requestedSlot >= 1 && requestedSlot <= 18 )
                {
                    if( button.slot_mode === 'hard' )
                        hard.push({ ...entry, target: requestedSlot - 1 });
                    else
                        soft.push({ ...entry, requestedSlot });
                }

                return;
            }

            automatic.push(entry);
        });

        const totalCount = resolved.length;

        // Base ring selection is determined by the number of buttons.
        let innerActive = totalCount <= 6;
        let outerActive = totalCount >= 7 && totalCount <= 12;

        if( totalCount >= 13 )
        {
            innerActive = true;
            outerActive = true;
        }

        if( totalCount === 0 )
        {
            innerActive = true;
            outerActive = false;
        }

        // Hard/legacy physical positions can force one or both rings active.
        hard.forEach(entry => {
            if( entry.target < 6 )
                innerActive = true;
            else
                outerActive = true;
        });

        this._rings = {
            inner: innerActive,
            outer: outerActive
        };

        const innerPool = [0, 1, 2, 3, 4, 5];
        const outerPool = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

        let activePool;

        if( innerActive && outerActive )
            activePool = [...innerPool, ...outerPool];
        else if( outerActive )
            activePool = outerPool;
        else
            activePool = innerPool;

        // Hard slots are absolute. Never move them.
        hard.forEach(entry => {
            if( assigned[entry.target] === undefined )
            {
                assigned[entry.target] = entry.button;
            }
            else
            {
                console.warn(
                    `[Honeycomb Menu NG] Hard slot ${entry.target + 1} is already occupied. Ignoring duplicate hard slot.`
                );
            }
        });

        // Soft slots are preferences inside the currently active layout.
        // Keep the requested physical slot when its ring is active.
        // Otherwise map it to the corresponding position in the active ring.
        // If the preferred position is occupied, move clockwise to the first free slot.
        soft.forEach(entry => {
            if( activePool.length === 0 )
                return;

            const requestedIndex = entry.requestedSlot - 1;
            let preferredTarget;

            if( activePool.includes(requestedIndex) )
            {
                // Requested physical slot already belongs to an active ring.
                preferredTarget = requestedIndex;
            }
            else if( innerActive && ! outerActive )
            {
                // Inner-only layout: wrap any soft slot onto slots 1-6.
                preferredTarget = requestedIndex % 6;
            }
            else if( outerActive && ! innerActive )
            {
                // Outer-only layout: map inner slots 1-6 onto outer slots 7-12.
                // Outer slot requests 7-18 are already handled above.
                preferredTarget = 6 + (requestedIndex % 12);
            }
            else
            {
                // Both rings active: all valid requested slots are physical.
                preferredTarget = requestedIndex;
            }

            let preferredPoolIndex = activePool.indexOf(preferredTarget);

            if( preferredPoolIndex < 0 )
                preferredPoolIndex = 0;

            let target;

            for( let offset = 0; offset < activePool.length; offset++ )
            {
                const candidate = activePool[(preferredPoolIndex + offset) % activePool.length];

                if( assigned[candidate] === undefined )
                {
                    target = candidate;
                    break;
                }
            }

            if( target !== undefined )
                assigned[target] = entry.button;
            else
                console.warn('[Honeycomb Menu NG] No free slot available for soft slot button.');
        });

        // Buttons without slot information use the first free active position.
        automatic.forEach(entry => {
            const target = activePool.find(index => assigned[index] === undefined);

            if( target !== undefined )
                assigned[target] = entry.button;
            else
                console.warn('[Honeycomb Menu NG] No free slot available for automatic button.');
        });

        const showEmptySlots = this.config.empty_slots !== 'hidden';

        if( showEmptySlots )
        {
            if( this._rings.inner )
            {
                for( let i = 0; i < 6; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }

            if( this._rings.outer )
            {
                for( let i = 6; i < 18; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }
        }

        this.buttons = assigned;
    }

    _setPosition( _x, _y )
    {
        let container = {
            w: ( this.sizes.containerWidth / 2 ),
            h: ( this.sizes.containerHeight / 2 )
        };

        let bounds =  {
            min: {
                x: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-left') ) + container.w,
                y: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-top') ) + container.h
            },
            max: {
                x: this.view.clientWidth - container.w,
                y: this.view.clientHeight - container.h
            }
        };

        let rect = this.view.getBoundingClientRect();
        _x = clamp( _x - rect.left, bounds.min.x, bounds.max.x - 5 );
        _y = clamp( _y - rect.top, bounds.min.y, bounds.max.y - 5 );

        this.style.left = `${_x - container.w}px`;
        this.style.top = `${_y - container.h}px`;
    }

    _setCssVarProperty(orig_property, var_property)
    {
        this.shadowRoot.querySelector('#honeycombs').style.setProperty(orig_property, `var(${var_property}, ${this.view.style.getPropertyValue(orig_property)})`, "important");
    }

    _setCssVars()
    {
        this.style.setProperty('--item-size', `${this.sizes.item}px` );
        this.style.setProperty('--container-width', `${this.sizes.containerWidth}px`);
        this.style.setProperty('--container-height', `${this.sizes.containerHeight}px`);

        this.style.setProperty('--spacing', `${this.config.spacing}px`);

        const centerBrightness = Number(this.config.center_brightness);
        const centerBrightnessFactor = Number.isFinite(centerBrightness)
            ? Math.max(0, 1 + (centerBrightness / 100))
            : 1.25;
        this.style.setProperty('--honeycomb-center-brightness', `${centerBrightnessFactor}`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.stopPropagation();
        manager.stack = [];
        manager.currentConfig = null;
        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        const item = e.detail.item;
        const actionType = e.detail.action || 'tap';
        const actionKey = actionType === 'hold'
            ? 'hold_action'
            : actionType === 'double_tap'
                ? 'double_tap_action'
                : 'tap_action';
        const configuredAction = item.config && item.config[actionKey]
            ? item.config[actionKey].action
            : null;

        if( configuredAction === 'honeycomb-back' )
        {
            e.stopPropagation();
            honeycombBack();
            return;
        }

        if( configuredAction === 'honeycomb-close' )
        {
            e.stopPropagation();
            honeycombClose();
            return;
        }

        this._playButtonSound( item );

        if( e.detail.autoclose )
        {
            manager.stack = [];
            manager.currentConfig = null;
            this.close(item);
            return;
        }

        this._resetIdleTimeout();
    }

    _setDragHoverSlot(slot)
    {
        if( ! this.config.hover_highlight )
            return;

        this._dragHoverSlot = slot;
    }

    _clearDragHoverSlot(slot)
    {
        if( this._dragHoverSlot === slot )
            this._dragHoverSlot = -1;
    }

    _findMenuItemAtPoint(x, y)
    {
        if( ! this.shadowRoot || ! this.shadowRoot.elementFromPoint )
            return null;

        let element = this.shadowRoot.elementFromPoint(x, y);

        while( element && element !== this.shadowRoot )
        {
            if( element.tagName && element.tagName.toLowerCase() === 'honeycomb-menu-item' )
                return element;

            element = element.parentElement;
        }

        return null;
    }

    _handleGlobalPointerMove(e)
    {
        if( ! this.config.drag_select )
            return;

        // Only drag-select while the pointer is physically held down.
        if( e.buttons === 0 && e.pointerType === 'mouse' )
            return;

        // When the menu was opened by press_action, keep following the same
        // pointer that started the gesture.
        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        this._dragPointerActive = true;
        this._dragPointerId = e.pointerId;
        this._resetIdleTimeout();

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        if( ! item )
        {
            this._dragHoverSlot = -1;
            return;
        }

        const slot = item.dataset.honeycombSlot === 'center'
            ? 18
            : Number(item.dataset.honeycombSlot);

        this._dragHoverSlot = Number.isFinite(slot) ? slot : -1;
    }

    _handleGlobalPointerUp(e)
    {
        if( ! this.config.drag_select || ! this._dragPointerActive )
            return;

        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._dragHoverSlot = -1;

        if( item )
        {
            e.preventDefault();
            e.stopPropagation();
            this._triggerMenuItemTap(item);
        }
    }

    _triggerMenuItemTap(item)
    {
        // honeycomb-menu-item is a wrapper around a Lovelace card (normally
        // custom:button-card). Clicking the wrapper itself does not execute the
        // wrapped card action. Trigger a normal tap on the actual action-handler
        // element inside the wrapped card instead.
        const wrappedCard = item.shadowRoot
            ? item.shadowRoot.querySelector('#item > *')
            : null;

        if( ! wrappedCard )
        {
            console.warn('[Honeycomb Menu NG] Unable to find wrapped card for drag-select.');
            return;
        }

        let actionTarget = wrappedCard;

        // custom:button-card attaches the Home Assistant action-handler to its
        // rendered card element. Prefer that element when it can be located.
        if( wrappedCard.shadowRoot )
        {
            const candidate =
                wrappedCard.shadowRoot.querySelector('ha-card') ||
                wrappedCard.shadowRoot.querySelector('[role="button"]');

            if( candidate )
                actionTarget = candidate;
        }

        // The HA/button-card action-handler reacts to an `action` event with
        // action: tap. This follows the same path as a normal tap and therefore
        // preserves toggle, call-service, fire-dom-event, navigation, etc.
        actionTarget.dispatchEvent(new CustomEvent('action', {
            bubbles: true,
            composed: true,
            detail: { action: 'tap' }
        }));
    }

    _clearIdleTimeout()
    {
        if( this._idleTimer )
        {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    _resetIdleTimeout()
    {
        this._clearIdleTimeout();

        const timeout = Number(this.config && this.config.idle_timeout);

        if( ! Number.isFinite(timeout) || timeout <= 0 || this.closing )
            return;

        this._idleTimer = setTimeout(() => {
            this._idleTimer = null;

            if( this.closing )
                return;

            manager.stack = [];
            manager.currentConfig = null;
            this.close();
        }, timeout);
    }

    _playButtonSound( _item )
    {
        if( ! isString(_item.config.audio) )
            return;

        let audio_ele = document.querySelector('#honeycomb-audio');
        if( ! audio_ele )
        {
            audio_ele = document.createElement('audio');
            audio_ele.id = 'honeycomb-audio';
            document.querySelector("home-assistant").append(audio_ele);
        }
        audio_ele.src = _item.config.audio;
        audio_ele.play();
    }

    _handleXYPad(e)
    {
        if( (this.config.xy_pad.on_release && e.type != 'drag-end') ||
            (this.config.xy_pad.repeat && e.type != 'drag-interval')
        ) return;

        ['x', 'y'].forEach( axis => {
            let config = this.config.xy_pad[axis];

            if( e.detail[axis] == 0 || ! config || ! config.service || this._service[axis] )
                return;

            this._service[axis] = true;
            let service = split( config.service, '.', 2);
            this.hass
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], { ...this.config.variables, ...vars }, data, (val) => {
            if( val == 'entity' )
                return this.config.entity;
            return _template(val, {interpolate: /{{([\s\S]+?)}}/g})(vars);
        });
    }

    _computeXYPadSize()
    {
        return this.config.size / 6;
    }

    _computeXYPadClamp()
    {
        return this.config.size / 3;
    }

    _computeItemSize()
    {
        return this.config.size / 3;
    }

    _computeItemConfig( item )
    {
        if( isEmpty(item) )
            return item;

        return omit(
            merge(
                {},
                this.config,
                this.config.button_defaults || {},
                item
            ),
            [
                'buttons',
                'size',
                'action',
                'xy_pad',
                'spacing',
                'animation_speed',
                'animation_mode',
                'drag_select',
                'hover_highlight',
                'nested_center_back',
                'button_defaults',
                'empty_slots',
                'center_button',
                'center_brightness',
                'idle_timeout',
                'slot',
                'slot_mode'
            ]
        );
    }

    _centerHasExplicitBackground()
    {
        const center = this.config.center_button;

        if( ! center || center === false || ! center.styles )
            return false;

        const cardStyles = center.styles.card;

        if( ! Array.isArray(cardStyles) )
            return false;

        return cardStyles.some(style => {
            if( ! style || typeof style !== 'object' )
                return false;

            return Object.prototype.hasOwnProperty.call(style, 'background') ||
                   Object.prototype.hasOwnProperty.call(style, 'background-color') ||
                   Object.prototype.hasOwnProperty.call(style, 'backgroundColor');
        });
    }

    _lightenColorString( color, percent )
    {
        if( typeof color !== 'string' )
            return null;

        const amount = Math.max(0, Number(percent) || 0) / 100;
        const value = color.trim();

        const rgbaMatch = value.match(
            /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
        );

        if( rgbaMatch )
        {
            const r = Number(rgbaMatch[1]);
            const g = Number(rgbaMatch[2]);
            const b = Number(rgbaMatch[3]);
            const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : null;

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount));

            if( a !== null )
                return `rgba(${lighten(r)}, ${lighten(g)}, ${lighten(b)}, ${a})`;

            return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
        }

        const hexMatch = value.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);

        if( hexMatch )
        {
            let hex = hexMatch[1];

            if( hex.length === 3 )
                hex = hex.split('').map(c => c + c).join('');

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount))
                    .toString(16)
                    .padStart(2, '0');

            return `#${lighten(r)}${lighten(g)}${lighten(b)}`;
        }

        return null;
    }

    _applyCenterBrightness( config )
    {
        if( this._centerHasExplicitBackground() )
            return false;

        const brightness = Number(this.config.center_brightness);

        if( ! Number.isFinite(brightness) || brightness === 0 )
            return true;

        if( ! config.styles || ! Array.isArray(config.styles.card) )
            return false;

        let adjusted = false;

        config.styles.card = config.styles.card.map(style => {
            if( ! style || typeof style !== 'object' )
                return style;

            const copy = { ...style };

            ['background', 'background-color', 'backgroundColor'].forEach(key => {
                if( Object.prototype.hasOwnProperty.call(copy, key) )
                {
                    const lightened = this._lightenColorString(copy[key], brightness);

                    if( lightened )
                    {
                        copy[key] = lightened;
                        adjusted = true;
                    }
                }
            });

            return copy;
        });

        return adjusted;
    }

    _computeCenterConfig()
    {
        if( this.config.center_button === false )
            return null;

        const nestedDefaultCenter = manager.stack.length > 0 && this.config.nested_center_back
            ? {
                entity: this.config.entity,
                active: false,
                autoclose: false,
                icon: 'mdi:arrow-left',
                tap_action: {
                    action: 'honeycomb-back'
                }
            }
            : {
                entity: this.config.entity,
                active: this.config.active,
                autoclose: true,
                tap_action: {
                    action: 'more-info'
                }
            };

        const center = merge(
            {},
            nestedDefaultCenter,
            this.config.center_button || {}
        );

        const computed = this._computeItemConfig(center);

        // Prefer changing only the inherited card background. If the color
        // cannot be parsed (for example a theme variable), fall back to CSS
        // brightness on the whole center item.
        const adjustedBackground = this._applyCenterBrightness(computed);
        this._centerUseFilterFallback =
            ! this._centerHasExplicitBackground() &&
            ! adjustedBackground &&
            Number(this.config.center_brightness) !== 0;

        return computed;
    }

    _computeCenterPosition()
    {
        if( this._hasOuterRing() )
        {
            return {
                x: 2,
                y: 1.73
            };
        }

        return {
            x: 1,
            y: 0.865
        };
    }

    _hasInnerRing()
    {
        return this._rings && this._rings.inner;
    }

    _hasOuterRing()
    {
        return this._rings && this._rings.outer;
    }

    _computeButtonPosition( slot )
    {
        const innerRing = [
            { x: 0,   y: 0.865 }, // 1 - left
            { x: 0.5, y: 0 },     // 2 - upper left
            { x: 1.5, y: 0 },     // 3 - upper right
            { x: 2,   y: 0.865 }, // 4 - right
            { x: 1.5, y: 1.725 }, // 5 - lower right
            { x: 0.5, y: 1.725 }  // 6 - lower left
        ];

        const outerRing = [
            { x: -1,   y: 0.865 }, // 7  - left
            { x: -0.5, y: 0 },     // 8  - upper-left outer
            { x: 0,    y: -0.865 },// 9  - upper-left top
            { x: 1,    y: -0.865 },// 10 - top-left
            { x: 2,    y: -0.865 },// 11 - top-right
            { x: 2.5,  y: 0 },     // 12 - upper-right outer
            { x: 3,    y: 0.865 }, // 13 - right
            { x: 2.5,  y: 1.725 }, // 14 - lower-right outer
            { x: 2,    y: 2.59 },  // 15 - lower-right bottom
            { x: 1,    y: 2.59 },  // 16 - bottom-right
            { x: 0,    y: 2.59 },  // 17 - bottom-left
            { x: -0.5, y: 1.725 }  // 18 - lower-left outer
        ];

        let position;

        if( slot < 6 )
        {
            if( ! this._hasInnerRing() )
                return null;

            position = innerRing[slot];
        }
        else
        {
            if( ! this._hasOuterRing() )
                return null;

            position = outerRing[slot - 6];
        }

        if( ! position )
            return null;

        if( this._hasOuterRing() )
        {
            return {
                x: position.x + 1,
                y: position.y + 0.865
            };
        }

        return position;
    }

    _computeButtonAnimateStep( slot )
    {
        if( this.config.animation_mode === 'sequential' )
            return slot + 1;

        // Paired mode animates opposite physical positions together.
        // Inner ring: 1+4, 2+5, 3+6.
        if( slot < 6 )
            return (slot % 3) + 1;

        // Outer ring: 7+13, 8+14, 9+15, 10+16, 11+17, 12+18.
        return ((slot - 6) % 6) + 1;
    }

    _computeButtonAnimateDelay( slot )
    {
        return this._computeAnimateDelay(this._computeButtonAnimateStep(slot));
    }

    _computeAnimateDelay( i )
    {
        return this.config.animation_speed * i + 'ms';
    }
}

customElements.define(HoneycombMenu.is, HoneycombMenu);
