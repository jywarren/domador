!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.domador=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

require('string.prototype.repeat');

var replacements = {
  '\\\\': '\\\\',
  '\\[': '\\[',
  '\\]': '\\]',
  '>': '\\>',
  '_': '\\_',
  '\\*': '\\*',
  '`': '\\`',
  '#': '\\#',
  '([0-9])\\.(\\s|$)': '$1\\.$2',
  '\u00a9': '(c)',
  '\u00ae': '(r)',
  '\u2122': '(tm)',
  '\u00a0': ' ',
  '\u00b7': '\\*',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2009': ' ',
  '\u2018': '\'',
  '\u2019': '\'',
  '\u201c': '"',
  '\u201d': '"',
  '\u2026': '...',
  '\u2013': '--',
  '\u2014': '---'
};
var replacers = Object.keys(replacements).reduce(replacer, {});
var rspaces = /^\s+|\s+$/g;
var rdisplay = /(display|visibility)\s*:\s*[a-z]+/gi;
var rhidden = /(none|hidden)\s*$/i;
var rheading = /^H([1-6])$/;
var shallowTags = [
  'APPLET', 'AREA', 'AUDIO', 'BUTTON', 'CANVAS', 'DATALIST', 'EMBED', 'HEAD', 'INPUT', 'MAP',
  'MENU', 'METER', 'NOFRAMES', 'NOSCRIPT', 'OBJECT', 'OPTGROUP', 'OPTION', 'PARAM', 'PROGRESS',
  'RP', 'RT', 'RUBY', 'SCRIPT', 'SELECT', 'STYLE', 'TEXTAREA', 'TITLE', 'VIDEO'
];
var paragraphTags = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'DIV', 'FIELDSET', 'FOOTER', 'HEADER', 'NAV', 'P', 'SECTION'
];
var windowContext = require('./virtualWindowContext');

function replacer (result, key) {
  result[key] = new RegExp(key, 'g'); return result;
}

function many (text, times) {
  return new Array(times + 1).join(text);
}

function padLeft (text, times) {
  return many(' ', times) + text;
}

function trim (text) {
  if (text.trim) {
    return text.trim();
  }
  return text.replace(rspaces, '');
}

function attr (el, prop, direct) {
  var proper = direct === void 0 || direct;
  if (proper || typeof el.getAttribute !== 'function') {
    return el[prop] || '';
  }
  return el.getAttribute(prop) || '';
}

function has (el, prop, direct) {
  var proper = direct === void 0 || direct;
  if (proper || typeof el.hasAttribute !== 'function') {
    return el.hasOwnProperty(prop);
  }
  return el.hasAttribute(prop);
}

