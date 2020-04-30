/**
 * @Author: Sian Croser
 * @Date:   2020-04-22T20:48:29+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: xy_pad.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-29T04:50:53+09:30
 * @License: GPL-3
 */

import { fireEvent } from "./helpers.js";

class XYPad extends Polymer.Element
{
    static get is()
    {
        return 'xy-pad';
    }

    static get properties()
    {
        return {
            hass: Object,
            config: Object,
            size: Number,
            clampX: Number,
            clampY: Number,
            active: {
                type: Boolean,
                reflectToAttribute: true
            },
            _current: Object
        };
    }

    static get template()
    {
        return Polymer.html`
            <style>
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
            }
            </style>
            <div id="joystick"></div>
        `;
    }

    ready()
    {
        super.ready();

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
        this.$.joystick.style.width = this.size + 'px';
        this.$.joystick.style.height = this.size + 'px';
        this.$.joystick.style.left = `calc( 50% - (${this.size}px / 2) )`;
        this.$.joystick.style.top  = `calc( 50% - (${this.size}px / 2) )`;
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
        this.$.joystick.style.transform = 'translate3d(0, 0, 0)';
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

        fireEvent(this, 'drag-start', this.__eventData());

        if( this.config.repeat )
            this._interval = setInterval(e => {
                fireEvent(this, 'drag-interval', this.__eventData());
            }, this.config.repeat);
    }

    _setPosition( _x, _y )
    {
        _x = _x - this.$.joystick.offsetLeft - (this.size / 2);
        _y = _y - this.$.joystick.offsetTop - (this.size / 2);
        this._current.x = _.clamp(_x, -this.clampX, this.clampX);
        this._current.y = _.clamp(_y, -this.clampY, this.clampY);

        this.$.joystick.style.transform = `translate3d(${this._current.x}px, ${this._current.y}px, 0)`;

        fireEvent(this, 'drag', this.__eventData());
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
        fireEvent(this, 'drag-end', this.__eventData());
        this._reset();
    }

    __eventData()
    {
        let x = (this.config.x && this.config.x.invert) ? -(this._current.x) : this._current.x;
        let y = (this.config.y && this.config.y.invert) ? -(this._current.y) : this._current.y;
        return {
            x: x,
            y: y,
            x_percentage: x / this.clampX * 100,
            y_percentage: y / this.clampY * 100
        };
    }
};
customElements.define(XYPad.is, XYPad);
