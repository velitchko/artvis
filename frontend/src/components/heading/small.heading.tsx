import React from 'react';

class SmallHeadingComponent extends React.Component<{}, { }> {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div className="absolute top-0 left-2">
                <h1 className="mb-4 text-md font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                        Art
                        <span className="font-face-kolker text-8xl">Viz</span>
                    </h1>
            </div>
        );
    }
};

export default SmallHeadingComponent;