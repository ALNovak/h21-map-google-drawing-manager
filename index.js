
let DRAWING_MODE_MARKER = "marker";
let DRAWING_MODE_CIRCLE = "circle";


function DrawingManager(map, opts) {

    this.extend(DrawingManager, google.maps.OverlayView);

    this.map = map;
    this._opts = opts;
    this._drawingType = opts.drawingMode || DRAWING_MODE_MARKER;
    this._fitBounds = opts._fitBounds || true;
    this.markerOptions = opts.markerOptions || {};
    this.circleOptions = opts.circleOptions || {};
    this._enableDraw = opts.enableDraw;
    this.radius = opts.circleOptions.radius;

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
    let me = this;
    this._drawingType = drawingType;

    switch (drawingType) {
        case DRAWING_MODE_MARKER:
            me._bindMarker();
            break;
        case DRAWING_MODE_CIRCLE:
            me._bindCircle();
            break;
    }
}

DrawingManager.prototype._setPosition = function (e) {

    let me = this;
    me.position = null;

    if (e) {
        me.position = e.latLng;
    }
}

DrawingManager.prototype.setPosition = function (lat, lng) {

    let me = this;
    me.position = null;

    me.position = new google.maps.LatLng(lat, lng)

}



DrawingManager.prototype._bindMarker = function () {

    let me = this;

    if (me._centerMarker) {
        me._centerMarker.setMap(null);
        google.maps.event.trigger(me, 'draw:marker_remove', null);
    }

    google.maps.event.clearListeners(me, 'click');


    if (me.circle) {
        me.circle.setMap(null);
        me._vertexMarker.setMap(null);
    }

    var createCenterMarker = (e) => {

        if (me._centerMarker) {
            me._centerMarker.setMap(null);
            me._centerMarker = null;
            google.maps.event.trigger(me, 'draw:marker_remove', null);
        }

        if (e) {
            me._setPosition(e);
        }

        if (me.circle) {
            me.circle.setMap(null);
            me._vertexMarker.setMap(null);
        }


        if (me.position) {
            me._centerMarker = new google.maps.Marker({
                draggable: false,
                zIndex: 9999999,
                position: me.position,
                icon: me.markerOptions.iconUrl,
                raiseOnDrag: false,
                optimized: true,
            });

            me._centerMarker.setMap(me.map);
            me.map.setCenter(me.position);
            if (me.map.getZoom() < 9) {
                me.map.setZoom(9);
            }

            google.maps.event.trigger(me, 'draw:marker_create', null);
            me._centerMarker.setCursor('default');
            me.position = null;
        }
    }

    if (!this._enableDraw) {
        createCenterMarker();
        google.maps.event.clearListeners(me, 'click');
    }

    this.markerListener = google.maps.event.addListener(me, 'click', (event) => {
        event.stop();
        if (this._enableDraw) {
            createCenterMarker(event)
        }
    });
}


DrawingManager.prototype.setEnableDraw = function (enabled) {

    this._enableDraw = enabled;
}

DrawingManager.prototype.remove = function () { }

DrawingManager.prototype._bindCircle = function () {

    var me = this;

    if (me.circle) {
        me.circle.setMap(null);
        me._vertexMarker.setMap(null);
        google.maps.event.trigger(me, 'draw:circle_remove', null);
    }

    if (me._centerMarker) {
        me.circle = new google.maps.Circle({
            strokeColor: me.circleOptions.strokeColor,
            strokeOpacity: me.circleOptions.strokeOpacity,
            strokeWeight: me.circleOptions.strokeWeight,
            fillColor: me.circleOptions.fillColor,
            fillOpacity: me.circleOptions.fillOpacity,
            center: me._centerMarker.getPosition(),
            radius: me.radius,
            geodesic: false,
            optimized: true,
        });

        me.circle.setMap(me.map);

        google.maps.event.trigger(me, 'draw:circle_create', this._getInfo());

        me.map.fitBounds(me.circle.getBounds());

        me._createVertexMarker();

        me._centerMarker.setDraggable(true);
        me._centerMarker.setCursor('move');

        me._centerMarkerAddEventListener();
    }

}

DrawingManager.prototype._createVertexMarker = function () {

    let me = this;

    me.to = null;
    me.to = me.destination(this._centerMarker.getPosition(), 90, this.radius);


    me.fillColor = 'white';

    let svg = [
        `<?xml version="1.0"?>`,
        `<svg width="16px" height="16px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">`,
        `<circle stroke="#003dd9" fill="${me.fillColor}" stroke-width="10" cx="50" cy="50" r="35"/>`,
        `</svg>`
    ].join('\n');

    me._vertexMarker = new google.maps.Marker({
        position: me.to,
        draggable: true,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(15, 15) },
        raiseOnDrag: false,
        optimized: true,
    });


    me._vertexMarker.setMap(me.map);
    me._vertexMarker.setCursor('col-resize');
    me._vertexMarkerAddEventListener();


}