function processPlainText (text, tagName) {
  var key;
  var block = paragraphTags.indexOf(tagName) !== -1 || tagName === 'BLOCKQUOTE';
  text = text.replace(/\n([ \t]*\n)+/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  for (key in replacements) {
    text = text.replace(replacers[key], replacements[key]);
  }
  text = text.replace(/(\s*)\\#/g, block ? removeUnnecessaryEscapes : '$1#');
  return text;

  function removeUnnecessaryEscapes (escaped, spaces, i) {
    return i ? spaces + '#' : escaped;
  }
}

function processCode (text) {
  return text.replace(/`/g, '\\`');
}

function outputMapper (fn, tagName) {
  return function bitProcessor (bit) {
    if (bit.marker) {
      return bit.marker;
    }
    if (!fn) {
      return bit.text;
    }
    return fn(bit.text, tagName);
  };
}

function noop () {}

function parse (html, options) {
  return new Domador(html, options).parse();
}

function Domador (html, options) {
  this.html = html || '';
  this.htmlIndex = 0;
  this.options = options || {};
  this.markers = this.options.markers ? this.options.markers.sort(asc) : [];
  this.windowContext = windowContext(this.options);
  this.atLeft = this.noTrailingWhitespace = this.atP = true;
  this.buffer = this.childBuffer = '';
  this.exceptions = [];
  this.order = 1;
  this.listDepth = 0;
  this.inCode = this.inPre = this.inOrderedList = false;
  this.last = null;
  this.left = '\n';
  this.links = [];
  this.linkMap = {};
  this.unhandled = {};
  if (this.options.absolute === void 0) { this.options.absolute = false; }
  if (this.options.fencing === void 0) { this.options.fencing = false; }
  if (this.options.fencinglanguage === void 0) { this.options.fencinglanguage = noop; }
  if (this.options.transform === void 0) { this.options.transform = noop; }
  function asc (a, b) { return a[0] - b[0]; }
}

Domador.prototype.append = function append (text) {
  if (this.last != null) {
    this.buffer += this.last;
  }
  this.childBuffer += text;
  return this.last = text;
};

Domador.prototype.br = function br () {
  this.append('  ' +  this.left);
  return this.atLeft = this.noTrailingWhitespace = true;
};

Domador.prototype.code = function code () {
  var old;
  old = this.inCode;
  this.inCode = true;
  return (function(_this) {
    return function after () {
      return _this.inCode = old;
    };
  })(this);
};

Domador.prototype.li = function li () {
  var result;
  result = this.inOrderedList ? (this.order++) + '. ' : '- ';
  result = padLeft(result, (this.listDepth - 1) * 2);
  return this.append(result);
};

Domador.prototype.td = function td (header) {
  this.noTrailingWhitespace = false;
  this.output(' ');
  this.childBuffer = '';
  this.noTrailingWhitespace = false;
  return function after () {
    var spaces = header ? 0 : Math.max(0, this.tableCols[this.tableCol++] - this.childBuffer.length);
    this.append(' '.repeat(spaces + 1) + '|');
    this.noTrailingWhitespace = true;
  };
};

Domador.prototype.ol = function ol () {
  var inOrderedList, order;
  if (this.listDepth === 0) {
    this.p();
  }
  inOrderedList = this.inOrderedList;
  order = this.order;
  this.inOrderedList = true;
  this.order = 1;
  this.listDepth++;
  return (function(_this) {
    return function after () {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

Domador.prototype.ul = function ul () {
  var inOrderedList, order;
  if (this.listDepth === 0) {
    this.p();
  }
  inOrderedList = this.inOrderedList;
  order = this.order;
  this.inOrderedList = false;
  this.order = 1;
  this.listDepth++;
  return (function(_this) {
    return function after () {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

Domador.prototype.output = function output (text) {
  if (!text) {
    return;
  }
  if (!this.inPre) {
    text = this.noTrailingWhitespace ? text.replace(/^[ \t\n]+/, '') : /^[ \t]*\n/.test(text) ? text.replace(/^[ \t\n]+/, '\n') : text.replace(/^[ \t]+/, ' ');
  }
  if (text === '') {
    return;
  }
  this.atP = /\n\n$/.test(text);
  this.atLeft = /\n$/.test(text);
  this.noTrailingWhitespace = /[ \t\n]$/.test(text);
  return this.append(text.replace(/\n/g, this.left));
};

Domador.prototype.outputLater = function outputLater (text) {
  return (function(self) {
    return function after () {
      return self.output(text);
    };
  })(this);
};

Domador.prototype.p = function p () {
  if (this.atP) {
    return;
  }
  if (this.startingBlockquote) {
    this.append('\n');
  } else {
    this.append(this.left);
  }
  if (!this.atLeft) {
    this.append(this.left);
    this.atLeft = true;
  }
  return this.noTrailingWhitespace = this.atP = true;
};

Domador.prototype.parse = function parse () {
  var container;
  var i;
  var link;
  var ref;
  this.buffer = '';
  if (!this.html) {
    return this.buffer;
  }
  if (typeof this.html === 'string') {
    container = this.windowContext.document.createElement('div');
    container.innerHTML = this.htmlLeft = this.html;
  } else {
    container = this.html;
    this.html = this.htmlLeft = container.innerHTML;
  }
  this.process(container);
  if (this.links.length) {
    while (this.lastElement.parentElement !== container && this.lastElement.tagName !== 'BLOCKQUOTE') {
      this.lastElement = this.lastElement.parentElement;
    }
    if (this.lastElement.tagName !== 'BLOCKQUOTE') {
      this.append('\n\n');
    }
    ref = this.links;
    for (i = 0; i < ref.length; i++) {
      link = ref[i];
      if (link) {
        this.append('[' + (i + 1) + ']: ' + link + '\n');
      }
    }
  }
  this.append('');
  this.buffer = this.buffer.replace(/\n{3,}/g, '\n\n');
  return this.buffer = trim(this.buffer);
};

Domador.prototype.pre = function pre () {
  var old;
  old = this.inPre;
  this.inPre = true;
  return (function(_this) {
    return function after () {
      return _this.inPre = old;
    };
  })(this);
};

Domador.prototype.htmlTag = function htmlTag (type) {
  this.output('<' + type + '>');
  return this.outputLater('</' + type + '>');
};

Domador.prototype.advanceHtmlIndex = function advanceHtmlIndex (token) {
  if (this.markers.length === 0) {
    return;
  }

  var re = new RegExp(token, 'ig');
  var match = re.exec(this.htmlLeft);
  if (!match) {
    return;
  }
  var diff = re.lastIndex;
  this.htmlIndex += diff;
  this.htmlLeft = this.htmlLeft.slice(diff);
};

Domador.prototype.insertMarkers = function insertMarkers () {
  while (this.markers.length && this.markers[0][0] <= this.htmlIndex) {
    this.append(this.markers.shift()[1]);
  }
};

Domador.prototype.interleaveMarkers = function interleaveMarkers (text) {
  var marker;
  var markerStart;
  var lastMarkerStart = 0;
  var bits = [];
  while (this.markers.length && this.markers[0][0] <= this.htmlIndex + text.length) {
    marker = this.markers.shift();
    markerStart = Math.max(0, marker[0] - this.htmlIndex);
    bits.push(
      { text: text.slice(lastMarkerStart, markerStart) },
      { marker: marker[1] }
    );
    lastMarkerStart = markerStart;
  }
  bits.push({ text: text.slice(lastMarkerStart) });
  return bits;
};

Domador.prototype.process = function process (el) {
  var after;
  var base;
  var href;
  var i;
  var ref;
  var suffix;
  var summary;
  var title;
  var frameSrc;
  var interleaved;

  if (!this.isVisible(el)) {
    return;
  }

  if (el.nodeType === this.windowContext.Node.TEXT_NODE) {
    if (el.nodeValue.replace(/\n/g, '').length === 0) {
      return;
    }
    interleaved = this.interleaveMarkers(el.nodeValue);
    if (this.inPre) {
      return this.output(interleaved.map(outputMapper()).join(''));
    }
    if (this.inCode) {
      return this.output(interleaved.map(outputMapper(processCode)).join(''));
    }
    return this.output(interleaved.map(outputMapper(processPlainText, el.parentElement && el.parentElement.tagName)).join(''));
  }

  if (el.nodeType !== this.windowContext.Node.ELEMENT_NODE) {
    return;
  }

  if (this.lastElement) { // i.e not the auto-inserted <div> wrapper
    this.insertMarkers();
    this.advanceHtmlIndex('<' + el.tagName);
    this.advanceHtmlIndex('>');

    var transformed = this.options.transform(el);
    if (transformed !== void 0) {
      return this.output(transformed);
    }
  }
  this.lastElement = el;

  if (shallowTags.indexOf(el.tagName) !== -1) {
    this.advanceHtmlIndex('\\/\\s?>');
    return;
  }

  switch (el.tagName) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
      this.p();
      this.output(many('#', parseInt(el.tagName.match(rheading)[1])) + ' ');
      break;
    case 'ADDRESS':
    case 'ARTICLE':
    case 'ASIDE':
    case 'DIV':
    case 'FIELDSET':
    case 'FOOTER':
    case 'HEADER':
    case 'NAV':
    case 'P':
    case 'SECTION':
      this.p();
      break;
    case 'BODY':
    case 'FORM':
      break;
    case 'DETAILS':
      this.p();
      if (!has(el, 'open', false)) {
        summary = el.getElementsByTagName('summary')[0];
        if (summary) {
          this.process(summary);
        }
        return;
      }
      break;
    case 'BR':
      this.br();
      break;
    case 'HR':
      this.p();
      this.output('---------');
      this.p();
      break;
    case 'CITE':
    case 'DFN':
    case 'EM':
    case 'I':
    case 'U':
    case 'VAR':
      this.output('_');
      this.noTrailingWhitespace = true;
      after = this.outputLater('_');
      break;
    case 'MARK':
      this.output('<mark>');
      after = this.outputLater('</mark>');
      break;
    case 'DT':
    case 'B':
    case 'STRONG':
      if (el.tagName === 'DT') {
        this.p();
      }
      this.output('**');
      this.noTrailingWhitespace = true;
      after = this.outputLater('**');
      break;
    case 'Q':
      this.output('"');
      this.noTrailingWhitespace = true;
      after = this.outputLater('"');
      break;
    case 'OL':
      after = this.ol();
      break;
    case 'UL':
      after = this.ul();
      break;
    case 'LI':
      this.replaceLeft('\n');
      this.li();
      break;
    case 'PRE':
      if (this.options.fencing) {
        this.append('\n\n');
        this.output(['```', '\n'].join(this.options.fencinglanguage(el) || ''));
        after = [this.pre(), this.outputLater('\n```')];
      } else {
        after = [this.pushLeft('    '), this.pre()];
      }
      break;
    case 'CODE':
    case 'SAMP':
      if (this.inPre) {
        break;
      }
      this.output('`');
      after = [this.code(), this.outputLater('`')];
      break;
    case 'BLOCKQUOTE':
    case 'DD':
      this.startingBlockquote = true;
      after = this.pushLeft('> ');
      this.startingBlockquote = false;
      break;
    case 'KBD':
      after = this.htmlTag('kbd');
      break;
    case 'A':
    case 'IMG':
      href = attr(el, el.tagName === 'A' ? 'href' : 'src', this.options.absolute);
      if (!href) {
        break;
      }
      title = attr(el, 'title');
      if (title) {
        href += ' "' + title + '"';
      }
      if (this.options.inline) {
        suffix = '(' + href + ')';
      } else {
        suffix = '[' + ((base = this.linkMap)[href] != null ? base[href] : base[href] = this.links.push(href)) + ']';
      }
      if (el.tagName === 'IMG') {
        this.output('![' + attr(el, 'alt') + ']' + suffix);
        return;
      }
      this.output('[');
      this.noTrailingWhitespace = true;
      after = this.outputLater(']' + suffix);
      break;
    case 'IFRAME':
      try {
        if ((ref = el.contentDocument) != null ? ref.documentElement : void 0) {
          this.process(el.contentDocument.documentElement);
        } else {
          frameSrc = attr(el, 'src');
          if (frameSrc && this.options.allowFrame && this.options.allowFrame(frameSrc)) {
            this.output('<iframe src="' + frameSrc + '"></iframe>');
          }
        }
      } catch (err) {
      }
      return;
  }

  after = this.tables(el) || after;

  for (i = 0; i < el.childNodes.length; i++) {
    this.process(el.childNodes[i]);
  }

  this.advanceHtmlIndex('<\\s?\\/\\s?' + el.tagName + '>');

  if (typeof after === 'function') {
    after = [after];
  }
  while (after && after.length) {
    after.shift().call(this);
  }
};

Domador.prototype.tables = function tables (el) {
  if (this.options.tables === false) {
    return;
  }

  var name = el.tagName;
  if (name === 'TABLE') {
    this.append('\n\n');
    this.tableCols = [];
    return;
  }
  if (name === 'THEAD') {
    return function after () {
      return this.append('|' + this.tableCols.reduce(reducer, '') + '\n');
      function reducer (all, thLength) {
        return all + '-'.repeat(thLength + 2) + '|';
      }
    };
  }
  if (name === 'TH') {
    return [function after () {
      this.tableCols.push(this.childBuffer.length);
    }, this.td(true)];
  }
  if (name === 'TR') {
    this.tableCol = 0;
    this.output('|');
    this.noTrailingWhitespace = true;
    return function after () {
      this.append('\n');
    };
  }
  if (name === 'TD') {
    return this.td();
  }
};

Domador.prototype.pushLeft = function pushLeft (text) {
  var old;
  old = this.left;
  this.left += text;
  if (this.atP) {
    this.append(text);
  } else {
    this.p();
  }
  return (function(_this) {
    return function() {
      _this.left = old;
      _this.atLeft = _this.atP = false;
      return _this.p();
    };
  })(this);
};

Domador.prototype.replaceLeft = function replaceLeft (text) {
  if (!this.atLeft) {
    this.append(this.left.replace(/[ ]{2,4}$/, text));
    return this.atLeft = this.noTrailingWhitespace = this.atP = true;
  } else if (this.last) {
    return this.last = this.last.replace(/[ ]{2,4}$/, text);
  }
};

Domador.prototype.isVisible = function isVisible (el) {
  var display;
  var i;
  var property;
  var visibility;
  var visible = true;
  var style = attr(el, 'style', false);
  var properties = style != null ? typeof style.match === 'function' ? style.match(rdisplay) : void 0 : void 0;
  if (properties != null) {
    for (i = 0; i < properties.length; i++) {
      property = properties[i];
      visible = !rhidden.test(property);
    }
  }
  if (visible && typeof this.windowContext.getComputedStyle === 'function') {
    try {
      style = this.windowContext.getComputedStyle(el, null);
      if (typeof (style != null ? style.getPropertyValue : void 0) === 'function') {
        display = style.getPropertyValue('display');
        visibility = style.getPropertyValue('visibility');
        visible = display !== 'none' && visibility !== 'hidden';
      }
    } catch (err) {
    }
  }
  return visible;
};

module.exports = parse;

},{"./virtualWindowContext":3,"string.prototype.repeat":2}],2:[function(require,module,exports){
/*! http://mths.be/repeat v0.2.0 by @mathias */
if (!String.prototype.repeat) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var repeat = function(count) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			// `ToInteger`
			var n = count ? Number(count) : 0;
			if (n != n) { // better `isNaN`
				n = 0;
			}
			// Account for out-of-bounds indices
			if (n < 0 || n == Infinity) {
				throw RangeError();
			}
			var result = '';
			while (n) {
				if (n % 2 == 1) {
					result += string;
				}
				if (n > 1) {
					string += string;
				}
				n >>= 1;
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'repeat', {
				'value': repeat,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.repeat = repeat;
		}
	}());
}

},{}],3:[function(require,module,exports){
'use strict';

if (!window.Node) {
  window.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3
  };
}

function windowContext () {
  return window;
}

module.exports = windowContext;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkb21hZG9yLmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIndpbmRvd0NvbnRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJ3N0cmluZy5wcm90b3R5cGUucmVwZWF0Jyk7XG5cbnZhciByZXBsYWNlbWVudHMgPSB7XG4gICdcXFxcXFxcXCc6ICdcXFxcXFxcXCcsXG4gICdcXFxcWyc6ICdcXFxcWycsXG4gICdcXFxcXSc6ICdcXFxcXScsXG4gICc+JzogJ1xcXFw+JyxcbiAgJ18nOiAnXFxcXF8nLFxuICAnXFxcXConOiAnXFxcXConLFxuICAnYCc6ICdcXFxcYCcsXG4gICcjJzogJ1xcXFwjJyxcbiAgJyhbMC05XSlcXFxcLihcXFxcc3wkKSc6ICckMVxcXFwuJDInLFxuICAnXFx1MDBhOSc6ICcoYyknLFxuICAnXFx1MDBhZSc6ICcociknLFxuICAnXFx1MjEyMic6ICcodG0pJyxcbiAgJ1xcdTAwYTAnOiAnICcsXG4gICdcXHUwMGI3JzogJ1xcXFwqJyxcbiAgJ1xcdTIwMDInOiAnICcsXG4gICdcXHUyMDAzJzogJyAnLFxuICAnXFx1MjAwOSc6ICcgJyxcbiAgJ1xcdTIwMTgnOiAnXFwnJyxcbiAgJ1xcdTIwMTknOiAnXFwnJyxcbiAgJ1xcdTIwMWMnOiAnXCInLFxuICAnXFx1MjAxZCc6ICdcIicsXG4gICdcXHUyMDI2JzogJy4uLicsXG4gICdcXHUyMDEzJzogJy0tJyxcbiAgJ1xcdTIwMTQnOiAnLS0tJ1xufTtcbnZhciByZXBsYWNlcnMgPSBPYmplY3Qua2V5cyhyZXBsYWNlbWVudHMpLnJlZHVjZShyZXBsYWNlciwge30pO1xudmFyIHJzcGFjZXMgPSAvXlxccyt8XFxzKyQvZztcbnZhciByZGlzcGxheSA9IC8oZGlzcGxheXx2aXNpYmlsaXR5KVxccyo6XFxzKlthLXpdKy9naTtcbnZhciByaGlkZGVuID0gLyhub25lfGhpZGRlbilcXHMqJC9pO1xudmFyIHJoZWFkaW5nID0gL15IKFsxLTZdKSQvO1xudmFyIHNoYWxsb3dUYWdzID0gW1xuICAnQVBQTEVUJywgJ0FSRUEnLCAnQVVESU8nLCAnQlVUVE9OJywgJ0NBTlZBUycsICdEQVRBTElTVCcsICdFTUJFRCcsICdIRUFEJywgJ0lOUFVUJywgJ01BUCcsXG4gICdNRU5VJywgJ01FVEVSJywgJ05PRlJBTUVTJywgJ05PU0NSSVBUJywgJ09CSkVDVCcsICdPUFRHUk9VUCcsICdPUFRJT04nLCAnUEFSQU0nLCAnUFJPR1JFU1MnLFxuICAnUlAnLCAnUlQnLCAnUlVCWScsICdTQ1JJUFQnLCAnU0VMRUNUJywgJ1NUWUxFJywgJ1RFWFRBUkVBJywgJ1RJVExFJywgJ1ZJREVPJ1xuXTtcbnZhciBwYXJhZ3JhcGhUYWdzID0gW1xuICAnQUREUkVTUycsICdBUlRJQ0xFJywgJ0FTSURFJywgJ0RJVicsICdGSUVMRFNFVCcsICdGT09URVInLCAnSEVBREVSJywgJ05BVicsICdQJywgJ1NFQ1RJT04nXG5dO1xudmFyIHdpbmRvd0NvbnRleHQgPSByZXF1aXJlKCcuL3ZpcnR1YWxXaW5kb3dDb250ZXh0Jyk7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyIChyZXN1bHQsIGtleSkge1xuICByZXN1bHRba2V5XSA9IG5ldyBSZWdFeHAoa2V5LCAnZycpOyByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtYW55ICh0ZXh0LCB0aW1lcykge1xuICByZXR1cm4gbmV3IEFycmF5KHRpbWVzICsgMSkuam9pbih0ZXh0KTtcbn1cblxuZnVuY3Rpb24gcGFkTGVmdCAodGV4dCwgdGltZXMpIHtcbiAgcmV0dXJuIG1hbnkoJyAnLCB0aW1lcykgKyB0ZXh0O1xufVxuXG5mdW5jdGlvbiB0cmltICh0ZXh0KSB7XG4gIGlmICh0ZXh0LnRyaW0pIHtcbiAgICByZXR1cm4gdGV4dC50cmltKCk7XG4gIH1cbiAgcmV0dXJuIHRleHQucmVwbGFjZShyc3BhY2VzLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGF0dHIgKGVsLCBwcm9wLCBkaXJlY3QpIHtcbiAgdmFyIHByb3BlciA9IGRpcmVjdCA9PT0gdm9pZCAwIHx8IGRpcmVjdDtcbiAgaWYgKHByb3BlciB8fCB0eXBlb2YgZWwuZ2V0QXR0cmlidXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVsW3Byb3BdIHx8ICcnO1xuICB9XG4gIHJldHVybiBlbC5nZXRBdHRyaWJ1dGUocHJvcCkgfHwgJyc7XG59XG5cbmZ1bmN0aW9uIGhhcyAoZWwsIHByb3AsIGRpcmVjdCkge1xuICB2YXIgcHJvcGVyID0gZGlyZWN0ID09PSB2b2lkIDAgfHwgZGlyZWN0O1xuICBpZiAocHJvcGVyIHx8IHR5cGVvZiBlbC5oYXNBdHRyaWJ1dGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZWwuaGFzT3duUHJvcGVydHkocHJvcCk7XG4gIH1cbiAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZShwcm9wKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1BsYWluVGV4dCAodGV4dCwgdGFnTmFtZSkge1xuICB2YXIga2V5O1xuICB2YXIgYmxvY2sgPSBwYXJhZ3JhcGhUYWdzLmluZGV4T2YodGFnTmFtZSkgIT09IC0xIHx8IHRhZ05hbWUgPT09ICdCTE9DS1FVT1RFJztcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxuKFsgXFx0XSpcXG4pKy9nLCAnXFxuJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcblsgXFx0XSsvZywgJ1xcbicpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9bIFxcdF0rL2csICcgJyk7XG4gIGZvciAoa2V5IGluIHJlcGxhY2VtZW50cykge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UocmVwbGFjZXJzW2tleV0sIHJlcGxhY2VtZW50c1trZXldKTtcbiAgfVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXFxzKilcXFxcIy9nLCBibG9jayA/IHJlbW92ZVVubmVjZXNzYXJ5RXNjYXBlcyA6ICckMSMnKTtcbiAgcmV0dXJuIHRleHQ7XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVW5uZWNlc3NhcnlFc2NhcGVzIChlc2NhcGVkLCBzcGFjZXMsIGkpIHtcbiAgICByZXR1cm4gaSA/IHNwYWNlcyArICcjJyA6IGVzY2FwZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0NvZGUgKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvYC9nLCAnXFxcXGAnKTtcbn1cblxuZnVuY3Rpb24gb3V0cHV0TWFwcGVyIChmbiwgdGFnTmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24gYml0UHJvY2Vzc29yIChiaXQpIHtcbiAgICBpZiAoYml0Lm1hcmtlcikge1xuICAgICAgcmV0dXJuIGJpdC5tYXJrZXI7XG4gICAgfVxuICAgIGlmICghZm4pIHtcbiAgICAgIHJldHVybiBiaXQudGV4dDtcbiAgICB9XG4gICAgcmV0dXJuIGZuKGJpdC50ZXh0LCB0YWdOYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9vcCAoKSB7fVxuXG5mdW5jdGlvbiBwYXJzZSAoaHRtbCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IERvbWFkb3IoaHRtbCwgb3B0aW9ucykucGFyc2UoKTtcbn1cblxuZnVuY3Rpb24gRG9tYWRvciAoaHRtbCwgb3B0aW9ucykge1xuICB0aGlzLmh0bWwgPSBodG1sIHx8ICcnO1xuICB0aGlzLmh0bWxJbmRleCA9IDA7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMubWFya2VycyA9IHRoaXMub3B0aW9ucy5tYXJrZXJzID8gdGhpcy5vcHRpb25zLm1hcmtlcnMuc29ydChhc2MpIDogW107XG4gIHRoaXMud2luZG93Q29udGV4dCA9IHdpbmRvd0NvbnRleHQodGhpcy5vcHRpb25zKTtcbiAgdGhpcy5hdExlZnQgPSB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdGhpcy5hdFAgPSB0cnVlO1xuICB0aGlzLmJ1ZmZlciA9IHRoaXMuY2hpbGRCdWZmZXIgPSAnJztcbiAgdGhpcy5leGNlcHRpb25zID0gW107XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCA9IDA7XG4gIHRoaXMuaW5Db2RlID0gdGhpcy5pblByZSA9IHRoaXMuaW5PcmRlcmVkTGlzdCA9IGZhbHNlO1xuICB0aGlzLmxhc3QgPSBudWxsO1xuICB0aGlzLmxlZnQgPSAnXFxuJztcbiAgdGhpcy5saW5rcyA9IFtdO1xuICB0aGlzLmxpbmtNYXAgPSB7fTtcbiAgdGhpcy51bmhhbmRsZWQgPSB7fTtcbiAgaWYgKHRoaXMub3B0aW9ucy5hYnNvbHV0ZSA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy5hYnNvbHV0ZSA9IGZhbHNlOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZmVuY2luZyA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy5mZW5jaW5nID0gZmFsc2U7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5mZW5jaW5nbGFuZ3VhZ2UgPT09IHZvaWQgMCkgeyB0aGlzLm9wdGlvbnMuZmVuY2luZ2xhbmd1YWdlID0gbm9vcDsgfVxuICBpZiAodGhpcy5vcHRpb25zLnRyYW5zZm9ybSA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy50cmFuc2Zvcm0gPSBub29wOyB9XG4gIGZ1bmN0aW9uIGFzYyAoYSwgYikgeyByZXR1cm4gYVswXSAtIGJbMF07IH1cbn1cblxuRG9tYWRvci5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gYXBwZW5kICh0ZXh0KSB7XG4gIGlmICh0aGlzLmxhc3QgIT0gbnVsbCkge1xuICAgIHRoaXMuYnVmZmVyICs9IHRoaXMubGFzdDtcbiAgfVxuICB0aGlzLmNoaWxkQnVmZmVyICs9IHRleHQ7XG4gIHJldHVybiB0aGlzLmxhc3QgPSB0ZXh0O1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuYnIgPSBmdW5jdGlvbiBiciAoKSB7XG4gIHRoaXMuYXBwZW5kKCcgICcgKyAgdGhpcy5sZWZ0KTtcbiAgcmV0dXJuIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5jb2RlID0gZnVuY3Rpb24gY29kZSAoKSB7XG4gIHZhciBvbGQ7XG4gIG9sZCA9IHRoaXMuaW5Db2RlO1xuICB0aGlzLmluQ29kZSA9IHRydWU7XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgcmV0dXJuIF90aGlzLmluQ29kZSA9IG9sZDtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmxpID0gZnVuY3Rpb24gbGkgKCkge1xuICB2YXIgcmVzdWx0O1xuICByZXN1bHQgPSB0aGlzLmluT3JkZXJlZExpc3QgPyAodGhpcy5vcmRlcisrKSArICcuICcgOiAnLSAnO1xuICByZXN1bHQgPSBwYWRMZWZ0KHJlc3VsdCwgKHRoaXMubGlzdERlcHRoIC0gMSkgKiAyKTtcbiAgcmV0dXJuIHRoaXMuYXBwZW5kKHJlc3VsdCk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS50ZCA9IGZ1bmN0aW9uIHRkIChoZWFkZXIpIHtcbiAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IGZhbHNlO1xuICB0aGlzLm91dHB1dCgnICcpO1xuICB0aGlzLmNoaWxkQnVmZmVyID0gJyc7XG4gIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSBmYWxzZTtcbiAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICB2YXIgc3BhY2VzID0gaGVhZGVyID8gMCA6IE1hdGgubWF4KDAsIHRoaXMudGFibGVDb2xzW3RoaXMudGFibGVDb2wrK10gLSB0aGlzLmNoaWxkQnVmZmVyLmxlbmd0aCk7XG4gICAgdGhpcy5hcHBlbmQoJyAnLnJlcGVhdChzcGFjZXMgKyAxKSArICd8Jyk7XG4gICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gIH07XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5vbCA9IGZ1bmN0aW9uIG9sICgpIHtcbiAgdmFyIGluT3JkZXJlZExpc3QsIG9yZGVyO1xuICBpZiAodGhpcy5saXN0RGVwdGggPT09IDApIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICBpbk9yZGVyZWRMaXN0ID0gdGhpcy5pbk9yZGVyZWRMaXN0O1xuICBvcmRlciA9IHRoaXMub3JkZXI7XG4gIHRoaXMuaW5PcmRlcmVkTGlzdCA9IHRydWU7XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCsrO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIF90aGlzLmluT3JkZXJlZExpc3QgPSBpbk9yZGVyZWRMaXN0O1xuICAgICAgX3RoaXMub3JkZXIgPSBvcmRlcjtcbiAgICAgIHJldHVybiBfdGhpcy5saXN0RGVwdGgtLTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnVsID0gZnVuY3Rpb24gdWwgKCkge1xuICB2YXIgaW5PcmRlcmVkTGlzdCwgb3JkZXI7XG4gIGlmICh0aGlzLmxpc3REZXB0aCA9PT0gMCkge1xuICAgIHRoaXMucCgpO1xuICB9XG4gIGluT3JkZXJlZExpc3QgPSB0aGlzLmluT3JkZXJlZExpc3Q7XG4gIG9yZGVyID0gdGhpcy5vcmRlcjtcbiAgdGhpcy5pbk9yZGVyZWRMaXN0ID0gZmFsc2U7XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCsrO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIF90aGlzLmluT3JkZXJlZExpc3QgPSBpbk9yZGVyZWRMaXN0O1xuICAgICAgX3RoaXMub3JkZXIgPSBvcmRlcjtcbiAgICAgIHJldHVybiBfdGhpcy5saXN0RGVwdGgtLTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm91dHB1dCA9IGZ1bmN0aW9uIG91dHB1dCAodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCF0aGlzLmluUHJlKSB7XG4gICAgdGV4dCA9IHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPyB0ZXh0LnJlcGxhY2UoL15bIFxcdFxcbl0rLywgJycpIDogL15bIFxcdF0qXFxuLy50ZXN0KHRleHQpID8gdGV4dC5yZXBsYWNlKC9eWyBcXHRcXG5dKy8sICdcXG4nKSA6IHRleHQucmVwbGFjZSgvXlsgXFx0XSsvLCAnICcpO1xuICB9XG4gIGlmICh0ZXh0ID09PSAnJykge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmF0UCA9IC9cXG5cXG4kLy50ZXN0KHRleHQpO1xuICB0aGlzLmF0TGVmdCA9IC9cXG4kLy50ZXN0KHRleHQpO1xuICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gL1sgXFx0XFxuXSQvLnRlc3QodGV4dCk7XG4gIHJldHVybiB0aGlzLmFwcGVuZCh0ZXh0LnJlcGxhY2UoL1xcbi9nLCB0aGlzLmxlZnQpKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm91dHB1dExhdGVyID0gZnVuY3Rpb24gb3V0cHV0TGF0ZXIgKHRleHQpIHtcbiAgcmV0dXJuIChmdW5jdGlvbihzZWxmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHJldHVybiBzZWxmLm91dHB1dCh0ZXh0KTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnAgPSBmdW5jdGlvbiBwICgpIHtcbiAgaWYgKHRoaXMuYXRQKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0aGlzLnN0YXJ0aW5nQmxvY2txdW90ZSkge1xuICAgIHRoaXMuYXBwZW5kKCdcXG4nKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLmxlZnQpO1xuICB9XG4gIGlmICghdGhpcy5hdExlZnQpIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLmxlZnQpO1xuICAgIHRoaXMuYXRMZWZ0ID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKCkge1xuICB2YXIgY29udGFpbmVyO1xuICB2YXIgaTtcbiAgdmFyIGxpbms7XG4gIHZhciByZWY7XG4gIHRoaXMuYnVmZmVyID0gJyc7XG4gIGlmICghdGhpcy5odG1sKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuICB9XG4gIGlmICh0eXBlb2YgdGhpcy5odG1sID09PSAnc3RyaW5nJykge1xuICAgIGNvbnRhaW5lciA9IHRoaXMud2luZG93Q29udGV4dC5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gdGhpcy5odG1sTGVmdCA9IHRoaXMuaHRtbDtcbiAgfSBlbHNlIHtcbiAgICBjb250YWluZXIgPSB0aGlzLmh0bWw7XG4gICAgdGhpcy5odG1sID0gdGhpcy5odG1sTGVmdCA9IGNvbnRhaW5lci5pbm5lckhUTUw7XG4gIH1cbiAgdGhpcy5wcm9jZXNzKGNvbnRhaW5lcik7XG4gIGlmICh0aGlzLmxpbmtzLmxlbmd0aCkge1xuICAgIHdoaWxlICh0aGlzLmxhc3RFbGVtZW50LnBhcmVudEVsZW1lbnQgIT09IGNvbnRhaW5lciAmJiB0aGlzLmxhc3RFbGVtZW50LnRhZ05hbWUgIT09ICdCTE9DS1FVT1RFJykge1xuICAgICAgdGhpcy5sYXN0RWxlbWVudCA9IHRoaXMubGFzdEVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICB9XG4gICAgaWYgKHRoaXMubGFzdEVsZW1lbnQudGFnTmFtZSAhPT0gJ0JMT0NLUVVPVEUnKSB7XG4gICAgICB0aGlzLmFwcGVuZCgnXFxuXFxuJyk7XG4gICAgfVxuICAgIHJlZiA9IHRoaXMubGlua3M7XG4gICAgZm9yIChpID0gMDsgaSA8IHJlZi5sZW5ndGg7IGkrKykge1xuICAgICAgbGluayA9IHJlZltpXTtcbiAgICAgIGlmIChsaW5rKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdbJyArIChpICsgMSkgKyAnXTogJyArIGxpbmsgKyAnXFxuJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHRoaXMuYXBwZW5kKCcnKTtcbiAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5yZXBsYWNlKC9cXG57Myx9L2csICdcXG5cXG4nKTtcbiAgcmV0dXJuIHRoaXMuYnVmZmVyID0gdHJpbSh0aGlzLmJ1ZmZlcik7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wcmUgPSBmdW5jdGlvbiBwcmUgKCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmluUHJlO1xuICB0aGlzLmluUHJlID0gdHJ1ZTtcbiAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMuaW5QcmUgPSBvbGQ7XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5odG1sVGFnID0gZnVuY3Rpb24gaHRtbFRhZyAodHlwZSkge1xuICB0aGlzLm91dHB1dCgnPCcgKyB0eXBlICsgJz4nKTtcbiAgcmV0dXJuIHRoaXMub3V0cHV0TGF0ZXIoJzwvJyArIHR5cGUgKyAnPicpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuYWR2YW5jZUh0bWxJbmRleCA9IGZ1bmN0aW9uIGFkdmFuY2VIdG1sSW5kZXggKHRva2VuKSB7XG4gIGlmICh0aGlzLm1hcmtlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHJlID0gbmV3IFJlZ0V4cCh0b2tlbiwgJ2lnJyk7XG4gIHZhciBtYXRjaCA9IHJlLmV4ZWModGhpcy5odG1sTGVmdCk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGRpZmYgPSByZS5sYXN0SW5kZXg7XG4gIHRoaXMuaHRtbEluZGV4ICs9IGRpZmY7XG4gIHRoaXMuaHRtbExlZnQgPSB0aGlzLmh0bWxMZWZ0LnNsaWNlKGRpZmYpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuaW5zZXJ0TWFya2VycyA9IGZ1bmN0aW9uIGluc2VydE1hcmtlcnMgKCkge1xuICB3aGlsZSAodGhpcy5tYXJrZXJzLmxlbmd0aCAmJiB0aGlzLm1hcmtlcnNbMF1bMF0gPD0gdGhpcy5odG1sSW5kZXgpIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLm1hcmtlcnMuc2hpZnQoKVsxXSk7XG4gIH1cbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmludGVybGVhdmVNYXJrZXJzID0gZnVuY3Rpb24gaW50ZXJsZWF2ZU1hcmtlcnMgKHRleHQpIHtcbiAgdmFyIG1hcmtlcjtcbiAgdmFyIG1hcmtlclN0YXJ0O1xuICB2YXIgbGFzdE1hcmtlclN0YXJ0ID0gMDtcbiAgdmFyIGJpdHMgPSBbXTtcbiAgd2hpbGUgKHRoaXMubWFya2Vycy5sZW5ndGggJiYgdGhpcy5tYXJrZXJzWzBdWzBdIDw9IHRoaXMuaHRtbEluZGV4ICsgdGV4dC5sZW5ndGgpIHtcbiAgICBtYXJrZXIgPSB0aGlzLm1hcmtlcnMuc2hpZnQoKTtcbiAgICBtYXJrZXJTdGFydCA9IE1hdGgubWF4KDAsIG1hcmtlclswXSAtIHRoaXMuaHRtbEluZGV4KTtcbiAgICBiaXRzLnB1c2goXG4gICAgICB7IHRleHQ6IHRleHQuc2xpY2UobGFzdE1hcmtlclN0YXJ0LCBtYXJrZXJTdGFydCkgfSxcbiAgICAgIHsgbWFya2VyOiBtYXJrZXJbMV0gfVxuICAgICk7XG4gICAgbGFzdE1hcmtlclN0YXJ0ID0gbWFya2VyU3RhcnQ7XG4gIH1cbiAgYml0cy5wdXNoKHsgdGV4dDogdGV4dC5zbGljZShsYXN0TWFya2VyU3RhcnQpIH0pO1xuICByZXR1cm4gYml0cztcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbiBwcm9jZXNzIChlbCkge1xuICB2YXIgYWZ0ZXI7XG4gIHZhciBiYXNlO1xuICB2YXIgaHJlZjtcbiAgdmFyIGk7XG4gIHZhciByZWY7XG4gIHZhciBzdWZmaXg7XG4gIHZhciBzdW1tYXJ5O1xuICB2YXIgdGl0bGU7XG4gIHZhciBmcmFtZVNyYztcbiAgdmFyIGludGVybGVhdmVkO1xuXG4gIGlmICghdGhpcy5pc1Zpc2libGUoZWwpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGVsLm5vZGVUeXBlID09PSB0aGlzLndpbmRvd0NvbnRleHQuTm9kZS5URVhUX05PREUpIHtcbiAgICBpZiAoZWwubm9kZVZhbHVlLnJlcGxhY2UoL1xcbi9nLCAnJykubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGludGVybGVhdmVkID0gdGhpcy5pbnRlcmxlYXZlTWFya2VycyhlbC5ub2RlVmFsdWUpO1xuICAgIGlmICh0aGlzLmluUHJlKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXQoaW50ZXJsZWF2ZWQubWFwKG91dHB1dE1hcHBlcigpKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmluQ29kZSkge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0KGludGVybGVhdmVkLm1hcChvdXRwdXRNYXBwZXIocHJvY2Vzc0NvZGUpKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm91dHB1dChpbnRlcmxlYXZlZC5tYXAob3V0cHV0TWFwcGVyKHByb2Nlc3NQbGFpblRleHQsIGVsLnBhcmVudEVsZW1lbnQgJiYgZWwucGFyZW50RWxlbWVudC50YWdOYW1lKSkuam9pbignJykpO1xuICB9XG5cbiAgaWYgKGVsLm5vZGVUeXBlICE9PSB0aGlzLndpbmRvd0NvbnRleHQuTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodGhpcy5sYXN0RWxlbWVudCkgeyAvLyBpLmUgbm90IHRoZSBhdXRvLWluc2VydGVkIDxkaXY+IHdyYXBwZXJcbiAgICB0aGlzLmluc2VydE1hcmtlcnMoKTtcbiAgICB0aGlzLmFkdmFuY2VIdG1sSW5kZXgoJzwnICsgZWwudGFnTmFtZSk7XG4gICAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc+Jyk7XG5cbiAgICB2YXIgdHJhbnNmb3JtZWQgPSB0aGlzLm9wdGlvbnMudHJhbnNmb3JtKGVsKTtcbiAgICBpZiAodHJhbnNmb3JtZWQgIT09IHZvaWQgMCkge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0KHRyYW5zZm9ybWVkKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5sYXN0RWxlbWVudCA9IGVsO1xuXG4gIGlmIChzaGFsbG93VGFncy5pbmRleE9mKGVsLnRhZ05hbWUpICE9PSAtMSkge1xuICAgIHRoaXMuYWR2YW5jZUh0bWxJbmRleCgnXFxcXC9cXFxccz8+Jyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChlbC50YWdOYW1lKSB7XG4gICAgY2FzZSAnSDEnOlxuICAgIGNhc2UgJ0gyJzpcbiAgICBjYXNlICdIMyc6XG4gICAgY2FzZSAnSDQnOlxuICAgIGNhc2UgJ0g1JzpcbiAgICBjYXNlICdINic6XG4gICAgICB0aGlzLnAoKTtcbiAgICAgIHRoaXMub3V0cHV0KG1hbnkoJyMnLCBwYXJzZUludChlbC50YWdOYW1lLm1hdGNoKHJoZWFkaW5nKVsxXSkpICsgJyAnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0FERFJFU1MnOlxuICAgIGNhc2UgJ0FSVElDTEUnOlxuICAgIGNhc2UgJ0FTSURFJzpcbiAgICBjYXNlICdESVYnOlxuICAgIGNhc2UgJ0ZJRUxEU0VUJzpcbiAgICBjYXNlICdGT09URVInOlxuICAgIGNhc2UgJ0hFQURFUic6XG4gICAgY2FzZSAnTkFWJzpcbiAgICBjYXNlICdQJzpcbiAgICBjYXNlICdTRUNUSU9OJzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQk9EWSc6XG4gICAgY2FzZSAnRk9STSc6XG4gICAgICBicmVhaztcbiAgICBjYXNlICdERVRBSUxTJzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgaWYgKCFoYXMoZWwsICdvcGVuJywgZmFsc2UpKSB7XG4gICAgICAgIHN1bW1hcnkgPSBlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc3VtbWFyeScpWzBdO1xuICAgICAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgICAgIHRoaXMucHJvY2VzcyhzdW1tYXJ5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdCUic6XG4gICAgICB0aGlzLmJyKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdIUic6XG4gICAgICB0aGlzLnAoKTtcbiAgICAgIHRoaXMub3V0cHV0KCctLS0tLS0tLS0nKTtcbiAgICAgIHRoaXMucCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQ0lURSc6XG4gICAgY2FzZSAnREZOJzpcbiAgICBjYXNlICdFTSc6XG4gICAgY2FzZSAnSSc6XG4gICAgY2FzZSAnVSc6XG4gICAgY2FzZSAnVkFSJzpcbiAgICAgIHRoaXMub3V0cHV0KCdfJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignXycpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnTUFSSyc6XG4gICAgICB0aGlzLm91dHB1dCgnPG1hcms+Jyk7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJzwvbWFyaz4nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0RUJzpcbiAgICBjYXNlICdCJzpcbiAgICBjYXNlICdTVFJPTkcnOlxuICAgICAgaWYgKGVsLnRhZ05hbWUgPT09ICdEVCcpIHtcbiAgICAgICAgdGhpcy5wKCk7XG4gICAgICB9XG4gICAgICB0aGlzLm91dHB1dCgnKionKTtcbiAgICAgIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xuICAgICAgYWZ0ZXIgPSB0aGlzLm91dHB1dExhdGVyKCcqKicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnUSc6XG4gICAgICB0aGlzLm91dHB1dCgnXCInKTtcbiAgICAgIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xuICAgICAgYWZ0ZXIgPSB0aGlzLm91dHB1dExhdGVyKCdcIicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnT0wnOlxuICAgICAgYWZ0ZXIgPSB0aGlzLm9sKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdVTCc6XG4gICAgICBhZnRlciA9IHRoaXMudWwoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0xJJzpcbiAgICAgIHRoaXMucmVwbGFjZUxlZnQoJ1xcbicpO1xuICAgICAgdGhpcy5saSgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnUFJFJzpcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZmVuY2luZykge1xuICAgICAgICB0aGlzLmFwcGVuZCgnXFxuXFxuJyk7XG4gICAgICAgIHRoaXMub3V0cHV0KFsnYGBgJywgJ1xcbiddLmpvaW4odGhpcy5vcHRpb25zLmZlbmNpbmdsYW5ndWFnZShlbCkgfHwgJycpKTtcbiAgICAgICAgYWZ0ZXIgPSBbdGhpcy5wcmUoKSwgdGhpcy5vdXRwdXRMYXRlcignXFxuYGBgJyldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWZ0ZXIgPSBbdGhpcy5wdXNoTGVmdCgnICAgICcpLCB0aGlzLnByZSgpXTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0NPREUnOlxuICAgIGNhc2UgJ1NBTVAnOlxuICAgICAgaWYgKHRoaXMuaW5QcmUpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLm91dHB1dCgnYCcpO1xuICAgICAgYWZ0ZXIgPSBbdGhpcy5jb2RlKCksIHRoaXMub3V0cHV0TGF0ZXIoJ2AnKV07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdCTE9DS1FVT1RFJzpcbiAgICBjYXNlICdERCc6XG4gICAgICB0aGlzLnN0YXJ0aW5nQmxvY2txdW90ZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMucHVzaExlZnQoJz4gJyk7XG4gICAgICB0aGlzLnN0YXJ0aW5nQmxvY2txdW90ZSA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnS0JEJzpcbiAgICAgIGFmdGVyID0gdGhpcy5odG1sVGFnKCdrYmQnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0EnOlxuICAgIGNhc2UgJ0lNRyc6XG4gICAgICBocmVmID0gYXR0cihlbCwgZWwudGFnTmFtZSA9PT0gJ0EnID8gJ2hyZWYnIDogJ3NyYycsIHRoaXMub3B0aW9ucy5hYnNvbHV0ZSk7XG4gICAgICBpZiAoIWhyZWYpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aXRsZSA9IGF0dHIoZWwsICd0aXRsZScpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGhyZWYgKz0gJyBcIicgKyB0aXRsZSArICdcIic7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmlubGluZSkge1xuICAgICAgICBzdWZmaXggPSAnKCcgKyBocmVmICsgJyknO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3VmZml4ID0gJ1snICsgKChiYXNlID0gdGhpcy5saW5rTWFwKVtocmVmXSAhPSBudWxsID8gYmFzZVtocmVmXSA6IGJhc2VbaHJlZl0gPSB0aGlzLmxpbmtzLnB1c2goaHJlZikpICsgJ10nO1xuICAgICAgfVxuICAgICAgaWYgKGVsLnRhZ05hbWUgPT09ICdJTUcnKSB7XG4gICAgICAgIHRoaXMub3V0cHV0KCchWycgKyBhdHRyKGVsLCAnYWx0JykgKyAnXScgKyBzdWZmaXgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLm91dHB1dCgnWycpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJ10nICsgc3VmZml4KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0lGUkFNRSc6XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoKHJlZiA9IGVsLmNvbnRlbnREb2N1bWVudCkgIT0gbnVsbCA/IHJlZi5kb2N1bWVudEVsZW1lbnQgOiB2b2lkIDApIHtcbiAgICAgICAgICB0aGlzLnByb2Nlc3MoZWwuY29udGVudERvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZnJhbWVTcmMgPSBhdHRyKGVsLCAnc3JjJyk7XG4gICAgICAgICAgaWYgKGZyYW1lU3JjICYmIHRoaXMub3B0aW9ucy5hbGxvd0ZyYW1lICYmIHRoaXMub3B0aW9ucy5hbGxvd0ZyYW1lKGZyYW1lU3JjKSkge1xuICAgICAgICAgICAgdGhpcy5vdXRwdXQoJzxpZnJhbWUgc3JjPVwiJyArIGZyYW1lU3JjICsgJ1wiPjwvaWZyYW1lPicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gIH1cblxuICBhZnRlciA9IHRoaXMudGFibGVzKGVsKSB8fCBhZnRlcjtcblxuICBmb3IgKGkgPSAwOyBpIDwgZWwuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMucHJvY2VzcyhlbC5jaGlsZE5vZGVzW2ldKTtcbiAgfVxuXG4gIHRoaXMuYWR2YW5jZUh0bWxJbmRleCgnPFxcXFxzP1xcXFwvXFxcXHM/JyArIGVsLnRhZ05hbWUgKyAnPicpO1xuXG4gIGlmICh0eXBlb2YgYWZ0ZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICBhZnRlciA9IFthZnRlcl07XG4gIH1cbiAgd2hpbGUgKGFmdGVyICYmIGFmdGVyLmxlbmd0aCkge1xuICAgIGFmdGVyLnNoaWZ0KCkuY2FsbCh0aGlzKTtcbiAgfVxufTtcblxuRG9tYWRvci5wcm90b3R5cGUudGFibGVzID0gZnVuY3Rpb24gdGFibGVzIChlbCkge1xuICBpZiAodGhpcy5vcHRpb25zLnRhYmxlcyA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbmFtZSA9IGVsLnRhZ05hbWU7XG4gIGlmIChuYW1lID09PSAnVEFCTEUnKSB7XG4gICAgdGhpcy5hcHBlbmQoJ1xcblxcbicpO1xuICAgIHRoaXMudGFibGVDb2xzID0gW107XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChuYW1lID09PSAnVEhFQUQnKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHJldHVybiB0aGlzLmFwcGVuZCgnfCcgKyB0aGlzLnRhYmxlQ29scy5yZWR1Y2UocmVkdWNlciwgJycpICsgJ1xcbicpO1xuICAgICAgZnVuY3Rpb24gcmVkdWNlciAoYWxsLCB0aExlbmd0aCkge1xuICAgICAgICByZXR1cm4gYWxsICsgJy0nLnJlcGVhdCh0aExlbmd0aCArIDIpICsgJ3wnO1xuICAgICAgfVxuICAgIH07XG4gIH1cbiAgaWYgKG5hbWUgPT09ICdUSCcpIHtcbiAgICByZXR1cm4gW2Z1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHRoaXMudGFibGVDb2xzLnB1c2godGhpcy5jaGlsZEJ1ZmZlci5sZW5ndGgpO1xuICAgIH0sIHRoaXMudGQodHJ1ZSldO1xuICB9XG4gIGlmIChuYW1lID09PSAnVFInKSB7XG4gICAgdGhpcy50YWJsZUNvbCA9IDA7XG4gICAgdGhpcy5vdXRwdXQoJ3wnKTtcbiAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgdGhpcy5hcHBlbmQoJ1xcbicpO1xuICAgIH07XG4gIH1cbiAgaWYgKG5hbWUgPT09ICdURCcpIHtcbiAgICByZXR1cm4gdGhpcy50ZCgpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wdXNoTGVmdCA9IGZ1bmN0aW9uIHB1c2hMZWZ0ICh0ZXh0KSB7XG4gIHZhciBvbGQ7XG4gIG9sZCA9IHRoaXMubGVmdDtcbiAgdGhpcy5sZWZ0ICs9IHRleHQ7XG4gIGlmICh0aGlzLmF0UCkge1xuICAgIHRoaXMuYXBwZW5kKHRleHQpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucCgpO1xuICB9XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5sZWZ0ID0gb2xkO1xuICAgICAgX3RoaXMuYXRMZWZ0ID0gX3RoaXMuYXRQID0gZmFsc2U7XG4gICAgICByZXR1cm4gX3RoaXMucCgpO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUucmVwbGFjZUxlZnQgPSBmdW5jdGlvbiByZXBsYWNlTGVmdCAodGV4dCkge1xuICBpZiAoIXRoaXMuYXRMZWZ0KSB7XG4gICAgdGhpcy5hcHBlbmQodGhpcy5sZWZ0LnJlcGxhY2UoL1sgXXsyLDR9JC8sIHRleHQpKTtcbiAgICByZXR1cm4gdGhpcy5hdExlZnQgPSB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdGhpcy5hdFAgPSB0cnVlO1xuICB9IGVsc2UgaWYgKHRoaXMubGFzdCkge1xuICAgIHJldHVybiB0aGlzLmxhc3QgPSB0aGlzLmxhc3QucmVwbGFjZSgvWyBdezIsNH0kLywgdGV4dCk7XG4gIH1cbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmlzVmlzaWJsZSA9IGZ1bmN0aW9uIGlzVmlzaWJsZSAoZWwpIHtcbiAgdmFyIGRpc3BsYXk7XG4gIHZhciBpO1xuICB2YXIgcHJvcGVydHk7XG4gIHZhciB2aXNpYmlsaXR5O1xuICB2YXIgdmlzaWJsZSA9IHRydWU7XG4gIHZhciBzdHlsZSA9IGF0dHIoZWwsICdzdHlsZScsIGZhbHNlKTtcbiAgdmFyIHByb3BlcnRpZXMgPSBzdHlsZSAhPSBudWxsID8gdHlwZW9mIHN0eWxlLm1hdGNoID09PSAnZnVuY3Rpb24nID8gc3R5bGUubWF0Y2gocmRpc3BsYXkpIDogdm9pZCAwIDogdm9pZCAwO1xuICBpZiAocHJvcGVydGllcyAhPSBudWxsKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb3BlcnR5ID0gcHJvcGVydGllc1tpXTtcbiAgICAgIHZpc2libGUgPSAhcmhpZGRlbi50ZXN0KHByb3BlcnR5KTtcbiAgICB9XG4gIH1cbiAgaWYgKHZpc2libGUgJiYgdHlwZW9mIHRoaXMud2luZG93Q29udGV4dC5nZXRDb21wdXRlZFN0eWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHN0eWxlID0gdGhpcy53aW5kb3dDb250ZXh0LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpO1xuICAgICAgaWYgKHR5cGVvZiAoc3R5bGUgIT0gbnVsbCA/IHN0eWxlLmdldFByb3BlcnR5VmFsdWUgOiB2b2lkIDApID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRpc3BsYXkgPSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdkaXNwbGF5Jyk7XG4gICAgICAgIHZpc2liaWxpdHkgPSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCd2aXNpYmlsaXR5Jyk7XG4gICAgICAgIHZpc2libGUgPSBkaXNwbGF5ICE9PSAnbm9uZScgJiYgdmlzaWJpbGl0eSAhPT0gJ2hpZGRlbic7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgfVxuICB9XG4gIHJldHVybiB2aXNpYmxlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcbiIsIi8qISBodHRwOi8vbXRocy5iZS9yZXBlYXQgdjAuMi4wIGJ5IEBtYXRoaWFzICovXG5pZiAoIVN0cmluZy5wcm90b3R5cGUucmVwZWF0KSB7XG5cdChmdW5jdGlvbigpIHtcblx0XHQndXNlIHN0cmljdCc7IC8vIG5lZWRlZCB0byBzdXBwb3J0IGBhcHBseWAvYGNhbGxgIHdpdGggYHVuZGVmaW5lZGAvYG51bGxgXG5cdFx0dmFyIGRlZmluZVByb3BlcnR5ID0gKGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gSUUgOCBvbmx5IHN1cHBvcnRzIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgIG9uIERPTSBlbGVtZW50c1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dmFyIG9iamVjdCA9IHt9O1xuXHRcdFx0XHR2YXIgJGRlZmluZVByb3BlcnR5ID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuXHRcdFx0XHR2YXIgcmVzdWx0ID0gJGRlZmluZVByb3BlcnR5KG9iamVjdCwgb2JqZWN0LCBvYmplY3QpICYmICRkZWZpbmVQcm9wZXJ0eTtcblx0XHRcdH0gY2F0Y2goZXJyb3IpIHt9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH0oKSk7XG5cdFx0dmFyIHJlcGVhdCA9IGZ1bmN0aW9uKGNvdW50KSB7XG5cdFx0XHRpZiAodGhpcyA9PSBudWxsKSB7XG5cdFx0XHRcdHRocm93IFR5cGVFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcblx0XHRcdC8vIGBUb0ludGVnZXJgXG5cdFx0XHR2YXIgbiA9IGNvdW50ID8gTnVtYmVyKGNvdW50KSA6IDA7XG5cdFx0XHRpZiAobiAhPSBuKSB7IC8vIGJldHRlciBgaXNOYU5gXG5cdFx0XHRcdG4gPSAwO1xuXHRcdFx0fVxuXHRcdFx0Ly8gQWNjb3VudCBmb3Igb3V0LW9mLWJvdW5kcyBpbmRpY2VzXG5cdFx0XHRpZiAobiA8IDAgfHwgbiA9PSBJbmZpbml0eSkge1xuXHRcdFx0XHR0aHJvdyBSYW5nZUVycm9yKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgcmVzdWx0ID0gJyc7XG5cdFx0XHR3aGlsZSAobikge1xuXHRcdFx0XHRpZiAobiAlIDIgPT0gMSkge1xuXHRcdFx0XHRcdHJlc3VsdCArPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG4gPiAxKSB7XG5cdFx0XHRcdFx0c3RyaW5nICs9IHN0cmluZztcblx0XHRcdFx0fVxuXHRcdFx0XHRuID4+PSAxO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9O1xuXHRcdGlmIChkZWZpbmVQcm9wZXJ0eSkge1xuXHRcdFx0ZGVmaW5lUHJvcGVydHkoU3RyaW5nLnByb3RvdHlwZSwgJ3JlcGVhdCcsIHtcblx0XHRcdFx0J3ZhbHVlJzogcmVwZWF0LFxuXHRcdFx0XHQnY29uZmlndXJhYmxlJzogdHJ1ZSxcblx0XHRcdFx0J3dyaXRhYmxlJzogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFN0cmluZy5wcm90b3R5cGUucmVwZWF0ID0gcmVwZWF0O1xuXHRcdH1cblx0fSgpKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCF3aW5kb3cuTm9kZSkge1xuICB3aW5kb3cuTm9kZSA9IHtcbiAgICBFTEVNRU5UX05PREU6IDEsXG4gICAgVEVYVF9OT0RFOiAzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHdpbmRvd0NvbnRleHQgKCkge1xuICByZXR1cm4gd2luZG93O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbmRvd0NvbnRleHQ7XG4iXX0=
