import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
//import data from '../../resources/map.geo.json';
import data from '../../resources/complete-map.geo.json';
import { Venue } from '../../models/venue.model';
import { Item } from '../../models/item.model';
import GET_EXHIBITIONS_BY_ARTIST from '../../queries/exhibitionsByArtist';
import { Host } from '../../models/host.model';
import { Location } from '../../models/location.model';

type MetaExhibition = Exhibition & { isCommon: boolean, artworksTotal: number, artworksBase: number, percentCompare: number, percentBase: number };

//class ExhibitionMapComponent extends React.Component<{ compareWith: Artist | null, exhibitionMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }, { compareWith: Artist | null, exhibitionMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }> {

class ExhibitionMapComponent extends React.Component<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }, { compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean, marks: string }> {

    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private circleContainer: d3.Selection<any, any, any, any> | undefined;
    private borderContainer: d3.Selection<any, any, any, any> | undefined;

    private rScale: d3.ScalePower<number, number>;
    private totalRScale: d3.ScalePower<number, number>;
    private mapRScale: d3.ScalePower<number, number>;

    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private color: d3.ScaleOrdinal<string, string>;

    private exhibitions: Array<Exhibition> = [];
    private exhibStats: Array<MetaExhibition> = [];
    private commonExhibitions: Array<MetaExhibition> = [];
    private toggle: Array<string> = [];

    //constructor(props: { compareWith: Artist | null, exhibitionMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }) {
    constructor(props: { compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean, marks: string }) {

        super(props);

        this.state = {
            width: props.width,
            height: props.height,
            coEx: 3,
            selection: false,
            exhibitions: props.exhibitions,
            compareWith: props.compareWith,
            //exhibitionMap: props.exhibitionMap
            exhibStatistics: props.exhibStatistics,
            marks: "circles"
        };

        this.svgContainer = undefined;

        this.rScale = d3.scaleSqrt();
        this.mapRScale = d3.scaleSqrt();
        this.totalRScale = d3.scaleSqrt();

        this.color = d3.scaleOrdinal<string>(d3.schemeCategory10);
        this.tooltip = undefined;
        this.toggle = ["Circles", "Halfcircles"];
    }