DrawingManager.prototype._vertexMarkerAddEventListener = function () {

    let me = this;

    google.maps.event.addListener(me._vertexMarker, 'drag', (event) => {

        let distance = me.getDistanceTo(me._centerMarker.getPosition(), event.latLng);

        me.radius = distance;

        if (me.circle) {
            me.circle.setRadius(distance);
        }

        let pixel = me.getXYbyEvent(event);
        let ev = {
            pixel,
            radius: me.circle.getRadius()
        }

        google.maps.event.trigger(me, 'draw:circle_radius_change', ev);

    });

    google.maps.event.addListener(me._vertexMarker, 'dragend', () => {
        google.maps.event.trigger(me, 'draw:circle_radius_complete', this._getInfo());
    });

}


DrawingManager.prototype.getXYbyEvent = function (event) {

    let me = this;

    let client = me.getProjection().fromLatLngToContainerPixel(event.latLng);
    return {
        clientX: client.x,
        clientY: client.y
    }
};

DrawingManager.prototype._centerMarkerAddEventListener = function () {

    let me = this;

    google.maps.event.addListener(me._centerMarker, 'drag', function (event) {

        me.circle.setCenter(event.latLng);

        let to = me.destination(event.latLng, 90, me.radius);

        if (me._vertexMarker) {
            me._vertexMarker.setPosition(to);
        }

        google.maps.event.trigger(me, 'draw:circle_centre_change', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'dragend', function (event) {
        google.maps.event.trigger(me, 'draw:circle_center_complete', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'click', function (event) {
        google.maps.event.trigger(me, 'draw:marker_click', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'mouseover', function (event) {
        google.maps.event.trigger(me, 'draw:marker_mouseover', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'mouseout', function (event) {
        google.maps.event.trigger(me, 'draw:marker_mouseout', me._getInfo());
    });

}

DrawingManager.prototype.destination = function (latlng, heading, distance) {

    heading = (heading + 360) % 360;
    var rad = Math.PI / 180,
        radInv = 180 / Math.PI,
        R = 6378137,
        lon1 = latlng.lng() * rad,
        lat1 = latlng.lat() * rad,
        rheading = heading * rad,
        sinLat1 = Math.sin(lat1),
        cosLat1 = Math.cos(lat1),
        cosDistR = Math.cos(distance / R),
        sinDistR = Math.sin(distance / R),
        lat2 = Math.asin(sinLat1 * cosDistR + cosLat1 *
            sinDistR * Math.cos(rheading)),
        lon2 = lon1 + Math.atan2(Math.sin(rheading) * sinDistR *
            cosLat1, cosDistR - sinLat1 * Math.sin(lat2));
    lon2 = lon2 * radInv;
    lon2 = lon2 > 180 ? lon2 - 360 : lon2 < -180 ? lon2 + 360 : lon2;
    return new google.maps.LatLng(lat2 * radInv, lon2)
};

DrawingManager.prototype.degreeToRad = function (degree) {

    return Math.PI * degree / 180;
},

    DrawingManager.prototype._getRange = function (v, a, b) {

        if (a != null) {
            v = Math.max(v, a);
        }
        if (b != null) {
            v = Math.min(v, b);
        }
        return v;
    };

DrawingManager.prototype._getLoop = function (v, a, b) {

    while (v > b) {
        v -= b - a
    }
    while (v < a) {
        v += b - a
    }
    return v;
};

DrawingManager.prototype.getDistanceTo = function (point1, point2) {

    let me = this;
    point1.ln = me._getLoop(point1.lng(), -180, 180);
    point1.lt = me._getRange(point1.lat(), -74, 74);
    point2.ln = me._getLoop(point2.lng(), -180, 180);
    point2.lt = me._getRange(point2.lat(), -74, 74);

    var x1, x2, y1, y2;
    x1 = this.degreeToRad(point1.ln);
    y1 = this.degreeToRad(point1.lt);
    x2 = this.degreeToRad(point2.ln);
    y2 = this.degreeToRad(point2.lt);

    return 6370996.81 * Math.acos((Math.sin(y1) * Math.sin(y2) + Math.cos(y1) * Math.cos(y2) * Math.cos(x2 - x1)));
};



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

    let me = this;

    let position = {
        latitude: me._centerMarker.getPosition().lat(),
        longitude: me._centerMarker.getPosition().lng()
    }
    let info = {
        radius: me.circle.getRadius(),
        position
    };

    return info;
}

if (typeof module == 'object') {
    module.exports = { default: DrawingManager, DrawingManager: DrawingManager };
}
