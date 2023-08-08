import { LitElement, html, css } from 'lit';
import { objectEvalTemplate, getTemplateOrValue, provideHass, createCard } from "./helpers.js";

const merge = require('lodash/merge');
const assign = require('lodash/assign');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');

class HoneycombMenuItem extends LitElement
{
    static get is()
    {
        return 'honeycomb-menu-item';
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
            variables: {
                type: Object
            },
            size: {
                type: Number
            },
            color: {
                type: String
            },
            icon: {
                type: String
            },
            action: {
                type: Object
            },
            disabled: {
                type: Boolean,
                reflect: true,
                attribute: true
            },
            audio: {
                type: Boolean
            },
            autoclose: {
                type: Boolean
            },
            active: {
                type: Boolean,
                reflect: true,
                attribute: true
            }
        };
    }

    set hass( obj )
    {
        this._hass = obj;
        this._computeIsActive();
    }

    get hass()
    {
        return this._hass;
    }

    set config( config )
    {
        if( config.type == 'break' || isEmpty(config) || config.disabled )
        {
            this.disabled = true;
            return;
        }

        // Assign Defaults
        this._config = assign({
            autoclose: true,
            audio: true,
            active: false,
            variables: {},
        }, config);

        if( isString( this._config.tap_action ) )
            this._config.tap_action = {'action': this._config.tap_action};
        if( isString( this._config.hold_action ) )
            this._config.hold_action = {'action': this._config.hold_action};
        if( isString( this._config.double_tap_action ) )
            this._config.double_tap_action = {'action': this._config.double_tap_action};

        if( ! this._config.active )
            this.style.setProperty('--paper-item-icon-active-color', 'var(--paper-item-icon-color)');

        this._parseTemplates();
        this._computeIsActive();
    }

    get config()
    {
        return this._config;
    }

    static get styles()
    {
        return css`
            :host {
            }
            :host([active]) {
                --ha-card-background: var(--ha-card-active-background);
                --paper-item-icon-color: var(--paper-item-icon-active-color);
            }
            .honey {
                list-style-type: none;
                position: relative;
                display: inline-block;

                width: 100%;
                padding: 0 0 var(--temp, 114.76%) 0;
                -o-transform: rotate(-60deg) skewY(30deg);
                -moz-transform: rotate(-60deg) skewY(30deg);
                -webkit-transform: rotate(-60deg) skewY(30deg);
                -ms-transform: rotate(-60deg) skewY(30deg);
                transform: rotate(-60deg) skewY(30deg);
                overflow: hidden;
                visibility: hidden;

                z-index:100;
            }
            .comb {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                -o-transform: skewY(-30deg) rotate(60deg);
                -moz-transform: skewY(-30deg) rotate(60deg);
                -webkit-transform: skewY(-30deg) rotate(60deg);
                -ms-transform: skewY(-30deg) rotate(60deg);
                transform: skewY(-30deg) rotate(60deg);
                overflow: hidden;

                background: #000;
            }
            .comb * {
                visibility: visible;
            }
            #item {
                pointer-events: all;
                height: 100%;
            }

            #item > * {
                height: 100%;
            }
            
            :host([disabled]) #item {
                background: var(--honeycomb-menu-disabled, #9a9a9a6e);
            }        
        `;
    }

    render()
    {
        return html`
            <div class="honeycomb">
                <div class="honey">
                    <div class="comb">
                        <div id="item"></div>
                    </div>
                </div>
            </div>`;
    }

    _computeIsActive()
    {
        if( ! this.config )
            return;

        if( typeof this.config.active == 'boolean' )
        {
            this.active = this.config.active && this.hass.states[this.config.entity] && this.hass.states[this.config.entity].state == 'on';
        }
        if( typeof this.config.active == 'string' )
        {
            this.active = getTemplateOrValue( this.hass, this.hass.states[this.config.entity], this.config.variables, this.config.active);
        }
    }

    firstUpdated()
    {
        if( !this.disabled )
            this.shadowRoot.querySelector('#item').append( this._createLovelaceCard() );
    }

    _parseTemplates()
    {
        this.config.entity = getTemplateOrValue( this.hass, null, this.config.variables, this.config.entity );

        for( let key in this.config )
        {
            if( ['tap_action', 'hold_action', 'double_tap_action'].indexOf(key) > -1 )
            {
                this.config[key] = objectEvalTemplate( this.hass, this.hass.states[this.config.entity], this.config.variables, this.config[key] );
            }
        }
    }

    _createLovelaceCard()
    {
        if( ! this.config.type || this.config.type == 'custom:button-card' )
            this.config.styles.card = [
                { 
                    height: '100%',
                    position: 'fixed',
                    padding: '0'
                }
            ]
        var card = createCard(merge({}, {    
            type: 'custom:button-card',
            size: '30px',
            show_name: false
        }, this.config));
        provideHass( card );

        card.addEventListener('action', e => {
            e.detail.item = this;
            e.detail.autoclose = this.config.autoclose;
            e.detail.audio = this.config.audio;
        });

        // var sheet = new CSSStyleSheet();
        // sheet.replaceSync( `ha-card { height: 100%; position: fixed !important; padding: 0 !important; }`);
        // card.render()
        // console.dir(card);
        // card.adoptedStyleSheets = [ ...card.adoptedStyleSheets, sheet ];

        return card;
    }
};
customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
