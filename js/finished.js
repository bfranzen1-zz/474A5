'use strict';

(function() {

  let data = "";
  let svgContainer = ""; // keep SVG reference in global scope
  let svgScatter = "";
  let currData = "" // to store current year selection
  let ccodes = ""
  let width = "";
  let height = "";
  let margin = "";
  let div = "";

  // load data and make scatter plot after window loads
  window.onload = function() {
    margin = {top: 100, right: 100, bottom: 100, left: 100},
    width = 1400 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

    svgContainer = d3.select('body')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    

    // make tooltip
    div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svgScatter = d3.select(".tooltip")
        .append('svg')
        .attr('width', 400)
        .attr('height', 400);

    // load country codes for dropdown and title
    d3.json("./ccodes.json")
        .then((data) => {
            ccodes = data;
      });
    
    d3.csv("./data/dataEveryYear.csv")
        .then((data) => makeLinePlot(data, "AUS"));
    
  }

  // filters data and stores it in currData based on passed on country
  function filterByCountry(country) {
    currData = data.filter((row) => row["location"] === country);
  }


  function makeLinePlot(csvData, country) {
    data = csvData;
    // get data for pre-selected country
    filterByCountry(country);
    let uniqCountries = [... new Set(data.map((row) => row["location"]))]
    let pop = currData.map((row) => row["pop_mlns"]);
    let yrs = currData.map((row) => row["time"]);

    var x = d3.scaleBand().rangeRound([0, width]).padding(0.1);
        
    var y = d3.scaleLinear().range([height, 0]);

    x.domain(yrs);
    y.domain([0, +d3.max(pop) + 1]);
    
    var xAxis = d3.axisBottom()
        .scale(x);
    
    var yAxis = d3.axisLeft()
        .scale(y);


    // labels for line graph
    svgContainer.append('text')
        .attr('x', width/2 + 50)
        .attr('y', height + 170)
        .style('font', '14pt sans-serif')
        .text("Year");

    svgContainer.append('text')
        .attr("class", "title")
        .attr('x', width/2 - 100)
        .attr('y', 30)
        .style('font', '20pt sans-serif')
        .text("Population Size for " + getKey(country) + " Over Time");

    svgContainer.append('text')
        .attr('transform', 'translate(15, 220)rotate(-90)')
        .attr('x', -220)
        .attr('y', 30)
        .style('font', '14pt sans-serif')
        .text('Population Size (millions)');

    svgContainer.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(95," + (height + 100) + ")")
        .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)" );
    
    svgContainer.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .attr("transform", "translate(100,100)")

    var line = d3.line()
        .x((d) => x(d["time"])) // set the x values for the line generator
        .y((d) => y(d["pop_mlns"])) // set the y values for the line generator 
    
    svgContainer.append("path")
        .datum(currData) 
        .attr("class", "line") 
        .attr("transform", "translate(100,100)")
        .attr("d", line); 


    svgContainer.selectAll(".dot")
        .data(currData)
        .enter().append("circle") 
            .attr("class", "dot") 
            .attr("cx", (d) => x(d["time"]))
            .attr("cy", (d) => y(d["pop_mlns"]))
            .attr("transform", "translate(100,100)")
            .attr("r", 3)
            .on("mouseover", (d) => mouseIn(d["time"]))
            .on("mouseout", () => mouseOut());

    // dropdown for countries

    var dropdown = d3.select("#drop")
        .insert("select", "svg")
        .on("change", function() {
            let val = d3.select(this).property("value")

            // update data and change position of plotted points
            filterByCountry(val)

            // update population data 
            pop = currData.map((row) => +row["pop_mlns"]);
            
            // update x-axis
            let yrs = currData.map((row) => row["time"]);
            x.domain(yrs)
            svgContainer.select(".x-axis")
                .transition()
                .duration(400)
                .call(xAxis)
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", "-.55em")
                    .attr("transform", "rotate(-90)" );

            // update y-axis
            y.domain([0, +d3.max(pop) + 1]);
            svgContainer.select(".y-axis")
                .transition()
                .duration(400)
                .call(yAxis);

            d3.select(".line")
                .datum(currData)
                .transition()
                .duration(400)
                .attr("d", line); 

            let circles = svgContainer.selectAll("circle").data(currData)
            
            // transition points already made to new positions
            circles.transition().duration(400)
                .attr('cx', (d) => x(d["time"]))
                .attr('cy', (d) => y(d["pop_mlns"]))
                .attr("transform", "translate(100,100)")
                .attr('r', 3)
                .attr('fill', "#0066ffef")
            
            // add points that weren't already present
            circles.enter()
                .append('circle')
                    .attr('r', 0)
                    .attr('fill', "#0066ffef")
                    .on("mouseover", (d) => mouseIn(d["time"]))
                    .on("mouseout", () => mouseOut())
                    .transition().duration(400)
                    .attr('cx', (d) => x(d["time"]))
                    .attr('cy', (d) => y(d["pop_mlns"]))
                    .attr("transform", "translate(100,100)")
                    .attr('r', 3);
                    
            
            // remove points not in new data
            circles.exit()
                .transition().duration(400)
                .attr('r',0)
                .remove();
            
            // change country in title
            d3.select(".title")
                .text("Population Size for " + getKey(val) + " Over Time");
        });

    // add dropdown options
    dropdown.selectAll("option")
        .data(uniqCountries)
        .enter()
        .append("option")
            .attr("value", (d) => d)
            .text(function (d) {
                return getKey(d); // capitalize 1st letter
            });        


  }


// draws a scatter plot in the svgScatter container that shows
// fertility rate vs. life expectancy for all countries
function makeScatterPlot(time) {
    let curr = data.filter((row) => row["time"] == time)
    let fert = curr.map((row) => row["fertility_rate"]);
    let life = curr.map((row) => row["life_expectancy"]);

    let minMax = findMinMax(fert, life);

    let funcs = drawAxes(minMax, "fertility_rate", "life_expectancy", svgScatter, {min: 50, max: 350}, {min: 50, max: 250});
    
    svgScatter.selectAll(".dot")
        .data(curr)
        .enter()
        .append('circle')
            .attr('cx', funcs.x)
            .attr('cy', funcs.y)
            .attr('r', 3)
            .attr('opacity', 0.8)
            .attr('fill', "#0066ffef");

    svgScatter.append('text')
        .attr('x', 165)
        .attr('y', 290)
        .style('font-size', '10pt')
        .text("Fertility Rate");

    svgScatter.append('text')
        .attr('x', 40)
        .attr('y', 30)
        .style('font-size', '14pt')
        .text("Country Life Expectancy vs. Fertility Rate");

    svgScatter.append('text')
        .attr('transform', 'translate(15, 220)rotate(-90)')
        .style('font-size', '10pt')
        .text('Life Expectancy (years)');
}


// draw the axes and ticks
function drawAxes(limits, x, y, svg, rangeX, rangeY) {
    // return x value from a row of data
    let xValue = function(d) { return +d[x]; }
    
    // function to scale x value
    let xScale = d3.scaleLinear()
      .domain([limits.xMin - 0.5, limits.xMax]) // give domain buffer room
      .range([rangeX.min, rangeX.max]);

    // xMap returns a scaled x value from a row of data
    let xMap = function(d) { return xScale(xValue(d)); };

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom().scale(xScale);
    svg.append("g")
      .attr('transform', 'translate(0, ' + rangeY.max + ')')
      .call(xAxis);

    // return y value from a row of data
    let yValue = function(d) { return +d[y]}

    // function to scale y
    let yScale = d3.scaleLinear()
      .domain([limits.yMax, limits.yMin]) // give domain buffer
      .range([rangeY.min, rangeY.max]);

    // yMap returns a scaled y value from a row of data
    let yMap = function (d) { return yScale(yValue(d)); };

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft().scale(yScale);
    svg.append('g')
      .attr('transform', 'translate(' + rangeX.min + ', 0)')
      .call(yAxis);

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }

// find min and max for arrays of x and y
function findMinMax(x, y) {

    // get min/max x values
    let xMin = d3.min(x);
    let xMax = d3.max(x);

    // get min/max y values
    let yMin = d3.min(y);
    let yMax = d3.max(y);

    // return formatted min/max data as an object
    return {
      xMin : xMin,
      xMax : xMax,
      yMin : yMin,
      yMax : yMax
    }
  }


// takes in 3-letter country code and returns the country name if found
function getKey(code) {
    for (var k in ccodes) {
        if (ccodes[k] === code) {
          return k;
        }
    }
    return null;
}

// function to handle when user mouses over circle
function mouseIn(year) {
    div.transition()
        .duration(200)
        .style("opacity", .9)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");
    makeScatterPlot(year);
}

// function to handle when user mouses over circle
function mouseOut() {
    div.transition()
        .duration(500)
        .style("opacity", 0);
}
})();