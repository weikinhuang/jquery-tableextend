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

	$.widget("ui.tableextend", {
		widgetEventPrefix : "tableextend",
		options : {
			// cache & params
			// *********************** SCROLL PARAMS ***********************
			data : [],
			dataLength : 0,
			visibleRows : 200,
			paddedRows : 50,
			// *********************** SCROLL PARAMS ***********************
			// ************************ SORT PARAMS ************************
			sortList : [],
			parsers : [],
			sortMultiSortKey : "shiftKey",
			defaultOrder : "asc",
			cancelSelection : true,
			// ************************ SORT PARAMS ************************
			delay : 0,
			scrollDelay : 100,

			// selection parameters
			thead : "thead:first",
			tbody : "tbody:first",
			headers : "thead:first tr:first th",
			filter : "*",
			childSelector : "",
			headerSortSelector : "",
			// styling parameters
			tableClass : "",
			height : 100,
			headerHeight : 0,
			rowHeight : -1,

			// events
			scrollStart : function(e, ui) {
				// console.log("start");
			},
			scrollStop : function(e, ui) {
				// console.log("stop");
			},
			attach : function(index, row) {
				// console.log("attach");
				return $("<tr><td>" + row + "</td></tr>");
			},
			detach : function(index, row, tr) {
				// console.log("detach");
				tr.remove();
			},
			update : function(e, ui) {
				// console.log("update");
			}
		},
		dataRange : {
			start : -1,
			end : -1,
			range : {}
		},
		_create : function() {
			var self = this;
			// keep a quick reference to the table head
			if (typeof this.options.thead === "object") {
				this.thead = $(this.options.thead).eq(0);
			} else {
				this.thead = this.element.find(this.options.thead).eq(0);
			}

			// keep a quick reference to the table body
			if (typeof this.options.tbody === "object") {
				this.tbody = $(this.options.tbody).eq(0);
			} else {
				this.tbody = this.element.find(this.options.tbody).eq(0);
			}

			// *********************** SCROLL LOGIC ***********************

			// master container for the contents of the scrollable table, and fixed header
			var container = $("<div>").css({
				paddingTop : this.options.headerHeight + "px",
				height : (this.options.height - this.options.headerHeight) + "px"
			});

			// wrapper for creating a scrollable area
			var wrapper = $("<div>").css({
				height : "100%",
				overflowY : "auto",
				overflowX : "hidden"
			}).bind("scroll", function() {
				self.scroll(this.scrollTop);
			});
			// scrolled padding
			this.padding_before = $("<div>");
			this.padding_after = $("<div>");
			container.insertAfter(this.element);
			wrapper.append(this.padding_before, this.element, this.padding_after);

			// the table element that will now hold the table's header
			var theader = $("<table>").css({
				top : 0,
				left : 0,
				position : "absolute",
				width : "100%",
				height : this.options.headerHeight + "px"
			});
			theader.append(this.thead, "<tbody>");

			// put them all together
			container.append(theader, wrapper);

			// keep local references
			this.container = container;
			this.theader = theader;
			this.wrapper = wrapper;

			// bind the update function to call the local update function
			this.element.bind("update", function() {
				self.update();
			});

			// remove any remaining headers and footers, as we can't use them
			this.element.find("thead,tfoot").remove();

			// guess row height if possible
			if (this.options.rowHeight === -1) {
				this._determineRowHeight();
			}

			// force option setting of the data
			this._setOption("data", this.options.data);

			// *********************** SCROLL LOGIC ***********************

			// run options to build the initial table view
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
				case "height":
					this.container.css("height", value - this.options.headerHeight);
					break;
				case "headerHeight":
					this.container.css("height", this.options.height - value);
					this.theader.css("height", value);
					break;
			}
			return $.Widget.prototype._setOption.apply(this, arguments);
		},

		// *********************** SCROLL LOGIC ***********************
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
			this.options.rowHeight = fragment.height();
			fragment.remove();
			return this.options.rowHeight;
		},

		_scroll : function(top) {
			// figure out what row we're supposed to be seeing
			var index = Math.min(Math.max(0, Math.floor(top / this.options.rowHeight)), this.options.dataLength);

			// how many rows are we supposed to be seeing?
			var visible_rows = this.options.visibleRows;
			// how many rows are supposed to be between the top and where we are
			var rows_start = Math.max(0, index - this.options.paddedRows);
			// how many rows are supposed to be between the top and where we are
			var row_stop = Math.min(visible_rows + index + this.options.paddedRows, this.options.dataLength);

			// what is the assumed max height of all the rows
			var max_height = this.options.dataLength * this.options.rowHeight;

			// calculate the proper padding
			var top_padding = rows_start * this.options.rowHeight;
			var bottom_padding = (Math.max(0, this.options.dataLength - row_stop)) * this.options.rowHeight;

			// set the proper spacing between the top and bottom of the table
			this.padding_before.height(top_padding);
			this.padding_after.height(bottom_padding);

			// now set all the rows that should be seen!
			this._setRows(rows_start, row_stop);

			// set the
			this.wrapper.scrollTop(top);
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
		// *********************** SCROLL LOGIC ***********************

		_update : function() {
			this._trigger("update", null, {});

			this.scrollTo(0);
		},

		empty : function() {
			// empty the table
			this.tbody.empty();

			// run a rebuild
			this.update();
		}
	});
})(jQuery);