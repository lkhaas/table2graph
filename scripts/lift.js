/**
 * Add a label to the Y axis.
 * ----------------------------------------------------------------------------
 * The label will inherit the axis data name or can be explicitely defined.
 */

Rickshaw.namespace('Rickshaw.Graph.Axis.LabeledY');

Rickshaw.Graph.Axis.LabeledY = Rickshaw.Class.create(Rickshaw.Graph.Axis.Y, {
  initialize: function(args) {

    this.label = args.label || '';

    this.graph = args.graph;
    this.orientation = args.orientation || 'right';

    this.pixelsPerTick = args.pixelsPerTick || 75;
    if (args.ticks) this.staticTicks = args.ticks;
    if (args.tickValues) this.tickValues = args.tickValues;

    this.tickSize = args.tickSize || 4;
    this.ticksTreatment = args.ticksTreatment || 'plain';

    this.tickFormat = args.tickFormat || function(y) { return y };

    this.berthRate = 0.10;

    if (args.element) {

      this.element = args.element;
      this.vis = d3.select(args.element)
        .append("svg:svg")
        .attr('class', 'rickshaw_graph y_axis');

      this.element = this.vis[0][0];
      this.element.style.position = 'relative';

      this.setSize({ width: args.width, height: args.height });

    } else {
      this.vis = this.graph.vis;
    }

    var self = this;
    this.graph.onUpdate( function() { self.render() } );
  },
  _drawAxis: function(scale) {
    var axis = d3.svg.axis().scale(scale).orient(this.orientation);

    axis.tickFormat(this.tickFormat);
    if (this.tickValues) axis.tickValues(this.tickValues);

    if (this.orientation == 'left') {
      var berth = this.height * this.berthRate;
      var transform = 'translate(' + this.width + ', ' + berth + ')';
    }

    if (this.element) {
      this.vis.selectAll('*').remove();
    }

    this.vis
      .append("svg:g")
      .attr("class", ["y_ticks", this.ticksTreatment].join(" "))
      .attr("transform", transform)
      .call(axis.ticks(this.ticks).tickSubdivide(0).tickSize(this.tickSize));

    label = this.vis
      .append("svg:text")
      .attr('class', 'y-axis-label')
      .attr('x', this.height / 4 * -1)
      .attr('y', this.width / 3)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90 50 50)')
      .text(this.label);

    return axis;
  },
});

/**
 * Create an tooltip showing data from all graphs.
 * ----------------------------------------------------------------------------
 */

Rickshaw.namespace('Rickshaw.Graph.ClickDetail');

