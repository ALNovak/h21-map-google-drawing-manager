
let DRAWING_MODE_MARKER = "marker";
let DRAWING_MODE_CIRCLE = "circle";
let DRAWING_MODE_AREA = "area";
let _fitBounds = true;

function Circle(circleOptions, map) {
    this.extend(Circle, google.maps.MVCObject);
    _fitBounds = true;
    let me = this;
    this._radius = null;
    this.map = map;
    this._circle_opt = circleOptions;

    if (this._radius != null) {
        me._radius.unbind('center');
        me.unbind('distance', me._radius);
        me.unbind('bounds', me._radius);
        me._radius.bindTo('center', me);
        me._radius.unbind('map');
    }

    me._radius = new google.maps.Circle({
        strokeColor: circleOptions.strokeColor,
        strokeOpacity: circleOptions.strokeOpacity,
        strokeWeight: circleOptions.strokeWeight,
        fillColor: circleOptions.fillColor,
        fillOpacity: circleOptions.fillOpacity,

    });

    me.set('distance', circleOptions.radius / 1000);
    me.bindTo('bounds', this._radius);
    me._radius.bindTo('center', this);
    me._radius.bindTo('map', this);
    me._radius.bindTo('radius', this);
    me.addSizer_();
}

Circle.prototype.extend = function (obj1, obj2) {
    return (function (object) {
        var property;
        for (property in object.prototype) {
            this.prototype[property] = object.prototype[property];
        }
        return this;
    }).apply(obj1, [obj2]);
};

Circle.prototype.distance_changed = function () {
    this.set('radius', this.get('distance') * 1000);
};

Circle.prototype.addSizer_ = function () {
    let me = this;
    let svg = [
        '<?xml version="1.0"?>',
        '<svg width="16px" height="16px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">',
        '<circle stroke="#003dd9" fill="white" stroke-width="10" cx="50" cy="50" r="35"/>',
        '</svg>'
    ].join('\n');

    this._vertex = null;
    this._vertex = new google.maps.Marker({
        draggable: true,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(15, 15) },
        raiseOnDrag: false
    });

    this._vertex.setCursor('col-resize');
    this._vertex.bindTo('map', this);
    this._vertex.bindTo('position', this, 'sizer_position');

    google.maps.event.addListener(this._vertex, 'drag', (event) => {
        this._vertex.setCursor('col-resize');
        let pos = me.get('sizer_position');
        let center = me.get('center');
        let distance = this.distanceBetweenPoints_(center, pos);
        distance = Math.round(distance * 100) / 100;
        distance = google.maps.geometry.spherical.computeDistanceBetween(center, pos) / 1000;

        if (me._circle_opt.minRadius != null && me._circle_opt.maxRadius != null) {
            let min = me._circle_opt.minRadius / 1000;
            let max = me._circle_opt.maxRadius / 1000;

            if (max !== null) {
                if (distance > max) {
                    me.set('sizer_position', google.maps.geometry.spherical.computeOffset(center, max * 1000, google.maps.geometry.spherical.computeHeading(center, pos)));
                }
            }

            if (min !== null) {
                if (distance < min) {
                    me.set('sizer_position', google.maps.geometry.spherical.computeOffset(center, min * 1000, google.maps.geometry.spherical.computeHeading(center, pos)));
                }
            }
        }
        me.setDistance();
    });
};

Circle.prototype.center_changed = function () {

    var bounds = this.get('bounds');
    if (bounds) {
        var lng = bounds.getNorthEast().lng();
        var position = new google.maps.LatLng(this.get('center').lat(), lng);
        this.set('sizer_position', position);
        if (_fitBounds) {
            this.map.fitBounds(bounds);
            _fitBounds = false;
        }
    }
};

Circle.prototype.distanceBetweenPoints_ = function (p1, p2) {
    if (!p1 || !p2) {
        return 0;
    }
    var R = 6371;
    var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
    var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
};

Circle.prototype.setDistance = function () {
    var me = this
    var pos = this.get('sizer_position');
    var center = this.get('center');
    var distance = this.distanceBetweenPoints_(center, pos);
    this.set('distance', distance);
};

function DrawingManager(map, opts) {
    this.extend(DrawingManager, google.maps.OverlayView);
    this.set('_opts', opts);
    this.set('map', map);

    this._drawingType = opts.drawingMode || DRAWING_MODE_MARKER;
    this._overlayEnableClick = opts.overlayEnableClick;
    this._fitBounds = opts._fitBounds || true;
    this.markerOptions = opts.markerOptions || {};
    this.circleOptions = opts.circleOptions || {};
    this.areaOptions = opts.areaOptions || {};
    this._setDrawingMode(this._drawingType);
}


DrawingManager.prototype.onAdd = function () {
    var me = this;
    google.maps.event.addListener(this.getMap(), 'click', function (event) {
        google.maps.event.trigger(me, 'click', event);
    });

};

DrawingManager.prototype.onRemove = function () { };

DrawingManager.prototype.draw = function () { };

DrawingManager.prototype.setDrawingMode = function (drawingType) {
    if (this._drawingType != drawingType) {
        this._setDrawingMode(drawingType);
    }
}

DrawingManager.prototype._setPosition = function (e) {
    let me = this;
    this.set('position', null);

    if (e) {
        me.set('position', e.latLng);
    }
}

