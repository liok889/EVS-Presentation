/* =============================================
 * UI Utils
 * (C) Khairi Reda
 * =============================================
 */

// Button
// =======
function Button(svg, x, y, w, h, img, hoverImg, callback)
{
	this.button = svg.append("image")
		.attr("x", x).attr("y", y)
		.attr("width", w).attr("height", h)
		.attr("xlink:href", img);

	this.x = x; this.y = y;
	this.img = img;
	this.hoverImg = hoverImg;		
	
	// register callbacks
	(function(thisButton) 
	{
		thisButton.button
			.on("mouseover", function() {
				if (thisButton.hoverImg) {
					d3.select(this).attr("xlink:href", thisButton.hoverImg);
				}
			})
			.on("mouseout", function() {
				if (thisButton.hoverImg) {
					d3.select(this).attr("xlink:href", thisButton.img);
				}
			})
			.on("mousedown", function() {
				// offset the button by two pixels to simulate a push down
				d3.select(this)
					.attr("x", thisButton.x + 1).attr("y", thisButton.y+1);

				// add a callback to window so we can return button offset to normal on mouse up
				d3.select(window).on("mouseup.buttonRelease", function() {
					thisButton.button.attr("x", thisButton.x).attr("y", thisButton.y);
					d3.select(window).on("mouseup.buttonRelease", null);
				});
			})
			.on("click", function() {
				if (thisButton.callback) {
					thisButton.callback();
				}
			});

	})(this);
	this.callback = callback;
}

Button.prototype.setCallback = function(callback) {
	this.callback = callback;
}

// Inline button
// ==============
var RESIZE_CURSOR = false;
function InlineButton(svg, x, y, w, h, img)
{
	this.dragging = false;
	this.group = svg.append("g");
	this.image = this.group.append("image")
		.attr("xlink:href", img)
		.attr("x", x).attr("y", y)
		.attr("width", w).attr("height", h)
		.style("visibility", "hidden");

	this.button = (function(x, y, w, h, button) 
	{
		var selection = button.group.selectAll("rect.inlineButton").data([button]);
		selection.enter().append("rect")
			.attr("x", x).attr("y", y)
			.attr("width", w).attr("height", h)
			.attr("class", "inlineButton")
			.style("fill", "white").style("stroke", "none")
			.style("fill-opacity", "0.0")
			.on("mousemove", function() {
				button.image.style("visibility", "visible")
			})
			.on("mouseout", function() {
				if (!button.dragging) {
					button.image.style("visibility", "hidden");
				}
			});
		return selection;
	})(x, y, w, h, this);
}

InlineButton.prototype.dragOn = function()
{
	this.dragging = true;
	if (RESIZE_CURSOR) {
		d3.select('body').style('cursor', 'nwse-resize');
	}
}

InlineButton.prototype.dragOff = function()
{
	this.dragging = false;
	this.image.style("visibility", "hidden");
	if (RESIZE_CURSOR) {
		d3.select('body').style('cursor', '');
	}
}

InlineButton.prototype.on = function(event, callback)
{
	(function(button, thisObject, event, callback) 
	{
		if (event == 'resize')
		{
			button.on("mousedown", function() {
				thisObject.dragOn();
				thisObject.lastMouse = d3.mouse(button.node());
				d3.select(window).on("mousemove.resizeInlineButton", function()
				{
					var mouse = d3.mouse(button.node());
					var dMouse = [
						mouse[0]-thisObject.lastMouse[0],
						mouse[1]-thisObject.lastMouse[1]
					];
					thisObject.lastMouse = mouse;
					callback.call(thisObject, dMouse);
				});

				d3.select(window).on("mouseup.resizeInlineButton", function()
				{
					thisObject.dragOff();
					d3.select(window)
						.on("mousemove.resizeInlineButton", null)
						.on("mouseup.resizeInlineButton", null);
				});
			})
		}
		else
		{
			button.on(event, function(d) 
			{
				var thisContext = this;
				callback.call(thisContext, d);
			});
		}
	})(this.button, this, event, callback);
	return this;
}

InlineButton.prototype.attr = function(attribute, value)
{
	this.image.attr(attribute, value);
	this.button.attr(attribute, value);
	return this;
}

InlineButton.prototype.node = function()
{
	return this.button.node();
}

InlineButton.prototype.visible = function(vis)
{
	this.button.style("visibility", vis ? 'visible' : 'hidden');
}

