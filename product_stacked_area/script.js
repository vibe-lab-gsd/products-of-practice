/* defining variables for the width and heigth of the SVG */
const width = document.querySelector("#stackedArea").clientWidth;
const height = document.querySelector("#stackedArea").clientHeight;
const margin = { top: 20, left: 50, right: 20, bottom: 70 };

/*creating the actual SVG */
const context = d3.select("#stackedArea")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const focusWidth = document.querySelector("#chart").clientWidth;
const focusHeight = document.querySelector("#chart").clientHeight;
const focusMargin = { top: 10, left: 10, right: 10, bottom: 0 };

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", focusWidth - focusMargin.left - focusMargin.right)
    .attr("height", focusHeight - focusMargin.top - focusMargin.bottom);

const legendWidth = document.querySelector("#legend").clientWidth;
const legendHeight = document.querySelector("#legend").clientHeight;
const legendMargin = { top: 0, left: 10, right: 0, bottom: 0 };

const legend = d3.select("#legend")
    .append("svg")
    .attr("width", legendWidth - focusMargin.left)
    .attr("height", legendHeight);


/* filter subset of data, grabbing only the rows where the country = China or the US */
const keys = ["model", "drawing", "code", "image", "text", "profession", "building"]

//set out colors based on our list of keys
const colorScale = d3.scaleOrdinal()
    .domain(keys)
    .range(["#03ac4b", "#de2528", "#00add7", "#c474af", "#425ba8", "#f1783b", "#f2c918"])

// Function to offset each layer by the maximum of the previous layer
function offset(series, order) {
    if (!((n = series.length) > 1)) return;
    // Standard series
    for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
        (s0 = s1), (s1 = series[order[i]]);
        let base = d3.max(s0, d => d[1]); // here is where you calculate the maximum of the previous layer
        for (var j = 0; j < m; ++j) {
            // Set the height based on the data values, shifted up by the previous layer
            let diff = s1[j][1] - s1[j][0];
            s1[j][0] = base + 4;
            s1[j][1] = base + diff + 4;
        }
    }
}

const promises = [
    d3.csv("./data/products_rise_run.csv", parseProducts),
    d3.csv("./data/all_dimensions.csv", parse)
];

