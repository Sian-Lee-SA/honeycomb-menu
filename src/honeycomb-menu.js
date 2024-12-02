import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, fireEvent, lovelace_view, provideHass, honeycomb_menu_templates } from "./helpers.js";

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
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);
};

document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);

function showHoneycombMenu( _config )
{
    // Remove any lingering honeycom menus as there should only be one active at a time
    if( manager.honeycomb )
        manager.honeycomb.close();

    manager.honeycomb = document.createElement('honeycomb-menu');
    // Some configs can be non extensible so we make them
    // extensible
    manager.honeycomb.setConfig( _config )
    manager.honeycomb.display( lovelace_view(), manager.position.x, manager.position.y );
    manager.honeycomb.addEventListener('closing', e => {
        manager.honeycomb = null;
    });
}

function traverseConfigs( _config, _buttons )
{
	if( ! _buttons )
	{
		_buttons = new Array(6);
		for( let i = 0; i < 6; i++ )
		{
			_buttons[i] = new Array();
		}
	}

    function bindButtons( _cfg )
    {
        if( _cfg.buttons )
            _cfg.buttons.forEach( (b, i) => {
                if( b.position )
                    _buttons[b.position].unshift(b);
                else
                    _buttons[i].unshift(b);
            });
        return { buttons: _buttons };
    }

    // Allow non extensible to be a new object that can be extended. Using
    // merge will also affect sub properties
    _config = merge({}, _config );

    const honeycomb_templates = honeycomb_menu_templates();
    if( ! _config.template || ! honeycomb_templates || ! honeycomb_templates[_config.template] )
        return Object.assign({}, _config, bindButtons( _config ));

    let parentConfig = traverseConfigs( honeycomb_templates[_config.template], _buttons );

    // Delete the template property so the button doesn't hook into it
    delete _config.template;

    return Object.assign({}, parentConfig, _config, bindButtons( _config ));
}

hass._callService = hass.callService
hass.callService = function(domain, service, data, target)
{
    
    if( domain != 'honeycomb' )
        return hass._callService(domain, service, data, target);

    if( isString( data.xy_pad ) )
        data.xy_pad = JSON.parse(data.xy_pad);
    
    var honeycombConfig = traverseConfigs( data );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    showHoneycombMenu(honeycombConfig);
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
            }
        }
    }

    constructor() 
    {
        super();

        this.closing = false;
        this.buttons = [];
        this._service = {
            x: false,
            y: false
        }
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
                z-index: 8; /*200;*/
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
            honeycomb-menu-item:nth-of-type(1), honeycomb-menu-item:nth-of-type(5) {
                left: calc( var(--item-size) * 0.5 );
            }
            honeycomb-menu-item:nth-of-type(2), honeycomb-menu-item:nth-of-type(4) {
                left: calc( var(--item-size) * 1.5);
            }
            honeycomb-menu-item:nth-of-type(3), honeycomb-menu-item:nth-of-type(6) {
                top: calc( var(--item-size) * 0.865);
            }
            honeycomb-menu-item:nth-of-type(4), honeycomb-menu-item:nth-of-type(5) {
                top: calc( var(--item-size) * 1.725);
            }
            honeycomb-menu-item:nth-of-type(3) {
                left: calc( var(--item-size) * 2);
            }
            xy-pad {
                width: var(--container-width);
                height: var(--container-height);
            }`;
    }

    render()
    {
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
                ${this.buttons.map((v, i) => html`
                <honeycomb-menu-item
                    style="animation-delay: ${this._computeAnimateDelay(i)};"
                    .hass=${this.hass}
                    .config=${this._computeItemConfig(v)}
                    @action=${this._handleItemAction}>
                </honeycomb-menu-item>`)}
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
            variables: {},
            size: 225,
            spacing: 2,
            animation_speed: 100
        });
        this.config = config;
        // These aren't perfect calculations but produces the result we want
        // honey combs are not 1:1 ratio's
        let itemSize = this.config.size / 3.586;
        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * 3,
            containerHeight: itemSize * 2.9
        };

        this._assignButtons();        
    }

    display(_view, _x, _y)
    {
        this.view = _view;
        this.view.style.position = 'relative';

        this.view.append( this );

        this._setPosition( _x, _y );
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

        let ele = _item || this.shadowRoot.querySelectorAll('honeycomb-menu-item')[5];
        if( _item )
        {
            _item.setAttribute('selected', '');
            _item.setAttribute('style', `animation-delay: ${this._computeAnimateDelay(3)};`);
        }

        fireEvent(this, 'closing', { item: _item });
        // Remove shade div earlier to allow clicking of other lovelace elements while the animation continues
        this.shadowRoot.querySelector('#shade').addEventListener('animationend', function(e) {
            this.remove();
        });

        ele.addEventListener('animationend', e => {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
        });
    }

    _assignButtons()
    {
        this.buttons = [];
        for( let i = 0; i < 6; i++ )
        {
            let button = {};

			for( let b of this.config.buttons[i] )
			{
				if( b.show !== undefined )
                {
                    b.show = getTemplateOrValue( this.hass, this.hass.states[this.config.entity], this.config.variables, b.show )
                } else if( b != 'break' && b != 'skip') {
                    b.show = true;
                }

                if( b != 'break' && (! b.show || b == 'skip') )
                    continue;
                    
				button = b;
				break;
			}

            if( button == 'break' )
                button = {};

            // Clone to allow writable object from button-card
            this.buttons[i] = merge({}, button);
        }
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
        }

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

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.cancelBubble = true;
        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        this._playButtonSound( e.detail.item );

        if( e.detail.autoclose )
            this.close(e.detail.item);
    }

    _playButtonSound( _item )
    {
        if( ! _item.config.audio )
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
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.service_data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], this.config.variables, data, (val) => {
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
        return omit( merge( {}, this.config, item ), ['buttons', 'size', 'action', 'xy_pad', 'spacing'] );
    }

    _computeAnimateDelay( i )
    {
        return this.config.animation_speed * i + 'ms';
    }
}
customElements.define(HoneycombMenu.is, HoneycombMenu);