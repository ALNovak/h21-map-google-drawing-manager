
let DRAWING_MODE_MARKER = "marker";
let DRAWING_MODE_CIRCLE = "circle";
let DRAWING_MODE_AREA = "area";


function DrawingManager(map, opts) {

    let me = this;
    me.extend(DrawingManager, google.maps.OverlayView);

    me.map = map;
    me._opts = opts;
    me._drawingType = opts.drawingMode || DRAWING_MODE_MARKER;
    me._fitBounds = opts._fitBounds || true;
    me.markerOptions = opts.markerOptions || {};
    me.circleOptions = opts.circleOptions || {};
    me.areaOptions = opts.areaOptions || {};
    me._enableDraw = opts.enableDraw;
    me.radius = opts.circleOptions.radius;
    isInit = true;

    google.maps.event.addListener(me.map, 'idle', () => {
        google.maps.event.trigger(me, 'draw:zoom_map', me.map.getZoom());
    })
}

DrawingManager.prototype.onAdd = function () {

    let me = this;

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
        case DRAWING_MODE_AREA:
            me._bindArea();
            break;
        default:
            me._redraw();
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

DrawingManager.prototype._redraw = function () {

    let me = this;

    me._removeArea();
    me._removeCenterMarker();
    me._removeCircle();
}

DrawingManager.prototype._bindArea = function () {

    let me = this;

    me._removeArea();
    me._removeCenterMarker();
    me._removeCircle();

    var createArea = () => {

        me._setDrawing(false);

        const polygonOptions = {
            map: me.map,
            strokeColor: me.areaOptions.strokeColor,
            strokeOpacity: me.areaOptions.strokeOpacity,
            fillColor: me.areaOptions.fillColor,
            fillOpacity: me.areaOptions.fillOpacity,
            strokeWeight: me.areaOptions.strokeWeight,
            clickable: false,
            editable: false
        }


        me.area = new google.maps.Polyline(polygonOptions);

        var move = google.maps.event.addListener(me.map, 'mousemove', function (e) {
            me.area.getPath().push(e.latLng);
        });

        var moveUp = google.maps.event.addListenerOnce(me.map, 'mouseup', () => {

            google.maps.event.removeListener(move);
            google.maps.event.removeListener(moveUp);

            var path = me.area.getPath();

            me.area.setMap(null);

            const opts = {
                map: me.map,
                strokeColor: me.areaOptions.strokeColor,
                strokeOpacity: me.areaOptions.strokeOpacity,
                fillColor: me.areaOptions.fillColor,
                fillOpacity: me.areaOptions.fillOpacity,
                strokeWeight: me.areaOptions.strokeWeight,
                clickable: false,
                path: path,
                editable: false
            }

            google.maps.event.trigger(me, 'draw:area_create', me._convertCoordinates(me.area.getPath().getArray()));

            me.area = new google.maps.Polygon(opts);

            google.maps.event.clearListeners(me.map.getDiv(), 'mousedown');

            me._setDrawing(true);

            me._fitBoundsArea(me.area.getPath().getArray());


        });
    }

    google.maps.event.addDomListener(me.map.getDiv(), 'mousedown', (e) => {
        console.log('mousedown')
        createArea();
    });
}

DrawingManager.prototype._setDrawing = function (enabled) {

    let me = this;

    me.map.setOptions({
        draggable: enabled,
        scrollwheel: enabled,
        disableDoubleClickZoom: enabled
    });
}

DrawingManager.prototype._fitBoundsArea = function (coordinates) {

    let me = this;

    let bounds = new google.maps.LatLngBounds();
    for (var n = 0; n < coordinates.length; n++) {
        bounds.extend(coordinates[n]);
    }
    me.map.panToBounds(bounds);
    me.map.fitBounds(bounds);
}

DrawingManager.prototype._convertCoordinates = function (coordinates) {

    let positions = [];

    for (var n = 0; n < coordinates.length; n++) {
        let item = coordinates[n];
        let position = {
            latitude: item.lat(),
            longitude: item.lng(),
        }
        positions.push(position);
    }
    return positions;
}


DrawingManager.prototype._bindMarker = function () {

    let me = this;

    me._removeArea();
    me._removeCenterMarker();

    google.maps.event.clearListeners(me, 'click');
    google.maps.event.clearListeners(me, 'mousedown');
    google.maps.event.clearListeners(me, 'mouseup');

    me._removeCircle();

    var createCenterMarker = (e) => {

        me._removeCenterMarker();
        me._removeCircle();

        if (e) {
            me._setPosition(e);
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

            google.maps.event.trigger(me, 'draw:marker_create', me._getPosition());
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

DrawingManager.prototype._bindCircle = function () {

    var me = this;

    me._removeCircle();

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

DrawingManager.prototype.setEnableDraw = function (enabled) {

    this._enableDraw = enabled;
}

DrawingManager.prototype._removeCircle = function () {

    let me = this;

    if (me.circle) {
        me.circle.setMap(null);
        me.circle = null;
        me._vertexMarker.setMap(null);
    }

}

DrawingManager.prototype._removeCenterMarker = function () {

    let me = this;


    if (me._centerMarker) {
        me._centerMarker.setMap(null);
        me._centerMarker = null;
        google.maps.event.trigger(me, 'draw:marker_remove', null);
    }

}

DrawingManager.prototype._removeArea = function () {

    let me = this;

    if (me.area) {
        me.area.setMap(null);
        me.area = null;
        google.maps.event.trigger(me, 'draw:area_remove', null);
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

    google.maps.event.addListener(me._centerMarker, 'dragend', function () {
        google.maps.event.trigger(me, 'draw:circle_center_complete', me._getInfo());
    });

    google.maps.event.addListener(me._centerMarker, 'click', function () {
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

DrawingManager.prototype._getPosition = function () {

    let me = this;

    let position = {
        latitude: me._centerMarker.getPosition().lat(),
        longitude: me._centerMarker.getPosition().lng()
    }

    return position;
}

if (typeof module == 'object') {
    module.exports = { default: DrawingManager, DrawingManager: DrawingManager };
}