Rickshaw.Graph.ClickDetail = Rickshaw.Class.create(Rickshaw.Graph.HoverDetail, {
  formatter: function(series, x, y, formattedX, formattedY, d) {
    var self = this,
        options = this.graph.rawData.options,
        columns = this.graph.rawData.columns,
        xKey = columns[options.columnX - 1],
        yKey = columns[options.columnY - 1],
        nameKey = columns[options.columnName - 1],
        data = this.graph.rawData.groups,
        head = function () {
          var date = '<th>' + new Date(x * 1000).toUTCString() + '</th>',
              variations = '';

          for (var i = 0; i < self.graph.series.length; i++) {
            variations = variations + '<th style="background-color: ' + self.graph.series[i].color + ';">' + self.graph.series[i].shortName + '</th>';
          }

          return '<thead><tr>' + date + variations + '</tr></thead>';
        },
        row = function (data) {
          var output = '<td class="label">' + data.property + '</td>';

          for (var i = 0; i < data.data.length; i++) {
            if (typeof data.data[i].active != 'undefined' && data.data[i].active == true) {
              output = output + '<td class="active">' + data.data[i].value + '</td>';
            }
            else {
              output = output + '<td>' + data.data[i].value + '</td>';
            }
          }

          return '<tr>' + output + '</tr>';
        },
        rows = function () {
          var output = '';

          // Build each row of data.
          for (var key = 0; key < data[series.name].length; key++) {
            if (data[series.name][key][xKey] == x) {
              for (var property in data[series.name][key]) {
                if (data[series.name][key].hasOwnProperty(property) && property != xKey && property != nameKey) {
                  var rowData = {property: property, data: []};

                  for (var group in data) {
                    if (data.hasOwnProperty(group)) {
                      var information = {value: data[group][key][property]};
                      if (series.name == data[group][key][nameKey]) {
                        information.active = true;
                      }
                      rowData.data.push(information);
                    }
                  }

                  output = output + row(rowData);
                };
              };
            };
          };

          return '<tbody>' + output + '</tbody>';
        };

    return '<table class="lift-graph-details">' + head() + rows() + '</table>';
  },
  render: function (args) {
    var graph = this.graph,
        points = args.points,
        point = points.filter( function(p) { return p.active } ).shift();

    if (point.value.y === null) return;

    var formattedXValue = point.formattedXValue,
        formattedYValue = point.formattedYValue;

    this.element.innerHTML = '';
    this.element.style.left = graph.x(point.value.x) + 'px';

    var item = document.createElement('div');

    item.className = 'item';

    // invert the scale if this series displays using a scale
    var series = point.series,
        actualY = series.scale ? series.scale.invert(point.value.y) : point.value.y;

    item.innerHTML = this.formatter(series, point.value.x, actualY, formattedXValue, formattedYValue, point);

    this.element.appendChild(item);

    var dot = document.createElement('div'),
        topPosition = this.graph.y(point.value.y0 + point.value.y);

    dot.className = 'dot';
    dot.style.top = topPosition + 'px';
    dot.style.borderColor = series.color;

    this.element.appendChild(dot);

    if (point.active) {
      item.classList.add('active');
      dot.classList.add('active');
    }

    var $item = $(item),
        itemWidth = parseInt($item.innerWidth()),
        itemHeight = parseInt($item.innerHeight()),
        itemMargin = parseInt($item.css('margin-top')) + parseInt($item.css('margin-bottom'));

    item.style.top = Math.round(topPosition - itemHeight - itemMargin) + 'px';
    item.style.left = Math.round(itemWidth / 2) * -1 + 'px';

    // Assume left alignment until the element has been displayed and
    // bounding box calculations are possible.
    var alignables = [item];

    alignables.forEach(function(el) {
      el.classList.add('bottom');
      el.classList.add('center');
    });

    this.show();

    var alignment = this._calcLayout(item);

    if (alignment.left > alignment.right) {
      item.style.left = 'auto';
      item.classList.remove('center');
      item.classList.remove('right');
      item.classList.add('left');
    }

    if (alignment.right > alignment.left) {
      item.style.left = 'auto';
      item.classList.remove('center');
      item.classList.remove('left');
      item.classList.add('right');
    }

    if (alignment.top === 0) {
      item.style.top = topPosition + 'px';
      item.classList.remove('bottom');
      item.classList.add('top');
    }

    if (typeof this.onRender == 'function') {
      this.onRender(args);
    }
  },
  _calcLayout: function(element) {
    var layout = {top: 0, right: 0, bottom: 0, left: 0},
        parentRect = this.element.parentNode.getBoundingClientRect(),
        rect = element.getBoundingClientRect();

    if (rect.top > parentRect.top) {
      layout.top += rect.top - parentRect.top;
    }

    if (rect.bottom < parentRect.bottom) {
      layout.bottom += parentRect.bottom - rect.bottom;
    }

    if (rect.right > parentRect.right) {
      layout.right += rect.right - parentRect.right;
    }

    if (rect.left < parentRect.left) {
      layout.left += parentRect.left - rect.left;
    }

    return layout;
  }
});

/**
 * Append the legend to the first column of a table.
 * ----------------------------------------------------------------------------
 */

Rickshaw.namespace('Rickshaw.Graph.TableLegend');

Rickshaw.Graph.TableLegend = Rickshaw.Class.create(Rickshaw.Graph.Legend, {
  render: function(args) {
    console.log('This extension is working.');
  }
});

/**
 * Create a graph using data from a table element and Rickshaw.
 * ----------------------------------------------------------------------------
 */