DrawingManager.prototype.setPosition_ = function (latitude, longitude) {
    let me = this;
    me.set('position', null);
    me.get('bounds');
    me.set('position', new google.maps.LatLng(latitude, longitude));
}

DrawingManager.prototype.setEnabledClick = function (enabled) {
    this._overlayEnableClick = enabled;
}

DrawingManager.prototype._unBindCenterMarker = function () {
    if (this._centerMarker != null) {
        this._centerMarker.unbindAll();
        this._centerMarker.set('map', null);
        this._centerMarker = null;
    }
}

DrawingManager.prototype._unBinVertex = function () {
    if (this.circle != undefined) {
        this.circle._vertex.unbindAll();
        this.circle._vertex.set('map', null);
        this.circle._vertex = null;
        this.circle.unbindAll();
        this.circle.set('map', null);
    }
}

DrawingManager.prototype._unBinCircle = function () {
    if (this.circle != null) {
        this.circle.unbindAll();
        this.circle.set('map', null);
    }
}

DrawingManager.prototype._BinToCircle = function () {
    this.circle.bindTo('map', this);
    this.circle.bindTo('center', this, 'position');
    this.bindTo('distance', this.circle);
    this.bindTo('bounds', this.circle);

}

DrawingManager.prototype._binToVertex = function () {
    this._vertex.bindTo('map', this);
    this._vertex.bindTo('position', this, 'sizer_position');
}

DrawingManager.prototype._binToCenterMarker = function () {
    let me = this;
    let map = this._map;

    this._centerMarker.set('map', map);
    this._centerMarker.bindTo('map', me);
    this._centerMarker.bindTo('position', me);
}

DrawingManager.prototype._setDrawingMode = function (drawingType) {

    this._drawingType = drawingType;

    switch (drawingType) {
        case DRAWING_MODE_MARKER:
            this._bindMarker();
            break;
        case DRAWING_MODE_CIRCLE:
            this._bindCircle(this);
            break;
    }
}

DrawingManager.prototype._bindMarker = function () {
    var me = this;
    var map = this._map;

    this._centerMarker = null;
    this.set('position', null);

    if (this.circle != undefined) {
        this.circle._vertex.unbindAll();
        this.circle._vertex.set('map', null);
        this.circle._vertex = null;
        this.circle.unbindAll();
        this.circle.set('map', null);
    }

    var createCenterMarker = (e) => {

        if (e) {
            me._setPosition(e);
        }
        me._unBindCenterMarker();

        this._centerMarker = new google.maps.Marker({
            draggable: false,
            zIndex: 9999999,
            icon: this.markerOptions.iconUrl,
            raiseOnDrag: false
        });

        me._binToCenterMarker();
        me._centerMarker.setCursor('default');
        me._addListeners();
    }

    if (!this._overlayEnableClick) {
        createCenterMarker()
    }

    this.markerListener = google.maps.event.addListener(me, 'click', (event) => {
        if (this._overlayEnableClick) {
            createCenterMarker(event)
        }
    });
}

DrawingManager.prototype._addListeners = function () {
    var me = this;
    google.maps.event.addListener(me._centerMarker, 'drag', function (event) {
        google.maps.event.trigger(me, 'circle_centre_change', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'dragend', function (event) {
        google.maps.event.trigger(me, 'circle_center_complete', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'click', function (event) {
        google.maps.event.trigger(me, 'marker_click', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'mouseover', function (event) {
        google.maps.event.trigger(me, 'marker_mouseover', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'mouseout', function (event) {
        google.maps.event.trigger(me, 'marker_mouseout', me._getInfo());
    });
}

DrawingManager.prototype.remove = function () { }

DrawingManager.prototype._bindCircle = function (drawing) {

    var me = this;
    var _me = drawing;

    if (this.circle != null) {
        this.circle.unbindAll();
        this.circle.set('map', null);
    }

    this.circle = new Circle(this.circleOptions, this.map);
    this.circle.bindTo('map', this);
    this.circle.bindTo('center', this, 'position');
    this.bindTo('distance', this.circle);
    this.bindTo('bounds', this.circle);

    if (_me._centerMarker) {
        _me._centerMarker.setDraggable(true);
        _me._centerMarker.setCursor('move');
    }

    google.maps.event.addListener(this.circle._vertex, 'dragend', (event) => {

        google.maps.event.trigger(me, 'circle_radius_complete', this._getInfo());
    });

    google.maps.event.addListener(this.circle._vertex, 'drag', (event) => {

        let pixel = getXYbyEvent(event);
        let ev = {
            pixel,
            radius: this.circle.radius
        }

        google.maps.event.trigger(me, 'circle_radius_change', ev);

    });


    google.maps.event.removeListener(this.markerListener);

    var getXYbyEvent = function (event) {

        let client = me.getProjection().fromLatLngToContainerPixel(event.latLng);
        return {
            clientX: client.x,
            clientY: client.y
        }
    };
}

DrawingManager.prototype.extend = function (obj1, obj2) {
    return (function (object) {
        var property;
        for (property in object.prototype) {
            this.prototype[property] = object.prototype[property];
        }
        return this;
    }).apply(obj1, [obj2]);
};

DrawingManager.prototype._getInfo = function () {

    let position = {
        latitude: this.position.lat(),
        longitude: this.position.lng()
    }
    let info = {
        radius: this.circle.radius,
        position,
        latLng: this.position
    };

    return info;
}

if (typeof module == 'object') {
    module.exports = { default: DrawingManager, DrawingManager: DrawingManager };
}
