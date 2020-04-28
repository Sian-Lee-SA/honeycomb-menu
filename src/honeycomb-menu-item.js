/**
 * @Author: Sian Croser
 * @Date:   2020-04-19T19:45:08+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: comb.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-29T04:21:19+09:30
 * @License: GPL-3
 */

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
                --paper-card-background-color: var(--paper-card-active-background-color);
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

        if( this.config.type == 'break' || _.isEmpty(this.config) )
        {
            this.disabled = true;
            return;
        }

        // Assign Defaults
        this.config = _.assign({
            autoclose: true,
            audio: true,
            active: false
        }, this.config);

        if( ! this.config.active )
            this.style.setProperty('--paper-item-icon-active-color', 'var(--paper-item-icon-color)');

        this.$.item.append( this._createLovelaceCard() );
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

        var sheet = new CSSStyleSheet
        sheet.replaceSync( `ha-card { height: 100%; position: fixed !important; }`);
        card.shadowRoot.adoptedStyleSheets = [ ...card.shadowRoot.adoptedStyleSheets, sheet ];

        return card;
    }

    _hassObserver( nVal, oVal )
    {
        this.active = this.config.active && nVal.states[this.config.entity] && nVal.states[this.config.entity].state == 'on';
    }
};
customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
