/**
 * @Author: Sian Croser
 * @Date:   2020-04-19T12:09:12+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: honeycomb-menu.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-27T05:49:29+09:30
 * @License: GPL-3
 */

// import '../3rd-party/lodash.js';
const _ = require('lodash');

import EventManager from './event-manager.js';
import "./honeycomb-menu-item.js";
import "./xy-pad.js";
import { objectEvalTemplate } from "./helpers.js";

// Hook / Hack the HaCard to handle our needs and allow instantiating the hoeycomb
customElements.whenDefined('ha-card').then(() => {
    const HaCard = customElements.get('ha-card');
    Object.assign( HaCard.prototype, EventManager.prototype );

    const cardTools = customElements.get('card-tools');

    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

    const findConfig = function(node) {
        if(node.config)
            return node.config;
        if(node._config)
            return node._config;
        if(node.host)
            return findConfig(node.host);
        if(node.parentElement)
            return findConfig(node.parentElement);
        if(node.parentNode)
            return findConfig(node.parentNode);
        return null;
    };

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

    // Store a reference to a preveious hook eg. card-mod which allows
    // us to call it
    HaCard.prototype._firstUpdated = HaCard.prototype.firstUpdated;
    HaCard.prototype.firstUpdated = function(changedProperties)
    {
        this._firstUpdated(changedProperties);

        const config = findConfig(this);
        if( ! config || ! config.honeycomb )
            return;

        // The foolowing listeners wee defined by ActionHandler so to avoid duplicates we remove them
        this.removeEventListeners(['contextmenu', 'touchstart', 'touchend', 'touchcancel', 'mousedown', 'click', 'keyup']);

        // We need to set actionHandler false so bind on action-handler will process and assign eventListeners
        this.actionHandler = false;
        // We can't assume whether or not the parent card doesn't handle a double_tap or hold etc so we make it enabled
        // regardless of our config action
        document.body.querySelector("action-handler").bind(this, {
            hasHold: true,
            hasDoubleClick: true,
        });

        // Push our action listener to the top of the list so we can
        // see if our menu was trigger and to stop propagation if so...
        // If not, then the event will follow through to the other listeners
        this.prependEventListener('action', e => {
            if( e.detail.action != config.honeycomb.action )
                return;

            e.stopImmediatePropagation();

            // Remove any lingering honeycom menus as there should only be one active at a time
            if( manager.honeycomb )
                manager.honeycomb.close();

            manager.honeycomb = document.createElement('honeycomb-menu');
            // Some configs can be non extensible so we make them
            // extensible
            manager.honeycomb.config = Object.create( config.honeycomb );
            manager.honeycomb.base = Object.create( config );

            manager.honeycomb.display( cardTools.lovelace_view(), manager.position.x, manager.position.y );

            manager.honeycomb.addEventListener('closing', e => {
                manager.honeycomb = null;
            });
        });
    }
});

class HoneycombMenu extends Polymer.Element
{
    static get is()
    {
        return 'honeycomb-menu';
    }

    static get properties() {
        return {
            hass: Object,
            config: Object,
            base: Object,
            sizes: {
                type: Object,
                readonly: true
            },
            closing: {
                type: Boolean,
                reflectToAttribute: true,
                value: false
            },
            view: Object,
            buttons: Array,
            _service: {
                type: Object,
                value: {
                    x: false,
                    y: false
                }
            }
        }
    }