Promise.all(promises).then(function (data) {

    let nested = d3.nest()
        .key(d => d.year)
        .rollup()
        .entries(data[1])

    console.log(nested)

    let expanded = [];
    nested.forEach(d => {
        for (let i = 0; i < d.values.length; i++) {
            for (let j = 0; j < d.values[i].value; j++) {
                expanded.push({
                    product: d.values[i].product,
                    period: +d.key,
                    id: d.values[i].sub_product,
                    color: d.values[i].color,
                    innovation: d.values[i].innovation,
                    wax_wane: d.values[i].wax_wane
                })
            }
        }
    })
    console.log(expanded)

    let filtered = expanded.filter(d => d.period == 1100)

    const gridHeight = 40;

    function showViz(dataset) {
        let expandedData = [];
        for (let m = 0; m < gridHeight; m++) {
            for (let j = m; j < dataset.length; j += gridHeight) {
                expandedData.push({
                    id: dataset[j].id,
                    product: dataset[j].product,
                    color: dataset[j].color,
                    y: m,
                    innovation: dataset[j].innovation,
                    wax_wane: dataset[j].wax_wane
                })
            }
        }
        console.log(expandedData)

        let legendNest = d3.nest()
            .key(d => d.product)
            .key(d => d.id)
            .rollup()
            .entries(expandedData)

        let nested = d3.nest()
            .key(d => d.y)
            .rollup()
            .entries(expandedData)
        nested.forEach((d) => {
            d.key = +d.key;
            for (let i = 0; i < d.values.length; i++) {
                d.values[i].x = i;
            }
        })
        console.log(nested)


        let yScale = d3.scaleBand()
            .domain(d3.map(nested, d => d.key))
            .range([margin.top, focusHeight - focusMargin.top - focusMargin.bottom])
            .padding(0.1)

        let xScale = d3.scaleBand()
            .domain(d3.map(nested[0].values, d => d.x))
            .range([focusMargin.left, focusWidth - focusMargin.right - focusMargin.left])
            .padding(0.1)

        let grouping = svg.selectAll(".barGroup").data(nested)

        grouping
            .enter()
            .append("g")
            .attr("class", "barGroup")
            .merge(grouping)
            .attr("transform", (d) => `translate(0,${yScale(d.key)})`)

        grouping.exit()
            .remove();

        let bars = d3.selectAll(".barGroup").selectAll("rect").data(d => d.values)

        bars.enter()
            .append("rect")
            .attr("x", function (p) { return xScale(p.x); })
            .attr("opacity", 0)
            .merge(bars)

            .transition()
            .duration(500)
            .delay(function (p, i) { return 10 * i; })
            .attr("x", function (p) { return xScale(p.x); })
            .attr("width", function (p) { return xScale.bandwidth() * p.innovation })
            // .attr("width", function(p) {
            //     if(p.innovation < 0.5) {
            //         return xScale.bandwidth() * 0.3;
            //     } else {
            //         return xScale.bandwidth();
            //     }

            // } )
            .attr("height", yScale.bandwidth())
            .attr("opacity", 1)
            .attr("fill", p => p.color)
            .attr("transform", (p) => {
                if (p.wax_wane === "X") {
                    return "skewX(-20)";
                } else {
                    return "skewX(20)";
                }
            }
            )



        bars.exit()
            .transition()
            .remove();

        //define the tooltip
        let tooltip = d3.select("#chart")
            .append("div")
            .attr("class", "tooltip");


        let legendRects = legend.selectAll("rect").data(legendNest)
        legendRects
            .enter()
            .append("rect")
            .attr("y", 10)
            .attr("x", (d, i) => legendMargin.left + i * 130)
            .attr("width", 120)
            .attr("height", 35)
            .merge(legendRects)
            .transition()
            .duration(500)
            .attr("stroke", d => colorScale(d.key))
            .attr("stroke-width", 2)
            .attr("fill", "black")
        legend.selectAll("rect").on("mouseover", function (d) {
            d3.select(this).attr("fill", d => colorScale(d.key))
            context.selectAll(".path")
                .transition()
                .duration(500)
                .attr("opacity", (p) => {
                    if (p.key === d.key) {
                        return 1.0;
                    } else {
                        return 0.3;
                    }
                })
            d3.selectAll(".barGroup").selectAll("rect")
                .transition()
                .duration(250)
                .attr("opacity", (p) => {
                    if (p.product === d.key) {
                        return 1.0;
                    } else {
                        return 0.3;
                    }
                })
            //make the tooltip visible
            let filteredKeys = []
            let filteredLegendNest = legendNest.filter(p => p.key === d.key)
            for (let i = 0; i < filteredLegendNest[0].values.length; i++) {
                filteredKeys.push(filteredLegendNest[0].values[i].key + "<br>")
            }
            let tooltipText = filteredKeys.join(' ').replace(/_/g, " ")
            console.log(filteredKeys)
            tooltip.style("visibility", "visible")
                .html("<div class=tooltipText>" + "<h3>" + d.key + "</h3>" + "<br>" + tooltipText + "</div>" + "<div class=colors>" + "</div>");
            tooltip.selectAll(".colors").selectAll(".uniqueDiv")
                .data(filteredLegendNest[0].values)
                .enter()
                .append("div")
                .attr("class", "uniqueDiv")
                // .style("fill", )
                .attr("id", d => d.key)
                .attr("top", (d, i) => i * 15)
        }).on("mouseout", function (d) {
            d3.selectAll(".barGroup").selectAll("rect")
                .attr("opacity", 1)
            d3.select(this).attr("fill", "black")
            tooltip.style("visibility", "hidden")
            context.selectAll(".path").attr("opacity", 1)
        })

        legendRects.exit()
            .transition()
            .duration(500)
            .remove()

        let legendLabels = legend.selectAll("text")
            .data(legendNest)

        legendLabels
            .enter()
            .append("text")
            .attr("class", "legendLabel")
            .attr("y", 32)
            .attr("x", (d, i) => legendMargin.left + 10 + i * 130)
            .merge(legendLabels)
            .transition()
            .duration(500)
            .text(d => d.key)
            .attr("fill", "white")

        legendLabels.exit()
            .transition()
            .duration(500)
            .remove()


    }

    showViz(filtered);


    //generate the dataset we'll feed into our chart
    const stackedData = d3.stack()
        // .offset(d3.stackOffsetExpand)
        .offset(offset)
        .keys(keys)(data[0])
        .map((d) => {
            return d.forEach(v => v.key = d.key), d;
        })
    // console.log(stackedData)

    //scales - xScale is a linear scale of the years
    const xScale = d3.scaleLinear()
        .domain([d3.min(data[0], d => d.year), d3.max(data[0], d => d.year)])
        .range([margin.left, width - margin.right]);

    //yScale is a linear scale with a minimum value of 0 and a maximum bsed on the total population maximum
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
        .range([height - margin.bottom - 10, margin.top]);

    //draw the areas
    context.selectAll(".path")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "path")
        .attr("fill", d => colorScale(d.key))
        .attr("d", d3.area()
            .x((d, i) => {
                return xScale(d.data.year);
            })
            .y1(d => yScale(d[0]))
            .y0(d => yScale(d[1]))
        )

    
        

    context.selectAll(".slider_indicator")
        .data(stackedData)
        .enter()
        .append("line")
        .attr("class", "slider_indicator")
        .attr('x1', () => xScale(1100))
        .attr('y1', margin.top)
        .attr('x2', () => xScale(1100))
        .attr('y2', height - margin.bottom - 8)
        .attr('stroke', 'white');

    context.selectAll("circle")
        .data(stackedData)
        .enter()
        .append("circle")
        .attr('cx', () => xScale(1100))
        .attr('cy', d => yScale(d[0][1]))
        .attr("r", 4)
        .attr('fill', 'white')
        .attr("stroke", "black")

    // context.selectAll(".stackLabels")
    //     .data(stackedData)
    //     .enter()
    //     .append("text")
    //     .attr("class", "stackLabels")
    //     .attr("x", 300)
    //     .attr("y", 200)
    //     // .attr("y", (d,i) => i * 200)
    //     // .attr("y", d => yScale(d[0][1]))
    //     .attr("text", d => d.key)
    //     .attr("transform", function (d) { return ("translate(24,25)rotate(90)") })

    //SLIDER

    var sliderData = [{
        year: 1100,
        name: "Ancient & Medieval Europe"
    }, {
        year: 1500,
        name: "Italian Renaissance"
    }, {
        year: 1700,
        name: "French Revolution | Beaux Arts"
    }, {
        year: 1900,
        name: "Industrial Revolution | Garden City"
    }, {
        year: 1950,
        name: "American Post-War | Information Age"
    }, {
        year: 2020,
        name: "Post-Digital Age"
    },
    ];

    d3.select('p#value-step').text("Ancient & Medieval Europe")

    var sliderStep = d3
        .sliderBottom()
        .min(1100)
        .max(2020)
        .width(width - margin.left - margin.right)
        .tickFormat(d3.format("d"))
        .ticks(6)
        .marks([1100, 1500, 1700, 1900, 1950, 2020])
        .tickValues([1100, 1500, 1700, 1900, 1950, 2020])
        .displayValue([1100, 1500, 1700, 1900, 1950, 2020])
        .default(1100)
        .handle(
            d3
                .symbol()
                .type(d3.symbolCircle)
                .size(200)()
        )
        .on('onchange', (val) => {
            d3.select('p#value-step').text((function () {
                for (let i = 0; i < sliderData.length; i++) {
                    if (val === sliderData[i].year) {
                        return sliderData[i].name;
                    }
                }
            }));
            filtered = expanded.filter(d => d.period == val)
            showViz(filtered)
            d3.selectAll(".slider_indicator")
                .attr("x1", () => xScale(val))
                .attr("x2", () => xScale(val))
            d3.selectAll("circle")
                .attr('cx', () => xScale(val))
                .attr('cy', (d) => {
                    for (let i = 0; i < sliderData.length; i++) {
                        if (val === sliderData[i].year) {
                            return yScale(d[i][1]);
                        }
                    }
                })


        });


    var gStep = context.append('g')
        .attr("transform", `translate(${margin.left},${height - margin.bottom})`);

    gStep.call(sliderStep);
    gStep.selectAll(".tick text").attr("transform", function (d) { return ("translate(24,25)rotate(90)") })

});



// END PRIMARY FUNCTION

function parse(d) {
    return {
        year: d.year,
        product: d.product,
        sub_product: d.sub_product,
        color: d.color,
        value: +d.sub_prod_value,
        innovation: +d.innovation,
        wax_wane: d.wax_wane
    }
}

function parseProducts(d) {
    return {
        year: +d.year,
        building: +d.building,
        code: +d.code,
        drawing: +d.drawing,
        image: +d.image,
        model: +d.model,
        profession: +d.profession,
        text: +d.text
    }
}

