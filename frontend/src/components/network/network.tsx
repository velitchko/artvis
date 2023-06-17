import React from 'react';
import _ from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';


class NetworkComponent extends React.Component<{ nodes: Array<Node>, links: Array<Link>, width: number, height: number}, { nodes: Array<Node>, links: Array<Link>, width: number, height: number }> {

    constructor(props: { nodes: Array<Node>, links: Array<Link>, width: number, height: number}) {
        super(props);

        this.state = {
            nodes: props.nodes,
            links: props.links,
            width: props.width,
            height: props.height
        };
    }

    componentDidMount(): void {
        
    }
    

    render() {
        return (
            <>
            </>
        )
    }
};

export default NetworkComponent;