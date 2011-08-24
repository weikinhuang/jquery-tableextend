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
			dataLength : data.length,
			rows : [],
			delay : 0,
			scrollDelay : 100,
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
			scrollStart : function(e, ui) {
				console.log("start");
			},
			scrollStop : function(e, ui) {
				console.log("stop");
			},
			update : function(e, ui) {
				console.log("update");
			},
			attach : function(index, row) {
				console.log("attach");
				return $("<tr><td>" + row.name + "</td></tr>");
			},
			detach : function(index, row, tr) {
				tr.remove();
				console.log("detach");
			}
		},
		rowHeight : 0,
		dataRange : {
			start : -1,
			end : -1,
			range : {}
		},
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

			this.element.bind("update", function() {
				self.update();
			});

			this._determineRowHeight();

			this.wrapper = wrapper;

			this._setOption("data", this.options.data);

			// remove the header for now
			this.thead.remove();

			this._scroll(0);

			this._update();
		},
		destroy : function() {
			$.Widget.prototype.destroy.apply(this);
		},
		_setOption : function(key, value) {
			switch (key) {
				case "data":
					if ($.isArray(value)) {
						this.options.dataLength = value.length;
					}
					break;
			}
			return $.Widget.prototype._setOption.apply(this, arguments);
		},
		_scroll : function(top) {
			// figure out what row we're supposed to be seeing
			var index = Math.min(Math.max(0, Math.floor(top / this.rowHeight)), this.options.dataLength);

			// how many rows to store before and after
			var padded_rows = 100;

			// how many rows are we supposed to be seeing?
			var visible_rows = this.options.visibleRows;
			// how many rows are supposed to be between the top and where we are
			var rows_start = Math.max(0, index - padded_rows);
			// how many rows are supposed to be between the top and where we are
			var row_stop = Math.min(visible_rows + index + padded_rows, this.options.dataLength);

			// what is the assumed max height of all the rows
			var max_height = this.options.dataLength * this.rowHeight;

			// calculate the proper padding
			var top_padding = rows_start * this.rowHeight;
			var bottom_padding = (Math.max(0, this.options.dataLength - row_stop)) * this.rowHeight;

			// set the proper spacing between the top and bottom of the table
			this.padding_before.height(top_padding);
			this.padding_after.height(bottom_padding);

			// now set all the rows that should be seen!
			this._setRows(rows_start, row_stop);

			// set the
			this.wrapper.scrollTop(top);
		},
		scroll : function(top) {
			var self = this;
			self._trigger("scrollStart", null, {
				top : top
			});
			if (self.scrollThrottle) {
				clearTimeout(self.scrollThrottle);
			}
			self.scrollThrottle = setTimeout(function() {
				clearTimeout(self.scrollThrottle);
				self.scrollThrottle = null;
				self._scroll(top);
				self._trigger("scrollStop", null, {
					top : top
				});
			}, self.options.scrollDelay || 100);
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

		scrollBy : function(delta) {
			this.wrapper.scrollTop(this.wrapper.scrollTop() + delta).trigger("scroll");
		},
		scrollTo : function(position) {
			this.wrapper.scrollTop(position).trigger("scroll");
		},

		_determineRowHeight : function() {
			// determine the average height of a row
			var fragment = $("<tr><td>sample</td></tr>").appendTo(this.tbody);
			this.rowHeight = fragment.height();
			fragment.remove();
			return this.rowHeight;
		},

		_getDataSlice : function(start, end, callback) {
			var self = this;
			if (typeof this.options.data === "function") {
				this.wrapper.addClass("ui-loading");
				this.options.data.call(this.element, function(data) {
					self.wrapper.removeClass("ui-loading");
					callback(data);
				}, {
					start : start,
					end : end,
					sort : []
				});
			} else {
				callback(this.options.data.slice(start, end));
			}
		},
		_setRows : function(start, end) {
			var self = this;
			this._getDataSlice(start, end, function(data) {
				self._manipulateTable(start, end, data);
			});
		},
		_manipulateTable : function(start, end, data) {
			var self = this;
			// get the overlaps
			var alter = this._determineOverlap(this.dataRange.start, this.dataRange.end, start, end);
			// check if we are appending or prepending
			var action = start >= this.dataRange.start ? "append" : "prepend";
			// set modifiers
			this.dataRange.start = start;
			this.dataRange.end = end;
			var data_range = this.dataRange.range || {};
			var rows = [];

			$.each(alter.remove, function(i, v) {
				if (!data_range[v]) {
					return;
				}
				self.options.detach(v, data_range[v].data, data_range[v].tr);
				delete data_range[v];
			});
			$.each(alter.add, function(i, v) {
				if (!data[v - start]) {
					return;
				}
				var tr = self.options.attach(v, data[v - start]);
				rows.push(tr);
				data_range[v] = {
					tr : tr,
					data : data[v - start]
				};
			});

			// cache the rows
			this.dataRange.range = data_range;

			// append or prepend the rows
			this.tbody[action].apply(this.tbody, rows);
		},
		_determineOverlap : function(prev_start, prev_end, cur_start, cur_end) {
			var i, remove = [], add = [];
			for (i = prev_start; i <= prev_end; i++) {
				if ((i < cur_start || i > cur_end) && i > -1) {
					remove.push(i);
				}
			}
			for (i = cur_start; i <= cur_end; i++) {
				if ((i < prev_start || i > prev_end) && i > -1) {
					add.push(i);
				}
			}
			return {
				add : add,
				remove : remove
			};
		},
		_update : function() {
			this._trigger("update", null, {});

			this._determineRowHeight();

			this.scrollTo(0);
		},
		empty : function() {
			// empty the table
			this.tbody.empty()

			// run a rebuild
			this.update();
		}
	});
})(jQuery);