    init(): void {

        if (this.svgContainer) return;

        this.rScale = d3.scaleSqrt()
            // .domain([0, 100])
            //.range([2, 6]);
            .range([1, 6]);

        this.mapRScale = d3.scaleSqrt()
            // .domain([0, 100])
            //.range([2, 6]);
            .range([1, 4]);

        this.totalRScale = d3.scaleSqrt()
            // .domain([0, 100])
            //.range([2, 6]);
            .range([1, 6]);

        this.svgContainer = d3.select('#map');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 50])
            .extent([[0, 0], [this.state.width, this.state.height]])
            .on('zoom', this.zoomed.bind(this));

        this.svgContainer
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('pointer-events', 'all')
            .call(zoom);

        const everything = this.svgContainer.append('g').attr('id', 'map-everything');

        // setup groups
        this.borderContainer = everything.append('g').attr('id', 'map-borders');
        this.circleContainer = everything.append('g').attr('id', 'map-markers');
        this.tooltip = everything.append('g').attr('id', 'map-tooltip');


        //TODO: put at least circles in a separate function
        //map projection
        let projection = d3.geoMercator();

        let geoGenerator = d3.geoPath()
            .projection(projection);


        //draw map
        this.borderContainer
            .selectAll('path')
            .data(data.features)
            .join('path')
            .attr('d', (d: any) => {
                return geoGenerator(d);
            });



        this.exhibitions = this.checkExhibitions(this.state.exhibitions);
        this.exhibStats = this.state.exhibStatistics;

        this.rScale.domain([Math.min(...this.exhibStats.map(g => g.artworksBase)), Math.max(...this.exhibStats.map(g => g.artworksBase))]);
        this.mapRScale.domain([Math.min(...this.exhibStats.map(g => g.artworksTotal)), Math.max(...this.exhibStats.map(g => g.artworksTotal))]);
        this.totalRScale.domain([Math.min(...this.exhibStats.map(g => g.artworksTotal)), Math.max(...this.exhibStats.map(g => g.artworksTotal))]);
        this.drawCircles();

    }


    drawCircles(): void {
        if (!this.svgContainer) return;

        if (!this.circleContainer) return;

        let projection = d3.geoMercator();

        //sort descending by artworksbase so bigger circles are drawn before smaller ones and there are less problems with overlap
        this.exhibStats.sort((a, b) => { return b.artworksBase - a.artworksBase });
        /* console.log("sorted");
        console.log(this.exhibStats); */

        /*         //PIE CHARTS________________________________________________
                // Pie chart variables:
                let arc = d3.arc<MetaExhibition>()
                    .innerRadius(0)
                    // .outerRadius((d: any) => {
                    //     console.log("data");
                    //     console.log(d);
                    //     return this.mapRScale(d.data);
                    // })
                    .outerRadius(3);
        
                let pie = d3.pie()
                    .sort(null)
                    .value((d: any) => { return d; });
        
        
                let color = d3.schemeCategory10;
        
                let points = this.circleContainer.selectAll('g')
                    .data(this.exhibStats)
                    //           .enter()
                    //          .append('g')
                    .join('g')
                    .attr('transform', (d: MetaExhibition) => {
                        let long = -999999999.0;
                        let lat = -99999999999.0;
        
                        if (d.tookPlaceInHosts[0]) {
                            long = parseFloat(d.tookPlaceInHosts[0].longitude);
                            lat = parseFloat(d.tookPlaceInHosts[0].latitude);
        
                        }
                        return 'translate(' + projection([long, lat]) + ')'
                        //return 'translate(0,0)';
                    })
                    .attr('class', 'pies');
        
                //        let pies = points.selectAll('.pies')
                let pies = points.selectAll('path')
                    .data((d: MetaExhibition) => {
                        //return (pie([100, 10, 50, 60, 75]));
                        //return pie([d.artworksBase]);
                        return pie([d.artworksBase, d.artworksTotal - d.artworksBase]);
                        //return pie([{ label: d.artworksBase, radius: d.artworksBase},{label: d.artworksTotal - d.artworksBase, radius: d.artworksBase}]);
                    })
                    //.data(pie([100, 10, 50, 60, 75]))
                    //           .enter()
                    //           .append('g')
                    //           .attr('class', 'arc');
        
                    //this.circleContainer.selectAll('.pies')
                    //      pies.append('path')
                    .join('path')
                    .attr('d', (d: any) => {
                        return arc(d);
                    })
                    .attr("fill", function (d, i) {
                        return color[i + 1];
                    })
                    .attr('opacity', 0.0);
                // .attr('opacity', 0.7);
                //PIE CHARTS END__________________________________________________________
         */



        //CIRCLE MARKS___________________________________________________________
        //draw markers for exhibitions on map
        this.circleContainer
            .selectAll('circle')
            //.data(this.exhibitions)
            .data(this.exhibStats)
            //.enter()
            //.append('circle')
            .join('circle')
            .attr('id', (d: MetaExhibition) => `node-${d.id}-${d.startdate}-${d.artworksTotal}`)
            .attr('cx', (d: MetaExhibition) => {

                //for undefined hosts, so they are not shown on the map
                let long = -999999999.0;
                let lat = -99999999999.0;

                if (d.tookPlaceAtLocations[0]) {
                    long = d.tookPlaceAtLocations[0].locatedAtGeonames[0].longitude;
                    lat = d.tookPlaceAtLocations[0].locatedAtGeonames[0].latitude;

                }
                return projection([long, lat])![0];


            })
            .attr('cy', (d: MetaExhibition) => {

                //for undefined hosts, so they are not shown on the map
                let long = -99999999.0;
                let lat = -999999999.0;
                if (d.tookPlaceAtLocations[0] && d.tookPlaceAtLocations[0].locatedAtGeonames[0]) {
                    long = d.tookPlaceAtLocations[0].locatedAtGeonames[0].longitude;
                    lat = d.tookPlaceAtLocations[0].locatedAtGeonames[0].latitude;

                }
                return projection([long, lat])![1];


            })
            //.attr("r", 2)
            .attr('r', (d: MetaExhibition) => this.rScale(d.artworksBase))
            .attr('opacity', (d: MetaExhibition) => {
                if (d.tookPlaceAtLocations[0]) {
                    return 0.5;
                } //hide exhibitions without hosts
                else return 0;
            })
            .style("fill", "#1f77b4")
            //.style("fill", "crimson")
            /* .style("fill", (d: MetaExhibition) => {

                //console.log("compareWith ");
                //console.log(this.state.compareWith);
                //console.log(this.props.compareWith);
                const common = this.props.compareWith?.exhibitedExhibitions?.find((exhibition: Exhibition) => exhibition.id == d.id);
                return common ? "yellow" : "crimson";

            }) */
            .append("title").append('tspan')
            .text((d: MetaExhibition) => `${d.title} (${d.startdate})\n${this.checkForHost(d.tookPlaceAtLocations).name}, ${this.checkForHost(d.tookPlaceAtLocations).place}\n${d.artworksBase} artworks of ${d.artworksTotal} in total`);

        //CIRCLE MARKS END_______________________________________________________________


        //tooltip
        //TODO: fix tooltip so all exhibitions in same place are shown in tooltip
        /* this.circleContainer
            .selectAll('circle')
            .on('mouseover', (d: PointerEvent) => {

                // get data from d 
                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as MetaExhibition;

                if (!data) return;

                // show tooltip with name of target node
                if (this.tooltip) {
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');

                    // get circle cx and cy
                    const cx = +d3.select(`#${id}`).attr('cx');
                    const cy = +d3.select(`#${id}`).attr('cy');

                    // const cx = d3.pointer(d, d3.zoomTransform(d.target as SVGCircleElement))[0];
                    // const cy = d3.pointer(d, d3.zoomTransform(d.target as SVGCircleElement))[1];
                    //tooltip.attr("transform", `translate(${[cx, cy]})`);

                    // console.log("cx + cy " + cx + " " + cy);

                    // set tooltip position to mouse position
                    tooltip.attr('x', cx + 15);
                    tooltip.attr('y', cy + 15);

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${data.title} (${data.startdate})`);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '2em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${data.tookPlaceInHosts[0].name}, ${data.tookPlaceInHosts[0].place}`);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '3em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${data.artworksBase} artworks of ${data.artworksTotal} in total`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();
                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }

                // highlight all links with same targetId
                // const links = this.links.filter((link: Link) => link.targetId == data.targetId);
                // links.forEach((link: Link) => {
                //     const id = `node-${link.target.id}-${link.props.data.year}`;
                //     const circle = this.svgContainer?.select(`#${id}`);

                //     if (!circle) return;

                //     circle.attr('stroke', 'black');
                //     circle.attr('stroke-width', 2);
                // });

                // pass year to mouseOverCallBack
                this.mouseOverCallBack(data.startdate);
                //this.highlightCircle(data.startdate);
            })
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                // clear all highlights
                this.circleContainer?.selectAll('circle').attr('stroke', 'none');

                // pass year to mouseOverCallBack
                this.mouseOverCallBack(0);
                //this.highlightCircle(0);
            }); */

        this.circleContainer.exit().remove();




    }

    drawHalfcircles() {
        if (!this.svgContainer) return;

        if (!this.circleContainer) return;

        let projection = d3.geoMercator();

        this.exhibStats.sort((a, b) => { return b.artworksBase - a.artworksBase });

        /* console.log("half circles exhibsort");
        console.log(this.exhibStats); */

        const artworksPerCityTotal = new Map<string, number>();
        const artworksPerCity = new Map<string, number>();

        this.exhibStats.forEach((exhibition: MetaExhibition) => {
            if (exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0]) {
                const latLong = exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].latitude + "," + exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].longitude;

                if (artworksPerCityTotal.has(latLong)) {
                    const count = artworksPerCityTotal.get(latLong) || 0;
                    artworksPerCityTotal.set(latLong, count + exhibition.artworksTotal);
                } else {
                    artworksPerCityTotal.set(latLong, exhibition.artworksTotal);
                }

                if (artworksPerCity.has(latLong)) {
                    const count = artworksPerCity.get(latLong) || 0;
                    artworksPerCity.set(latLong, count + exhibition.artworksBase);
                } else {
                    artworksPerCity.set(latLong, exhibition.artworksBase);
                }
            }
        });

        /* console.log("artworks per city");
        console.log(artworksPerCity);
        console.log("artworks per city total");
        console.log(artworksPerCityTotal); */




        //maps to arrays
        const artworks: Array<{ latitude: string, longitude: string, count: number }> = [];
        artworksPerCity.forEach((value: number, key: string) => {
            const latLong = key.split(",");
            const item = { latitude: latLong[0], longitude: latLong[1], count: value };

            artworks.push(item);


        });

        artworks.sort((a, b) => b.count - a.count);

        /* console.log("sorted artworks");
        console.log(artworks); */

        const artworksTotal: Array<{ latitude: string, longitude: string, count: number }> = [];
        artworksPerCityTotal.forEach((value: number, key: string) => {
            const latLong = key.split(",");
            const item = { latitude: latLong[0], longitude: latLong[1], count: value };

            artworksTotal.push(item);
        });

        artworksTotal.sort((a, b) => b.count - a.count);
        /* console.log("sorted artworkstotal");
        console.log(artworksTotal); */

        const totalHalfCircles = this.circleContainer?.selectAll('.total-half-circle');

        totalHalfCircles
            .data(artworksTotal)
            .join('path')
            .attr('fill', 'gray')
            .attr('fill-opacity', 0.75)
            .attr('stroke', '#1f77b4')
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 0.05)
            .attr('class', 'total-half-circle')
            .attr('id', (d: { latitude: string, longitude: string, count: number }) => `total-half-circle-${d.latitude + "-" + d.longitude}`)
            .attr('d', (d: { latitude: string, longitude: string, count: number }) => {
                const outerRadius = d.count === 0 ? 3 : this.totalRScale ? this.totalRScale(d.count) : 3;
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: -Math.PI,
                    endAngle: 0
                }) as string;
            })
            .attr('transform', (d: { latitude: string, longitude: string, count: number }) => {
                return 'translate(' + projection([parseFloat(d.longitude), parseFloat(d.latitude)]) + ')';
            })
            .append("title").append('tspan')
            .text((d: { latitude: string, longitude: string, count: number }) => `${d.count} artworks in total`);
        /* .on('mouseover', (event: any, d: { latitude: string, longitude: string, count: number }) => {
            if (this.tooltip) {
                const tooltip = this.tooltip.append('rect');
                tooltip.attr('fill', 'black');
                // this.tooltip.style('display', 'block');
                // set tooltip border to red and fill to white
                const xPos = this.xScale ? this.xScale(d.year) : 0;
                const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                tooltip
                    .attr('fill', 'black')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 15)

                // append text to tooltip
                const text = this.tooltip.append('text');

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 15)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${this.state.artist.firstname} ${this.state.artist.lastname} (${d.year})`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 30)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${d.exhibitions} exhibitions`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 45)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${d.items} artworks`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 60)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                // get bbox of text
                const bbox = text.node()?.getBBox();

                if (bbox) {
                    // set tooltip width and height to bbox width and height
                    tooltip.attr('width', bbox.width + 20);
                    tooltip.attr('height', bbox.height + 5);
                }

                this.tooltip.raise();
            }

            this.showTimeCallBack(d.year);
            this.highlightCircleInNetwork(d.year);
        }) */


        /* .on('mouseout', () => {
            this.tooltip?.selectAll('rect').remove();
            this.tooltip?.selectAll('text').remove();
            // lower tooltip 
            this.tooltip?.lower();

            this.showTimeCallBack(0);
            this.highlightCircleInNetwork(0);
        }); */

        const artistHalfCircles = this.circleContainer?.selectAll('.artist-half-circle');

        artistHalfCircles
            .data(artworks)
            .join('path')
            .attr('fill', '#1f77b4')
            .attr('fill-opacity', 0.75)
            .attr('stroke', 'gray')
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 0.05)
            .attr('class', 'artist-half-circle')
            .attr('id', (d: { latitude: string, longitude: string, count: number }) => `artist-half-circle-${d.latitude + "-" + d.longitude}`)
            .attr('d', (d: { latitude: string, longitude: string, count: number }) => {//rscale
                const outerRadius = d.count === 0 ? 3 : this.rScale ? this.rScale(d.count) : 3;
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: Math.PI,
                    endAngle: 0
                }) as string;
            })
            .attr('transform', (d: { latitude: string, longitude: string, count: number }) => {
                return 'translate(' + projection([parseFloat(d.longitude), parseFloat(d.latitude)]) + ')';
            })
            .append("title").append('tspan')
            .text((d: { latitude: string, longitude: string, count: number }) => `${d.count} artworks by the artist`);;
        /* .on('mouseover', (event: any, d: { year: number, exhibitions: number, items: number }) => {
            if (this.tooltip) {
                const tooltip = this.tooltip.append('rect');
                tooltip.attr('fill', 'black');
                // this.tooltip.style('display', 'block');
                // set tooltip border to red and fill to white
                const xPos = this.xScale ? this.xScale(d.year) : 0;
                const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                tooltip
                    .attr('fill', 'black')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 15)

                // append text to tooltip
                const text = this.tooltip.append('text');

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 15)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${this.state.artist.firstname} ${this.state.artist.lastname} (${d.year})`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 30)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${d.exhibitions} exhibitions`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 45)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`${d.items} artworks`);

                text.append('tspan')
                    .attr('x', xPos + 15)
                    .attr('y', yPos + 60)
                    .attr('dy', '1em')
                    .attr('dx', '1em')
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                // get bbox of text
                const bbox = text.node()?.getBBox();

                if (bbox) {
                    // set tooltip width and height to bbox width and height
                    tooltip.attr('width', bbox.width + 20);
                    tooltip.attr('height', bbox.height + 5);
                }

                this.tooltip.raise();
            }
            this.showTimeCallBack(d.year);
            this.highlightCircleInNetwork(d.year);
        }) */

        /*  .on('mouseout', () => {
             this.tooltip?.selectAll('rect').remove();
             this.tooltip?.selectAll('text').remove();
             // lower tooltip 
             this.tooltip?.lower();

             this.showTimeCallBack(0);
             this.highlightCircleInNetwork(0);
         }); */

        totalHalfCircles.exit().remove();
        artistHalfCircles.exit().remove();

    }



    highlightCircle(year: number): void {
        // select the circle with the same year as the year passed in
        // change the stroke to yellow and make it dashed update stroke-width to 2

        if (!this.circleContainer) return;

        if (year == 0) {
            this.circleContainer.selectAll('circle')
                .attr('stroke', '#e3e3e3')
                .attr('fill', 'none')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', 0)
                .lower();
            return;
        } else {
            this.circleContainer?.select('#circle-' + year)
                .attr('stroke', 'orange')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', 5)
                .raise();
        }
    }

    mouseOverCallBack(year: number) {
        if (this.props.mouseOverCallBack) this.props.mouseOverCallBack(year);
    }

    componentDidMount(): void {
        // get map-container element width and height and set state
        const width = document.getElementById('map-container')?.clientWidth;
        const height = document.getElementById('map-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
        // set resize handler to window
        window.addEventListener('resize', this.onResize);

        // this.init();
    }

    componentDidUpdate(prevProps: Readonly<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }>, prevState: Readonly<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }>, snapshot?: any): void {

        //console.log("component did update");
        //console.log(prevProps.compareWith);
        //console.log(this.props.compareWith);
        // set state if props.compareWith changes and update results.exhibitions
        if (prevProps.compareWith !== this.props.compareWith) {
            //this.setState((prevState: any) => {
            // update results.exhibitions
            /* const exhibitions = new Array<MetaExhibition>();
            prevState.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: 0, percentCompare: 0 };
                
                const isCommon = this.props.compareWith?.exhibitedExhibitions?.find((exh: Exhibition) => exh.id === exhibition.id);
                metaExhibition.isCommon = isCommon ? true : false;
                metaExhibition.percentBase = exhibition.percentBase;
                metaExhibition.percentCompare = this.getPercentage(metaExhibition, this.props.compareWith?.id);
                
                // const percentBase = this.state..artistsExhibited?.length / this.props.compareWith?.exhibitedExhibitions?.length;
                exhibitions.push(metaExhibition);
            }); */
            // sort by isCommon
            /* exhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                if(a.isCommon && !b.isCommon) return -1;
                if(!a.isCommon && b.isCommon) return 1;
                return 0;
            });
*/

            /*             const commonExhibitions = new Array<MetaExhibition>();
                        //console.log("exhibStats");
                        //console.log(this.exhibStats);
                        this.exhibStats.forEach((exhibition: MetaExhibition) => {
        
                            const metaExhibition: MetaExhibition = { ...exhibition };
        
                            const isCommon = this.props.compareWith?.exhibitedExhibitions?.find((exh: Exhibition) => exh.id === exhibition.id);
                            metaExhibition.isCommon = isCommon ? true : false;
        
                            commonExhibitions.push(metaExhibition);
        
                        });
        
                        commonExhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                            if (a.isCommon && !b.isCommon) return 1;
                            if (!a.isCommon && b.isCommon) return -1;
                            return 0;
                        }); */

            /* this.exhibStats.sort((a: MetaExhibition, b: MetaExhibition) => {
                if (a.isCommon && !b.isCommon) return 1;
                if (!a.isCommon && b.isCommon) return -1;
                return 0;
            }); */
            //console.log(this.exhibStats);
            const artistId = this.props.compareWith?.id;

            client.query({
                query: GET_EXHIBITIONS_BY_ARTIST,
                variables: {
                    searchId: artistId
                }
            }).then(result => {
                this.setState(prevState => ({ ...prevState, compareWith: result.data.artists[0] }), () => {
                    this.drawCompare(result.data.artists[0]);
                });

            });

            //this.colorCommonExhibitions();
            //this.init();
            //return { ...prevState, compareWith: this.props.compareWith }

            //this.drawCompare(this.props.compareWith)
            //this.colorCommonExhibitions();
            //this.init();
            //return { ...prevState, compareWith: this.props.compareWith }
            //return { ...prevState, compareWith: this.props.compareWith, results: { ...prevState.results, exhibitions: exhibitions } } 

            //});

        }
    }

    drawCompare(compareWith: Artist | null): void {
        /* console.log("compare with");
        console.log(compareWith);

        console.log("drawcompare state");
        console.log(this.state.compareWith);

        console.log("drawcompare props");
        console.log(this.props.compareWith); */

        //just color the circles of the common exhibitions
        if (this.state.marks === "circles") {
            this.colorCommonExhibitions();
        }
        //draw common artist half circles
        else {
            //get common exhibitions and numbers for compare artist
            if (compareWith) {
                this.circleContainer?.selectAll('.artist-half-circle').remove();

                const commonExhibitions: Array<MetaExhibition> = [];

                this.exhibStats.forEach((exhibition: MetaExhibition) => {
                    const common = compareWith?.exhibitedAtExhibitions?.find((exhib: Exhibition) => exhibition.id == exhib.id);

                    if (common) {
                        //console.log(common.catalogueEntriesEntryIn);
                        const entries = common.exhibitsItems?.filter((entry: Item) => entry.artistsCreated[0].id === compareWith.id)?.length;
                        //console.log("entries" + entries);
                        //TODO stuffed number of artworks of ccompare artist into field for percentages for now... maybe change
                        const metaExhibition: MetaExhibition = { ...exhibition, isCommon: true, percentCompare: entries };
                        commonExhibitions.push(metaExhibition);
                    }

                });
                /* console.log("common");
                console.log(commonExhibitions); */


                const artworksBase = new Map<string, number>();
                const artworksCompare = new Map<string, number>();

                commonExhibitions.forEach((exhibition: MetaExhibition) => {
                    if (exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0]) {
                        //console.log("in host");
                        const latLong = exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].latitude + "," + exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].longitude;

                        if (artworksCompare.has(latLong)) {
                            const count = artworksCompare.get(latLong) || 0;
                            artworksCompare.set(latLong, count + exhibition.percentCompare);
                        } else {
                            artworksCompare.set(latLong, exhibition.percentCompare);
                        }
                    }
                });

                this.exhibStats.forEach((exhibition: MetaExhibition) => {
                    if (exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0]) {
                        const latLong = exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].latitude + "," + exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0].longitude;

                        if (artworksBase.has(latLong)) {
                            const count = artworksBase.get(latLong) || 0;
                            artworksBase.set(latLong, count + exhibition.artworksBase);
                        } else {
                            artworksBase.set(latLong, exhibition.artworksBase);
                        }
                    }
                });
                /* console.log("artworksbase");
                console.log(artworksBase);

                console.log("artworkscompare");
                console.log(artworksCompare); */




                const artworks: Array<{ latitude: string, longitude: string, count: number }> = [];
                artworksBase.forEach((value: number, key: string) => {
                    const latLong = key.split(",");
                    const item = { latitude: latLong[0], longitude: latLong[1], count: value };

                    artworks.push(item);


                });

                artworks.sort((a, b) => b.count - a.count);

                if (!this.svgContainer) return;

                if (!this.circleContainer) return;

                let projection = d3.geoMercator();

                const artistHalfCircles = this.circleContainer?.selectAll('.artist-half-circle');
                const compareHalfCircles = this.circleContainer?.selectAll('.compare-half-circle');

                const artBaseSorted = new Map([...artworksBase.entries()].sort((a, b) => b[1] - a[1]));
                /* console.log("artbase sorted");
                console.log(artBaseSorted); */

                artBaseSorted.forEach((value: number, key: string) => {
                    //draw common exhibitions with circles for both artists
                    if (artworksCompare.has(key)) {
                        const compare = artworksCompare.get(key) || 0;
                        const latLong = key.split(",");
                        const baseData = { latitude: latLong[0], longitude: latLong[1], artist: "base", count: value };
                        const compareData = { latitude: latLong[0], longitude: latLong[1], artist: "compare", count: compare };

                        const data: Array<{ latitude: string, longitude: string, artist: string, count: number }> = [];
                        if (compare > value) {
                            data.push(compareData);
                            data.push(baseData);
                        }
                        else {
                            data.push(baseData);
                            data.push(compareData);
                        }

                        artistHalfCircles
                            .data(data)
                            .join('path')
                            .attr('fill', (d: { latitude: string, longitude: string, artist: string, count: number }) => {
                                if (d.artist === "base") {
                                    return '#1f77b4';
                                }
                                else {
                                    return "#ff7f0e";
                                }
                            })
                            .attr('fill-opacity', 0.75)
                            .attr('stroke', 'gray')
                            .attr('stroke-opacity', 0.5)
                            .attr('stroke-width', 0.05)
                            .attr('class', 'artist-half-circle')
                            .attr('id', (d: { latitude: string, longitude: string, artist: string, count: number }) => `artist-half-circle-${d.latitude + "-" + d.longitude}`)
                            .attr('d', (d: { latitude: string, longitude: string, artist: string, count: number }) => { //rScale
                                const outerRadius = d.count === 0 ? 3 : this.rScale ? this.rScale(d.count) : 3;
                                return d3.arc()({
                                    innerRadius: 0,
                                    outerRadius: outerRadius,
                                    startAngle: Math.PI,
                                    endAngle: 0
                                }) as string;
                            })
                            .attr('transform', (d: { latitude: string, longitude: string, count: number }) => {
                                return 'translate(' + projection([parseFloat(d.longitude), parseFloat(d.latitude)]) + ')';
                            })
                            .append("title").append('tspan')
                            .text((d: { latitude: string, longitude: string, artist: string, count: number }) => {
                                if (d.artist === "base") {
                                    return `${d.count} artworks by the artist`;
                                }
                                else {
                                    return `${d.count} artworks by the compared artist`
                                }
                            });


                    }
                    //the compare artist has no exhibitions in this place -> only draw artists half circle
                    else {

                        const latLong = key.split(",");
                        const data: Array<{ latitude: string, longitude: string, count: number }> = [];
                        const baseData = { latitude: latLong[0], longitude: latLong[1], count: value };

                        data.push(baseData);

                        artistHalfCircles
                            .data(data)
                            .join('path')
                            .attr('fill', '#1f77b4')
                            .attr('fill-opacity', 0.75)
                            .attr('stroke', 'gray')
                            .attr('stroke-opacity', 0.5)
                            .attr('stroke-width', 0.05)
                            .attr('class', 'artist-half-circle')
                            .attr('id', (d: { latitude: string, longitude: string, count: number }) => `artist-half-circle-${d.latitude + "-" + d.longitude}`)
                            .attr('d', (d: { latitude: string, longitude: string, count: number }) => {//rScale
                                const outerRadius = d.count === 0 ? 3 : this.rScale ? this.rScale(d.count) : 3;
                                return d3.arc()({
                                    innerRadius: 0,
                                    outerRadius: outerRadius,
                                    startAngle: Math.PI,
                                    endAngle: 0
                                }) as string;
                            })
                            .attr('transform', (d: { latitude: string, longitude: string, count: number }) => {
                                return 'translate(' + projection([parseFloat(d.longitude), parseFloat(d.latitude)]) + ')';
                            })
                            .append("title").append('tspan')
                            .text((d: { latitude: string, longitude: string, count: number }) => `${d.count} artworks by the artist`);

                    }
                });



            }
        }
    }

    /** Colors circles on map according to if 2 specified artists have common exhibitions (yellow) or not (red) */
    colorCommonExhibitions() {
        if (!this.svgContainer) return;
        //console.log("color common");

        this.circleContainer?.selectAll('circle')
            .data(this.exhibStats)
            /* .attr('stroke', (d: MetaExhibition) => {
                const common = this.props.compareWith?.exhibitedExhibitions?.find((exhibition: Exhibition) => exhibition.id == d.id);
                return common ? "wheat" : "crimson";
            })
            .attr('stroke-width', (d: MetaExhibition) => {
                const common = this.props.compareWith?.exhibitedExhibitions?.find((exhibition: Exhibition) => exhibition.id == d.id);
                return common ? 4 : 0;

            }) */
            .style("fill", (d: MetaExhibition) => {

                //console.log(d.isCommon + " " + d.title + " " + d.id + " " + this.props.compareWith?.exhibitedExhibitions?.find((exhibition: Exhibition) => exhibition.id == d.id)?.title);

                //console.log("compareWith ");
                //console.log(this.state.compareWith);
                //console.log(this.props.compareWith);
                const common = this.props.compareWith?.exhibitedAtExhibitions?.find((exhibition: Exhibition) => exhibition.id == d.id);
                //return common ? "yellow" : "crimson";
                //return common ? "#ff7f0e" : "#1f77b4";
                return common ? "yellow" : "#1f77b4";
                // return common ? "wheat" : "crimson";
                //return d.isCommon ? "yellow" : "crimson";

            });


    }


    /** Checks if there is a host, otherwise returns dummy host (for filling the tooltip with data) */
    checkForHost(hosts: Location[]): Host {
        if (hosts[0]) {
            return {
                id: hosts[0].id,
                country: hosts[0].locatedAtGeonames[0].country_code || 'Unknown',
                name: hosts[0].locatedAtGeonames[0].name || 'Unknown',
                latitude: hosts[0].locatedAtGeonames[0].latitude || 9999999,
                longitude: hosts[0].locatedAtGeonames[0].longitude || 9999999,
                place: hosts[0].place || 'Unknown',
                place_tgn: hosts[0].place_tgn || 0,
                type: hosts[0].type || 'Unknown',
                exhibitionsTookPlaceIn: [] // TODO: FIX
            };
        }

        return {
            id: -1,
            country: 'Unknown',
            name: 'Unknown',
            latitude: 9999999,
            longitude: 9999999,
            place: 'Unknown',
            place_tgn: 0,
            type: 'Unknown',
            exhibitionsTookPlaceIn: []
        };
    }


    onResize = () => {
        // get map-container element width and height and set state
        const width = document.getElementById('map-container')?.clientWidth;
        const height = document.getElementById('map-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    zoomed($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (!this.svgContainer) return;
        //this.svgContainer.select('#map-everything').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);

        //only scale map + markers, not the tooltips
        //console.log("x y " + $event.transform.x + " " + $event.transform.y);
        this.svgContainer.select('#map-borders').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
        this.svgContainer.select('#map-markers').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
        //this.svgContainer.select('#map-tooltip').selectAll('rect').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);

    }

    //TODO return unique exhibitions, not 1 for each artwork
    checkExhibitions(exhibitions: Array<Exhibition> | undefined): Array<Exhibition> {

        if (exhibitions) {
            return exhibitions;
        }
        else return new Array<Exhibition>;
    }

    handleMarkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        //console.log("marker change " + event.target.value);

        this.setState(prevState => ({ ...prevState, marks: event.target.value }), () => {
            if (event.target.value === "circles") {
                this.circleContainer?.selectAll('.artist-half-circle').remove();
                this.circleContainer?.selectAll('.total-half-circle').remove();
                this.drawCircles();


            }
            else {
                this.circleContainer?.selectAll('circle').remove();
                this.drawHalfcircles();
            }

            /* console.log("props comparewith");
            console.log(this.props.compareWith)
            console.log("state comparewith");
            console.log(this.state.compareWith); */
            if (this.state.compareWith) {
                //console.log("drawcompare");
                this.drawCompare(this.state.compareWith);
            }

            /* console.log("marks state");
            console.log(this.state.marks); */
        });


    };


    render() {
        return (
            <>

                <div className="absolute w-auto left-3">
                    <div className="block">
                        <select id="order-by" onChange={this.handleMarkChange}>
                            <option value="circles">Number of artist's exhibited artworks</option>
                            <option value="halfcircles">Total vs. artist's artworks in exhibitions</option>
                        </select>
                    </div>
                </div>
                <svg id='map' width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default ExhibitionMapComponent;