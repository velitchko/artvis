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
            <div className="text-center">
                <h1 className="mb-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-gray-900">
                        { this.state.maintitle.split(' ')[0] }
                        <span className="font-face-kolker md:text-7xl lg:text-8xl">{ this.state.maintitle.split(' ')[1] }</span>
                    </h1>
                {this.state.subtitle !== '' &&
                <h2 className="text-sm sm:text-base md:text-lg text-white font-normal">
                    <span className="px-4 py-2 bg-black rounded-md">{this.state.subtitle}</span>
                </h2> 
                }
            </div>
        );
    }
};

export default HeadingComponent;