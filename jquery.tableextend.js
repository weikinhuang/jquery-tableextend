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
			paddedRows : 50,
			updateThreshold : 0,
			// *********************** SCROLL PARAMS ***********************
			// ************************ SORT PARAMS ************************
			parsers : null,
			sortMultiSortKey : "shiftKey",
			defaultOrder : "asc",
			cancelSelection : true,
			// ************************ SORT PARAMS ************************
			delay : 500,
			scrollDelay : 500,

			// selection parameters
			thead : "thead:first",
			tbody : "tbody:first",
			headers : "tr:first th",
			headerSortSelector : "",
			// styling parameters
			tableClass : "",
			height : 100,
			headerHeight : 0,
			rowHeight : -1,

			// events
			scrollStart : function(e, ui) {
				// console.log("scrollStart");
			},
			scrollStop : function(e, ui) {
				// console.log("scrollStop");
			},
			sortStart : function(e, ui) {
				// console.log("sortStart");
			},
			sortStop : function(e, ui) {
				// console.log("sortStop");
			},
			attach : function(index, row) {
				// console.log("attach");
				return $("<tr><td>" + row + "</td></tr>");
			},
			detach : function(indexes, rows) {
				// console.log("detach");
				rows.remove();
			},
			update : function(e, ui) {
				// console.log("update");
			}
		},
		dataRange : {
			start : -1,
			end : -1
		},
		headers : null,
		sortList : null,
		resetTable : false,
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
			var container = $("<div>").addClass("ui-tableextend ui-tableextend-container").css({
				paddingTop : this.options.headerHeight + "px",
				height : (this.options.height - this.options.headerHeight) + "px"
			});

			// wrapper for creating a scrollable area
			var wrapper = $("<div>").addClass("ui-tableextend ui-tableextend-wrapper ui-widget ui-helper-reset").css({
				height : "100%",
				overflowY : "auto",
				overflowX : "hidden"
			}).bind("scroll.tableextend", function() {
				self.scroll(this.scrollTop);
			});

			// generate the loading overlay
			var overlay = $("<div>").addClass("ui-tableextend ui-overlay");

			// scrolled padding
			this.padding_before = $("<div>").addClass("ui-tableextend ui-tableextend-padding ui-tableextend-padding-top");
			this.padding_after = $("<div>").addClass("ui-tableextend ui-tableextend-padding ui-tableextend-padding-bottom");
			container.insertAfter(this.element);
			wrapper.append(this.padding_before, this.element, this.padding_after);

			// the table element that will now hold the table's header
			var theader = $("<table>").addClass((this.element.attr("class") || "") + " ui-tableextend-header-container").css({
				width : "100%",
				height : this.options.headerHeight + "px"
			});
			theader.append(this.thead, "<tbody>");
			this.element.addClass("ui-tableextend-body");

			// wrapper for thead reshuffle
			var theader_wrapper = $("<div>").addClass("ui-tableextend ui-tableextend-thead-wrapper").css({
				top : 0,
				left : 0,
				position : "absolute",
				width : "100%"
			});
			theader_wrapper.append(theader);

			// put them all together
			container.append(wrapper, theader_wrapper, overlay);

			// keep local references
			this.container = container;
			this.theader = theader;
			this.wrapper = wrapper;

			// bind the update function to call the local update function
			this.element.bind("update.tableextend", function() {
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

			// ************************ SORT LOGIC ************************
			this.headers = [];
			this.sortList = [];
			this._loadSortHeaders();
			// ************************ SORT LOGIC ************************

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
						// make a shallow copy of the data
						value = value.slice(0);
					}
					this.resetTable = true;
					break;
				case "height":
					this.container.css("height", value - this.options.headerHeight);
					break;
				case "headerHeight":
					this.container.css("height", this.options.height - value);
					this.theader.css("height", value);
					break;
			}
			return $.Widget.prototype._setOption.call(this, key, value);
		},
		getWrapper : function() {
			return this.wrapper;
		},

		// *********************** SCROLL LOGIC ***********************
		scroll : function(top) {
			var self = this;
			top = top || 0;
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
			if (!this.options.delay) {
				self._update();
				return;
			}
			if (this.updateThrottle) {
				clearTimeout(this.updateThrottle);
			}
			this.updateThrottle = setTimeout(function() {
				clearTimeout(self.updateThrottle);
				self.updateThrottle = null;
				self._update();
			}, this.options.delay);
		},

		scrollBy : function(delta) {
			this.wrapper.scrollTop(this.wrapper.scrollTop() + delta).trigger("scroll");
		},
		scrollTo : function(position) {
			this.wrapper.scrollTop(position).trigger("scroll");
		},
		scrollIndex : function(index) {
			this.wrapper.scrollTop(index * this.options.rowHeight).trigger("scroll");
		},

		_determineRowHeight : function() {
			// determine the average height of a row
			var fragment = $("<tr><td>sample</td></tr>").appendTo(this.tbody);
			this.options.rowHeight = fragment.outerHeight();
			fragment.remove();
			return this.options.rowHeight;
		},

		_scroll : function(top) {
			// no data, no scrolling
			if (this.options.dataLength <= 0) {
				this.container.addClass("ui-tableextend-empty");
				return;
			}
			this.container.removeClass("ui-tableextend-empty");

			// figure out what row we're supposed to be seeing
			var index = Math.min(Math.max(0, Math.floor(top / this.options.rowHeight)), this.options.dataLength);
			// always make sure index is a even
			if (index > 0 && index % 2 === 1) {
				index--;
			}

			// how many rows are we supposed to be seeing?
			var visible_rows = Math.ceil(this.options.height / this.options.rowHeight) + 2;
			// always make sure visible_rows is a even
			if (visible_rows > 0 && visible_rows % 2 === 1) {
				visible_rows++;
			}
			// how many rows are supposed to be between the top and where we are
			var row_start = Math.max(0, Math.min(index - this.options.paddedRows, this.options.dataLength - this.options.paddedRows - Math.floor(visible_rows / 2)));
			// how many rows are supposed to be between the top and where we are
			var row_stop = Math.min(visible_rows + index + this.options.paddedRows, this.options.dataLength);

			// calculate the proper padding
			var top_padding = row_start * this.options.rowHeight;
			var bottom_padding = (Math.max(0, this.options.dataLength - row_stop)) * this.options.rowHeight;

			// now set all the rows that should be seen!
			this._setRows(row_start, row_stop, null, function() {
				// set the proper spacing between the top and bottom of the table
				this.padding_before.height(top_padding);
				this.padding_after.height(bottom_padding);
			});

			// set the scroll top
			this.wrapper.scrollTop(top);
		},
		_getDataSlice : function(start, end, callback, sort) {
			var self = this, overlap = this._determineOverlap(this.dataRange.start, this.dataRange.end, start, end, sort != null || this.resetTable);
			if (typeof this.options.data === "function") {
				// don't do anything if we're not executing past the threshold of an redraw
				if (this.options.updateThreshold > 0 && overlap.add.length <= this.options.updateThreshold) {
					return;
				}
				this.container.addClass("ui-loading");
				this.options.data.call(this.element, function(data) {
					self.container.removeClass("ui-loading");
					callback(data, overlap);
				}, {
					start : start,
					end : end,
					sort : sort || this.getCurrentSort(),
					overlap : {
						add : overlap.add.length,
						remove : overlap.remove.length
					}
				});
			} else {
				callback(this.options.data.slice(start, end), overlap);
			}
		},
		_setRows : function(start, end, sort, update_padding) {
			var self = this;
			this._getDataSlice(start, end, function(data, overlap) {
				self._manipulateTable(start, end, data, overlap);
				if (update_padding) {
					update_padding.call(self);
				}
			}, sort);
		},
		_manipulateTable : function(start, end, data, overlap) {
			var self = this;
			// make sure we set this back to false afterwards
			this.resetTable = false;
			// check if we are appending or prepending
			var action = start >= this.dataRange.start ? "append" : "prepend";
			// placeholder
			var rows = [];
			// rows to be removed
			var slice;

			// remove if necessary
			if (overlap.remove.length > 0) {
				// remove from head
				if (overlap.remove[0] === this.dataRange.start) {
					slice = this.tbody.find("> tr").slice(0, overlap.remove.length);
				} else {
					// remove from end
					slice = this.tbody.find("> tr").slice(-1 * overlap.remove.length);
				}
				this.options.detach(overlap.remove, slice);
			}
			// add if nencessary
			$.each(overlap.add, function(i, v) {
				if (!data[v - start]) {
					return;
				}
				rows.push(self.options.attach(v, data[v - start]));
			});

			// set modifiers
			this.dataRange.start = start;
			this.dataRange.end = end;

			// append or prepend the rows
			this.tbody[action].apply(this.tbody, rows);
		},
		_determineOverlap : function(prev_start, prev_end, cur_start, cur_end, empty_table) {
			var i, remove = [], add = [];
			for (i = prev_start; i <= prev_end; i++) {
				if ((i < cur_start || i > cur_end || empty_table) && i > -1) {
					remove.push(i);
				}
			}
			for (i = cur_start; i <= cur_end; i++) {
				if ((i < prev_start || i > prev_end || empty_table) && i > -1) {
					add.push(i);
				}
			}
			return {
				add : add,
				remove : remove
			};
		},
		// *********************** SCROLL LOGIC ***********************

		// ************************ SORT LOGIC ************************
		_loadSortHeaders : function() {
			var self = this;
			this.headers = [];
			this.thead.find(this.options.headers).each(function(i) {
				// here we want to bind the events for sorting
				var sort_trigger = $(this),
				// we want a reference to the th/td
				sort_header = (sort_trigger.is("td,th") ? sort_trigger : sort_trigger.closest("td,th")).addClass("ui-tableextend-header");

				self.headers.push(sort_header);

				if (self.options.headerSortSelector) {
					sort_trigger = sort_trigger.find(self.options.headerSortSelector);
				}

				if (self.options.parsers[i] == null || self.options.parsers[i] === false) {
					sort_trigger.bind("click.tableextend", function(e) {
						e.preventDefault();
						return false;
					});
					return;
				} else {
					sort_header.addClass("ui-tableextend-sortable").wrapInner("<div class='ui-tableextend-sortable-wrapper' />");
					sort_trigger.bind("click.tableextend", function(e) {
						e.preventDefault();
						self._triggerSort(i, self._getSortOrder(i), e[self.options.sortMultiSortKey]);
						return false;
					});
				}
				if (self.options.cancelSelection) {
					sort_trigger.disableSelection();
				}
			});
		},
		getCurrentSort : function() {
			return this._processSortList(this.sortList);
		},
		_triggerSort : function(index, type, append) {
			var t, i, l;
			if (!append) {
				this.sortList = [];
			} else {
				t = [];
				for (i = 0, l = this.sortList.length; i < l; i++) {
					if (this.sortList[i].index != index) {
						t.push(this.sortList[i]);
					}
				}
				this.sortList = t;
			}
			this.sortList.push({
				index : index,
				order : this._sanitizeSortOrder(type)
			});
			if (this._trigger("sortStart", null, {}) === false) {
				this._trigger("sortStop", null, {
					sort : []
				});
				return;
			}
			this._updateHeaderCss(this.sortList);
			this._updateTableOrder(this.sortList);
			this._trigger("sortStop", null, {
				sort : $.map(this.sortList, function(o) {
					return {
						index : o.index,
						order : o.order == "asc" ? 1 : -1
					};
				})
			});
		},
		_updateHeaderCss : function(sort) {
			$.each(this.headers, function() {
				this.removeClass("ui-tableextend-sort-asc ui-tableextend-sort-desc");
			});
			var i, l = sort.length;
			for (i = 0; i < l; i++) {
				this.headers[sort[i].index].addClass("ui-tableextend-sort-" + sort[i].order);
			}
		},
		_getSortOrder : function(i) {
			var n, l = this.sortList.length;
			for (n = 0; n < l; n++) {
				if (this.sortList[n].index == i) {
					return this._sanitizeSortOrder(this.sortList[n].order) == "asc" ? "desc" : "asc";
				}
			}
			return this._sanitizeSortOrder(this.options.defaultOrder);
		},
		_sanitizeSortOrder : function(type) {
			return type == 1 || (type + "").toLowerCase() == "asc" ? "asc" : "desc";
		},
		_processSortList : function(sort_list) {
			var self = this, final_sort_order = [];
			$.each(sort_list, function(i, v) {
				var indexer = self.options.parsers[v.index] || {};
				final_sort_order.push({
					index : v.index,
					order : v.order,
					name : indexer.name || "",
					callback : indexer.callback || null
				});
			});
			return final_sort_order;
		},
		_updateTableOrder : function(sort_list) {
			var sort_order = this._processSortList(sort_list);
			if (typeof this.options.data !== "function") {
				// we'll just sort the data locally
				this.options.data = $.ui.tableextend.sortMulti(this.options.data, sort_order);
			}
			this._setRows(this.dataRange.start, this.dataRange.end, sort_order);
		},
		// ************************ SORT LOGIC ************************

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

	$.extend($.ui.tableextend, {
		sortAsc : function(rows, index) {
			return rows.slice(0).sort(function(a, b) {
				var a_val = index.callback ? index.callback(a) : (a[index.name] || "");
				var b_val = index.callback ? index.callback(b) : (b[index.name] || "");
				return ((a_val < b_val) ? -1 : ((a_val > b_val) ? 1 : 0));
			});
		},
		sortDesc : function(rows, index) {
			return rows.slice(0).sort(function(a, b) {
				var a_val = index.callback ? index.callback(a) : (a[index.name] || "");
				var b_val = index.callback ? index.callback(b) : (b[index.name] || "");
				return ((b_val < a_val) ? -1 : ((b_val > a_val) ? 1 : 0));
			});
		},
		sortMulti : function(rows, indicies) {
			if (indicies.length === 0) {
				return rows.slice(0);
			}
			if (indicies.length === 1) {
				return $.ui.tableextend["sort" + (indicies[0].order === "asc" ? "Asc" : "Desc")](rows, indicies[0]);
			}
			var l = indicies.length - 1;
			return rows.slice(0).sort(function(a, b) {
				var i = 0, a_val, b_val;
				do {
					a_val = indicies[i].callback ? indicies[i].callback(a) : (a[indicies[i].name] || "");
					b_val = indicies[i].callback ? indicies[i].callback(b) : (b[indicies[i].name] || "");
				} while (a_val == b_val && ++i < l);
				a_val = indicies[i].callback ? indicies[i].callback(a) : (a[indicies[i].name] || "");
				b_val = indicies[i].callback ? indicies[i].callback(b) : (b[indicies[i].name] || "");
				if (indicies[i].order === "asc") {
					return ((a_val < b_val) ? -1 : ((a_val > b_val) ? 1 : 0));
				}
				return ((b_val < a_val) ? -1 : ((b_val > a_val) ? 1 : 0));
			});
		}
	});
})(jQuery);