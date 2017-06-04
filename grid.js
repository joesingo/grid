function Grid(cnv) {

    var canvas = cnv;
    var ctx = canvas.getContext("2d");

    this.settings = {
        // The step size to go up in when plotting functions
        "delta": 0.02,

        "grid_lines": {
            "major": {
                "spacing": 1,
                "colour": "#555",
                "width": 1
            },
            "minor": {
                "spacing": 0.2,
                "colour": "#777",
                "width": 0.5
            }
        },

        "background_colour": "white",

        "axes": {
            "enabled": "true",
            "colour": "black",
            "width": 2
        },

        "border": {
            "colour": "black",
            "width": 5
        },

        "default_style": {
            "colour": "#ee0155",
            "line_width": 2,
            "fill": false,
            "font": "Arial",
            "font_size": 25,
            "hidden": false
        },

        "zoom": {
            "enabled": true,
            "callback": null
        },

        "scroll": {
            "enabled": true,
            "callback": null
        }
    }

    // Constants to represent the different types of grid object
    const SHAPE = "shape";
    const CIRCLE = "circle";
    const FUNCTION = "function";
    const LINE = "line";
    const TEXT = "text";
    const IMAGE = "image";
    var grid_object_types = [SHAPE, CIRCLE, FUNCTION, LINE, TEXT, IMAGE];

    var text_alignments = [
        "left", "center", "right"
    ];

    var zoom_matrix = new Matrix([
        [100, 0],
        [0, 100]
    ]);
    var translation = new Matrix([
        [1],
        [1]
    ]);

    var grid_objects = {};
    var current_id = 0;

    // Store the z coordinates of items. Each item in z_coords is an array
    // [z, ids] where z is the z-coordinate and ids is an array of object IDs
    // with that coordinate. z_coords is sorted by increasing z
    var z_coords = [[0, []]];
    // A mapping from object ID to z coordinate
    var obj_to_z = {};

    // Keep track of how much the base zoom_matrix has been scaled, so that the
    // spacing between grid lines can be adjusted when it gets too large/small.
    // e.g 2 would mean base zoom has been doubled since grid lines were last
    // re-calculated
    var zoom_counter = 1;

    /*
     * Convert real coordinates to canvas coordinates
     */
    this.canvasCoords = function(x, y) {
        var p = new Matrix([[x], [y]]);
        var new_point = zoom_matrix.multiply(p).add(translation);

        var coords = [new_point.entry(0, 0), new_point.entry(1, 0)];

        return [coords[0] + 0.5 * canvas.width, -coords[1] + 0.5*canvas.height]
    }

    /*
     * Convert canvas coordinates to real coordinates
     */
    this.fromCanvasCoords = function(x, y) {
        x -= 0.5 * canvas.width;
        y = -(y - 0.5*canvas.height);

        var p = new Matrix([[x], [y]]);
        var new_point = zoom_matrix.inverse().multiply(p.subtract(translation));
        return [new_point.entry(0, 0), new_point.entry(1, 0)];
    }

    /*
     * Return the grid units to pixel ratio
     */
    this.getUnitsToPx = function() {
        // Note: Currently you cannot zoom separately in x and y directions, so
        // 00 and 11 entry of the zoom matrix are the same
        return 1 / zoom_matrix.entry(0, 0);
    }

    /*
     * Draw a grid object onto the canvas
     */
    this.drawObject = function(grid_obj) {
        if (grid_obj.style.hidden) {
            return;
        }

        ctx.beginPath();

        ctx.fillStyle = grid_obj.style.colour;
        ctx.strokeStyle = grid_obj.style.colour;

        switch (grid_obj.type) {
            case SHAPE:
                // Draw a shape by drawing lines connecting the points in
                // the points array
                var points = grid_obj.data.points;

                var start = this.canvasCoords(points[0][0], points[0][1]);
                ctx.moveTo(start[0], start[1]);

                for (var i=1; i<points.length; i++) {
                    var coords = this.canvasCoords(points[i][0], points[i][1]);
                    ctx.lineTo(coords[0], coords[1]);
                }

                ctx.lineTo(start[0], start[1]);
                break;

            case CIRCLE:
                // A circle can be accomplished with a parametric function but
                // being a seperate type is more user friendly and probably
                // quicker to draw
                var d = grid_obj.data;
                var coords = this.canvasCoords(d.x, d.y);
                var radius = d.radius / this.getUnitsToPx();
                ctx.arc(coords[0], coords[1], radius, 0, 2 * Math.PI);
                break;

            case FUNCTION:
                // Draw a parametric function by stepping through the domain
                // and drawing a line connecting each point
                var d = grid_obj.data;

                var start = d.domain.interval[0];
                var end = d.domain.interval[1];
                var step = this.settings.delta;

                if (d.domain.integer_points) {
                    start = Math.ceil(start);
                    end = Math.floor(end);
                    step = 1;
                }

                // Keep track of when a point in the domain has been skipped
                // (i.e. func returned null) so that we can do moveTo instead
                // of lineTo
                var skipped_point = false;

                for (var t=start; t<=end; t+=step) {
                    var point = d.function(t);

                    if (point === null || point[1] === null) {
                        skipped_point = true;
                        continue;
                    }

                    var coords = this.canvasCoords(point[0], point[1]);

                    if (skipped_point) {
                        ctx.moveTo(coords[0], coords[1]);
                        skipped_point = false;
                    }
                    else {
                        ctx.lineTo(coords[0], coords[1]);
                    }
                }

                if (!d.domain.integer_points) {
                    // Draw point at end point of domain, since this will not happen
                    // unless the width of the domain happens to be a multiple of
                    // delta
                    var point = d.function(end);
                    var coords = this.canvasCoords(point[0], point[1]);
                    ctx.lineTo(coords[0], coords[1])
                }

                break;

            case LINE:
                var point = grid_obj.data.point;
                var direction = grid_obj.data.direction;

                // Calculate the real coordinates that map to the corners of the
                // canvas
                var top_left = thisGrid.fromCanvasCoords(0, 0);
                var bottom_right = this.fromCanvasCoords(canvas.width,
                                                         canvas.height);

                var line_points = [];

                // If the line is not vertical then we can convert it to
                // y=mx + c form
                if (direction[0] !== 0) {
                    var m = direction[1] / direction[0];
                    var c = point[1] - point[0] * m;

                    var y0 = m * top_left[0] + c;
                    var y1 = m * bottom_right[0] + c;

                    // Work out the points on the line at the left and right
                    // sides of the canvas
                    line_points.push(this.canvasCoords(top_left[0], y0));
                    line_points.push(this.canvasCoords(bottom_right[0], y1));
                }
                else {
                    // If the line is vertical then just check if the x-coord
                    // will be shown on the screen
                    var x = this.canvasCoords(point[0], 0)[0];
                    if (0 <= x && x <= canvas.width) {
                        line_points.push([x, 0]);
                        line_points.push([x, canvas.height]);
                    }
                }

                // Draw the line
                for (var i=0; i<line_points.length; i++) {
                    ctx.lineTo(line_points[i][0], line_points[i][1]);
                }

                break;

            case TEXT:
                ctx.textBaseline = "middle";
                ctx.textAlign = grid_obj.data.alignment;
                ctx.font = grid_obj.style.font_size + "px " + grid_obj.style.font;

                var coords = this.canvasCoords(grid_obj.data.x, grid_obj.data.y);
                ctx.fillText(grid_obj.data.text, coords[0], coords[1]);
                break;

            case IMAGE:
                var d = grid_obj.data;

                var tl_coords = this.canvasCoords(d.x, d.y);
                var br_coords = this.canvasCoords(d.x + d.width, d.y - d.height);

                var width = br_coords[0] - tl_coords[0];
                var height = br_coords[1] - tl_coords[1];

                if (typeof(d.rotation) !== "undefined") {
                    ctx.save();
                    ctx.translate(tl_coords[0] + 0.5*width, tl_coords[1] + 0.5*height);
                    ctx.rotate(-d.rotation);
                    ctx.drawImage(d.image, -0.5*width, -0.5*height, width, height);
                    ctx.restore();
                }
                else {
                    ctx.drawImage(d.image, tl_coords[0], tl_coords[1], width, height);
                }
                break;
        }

        if (grid_obj.style.fill) {
            ctx.fill();
        }
        else {
            ctx.lineWidth = grid_obj.style.line_width;
            ctx.stroke();
        }
    }

    /*
     * Create a JS object to represent a grid object (e.g. shape, function),
     * add it to the list of grid objects, and draw it.
     */
    this.addObject = function(type, data, style) {
        if (grid_object_types.indexOf(type) < 0) {
            throw "Invalid type '" + type + "'";
            return;
        }

        var obj = {};
        obj.type = type;
        obj.data = data;
        obj.style = {};

        // Copy default styles in
        for (var i in this.settings.default_style) {
            obj.style[i] = this.settings.default_style[i];
        }

        // Copy custom styles in
        for (var i in style) {
            obj.style[i] = style[i];
        }

        // Add the object to the list
        var id = current_id;
        grid_objects[id] = obj;
        current_id++;

        this.setZCoord(id, 0);

        // Draw the object
        this.redraw();

        // Return the ID so that the user can remove/edit this object
        return id;
    }

    /*
     * Remove the object with the specified object ID
     */
    this.removeObject = function(id) {
        var o = grid_objects[id];
        if (!o) {
            throw "No object found with ID '" + id + "'";
        }

        this.unsetZCoord(id);
        delete grid_objects[id];
    }

    /*
     * Remove all objects
     */
    this.removeAll = function() {
        for (var i in grid_objects) {
            this.removeObject(i);
        }
    }

    /*
     * Return the grid object with the given object ID
     */
    this.getObject = function(id) {
        var o = grid_objects[id];
        if (!o) {
            throw "No object found with ID '" + id + "'";
        }
        return o;
    }

    /*
     * Add a shape that is represented by an array of points to connect with
     * straight lines
     */
    this.addShape = function(points, style) {
        return this.addObject(SHAPE, {"points": points}, style);
    }

    /*
     * Add an n-sided regular polygon centered at the point provided,
     * where radius is the distance from each vertex to the center.
     * Rotation is the anti-clockwise rotation in radians.
     */
    this.addPolygon = function(n, cx, cy, radius, rotation, style) {
        var points = [];

        for (var i=0; i<=n; i++) {
            var angle = rotation + 2 * Math.PI * i / n;
            var x = radius * Math.cos(angle) + cx;
            var y = radius * Math.sin(angle) + cy;

            points.push([x, y]);
        }

        return this.addShape(points, style);
    }

    this.addCircle = function(x, y, radius, style) {
        return this.addObject(CIRCLE, {"x": x, "y": y, "radius": radius}, style);
    }

    /*
     * Similar to addFunction() below, but where f is a parametric function,
     * i.e. (x, y) = f(t)
     */
     this.addParametricFunction = function(f, domain, style) {
        // Validate interval
        if (domain.interval.length !== 2) {
            throw "Invalid interval - must be an array of length 2";
        }

        if (domain.interval[0] > domain.interval[1]) {
            throw "Invalid interval - start point must be smaller than end point";
        }

        return this.addObject(FUNCTION, {"function": f, "domain": domain}, style);
     }

    /*
     * Add the function f over the specified domain (2-array of end points)
     */
    this.addFunction = function(f, domain, style) {
        // Create a parametric version of this function so that we can use
        // one method to draw both regular and parametric functions
        var para_func = function(x) {
            return [x, f(x)];
        };

        return this.addParametricFunction(para_func, domain, style);
    }

    /*
     * Add a straight line in parametric form
     */
    this.addLine = function(point, direction, style) {
        if (direction[0] === 0 && direction[1] === 0) {
            throw "Invalid direction";
        }

        return this.addObject(LINE, {"point": point, "direction": direction},
                              style);
    }

    /*
     * Add a tangent line to the function with the given object ID at (x, f(x))
     * (or (f(x)[0], f(x)[1]) if f is a parametric function)
     */
    this.addTangent = function(function_id, x, style) {
        var obj = this.getObject(function_id);
        if (obj.type !== FUNCTION) {
            throw "Wrong object type";
        }

        var f = obj.data.function;
        var p1 = f(x);
        var p2 = f(x + 0.0001);

        var direction = [p2[0] - p1[0], p2[1] - p1[1]];
        return this.addLine(p1, direction, style);
    }

    /*
     * Add a label at the specifed coordinates. alignment is one of the strings
     * in the text_alignments array
     */
    this.addText = function(text, x, y, alignment, style) {
        alignment = alignment.toLowerCase();

        if (text_alignments.indexOf(alignment) < 0) {
            throw "Invalid alignment - must be one of " + text_alignments.join(", ");
        }

        return this.addObject(TEXT, {"text": text, "x": x, "y": y,
                                     "alignment": alignment}, style);
    }

    this.addImage = function(image, x, y, width, height, rotation) {
        return this.addObject(IMAGE, {"image": image, "x": x, "y": y,
                                      "width": width, "height": height,
                                      "rotation": rotation});
    }

    /*
     * Remove an object from the z_coords array and obj_to_z object
     */
    this.unsetZCoord = function(id) {
        var i = 0;
        while (z_coords[i][0] != obj_to_z[id]) {
            i++;
        }

        // Remove just the object if there are other objects at this level,
        // or otherwise delete the whole level
        if (z_coords[i][1].length > 1) {
            var idx = z_coords[i][1].indexOf(id);
            z_coords[i][1].splice(idx, 1);
        }
        else {
            z_coords.splice(i, 1);
        }

        delete obj_to_z[id];
    }

    /*
     * Set the z-coordinate of an object by inserting the object ID into the
     * appropriate array of IDs in z_coords and updating obj_to_z
     */
    this.setZCoord = function(id, z) {

        // Remove this object from another z-level if is it in one
        if (id in obj_to_z) {
            this.unsetZCoord(id);
        }

        // Find the correct position to insert at
        var i = -1;
        do {
            i++;
        } while (i < z_coords.length && z_coords[i][0] < z);

        // Insert a new level if necessary
        if (i >= z_coords.length || z_coords[i][0] > z) {
            z_coords.splice(i, 0, [z, []]);
        }

        z_coords[i][1].push(id);
        obj_to_z[id] = z;
    }

    this.drawGridlines = function() {
        ctx.beginPath();

        // Calculate the real coordinates that map to the corners of the
        // canvas
        var top_left = thisGrid.fromCanvasCoords(0, 0);
        var bottom_right = this.fromCanvasCoords(canvas.width, canvas.height);

        for (var i in this.settings.grid_lines) {
            ctx.strokeStyle = this.settings.grid_lines[i].colour;
            ctx.lineWidth = this.settings.grid_lines[i].width;

            var spacing = this.settings.grid_lines[i].spacing;

            // Draw vertical lines
            var start_x = spacing * Math.ceil(top_left[0] / spacing);
            var end_x = spacing * Math.floor(bottom_right[0] / spacing);

            ctx.beginPath();

            for (var x=start_x; x<=end_x; x+=spacing) {
                // y coord does not matter here
                var coords = this.canvasCoords(x, 0);

                ctx.moveTo(coords[0], 0);
                ctx.lineTo(coords[0], canvas.height);
            }

            // Draw horizontal lines
            var end_y = spacing * Math.ceil(top_left[1] / spacing);
            var start_y = spacing * Math.floor(bottom_right[1] / spacing);

            for (var y=start_y; y<=end_y; y+=spacing) {
                var coords = this.canvasCoords(0, y);
                ctx.moveTo(0, coords[1]);
                ctx.lineTo(canvas.width, coords[1]);
            }

            ctx.stroke();
        }

     }

     /*
      * Draw the lines x=0 and y=0
      */
    this.drawAxes = function() {
        var origin = this.canvasCoords(0, 0);
        var x = origin[0];
        var y = origin[1];

        if ((x >= 0 && x <= canvas.width) || (y >=0 && y <= canvas.height)) {
            ctx.beginPath();
            ctx.strokeStyle = this.settings.axes.colour;
            ctx.lineWidth = this.settings.axes.width;
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
     }

    /*
     * Redraw axes, gridline, shapes and functions
     */
    this.redraw = function() {
        ctx.fillStyle = this.settings.background_colour;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.strokeStyle = this.settings.border.colour;
        ctx.lineWidth = this.settings.border.width;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        this.drawGridlines();

        if (this.settings.axes.enabled) {
            this.drawAxes();
        }

        // Draw object in order of increasing z coordinate
        for (var i=0; i<z_coords.length; i++) {
            for (var j=0; j<z_coords[i][1].length; j++) {
                var id = grid_objects[z_coords[i][1][j]];
                this.drawObject(id);
            }
        }
    }

    /*
     * Adjust the translation by the vector <u, v>
     */
    this.translate = function(u, v) {
        if (!this.settings.scroll.enabled) {
            return;
        }

        if (this.settings.scroll.callback) {
            if (!this.settings.scroll.callback(u, v)) {
                return;
            }
        }

        var w = new Matrix([[u], [v]]);
        var vector = zoom_matrix.multiply(w);
        translation = translation.add(vector);


        this.redraw();
     }

    /*
     * Adjust the zoom matrix and translation. zoom_factor is percentage
     * increase in zoom, e.g. 1 means increase zoom by 100%
     * The translation is adjusted so that the point that maps to
     * (mouse_x, mouse_y) remains the same.
     */
    this.zoom = function(zoom_factor, mouse_x, mouse_y) {
        if (!this.settings.zoom.enabled) {
            return;
        }

        if (this.settings.zoom.callback) {
            if (!this.settings.zoom.callback(zoom_factor, mouse_x, mouse_y)) {
                return;
            }
        }

        // Find the point that maps to the centre of the canvas
        var q_coords = this.fromCanvasCoords(canvas.width / 2, canvas.height / 2);
        var q = new Matrix([[q_coords[0]], [q_coords[1]]]);

        // Find point that maps onto the zoom point
        var w_coords = this.fromCanvasCoords(mouse_x, mouse_y);
        var w = new Matrix([[w_coords[0]], [w_coords[1]]]);
        var new_zoom = zoom_matrix.scale(zoom_factor + 1);

        // Adjust translation so that the mouse stays at the same position
        // in the grid
        var zoom_difference = new_zoom.subtract(zoom_matrix);
        translation = translation.subtract(zoom_difference.multiply(w));
        zoom_matrix = new_zoom;

        // Adjust grid line spacing if necessary
        zoom_counter *= (zoom_factor + 1);
        if (zoom_counter >= 2 || zoom_counter <= 0.5) {
            var factor = (zoom_counter >= 2 ? 0.5 : 2);

            for (var i in this.settings.grid_lines) {
                this.settings.grid_lines[i].spacing *= factor;
            }

            // Reset zoom counter
            zoom_counter *= factor;
        }


        this.redraw();
    }

    /*
     * Run an animation by calling drawing_function(n) where n ranges from
     * n0 to n1, increasing linearly by 'speed' units per second.
     */
    this.runAnimation = function(drawing_function, n0, n1, speed) {
        var n = n0;
        var then = Date.now();

        var thisGrid = this;

        var loop = function() {
            var now = Date.now();
            var dt = (now - then) / 1000;
            then = now;

            n += speed * dt;

            if (n <= n1) {
                drawing_function(n);
                thisGrid.redraw();
                window.requestAnimationFrame(loop);
            }
            else {
                drawing_function(n1);
                thisGrid.redraw();
            }
        }
        window.requestAnimationFrame(loop);
    }

    // Set up event listeners for scrolling and zooming
    var mouse_state = {
       "down": false,
       "prevPos": null
    };
    // Need to store a reference to this object so that we can access it
    // inside the event handlers
    var thisGrid = this;
    canvas.addEventListener("mousedown", function(e) {
       mouse_state.down = true;
    });
    canvas.addEventListener("mouseup", function(e) {
       mouse_state.down = false;
    });
    canvas.addEventListener("mouseleave", function(e) {
       mouse_state.down = false;
    });
    canvas.addEventListener("mousemove", function(e) {
        var x = e.offsetX;
        var y = e.offsetY;

        if (mouse_state.down && mouse_state.prevPos) {
            var dx = x - mouse_state.prevPos[0];
            var dy = y - mouse_state.prevPos[1];

            var current_pos = thisGrid.fromCanvasCoords(x, y);
            var prev_pos = thisGrid.fromCanvasCoords(mouse_state.prevPos[0],
                                                    mouse_state.prevPos[1]);
            thisGrid.translate(current_pos[0] - prev_pos[0],
                               current_pos[1] - prev_pos[1]);

        }
        mouse_state.prevPos = [x, y];
    });
    canvas.addEventListener("mousewheel", function(e) {
        e.preventDefault();
        var x = e.offsetX;
        var y = e.offsetY;

        zoom_factor = 0.001 * e.wheelDelta;

        thisGrid.zoom(zoom_factor, x, y);
    });

    this.redraw();
}