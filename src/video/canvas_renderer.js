/*
 * MelonJS Game Engine
 * Copyright (C) 2011 - 2014 Olivier Biot, Jason Oster, Aaron McLeod
 * http://www.melonjs.org
 *
 */

(function () {

    /**
     * The canvas renderer object
     * There is no constructor function for me.CanvasRenderer
     * @namespace me.CanvasRenderer
     * @memberOf me
     */
    me.CanvasRenderer = (function () {
        var api = {},
        canvas = null,
        context = null,
        doubleBuffering = null,
        backBufferCanvas = null,
        backBufferContext2D = null,
        gameHeightZoom = 0,
        gameWidthZoom = 0;

        /**
         * initializes the canvas renderer, creating the requried contexts
         * @name init
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Canvas} canvas - the html canvas tag to draw to on screen.
         * @param {Number} game_width - the width of the canvas without scaling
         * @param {Number} game_height - the height of the canvas without scaling
         * @param {Boolean} double_buffering - whether to enable double buffering.
         * @param {Number} game_width_zoom - The actual width of the canvas with scaling applied
         * @param {Number} game_height_zoom - The actual height of the canvas with scaling applied
         */
        api.init = function (c, game_width, game_height, double_buffering, game_width_zoom, game_height_zoom) {
            canvas = c;
            context = this.getContext2d(canvas);
            doubleBuffering = double_buffering;

            // create the back buffer if we use double buffering
            if (doubleBuffering) {
                backBufferCanvas = me.video.createCanvas(game_width, game_height, false);
                backBufferContext2D = this.getContext2d(backBufferCanvas);
            }
            else {
                backBufferCanvas = canvas;
                backBufferContext2D = context;
            }

            gameWidthZoom = game_width_zoom;
            gameHeightZoom = game_height_zoom;

            return this;
        };

        api.applyRGBFilter = function (object, effect, option) {
            //create a output canvas using the given canvas or image size
            var _context = api.getContext2d(me.video.createCanvas(object.width, object.height, false));
            // get the pixels array of the give parameter
            var imgpix = me.utils.getPixels(object);
            // pointer to the pixels data
            var pix = imgpix.data;

            // apply selected effect
            var i, n;
            switch (effect) {
                case "b&w":
                    for (i = 0, n = pix.length; i < n; i += 4) {
                        var grayscale = (3 * pix[i] + 4 * pix[i + 1] + pix[i + 2]) >>> 3;
                        pix[i] = grayscale; // red
                        pix[i + 1] = grayscale; // green
                        pix[i + 2] = grayscale; // blue
                    }
                    break;

                case "brightness":
                    // make sure it's between 0.0 and 1.0
                    var brightness = Math.abs(option).clamp(0.0, 1.0);
                    for (i = 0, n = pix.length; i < n; i += 4) {

                        pix[i] *= brightness; // red
                        pix[i + 1] *= brightness; // green
                        pix[i + 2] *= brightness; // blue
                    }
                    break;

                case "transparent":
                    var refColor = me.pool.pull("me.Color").parseHex(option);
                    var pixel = me.pool.pull("me.Color");
                    for (i = 0, n = pix.length; i < n; i += 4) {
                        pixel.setColor(pix[i], pix[i + 1], pix[i + 2]);
                        if (pixel.equals(refColor)) {
                            pix[i + 3] = 0;
                        }
                    }
                    me.pool.push(refColor);
                    me.pool.push(pixel);

                    break;


                default:
                    return null;
            }

            // put our modified image back in the new filtered canvas
            _context.putImageData(imgpix, 0, 0);

            // return it
            return _context;
        };

        /**
         * render the main framebuffer on screen
         * @name blitSurface
         * @memberOf me.CanvasRenderer
         * @function
         */
        api.blitSurface = function () {
            if (doubleBuffering) {
                /** @ignore */
                api.blitSurface = function () {
                    //FPS.update();
                    context.drawImage(
                        backBufferCanvas, 0, 0,
                        backBufferCanvas.width, backBufferCanvas.height, 0,
                        0, gameWidthZoom, gameHeightZoom
                    );

                };
            }
            else {
                // "empty" function, as we directly render stuff on "context2D"
                /** @ignore */
                api.blitSurface = function () {
                };
            }
            api.blitSurface();
        };

        /**
         * Clear the specified context with the given color
         * @name clearSurface
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Context2d} canvas contest. Optional, will default to system context.
         * @param {String} color a CSS color string
         */
        api.clearSurface = function (ctx, col) {
            if (ctx === null) {
                ctx = backBufferContext2D;
            }
            var _canvas = ctx.canvas;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = col;
            ctx.fillRect(0, 0, _canvas.width, _canvas.height);
            ctx.restore();
        };

        /**
         * Draw a line from the given point to the destination point.
         * @name drawLine
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} startX start x position
         * @param {Number} startY start y position
         * @param {Number} endX end x position
         * @param {Number} endY end y position
         * @param {String} color to draw the line
         * @param {Number} line width
         */
        api.drawLine = function (startX, startY, endX, endY, color, width) {
            backBufferContext2D.lineWidth = width;
            backBufferContext2D.strokeStyle = color;
            backBufferContext2D.beginPath();
            backBufferContext2D.translate(startX, startY);
            backBufferContext2D.moveTo(0, 0);
            backBufferContext2D.lineTo(endX, endY);
            backBufferContext2D.stroke();
            backBufferContext2D.closePath();
        };

        /**
         * Draw an image using the canvas api
         * @name drawImage
         * @memberOf me.CanvasRenderer
         * @function
         * @param {image} image html image element
         * @param {Number} sx value, from the source image.
         * @param {Number} sy value, from the source image.
         * @param {Number} sw the width of the image to be drawn
         * @param {Number} sh the height of the image to be drawn
         * @param {Number} dx the x position to draw the image at on the screen
         * @param {Number} dy the y position to draw the image at on the screen
         * @param {Number} dw the width value to draw the image at on the screen
         * @param {Number} dh the height value to draw the image at on the screen
         * Can be used in three ways:
         * me.CanvasRenderer.drawImage(image, dx, dy);
         * me.CanvasRenderer.drawImage(image, dx, dy, dw, dh);
         * me.CanvasRenderer.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
         * dx, dy, dw, dh being the destination target & dimensions. sx, sy, sw, sh being the position & dimensions to take from the image
         */
        api.drawImage = function () {
            backBufferContext2D.drawImage.apply(backBufferContext2D, arguments);
        };

        /**
         * Fill an arc at the specified coordinates with given radius, start and end points
         * @name fillArc
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x position
         * @param {Number} y position
         * @param {Number} radiusX to draw
         * @param {Number} radiusY to draw
         * @param {Number} start degrees in radians
         * @param {Number} end degrees in radians
         * @param {String} color to draw as
         * @param {Boolean} in anti-clockwise, defaults to false
         */
        api.fillArc = function (x, y, radiusX, radiusY, start, end, color, antiClockwise) {
            if (antiClockwise === null) {
                antiClockwise = false;
            }
            backBufferContext2D.save();
            backBufferContext2D.beginPath();
            backBufferContext2D.translate(x - radiusX, y - radiusY);
            backBufferContext2D.scale(radiusX, radiusY);
            backBufferContext2D.arc(1, 1, 1, start, end, antiClockwise);
            backBufferContext2D.restore();
            backBufferContext2D.fillStyle = color;
            backBufferContext2D.fill();
        };

        /**
         * Draw a filled rectangle at the specified coordinates with a given color
         * @name fillRect
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x position
         * @param {Number} y position
         * @param {Number} width to draw
         * @param {Number} height to draw
         * @param {String} css color for the rectangle
         */
        api.fillRect = function (x, y, width, height, color) {
            backBufferContext2D.fillStyle = color;
            backBufferContext2D.fillRect(x, y, width, height);
        };

        /**
         * return a reference to the screen canvas
         * @name getScreenCanvas
         * @memberOf me.CanvasRenderer
         * @function
         * @return {Canvas}
         */
        api.getScreenCanvas = function () {
            return canvas;
        };

        /**
         * return a reference to the screen canvas corresponding 2d Context<br>
         * (will return buffered context if double buffering is enabled, or a reference to the Screen Context)
         * @name getScreenContext
         * @memberOf me.CanvasRenderer
         * @function
         * @return {Context2d}
         */
        api.getScreenContext = function () {
            return context;
        };

        /**
         * Returns the 2D Context object of the given Canvas
         * `getContext` will also enable/disable antialiasing features based on global settings.
         * @name getContext2d
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Canvas} [canvas=canvas instance of the renderer]
         * @return {Context2d}
         */
        api.getContext2d = function (c) {
            if (typeof c === "undefined" || c === null) {
                throw new me.video.Error(
                    "You must pass a canvas element in order to create " +
                    "a 2d context"
                );
            }
            
            if (typeof c.getContext === "undefined") {
                throw new me.video.Error(
                    "Your browser does not support HTML5 canvas."
                );
            }
            
            var _context;
            if (navigator.isCocoonJS) {
                // cocoonJS specific extension
                _context = c.getContext("2d", {
                    "antialias" : me.sys.scalingInterpolation
                });
            }
            else {
                _context = c.getContext("2d");
            }
            if (!_context.canvas) {
                _context.canvas = c;
            }
            this.setImageSmoothing(_context, me.sys.scalingInterpolation);
            return _context;
        };

        api.getHeight = function () {
            return backBufferCanvas.height;
        };

        /**
         * return a reference to the system canvas
         * @name getCanvas
         * @memberOf me.CanvasRenderer
         * @function
         * @return {Canvas}
         */
        api.getCanvas = function () {
            return backBufferCanvas;
        };

        /**
         * return a reference to the system 2d Context
         * @name getContext
         * @memberOf me.CanvasRenderer
         * @function
         * @return {Context2d}
         */
        api.getContext = function () {
            return backBufferContext2D;
        };

        api.getWidth = function () {
            return backBufferCanvas.width;
        };

        /**
         * return the current global alpha
         * @name globalAlpha
         * @memberOf me.CanvasRenderer
         * @function
         * @return {Number}
         */
        api.globalAlpha = function () {
            return backBufferContext2D.globalAlpha;
        };

        /**
         * resets the canvas transform to identity
         * @name resetTransform
         * @memberOf me.CanvasRenderer
         * @function
         */
        api.resetTransform = function () {
            backBufferContext2D.setTransform(1, 0, 0, 1, 0, 0);
        };

        api.resize = function (scaleX, scaleY) {
            canvas.width = gameWidthZoom = backBufferCanvas.width * scaleX;
            canvas.height = gameHeightZoom = backBufferCanvas.height * scaleY;
            
            // adjust CSS style for High-DPI devices
            if (me.device.getPixelRatio() > 1) {
                canvas.style.width = (canvas.width / me.device.getPixelRatio()) + "px";
                canvas.style.height = (canvas.height / me.device.getPixelRatio()) + "px";
            }
            this.setImageSmoothing(context, me.sys.scalingInterpolation);
            this.blitSurface();
        };

        /**
         * restores the canvas context
         * @name restore
         * @memberOf me.CanvasRenderer
         * @function
         */
        api.restore = function () {
            backBufferContext2D.restore();
        };

        /**
         * rotates the canvas context
         * @name rotate
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} angle in radians
         */
        api.rotate = function (angle) {
            backBufferContext2D.rotate(angle);
        };

        /**
         * save the canvas context
         * @name save
         * @memberOf me.CanvasRenderer
         * @function
         */
        api.save = function () {
            backBufferContext2D.save();
        };

        /**
         * scales the canvas context
         * @name scale
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x
         * @param {Number} y
         */
        api.scale = function (x, y) {
            backBufferContext2D.scale(x, y);
        };

        api.setAlpha = function (enable) {
            backBufferContext2D.globalCompositeOperation = enable ? "source-over" : "copy";
        };

        /**
         * Sets the global alpha on the canvas context
         * @name setGlobalAlpha
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} alpha value. 0.0 to 1.0 values accepted.
         */
        api.setGlobalAlpha = function (a) {
            backBufferContext2D.globalAlpha = a;
        };

        /**
         * enable/disable image smoothing (scaling interpolation) for the specified 2d Context<br>
         * (!) this might not be supported by all browsers <br>
         * @name setImageSmoothing
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Context2d} context
         * @param {Boolean} [enable=false]
         */
        api.setImageSmoothing = function (context, enable) {
            me.agent.setPrefixed("imageSmoothingEnabled", enable === true, context);
        };

        /**
         * Fill an arc at the specified coordinates with given radius, start and end points
         * @name strokeArc
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x position
         * @param {Number} y position
         * @param {Number} radiusX to draw
         * @param {Number} radiusY to draw
         * @param {Number} start degrees in radians
         * @param {Number} end degrees in radians
         * @param {String} color to draw as
         * @param {Boolean} in anti-clockwise, defaults to false
         * @param {Number} lineWidth - the width of the line
         */
        api.strokeArc = function (x, y, radiusX, radiusY, start, end, color, antiClockwise, lineWidth) {
            if (antiClockwise === null) {
                antiClockwise = false;
            }
            backBufferContext2D.save();
            backBufferContext2D.beginPath();
            backBufferContext2D.translate(x - radiusX, y - radiusY);
            backBufferContext2D.scale(radiusX, radiusY);
            backBufferContext2D.arc(1, 1, 1, start, end, antiClockwise);
            backBufferContext2D.restore();
            backBufferContext2D.strokeStyle = color;
            backBufferContext2D.lineWidth = lineWidth;
            backBufferContext2D.stroke();
        };

        /**
         * Strokes a me.PolyShape on the screen with a specified color
         * @name strokePolyShape
         * @memberOf me.CanvasRenderer
         * @function
         * @param {me.PolyShape} polyShape the shape to draw
         * @param {String} color a color in css format.
         * @param {Number} width - the width of the line
         */
        api.strokePolyShape = function (poly, color, width) {
            this.translate(poly.pos.x, poly.pos.y);
            backBufferContext2D.strokeStyle = color;
            backBufferContext2D.beginPath();
            backBufferContext2D.moveTo(poly.points[0].x, poly.points[0].y);
            poly.points.forEach(function (point) {
                backBufferContext2D.lineTo(point.x, point.y);
                backBufferContext2D.moveTo(point.x, point.y);
            });
            if (poly.closed === true) {
                backBufferContext2D.lineTo(poly.points[0].x, poly.points[0].y);
            }
            backBufferContext2D.lineWidth = width;
            backBufferContext2D.stroke();
        };

        /**
         * Stroke a rectangle at the specified coordinates with a given color
         * @name strokeRect
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x position
         * @param {Number} y position
         * @param {Number} width to draw
         * @param {Number} height to draw
         * @param {String} css color for the rectangle
         * @param {Number} lineWidth - the width of the line
         */
        api.strokeRect = function (x, y, width, height, color, lineWidth) {
            backBufferContext2D.strokeStyle = color;
            backBufferContext2D.lineWidth = lineWidth;
            backBufferContext2D.strokeRect(x, y, width, height);
        };

        /**
         * transforms the context. Accepts any number of integer arguments
         * @name transform
         * @param {Number} a the m1,1 (m11) value in the matrix
         * @param {Number} b the m1,2 (m12) value in the matrix
         * @param {Number} c the m2,1 (m21) value in the matrix
         * @param {Number} d the m2,2 (m12) value in the matrix
         * @param {Number} e The delta x (dx) value in the matrix
         * @param {Number} f The delta x (dy) value in the matrix
         * @memberOf me.CanvasRenderer
         * @function
         */
        api.transform = function (a, b, c, d, e, f) {
            backBufferContext2D.transform(a, b, c, d, e, f);
        };

        /**
         * Translates the context to the given position
         * @name translate
         * @memberOf me.CanvasRenderer
         * @function
         * @param {Number} x
         * @param {Number} y
         */
        api.translate = function (x, y) {
            backBufferContext2D.translate(x, y);
        };

        return api;
    })();

})();
