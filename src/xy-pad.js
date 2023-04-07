import { LitElement, html, css } from 'lit';

const clamp = require('lodash/clamp');

class XYPad extends LitElement
{
    static get is()
    {
        return 'xy-pad';
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
            size: {
                type: Number
            },
            clampX: {
                type: Number
            },
            clampY: {
                type: Number
            },
            active: {
                type: Boolean,
                reflect: true,
                attribute: true
            },
            _current: {
                type: Object
            }
        };
    }

    static get styles()
    {
        return css`
            :host {
                position: absolute;

                width: 100%;
                height: 100%;

                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                touch-action: none;
            }
            #joystick {
                position: absolute;
                pointer-events: all;
                background: #cecece7d;
                border-radius: 50%;
            }
            #joystick:hover {
                cursor: pointer;
                background: #b3b3b3a3;
            }
            #joystick:active, :host([active]) #joystick {
                box-shadow: 0px 0px 2px 5px #fbfbfb;
                background: #c5c5c5;
            }`;
    }

    render()
    {
        return html`<div id="joystick"></div>`;
    }

    get joystick()
    {
        return this.shadowRoot.querySelector('#joystick');
    }

    firstUpdated()
    {
        if( ! this.config.x )
            this.clampX = 0;
        if( ! this.config.y )
            this.clampY = 0;

        this._setInitCssPositions();
        this._bindListeners();

        this._reset();
    }

    _setInitCssPositions()
    {
        const joy_ele = this.joystick;
        joy_ele.style.width = this.size + 'px';
        joy_ele.style.height = this.size + 'px';
        joy_ele.style.left = `calc( 50% - (${this.size}px / 2) )`;
        joy_ele.style.top  = `calc( 50% - (${this.size}px / 2) )`;
    }

    _bindListeners()
    {
        this.addEventListener('touchstart', this._handleOnDragStart, false);
        this.addEventListener('touchmove', this._handleOnDrag, false);
        document.addEventListener('touchend', this._handleOnDragEnd.bind(this), false);

        this.addEventListener('mousedown', this._handleOnDragStart, false);
        this.addEventListener('mousemove', this._handleOnDrag, false);
        document.addEventListener('mouseup', this._handleOnDragEnd.bind(this), false);
    }

    _reset()
    {
        this.active = false;
        this.style.zIndex = 0;
        this.joystick.style.transform = 'translate3d(0, 0, 0)';
        this._current = {x: 0, y: 0};
        if( this._interval )
        {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    _handleOnDragStart(e)
    {
        this.active = true;
        this.style.zIndex = 100;

        this.dispatchEvent( this.__constructEvent('drag-start') );

        if( this.config.repeat )
            this._interval = setInterval(e => {
                this.dispatchEvent( this.__constructEvent('drag-interval') );
            }, this.config.repeat);
    }

    _setPosition( _x, _y )
    {
        _x = _x - this.joystick.offsetLeft - (this.size / 2);
        _y = _y - this.joystick.offsetTop - (this.size / 2);
        this._current.x = clamp(_x, -this.clampX, this.clampX);
        this._current.y = clamp(_y, -this.clampY, this.clampY);

        this.joystick.style.transform = `translate3d(${this._current.x}px, ${this._current.y}px, 0)`;

        this.dispatchEvent( this.__constructEvent('drag') );
    }

    _handleOnDrag(e)
    {
        if( ! this.active )
            return;

        e.cancelBubble = true;

        if( e.type === "touchmove" )
        {
            var rect = e.target.getBoundingClientRect();
            e.offsetX = e.targetTouches[0].pageX - rect.left;
            e.offsetY = e.targetTouches[0].pageY - rect.top;
        }

        this._setPosition(  e.offsetX,  e.offsetY );
    }

    _handleOnDragEnd(e)
    {
        this.dispatchEvent( this.__constructEvent('drag-end') );
        this._reset();
    }

    __constructEvent( _name )
    {
        return new CustomEvent(_name, this.__constructEventData() );
    }

    __constructEventData()
    {
        let x = (this.config.x && this.config.x.invert) ? -(this._current.x) : this._current.x;
        let y = (this.config.y && this.config.y.invert) ? -(this._current.y) : this._current.y;
        return {
            detail: {
                x: x,
                y: y,
                x_percentage: x / this.clampX * 100,
                y_percentage: y / this.clampY * 100
            }
        };
    }
};
customElements.define(XYPad.is, XYPad);
