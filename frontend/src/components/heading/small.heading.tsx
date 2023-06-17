import React from 'react';

class SmallHeadingComponent extends React.Component<{}, { }> {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div className="absolute top-0 left-2">
                <a href="#">
                    <h1 className="mb-4 text-xl font-extrabold tracking-tight leading-none text-gray-900 md:text-2xl lg:text-4xl">
                        Art
                        <span className="font-face-kolker text-6xl">Viz</span>
                    </h1>
                </a>
            </div>
        );
    }
};

export default SmallHeadingComponent;