// Misc UI functions
// ==================
function putNodeOnTop(node)
{
	var n = jQuery(node);
	n.parent().append(n.detach());
}

// returns the SVG node starting from an element within
function getSVG(element)
{
	if (element.nodeName.toUpperCase() === "SVG") {
		return element;
	}
	else {
		return getSVG(element.parentElement);
	}
}

function emptyOrNullString(str)
{
	if (!str) return ""; else return str;
}

function getParentElement(element, parent, className)
{
	if (
		(element.nodeName.toUpperCase() === parent.toUpperCase())
		&& (!className || className.toUpperCase() === (emptyOrNullString(d3.select(element).attr("class"))).toUpperCase())
	) {
		return element;
	}
	else {
		return getParentElement(element.parentElement, parent, className);
	}
}


// WebGL Shader
// ============
function Shader(gl, vertexSource, fragmentSource, attributes, uniforms)
{
	// shader source
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexSource);
	gl.attachShader(shaderProgram, fragmentSource);
	gl.linkProgram(shaderProgram);

	// if creating the program failed, alert,
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	else
	{
		var attribMap = {}, uniformMap = {};
		for (var i=0; i<attributes.length; i++) {

			var attribLocation = gl.getAttribLocation(shaderProgram, attributes[i]);
			attribMap[ attributes[i] ] = attribLocation;
		}
		
		for (var i=0; i<uniforms.length; i++) {
			var uniformLocation = gl.getUniformLocation(shaderProgram, uniforms[i]);
			uniformMap[ uniforms[i] ] = uniformLocation;
		}
		
		// store attribute/uniform list/maps
		this.attribList = attributes;
		this.uniformList = uniforms;

		this.attribMap = attribMap;
		this.uniformMap = uniformMap;

		// reference to shader program
		this.shaderProgram = shaderProgram;

		// and WebGL context
		this.gl = gl;
	}
}

Shader.prototype.isOK = function()
{
	return this.shaderProgram !== undefined;
}
Shader.prototype.useShaderNoBind = function()
{
	var gl = this.gl;
	gl.useProgram(this.shaderProgram);	
}
Shader.prototype.useShader = function()
{
	var gl = this.gl;
	gl.useProgram(this.shaderProgram);

	// enable attributes
	for (var i=0; i<this.attribList.length; i++) {
		gl.enableVertexAttribArray(this.attribMap[this.attribList[i]]);
	}
}
Shader.prototype.unuseShader = function()
{
	var gl = this.gl;

	// enable attributes
	for (var i=0; i<this.attribList.length; i++) {
		gl.disableVertexAttribArray(this.attribMap[this.attribList[i]]);
	}
}

Shader.prototype.attrib = function(attribName)
{
	return this.attribMap[attribName];
}

Shader.prototype.uniform = function(uniformName)
{
	return this.uniformMap[uniformName];
}

Shader.prototype.attrib2buffer = function(attribName, vertexBuffer, size)
{
	this.gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	this.gl.vertexAttribPointer(this.attribMap[attribName], size, gl.FLOAT, false, 0, 0);
}

// FrameBuffer
// ===========
function FrameBuffer(gl, bufferSize)
{
	this.gl = gl;
	this.fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
	this.fb.width = bufferSize[0];
	this.fb.height = bufferSize[1];

	// texture
	this.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, this.fb.width, this.fb.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

	// render buffer
	this.renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.fb.width, this.fb.height);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);


	// unbind
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

FrameBuffer.prototype.bind = function()
{
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb);
}
FrameBuffer.prototype.unbind = function()
{
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}
FrameBuffer.prototype.getW = function() {
	return this.fb.width;
}
FrameBuffer.prototype.getH = function() {
	return this.fb.height;
}
FrameBuffer.prototype.readBufferContents = function()
{
	this.bind();
	var gl = this.gl;
	var canRead = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);
	if (canRead) 
	{
		if (!this.pixels) {
			this.pixels = new Uint8Array(this.getW() * this.getH() * 3);
		}

		// bind the framebuffer
		this.bind();

		// read the pixels
		gl.readPixels(0, 0, this.getW(), this.getH(), gl.RGB, gl.UNSIGNED_BYTE, this.pixels)

		// Unbind the framebuffer
		this.unbind();
	}

	this.unbind();
	if (canRead) {
		return this.pixels
	}
	else
	{
		return null;
	}
}
