# grid.js
grid.js small JavaScript library for drawing shapes and mathematical functions in a coordinate system.

The grid can be scrolled by clicking and dragging, and zoomed by scrolling the mouse wheel.

# Usage
To use `grid.js`, you create a Grid object, passing a canvas as a parameter. For example:
```javascript
    var canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 600;

    var grid = new Grid(canvas);
```

Adding objects to the grid is done by calling various methods, e.g. `addShape()`, `addFunction()` etc... Each of these methods returns an *object ID* that can then be used as a handle to remove or edit the object using `removeObject()` or `getObject()`.

The methods to add object to the grid take a style object as their final parameter, but default values will be used if this is not provided. The style object may have the following fields:

* `colour`: The colour in hex format (defaults to a pinkish red)
* `line_width`: The line width in pixels (defaults to 2px)
* `fill`: Boolean for whether to fill in the object or just draw outline (defaults to false)

## Shapes ##
To add a shape, use `grid.addShape(point, style)`. A shape is represented as an array of points, where each points is an array containing 2 coordinates. For example, to add a triangle:
```javascript
var points = [
    [0, 0], [2, 0], [1, 1]
];
var triangle = grid.addShape(points);
```

To add a regular polygon, use `grid.addPolygon(sides, center_x, center_y, radius, rotation, style)`. The rotation is specifed as an anti-clockwise angle in radians.

## Functions ##
To draw a function, there are two methods: `grid.addFunction(func, domain, style)`, and `grid.addParametricFunction(func, domain, style)`.

Currently only interval domains are supported. `domain` should be an array of the form `[a, b]` where `a` is the left point of the interval and `b` is the right point.

In the case of `addFunction()`, `func` is a function that returns a number given a number between `a` and `b` as an argument.

For `addParametricFunction()`, `func` should return an array `[x, y]` given a number between `a` and `b`.

For example, adding a sine wave:
```javascript
var sine = grid.addFunction(
    function(x) {
        return Math.sin(x);
    },
    [-2 * Math.PI, 2 * Math.PI]
);
```

Adding a circle:
```javascript
var circle = grid.addParametricFunction(
    function(t) {
        return [Math.cos(t), Math.sin(t)];
    },
    [0, 2 * Math.PI]
);
```

**Note:** When using `addFunction()` the function is converted to a parametric function internally, so be aware of this when using `getObject()` to edit a function added using `addFunction()`.

## Lines ##
A straight line can be added using `grid.addLine(point, direction, style)`. Here `point` is an array `[u, v]` that is a point one the line, and `direction` is an array `[f, g]` that describes the direction of the line. The line will stretch infinitely - to draw a line segment use `addShape()` instead.

To add a tangent line to a function, there is `addTangent(funcion_id, x, style)`. Here `function_id` is the object ID returned by `addFunction()` or `addParametricFunction()`. The line drawn will be tangent to the function at the point `(x, f(x))`, or `(f(x)[0], f(x)[1])` if the function is parametric.

For example, from the previous examples:

```javascript
var tangent1 = grid.addTangent(sin, Math.PI / 4);
var tangent2 = grid.addTangent(circle, 0);
```

## Editing and removing objects ##
Removing an object is done with `grid.removeObject(object_id)`.

An object can be edited by first retrieving the object using `grid.getObject(object_id)`, and then redrawing the grid with `grid.redraw()`.

The object returned from `getObject()` has the following fields:

* `style`: The style JS object for this object

* `data`: This stores the actual info about the object, and the fields in here depend on the type of object.

    * **Shapes:**
      The only field here is `points`, which is the same array passed to `addShape()` when the shape is created.

      Note that when using `addPolygon()`, the object is converted to a shape internally - this means that currently there is no way to edit the centre/radius/rotation after creating it. To edit a polygon you must first remove it with `removeObject()` and then add a new one with the changes made.

    * **Functions:**
      Here `data` contains `domain` and `function`.

      `domain` is the same array passed to `addFunction()` and `addParametricFunction()`.

      `function` is the function passed to `addParametricFunction()`. Note that when using `addFunction()` the function is converted internally to a parametric function. See the following example for editing a non-parametric function:

      ```javascript
      var sin = grid.addFunction(Math.sin, [-Math.PI, Math.PI]);
      var obj = grid.getObject(sin);
      obj.data.function = function(x) {
          return [x, Math.cos(x)];
      };
      grid.redraw();
      ```

    * **Lines:**
      Here the available fields are `point` and `direction` which are exactly the same as in `addLine()`.

## Animations ##
Animations can be run with `runAnimation(drawing_func, n0, n1, speed)`. `n0` and `n1` are the start and end points for the parameter `n`, which increases linearly by `speed` untits per second. The function `drawing_func` is called each frame with `n` passed as an argument.

Here is an example that draws a tangent line rotating round a circle:

```javascript
var circle = grid.addParametricFunction(
    function(t) {
        return [Math.cos(t), Math.sin(t)];
    },
    [0, 2 * Math.PI]
);

var tangent = null;
grid.runAnimation(
    function(n) {
        if (tangent !== null) {
            grid.removeObject(tangent);
        }

        tangent = grid.addTangent(circle, n);
    },
    0, 2 * Math.PI, Math.PI
);
```

## Helper methods ##
`grid.js` is not very comprehensive, so for most applications there will probably be things you want to do that are not possible using just the methods described above. You can of course draw directly onto the canvas yourself, and the following methods are available to facilitate this:

* `canvasCoords(x, y)` returns an array containing the canvas coordinates the correspond to the point `(x, y).

* `fromCanvasCoords(x, y)` is the inverse of `canvasCoords()` - it returns the coordinates corresponding to a point (x, y) in canvas coordinates.

* `redraw()` clears the canvas and then redraws the border, grid lines, coordinate axes, and all objects that have been added.

* `translate(u, v)` scrolls the grid `u` units right and `v` units up.

* `zoom(zoom_factor, x, y)` zooms the grid by an amount described by `zoom_factor` about the point `(x, y)`. `zoom_factor` is the percentage increase in zoom level - e.g. 1 means increase zoom by 100%, 0.5 means increase zoom by 50% etc...

  `(x, y)` is the 'center' of the zoom - this means that the point `(x, y)` will map to the same canvas coordinates after the zoom.