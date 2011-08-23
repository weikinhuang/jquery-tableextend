/*!
 * jQuery UI TableExtend 0.1.0
 *
 * Copyright (c) 2010 Wei Kin Huang (<a href="http://www.incrementbyone.com">Increment By One</a>)
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Depends:
 *	jquery.ui.widget.js
 */
(function($, undefined) {

	var data = [];
	for ( var i = 0; i < 10000; i++) {
		data.push({
			name : i + " index"
		});
	}

	$.widget("ui.tableextend", {
		widgetEventPrefix : "tableextend",
		options : {
			// cache & params
			data : data,
			rows : [],
			delay : 0,
			tableClass : "",
			sortList : [],
			parsers : [],
			visibleRows : 200,
			// selection parameters
			thead : "thead:first",
			tbody : "tbody:first",
			headers : "thead:first tr:first th",
			filter : "*",
			childSelector : "",
			headerSortSelector : "",
			// sort parameters
			sortMultiSortKey : "shiftKey",
			defaultOrder : "asc",
			cancelSelection : true,
			// events
			start : function(e, ui) {
				console.log("start");
			},
			stop : function(e, ui) {
				console.log("stop");
			},
			update : function(e, ui) {
				console.log("update");
			}
		},
		rowHeight : 0,
		_create : function() {
			var self = this;
			if (typeof this.options.thead === "object") {
				this.thead = $(this.options.thead).eq(0);
			} else {
				this.thead = this.element.find(this.options.thead).eq(0);
			}
			if (typeof this.options.tbody === "object") {
				this.tbody = $(this.options.tbody).eq(0);
			} else {
				this.tbody = this.element.find(this.options.tbody).eq(0);
			}

			var wrapper = $("<div>").css({
				height : "100%",
				overflowY : "auto",
				overflowX : "hidden"
			}).bind("scroll", function() {
				self.scroll(this.scrollTop);
			});
			this.padding_before = $("<div>");
			this.padding_after = $("<div>");
			wrapper.insertAfter(this.element).append(this.padding_before, this.element, this.padding_after);

//			this.options.data.each(function(v) {
//				self.tbody.append("<tr><td>" + v.name + "</td></tr>");
//			});

			// determine the average height of a row
			var fragment = $("<tr><td>sample</td></tr>").appendTo(this.tbody);
			this.rowHeight = fragment.height();
			fragment.remove();

			this.wrapper = wrapper;

			this.thead.remove();

			this._scroll(0);

			this._update();
		},
		destroy : function() {
			$.Widget.prototype.destroy.apply(this);
		},
		_scroll : function(top) {
			// figure out what row we're supposed to be seeing
			var index = Math.min(Math.max(0, Math.floor(top / this.rowHeight)), this.options.data.length);

			// how many rows to store before and after
			var padded_rows = 100;

			// how many rows are we supposed to be seeing?
			var visible_rows = this.options.visibleRows;
			// how many rows are supposed to be between the top and where we are
			var rows_start = Math.max(0, index - padded_rows);
			// how many rows are supposed to be between the top and where we are
			var row_stop = Math.min(visible_rows + index + padded_rows, this.options.data.length);

			// what is the assumed max height of all the rows
			var max_height = this.options.data.length * this.rowHeight;

			var top_padding = rows_start * this.rowHeight;
			var bottom_padding = (Math.max(0, this.options.data.length - row_stop)) * this.rowHeight;

			console.log(index, visible_rows, rows_start, row_stop);

			// if we're close to the top, don't do anything
			this.padding_before.height(top_padding);
			this.padding_after.height(bottom_padding);

			this._setRows(rows_start, row_stop);

			this.wrapper.scrollTop(top);
		},
		scroll : function(top) {
			var self = this;
			if (self.scrollThrottle) {
				clearTimeout(self.scrollThrottle);
			}
			self.scrollThrottle = setTimeout(function() {
				clearTimeout(self.scrollThrottle);
				self.scrollThrottle = null;
				self._scroll(top);
			}, 100);
		},
		update : function() {
			var self = this;
			if (!self.options.delay) {
				self._update();
				return;
			}
			if (self.updateThrottle) {
				clearTimeout(self.updateThrottle);
			}
			self.updateThrottle = setTimeout(function() {
				clearTimeout(self.updateThrottle);
				self.updateThrottle = null;
				self._update();
			}, self.options.delay);
		},
		_getDataSlice : function(start, end) {
			return this.options.data.slice(start, end);
		},
		_setRows : function(start, end) {
			var self = this;
			var data = this._getDataSlice(start, end);
			this.tbody.empty();
			data.each(function(v) {
				self.tbody.append("<tr><td>" + v.name + "</td></tr>");
			});
		},
		_update : function() {
			this._trigger("update", null, {});

			// calculate the height of all the rows
			//this.scroll_stretch.height(this.options.data.length * this.rowHeight);

		},
		replace : function(data) {

			// run a rebuild
			this.update();
		},
		append : function(data) {
			// add the rows to the existing set of rows

			// run a rebuild
			this.update();
		},
		empty : function() {

			this.element.empty();

			// run a rebuild
			this.update();
		}
	});
})(jQuery);