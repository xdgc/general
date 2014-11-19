/*
 * For OSG Connect by dgc@uchicago.edu
 */

var Loader = function () {
	/* Loader handles dynamic loading of javascript and css resources */
	var cls = function () {
	};

	cls.prototype.loadjs = function (uri, action) {
		console.log('loading ' + uri);
		var script = document.createElement('script');
		script.src = uri;
		script.type = 'text/javascript';
		script.onload = function () {
			window.document.head.removeChild(script);
			if (action)
				action();
		};
		window.document.head.appendChild(script);
	};

	cls.prototype.loadcss = function (uri, action) {
		console.log('loading ' + uri);
		var link = document.createElement('link');
		link.href = uri;
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.onload = function () {
			//window.document.head.removeChild(link);
			if (action)
				action();
		};
		window.document.head.appendChild(link);
	};

	cls.prototype.chainjs = function (urilist, action) {
		var self = this;
		if (!urilist || urilist.length == 0) {
			if (action)
				return action();
			return;
		}
		return self.loadjs(urilist.shift(), function () {self.chainjs(urilist, action);});
	}

	cls.prototype.chaincss = function (urilist, action) {
		var self = this;
		if (!urilist || urilist.length == 0) {
			if (action)
				return action();
			return;
		}
		return self.loadcss(urilist.shift(), function () {self.chaincss(urilist, action);});
	}

	return cls;
}();

var OSGCustomize = function () {
	var cls = function (config) {
		/*
		 * Set defaults during instantiation:
		 * var osg = new OSGCustomize({
		 *     # key: [name of control, default value],
		 *     'thing1': ['Your Thing 1': 'first thing'],
		 *     'thing2': ['Your Thing 2': null],
		 * });
		 * If a subst key is not in this list, it will not be replaced.  If it's
		 * null or '', it will be replaced by its key name.
		 */
		this.controls = {};
		this.subs = {};
		for (var key in config) {
			this.controls[key] = config[key][0];
			this.subs[key] = config[key][1];
		};
		this.version = 1;
	};

	cls.prototype.prepdocument = function () {
		var rx = new RegExp('{[a-zA-Z0-9_]*}');
		function replacer (range) {
			var key = range.toString();
			key = key.substr(1, key.length-2);
			console.log(key);
			range.deleteContents();
		}
		$('body *').replaceText(/{([a-zA-Z0-9_]*)}/g,
		                        '<span class="osgcustomize_target" id="osgcustomize_target_$1">$1</span>');
	};

	cls.prototype.update = function (subject) {
		if (subject) {
			$('#osgcustomize_target_' + subject).html(this.subs[subject]);
			return;
		}
		for (var k in this.subs) {
			$('#osgcustomize_target_' + k).html(this.subs[k]);
		}
	};

	cls.prototype.loadsettings = function () {
		if (!window.localStorage)
			return;
		var version = parseInt(localStorage.getItem('osgcustomize.version'));
		var subs = localStorage.getItem('osgcustomize.subs');
		if (! subs)
			return;
		subs = JSON.parse(subs);
		$.extend(this.subs, subs);
		content = $('html').html();
		this.upgrade(version);
		return version;
	};

	cls.prototype.savesettings = function () {
		if (! 'localStorage' in window)
			return;
		localStorage['osgcustomize.version'] = this.version;
		localStorage['osgcustomize.subs'] = JSON.stringify(this.subs);
	};

	cls.prototype.upgrade = function (oldversion) {
		if (oldversion == this.version)
			return;
		/* Can add rules here for upgrading from old versions to new. */
	};

	cls.prototype.parseuri = function () {
		var uri = URI(window.location.href);
		var q = uri.query(true);

		for (var k in q)
			this.subs[k] = q[k];
	};

	cls.prototype.fixsubs = function () {
		for (var k in this.subs) {
			if (this.subs[k] == null || this.subs[k] == '')
				this.subs[k] = k;
		}
		this.savesettings();
	};

	cls.prototype.drawcontrols = function (target) {
		var self = this;
		var fieldset = $('<fieldset class="controls">')
		var intro = $('<p class="intro">');
		intro.html('You can customize the example code on this page! \
Enter your personal information as described here and the page will adjust \
itself. Settings will be saved in your browser for your next visit.');
		fieldset.append(intro);
		fieldset.append($('<br>'));

		for (var name in this.subs) {
			var label = $('<label>');
			label.html((this.controls[name] || name) + ':');
			label.attr('for', 'osgcustomize_control_' + name);

			var input = $('<input>');
			input.attr('id', 'osgcustomize_control_' + name);
			input.attr('value', this.subs[name]);
			input.attr('data-key', name);

			fieldset.append(label);
			fieldset.append(input);
			fieldset.append($('<br>'));

			var self = this;
			input.focus(function (ev) { $(ev.target).select(); });
			input.keyup(function () {
				self.subs[name] = input.val();
				self.update(name);
			});
			input.change(function () {
				self.update();
				self.savesettings();
			});
		}
		var close = $('<button class="closecontrols">');
		close.html('Close');
		close.click(function () {fieldset.hide();});
		fieldset.append($('<center>').append(close));

		var activate = $('#osgcustomize-activate');
		if (activate.length) {
			console.log('found osgcustomize-activate: ' + activate[0]);
		}
		else {
			var activate = $('<button class="activate">');
			activate.attr('id', 'osgcustomize-activate');
			activate.html('Customize page');
			console.log('created osgcustomize-activate: ' + activate[0]);
			target.append(activate);
		}
		activate.click(function () {fieldset.show();});

		fieldset.hide();
		target.append(fieldset);
	};

	cls.prototype.init = function (target) {
		var self = this;
		$(document).ready(function () {
			self.loadsettings();       // Recover saved settings from localStorage
			self.parseuri();           // Overstrike with any settings in the URI querystring
			self.fixsubs();            // Normalize the substitution table
			self.prepdocument();       // Replace {token} with <span> elements in document
			self.drawcontrols(target); // Add the customization controls
			self.update();             // Perform initial substitutions in <span>s
		});
	};

	cls.bootstrap = function (targetsel) {
		var loader = new Loader();
		loader.chaincss(['/general/css/osgcustomize.css']);
		loader.chainjs(['/general/js/jquery-1.9.1.min.js',
		                  '/general/js/URI.js',
		                  '/general/js/jquery.ba-replacetext.min.js'],
		                 function () {
			var target = $(targetsel);
			target.removeClass('hidden');
			var config = JSON.parse(target.html());
			target.html('');
    		var osg = new OSGCustomize(config).init(target);
		});
	};

	return cls;
}();

OSGCustomize.bootstrap('#osgcustomize');