+function ($) {
  'use strict';

  // Assemble the object.
  var liftGraph = function (element, options) {
    this.type =
    this.options =
    this.enabled =
    this.$element = null

    this.init('liftGraph', element, options);
  };

  // Define the plugin defaults.
  liftGraph.DEFAULTS = {
    columnName: 1,
    columnX: 2,
    columnY: 3,
    scheme: null,
    renderer: null,
    width: null,
    height: null,
    min: null,
    max: null,
    padding: null,
    interpolation: 'linear',
    stack: null
  };

  // Initialize the plugin functionality.
  liftGraph.prototype.init = function (type, element, options) {
    this.type = type
    this.$element = $(element)
    this.options = this.getOptions(options)
    this.enabled = true

    this.render();
  };

  // Enable the graph.
  liftGraph.prototype.enable = function () {
    this.enabled = true;
  };

  // Disable the graph.
  liftGraph.prototype.disable = function () {
    this.enabled = false;
  };

  // Get the option value of a data attribute.
  liftGraph.prototype.dataAttr = function (key) {
    return this.$element.attr('data-' + this.type + '-' + key);
  };

  // Get default values.
  liftGraph.prototype.getDefaults = function () {
    return liftGraph.DEFAULTS;
  };

  // Reset the table.
  liftGraph.prototype.destroy = function () {
    this.hide().$element.off('.' + this.type).removeData('lift.' + this.type);
  }

  // Get options.
  liftGraph.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), options);
    for (var i in options) {
      options[i] = this.dataAttr(i) || options[i];
    }
    return options;
  };

  // Collect the data from the table.
  liftGraph.prototype.getData = function () {
    var columns = [],
        data = [],
        grouped = {};

    // Get the column names from the thead of the table.
    this.$element.find('thead > tr > th').each(function (i) {
      columns[i] = $(this).text();
    });

    // Structure the data in the table.
    this.$element.find('tbody > tr').each(function (row) {
      data[row] = {};

      $(this).children('td').each(function (i) {
        data[row][columns[i]] = $(this).text();
      });
    });

    // Get the grouping column name.
    var groupName = columns[this.options.columnName - 1];

    // Group data by a defined label..
    for (var i = 0; i < data.length; i++) {
      if (typeof grouped[data[i][groupName]] == 'undefined') {
        grouped[data[i][groupName]] = [];
      }
      grouped[data[i][groupName]].push(data[i]);
    }

    this.columns = columns;
    this.groups = grouped;
  };

  // Build graphing coordinates.
  liftGraph.prototype.buildSeries = function (columnX, columnY) {
    var groups = this.groups,
        xKey = this.columns[columnX - 1],
        yKey = this.columns[columnY - 1],
        series = [],
        results = $('.lift-graph-results > tbody > tr > td:first-child'),
        counter = 0;

    for (var key in groups) {
      if (groups.hasOwnProperty(key)) {
        var data = [];

        for (var i = 0; i < groups[key].length; i++) {
          data.push({
            x: parseFloat(groups[key][i][xKey]),
            y: parseFloat(groups[key][i][yKey]),
          });
        }

        series[counter] = {
          name: key,
          color: this.palette.color(),
          data: data,
          shortName: key.substring(0, 7) == 'control' ? 'Control' : 'V' + (counter + 1)
        };

        results.each(function () {
          if ($(this).text() == key) {
            $(this).prepend($('<span class="swatch" style="background-color: ' + series[counter].color + ';" />'));
          }
        })

        counter++;
      }
    }

    this.series = series;
  };

  // Get the optimal number of palette colors.
  liftGraph.prototype.getPalette = function () {
    var color = new Rickshaw.Fixtures.Color(),
        scheme = this.options.scheme || 'colorwheel',
        configuration = {scheme: scheme},
        count = 0;

    // Get the number of individual graphs.
    for (var key in this.groups) {
      if (this.groups.hasOwnProperty(key)) {
        count++;
      }
    }

    if (color.schemes[scheme].length < count) {
      configuration.interpolatedStopCount = count;
    }

    this.palette = new Rickshaw.Color.Palette(configuration);
  }

  // Get the graph object.
  liftGraph.prototype.getGraph = function () {
    var configuration = {
      element: this.$graph[0],
      series: this.series
    };

    // Set the custom renderer.
    if (this.options.renderer != null) {
      configuration.renderer = this.options.renderer;
    }

    // Set the custom width.
    if (this.options.width != null) {
      configuration.width = this.options.width;
    }
    else {
      configuration.width = this.$graph.width();
    }

    // Set the custom height.
    if (this.options.height != null) {
      configuration.height = this.options.height;
    }
    else {
      configuration.height = this.$graph.height();
    }

    // Set the custom min.
    if (this.options.max != null) {
      configuration.max = this.options.max;
    }

    // Set the custom max.
    if (this.options.min != null) {
      configuration.min = this.options.min;
    }

    // Set the custom padding.
    if (this.options.padding != null) {
      var data = this.options.padding.split(' '),
          dataLength = data.length,
          padding = {},
          position = ['top', 'right', 'bottom', 'left'];

      for (var i = 0; i < dataLength; i++) {
        padding[position[i]] = parseFloat(data[i]);
      }

      configuration.padding = padding;
    }

    // Set the custom interpolation.
    if (this.options.interpolation != null) {
      configuration.interpolation = this.options.interpolation;
    }

    // Set custom stack.
    if (this.options.stack != null) {
      configuration.stack = this.options.stack;
    }

    this.graph = new Rickshaw.Graph(configuration);

    // Add the raw data to the
    this.graph.rawData = this;
  }

  // Get the x-axis.
  liftGraph.prototype.setAxisX = function () {
    this.axisX = new Rickshaw.Graph.Axis.Time({
      graph: this.graph,
    });
  }

  // Get the y-axis.
  liftGraph.prototype.setAxisY = function () {
    this.axisY = new Rickshaw.Graph.Axis.LabeledY({
      element: this.$axisY[0],
      orientation: 'left',
      label: this.columns[this.options.columnY - 1],
      graph: this.graph,
    });
  }

  // Get the legend.
  liftGraph.prototype.setLegend = function () {
    this.legend = new Rickshaw.Graph.Legend({
      element: this.$legend[0],
      graph: this.graph,
      naturalOrder: true
    });
  }

  // Format the elements of the graph.
  liftGraph.prototype.build = function () {
    this.$graph = $('<div class="lift-graph-graph" role="presentation"></div>');
    this.$axisY = $('<div class="lift-graph-axis-y" role="presentation"></div>');
    this.$legend = $('<div class="lift-graph-legend" role="presentation"></div>');

    this.$element.addClass('lift-graph-table')
      .wrap('<div class="lift-graph-container"></div>')
      .before(this.$legend)
      .before(this.$axisY)
      .before(this.$graph)
      .before(this.$axisX);
  }

  // Hide the table.
  liftGraph.prototype.hideTable = function () {
    this.$element.hide();
  }

  // Show the table.
  liftGraph.prototype.showTable = function () {
    this.$element.show();
  }

  // Activate hover details.
  liftGraph.prototype.setHoverDetail = function () {
    // this.hoverDetail = new this.createHoverDetail({
    this.hoverDetail = new Rickshaw.Graph.ClickDetail({
      graph: this.graph
    });
  }

  // Highlight a series when hovering on legend.
  liftGraph.prototype.setSeriesHighlight = function () {
    this.seriesHighlight = new Rickshaw.Graph.Behavior.Series.Highlight({
      graph: this.graph,
      legend: this.legend
    });
  }

  // Allow a user to togle graph data via the legend.
  liftGraph.prototype.setSeriesToggle = function () {
    this.seriesToggle = new Rickshaw.Graph.Behavior.Series.Toggle({
      graph: this.graph,
      legend: this.legend
    });
  }

  // Render the graph.
  liftGraph.prototype.render = function () {
    this.getData();
    this.getPalette();
    this.buildSeries(this.options.columnX, this.options.columnY);
    this.build();
    this.getGraph();
    this.setAxisX();
    this.setAxisY();
    this.setLegend();
    this.setHoverDetail();
    this.setSeriesHighlight();
    this.setSeriesToggle();
    this.graph.render();
    this.hideTable();
  };

  // Define the jQuery plugin.
  var old = $.fn.railroad;

  $.fn.liftGraph = function (options) {
    return this.each(function () {
      var $this = $(this),
          data = $this.data('lift.graph'),
          options = typeof options == 'object' && option;

      if (!data && options == 'destroy') return;
      if (!data) $this.data('lift.graph', (data = new liftGraph(this, options)));
      if (typeof option == 'string') data[option]();
    });
  }

  $.fn.liftGraph.Constrictor = liftGraph;

  $.fn.liftGraph.noConflict = function () {
    $.fn.liftGraph = old;
    return this;
  }
}(jQuery);

/**
 * Test implementation and features.
 * ----------------------------------------------------------------------------
 */

$( document ).ready(function () {
  // Use our above jQuery function on a table.
  $('table[data-lift-statistics]').liftGraph();
});

//# sourceMappingURL=lift.js.map