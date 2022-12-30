/**
 * @Author: Sian Croser
 * @Date:   2020-04-19T19:45:08+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: comb.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-27T06:55:33+09:30
 * @License: GPL-3
 */
import { objectEvalTemplate, getTemplateOrValue } from "./helpers.js";

var cardTools = customElements.get('card-tools');
const _ = require('lodash');

class HoneycombMenuItem extends Polymer.Element
{
    static get is()
    {
        return 'honeycomb-menu-item';
    }

    static get properties()
    {
        return {
            hass: {
                type: Object,
                observer: '_hassObserver'
            },
            config: Object,
            variables: Object,
            size: Number,
            color: String,
            icon: String,
            action: Object,
            disabled: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            },
            audio: Boolean,
            autoclose: Boolean,
            active: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            }
        }
    }

    static get template()
    {
        return Polymer.html`
            <style>
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
            </style>

            <div class="honeycomb">
                <div class="honey">
                    <div class="comb">
                        <div id="item"></div>
                    </div>
                </div>
            </div>
        `;
    }

    ready()
    {
        super.ready();
        if( this.config.type == 'break' || _.isEmpty(this.config) || this.config.disabled )
        {
            this.disabled = true;
            return;
        }

        // Assign Defaults
        this.config = _.assign({
            autoclose: true,
            audio: true,
            active: false,
            variables: {},
        }, this.config);

        if( _.isString( this.config.tap_action ) )
            this.config.tap_action = {'action':this.config.tap_action};
        if( _.isString( this.config.hold_action ) )
            this.config.hold_action = {'action':this.config.hold_action};
        if( _.isString( this.config.double_tap_action ) )
            this.config.double_tap_action = {'action':this.config.double_tap_action};

        if( ! this.config.active )
            this.style.setProperty('--paper-item-icon-active-color', 'var(--paper-item-icon-color)');

        this._parseTemplates();
        this._hassObserver( this.hass );
        this.$.item.append( this._createLovelaceCard() );
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
        var card = cardTools.createCard(_.merge({}, {
            type: 'custom:button-card',
            size: '30px',
            show_name: false
        }, this.config));
        cardTools.provideHass( card );

        card.addEventListener('action', e => {
            e.detail.item = this;
            e.detail.autoclose = this.config.autoclose;
            e.detail.audio = this.config.audio;
        });

        var sheet = new CSSStyleSheet();
        sheet.replaceSync( `ha-card { height: 100%; position: fixed !important; padding: 0 !important; }`);
        card.shadowRoot.adoptedStyleSheets = [ ...card.shadowRoot.adoptedStyleSheets, sheet ];

        return card;
    }

    _hassObserver( nVal, oVal )
    {
        if( typeof this.config.active == 'boolean' )
        {
            this.active = this.config.active && nVal.states[this.config.entity] && nVal.states[this.config.entity].state == 'on';
        }
        if( typeof this.config.active == 'string' )
        {
            this.active = getTemplateOrValue( this.hass, this.hass.states[this.config.entity], this.config.variables, this.config.active);
        }
    }

};
customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
