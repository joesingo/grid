var WRAPPER = document.getElementById("grid-test-wrapper");
var CANVAS_SIZE = {"width": 400, "height": 300};

function newApp(title, description, callback) {
    var h2 = document.createElement("h2");
    h2.innerText = title;
    var p = document.createElement("p");
    p.innerText = description;
    var canvas = document.createElement("canvas")
    canvas.width = CANVAS_SIZE.width;
    canvas.height = CANVAS_SIZE.height;
    var div = document.createElement("div");
    div.appendChild(h2);
    div.appendChild(p);
    div.appendChild(canvas);
    WRAPPER.appendChild(div);

    var grid = new Grid(canvas);
    grid.zoom(-1 + 0.125, 0.5 * canvas.width, 0.5 * canvas.height);
    console.log(grid);
    callback(canvas, grid);
}

var apps = [
    {
        "title": "Simple function plotting",
        "description": "y = xsin(x)",
        "callback": function(canvas, grid) {
            var func = grid.addFunction(
                function(x) {
                    return x * Math.sin(x);
                },
                {"interval": [-10 * Math.PI, 10 * Math.PI]},
                {"colour": "darkgreen", "line_width": 5}
            );
        }
    },

    {
        "title": "Parametric functions",
        "description": "x = tsin(t), y = tcos(t)",
        "callback": function(canvas, grid) {
            var func = grid.addParametricFunction(
                function(t) {
                    var radius = t;
                    var angle = t;
                    return [t * Math.sin(t), t * Math.cos(t)]
                },
                {"interval": [0, 50 * Math.PI]},
                {"colour": "darkred", "line_width": 5}
            );
        }
    },

    {
        "title": "Simple polygons",
        "description": "regular polygons are easy to draw",
        "callback": function(canvas, grid) {
            grid.addPolygon(4, 0, 2.5, 10, (1/4) * Math.PI,
                            {"colour": "green", "fill": true,
                             "line_width": 10});
            grid.addPolygon(3, 0, 0, 5, 0.5 * Math.PI,
                            {"colour": "darkblue", "fill": true});
            grid.addPolygon(5, 5, 5, 2, (1/5) * Math.PI,
                            {"colour": "red", "fill": true});
        }
    },

    {
        "title": "Images and text",
        "description": "Images and text are also supported",
        "callback": function(canvas, grid) {
            var img = document.createElement("img");
            img.src = "https://www.popsci.com/sites/popsci.com/files/styles/1000_1x_/public/images/2016/04/bluemarble.jpg?itok=08uHXinW";

            img.onload = function() {
                grid.addImage(img, -7.5, 7.5, 15, 15, 0);
            };

            grid.addText("This is the Earth from space", 0, 10, "center");
        }
    },

    {
        "title": "Animations",
        "description": "you can create animations",
        "callback": function(canvas, grid) {
            var shape = null;
            var drawing_func = function(rotation) {
                if (shape !== null) {
                    grid.removeObject(shape);
                }
                shape = grid.addPolygon(4, 0, 0, 10, rotation,
                                        {"colour": "red", "fill": true})
            };
            var animation_length = 5;  // seconds
            var animate = function() {
                var speed = 2 * Math.PI / animation_length;
                grid.runAnimation(drawing_func, 0, 2 * Math.PI, speed);
            }
            animate();
            window.setInterval(animate, 1000 * animation_length);
        }
    },

    {
        "title": "Tangent lines",
        "description": "you can add tangent lines to a function",
        "callback": function(canvas, grid) {
            var line_width = 5;
            var domain = {"interval": [0, 2 * Math.PI]}
            var domain_size = domain.interval[1] - domain.interval[0];
            var func = function(t) {
                var k = 10;
                var r = 10;
                var a = 1;

                // Get a point on a circle
                var p = [r * Math.sin(t), r * Math.cos(t)];

                // Work out amount to wobble it by
                var wobble = a * Math.sin(k * t);

                return [
                    p[0] + wobble * Math.sin(t),
                    p[1] + wobble * Math.cos(t)
                ]
            };
            var func_id = grid.addParametricFunction(
                func, domain,
                {"colour": "black", "line_width": line_width}
            );

            var tangent = null;
            var point = null;
            var drawing_func = function(t) {
                if (tangent !== null) {
                    grid.removeObject(tangent);
                }
                if (point !== null) {
                    grid.removeObject(point);
                }

                tangent = grid.addTangent(func_id, t,
                                          {"colour": "red",
                                           "line_width": line_width});
                var point_coords = func(t);
                point = grid.addCircle(point_coords[0], point_coords[1], 0.5,
                                       {"colour": "blue", "fill": true});
            };
            var animation_length = 16; // seconds
            var animate = function() {
                var speed = domain_size / animation_length;
                grid.runAnimation(drawing_func, domain.interval[0],
                                  domain.interval[1], speed);
            };

            animate();
            window.setInterval(animate, 1000 * animation_length);
        }
    },

]

for (var i=0; i<apps.length; i++) {
    var app = apps[i];
    newApp(app.title, app.description, app.callback);
}
