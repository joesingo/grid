function Grid(cnv) {

    var canvas = cnv;
    var ctx = canvas.getContext("2d");

    var settings = {
        // The step size to go up in when plotting functions
        "delta": 0.02,

        "shapes": {
            "colour": "#ee0155",
            "width": 2
        },

        "gridLines": {
            "major": {
                "spacing": 1,
                "colour": "black",
                "width": 1
            },
            "minor": {
                "spacing": 0.5,
                "colour": "gray",
                "width": 1
            }
        },

        "axes": {
            "colour": "black",
            "width": 2
        }
    }

    // Constants to represent the different types of grid object
    const SHAPE = "shape";
    const FUNCTION = "function";
    var grid_object_types = [SHAPE, FUNCTION];

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

    /*
     * Convert real coordinates to canvas coordinates
     */
    this.canvasCoords = function(x, y) {
        var p = new Matrix([[x], [y]]);
        var new_point = zoom_matrix.multiply(p).add(translation);

        var coords = [new_point.entries[0][0], new_point.entries[1][0]];

        return [coords[0] + 0.5 * canvas.width, -coords[1] + 0.5*canvas.height]
    }

    /*
     * Convert canvas coordinates to real coordinates
     */
    this.fromCanvasCoords = function(x, y) {
        x -= 0.5 * canvas.width;
        y = -(y - 0.5*canvas.height);

        var p = new Matrix([[x], [y]]);
        var new_point = zoom_matrix.inverse().multiply(p.add(translation.scale(-1)));

        var coords = [new_point.entries[0][0], new_point.entries[1][0]];

        return [coords[0], coords[1]];
    }

    /*
     * Draw a grid object onto the canvas
     */
    this.drawObject = function(grid_obj) {
        ctx.strokeStyle = grid_obj.colour;
        ctx.lineWidth = grid_obj.line_width;

        ctx.beginPath();

        switch (grid_obj.type) {
            case "shape":
                // Draw a shape by drawing lines connecting the points in
                // the points array
                var points = grid_obj.data.points;
                for (var i=0; i<points.length; i++) {
                    var coords = this.canvasCoords(points[i][0], points[i][1]);
                    ctx.lineTo(coords[0], coords[1]);
                }
                break;

            case "function":
                // Draw a parametric function by stepping through the domain
                // and drawing a line connecting each point
                var d = grid_obj.data;
                for (var t=d.domain[0]; t<=d.domain[1]; t+=settings.delta) {
                    var point = d.function(t);
                    var coords = this.canvasCoords(point[0], point[1]);
                    ctx.lineTo(coords[0], coords[1]);
                }
                break;
        }

        ctx.stroke();
    }

    /*
     * Create a JS object to represent a grid object (e.g. shape, function),
     * add it to the list of grid objects, and draw it.
     */
    this.addObject = function(type, data, colour, line_width) {
        if (grid_object_types.indexOf(type) < 0) {
            throw "Invalid type '" + type + "'";
            return;
        }

        var obj = {};
        obj.type = type;
        obj.data = data;
        obj.colour = colour || settings.shapes.colour;
        obj.line_width = line_width || settings.shapes.width;

        // Add the objet to the list
        var id = current_id;
        grid_objects[id] = obj;
        current_id++;

        // Draw the object
        this.drawObject(obj);

        // Return the ID so that the user can remove/edit this object
        return id;
    }

    /*
     * Remove the object with the specified object ID
     */
    this.removeObject = function(id) {
        delete grid_objects[id];
        this.redraw();
    }

    /*
     * Return the grid object with the given object ID
     */
    this.getObject = function(id) {
        return grid_objects[id];
    }

    /*
     * Add a shape that is represented by an array of points to connect with
     * straight lines
     */
    this.addShape = function(points, colour, width) {
        return this.addObject(SHAPE, {"points": points}, colour, width);
    }

    /*
     * Add an n-sided regular polygon centered at the point provided,
     * where radius is the distance from each vertex to the center.
     * Rotation is the anti-clockwise rotation in radians.
     */
    this.addPolygon = function(n, cx, cy, radius, rotation, colour, width) {
        var points = [];

        for (var i=0; i<=n; i++) {
            var angle = rotation + 2 * Math.PI * i / n;
            var x = radius * Math.cos(angle) + cx;
            var y = radius * Math.sin(angle) + cy;

            points.push([x, y]);
        }

        return this.addShape(points, colour, width);
    }

    /*
     * Similar to addFunction() below, but where f is a parametric function,
     * i.e. (x, y) = f(t)
     */
     this.addParametricFunction = function(f, domain, colour, width) {
        return this.addObject(FUNCTION, {"function": f, "domain": domain}, colour,
                       width);
     }

    /*
     * Add the function f over the specified domain (2-array of end points)
     */
    this.addFunction = function(f, domain, colour, width) {
        // Create a parametric version of this function so that we can use
        // one method to draw both regular and parametric functions
        var para_func = function(x) {
            return [x, f(x)];
        };

        return this.addParametricFunction(para_func, domain, colour, width);
    }

    this.drawGridlines = function() {
        ctx.beginPath();

        // Calculate the real coordinates that map to the corners of the
        // canvas
        var top_left = thisGrid.fromCanvasCoords(0, 0);
        var bottom_right = this.fromCanvasCoords(canvas.width, canvas.height);

        for (var i in settings.gridLines) {
            ctx.strokeStyle = settings.gridLines[i].colour;
            ctx.lineWidth = settings.gridLines[i].width;

            var spacing = settings.gridLines[i].spacing;

            // Draw vertical lines
            var start_x = Math.ceil(top_left[0] / spacing);
            var end_x = Math.floor(bottom_right[0] / spacing);

            for (var x=start_x; x<=end_x; x+=spacing) {
                // y coord does not matter here
                var coords = this.canvasCoords(x, 0);

                ctx.moveTo(coords[0], 0);
                ctx.lineTo(coords[0], canvas.height);
            }

            // Draw horizontal lines
            var end_y = Math.ceil(top_left[1] / spacing);
            var start_y = Math.floor(bottom_right[1] / spacing);

            for (var y=start_y; y<=end_y; y+=spacing) {
                var coords = this.canvasCoords(0, y);
                ctx.moveTo(0, coords[1]);
                ctx.lineTo(canvas.width, coords[1]);
            }
        }

        ctx.stroke();
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
            ctx.strokeStyle = settings.axes.colour;
            ctx.lineWidth = settings.axes.width;
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        this.drawGridlines();
        this.drawAxes();

        for (var i in grid_objects) {
            this.drawObject(grid_objects[i]);
        }
    }

    /*
     * Adjust the translation by the vector <u, v>
     */
    this.translate = function(u, v) {
       var w = new Matrix([[u], [v]]);
       var vector = zoom_matrix.multiply(w);
       translation = translation.add(vector);

       this.redraw();
     }

    /*
     * Adjust the zoom matrix and translation. zoom_factor is percentage
     * increase in zoom, e.g. 2 means 200% zoom.
     * The translation is adjusted so that the point that maps to
     * (mouse_x, mouse_y) remains the same.
     */
    this.zoom = function(zoom_factor, mouse_x, mouse_y) {
       // Find the point that maps to the centre of the canvas
       var q_coords = this.fromCanvasCoords(canvas.width / 2, canvas.height / 2);
       var q = new Matrix([[q_coords[0]], [q_coords[1]]]);

       // Find point that maps onto the zoom point
       var w_coords = this.fromCanvasCoords(mouse_x, mouse_y);
       var w = new Matrix([[w_coords[0]], [w_coords[1]]]);
       var new_zoom = zoom_matrix.scale(zoom_factor + 1);

       // Adjust translation so that the mouse stays at the same position
       // in the grid
       var zoom_difference = new_zoom.add(zoom_matrix.scale(-1));
       translation = translation.add(zoom_difference.multiply(w).scale(-1));
       zoom_matrix = new_zoom;

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
       var x = e.offsetX;
       var y = e.offsetY;

       zoom_factor = 0.001 * e.wheelDelta;

       thisGrid.zoom(zoom_factor, x, y);
    });

    this.redraw();
}