    static get template() {
        return Polymer.html`
            <style>
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
            }
            :host([closing]) {
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
                pointer-events: none;
            }
            honeycomb-menu-item, xy-pad {
                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item, :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-delay: 800ms !important;
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
            }
            </style>
            <div id="shade" class="shade" on-click="_handleShadeClick"></div>
            <audio id="audio" src="/local/audio/pin-drop.ogg"></audio>
            <template is="dom-if" if="{{config.xy_pad}}">
                <xy-pad
                    style$="animation-delay: 500ms;"
                    hass="[[hass]]"
                    config="[[config.xy_pad]]"
                    size="[[_computeXYPadSize()]]"
                    clamp-x="[[_computeXYPadClamp()]]"
                    clamp-y="[[_computeXYPadClamp()]]"
                    on-drag="_handleXYPad"
                    on-drag-interval="_handleXYPad"
                    on-drag-end="_handleXYPad">
                </xy-pad>
            </template>

            <div id="honeycombs" class="honeycombs">

                <template is="dom-repeat" items="{{buttons}}">
                    <honeycomb-menu-item
                        hass="[[hass]]"
                        style$="animation-delay: [[_computeAnimateDelay(index)]];"
                        class="animated"
                        config="[[_computeItemConfig(item)]]"
                        on-action="_handleItemAction">
                    </honeycomb-menu-item>
                </template>
            </div>
        `;
    }

    ready()
    {
        super.ready();
        cardTools.provideHass(this);

        _.defaults(this.config, {
            size: 225,
            spacing: 2,
            entity: this.base.entity
        });

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
        this._setCssVars();
    }

    close( _item )
    {
        if( this.closing )
            return;

        this.closing = true;

        if( _item ) _item.setAttribute('selected', '');

        var details = {
            detail: {
                item: _item || false
            }
        };

        this.dispatchEvent( new CustomEvent('closing', details) );
        // Remove shade div earlier to allow clicking of other lovelace elements while the animation continues
        this.$.shade.addEventListener('animationend', function(e) {
            this.remove();
        });
        this.shadowRoot.querySelectorAll('honeycomb-menu-item')[5].addEventListener('animationend', e => {
            this.remove();
            this.dispatchEvent( new CustomEvent('closed', details) );
        });
    }

    _assignButtons()
    {
        this.buttons = [];
        for( let i = 0; i < 6; i++ )
        {
            let button = {};

            if( this.config.template_buttons && this.config.template_buttons[i] )
                button = this.config.template_buttons[i];

            if( this.config.buttons && this.config.buttons[i] && this.config.buttons[i] != 'skip' )
                button = this.config.buttons[i];

            if( button == 'break' )
                button = {};

            // Clone to allow writable object from button-card
            this.buttons[i] = _.merge({}, button);
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
        _x = _.clamp( _x - rect.left, bounds.min.x, bounds.max.x );
        _y = _.clamp( _y - rect.top, bounds.min.y, bounds.max.y );

        this.style.left = `${_x - container.w}px`;
        this.style.top = `${_y - container.h}px`;
    }

    _setCssVarProperty(orig_property, var_property)
    {
        this.$.honeycombs.style.setProperty(orig_property, `var(${var_property}, ${this.view.style.getPropertyValue(orig_property)})`, "important");
    }

    _setCssVars()
    {
        this.style.setProperty('--item-size', `${this.sizes.item}px` );
        this.style.setProperty('--container-width', `${this.sizes.containerWidth}px`);
        this.style.setProperty('--container-height', `${this.sizes.containerHeight}px`);

        this.style.setProperty('--spacing', `${this.config.spacing}px`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--paper-card-background-color', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--paper-card-active-background-color', '--honeycomb-menu-active-background-color');
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

        if( e.detail.audio )
            this.$.audio.play();

        if( e.detail.autoclose )
            this.close(e.detail.item);
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
            let service = _.split( config.service, '.', 2);
            this.hass
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.service_data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], data, (val) => {
            if( val == 'entity' )
                return this.config.entity;
            return _.template(val)(vars);
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
        if( _.isEmpty(item) )
            return item;

        return _.omit( _.merge( {}, this.config, item ), ['buttons', 'size', 'action', 'template_buttons', 'xy_pad', 'spacing'] );
    }
    _computeAnimateDelay( i )
    {
        return 125 * i + 'ms';
    }
}
customElements.define(HoneycombMenu.is, HoneycombMenu);
