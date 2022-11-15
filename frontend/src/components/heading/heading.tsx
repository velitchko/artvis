import React from 'react';

class HeadingComponent extends React.Component<{}, { maintitle: string, subtitle: string }> {

    constructor(props: { maintitle: string, subtitle: string }) {
        super(props);

        this.state = {
            maintitle: props.maintitle || '',
            subtitle: props.subtitle || ''
        };
    }

    render() {
        return (
            <div className="absolute">
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                        { this.state.maintitle.split(' ')[0] }
                        <span className="font-face-kolker text-8xl">{ this.state.maintitle.split(' ')[1] }</span>
                    </h1>
                {this.state.subtitle !== '' &&
                <h2><mark className="px-4 py-2 text-white bg-black rounded">{this.state.subtitle}</mark></h2> 
                }
            </div>
        );
    }
};

export default HeadingComponent;