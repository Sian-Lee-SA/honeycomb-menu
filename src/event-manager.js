class EventManager {
};

EventManager.prototype.getEvents = function( _event )
{
    if( ! this._events )
        this._events = new Object();
    if( _event )
    {
        if( ! this._events[_event] )
            this._events[_event] = new Array();
        return this._events[_event];
    }
    return this._events;
}

EventManager.prototype.clearEvents = function( _event )
{
    if( ! this._events)
        return;
    this._events[_event] = new Array()
}

EventManager.prototype.addEventListener = function( _event, _func, _options )
{
    this.getEvents(_event).push({ func: _func, options: _options});

    Element.prototype.addEventListener.call(this, _event, _func, _options);
};

EventManager.prototype.removeEventListeners = function(_event)
{
    if( _.isArray(_event) )
        return _event.forEach( e => this.removeEventListeners(e) );

    this.getEvents(_event).forEach( o => {
        this.removeEventListener(_event, o.func, o.options);
    });
    this.clearEvents( _event );
};

EventManager.prototype.prependEventListener = function( _event, _func, _options )
{
    let events = this.getEvents(_event);
    this.removeEventListeners(_event);
    this.addEventListener( _event, _func, _options );
    events.forEach(o => {
        this.addEventListener( _event, o.func, o.options );
    });
};

export default EventManager;
